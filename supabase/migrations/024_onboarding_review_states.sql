-- Onboarding Tail Review State
-- Stores section acceptance and pricing decision between plan generation and app entry.

CREATE TABLE IF NOT EXISTS public.onboarding_plan_review_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_run_id UUID NOT NULL REFERENCES public.plan_generation_runs(id) ON DELETE CASCADE,
  macros_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  daily_targets_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  workout_plan_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  nutrition_plan_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  all_accepted_at TIMESTAMPTZ,
  selected_tier TEXT CHECK (selected_tier IN ('free', 'elite_monthly', 'elite_annual', 'elite_lifetime')),
  selected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, generation_run_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_review_states_user_id
  ON public.onboarding_plan_review_states(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_review_states_updated_at
  ON public.onboarding_plan_review_states(updated_at DESC);

ALTER TABLE public.onboarding_plan_review_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own onboarding review states" ON public.onboarding_plan_review_states;
CREATE POLICY "Users can manage own onboarding review states"
ON public.onboarding_plan_review_states
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_onboarding_review_states_updated_at ON public.onboarding_plan_review_states;
CREATE TRIGGER update_onboarding_review_states_updated_at
BEFORE UPDATE ON public.onboarding_plan_review_states
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
