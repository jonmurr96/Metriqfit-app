create or replace function public.debug_auth_user_insert_probe()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_instance_id uuid;
  v_user_id uuid := gen_random_uuid();
  v_email text := 'probe_' || replace(v_user_id::text, '-', '') || '@metriqfit.test';
  v_message text;
  v_detail text;
  v_hint text;
begin
  select instance_id
  into v_instance_id
  from auth.users
  limit 1;

  if v_instance_id is null then
    return jsonb_build_object(
      'ok', false,
      'error', 'No auth.users rows found to infer instance_id.'
    );
  end if;

  begin
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) values (
      v_instance_id,
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      'debug-probe-password',
      now(),
      '{}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );

    delete from auth.users where id = v_user_id;

    return jsonb_build_object(
      'ok', true,
      'probe_user_id', v_user_id,
      'probe_email', v_email
    );
  exception
    when others then
      get stacked diagnostics
        v_message = message_text,
        v_detail = pg_exception_detail,
        v_hint = pg_exception_hint;

      begin
        delete from auth.users where id = v_user_id;
      exception
        when others then
          null;
      end;

      return jsonb_build_object(
        'ok', false,
        'probe_user_id', v_user_id,
        'probe_email', v_email,
        'message', v_message,
        'detail', coalesce(v_detail, ''),
        'hint', coalesce(v_hint, '')
      );
  end;
end;
$$;

grant execute on function public.debug_auth_user_insert_probe() to anon, authenticated, service_role;
