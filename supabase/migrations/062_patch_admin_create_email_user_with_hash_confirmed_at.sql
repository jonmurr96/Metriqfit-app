create or replace function public.admin_create_email_user_with_hash(
  p_email text,
  p_encrypted_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_catalog
as $$
declare
  v_instance_id uuid;
  v_user_id uuid := gen_random_uuid();
begin
  if p_email is null or btrim(p_email) = '' then
    raise exception 'Email is required';
  end if;

  if p_encrypted_password is null or btrim(p_encrypted_password) = '' then
    raise exception 'Encrypted password is required';
  end if;

  if exists (
    select 1
    from auth.users
    where lower(email) = lower(p_email)
  ) then
    return jsonb_build_object(
      'ok', false,
      'error', 'User already exists',
      'email', lower(p_email)
    );
  end if;

  select instance_id
  into v_instance_id
  from auth.users
  limit 1;

  if v_instance_id is null then
    raise exception 'Could not infer auth instance_id';
  end if;

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
    lower(p_email),
    p_encrypted_password,
    now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    '{}'::jsonb,
    now(),
    now()
  );

  insert into auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', lower(p_email),
      'email_verified', true
    ),
    'email',
    now(),
    now(),
    now()
  );

  return jsonb_build_object(
    'ok', true,
    'user_id', v_user_id,
    'email', lower(p_email)
  );
end;
$$;
