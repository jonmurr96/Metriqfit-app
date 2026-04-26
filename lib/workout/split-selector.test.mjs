import assert from 'node:assert/strict';
import test from 'node:test';

import { selectSplit } from './split-selector.ts';

test('split selector gives beginners on 3 days a full body split', () => {
  const result = selectSplit({
    daysPerWeek: 3,
    experienceLevel: 'beginner',
    primaryGoal: 'build_muscle',
    equipmentAccess: 'full_gym',
  });

  assert.equal(result.familyKey, 'full_body_beginner_3');
});

test('split selector keeps 3-day intermediates on full body unless bodybuilding style is explicit', () => {
  const result = selectSplit({
    daysPerWeek: 3,
    experienceLevel: 'intermediate',
    primaryGoal: 'build_muscle',
    equipmentAccess: 'full_gym',
    sessionDurationMin: 45,
    trainingStylePreference: 'balanced',
  });

  assert.equal(result.familyKey, 'full_body_beginner_3');
});

test('split selector allows 3-day PPL only for bodybuilding-style intermediates with enough time', () => {
  const result = selectSplit({
    daysPerWeek: 3,
    experienceLevel: 'intermediate',
    primaryGoal: 'build_muscle',
    equipmentAccess: 'full_gym',
    sessionDurationMin: 60,
    trainingStylePreference: 'bodybuilding',
    explicitBodybuildingIntent: true,
  });

  assert.equal(result.familyKey, 'ppl_3');
});

test('split selector gives 5-day intermediate hypertrophy users the hybrid PPL split', () => {
  const result = selectSplit({
    daysPerWeek: 5,
    experienceLevel: 'intermediate',
    primaryGoal: 'build_muscle',
    equipmentAccess: 'full_gym',
  });

  assert.equal(result.familyKey, 'ppl_ul_hybrid_5');
});

test('split selector gives short-session 5-day users upper/lower instead of a higher-fatigue split', () => {
  const result = selectSplit({
    daysPerWeek: 5,
    experienceLevel: 'intermediate',
    primaryGoal: 'build_muscle',
    equipmentAccess: 'full_gym',
    sessionDurationMin: 35,
    trainingStylePreference: 'balanced',
  });

  assert.equal(result.familyKey, 'upper_lower_5');
});

test('split selector gives 5-day general-fitness users upper/lower instead of bodyweight or bodybuilding splits', () => {
  const result = selectSplit({
    daysPerWeek: 5,
    experienceLevel: 'intermediate',
    primaryGoal: 'general_fitness',
    equipmentAccess: 'full_gym',
    trainingStylePreference: 'balanced',
  });

  assert.equal(result.familyKey, 'upper_lower_5');
});

test('split selector gives 5-day full-gym strength users powerbuilding', () => {
  const result = selectSplit({
    daysPerWeek: 5,
    experienceLevel: 'intermediate',
    primaryGoal: 'get_stronger',
    equipmentAccess: 'full_gym',
    trainingStylePreference: 'strength',
  });

  assert.equal(result.familyKey, 'powerbuilding_5');
});

test('split selector allows an explicit bro split only for bodybuilding-style intermediates', () => {
  const result = selectSplit({
    daysPerWeek: 5,
    experienceLevel: 'intermediate',
    primaryGoal: 'build_muscle',
    equipmentAccess: 'full_gym',
    preferredSplitFamily: 'bro_split_5',
    trainingStylePreference: 'bodybuilding',
    explicitBodybuildingIntent: true,
    sessionDurationMin: 60,
  });

  assert.equal(result.familyKey, 'bro_split_5');
});

test('split selector allows an intentional 5-day bro split for explicit bodybuilding users without a split override', () => {
  const result = selectSplit({
    daysPerWeek: 5,
    experienceLevel: 'advanced',
    primaryGoal: 'build_muscle',
    equipmentAccess: 'full_gym',
    trainingStylePreference: 'bodybuilding',
    explicitBodybuildingIntent: true,
    sessionDurationMin: 60,
  });

  assert.equal(result.familyKey, 'bro_split_5');
});

test('split selector forces bodyweight users into a bodyweight program', () => {
  const result = selectSplit({
    daysPerWeek: 4,
    experienceLevel: 'intermediate',
    primaryGoal: 'general_fitness',
    equipmentAccess: 'bodyweight_only',
  });

  assert.equal(result.familyKey, 'bodyweight_only_3');
});
