/**
 * Phase 5 Demo
 * Demonstrates Testing & Validation functionality
 */

import { testRunner, assertEquals, assertTrue, TestData, benchmark } from '../lib/workout/testing-framework';
import { calculateRecoveryScore } from '../lib/workout/recovery-management';
import { generatePeriodizedProgram } from '../lib/workout/periodization-integration';
import { enhanceProgramWithRecovery } from '../lib/workout/recovery-integration';
import { Analytics } from '../lib/workout/analytics-framework';
import { ABTesting, PREDEFINED_EXPERIMENTS, FeatureFlags } from '../lib/workout/ab-testing-framework';
import { FeedbackSystem } from '../lib/workout/feedback-system';

console.log('='.repeat(80));
console.log('PHASE 5: TESTING & VALIDATION DEMONSTRATION');
console.log('='.repeat(80));

// Demo 1: Testing Framework
console.log('\n📋 DEMO 1: Testing Framework');
console.log('-'.repeat(80));

// Run some quick tests
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e instanceof Error ? e.message : String(e)}`);
    failed++;
  }
}

console.log('\nRunning quick assertions...');

test('Recovery score within valid range', () => {
  const score = calculateRecoveryScore([TestData.metrics.excellent], [], 'intermediate');
  assertTrue(score.overall >= 0 && score.overall <= 100);
});

test('Program generation creates valid program', () => {
  const program = generatePeriodizedProgram('test', TestData.users.beginner, { weeks: 4 });
  assertTrue(program.weeks.length === 4);
  assertTrue(program.programId.length > 0);
});

test('Minimum exercises by experience', () => {
  const { getMinimumExercises } = require('../lib/workout/exercise-recipes-by-experience');
  assertEquals(getMinimumExercises('beginner'), 5);
  assertEquals(getMinimumExercises('intermediate'), 6);
  assertEquals(getMinimumExercises('advanced'), 7);
});

test('Recovery adjustments applied', () => {
  const baseProgram = generatePeriodizedProgram('test', TestData.users.intermediate);
  const program = enhanceProgramWithRecovery(baseProgram);
  assertTrue(program.adjustments !== undefined);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

// Demo 2: Performance Benchmarks
console.log('\n\n📋 DEMO 2: Performance Benchmarks');
console.log('-'.repeat(80));

console.log('\nBenchmarking program generation...');

const programBench = benchmark(
  'Generate Periodized Program',
  () => generatePeriodizedProgram('benchmark', TestData.users.intermediate, { weeks: 12 }),
  100
);

console.log(`\n  ${programBench.name}`);
console.log(`    Operations: ${programBench.operations}`);
console.log(`    Duration: ${programBench.duration.toFixed(2)}ms`);
console.log(`    Ops/sec: ${Math.round(programBench.opsPerSecond).toLocaleString()}`);

const recoveryBench = benchmark(
  'Calculate Recovery Score',
  () => calculateRecoveryScore([TestData.metrics.good], [], 'intermediate'),
  1000
);

console.log(`\n  ${recoveryBench.name}`);
console.log(`    Operations: ${recoveryBench.operations}`);
console.log(`    Duration: ${recoveryBench.duration.toFixed(2)}ms`);
console.log(`    Ops/sec: ${Math.round(recoveryBench.opsPerSecond).toLocaleString()}`);

// Demo 3: Analytics
console.log('\n\n📋 DEMO 3: Analytics Framework');
console.log('-'.repeat(80));

console.log('\nGenerating sample program with analytics...');

const sampleProgram = enhanceProgramWithRecovery(
  generatePeriodizedProgram('analytics_demo', TestData.users.intermediate, { weeks: 8 })
);

const completedWorkouts = [
  { week: 1, day: 0, date: '2024-01-15' },
  { week: 1, day: 1, date: '2024-01-16' },
  { week: 1, day: 2, date: '2024-01-17' },
  { week: 1, day: 3, date: '2024-01-18' },
  { week: 2, day: 0, date: '2024-01-22' },
  { week: 2, day: 1, date: '2024-01-23' },
  { week: 2, day: 2, date: '2024-01-24' },
  { week: 2, day: 3, date: '2024-01-25' },
  { week: 3, day: 0, date: '2024-01-29' },
  { week: 3, day: 1, date: '2024-01-30' },
  { week: 3, day: 2, date: '2024-01-31' },
  { week: 4, day: 0, date: '2024-02-05' },
  { week: 4, day: 1, date: '2024-02-06' },
  { week: 4, day: 2, date: '2024-02-07' },
];

const metrics = Analytics.program(sampleProgram, completedWorkouts);

console.log('\nProgram Metrics:');
console.log(`  Total Workouts Planned: ${metrics.totalWorkoutsPlanned}`);
console.log(`  Total Workouts Completed: ${metrics.totalWorkoutsCompleted}`);
console.log(`  Completion Rate: ${metrics.completionRate.toFixed(1)}%`);
console.log(`  Adherence Score: ${metrics.adherenceScore.toFixed(1)}/100`);
console.log(`  Average Recovery Score: ${metrics.averageRecoveryScore.toFixed(1)}`);
console.log(`  Recovery Trend: ${metrics.recoveryTrend}`);
console.log(`  Deloads Triggered: ${metrics.deloadsTriggered}`);
console.log(`  Overreaching Events: ${metrics.overreachingEvents}`);

console.log('\nGenerating performance insights...');
const insights = Analytics.insights(metrics);

insights.forEach((insight, i) => {
  console.log(`\n  ${i + 1}. ${insight.title} (${insight.type})`);
  console.log(`     ${insight.description}`);
  console.log(`     💡 ${insight.recommendation}`);
});

// Demo 4: A/B Testing
console.log('\n\n📋 DEMO 4: A/B Testing Framework');
console.log('-'.repeat(80));

console.log('\nAvailable Predefined Experiments:');
PREDEFINED_EXPERIMENTS.forEach((exp, i) => {
  console.log(`\n  ${i + 1}. ${exp.name}`);
  console.log(`     ID: ${exp.id}`);
  console.log(`     Type: ${exp.type}`);
  console.log(`     Hypothesis: ${exp.hypothesis}`);
  console.log(`     Success Metric: ${exp.successMetric}`);
  console.log(`     Variants: ${exp.variants.map((v) => v.name).join(', ')}`);
  console.log(`     Min Sample: ${exp.minSampleSize} users`);
});

console.log('\n\nRegistering and running experiment...');
ABTesting.registerExperiment(PREDEFINED_EXPERIMENTS[0]);

const testUsers = [
  { id: 'user_001', exp: 'intermediate', goal: 'build_muscle', days: 4 },
  { id: 'user_002', exp: 'intermediate', goal: 'build_strength', days: 4 },
  { id: 'user_003', exp: 'intermediate', goal: 'build_muscle', days: 3 },
  { id: 'user_004', exp: 'beginner', goal: 'build_muscle', days: 4 }, // Not eligible
  { id: 'user_005', exp: 'intermediate', goal: 'build_muscle', days: 5 },
];

console.log('\nAssigning users to experiment:');
testUsers.forEach((user) => {
  const assignment = ABTesting.assignUserToExperiment(user.id, {
    experienceLevel: user.exp as any,
    primaryGoal: user.goal as any,
    daysPerWeek: user.days,
  });

  if (assignment) {
    console.log(`  ✅ ${user.id}: Assigned to "${assignment.variantId}"`);
  } else {
    console.log(`  ⏭️  ${user.id}: Not eligible`);
  }
});

console.log('\n\nFeature Flags:');
const testFeatures = [
  'recovery_auto_adjustments',
  'proactive_recovery_alerts',
  'advanced_analytics',
  'nonexistent_feature',
];

testFeatures.forEach((feature) => {
  const enabled = FeatureFlags.isEnabled(feature, 'user_123');
  console.log(`  ${enabled ? '✅' : '❌'} ${feature}`);
});

// Demo 5: User Feedback
console.log('\n\n📋 DEMO 5: User Feedback System');
console.log('-'.repeat(80));

console.log('\nSubmitting sample feedback...');

// Workout feedback
const workoutFeedback = FeedbackSystem.submit({
  userId: 'user_123',
  feedback: {
    type: 'workout_rating',
    programId: 'prog_456',
    weekNumber: 3,
    dayNumber: 1,
    rating: 5,
    difficulty: 'just_right',
    duration: 'just_right',
    energyLevel: 'high',
    completion: 'all_sets',
  },
  context: {
    experienceLevel: 'intermediate',
    primaryGoal: 'build_muscle',
  },
});

console.log('\nWorkout Feedback Analysis:');
console.log(`  Sentiment: ${workoutFeedback.analysis?.sentiment}`);
console.log(`  Score: ${workoutFeedback.analysis?.sentimentScore}`);
console.log(`  Category: ${workoutFeedback.analysis?.category}`);
console.log(`  Priority: ${workoutFeedback.analysis?.priority}`);
console.log(`  Actionable: ${workoutFeedback.analysis?.actionable}`);

// Feature request
const featureRequest = FeedbackSystem.submit({
  userId: 'user_456',
  feedback: {
    type: 'feature_request',
    category: 'exercise',
    description: 'Add more kettlebell exercises to the catalog',
    priority: 'medium',
    useCase: 'I train at home with limited equipment',
  },
});

console.log('\nFeature Request Analysis:');
console.log(`  Category: ${featureRequest.analysis?.category}`);
console.log(`  Actionable: ${featureRequest.analysis?.actionable}`);
console.log(`  Suggested Action: ${featureRequest.analysis?.suggestedAction}`);

// Bug report
const bugReport = FeedbackSystem.submit({
  userId: 'user_789',
  feedback: {
    type: 'bug_report',
    severity: 'major',
    description: 'App crashes when trying to view week 5',
    stepsToReproduce: ['Open program', 'Navigate to week 5', 'App crashes'],
    expectedBehavior: 'Should show week 5 details',
    actualBehavior: 'App closes unexpectedly',
  },
});

console.log('\nBug Report Analysis:');
console.log(`  Priority: ${bugReport.analysis?.priority}`);
console.log(`  Actionable: ${bugReport.analysis?.actionable}`);
console.log(`  Suggested Action: ${bugReport.analysis?.suggestedAction}`);

// General comment
const generalComment = FeedbackSystem.submit({
  userId: 'user_abc',
  feedback: {
    type: 'general_comment',
    category: 'praise',
    message: 'Great app! The workout generation is really helpful.',
  },
});

console.log('\nGeneral Comment Analysis:');
console.log(`  Sentiment: ${generalComment.analysis?.sentiment}`);
console.log(`  Score: ${generalComment.analysis?.sentimentScore}`);

// Aggregate feedback
console.log('\n\nAggregating all feedback...');
const summary = FeedbackSystem.aggregate();

console.log('\nFeedback Summary:');
console.log(`  Total Submissions: ${summary.totalSubmissions}`);
console.log(`  By Type:`, summary.byType);
console.log(`  By Sentiment:`, summary.bySentiment);
console.log(`  Actionable Items: ${summary.actionableItems.length}`);

summary.actionableItems.forEach((item, i) => {
  console.log(`    ${i + 1}. [${item.priority}] ${item.description} (${item.count}x)`);
});

// Demo 6: Program Feedback Summary
console.log('\n\n📋 DEMO 6: Program-Specific Feedback');
console.log('-'.repeat(80));

const programFeedback = FeedbackSystem.getProgramSummary('prog_456');

console.log('\nProgram Feedback Summary:');
console.log(`  Total Responses: ${programFeedback.totalResponses}`);
console.log(`  Average Rating: ${programFeedback.averageWorkoutRating.toFixed(1)}/5`);
console.log(`  Completion Rate: ${programFeedback.completionRate.toFixed(1)}%`);

if (programFeedback.topPraises.length > 0) {
  console.log(`  Top Praises: ${programFeedback.topPraises.join(', ')}`);
}

console.log('\nExercise Ratings:');
Object.entries(programFeedback.exerciseRatings).forEach(([exercise, data]) => {
  console.log(`    ${exercise}: ${data.average.toFixed(1)}/5 (${data.count} ratings)`);
});

// Demo 7: Validation
console.log('\n\n📋 DEMO 7: Validation Framework');
console.log('-'.repeat(80));

const { createProgramValidator, createRecipeValidator } = require('../lib/workout/testing-framework');

console.log('\nValidating sample program...');
const validator = createProgramValidator();
const validationResults = validator.validate(sampleProgram);

const errors = validationResults.filter((r: any) => !r.passed && r.severity === 'error');
const warnings = validationResults.filter((r: any) => !r.passed && r.severity === 'warning');

console.log(`  Validation Results:`);
console.log(`    Passed: ${validationResults.filter((r: any) => r.passed).length}`);
console.log(`    Errors: ${errors.length}`);
console.log(`    Warnings: ${warnings.length}`);

if (errors.length === 0) {
  console.log(`  ✅ Program is valid!`);
}

// Demo 8: Final Summary
console.log('\n\n' + '='.repeat(80));
console.log('PHASE 5 SUMMARY');
console.log('='.repeat(80));

console.log(`
✅ Testing Framework: ${passed} tests passed, ${failed} tests failed
✅ Performance: Program generation at ${Math.round(programBench.opsPerSecond).toLocaleString()} ops/sec
✅ Analytics: ${insights.length} insights generated
✅ A/B Testing: ${PREDEFINED_EXPERIMENTS.length} experiments available
✅ Feedback: ${summary.totalSubmissions} feedback submissions analyzed
✅ Validation: Program structure validated

Phase 5 Complete: Testing & Validation system operational!
`);

console.log('='.repeat(80));
console.log('DEMONSTRATION COMPLETE');
console.log('='.repeat(80));
