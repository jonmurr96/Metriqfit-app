-- 094_harden_signup_triggers.sql
-- Make all auth.users insert triggers exception-safe so a profile/gamification
-- setup failure can never roll back user registration.
--
-- Root cause: if ANY trigger on auth.users raises an unhandled exception, Supabase
-- aborts the entire signup transaction and returns "database error saving new user".
-- Adding EXCEPTION WHEN OTHERS to each trigger body catches any failure (RLS,
-- constraint, runtime error) and logs it via RAISE WARNING instead of propagating.

-- ----------------------------------------------------------------
-- 1. handle_new_user — creates the public.profiles row
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------
-- 2. initialize_user_gamification — creates XP level + streak rows
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.initialize_user_gamification(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.user_xp_levels (user_id, current_level, current_xp, total_xp_earned)
  VALUES (p_user_id, 1, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_streaks (user_id, streak_type, current_streak, longest_streak, freeze_tokens)
  VALUES
    (p_user_id, 'fitness',   0, 0, 0),
    (p_user_id, 'workout',   0, 0, 0),
    (p_user_id, 'nutrition', 0, 0, 0),
    (p_user_id, 'hydration', 0, 0, 0),
    (p_user_id, 'weigh_in',  0, 0, 0)
  ON CONFLICT (user_id, streak_type) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[initialize_user_gamification] failed for user %: % %', p_user_id, SQLERRM, SQLSTATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_initialize_user_gamification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.initialize_user_gamification(NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[trigger_initialize_user_gamification] failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------
-- 3. Ensure RLS policies permit service-role inserts (belt-and-suspenders)
-- ----------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id
    OR auth.role() = 'service_role'
    OR current_setting('role', true) = 'postgres'
  );

-- user_xp_levels
DROP POLICY IF EXISTS "Users can insert own XP levels" ON public.user_xp_levels;
CREATE POLICY "Users can insert own XP levels"
  ON public.user_xp_levels FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR auth.role() = 'service_role'
    OR current_setting('role', true) = 'postgres'
  );

-- user_streaks
DROP POLICY IF EXISTS "Users can insert own streaks" ON public.user_streaks;
CREATE POLICY "Users can insert own streaks"
  ON public.user_streaks FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR auth.role() = 'service_role'
    OR current_setting('role', true) = 'postgres'
  );
