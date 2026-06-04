export interface OnboardingStatus {
  hasCompletedOnboarding: boolean;
  hasTargets: boolean;
  hasPlans: boolean;
  hasCompletedPaywall: boolean;
  lastOnboardingStep: string | null;
}

export interface OnboardingAnswersStatusRow {
  completed_at?: string | null;
  answers?: any;
}

export function deriveOnboardingStatus(input: {
  answers: OnboardingAnswersStatusRow | null;
  answersError?: unknown;
  hasTargets: boolean;
  hasPlans: boolean;
  hasPaywallCompletion: boolean;
}): OnboardingStatus {
  const hasReadableAnswers = !input.answersError && !!input.answers;
  const hasCompletedOnboarding = hasReadableAnswers
    ? Boolean(input.answers?.completed_at || (input.hasTargets && input.hasPlans))
    : false;

  const lastOnboardingStep = hasReadableAnswers
    ? (input.answers?.answers as any)?._last_step || null
    : null;

  return {
    hasCompletedOnboarding,
    hasTargets: input.hasTargets,
    hasPlans: input.hasPlans,
    hasCompletedPaywall: input.hasPaywallCompletion,
    lastOnboardingStep,
  };
}
