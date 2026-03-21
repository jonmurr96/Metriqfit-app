import assert from 'node:assert/strict';
import test from 'node:test';

import {
  inferProgramFamilyKeyFromPlanIdentity,
  inferPrimaryExerciseFocus,
  resolveDayFocusPolicy,
} from './programMappingRules.ts';

test('calf raises stay lower-body even when pattern metadata is noisy', () => {
  const focus = inferPrimaryExerciseFocus({
    id: 'calf-1',
    name: 'Exercise Ball On The Wall Calf Raise',
    category: 'Lower Body',
    equipment_required: ['bodyweight'],
    primary_muscle: 'calves',
    pattern: 'shoulder_accessory',
    difficulty: 'beginner',
  });

  assert.equal(focus, 'legs');
});

test('inverse leg curls stay lower-body even when pattern metadata points at arms', () => {
  const focus = inferPrimaryExerciseFocus({
    id: 'leg-curl-1',
    name: 'Cable Assisted Inverse Leg Curl',
    category: 'Lower Body',
    equipment_required: ['cable'],
    primary_muscle: 'hamstrings',
    pattern: 'biceps',
    difficulty: 'intermediate',
  });

  assert.equal(focus, 'hamstrings');
});

test('explicit family blueprints stay authoritative for bro split chest day', () => {
  const policy = resolveDayFocusPolicy({
    dayName: 'Chest',
    dayFocus: 'Horizontal/vertical pressing + accessories',
    familyKey: 'bro_split_5',
    dayIndex: 1,
    daysPerWeek: 5,
    goalTags: ['hypertrophy'],
  });

  assert.deepEqual(policy.primaryFocusTags, ['chest']);
  assert.equal(policy.source, 'blueprint');
});

test('explicit family blueprints stay authoritative for bro split back day', () => {
  const policy = resolveDayFocusPolicy({
    dayName: 'Back',
    dayFocus: 'Posterior chain and pulling volume',
    familyKey: 'bro_split_5',
    dayIndex: 2,
    daysPerWeek: 5,
    goalTags: ['hypertrophy'],
  });

  assert.deepEqual(policy.primaryFocusTags, ['back']);
  assert.equal(policy.source, 'blueprint');
});

test('program family identity can be recovered from legacy bro split plans', () => {
  const familyKey = inferProgramFamilyKeyFromPlanIdentity({
    planName: 'Bro Split (5 Days)',
    dayNames: ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms'],
    daysPerWeek: 5,
  });

  assert.equal(familyKey, 'bro_split_5');
});
