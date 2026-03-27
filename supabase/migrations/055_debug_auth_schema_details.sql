create or replace function public.debug_auth_schema_details()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_user_columns jsonb;
  v_identity_columns jsonb;
  v_auth_user_refs jsonb;
  v_auth_identity_triggers jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable,
        'column_default', column_default
      )
      order by ordinal_position
    ),
    '[]'::jsonb
  )
  into v_user_columns
  from information_schema.columns
  where table_schema = 'auth'
    and table_name = 'users';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable,
        'column_default', column_default
      )
      order by ordinal_position
    ),
    '[]'::jsonb
  )
  into v_identity_columns
  from information_schema.columns
  where table_schema = 'auth'
    and table_name = 'identities';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'schema', n.nspname,
        'table', c.relname,
        'constraint_name', con.conname,
        'delete_action',
          case con.confdeltype
            when 'a' then 'no_action'
            when 'r' then 'restrict'
            when 'c' then 'cascade'
            when 'n' then 'set_null'
            when 'd' then 'set_default'
          end
      )
      order by n.nspname, c.relname, con.conname
    ),
    '[]'::jsonb
  )
  into v_auth_user_refs
  from pg_constraint con
  join pg_class c
    on c.oid = con.conrelid
  join pg_namespace n
    on n.oid = c.relnamespace
  where con.contype = 'f'
    and con.confrelid = 'auth.users'::regclass;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'trigger_name', t.tgname,
        'function_name', p.proname,
        'enabled', t.tgenabled
      )
      order by t.tgname
    ),
    '[]'::jsonb
  )
  into v_auth_identity_triggers
  from pg_trigger t
  join pg_proc p
    on p.oid = t.tgfoid
  where t.tgrelid = 'auth.identities'::regclass
    and not t.tgisinternal;

  return jsonb_build_object(
    'auth_users_columns', v_user_columns,
    'auth_identities_columns', v_identity_columns,
    'auth_users_references', v_auth_user_refs,
    'auth_identities_triggers', v_auth_identity_triggers
  );
end;
$$;
