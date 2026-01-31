-- MetriqFit Plan Schema
-- Migration 003: AI-generated workout and nutrition plans with versioning

-- ===========================================
-- PLAN GENERATION RUNS TABLE (Audit Log)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.plan_generation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('workout', 'nutrition', 'both')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'validation_failed')),
  input_context JSONB,
  ai_response JSONB,
  validation_errors JSONB,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ===========================================
-- USER WORKOUT PLANS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.workout_templates(id),
  generation_run_id UUID REFERENCES public.plan_generation_runs(id),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  days_per_week INTEGER NOT NULL DEFAULT 3 CHECK (days_per_week BETWEEN 1 AND 7),
  current_week INTEGER DEFAULT 1,
  total_weeks INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- USER WORKOUT PLAN DAYS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_workout_plan_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.user_workout_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number >= 1),
  scheduled_date DATE,
  name TEXT NOT NULL,
  focus TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  session_id UUID REFERENCES public.workout_sessions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, day_number)
);

-- ===========================================
-- USER WORKOUT PLAN EXERCISES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_workout_plan_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_day_id UUID NOT NULL REFERENCES public.user_workout_plan_days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id),
  order_index INTEGER NOT NULL,
  sets_target INTEGER NOT NULL DEFAULT 3 CHECK (sets_target BETWEEN 1 AND 20),
  reps_min INTEGER NOT NULL DEFAULT 8 CHECK (reps_min BETWEEN 1 AND 100),
  reps_max INTEGER NOT NULL DEFAULT 12 CHECK (reps_max BETWEEN 1 AND 100),
  rest_seconds INTEGER DEFAULT 90,
  tempo TEXT,
  user_notes TEXT,
  is_user_modified BOOLEAN DEFAULT FALSE,
  original_exercise_id UUID REFERENCES public.exercises(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_rep_range CHECK (reps_max >= reps_min)
);

-- ===========================================
-- USER NUTRITION PLANS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_nutrition_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_run_id UUID REFERENCES public.plan_generation_runs(id),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  name TEXT NOT NULL,
  description TEXT,
  meal_structure JSONB NOT NULL DEFAULT '{"slots": ["breakfast", "lunch", "dinner", "snack"]}',
  macro_distribution JSONB, -- e.g., {"breakfast": 25, "lunch": 35, "dinner": 30, "snack": 10}
  dietary_preferences JSONB, -- From onboarding
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- USER NUTRITION PLAN MEALS TABLE (Suggested Meals)
-- ===========================================
CREATE TABLE IF NOT EXISTS public.user_nutrition_plan_meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.user_nutrition_plans(id) ON DELETE CASCADE,
  meal_slot TEXT NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  name TEXT NOT NULL,
  description TEXT,
  target_calories INTEGER,
  target_protein NUMERIC,
  target_carbs NUMERIC,
  target_fat NUMERIC,
  recipe_url TEXT,
  prep_time_min INTEGER,
  is_user_modified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- FOOD FAVORITES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.food_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_item_id UUID NOT NULL REFERENCES public.food_items(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, food_item_id)
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_plan_runs_user ON public.plan_generation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_runs_status ON public.plan_generation_runs(status);

CREATE INDEX IF NOT EXISTS idx_workout_plans_user ON public.user_workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_active ON public.user_workout_plans(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_workout_plan_days_plan ON public.user_workout_plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_plan_days_date ON public.user_workout_plan_days(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_workout_plan_exercises_day ON public.user_workout_plan_exercises(plan_day_id);

CREATE INDEX IF NOT EXISTS idx_nutrition_plans_user ON public.user_nutrition_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_active ON public.user_nutrition_plans(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_nutrition_plan_meals_plan ON public.user_nutrition_plan_meals(plan_id);

CREATE INDEX IF NOT EXISTS idx_food_favorites_user ON public.food_favorites(user_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE public.plan_generation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_nutrition_plan_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_favorites ENABLE ROW LEVEL SECURITY;

-- Plan generation runs (read-only for users)
CREATE POLICY "Users can view own generation runs" ON public.plan_generation_runs
  FOR SELECT USING (auth.uid() = user_id);

-- Workout plans
CREATE POLICY "Users can manage own workout plans" ON public.user_workout_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own plan days" ON public.user_workout_plan_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_workout_plans
      WHERE id = plan_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own plan exercises" ON public.user_workout_plan_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_workout_plan_days d
      JOIN public.user_workout_plans p ON d.plan_id = p.id
      WHERE d.id = plan_day_id AND p.user_id = auth.uid()
    )
  );

-- Nutrition plans
CREATE POLICY "Users can manage own nutrition plans" ON public.user_nutrition_plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own plan meals" ON public.user_nutrition_plan_meals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_nutrition_plans
      WHERE id = plan_id AND user_id = auth.uid()
    )
  );

-- Food favorites
CREATE POLICY "Users can manage own favorites" ON public.food_favorites
  FOR ALL USING (auth.uid() = user_id);

-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- Deactivate other plans when a new one is set active
CREATE OR REPLACE FUNCTION public.deactivate_other_workout_plans()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.user_workout_plans
    SET is_active = false, updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deactivate_other_workout_plans_trigger
  AFTER INSERT OR UPDATE OF is_active ON public.user_workout_plans
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.deactivate_other_workout_plans();

CREATE OR REPLACE FUNCTION public.deactivate_other_nutrition_plans()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.user_nutrition_plans
    SET is_active = false, updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deactivate_other_nutrition_plans_trigger
  AFTER INSERT OR UPDATE OF is_active ON public.user_nutrition_plans
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.deactivate_other_nutrition_plans();

-- Auto-update updated_at
CREATE TRIGGER update_workout_plans_updated_at
  BEFORE UPDATE ON public.user_workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_nutrition_plans_updated_at
  BEFORE UPDATE ON public.user_nutrition_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add foreign key for workout_sessions.plan_day_id now that table exists
ALTER TABLE public.workout_sessions
  ADD CONSTRAINT fk_workout_sessions_plan_day
  FOREIGN KEY (plan_day_id) REFERENCES public.user_workout_plan_days(id);
