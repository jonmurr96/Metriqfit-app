create or replace function public.debug_auth_trigger_state()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  trigger_rows jsonb;
  function_rows jsonb;
  table_rows jsonb;
  profile_policies jsonb;
  xp_policies jsonb;
  streak_policies jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'trigger_name', t.tgname,
        'function_name', p.proname,
        'function_schema', n.nspname,
        'enabled', t.tgenabled
      )
      order by t.tgname
    ),
    '[]'::jsonb
  )
  into trigger_rows
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace n on n.oid = p.pronamespace
  where cn.nspname = 'auth'
    and c.relname = 'users'
    and not t.tgisinternal;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'function_name', p.proname,
        'function_schema', n.nspname,
        'function_owner', pg_get_userbyid(p.proowner),
        'security_definer', p.prosecdef
      )
      order by p.proname
    ),
    '[]'::jsonb
  )
  into function_rows
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'handle_new_user',
      'initialize_user_gamification',
      'trigger_initialize_user_gamification'
    );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'table_name', c.relname,
        'table_owner', pg_get_userbyid(c.relowner),
        'rls_enabled', c.relrowsecurity,
        'rls_forced', c.relforcerowsecurity
      )
      order by c.relname
    ),
    '[]'::jsonb
  )
  into table_rows
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('profiles', 'user_xp_levels', 'user_streaks');

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'policy_name', policyname,
        'command', cmd,
        'qual', qual,
        'with_check', with_check
      )
      order by policyname
    ),
    '[]'::jsonb
  )
  into profile_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = 'profiles';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'policy_name', policyname,
        'command', cmd,
        'qual', qual,
        'with_check', with_check
      )
      order by policyname
    ),
    '[]'::jsonb
  )
  into xp_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = 'user_xp_levels';

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'policy_name', policyname,
        'command', cmd,
        'qual', qual,
        'with_check', with_check
      )
      order by policyname
    ),
    '[]'::jsonb
  )
  into streak_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = 'user_streaks';

  return jsonb_build_object(
    'auth_user_triggers', trigger_rows,
    'trigger_functions', function_rows,
    'trigger_target_tables', table_rows,
    'profiles_policies', profile_policies,
    'user_xp_levels_policies', xp_policies,
    'user_streaks_policies', streak_policies
  );
end;
$$;

grant execute on function public.debug_auth_trigger_state() to anon, authenticated, service_role;
