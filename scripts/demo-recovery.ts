/**
 * Recovery System Demo
 * Demonstrates Phase 4 Recovery Management functionality
 */

import {
  calculateRecoveryScore,
  optimizeRestDays,
  getActiveRecoverySession,
  detectOverreaching,
  generateRecoveryRecommendations,
  getNutritionTiming,
  generateSleepProtocol,
  generateRecoverySummary,
} from '../lib/workout/recovery-management';

import {
  enhanceProgramWithRecovery,
  processDailyCheckIn,
  adjustWeekPlanForRecovery,
  getRestDayRecommendations,
  generateEnhancedSummary,
} from '../lib/workout/recovery-integration';

import { PRESET_PROGRAMS } from '../lib/workout/periodization-integration';

console.log('='.repeat(80));
console.log('PHASE 4: RECOVERY MANAGEMENT SYSTEM DEMONSTRATION');
console.log('='.repeat(80));

// Demo 1: Recovery Score Calculation
console.log('\n📊 DEMO 1: Recovery Score Calculation');
console.log('-'.repeat(80));

const excellentMetrics = [
  {
    date: '2024-01-15',
    sleepHours: 8.5,
    sleepQuality: 'excellent' as const,
    sorenessLevel: 1 as const,
    energyLevel: 5 as const,
    stressLevel: 1 as const,
    motivationLevel: 'high' as const,
    hrvScore: 75,
  },
];

const poorMetrics = [
  {
    date: '2024-01-15',
    sleepHours: 5,
    sleepQuality: 'poor' as const,
    sorenessLevel: 4 as const,
    energyLevel: 2 as const,
    stressLevel: 4 as const,
    motivationLevel: 'low' as const,
  },
];

console.log('\n🏆 Excellent Recovery Day:');
const excellentScore = calculateRecoveryScore(excellentMetrics, [], 'intermediate');
console.log(`   Overall Score: ${excellentScore.overall}/100 (${excellentScore.status})`);
console.log(`   Sleep: ${excellentScore.sleep} | Muscle: ${excellentScore.muscleRecovery} | Nervous: ${excellentScore.nervousSystem} | Hydration: ${excellentScore.hydration}`);
console.log(`   Trend: ${excellentScore.trend}`);

console.log('\n😫 Poor Recovery Day:');
const poorScore = calculateRecoveryScore(poorMetrics, [], 'intermediate');
console.log(`   Overall Score: ${poorScore.overall}/100 (${poorScore.status})`);
console.log(`   Sleep: ${poorScore.sleep} | Muscle: ${poorScore.muscleRecovery} | Nervous: ${poorScore.nervousSystem} | Hydration: ${poorScore.hydration}`);
console.log(`   Trend: ${poorScore.trend}`);

// Demo 2: Rest Day Optimization
console.log('\n\n📅 DEMO 2: Rest Day Optimization');
console.log('-'.repeat(80));

const trainingDays = [1, 2, 4, 5]; // Mon, Tue, Thu, Fri
const recoveryScores = [excellentScore, poorScore];

['beginner', 'intermediate', 'advanced'].forEach((level) => {
  console.log(`\n${level.toUpperCase()} (4 days/week):`);
  const restDays = optimizeRestDays(4, trainingDays, recoveryScores, level as any);

  restDays.forEach((day) => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    console.log(`   ${dayNames[day.dayOfWeek]}: ${day.priority.toUpperCase()}`);
    console.log(`      Reason: ${day.reason}`);
    console.log(`      Activities: ${day.activities.join(', ')}`);
  });
});

// Demo 3: Overreaching Detection
console.log('\n\n⚠️ DEMO 3: Overreaching Detection');
console.log('-'.repeat(80));

const scenarios = [
  {
    name: 'Fresh & Ready',
    metrics: Array(7).fill(null).map((_, i) => ({
      date: `2024-01-${9 + i}`,
      sleepHours: 8,
      sleepQuality: 'good' as const,
      sorenessLevel: 2 as const,
      energyLevel: 4 as const,
      stressLevel: 2 as const,
      motivationLevel: 'high' as const,
    })),
  },
  {
    name: 'Functional Overreaching',
    metrics: [
      ...Array(3).fill(null).map((_, i) => ({
        date: `2024-01-${9 + i}`,
        sleepHours: 7,
        sleepQuality: 'fair' as const,
        sorenessLevel: 3 as const,
        energyLevel: 3 as const,
        stressLevel: 3 as const,
        motivationLevel: 'high' as const,
      })),
      ...Array(4).fill(null).map((_, i) => ({
        date: `2024-01-${12 + i}`,
        sleepHours: 6,
        sleepQuality: 'fair' as const,
        sorenessLevel: 4 as const,
        energyLevel: 2 as const,
        stressLevel: 3 as const,
        motivationLevel: 'moderate' as const,
      })),
    ],
  },
  {
    name: 'Non-Functional Overreaching',
    metrics: Array(10).fill(null).map((_, i) => ({
      date: `2024-01-${6 + i}`,
      sleepHours: 5 + Math.random(),
      sleepQuality: 'poor' as const,
      sorenessLevel: 4 as const,
      energyLevel: 2 as const,
      stressLevel: 4 as const,
      motivationLevel: 'low' as const,
    })),
  },
];

scenarios.forEach((scenario) => {
  console.log(`\n${scenario.name}:`);
  const status = detectOverreaching(scenario.metrics as any, [], 'intermediate');
  console.log(`   State: ${status.state.toUpperCase()}`);
  console.log(`   Functional: ${status.functional ? 'Yes' : 'No'}`);
  console.log(`   Days in state: ${status.daysInState}`);

  if (status.indicators.length > 0) {
    console.log(`   Indicators: ${status.indicators.join(', ')}`);
  }

  if (status.actions.length > 0) {
    console.log(`   Actions:`);
    status.actions.forEach((action) => console.log(`      • ${action}`));
  }
});

// Demo 4: Recovery Recommendations
console.log('\n\n💡 DEMO 4: Recovery Recommendations');
console.log('-'.repeat(80));

const poorOverreaching = detectOverreaching(poorMetrics as any, [], 'intermediate');
const recommendations = generateRecoveryRecommendations(
  poorScore,
  poorOverreaching,
  'build_muscle',
  'intermediate'
);

console.log('\nRecommendations for poor recovery + overreaching:');
recommendations.slice(0, 5).forEach((rec, i) => {
  console.log(`\n${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
  console.log(`   ${rec.description}`);
  console.log(`   Steps:`);
  rec.actionableSteps.forEach((step) => console.log(`      • ${step}`));
  console.log(`   Benefit: ${rec.expectedBenefit}`);
});

// Demo 5: Active Recovery Sessions
console.log('\n\n🏃 DEMO 5: Active Recovery Sessions');
console.log('-'.repeat(80));

const recoveryStatuses = [
  { score: 90, status: 'excellent' },
  { score: 75, status: 'good' },
  { score: 60, status: 'fair' },
  { score: 45, status: 'poor' },
  { score: 25, status: 'critical' },
];

recoveryStatuses.forEach(({ score, status }) => {
  const mockScore = {
    overall: score,
    status,
    sleep: score,
    muscleRecovery: score - 10,
    nervousSystem: score - 5,
    hydration: score,
    timestamp: new Date().toISOString(),
    trend: 'stable',
  } as any;

  const session = getActiveRecoverySession(mockScore, false, 'build_muscle');

  console.log(`\n${status.toUpperCase()} (${score}/100):`);
  if (session) {
    console.log(`   Type: ${session.type}`);
    console.log(`   Duration: ${session.durationMin} minutes`);
    console.log(`   Intensity: ${session.intensity}`);
    console.log(`   Description: ${session.description}`);
  } else {
    console.log(`   No active recovery needed (training day with excellent recovery)`);
  }
});

// Demo 6: Nutrition Timing
console.log('\n\n🍽️ DEMO 6: Nutrition Timing');
console.log('-'.repeat(80));

const contexts = [
  { context: 'pre_workout' as const, time: 'morning', goal: 'build_muscle' },
  { context: 'post_workout' as const, time: 'afternoon', goal: 'build_muscle' },
  { context: 'rest_day' as const, time: 'morning', goal: 'lose_fat' },
];

contexts.forEach(({ context, time, goal }) => {
  const timing = getNutritionTiming(context, time, goal);

  console.log(`\n${context.replace('_', ' ').toUpperCase()} (${time}, ${goal}):`);
  console.log(`   Timing: ${timing.timing}`);
  console.log(`   Macros: ${timing.macros.protein}g protein, ${timing.macros.carbs}g carbs, ${timing.macros.fats}g fats`);
  console.log(`   Foods: ${timing.foods.join(', ')}`);
  console.log(`   Hydration: ${timing.hydration}`);
});

// Demo 7: Sleep Protocol
console.log('\n\n😴 DEMO 7: Sleep Protocol Generation');
console.log('-'.repeat(80));

const sleepScenarios = [
  { hours: 6, quality: 'poor', intensity: 'high' },
  { hours: 7, quality: 'fair', intensity: 'moderate' },
  { hours: 8, quality: 'good', intensity: 'high' },
];

sleepScenarios.forEach(({ hours, quality, intensity }) => {
  const protocol = generateSleepProtocol(hours, quality, intensity as any);

  console.log(`\n${hours} hours, ${quality} quality, ${intensity} intensity:`);
  console.log(`   Target: ${protocol.targetHours} hours`);
  console.log(`   Routine:`);
  protocol.preSleepRoutine.forEach((step) => console.log(`      • ${step}`));
  console.log(`   Supplements: ${protocol.supplements.join(', ') || 'None needed'}`);
});

// Demo 8: Integration with Periodized Program
console.log('\n\n🔗 DEMO 8: Integration with Periodized Program');
console.log('-'.repeat(80));

// Create base program
const baseProgram = PRESET_PROGRAMS.intermediate_hypertrophy('user_recovery_demo');

console.log('\n1. Creating program with recovery tracking...');
let program = enhanceProgramWithRecovery(baseProgram);

console.log(`   Program: ${program.programId}`);
console.log(`   Protocol: ${program.protocol.name}`);
console.log(`   Current Recovery Score: ${program.recoveryTracking.currentScore?.overall || 'N/A'}`);

// Simulate daily check-ins
console.log('\n2. Simulating daily check-ins...');

const checkIns = [
  { sleepHours: 7, sleepQuality: 'good', sorenessLevel: 2, energyLevel: 4, stressLevel: 2, motivationLevel: 'high' },
  { sleepHours: 6.5, sleepQuality: 'fair', sorenessLevel: 3, energyLevel: 3, stressLevel: 3, motivationLevel: 'moderate' },
  { sleepHours: 5, sleepQuality: 'poor', sorenessLevel: 4, energyLevel: 2, stressLevel: 4, motivationLevel: 'low' },
];

checkIns.forEach((checkIn, i) => {
  const { program: updated, checkIn: result } = processDailyCheckIn(program, {
    date: `2024-01-${15 + i}`,
    ...checkIn,
  } as any);

  program = updated;

  console.log(`\n   Day ${i + 1}:`);
  console.log(`      Recovery Score: ${result.score.overall} (${result.score.status})`);
  console.log(`      Recommendation: ${result.recommendation.slice(0, 60)}...`);
  console.log(`      Training Adjusted: ${result.trainingAdjusted ? 'YES' : 'No'}`);

  if (result.alerts.length > 0) {
    console.log(`      Alerts:`);
    result.alerts.forEach((alert) => console.log(`         [${alert.level}] ${alert.title}`));
  }
});

console.log('\n3. Final Program Adjustments:');
console.log(`   Volume Reduction: ${Math.round(program.adjustments.volumeReduction * 100)}%`);
console.log(`   Intensity Cap: ${program.adjustments.intensityCap || 'None'}`);
console.log(`   Auto-Deload Triggered: ${program.adjustments.autoDeloadTriggered ? 'YES' : 'No'}`);

// Demo 9: Enhanced Summary
console.log('\n\n📋 DEMO 9: Enhanced Program Summary');
console.log('-'.repeat(80));

const summary = generateEnhancedSummary(program);

console.log('\nProgram Overview:');
console.log(`   Name: ${summary.programOverview.name}`);
console.log(`   Week: ${summary.programOverview.currentWeek}/${summary.programOverview.totalWeeks}`);
console.log(`   Protocol: ${summary.programOverview.protocol}`);

console.log('\nRecovery Status:');
console.log(`   Score: ${summary.recoveryStatus.currentScore}/100`);
console.log(`   Status: ${summary.recoveryStatus.status}`);
console.log(`   Trend: ${summary.recoveryStatus.trend}`);
console.log(`   Overreaching: ${summary.recoveryStatus.overreachingState}`);

console.log('\nToday:');
console.log(`   ${summary.today.recommendation}`);
console.log(`   Training Adjusted: ${summary.today.trainingAdjusted ? 'Yes' : 'No'}`);

console.log('\nAdjustments:');
console.log(`   Volume: ${summary.adjustments.volumeReduction}`);
console.log(`   Intensity: ${summary.adjustments.intensityCap || 'None'}`);
console.log(`   Auto-Deload: ${summary.adjustments.autoDeload ? 'Active' : 'Inactive'}`);

// Demo 10: Rest Day Recommendations
console.log('\n\n📅 DEMO 10: Rest Day Recommendations');
console.log('-'.repeat(80));

const { placements, activeRecovery, nutritionTiming } = getRestDayRecommendations(program);

console.log('\nRest Day Placements:');
placements.forEach((day) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  console.log(`   ${dayNames[day.dayOfWeek]} (${day.priority}): ${day.reason}`);
});

console.log('\nActive Recovery Recommendation:');
if (activeRecovery) {
  console.log(`   Type: ${activeRecovery.type}`);
  console.log(`   Duration: ${activeRecovery.durationMin} min`);
  console.log(`   Description: ${activeRecovery.description}`);
} else {
  console.log('   No active recovery needed at this time');
}

console.log('\nNutrition Timing (Rest Day):');
console.log(`   Timing: ${nutritionTiming.timing}`);
console.log(`   Macros: ${nutritionTiming.macros.protein}g protein`);
console.log(`   Focus foods: ${nutritionTiming.foods.slice(0, 3).join(', ')}`);

console.log('\n' + '='.repeat(80));
console.log('DEMONSTRATION COMPLETE');
console.log('='.repeat(80));
