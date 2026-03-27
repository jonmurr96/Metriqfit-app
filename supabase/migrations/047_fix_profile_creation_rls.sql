-- =====================================================
-- Fix profiles table RLS to allow trigger to create profile
-- =====================================================
-- Problem: The handle_new_user() trigger fails because the
-- "Users can insert own profile" policy checks auth.uid() = id,
-- but auth.uid() is not set during user creation trigger.
-- Solution: Update policy to also allow service_role
-- =====================================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Recreate with service role support
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid() = id);
