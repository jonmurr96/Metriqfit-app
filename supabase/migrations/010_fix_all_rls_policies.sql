-- Fix RLS policies for all user tables to allow INSERT operations
-- All policies were missing WITH CHECK clause, which blocks INSERT
-- This migration adds WITH CHECK clause for ALL user-owned tables across the database

-- ===========================================
-- CORE USER TABLES (from 001_initial_schema)
-- ===========================================

-- Onboarding answers
DROP POLICY IF EXISTS "Users can manage own onboarding" ON public.onboarding_answers;
CREATE POLICY "Users can manage own onboarding"
ON public.onboarding_answers
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- User targets
DROP POLICY IF EXISTS "Users can manage own targets" ON public.user_targets;
CREATE POLICY "Users can manage own targets"
ON public.user_targets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Water logs
DROP POLICY IF EXISTS "Users can manage own water logs" ON public.water_logs;
CREATE POLICY "Users can manage own water logs"
ON public.water_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- User measurements
DROP POLICY IF EXISTS "Users can manage own measurements" ON public.user_measurements;
CREATE POLICY "Users can manage own measurements"
ON public.user_measurements
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Meal logs
DROP POLICY IF EXISTS "Users can manage own meal logs" ON public.meal_logs;
CREATE POLICY "Users can manage own meal logs"
ON public.meal_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Meal log items
DROP POLICY IF EXISTS "Users can manage own meal log items" ON public.meal_log_items;
CREATE POLICY "Users can manage own meal log items"
ON public.meal_log_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.meal_logs
    WHERE id = meal_log_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.meal_logs
    WHERE id = meal_log_id AND user_id = auth.uid()
  )
);

-- Step logs
DROP POLICY IF EXISTS "Users can manage own step logs" ON public.step_logs;
CREATE POLICY "Users can manage own step logs"
ON public.step_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- WORKOUT TABLES (from 002_workout_tables)
-- ===========================================

-- Workout sessions
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.workout_sessions;
CREATE POLICY "Users can manage own sessions"
ON public.workout_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Session exercises
DROP POLICY IF EXISTS "Users can manage own session exercises" ON public.session_exercises;
CREATE POLICY "Users can manage own session exercises"
ON public.session_exercises
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.workout_sessions
    WHERE id = session_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_sessions
    WHERE id = session_id AND user_id = auth.uid()
  )
);

-- Workout sets
DROP POLICY IF EXISTS "Users can manage own sets" ON public.workout_sets;
CREATE POLICY "Users can manage own sets"
ON public.workout_sets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.workout_sessions ws ON se.session_id = ws.id
    WHERE se.id = session_exercise_id AND ws.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.workout_sessions ws ON se.session_id = ws.id
    WHERE se.id = session_exercise_id AND ws.user_id = auth.uid()
  )
);

-- User PRs
DROP POLICY IF EXISTS "Users can manage own PRs" ON public.user_prs;
CREATE POLICY "Users can manage own PRs"
ON public.user_prs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- PLAN TABLES (from 003_plan_tables)
-- ===========================================

-- User workout plans
DROP POLICY IF EXISTS "Users can manage own workout plans" ON public.user_workout_plans;
CREATE POLICY "Users can manage own workout plans"
ON public.user_workout_plans
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- User workout plan days
DROP POLICY IF EXISTS "Users can manage own plan days" ON public.user_workout_plan_days;
CREATE POLICY "Users can manage own plan days"
ON public.user_workout_plan_days
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_workout_plans
    WHERE id = plan_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_workout_plans
    WHERE id = plan_id AND user_id = auth.uid()
  )
);

-- User workout plan exercises
DROP POLICY IF EXISTS "Users can manage own plan exercises" ON public.user_workout_plan_exercises;
CREATE POLICY "Users can manage own plan exercises"
ON public.user_workout_plan_exercises
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_workout_plan_days d
    JOIN public.user_workout_plans p ON d.plan_id = p.id
    WHERE d.id = plan_day_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_workout_plan_days d
    JOIN public.user_workout_plans p ON d.plan_id = p.id
    WHERE d.id = plan_day_id AND p.user_id = auth.uid()
  )
);

-- User nutrition plans
DROP POLICY IF EXISTS "Users can manage own nutrition plans" ON public.user_nutrition_plans;
CREATE POLICY "Users can manage own nutrition plans"
ON public.user_nutrition_plans
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- User nutrition plan meals
DROP POLICY IF EXISTS "Users can manage own plan meals" ON public.user_nutrition_plan_meals;
CREATE POLICY "Users can manage own plan meals"
ON public.user_nutrition_plan_meals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_nutrition_plans
    WHERE id = plan_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_nutrition_plans
    WHERE id = plan_id AND user_id = auth.uid()
  )
);

-- Food favorites
DROP POLICY IF EXISTS "Users can manage own favorites" ON public.food_favorites;
CREATE POLICY "Users can manage own favorites"
ON public.food_favorites
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Plan generation runs
DROP POLICY IF EXISTS "Users can view own generation runs" ON public.plan_generation_runs;
CREATE POLICY "Users can view own generation runs"
ON public.plan_generation_runs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ===========================================
-- AI USAGE TABLES (from 004_ai_usage_tables)
-- ===========================================

-- AI usage daily
DROP POLICY IF EXISTS "Users can view own AI usage" ON public.ai_usage_daily;
CREATE POLICY "Users can view own AI usage"
ON public.ai_usage_daily
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- AI coach messages
DROP POLICY IF EXISTS "Users can manage own coach messages" ON public.ai_coach_messages;
CREATE POLICY "Users can manage own coach messages"
ON public.ai_coach_messages
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
