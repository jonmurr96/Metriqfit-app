-- MetriqFit Phase 1 Plan Expansion
-- Nutrition variants, workout schedule, consistency scoring, grocery weeks

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- plan_generation_runs extensions
-- =====================================================
ALTER TABLE public.plan_generation_runs
  ADD COLUMN IF NOT EXISTS generation_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS planner_mode TEXT NOT NULL DEFAULT 'hybrid'
    CHECK (planner_mode IN ('deterministic', 'ai', 'hybrid')),
  ADD COLUMN IF NOT EXISTS warnings_json JSONB;

-- =====================================================
-- nutrition meals: selected variant
-- =====================================================
ALTER TABLE public.user_nutrition_plan_meals
  ADD COLUMN IF NOT EXISTS selected_variant_id UUID;

-- =====================================================
-- meal variants
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_nutrition_plan_meal_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_meal_id UUID NOT NULL REFERENCES public.user_nutrition_plan_meals(id) ON DELETE CASCADE,
  variant_type TEXT NOT NULL DEFAULT 'default'
    CHECK (variant_type IN ('default', 'alternative', 'user_custom')),
  name TEXT NOT NULL,
  description TEXT,
  target_calories INTEGER,
  target_protein NUMERIC,
  target_carbs NUMERIC,
  target_fat NUMERIC,
  prep_time_min INTEGER,
  source TEXT NOT NULL DEFAULT 'rule' CHECK (source IN ('ai', 'rule', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_nutrition_plan_meal_variant_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.user_nutrition_plan_meal_variants(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES public.food_items(id),
  item_name TEXT NOT NULL,
  quantity_value NUMERIC NOT NULL,
  quantity_unit TEXT NOT NULL,
  grams NUMERIC,
  calories NUMERIC,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  fiber NUMERIC,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_nutrition_plan_meals_selected_variant_id_fkey'
  ) THEN
    ALTER TABLE public.user_nutrition_plan_meals
      ADD CONSTRAINT user_nutrition_plan_meals_selected_variant_id_fkey
      FOREIGN KEY (selected_variant_id)
      REFERENCES public.user_nutrition_plan_meal_variants(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- workout schedule table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_workout_plan_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.user_workout_plans(id) ON DELETE CASCADE,
  plan_day_id UUID REFERENCES public.user_workout_plan_days(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('workout', 'rest', 'active_recovery', 'conditioning')),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'completed', 'missed', 'rescheduled', 'skipped')),
  original_date DATE,
  completed_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, scheduled_date)
);

-- =====================================================
-- consistency daily
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_plan_consistency_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  nutrition_score NUMERIC NOT NULL DEFAULT 0,
  workout_score NUMERIC NOT NULL DEFAULT 0,
  hydration_score NUMERIC NOT NULL DEFAULT 0,
  overall_score NUMERIC NOT NULL DEFAULT 0,
  nutrition_status_json JSONB,
  workout_status_json JSONB,
  hydration_status_json JSONB,
  recommendation_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- =====================================================
-- grocery week cache
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_plan_grocery_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.user_nutrition_plans(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  prep_batches_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, week_start_date)
);

-- =====================================================
-- indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_nutrition_variants_plan_meal
  ON public.user_nutrition_plan_meal_variants(plan_meal_id, variant_type);
CREATE INDEX IF NOT EXISTS idx_nutrition_variant_items_variant
  ON public.user_nutrition_plan_meal_variant_items(variant_id, order_index);
CREATE INDEX IF NOT EXISTS idx_workout_schedule_plan_date
  ON public.user_workout_plan_schedule(plan_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_workout_schedule_date
  ON public.user_workout_plan_schedule(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_consistency_user_date
  ON public.user_plan_consistency_daily(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_grocery_plan_week
  ON public.user_plan_grocery_weeks(plan_id, week_start_date DESC);

-- =====================================================
-- updated_at triggers
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_meal_variants_updated_at ON public.user_nutrition_plan_meal_variants;
CREATE TRIGGER trg_update_meal_variants_updated_at
  BEFORE UPDATE ON public.user_nutrition_plan_meal_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_update_meal_variant_items_updated_at ON public.user_nutrition_plan_meal_variant_items;
CREATE TRIGGER trg_update_meal_variant_items_updated_at
  BEFORE UPDATE ON public.user_nutrition_plan_meal_variant_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_update_workout_schedule_updated_at ON public.user_workout_plan_schedule;
CREATE TRIGGER trg_update_workout_schedule_updated_at
  BEFORE UPDATE ON public.user_workout_plan_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_update_consistency_daily_updated_at ON public.user_plan_consistency_daily;
CREATE TRIGGER trg_update_consistency_daily_updated_at
  BEFORE UPDATE ON public.user_plan_consistency_daily
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_update_grocery_weeks_updated_at ON public.user_plan_grocery_weeks;
CREATE TRIGGER trg_update_grocery_weeks_updated_at
  BEFORE UPDATE ON public.user_plan_grocery_weeks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- =====================================================
-- rls policies
-- =====================================================
ALTER TABLE public.user_nutrition_plan_meal_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_nutrition_plan_meal_variant_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_plan_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plan_consistency_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plan_grocery_weeks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_nutrition_plan_meal_variants'
      AND policyname = 'Users can manage own nutrition meal variants'
  ) THEN
    CREATE POLICY "Users can manage own nutrition meal variants"
      ON public.user_nutrition_plan_meal_variants
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.user_nutrition_plan_meals m
          JOIN public.user_nutrition_plans p ON p.id = m.plan_id
          WHERE m.id = plan_meal_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_nutrition_plan_meal_variant_items'
      AND policyname = 'Users can manage own nutrition meal variant items'
  ) THEN
    CREATE POLICY "Users can manage own nutrition meal variant items"
      ON public.user_nutrition_plan_meal_variant_items
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.user_nutrition_plan_meal_variants v
          JOIN public.user_nutrition_plan_meals m ON m.id = v.plan_meal_id
          JOIN public.user_nutrition_plans p ON p.id = m.plan_id
          WHERE v.id = variant_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_workout_plan_schedule'
      AND policyname = 'Users can manage own workout schedule'
  ) THEN
    CREATE POLICY "Users can manage own workout schedule"
      ON public.user_workout_plan_schedule
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.user_workout_plans p
          WHERE p.id = plan_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_plan_consistency_daily'
      AND policyname = 'Users can manage own consistency records'
  ) THEN
    CREATE POLICY "Users can manage own consistency records"
      ON public.user_plan_consistency_daily
      FOR ALL
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_plan_grocery_weeks'
      AND policyname = 'Users can manage own grocery weeks'
  ) THEN
    CREATE POLICY "Users can manage own grocery weeks"
      ON public.user_plan_grocery_weeks
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.user_nutrition_plans p
          WHERE p.id = plan_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;
END $$;
