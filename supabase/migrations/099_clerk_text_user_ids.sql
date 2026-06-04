-- 099_clerk_text_user_ids.sql
--
-- Migrate user-identity columns from uuid -> text so they can store Clerk user IDs
-- (e.g. "user_3ENe4JpFI9McPK41GNP6FnmtbfP").
--
-- Background: the app authenticates via Clerk and forwards the Clerk session JWT to
-- Supabase (Third-Party Auth). RLS already reads the Clerk id via the text-returning
-- public.requesting_user_id() (JWT `sub`). But the identity columns were still `uuid`
-- (left over from the original Supabase-Auth schema), so writing a Clerk id failed with:
--   invalid input syntax for type uuid: "user_..."
--
-- The set of identity columns is defined precisely as "every public column that has a
-- foreign key to auth.users" (user_id, created_by, created_by_user_id, profiles.id, ...).
-- Those FKs are incompatible with Clerk (Clerk users are not rows in auth.users) and are
-- dropped. RLS policies reference these columns (which blocks ALTER COLUMN TYPE), so we
-- snapshot every public policy, drop them, drop the auth.users FKs, retype the columns to
-- text, then recreate the policies verbatim (their comparisons become text = text).
--
-- Catalog-driven (adapts to live schema), runs atomically in one DO block.
-- Notes:
--   * No FKs reference public.profiles(id), so retyping the profiles PK is safe.
--   * Pre-existing rows keyed by old auth uuids become orphaned text; new Clerk users
--     write fresh rows. Referential integrity for user ownership is enforced by RLS.

DO $migration$
DECLARE
  r record;
  using_clause text;
  check_clause text;
BEGIN
  -- 1) Snapshot all public RLS policies.
  CREATE TEMP TABLE _policy_backup ON COMMIT DROP AS
  SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public';

  -- 2) Snapshot the identity columns = every public column with a FK to auth.users.
  CREATE TEMP TABLE _identity_cols ON COMMIT DROP AS
  SELECT DISTINCT
         src.relname AS table_name,
         (SELECT attname FROM pg_attribute
          WHERE attrelid = con.conrelid AND attnum = con.conkey[1]) AS column_name
  FROM pg_constraint con
  JOIN pg_class src ON src.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = src.relnamespace
  WHERE con.contype = 'f'
    AND n.nspname = 'public'
    AND con.confrelid = 'auth.users'::regclass;

  -- 3) Drop all public policies (so the columns they reference can be retyped).
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;

  -- 4) Drop every public FK that references auth.users (incompatible with Clerk).
  FOR r IN
    SELECT con.conname, src.relname AS table_name
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = src.relnamespace
    WHERE con.contype = 'f'
      AND n.nspname = 'public'
      AND con.confrelid = 'auth.users'::regclass
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.table_name, r.conname);
  END LOOP;

  -- 5) Retype every identity column uuid -> text.
  FOR r IN SELECT table_name, column_name FROM _identity_cols
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE text USING %I::text',
      r.table_name, r.column_name, r.column_name
    );
  END LOOP;

  -- 6) Recreate every policy verbatim. Comparisons of the text requesting_user_id()
  --    against the (now text) identity columns resolve as text = text.
  FOR r IN SELECT * FROM _policy_backup
  LOOP
    using_clause := CASE WHEN r.qual       IS NOT NULL THEN ' USING ('      || r.qual       || ')' ELSE '' END;
    check_clause := CASE WHEN r.with_check IS NOT NULL THEN ' WITH CHECK (' || r.with_check || ')' ELSE '' END;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s',
      r.policyname,
      r.tablename,
      r.permissive,
      r.cmd,
      array_to_string(r.roles, ', '),
      using_clause,
      check_clause
    );
  END LOOP;
END
$migration$;
