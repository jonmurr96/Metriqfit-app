-- Lock privileged RPCs to service_role only. Client code must use verified
-- Edge Functions or standard Supabase Auth flows instead of SECURITY DEFINER
-- escape hatches.

REVOKE ALL ON FUNCTION public.upsert_subscription(
  UUID,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_subscription(
  UUID,
  TEXT,
  TEXT,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT
) TO service_role;

REVOKE ALL ON FUNCTION public.admin_create_email_user(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_email_user(TEXT, TEXT) TO service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'admin_create_email_user_with_hash'
  ) THEN
    REVOKE ALL ON FUNCTION public.admin_create_email_user_with_hash(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.admin_create_email_user_with_hash(TEXT, TEXT) TO service_role;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.consume_ai_usage_quota(
  p_user_id UUID,
  p_usage_type TEXT,
  p_limit INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  IF p_limit < 0 THEN
    RETURN TRUE;
  END IF;

  IF p_usage_type <> 'food_photo_scans' THEN
    RAISE EXCEPTION 'Unsupported quota type: %', p_usage_type;
  END IF;

  INSERT INTO public.ai_usage_daily (
    user_id,
    usage_date,
    coach_messages,
    plan_regenerations,
    food_photo_scans
  )
  VALUES (p_user_id, current_date, 0, 0, 0)
  ON CONFLICT (user_id, usage_date) DO NOTHING;

  UPDATE public.ai_usage_daily
  SET
    food_photo_scans = food_photo_scans + 1,
    updated_at = now()
  WHERE user_id = p_user_id
    AND usage_date = current_date
    AND food_photo_scans < p_limit;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_usage_quota(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_usage_quota(UUID, TEXT, INTEGER) TO service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'debug_auth_trigger_state'
  ) THEN
    REVOKE ALL ON FUNCTION public.debug_auth_trigger_state() FROM PUBLIC, anon, authenticated;
    DROP FUNCTION public.debug_auth_trigger_state();
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'debug_auth_user_insert_probe'
  ) THEN
    REVOKE ALL ON FUNCTION public.debug_auth_user_insert_probe() FROM PUBLIC, anon, authenticated;
    DROP FUNCTION public.debug_auth_user_insert_probe();
  END IF;
END
$$;
