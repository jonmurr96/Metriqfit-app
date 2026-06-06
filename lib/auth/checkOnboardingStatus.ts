import { supabase } from '../supabase';
import {
  deriveOnboardingStatus,
  type OnboardingAnswersStatusRow,
  type OnboardingStatus,
} from './onboardingStatus';

export type { OnboardingStatus } from './onboardingStatus';

/**
 * Checks if a user has completed all onboarding steps
 * @param userId - The user's unique ID
 * @returns Object indicating onboarding completion status
 */
export async function checkOnboardingStatus(
  userId: string
): Promise<OnboardingStatus> {
  const [answersRes, targetsRes, workoutPlansRes, nutritionPlansRes, subscriptionsRes, reviewStatesRes] = await Promise.all([
    supabase
      .from('onboarding_answers')
      .select('answers, completed_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_targets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_workout_plans')
      .select('id, generation_run_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('user_nutrition_plans')
      .select('id, generation_run_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('id, plan_type')
      .eq('user_id', userId)
      .in('status', ['active', 'trial', 'grace_period'])
      .limit(1),
    supabase
      .from('onboarding_plan_review_states')
      .select('id')
      .eq('user_id', userId)
      .not('selected_at', 'is', null)
      .limit(1),
  ]);

  const hasPaidSubscription = !subscriptionsRes.error
    && Boolean(subscriptionsRes.data?.some((subscription: any) => subscription.plan_type !== 'free'));
  const hasPricingDecision = !reviewStatesRes.error && Boolean(reviewStatesRes.data?.length);
  const activeWorkoutPlan = !workoutPlansRes.error ? workoutPlansRes.data : null;
  const activeNutritionPlan = !nutritionPlansRes.error ? nutritionPlansRes.data : null;
  const workoutRunId = activeWorkoutPlan?.generation_run_id || null;
  const nutritionRunId = activeNutritionPlan?.generation_run_id || null;
  const hasCompletePlanPair = Boolean(activeWorkoutPlan && activeNutritionPlan)
    && (!workoutRunId || !nutritionRunId || workoutRunId === nutritionRunId);

  return deriveOnboardingStatus({
    answers: !answersRes.error ? (answersRes.data as OnboardingAnswersStatusRow | null) : null,
    answersError: answersRes.error,
    hasTargets: !targetsRes.error && !!targetsRes.data,
    hasPlans: hasCompletePlanPair,
    hasPaywallCompletion: hasPricingDecision || hasPaidSubscription,
  });
}
