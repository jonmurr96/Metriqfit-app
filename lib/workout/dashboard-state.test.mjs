import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWorkoutDashboardState,
} from './dashboard-state.ts';

test('active session hero outranks planned workout and exposes resume state', () => {
  const state = buildWorkoutDashboardState({
    now: new Date('2026-03-13T16:45:00'),
    hasActivePlan: true,
    activeSession: {
      id: 'session-1',
      name: 'Lower Hypertrophy',
      startedAt: '2026-03-13T16:05:00',
      exercises: [
        { id: 'ex-1', name: 'Back Squat', loggedSetCount: 3 },
        { id: 'ex-2', name: 'Romanian Deadlift', loggedSetCount: 0 },
        { id: 'ex-3', name: 'Leg Press', loggedSetCount: 0 },
      ],
    },
    todayEntry: {
      sessionType: 'workout',
      status: 'planned',
      planDayId: 'day-1',
      planDayName: 'Lower Hypertrophy',
      focus: 'Quads and glutes',
    },
    tomorrowEntry: {
      sessionType: 'active_recovery',
      status: 'planned',
      planDayId: null,
      planDayName: null,
      focus: null,
    },
    latestConsistencyScore: 82,
    weeklyStats: {
      totalSessions: 3,
      totalVolumeLb: 21450,
      avgDurationMinutes: 58,
    },
    recentHistory: [],
    pendingRecommendations: [],
  });

  assert.equal(state.hero.mode, 'active_session');
  assert.equal(state.hero.primaryAction, 'resume_session');
  assert.equal(state.hero.progress.completedExercises, 1);
  assert.equal(state.hero.progress.totalExercises, 3);
  assert.equal(state.hero.progress.currentExerciseName, 'Romanian Deadlift');
  assert.equal(state.compact.primaryCard.action, 'resume_session');
  assert.match(state.compact.primaryCard.meta, /1\/3/);
});

test('same-day stale active session becomes an explicit cleanup state', () => {
  const state = buildWorkoutDashboardState({
    now: new Date('2026-03-13T16:45:00'),
    hasActivePlan: true,
    activeSession: {
      id: 'session-stale',
      name: 'Lower Hypertrophy',
      startedAt: '2026-03-13T02:15:00',
      exercises: [
        { id: 'ex-1', name: 'Back Squat', loggedSetCount: 3 },
        { id: 'ex-2', name: 'Romanian Deadlift', loggedSetCount: 0 },
      ],
    },
    todayEntry: {
      sessionType: 'workout',
      status: 'planned',
      planDayId: 'day-1',
      planDayName: 'Lower Hypertrophy',
      focus: 'Quads and glutes',
    },
    tomorrowEntry: null,
    latestConsistencyScore: 82,
    weeklyStats: {
      totalSessions: 3,
      totalVolumeLb: 21450,
      avgDurationMinutes: 58,
    },
    recentHistory: [],
    pendingRecommendations: [],
  });

  assert.equal(state.hero.mode, 'stale_session');
  assert.equal(state.hero.primaryAction, 'resume_session');
  assert.equal(state.hero.secondaryAction, 'open_plan');
  assert.match(state.hero.title, /older|stale|open/i);
  assert.equal(state.compact.primaryCard.title, 'Resume workout');
});

test('active session with all exercises logged prompts session wrap instead of showing a fake next exercise', () => {
  const state = buildWorkoutDashboardState({
    now: new Date('2026-03-13T16:45:00'),
    hasActivePlan: true,
    activeSession: {
      id: 'session-2',
      name: 'Chest + Arms',
      startedAt: '2026-03-13T14:05:00',
      exercises: [
        { id: 'ex-1', name: 'Incline Press', loggedSetCount: 3 },
        { id: 'ex-2', name: 'Lateral Raise', loggedSetCount: 3 },
      ],
    },
    todayEntry: {
      sessionType: 'workout',
      status: 'planned',
      planDayId: 'day-1',
      planDayName: 'Chest + Arms',
      focus: 'Upper body',
    },
    tomorrowEntry: null,
    latestConsistencyScore: 82,
    weeklyStats: {
      totalSessions: 3,
      totalVolumeLb: 21450,
      avgDurationMinutes: 58,
    },
    recentHistory: [],
    pendingRecommendations: [],
  });

  assert.equal(state.hero.mode, 'active_session');
  assert.equal(state.hero.progress.completedExercises, 2);
  assert.equal(state.hero.progress.totalExercises, 2);
  assert.equal(state.hero.progress.currentExerciseName, null);
  assert.equal(state.hero.primaryAction, 'finish_session');
  assert.equal(state.hero.primaryLabel, 'Finish Workout');
  assert.match(state.hero.subtitle, /finish|close|wrap/i);
});

test('completed workout day switches to summary/recovery state when a finished session exists today', () => {
  const state = buildWorkoutDashboardState({
    now: new Date('2026-03-13T19:15:00'),
    hasActivePlan: true,
    activeSession: null,
    todayEntry: {
      sessionType: 'workout',
      status: 'completed',
      planDayId: 'day-2',
      planDayName: 'Push Strength',
      focus: 'Chest and shoulders',
    },
    tomorrowEntry: {
      sessionType: 'workout',
      status: 'planned',
      planDayId: 'day-3',
      planDayName: 'Pull Strength',
      focus: 'Back and biceps',
    },
    latestConsistencyScore: 88,
    weeklyStats: {
      totalSessions: 4,
      totalVolumeLb: 26780,
      avgDurationMinutes: 61,
    },
    recentHistory: [
      {
        id: 'session-today',
        name: 'Push Strength',
        startedAt: '2026-03-13T17:00:00',
        durationSeconds: 3720,
        volumeLb: 10240,
        prCount: 1,
      },
    ],
    pendingRecommendations: [],
  });

  assert.equal(state.hero.mode, 'completed_today');
  assert.equal(state.hero.primaryAction, 'view_summary');
  assert.equal(state.hero.completedSessionId, 'session-today');
  assert.equal(state.hero.metrics.length, 3);
  assert.deepEqual(
    state.hero.metrics.map((item) => item.label),
    ['Duration', 'Volume', 'PRs'],
  );
  assert.equal(state.tomorrow.title, 'Tomorrow: Pull Strength');
  assert.equal(state.compact.primaryCard.action, 'view_summary');
});

test('missed workout day pivots to a make-up recovery hero', () => {
  const state = buildWorkoutDashboardState({
    now: new Date('2026-03-13T21:15:00'),
    hasActivePlan: true,
    activeSession: null,
    todayEntry: {
      sessionType: 'workout',
      status: 'missed',
      planDayId: 'day-6',
      planDayName: 'Upper Strength',
      focus: 'Back and chest',
    },
    tomorrowEntry: {
      sessionType: 'workout',
      status: 'planned',
      planDayId: 'day-7',
      planDayName: 'Conditioning Builder',
      focus: 'Engine and trunk',
    },
    latestConsistencyScore: 54,
    weeklyStats: {
      totalSessions: 1,
      totalVolumeLb: 8800,
      avgDurationMinutes: 49,
    },
    recentHistory: [],
    pendingRecommendations: [],
  });

  assert.equal(state.hero.mode, 'missed_session');
  assert.equal(state.hero.primaryAction, 'open_plan');
  assert.equal(state.hero.secondaryAction, 'open_tomorrow');
  assert.match(state.hero.title, /Missed/i);
  assert.match(state.coachQueue.title, /Recover/i);
});

test('recovery day pivots to recovery guidance and keeps tomorrow prominent', () => {
  const state = buildWorkoutDashboardState({
    now: new Date('2026-03-13T09:10:00'),
    hasActivePlan: true,
    activeSession: null,
    todayEntry: {
      sessionType: 'active_recovery',
      status: 'planned',
      planDayId: null,
      planDayName: null,
      focus: null,
    },
    tomorrowEntry: {
      sessionType: 'workout',
      status: 'planned',
      planDayId: 'day-4',
      planDayName: 'Lower Strength',
      focus: 'Posterior chain',
    },
    latestConsistencyScore: 76,
    weeklyStats: {
      totalSessions: 2,
      totalVolumeLb: 14300,
      avgDurationMinutes: 54,
    },
    recentHistory: [],
    pendingRecommendations: [],
  });

  assert.equal(state.hero.mode, 'recovery');
  assert.equal(state.hero.primaryAction, 'open_plan');
  assert.match(state.hero.title, /Recovery/i);
  assert.match(state.tomorrow.subtitle, /Posterior chain/i);
  assert.equal(state.compact.myPlanTile.action, 'open_plan');
});

test('pending recommendations produce an actionable coach queue limited to two items', () => {
  const state = buildWorkoutDashboardState({
    now: new Date('2026-03-13T12:00:00'),
    hasActivePlan: true,
    activeSession: null,
    todayEntry: {
      sessionType: 'workout',
      status: 'planned',
      planDayId: 'day-5',
      planDayName: 'Upper Pump',
      focus: 'Chest, back, delts',
    },
    tomorrowEntry: null,
    latestConsistencyScore: 64,
    weeklyStats: {
      totalSessions: 1,
      totalVolumeLb: 8800,
      avgDurationMinutes: 49,
    },
    recentHistory: [],
    pendingRecommendations: [
      {
        id: 'rec-1',
        recommendationType: 'deload_microcycle',
        rationale: 'Fatigue markers are elevated.',
        status: 'pending',
      },
      {
        id: 'rec-2',
        recommendationType: 'schedule_recovery_shift',
        rationale: 'Two planned sessions were missed.',
        status: 'pending',
      },
      {
        id: 'rec-3',
        recommendationType: 'load_adjustment',
        rationale: 'RPE drift is trending high.',
        status: 'pending',
      },
    ],
  });

  assert.equal(state.coachQueue.mode, 'recommendations');
  assert.equal(state.coachQueue.items.length, 2);
  assert.equal(state.coachQueue.items[0].primaryAction, 'accept_recommendation');
  assert.equal(state.coachQueue.reviewAllAction, 'open_adaptation');
  assert.equal(state.compact.coachInsightTile.badgeLabel, '2');
});

test('without an active plan the hero falls back to browse programs and generate plan', () => {
  const state = buildWorkoutDashboardState({
    now: new Date('2026-03-13T07:20:00'),
    hasActivePlan: false,
    activeSession: null,
    todayEntry: null,
    tomorrowEntry: null,
    latestConsistencyScore: 0,
    weeklyStats: {
      totalSessions: 0,
      totalVolumeLb: 0,
      avgDurationMinutes: 0,
    },
    recentHistory: [],
    pendingRecommendations: [],
  });

  assert.equal(state.hero.mode, 'no_plan');
  assert.equal(state.hero.primaryAction, 'browse_programs');
  assert.equal(state.hero.secondaryAction, 'generate_plan');
  assert.equal(state.coachQueue.mode, 'fallback');
  assert.equal(state.compact.resources.length, 6);
  assert.deepEqual(
    state.compact.quickActions.map((item) => item.label),
    ['Notes', 'Exercise Library', 'Programs', 'Tools'],
  );
});
