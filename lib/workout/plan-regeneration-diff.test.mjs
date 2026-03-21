import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWorkoutPlanDiff } from './plan-regeneration-diff.ts';

function makePlan(overrides = {}) {
  return {
    id: 'plan-current',
    familyKey: 'upper_lower_4',
    progressionModel: 'double_progression',
    daysPerWeek: 4,
    weeklyLayout: [
      { weekday: 'mon', planDayId: 'day-1', sessionType: 'workout' },
      { weekday: 'tue', planDayId: null, sessionType: 'rest' },
      { weekday: 'wed', planDayId: 'day-2', sessionType: 'workout' },
      { weekday: 'thu', planDayId: null, sessionType: 'rest' },
      { weekday: 'fri', planDayId: 'day-3', sessionType: 'workout' },
      { weekday: 'sat', planDayId: null, sessionType: 'rest' },
      { weekday: 'sun', planDayId: 'day-4', sessionType: 'workout' },
    ],
    days: [
      {
        id: 'day-1',
        name: 'Upper Power',
        focus: 'Upper strength',
        estimatedDurationMin: 75,
        exercises: [
          { exerciseId: 'bench', name: 'Bench Press' },
          { exerciseId: 'row', name: 'Chest Supported Row' },
          { exerciseId: 'press', name: 'Overhead Press' },
        ],
      },
      {
        id: 'day-2',
        name: 'Lower Power',
        focus: 'Lower strength',
        estimatedDurationMin: 75,
        exercises: [
          { exerciseId: 'squat', name: 'Back Squat' },
          { exerciseId: 'rdl', name: 'Romanian Deadlift' },
          { exerciseId: 'curl', name: 'Leg Curl' },
        ],
      },
      {
        id: 'day-3',
        name: 'Upper Hypertrophy',
        focus: 'Upper hypertrophy',
        estimatedDurationMin: 70,
        exercises: [
          { exerciseId: 'incline', name: 'Incline Press' },
          { exerciseId: 'pulldown', name: 'Lat Pulldown' },
          { exerciseId: 'raise', name: 'Lateral Raise' },
        ],
      },
      {
        id: 'day-4',
        name: 'Lower Hypertrophy',
        focus: 'Lower hypertrophy',
        estimatedDurationMin: 70,
        exercises: [
          { exerciseId: 'legpress', name: 'Leg Press' },
          { exerciseId: 'split-squat', name: 'Bulgarian Split Squat' },
          { exerciseId: 'calf', name: 'Standing Calf Raise' },
        ],
      },
    ],
    ...overrides,
  };
}

test('identical plan is flagged as a no-op regeneration candidate', () => {
  const currentPlan = makePlan();
  const previewPlan = makePlan({ id: 'plan-preview' });

  const diff = buildWorkoutPlanDiff({ currentPlan, previewPlan });

  assert.equal(diff.familyChanged, false);
  assert.equal(diff.progressionChanged, false);
  assert.equal(diff.daysPerWeekChanged, false);
  assert.equal(diff.weeklyLayoutChanged, false);
  assert.equal(diff.exerciseOverlapPercent, 100);
  assert.equal(diff.isMateriallyDifferent, false);
  assert.equal(diff.changeSummary.length, 0);
});

test('family, schedule, and duration shifts produce a material replacement preview', () => {
  const currentPlan = makePlan();
  const previewPlan = makePlan({
    id: 'plan-preview',
    familyKey: 'ppl_5',
    progressionModel: 'top_set_backoff',
    daysPerWeek: 5,
    weeklyLayout: [
      { weekday: 'mon', planDayId: 'day-a', sessionType: 'workout' },
      { weekday: 'tue', planDayId: 'day-b', sessionType: 'workout' },
      { weekday: 'wed', planDayId: null, sessionType: 'rest' },
      { weekday: 'thu', planDayId: 'day-c', sessionType: 'workout' },
      { weekday: 'fri', planDayId: null, sessionType: 'rest' },
      { weekday: 'sat', planDayId: 'day-d', sessionType: 'workout' },
      { weekday: 'sun', planDayId: 'day-e', sessionType: 'workout' },
    ],
    days: [
      {
        id: 'day-a',
        name: 'Push',
        focus: 'Chest shoulders triceps',
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: 'bench', name: 'Bench Press' },
          { exerciseId: 'dip', name: 'Weighted Dip' },
          { exerciseId: 'raise', name: 'Lateral Raise' },
        ],
      },
      {
        id: 'day-b',
        name: 'Pull',
        focus: 'Back biceps',
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: 'row', name: 'Chest Supported Row' },
          { exerciseId: 'pulldown', name: 'Lat Pulldown' },
          { exerciseId: 'curl', name: 'EZ Bar Curl' },
        ],
      },
      {
        id: 'day-c',
        name: 'Legs',
        focus: 'Quads glutes hamstrings',
        estimatedDurationMin: 55,
        exercises: [
          { exerciseId: 'squat', name: 'Back Squat' },
          { exerciseId: 'legpress', name: 'Leg Press' },
          { exerciseId: 'curl', name: 'Leg Curl' },
        ],
      },
      {
        id: 'day-d',
        name: 'Upper',
        focus: 'Upper balance',
        estimatedDurationMin: 50,
        exercises: [
          { exerciseId: 'incline', name: 'Incline Press' },
          { exerciseId: 'pulldown', name: 'Lat Pulldown' },
          { exerciseId: 'raise', name: 'Lateral Raise' },
        ],
      },
      {
        id: 'day-e',
        name: 'Lower',
        focus: 'Lower balance',
        estimatedDurationMin: 50,
        exercises: [
          { exerciseId: 'rdl', name: 'Romanian Deadlift' },
          { exerciseId: 'split-squat', name: 'Bulgarian Split Squat' },
          { exerciseId: 'calf', name: 'Standing Calf Raise' },
        ],
      },
    ],
  });

  const diff = buildWorkoutPlanDiff({ currentPlan, previewPlan });

  assert.equal(diff.familyChanged, true);
  assert.equal(diff.progressionChanged, true);
  assert.equal(diff.daysPerWeekChanged, true);
  assert.equal(diff.weeklyLayoutChanged, true);
  assert.equal(diff.isMateriallyDifferent, true);
  assert.match(diff.changeSummary.join(' | '), /Changed family/i);
  assert.match(diff.changeSummary.join(' | '), /days/i);
  assert.match(diff.changeSummary.join(' | '), /Shortened target sessions/i);
});

test('large exercise turnover and removed lifts count as material even when family is unchanged', () => {
  const currentPlan = makePlan();
  const previewPlan = makePlan({
    id: 'plan-preview',
    days: [
      {
        id: 'day-1',
        name: 'Upper Power',
        focus: 'Upper strength',
        estimatedDurationMin: 65,
        exercises: [
          { exerciseId: 'landmine', name: 'Landmine Press' },
          { exerciseId: 'seal-row', name: 'Seal Row' },
          { exerciseId: 'pushup', name: 'Push-Up' },
        ],
      },
      {
        id: 'day-2',
        name: 'Lower Power',
        focus: 'Lower strength',
        estimatedDurationMin: 65,
        exercises: [
          { exerciseId: 'hack', name: 'Hack Squat' },
          { exerciseId: 'hip-thrust', name: 'Hip Thrust' },
          { exerciseId: 'curl-seated', name: 'Seated Leg Curl' },
        ],
      },
      {
        id: 'day-3',
        name: 'Upper Hypertrophy',
        focus: 'Upper hypertrophy',
        estimatedDurationMin: 65,
        exercises: [
          { exerciseId: 'machine-press', name: 'Machine Chest Press' },
          { exerciseId: 'cable-row', name: 'Cable Row' },
          { exerciseId: 'rear-delt', name: 'Reverse Pec Deck' },
        ],
      },
      {
        id: 'day-4',
        name: 'Lower Hypertrophy',
        focus: 'Lower hypertrophy',
        estimatedDurationMin: 65,
        exercises: [
          { exerciseId: 'belt', name: 'Belt Squat' },
          { exerciseId: 'stepup', name: 'Step-Up' },
          { exerciseId: 'tib', name: 'Tibialis Raise' },
        ],
      },
    ],
  });

  const diff = buildWorkoutPlanDiff({ currentPlan, previewPlan });

  assert.equal(diff.familyChanged, false);
  assert.ok(diff.exerciseOverlapPercent < 20);
  assert.equal(diff.isMateriallyDifferent, true);
  assert.ok(diff.removedExerciseNames.includes('Overhead Press'));
  assert.ok(diff.addedExerciseNames.includes('Landmine Press'));
});
