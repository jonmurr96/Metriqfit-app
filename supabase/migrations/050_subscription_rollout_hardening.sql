-- Hardens the three-tier rollout for already-migrated environments.
-- Re-applies grandfathering logic, adds client analytics persistence,
-- and logs plan change lifecycle events.

-- Re-apply the grandfathering backfill for environments where migration 049
-- already ran before the grandfathering logic was added.
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

-- Capture plan upgrades/downgrades in addition to status transitions.
CREATE OR REPLACE FUNCTION public.upsert_subscription(
  p_user_id UUID,
  p_plan_type TEXT,
  p_status TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_trial_ends_at TIMESTAMPTZ DEFAULT NULL,
  p_revenuecat_customer_id TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_product_id TEXT DEFAULT NULL
)
RETURNS public.subscriptions AS $$
DECLARE
  v_subscription public.subscriptions;
  v_previous_status TEXT;
  v_previous_plan_type TEXT;
  v_previous_tier_rank INTEGER;
  v_new_tier_rank INTEGER;
BEGIN
  SELECT status, plan_type
  INTO v_previous_status, v_previous_plan_type
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  INSERT INTO public.subscriptions (
    user_id, plan_type, status, expires_at, trial_ends_at,
    revenuecat_customer_id, platform, product_id,
    started_at, updated_at
  )
  VALUES (
    p_user_id, p_plan_type, p_status, p_expires_at, p_trial_ends_at,
    p_revenuecat_customer_id, p_platform, p_product_id,
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_type = EXCLUDED.plan_type,
    status = EXCLUDED.status,
    expires_at = EXCLUDED.expires_at,
    trial_ends_at = EXCLUDED.trial_ends_at,
    revenuecat_customer_id = COALESCE(EXCLUDED.revenuecat_customer_id, subscriptions.revenuecat_customer_id),
    platform = COALESCE(EXCLUDED.platform, subscriptions.platform),
    product_id = COALESCE(EXCLUDED.product_id, subscriptions.product_id),
    updated_at = NOW()
  RETURNING * INTO v_subscription;

  IF v_previous_status IS DISTINCT FROM p_status THEN
    INSERT INTO public.subscription_events (
      subscription_id, user_id, event_type,
      previous_status, new_status
    )
    VALUES (
      v_subscription.id, p_user_id,
      CASE
        WHEN v_previous_status IS NULL THEN 'created'
        WHEN p_status = 'trial' THEN 'trial_started'
        WHEN p_status = 'active' AND v_previous_status = 'trial' THEN 'trial_ended'
        WHEN p_status = 'cancelled' THEN 'cancelled'
        WHEN p_status = 'expired' THEN 'expired'
        WHEN p_status = 'active' AND v_previous_status IN ('cancelled', 'expired') THEN 'reactivated'
        ELSE 'renewed'
      END,
      v_previous_status,
      p_status
    );
  END IF;

  IF v_previous_plan_type IS DISTINCT FROM p_plan_type AND v_previous_plan_type IS NOT NULL THEN
    v_previous_tier_rank := CASE
      WHEN v_previous_plan_type = 'free' THEN 0
      WHEN v_previous_plan_type LIKE 'premium%' THEN 1
      ELSE 2
    END;

    v_new_tier_rank := CASE
      WHEN p_plan_type = 'free' THEN 0
      WHEN p_plan_type LIKE 'premium%' THEN 1
      ELSE 2
    END;

    INSERT INTO public.subscription_events (
      subscription_id,
      user_id,
      event_type,
      previous_status,
      new_status,
      metadata
    )
    VALUES (
      v_subscription.id,
      p_user_id,
      CASE
        WHEN v_new_tier_rank > v_previous_tier_rank THEN 'upgraded'
        ELSE 'downgraded'
      END,
      v_previous_status,
      p_status,
      jsonb_build_object(
        'previous_plan_type', v_previous_plan_type,
        'new_plan_type', p_plan_type,
        'platform', COALESCE(p_platform, v_subscription.platform),
        'product_id', COALESCE(p_product_id, v_subscription.product_id)
      )
    );
  END IF;

  RETURN v_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  platform TEXT,
  session_id TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created_at
  ON public.analytics_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created_at
  ON public.analytics_events(event_name, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

GRANT INSERT, SELECT ON public.analytics_events TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analytics_events'
      AND policyname = 'Users can insert own analytics events'
  ) THEN
    CREATE POLICY "Users can insert own analytics events"
      ON public.analytics_events
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analytics_events'
      AND policyname = 'Users can view own analytics events'
  ) THEN
    CREATE POLICY "Users can view own analytics events"
      ON public.analytics_events
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;
