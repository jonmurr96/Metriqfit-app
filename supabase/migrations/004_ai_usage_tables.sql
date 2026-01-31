-- MetriqFit AI Usage Schema
-- Migration 004: AI Coach messages, usage tracking, and rate limiting

-- ===========================================
-- AI USAGE DAILY TABLE (Rate Limiting)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  coach_messages INTEGER DEFAULT 0,
  plan_regenerations INTEGER DEFAULT 0,
  food_photo_scans INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

-- ===========================================
-- AI COACH MESSAGES TABLE (Conversation History)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ai_coach_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  context_snapshot JSONB, -- Snapshot of user data at time of message
  attachments JSONB, -- Action buttons, quick replies, etc.
  tokens_input INTEGER,
  tokens_output INTEGER,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- AI COACH FEEDBACK TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.ai_coach_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.ai_coach_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  is_helpful BOOLEAN,
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage_daily(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON public.ai_coach_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_date ON public.ai_coach_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_message ON public.ai_coach_feedback(message_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_coach_feedback ENABLE ROW LEVEL SECURITY;

-- AI usage policies
CREATE POLICY "Users can view own usage" ON public.ai_usage_daily
  FOR SELECT USING (auth.uid() = user_id);

-- AI messages policies
CREATE POLICY "Users can manage own messages" ON public.ai_coach_messages
  FOR ALL USING (auth.uid() = user_id);

-- AI feedback policies
CREATE POLICY "Users can manage own feedback" ON public.ai_coach_feedback
  FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- FUNCTIONS
-- ===========================================

-- Increment AI usage counter
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_user_id UUID,
  p_usage_type TEXT
)
RETURNS public.ai_usage_daily AS $$
DECLARE
  v_result public.ai_usage_daily;
BEGIN
  INSERT INTO public.ai_usage_daily (user_id, usage_date, coach_messages, plan_regenerations, food_photo_scans)
  VALUES (
    p_user_id,
    CURRENT_DATE,
    CASE WHEN p_usage_type = 'coach_messages' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'plan_regenerations' THEN 1 ELSE 0 END,
    CASE WHEN p_usage_type = 'food_photo_scans' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, usage_date) DO UPDATE SET
    coach_messages = CASE
      WHEN p_usage_type = 'coach_messages'
      THEN ai_usage_daily.coach_messages + 1
      ELSE ai_usage_daily.coach_messages
    END,
    plan_regenerations = CASE
      WHEN p_usage_type = 'plan_regenerations'
      THEN ai_usage_daily.plan_regenerations + 1
      ELSE ai_usage_daily.plan_regenerations
    END,
    food_photo_scans = CASE
      WHEN p_usage_type = 'food_photo_scans'
      THEN ai_usage_daily.food_photo_scans + 1
      ELSE ai_usage_daily.food_photo_scans
    END,
    updated_at = NOW()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has remaining AI quota
CREATE OR REPLACE FUNCTION public.check_ai_quota(
  p_user_id UUID,
  p_usage_type TEXT,
  p_is_elite BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_usage public.ai_usage_daily;
  v_limit INTEGER;
BEGIN
  -- Get current usage
  SELECT * INTO v_usage
  FROM public.ai_usage_daily
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  -- Set limits based on tier
  IF p_is_elite THEN
    -- Elite users have unlimited (represented as very high number)
    v_limit := 999999;
  ELSE
    -- Free tier limits
    CASE p_usage_type
      WHEN 'coach_messages' THEN v_limit := 10;
      WHEN 'plan_regenerations' THEN v_limit := 1;
      WHEN 'food_photo_scans' THEN v_limit := 3;
      ELSE v_limit := 0;
    END CASE;
  END IF;

  -- Check quota
  IF v_usage IS NULL THEN
    RETURN TRUE; -- No usage today yet
  END IF;

  CASE p_usage_type
    WHEN 'coach_messages' THEN RETURN v_usage.coach_messages < v_limit;
    WHEN 'plan_regenerations' THEN RETURN v_usage.plan_regenerations < v_limit;
    WHEN 'food_photo_scans' THEN RETURN v_usage.food_photo_scans < v_limit;
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get AI usage summary for a user
CREATE OR REPLACE FUNCTION public.get_ai_usage_summary(p_user_id UUID)
RETURNS TABLE (
  usage_type TEXT,
  used INTEGER,
  limit_free INTEGER,
  remaining INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH current_usage AS (
    SELECT
      COALESCE(coach_messages, 0) as coach_messages,
      COALESCE(plan_regenerations, 0) as plan_regenerations,
      COALESCE(food_photo_scans, 0) as food_photo_scans
    FROM public.ai_usage_daily
    WHERE user_id = p_user_id AND usage_date = CURRENT_DATE
  ),
  defaults AS (
    SELECT 0 as coach_messages, 0 as plan_regenerations, 0 as food_photo_scans
  )
  SELECT 'coach_messages'::TEXT,
         COALESCE(cu.coach_messages, 0),
         10,
         GREATEST(0, 10 - COALESCE(cu.coach_messages, 0))
  FROM defaults d LEFT JOIN current_usage cu ON true
  UNION ALL
  SELECT 'plan_regenerations'::TEXT,
         COALESCE(cu.plan_regenerations, 0),
         1,
         GREATEST(0, 1 - COALESCE(cu.plan_regenerations, 0))
  FROM defaults d LEFT JOIN current_usage cu ON true
  UNION ALL
  SELECT 'food_photo_scans'::TEXT,
         COALESCE(cu.food_photo_scans, 0),
         3,
         GREATEST(0, 3 - COALESCE(cu.food_photo_scans, 0))
  FROM defaults d LEFT JOIN current_usage cu ON true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
