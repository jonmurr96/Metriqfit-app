import { createClient } from '@supabase/supabase-js';
import assert from 'node:assert/strict';
import { deriveOnboardingStatus } from '../lib/auth/onboardingStatus.ts';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const remoteChecks = [
  ['onboarding_answers', 'answers, completed_at'],
  ['subscriptions', 'id, status, plan_type'],
  ['onboarding_plan_review_states', 'id, selected_at'],
  ['user_targets', 'id'],
  ['user_workout_plans', 'id, is_active'],
];

for (const [table, select] of remoteChecks) {
  const { error } = await supabase.from(table).select(select).limit(1);
  assert.equal(error, null, `${table} remote contract failed: ${error?.message}`);
}

const selectedPlanStatus = deriveOnboardingStatus({
  answers: { completed_at: new Date().toISOString() },
  hasTargets: true,
  hasPlans: true,
  hasPaywallCompletion: true,
});
assert.equal(selectedPlanStatus.hasCompletedOnboarding, true);
assert.equal(selectedPlanStatus.hasPlans, true);
assert.equal(selectedPlanStatus.hasCompletedPaywall, true);

const recoveredGeneratedPlanStatus = deriveOnboardingStatus({
  answers: { completed_at: null },
  hasTargets: true,
  hasPlans: true,
  hasPaywallCompletion: true,
});
assert.equal(recoveredGeneratedPlanStatus.hasCompletedOnboarding, true);
assert.equal(recoveredGeneratedPlanStatus.hasCompletedPaywall, true);

console.log('Paywall remote contract check passed');
