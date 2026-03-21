import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProgressRecordSummary,
  buildProgressSummary,
  getProgressRangeConfig,
} from './progress-insights.ts';

function isoDaysAgo(days) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return date.toISOString();
}

function makePr({
  id,
  name,
  weight = 225,
  reps = 5,
  estimated1rm = 262.5,
  achievedAt = isoDaysAgo(3),
  category = 'Chest / Push',
  primaryMuscle = 'chest',
}) {
  return {
    id,
    weight_lb: weight,
    reps,
    estimated_1rm: estimated1rm,
    achieved_at: achievedAt,
    exercise: {
      id: `${id}-exercise`,
      name,
      category,
      primary_muscle: primaryMuscle,
    },
  };
}

test('14D range maps to a 14-day week-style config', () => {
  const config = getProgressRangeConfig('14D');

  assert.equal(config.days, 14);
  assert.equal(config.timeframe, 'week');
  assert.equal(config.bucketSize, 'day');
});

test('buildProgressSummary marks healthy recent metrics as on track', () => {
  const summary = buildProgressSummary({
    goalBenchmarkStatus: 'on_track',
    consistencyAverage: 82,
    weightChangePercent: -1.3,
    sessionsPerWeek: 3.4,
    volumeChangePercent: 8,
    prCount30d: 2,
    qualityFlags: [
      { key: 'weight_data', status: 'good' },
      { key: 'consistency_data', status: 'good' },
      { key: 'workout_data', status: 'good' },
    ],
    dataFreshness: {
      weightLastLoggedAt: isoDaysAgo(1),
      consistencyLastLoggedAt: isoDaysAgo(1),
      workoutLastSessionAt: isoDaysAgo(2),
    },
  });

  assert.equal(summary.status, 'on_track');
  assert.equal(summary.primaryDriver, 'performance');
  assert.match(summary.headline, /On track/i);
  assert.match(summary.subheadline, /volume up 8%/i);
});

test('buildProgressSummary marks stale data clearly', () => {
  const summary = buildProgressSummary({
    goalBenchmarkStatus: null,
    consistencyAverage: 0,
    weightChangePercent: 0,
    sessionsPerWeek: 0,
    volumeChangePercent: null,
    prCount30d: 0,
    qualityFlags: [
      { key: 'weight_data', status: 'missing' },
      { key: 'consistency_data', status: 'missing' },
      { key: 'workout_data', status: 'missing' },
    ],
    dataFreshness: {
      weightLastLoggedAt: isoDaysAgo(18),
      consistencyLastLoggedAt: isoDaysAgo(16),
      workoutLastSessionAt: isoDaysAgo(21),
    },
  });

  assert.equal(summary.status, 'stale');
  assert.equal(summary.primaryDriver, 'mixed');
  assert.match(summary.subheadline, /fresh check-ins/i);
});

test('buildProgressRecordSummary returns highlight, top lifts, and movement families', () => {
  const summary = buildProgressRecordSummary([
    makePr({
      id: 'bench',
      name: 'Barbell Bench Press',
      weight: 245,
      reps: 3,
      estimated1rm: 269.5,
      achievedAt: isoDaysAgo(2),
      category: 'Chest / Push',
      primaryMuscle: 'chest',
    }),
    makePr({
      id: 'squat',
      name: 'Back Squat',
      weight: 315,
      reps: 4,
      estimated1rm: 357,
      achievedAt: isoDaysAgo(12),
      category: 'Lower Body',
      primaryMuscle: 'quads',
    }),
    makePr({
      id: 'row',
      name: 'Barbell Row',
      weight: 205,
      reps: 6,
      estimated1rm: 246,
      achievedAt: isoDaysAgo(25),
      category: 'Back / Pull',
      primaryMuscle: 'upper_back',
    }),
  ]);

  assert.equal(summary.highlight?.exercise, 'Barbell Bench Press');
  assert.equal(summary.topEstimated1Rm[0]?.exercise, 'Back Squat');
  assert.equal(summary.movementFamilies[0]?.family, 'Lower Body');
  assert.equal(summary.recentRecords.length, 3);
});
