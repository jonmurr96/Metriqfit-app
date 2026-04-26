-- =====================================================
-- Fix RLS policies to allow user creation triggers to work
-- =====================================================
-- Problem: Multiple triggers run on user creation but fail because
-- RLS policies don't allow inserts when auth.uid() is not set yet:
-- 1. handle_new_user() - creates profile
-- 2. trigger_initialize_user_gamification() - creates gamification data
-- Solution: Add service role policies to allow triggers to insert data
-- =====================================================

-- =====================================================
-- 1. Fix profiles table RLS
-- =====================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Allow service role to insert profiles (for triggers)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = id);

-- =====================================================
-- 2. Fix gamification tables RLS
-- =====================================================

-- Drop the old restrictive policies
DROP POLICY IF EXISTS "Users can insert own XP levels" ON user_xp_levels;
DROP POLICY IF EXISTS "Users can insert own streaks" ON user_streaks;

-- Allow service role to insert XP levels (for triggers)
CREATE POLICY "Users can insert own XP levels"
  ON user_xp_levels FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- Allow service role to insert streaks (for triggers)
CREATE POLICY "Users can insert own streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);
