import { supabase } from '../supabase';

export interface OnboardingStatus {
  hasCompletedOnboarding: boolean;
  hasTargets: boolean;
  hasPlans: boolean;
  hasSubscription: boolean;
}

/**
 * Checks if a user has completed all onboarding steps
 * @param userId - The user's unique ID
 * @returns Object indicating onboarding completion status
 */
export async function checkOnboardingStatus(
  userId: string
): Promise<OnboardingStatus> {
  const [answersRes, targetsRes, plansRes, subscriptionRes] = await Promise.all([
    supabase
      .from('onboarding_answers')
      .select('completed_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_targets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_workout_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  return {
    hasCompletedOnboarding:
      !answersRes.error && !!(answersRes.data as any)?.completed_at,
    hasTargets: !targetsRes.error && !!targetsRes.data,
    hasPlans: !plansRes.error && !!plansRes.data,
    hasSubscription: !subscriptionRes.error && !!subscriptionRes.data,
  };
}
