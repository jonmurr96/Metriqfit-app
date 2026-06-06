-- Production hardening for onboarding plan generation.
-- Adds idempotency/correlation tracking, enforces one active plan per user, and
-- promotes generated workout + nutrition plans atomically after both trees exist.

ALTER TABLE public.plan_generation_runs
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS correlation_id text;

CREATE INDEX IF NOT EXISTS idx_plan_runs_correlation_id
  ON public.plan_generation_runs(correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_plan_runs_active_idempotency_key
  ON public.plan_generation_runs(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL
    AND status IN ('pending', 'success');

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.user_workout_plans
  WHERE is_active = true
)
UPDATE public.user_workout_plans p
SET is_active = false,
    lifecycle_state = 'archived',
    updated_at = now()
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.user_nutrition_plans
  WHERE is_active = true
)
UPDATE public.user_nutrition_plans p
SET is_active = false,
    lifecycle_state = 'archived',
    updated_at = now()
FROM ranked r
WHERE p.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_workout_plans_one_active
  ON public.user_workout_plans(user_id)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_nutrition_plans_one_active
  ON public.user_nutrition_plans(user_id)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.promote_generated_plans(
  p_user_id text,
  p_workout_plan_id uuid DEFAULT NULL,
  p_nutrition_plan_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workout_exists boolean := false;
  v_nutrition_exists boolean := false;
BEGIN
  IF p_workout_plan_id IS NULL AND p_nutrition_plan_id IS NULL THEN
    RAISE EXCEPTION 'At least one generated plan id is required';
  END IF;

  IF p_workout_plan_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_workout_plans
      WHERE id = p_workout_plan_id
        AND user_id = p_user_id
    ) INTO v_workout_exists;

    IF NOT v_workout_exists THEN
      RAISE EXCEPTION 'Generated workout plan not found for user';
    END IF;
  END IF;

  IF p_nutrition_plan_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_nutrition_plans
      WHERE id = p_nutrition_plan_id
        AND user_id = p_user_id
    ) INTO v_nutrition_exists;

    IF NOT v_nutrition_exists THEN
      RAISE EXCEPTION 'Generated nutrition plan not found for user';
    END IF;
  END IF;

  IF p_workout_plan_id IS NOT NULL THEN
    UPDATE public.user_workout_plans
    SET is_active = false,
        lifecycle_state = 'archived',
        updated_at = now()
    WHERE user_id = p_user_id
      AND is_active = true
      AND id <> p_workout_plan_id;

    UPDATE public.user_workout_plans
    SET is_active = true,
        lifecycle_state = 'live',
        replaces_plan_id = NULL,
        updated_at = now()
    WHERE id = p_workout_plan_id
      AND user_id = p_user_id;
  END IF;

  IF p_nutrition_plan_id IS NOT NULL THEN
    UPDATE public.user_nutrition_plans
    SET is_active = false,
        lifecycle_state = 'archived',
        updated_at = now()
    WHERE user_id = p_user_id
      AND is_active = true
      AND id <> p_nutrition_plan_id;

    UPDATE public.user_nutrition_plans
    SET is_active = true,
        lifecycle_state = 'live',
        replaces_plan_id = NULL,
        updated_at = now()
    WHERE id = p_nutrition_plan_id
      AND user_id = p_user_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_generated_plans(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_generated_plans(text, uuid, uuid) TO service_role;
