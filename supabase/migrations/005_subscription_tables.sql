-- MetriqFit Subscription Schema
-- Migration 005: Subscriptions, entitlements, and RevenueCat integration

-- ===========================================
-- SUBSCRIPTIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revenuecat_customer_id TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'elite_monthly', 'elite_annual', 'elite_lifetime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'trial', 'grace_period')),
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT TRUE,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web', 'stripe')),
  original_purchase_date TIMESTAMPTZ,
  product_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ===========================================
-- SUBSCRIPTION EVENTS TABLE (Audit Log)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'renewed', 'cancelled', 'expired', 'reactivated',
    'trial_started', 'trial_ended', 'upgraded', 'downgraded',
    'refunded', 'grace_period_started', 'grace_period_ended'
  )),
  previous_status TEXT,
  new_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- PROMOTIONAL CODES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed', 'trial_extension')),
  discount_value NUMERIC,
  trial_days_extension INTEGER,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  applicable_plans TEXT[] DEFAULT ARRAY['elite_monthly', 'elite_annual'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- PROMO CODE REDEMPTIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promo_code_id, user_id)
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat ON public.subscriptions(revenuecat_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON public.subscriptions(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription ON public.subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON public.subscription_events(user_id);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON public.promo_code_redemptions(user_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Subscription events policies
CREATE POLICY "Users can view own subscription events" ON public.subscription_events
  FOR SELECT USING (auth.uid() = user_id);

-- Promo codes (public read for valid codes)
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes
  FOR SELECT USING (
    is_active = true
    AND (valid_until IS NULL OR valid_until > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses)
  );

-- Promo redemptions
CREATE POLICY "Users can view own redemptions" ON public.promo_code_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Check if user has Elite entitlement
CREATE OR REPLACE FUNCTION public.is_elite_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription public.subscriptions;
BEGIN
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  IF v_subscription IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Lifetime is always active
  IF v_subscription.plan_type = 'elite_lifetime' THEN
    RETURN TRUE;
  END IF;

  -- Check active/trial status and expiration
  IF v_subscription.status IN ('active', 'trial', 'grace_period') THEN
    -- Check if not expired
    IF v_subscription.expires_at IS NULL OR v_subscription.expires_at > NOW() THEN
      RETURN TRUE;
    END IF;
    -- Check if in trial
    IF v_subscription.trial_ends_at IS NOT NULL AND v_subscription.trial_ends_at > NOW() THEN
      RETURN TRUE;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get subscription details with computed fields
CREATE OR REPLACE FUNCTION public.get_subscription_details(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  plan_type TEXT,
  status TEXT,
  is_elite BOOLEAN,
  is_trialing BOOLEAN,
  days_remaining INTEGER,
  trial_days_remaining INTEGER,
  auto_renew BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.plan_type,
    s.status,
    public.is_elite_user(p_user_id),
    s.status = 'trial' AND s.trial_ends_at > NOW(),
    CASE
      WHEN s.expires_at IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(DAY FROM (s.expires_at - NOW()))::INTEGER)
    END,
    CASE
      WHEN s.trial_ends_at IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(DAY FROM (s.trial_ends_at - NOW()))::INTEGER)
    END,
    s.auto_renew
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or update subscription (for webhook handlers)
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
BEGIN
  -- Get previous status for event logging
  SELECT status INTO v_previous_status
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  -- Upsert subscription
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

  -- Log event if status changed
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

  RETURN v_subscription;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redeem promo code
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  trial_days_extension INTEGER
) AS $$
DECLARE
  v_promo public.promo_codes;
BEGIN
  -- Get and validate promo code
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE code = UPPER(p_code)
    AND is_active = true
    AND (valid_until IS NULL OR valid_until > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF v_promo IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired promo code'::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER;
    RETURN;
  END IF;

  -- Check if already redeemed
  IF EXISTS (
    SELECT 1 FROM public.promo_code_redemptions
    WHERE promo_code_id = v_promo.id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'You have already redeemed this code'::TEXT, NULL::TEXT, NULL::NUMERIC, NULL::INTEGER;
    RETURN;
  END IF;

  -- Record redemption
  INSERT INTO public.promo_code_redemptions (promo_code_id, user_id)
  VALUES (v_promo.id, p_user_id);

  -- Increment usage count
  UPDATE public.promo_codes
  SET current_uses = current_uses + 1
  WHERE id = v_promo.id;

  RETURN QUERY SELECT
    TRUE,
    'Promo code redeemed successfully'::TEXT,
    v_promo.discount_type,
    v_promo.discount_value,
    v_promo.trial_days_extension;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
