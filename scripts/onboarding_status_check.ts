import { assertEquals } from 'jsr:@std/assert';
import { deriveOnboardingStatus } from '../lib/auth/onboardingStatus.ts';

const incomplete = deriveOnboardingStatus({
  answers: { completed_at: null },
  hasTargets: false,
  hasPlans: false,
  hasPaywallCompletion: false,
});
assertEquals(incomplete.hasCompletedOnboarding, false);
assertEquals(incomplete.lastOnboardingStep, null);

const generatedPlanRecovery = deriveOnboardingStatus({
  answers: { completed_at: null },
  hasTargets: true,
  hasPlans: true,
  hasPaywallCompletion: false,
});
assertEquals(generatedPlanRecovery.hasCompletedOnboarding, true);
assertEquals(generatedPlanRecovery.hasCompletedPaywall, false);

const fullyComplete = deriveOnboardingStatus({
  answers: {
    completed_at: '2026-04-25T00:00:00.000Z',
  },
  hasTargets: true,
  hasPlans: true,
  hasPaywallCompletion: true,
});
assertEquals(fullyComplete.hasCompletedOnboarding, true);
assertEquals(fullyComplete.hasCompletedPaywall, true);

console.log('Onboarding status derivation check passed');
