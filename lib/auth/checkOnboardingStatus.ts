import { supabase } from '../supabase';

export interface OnboardingStatus {
  hasCompletedOnboarding: boolean;
  hasTargets: boolean;
  hasPlans: boolean;
}

/**
 * Checks if a user has completed all onboarding steps
 * @param userId - The user's unique ID
 * @returns Object indicating onboarding completion status
 */
export async function checkOnboardingStatus(
  userId: string
): Promise<OnboardingStatus> {
  const [answersRes, targetsRes, plansRes] = await Promise.all([
    supabase
      .from('onboarding_answers')
      .select('completed_at')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('user_targets')
      .select('id')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('user_workout_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single(),
  ]);

  return {
    hasCompletedOnboarding:
      !answersRes.error && !!(answersRes.data as any)?.completed_at,
    hasTargets: !targetsRes.error,
    hasPlans: !plansRes.error,
  };
}
