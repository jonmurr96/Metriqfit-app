-- Fix RLS policy for onboarding_answers to allow INSERT operations
-- The original policy only had USING clause, which blocks INSERT
-- This migration adds WITH CHECK clause for INSERT operations
-- Drop the existing policy
DROP POLICY IF EXISTS "Users can manage own onboarding" ON public.onboarding_answers;
-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY "Users can manage own onboarding" ON public.onboarding_answers FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);