-- Fix permissions for onboarding_answers and user_targets
-- The previous policies were strictly checking uid = user_id for all ops
-- but sometimes the initial INSERT might face issues if specific permissions aren't granted
-- or if the token role isn't matching perfectly.
-- 1. Ensure authenticated users have usage on the sequence/tables (explicit grant)
GRANT ALL ON TABLE public.onboarding_answers TO authenticated;
GRANT ALL ON TABLE public.onboarding_answers TO service_role;
GRANT ALL ON TABLE public.user_targets TO authenticated;
GRANT ALL ON TABLE public.user_targets TO service_role;
-- 2. Refine Onboarding Answers Policy
DROP POLICY IF EXISTS "Users can manage own onboarding" ON public.onboarding_answers;
CREATE POLICY "Users can manage own onboarding" ON public.onboarding_answers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- 3. Refine User Targets Policy
DROP POLICY IF EXISTS "Users can manage own targets" ON public.user_targets;
CREATE POLICY "Users can manage own targets" ON public.user_targets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- 4. Fix Generation Runs Policy (ensure insert is allowed for own ID)
DROP POLICY IF EXISTS "Users can view own generation runs" ON public.plan_generation_runs;
CREATE POLICY "Users can manage own generation runs" ON public.plan_generation_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- Grant access to plan_generation_runs
GRANT ALL ON TABLE public.plan_generation_runs TO authenticated;
GRANT ALL ON TABLE public.plan_generation_runs TO service_role;