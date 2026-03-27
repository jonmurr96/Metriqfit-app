-- 3-tier subscription model rollout
-- Adds Premium plans, grandfathering fields, and updates review-state selections.

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_type_check;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS legacy_plan_type TEXT,
  ADD COLUMN IF NOT EXISTS grandfathered_into_tier TEXT,
  ADD COLUMN IF NOT EXISTS grandfathered_until TIMESTAMPTZ;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_plan_type_check
  CHECK (plan_type IN ('free', 'premium_monthly', 'premium_annual', 'elite_monthly', 'elite_annual', 'elite_lifetime'));

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_legacy_plan_type_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_legacy_plan_type_check
  CHECK (
    legacy_plan_type IS NULL
    OR legacy_plan_type IN ('free', 'premium_monthly', 'premium_annual', 'elite_monthly', 'elite_annual', 'elite_lifetime')
  );

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_grandfathered_into_tier_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_grandfathered_into_tier_check
  CHECK (
    grandfathered_into_tier IS NULL
    OR grandfathered_into_tier IN ('premium', 'elite')
  );

ALTER TABLE public.promo_codes
  ALTER COLUMN applicable_plans SET DEFAULT ARRAY['premium_monthly', 'premium_annual', 'elite_monthly', 'elite_annual'];

ALTER TABLE public.onboarding_plan_review_states
  DROP CONSTRAINT IF EXISTS onboarding_plan_review_states_selected_tier_check;

ALTER TABLE public.onboarding_plan_review_states
  ADD CONSTRAINT onboarding_plan_review_states_selected_tier_check
  CHECK (
    selected_tier IS NULL
    OR selected_tier IN ('free', 'premium_monthly', 'premium_annual', 'elite_monthly', 'elite_annual', 'elite_lifetime')
  );

-- Grandfather users who already had an Elite subscription before the
-- three-tier rollout on March 26, 2026. New Elite purchases after that
-- date are not marked as grandfathered.
UPDATE public.subscriptions
SET
  legacy_plan_type = COALESCE(legacy_plan_type, plan_type),
  grandfathered_into_tier = COALESCE(grandfathered_into_tier, 'elite')
WHERE plan_type IN ('elite_monthly', 'elite_annual', 'elite_lifetime')
  AND created_at < TIMESTAMPTZ '2026-03-26 00:00:00+00'
  AND (
    legacy_plan_type IS NULL
    OR grandfathered_into_tier IS NULL
  );

CREATE OR REPLACE FUNCTION public.get_subscription_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_subscription public.subscriptions;
BEGIN
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_subscription IS NULL THEN
    RETURN 'free';
  END IF;

  IF v_subscription.status NOT IN ('active', 'trial', 'grace_period') THEN
    RETURN 'free';
  END IF;

  IF v_subscription.plan_type = 'elite_lifetime' THEN
    RETURN 'elite';
  END IF;

  IF v_subscription.expires_at IS NOT NULL AND v_subscription.expires_at <= NOW() THEN
    IF v_subscription.trial_ends_at IS NULL OR v_subscription.trial_ends_at <= NOW() THEN
      RETURN 'free';
    END IF;
  END IF;

  IF v_subscription.grandfathered_into_tier IS NOT NULL
     AND (
       v_subscription.grandfathered_until IS NULL
       OR v_subscription.grandfathered_until > NOW()
     ) THEN
    RETURN v_subscription.grandfathered_into_tier;
  END IF;

  IF v_subscription.plan_type IN ('premium_monthly', 'premium_annual') THEN
    RETURN 'premium';
  END IF;

  IF v_subscription.plan_type IN ('elite_monthly', 'elite_annual', 'elite_lifetime') THEN
    RETURN 'elite';
  END IF;

  RETURN 'free';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_elite_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_subscription_tier(p_user_id) = 'elite';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
