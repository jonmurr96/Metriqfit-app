/**
 * Periodization System Demo
 * Demonstrates Phase 3 Periodization functionality
 */

import {
  generatePeriodizedProgram,
  getProgramSummary,
  previewUpcomingWeeks,
  checkFatigueStatus,
  advanceToNextWeek,
  getCurrentWeek,
  PRESET_PROGRAMS,
} from '../lib/workout/periodization-system';

console.log('='.repeat(80));
console.log('PHASE 3: PERIODIZATION SYSTEM DEMONSTRATION');
console.log('='.repeat(80));

// Demo 1: Beginner Linear Program
console.log('\n📋 DEMO 1: Beginner Linear Program (8 weeks, Strength)');
console.log('-'.repeat(80));

const beginnerProgram = PRESET_PROGRAMS.beginner_strength('user_beginner_123');

console.log(`\nProgram ID: ${beginnerProgram.programId}`);
console.log(`Protocol: ${beginnerProgram.protocol.name}`);
console.log(`Total Weeks: ${beginnerProgram.totalWeeks}`);
console.log(`Periodization: ${beginnerProgram.periodizationConfig.model}`);

console.log('\nBlocks:');
beginnerProgram.periodizationConfig.blocks.forEach((block, i) => {
  console.log(`  ${i + 1}. ${block.name} (${block.durationWeeks} weeks)`);
  console.log(`     Strategy: ${block.progressionStrategy}`);
});

const beginnerSummary = getProgramSummary(beginnerProgram);
console.log(`\n📊 Initial Status:`);
console.log(`   Current Block: ${beginnerSummary.currentBlock}`);
console.log(`   Weeks Completed: ${beginnerSummary.weeksCompleted}`);
console.log(`   Weeks Remaining: ${beginnerSummary.weeksRemaining}`);

// Show week 1 details
console.log('\n📅 Week 1 Details:');
const week1 = beginnerProgram.weeks[0];
console.log(`   Block: ${week1.blockFocus}`);
console.log(`   Volume: ${week1.volumeMultiplier * 100}%`);
console.log(`   Target RPE: ${week1.targetRPE}`);
console.log(`   Days: ${week1.days.length}`);

week1.days.slice(0, 2).forEach((day, i) => {
  console.log(`\n   Day ${i + 1}: ${day.dayName}`);
  console.log(`      Exercises: ${day.exercises.length}`);
  console.log(`      Total Sets: ${day.totalSets}`);
  console.log(`      Duration: ~${day.estimatedDuration}min`);

  day.exercises.slice(0, 3).forEach((ex, j) => {
    console.log(`      ${j + 1}. ${ex.slot.pattern}: ${ex.sets}×${ex.reps} @ RPE ${ex.targetRPE}`);
  });
});

// Demo 2: Intermediate Block Periodization
console.log('\n\n📋 DEMO 2: Intermediate Block Program (12 weeks, Hypertrophy)');
console.log('-'.repeat(80));

const intermediateProgram = PRESET_PROGRAMS.intermediate_hypertrophy('user_intermediate_456');

console.log(`\nProtocol: ${intermediateProgram.protocol.name}`);
console.log(`Periodization: ${intermediateProgram.periodizationConfig.model}`);

console.log('\nBlocks:');
intermediateProgram.periodizationConfig.blocks.forEach((block, i) => {
  console.log(`  ${i + 1}. ${block.name} (${block.durationWeeks} weeks)`);
  if (block.deloadRequired) {
    console.log(`     Includes deload every ${block.durationWeeks} weeks`);
  }
});

// Preview all weeks
console.log('\n📅 Week-by-Week Preview:');
const intermediatePreviews = previewUpcomingWeeks(intermediateProgram, 12);
intermediatePreviews.forEach((week) => {
  const changes = week.keyChanges.length > 0 ? week.keyChanges.join(', ') : 'Base week';
  console.log(`   Week ${week.weekNumber}: ${week.blockName} | ${changes}`);
});

// Demo 3: Advanced DUP Program
console.log('\n\n📋 DEMO 3: Advanced DUP Program (16 weeks)');
console.log('-'.repeat(80));

const advancedProgram = PRESET_PROGRAMS.advanced_undulating('user_advanced_789');

console.log(`\nProtocol: ${advancedProgram.protocol.name}`);
console.log(`Periodization: ${advancedProgram.periodizationConfig.model}`);

console.log('\n📅 First 4 Weeks Preview:');
const advancedPreviews = previewUpcomingWeeks(advancedProgram, 4);
advancedPreviews.forEach((week) => {
  console.log(`   Week ${week.weekNumber}:`);
  console.log(`      Block: ${week.blockName}`);
  console.log(`      Volume: ${week.volumeMultiplier * 100}%`);
  console.log(`      Target RPE: ${week.targetRPE}`);
  console.log(`      Deload: ${week.isDeload ? 'Yes' : 'No'}`);
  if (week.keyChanges.length > 0) {
    console.log(`      Changes: ${week.keyChanges.join(', ')}`);
  }
});

// Demo 4: Week Advancement with Performance Recording
console.log('\n\n📋 DEMO 4: Week Advancement Simulation');
console.log('-'.repeat(80));

let currentProgram = beginnerProgram;

// Simulate completing Week 1
console.log('\n📝 Recording Week 1 Performance...');
const week1Performance = {
  fatigueLevel: 'moderate' as const,
  motivationLevel: 'high' as const,
  sleepQuality: 'good' as const,
  averageRPE: 8.2,
  totalVolume: 12500,
  deloadTriggered: false,
  exercises: [
    {
      exerciseName: 'Goblet Squat',
      pattern: 'compound_squat',
      weekNumber: 1,
      dayNumber: 1,
      sets: 3,
      reps: [12, 12, 11],
      weight: 50,
      rpe: [7, 8, 8],
      completed: true,
    },
    {
      exerciseName: 'Dumbbell Bench Press',
      pattern: 'horizontal_push',
      weekNumber: 1,
      dayNumber: 1,
      sets: 3,
      reps: [10, 10, 9],
      weight: 60,
      rpe: [8, 8, 9],
      completed: true,
    },
    {
      exerciseName: 'Seated Cable Row',
      pattern: 'horizontal_pull',
      weekNumber: 1,
      dayNumber: 2,
      sets: 3,
      reps: [12, 12, 12],
      weight: 120,
      rpe: [7, 7, 8],
      completed: true,
    },
  ],
};

currentProgram = advanceToNextWeek(currentProgram, week1Performance);

console.log(`✅ Advanced to Week ${currentProgram.currentWeek}`);

const week2 = getCurrentWeek(currentProgram);
console.log(`\n📅 Week 2 Adjustments:`);
console.log(`   Block: ${week2.blockFocus}`);
console.log(`   Volume: ${week2.volumeMultiplier * 100}%`);
console.log(`   Target RPE: ${week2.targetRPE}`);

// Show progression notes for exercises
console.log(`\n🏋️ Progression Recommendations:`);
week2.days[0].exercises.slice(0, 3).forEach((ex) => {
  if (ex.progressionNote) {
    console.log(`   ${ex.slot.pattern}: ${ex.progressionNote}`);
  }
  if (ex.weight) {
    console.log(`      Suggested weight: ${ex.weight} lbs`);
  }
});

// Demo 5: Fatigue Assessment
console.log('\n\n📋 DEMO 5: Fatigue Assessment');
console.log('-'.repeat(80));

const { assessment, shouldDeload } = checkFatigueStatus(currentProgram);

console.log(`\n📊 Fatigue Assessment:`);
console.log(`   Level: ${assessment.level.toUpperCase()}`);
console.log(`   Score: ${assessment.score}/100`);

if (assessment.indicators.length > 0) {
  console.log(`   Indicators Detected:`);
  assessment.indicators.forEach((ind) => console.log(`      - ${ind}`));
}

console.log(`\n   Should Deload: ${shouldDeload ? 'YES ⚠️' : 'No ✅'}`);

if (assessment.recommendations.length > 0) {
  console.log(`   Recommendations:`);
  assessment.recommendations.forEach((rec) => console.log(`      ${rec}`));
}

// Demo 6: Program Summary
console.log('\n\n📋 DEMO 6: Program Summary');
console.log('-'.repeat(80));

const summary = getProgramSummary(intermediateProgram);

console.log(`\n📈 Program: ${summary.programId}`);
console.log(`   Weeks: ${summary.weeksCompleted}/${summary.totalWeeks} completed`);
console.log(`   Current Block: ${summary.currentBlock}`);
console.log(`   Protocol: ${summary.protocol}`);

if (summary.nextWeekPreview) {
  console.log(`\n   Next Week Preview:`);
  console.log(`      Week ${summary.nextWeekPreview.weekNumber}: ${summary.nextWeekPreview.blockName}`);
  console.log(`      Volume: ${summary.nextWeekPreview.volumeMultiplier * 100}%`);
  console.log(`      Target RPE: ${summary.nextWeekPreview.targetRPE}`);
}

console.log(`\n   Fatigue Status: ${summary.fatigueStatus.level}`);

if (summary.recommendations.length > 0) {
  console.log(`\n   💡 Recommendations:`);
  summary.recommendations.forEach((rec) => console.log(`      ${rec}`));
}

// Demo 7: Progressive Overload Protocols Comparison
console.log('\n\n📋 DEMO 7: Protocol Comparison');
console.log('-'.repeat(80));

const scenarios = [
  {
    name: 'Beginner Linear',
    experience: 'beginner',
    goal: 'build_strength',
    lastSession: { weight: 135, reps: 10, sets: 3, targetReps: 10, rpe: 7 },
    targetRpe: 8,
  },
  {
    name: 'Intermediate Double Progression',
    experience: 'intermediate',
    goal: 'build_muscle',
    lastSession: { weight: 185, reps: 12, sets: 3, targetReps: 12, rpe: 8 },
    targetRpe: 8,
  },
  {
    name: 'Advanced APRE',
    experience: 'advanced',
    goal: 'build_strength',
    lastSession: { weight: 225, reps: 8, sets: 3, targetReps: 6, rpe: 9 },
    targetRpe: 9,
  },
];

scenarios.forEach((scenario) => {
  console.log(`\n🏋️ ${scenario.name}:`);
  console.log(`   Last Session: ${scenario.lastSession.weight} lbs × ${scenario.lastSession.reps} reps @ RPE ${scenario.lastSession.rpe}`);

  // Get protocol
  const { PROGRESSIVE_OVERLOAD_PROTOCOLS } = require('../lib/workout/periodization-models');
  const { calculateProgression } = require('../lib/workout/periodization-models');

  let protocolName: string;
  if (scenario.experience === 'beginner') protocolName = 'Linear Weight Addition';
  else if (scenario.goal === 'build_strength') protocolName = 'APRE (Autoregulated)';
  else protocolName = 'Double Progression';

  const protocol = PROGRESSIVE_OVERLOAD_PROTOCOLS.find((p: any) => p.name === protocolName);

  const recommendation = calculateProgression(protocol, scenario.lastSession, scenario.targetRpe);

  console.log(`   Protocol: ${protocol.name}`);
  console.log(`   Recommendation: ${recommendation.action.toUpperCase()}`);
  if (recommendation.weightChange) {
    console.log(`   Weight Change: ${recommendation.weightChange > 0 ? '+' : ''}${recommendation.weightChange} lbs`);
  }
  console.log(`   Reason: ${recommendation.reason}`);
});

// Demo 8: Week Structure Comparison
console.log('\n\n📋 DEMO 8: Week Structure by Experience');
console.log('-'.repeat(80));

const configs = [
  { level: 'beginner', goal: 'build_muscle', weeks: 8 },
  { level: 'intermediate', goal: 'build_muscle', weeks: 12 },
  { level: 'advanced', goal: 'build_strength', weeks: 16 },
];

const { getPeriodizationConfig } = require('../lib/workout/periodization-models');

configs.forEach(({ level, goal, weeks }) => {
  const config = getPeriodizationConfig(level, goal, weeks);
  const currentWeek = getCurrentWeekStructure(config);

  console.log(`\n${level.toUpperCase()} (${goal}, ${weeks} weeks):`);
  console.log(`   Model: ${config.model}`);
  console.log(`   Blocks: ${config.blocks.length}`);
  console.log(`   Deload Every: ${config.deloadStrategy.frequency} weeks`);
  console.log(`   Current Week Volume: ${currentWeek?.volumeMultiplier || 1.0 * 100}%`);
  console.log(`   Current Week RPE: ${currentWeek?.intensityTarget || 8}`);
});

console.log('\n' + '='.repeat(80));
console.log('DEMONSTRATION COMPLETE');
console.log('='.repeat(80));
