import { supabase } from '../supabase';

export interface OnboardingStatus {
  hasCompletedOnboarding: boolean;
  hasTargets: boolean;
  hasPlans: boolean;
  hasCompletedPaywall: boolean;
  lastOnboardingStep: string | null;
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
      .select('completed_at, paywall_completed_at, last_onboarding_step')
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
  ]);

  const answers = answersRes.data as any;

  return {
    hasCompletedOnboarding: !answersRes.error && !!answers?.completed_at,
    hasTargets: !targetsRes.error && !!targetsRes.data,
    hasPlans: !plansRes.error && !!plansRes.data,
    hasCompletedPaywall: !answersRes.error && !!answers?.paywall_completed_at,
    lastOnboardingStep: !answersRes.error ? (answers?.last_onboarding_step ?? null) : null,
  };
}
