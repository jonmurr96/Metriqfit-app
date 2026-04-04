import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveGeneratedSplitDayProfile, selectExercisesForGeneratedSplitDay } from './generated-split-selection.ts';

function makeExercise(id, name, primary_muscle, category, pattern = null) {
  return {
    id,
    name,
    category,
    equipment_required: ['barbell'],
    primary_muscle,
    pattern,
    difficulty: 'intermediate',
  };
}

test('chest day selection refuses calf and hamstring filler exercises', () => {
  const result = selectExercisesForGeneratedSplitDay({
    familyKey: 'bro_split_5',
    dayIndex: 1,
    daysPerWeek: 5,
    day: {
      key: 'chest',
      name: 'Chest',
      focus: 'Horizontal/vertical pressing + accessories',
    },
    exercises: [
      makeExercise('bench', 'Barbell Bench Press', 'chest', 'Upper Body', 'horizontal_press'),
      makeExercise('incline', 'Incline Dumbbell Press', 'chest', 'Upper Body', 'horizontal_press'),
      makeExercise('flye', 'Cable Flye', 'chest', 'Upper Body', 'chest_accessory'),
      makeExercise('dip', 'Weighted Dip', 'triceps', 'Upper Body', 'triceps'),
      makeExercise('calf', 'Lever Donkey Calf Raise', 'calves', 'Lower Body', 'shoulder_accessory'),
      makeExercise('curl', 'Lying Leg Curl', 'hamstrings', 'Lower Body', 'biceps'),
    ],
  });

  assert.equal(result.exercises.some((exercise) => /calf|leg curl/i.test(exercise.name)), false);
  assert.ok(result.exercises.length <= result.targetExercises);
});

test('back day selection returns fewer exercises rather than padding with squats', () => {
  const result = selectExercisesForGeneratedSplitDay({
    familyKey: 'bro_split_5',
    dayIndex: 2,
    daysPerWeek: 5,
    day: {
      key: 'back',
      name: 'Back',
      focus: 'Posterior chain and pulling volume',
    },
    exercises: [
      makeExercise('row', 'Chest Supported Row', 'upper_back', 'Back / Pull', 'horizontal_pull'),
      makeExercise('pulldown', 'Lat Pulldown', 'lats', 'Back / Pull', 'vertical_pull'),
      makeExercise('facepull', 'Face Pull', 'rear_delts', 'Back / Pull', 'rear_delt'),
      makeExercise('curl', 'EZ Bar Curl', 'biceps', 'Arms', 'biceps'),
      makeExercise('squat', 'Barbell Narrow Stance Squat', 'glutes', 'Lower Body', 'squat'),
      makeExercise('leg-curl', 'Lying Leg Curl', 'hamstrings', 'Lower Body', 'hamstrings'),
    ],
  });

  assert.equal(result.exercises.some((exercise) => /squat|leg curl/i.test(exercise.name)), false);
  assert.ok(result.exercises.length <= result.targetExercises);
});

test('selection suppresses near-duplicate calf raise variants instead of repeating them', () => {
  const result = selectExercisesForGeneratedSplitDay({
    familyKey: 'bro_split_5',
    dayIndex: 4,
    daysPerWeek: 5,
    day: {
      key: 'legs',
      name: 'Legs',
      focus: 'Quads glutes hamstrings',
    },
    exercises: [
      makeExercise('squat', 'Back Squat', 'quads', 'Lower Body', 'squat'),
      makeExercise('rdl', 'Romanian Deadlift', 'hamstrings', 'Lower Body', 'hinge'),
      makeExercise('press', 'Leg Press', 'quads', 'Lower Body', 'leg_press'),
      makeExercise('calf-1', 'Standing Calf Raise', 'calves', 'Lower Body', 'calf_raise'),
      makeExercise('calf-2', 'Seated Calf Raise', 'calves', 'Lower Body', 'calf_raise'),
      makeExercise('calf-3', 'Donkey Calf Raise', 'calves', 'Lower Body', 'calf_raise'),
      makeExercise('curl', 'Seated Leg Curl', 'hamstrings', 'Lower Body', 'leg_curl'),
    ],
  });

  const calfCount = result.exercises.filter((exercise) => /calf raise/i.test(exercise.name)).length;
  assert.ok(calfCount <= 1);
});

test('slot-based selection returns programming metadata for persisted blueprint slots', () => {
  const result = selectExercisesForGeneratedSplitDay({
    familyKey: 'upper_lower_4',
    dayIndex: 1,
    daysPerWeek: 4,
    day: {
      key: 'upper_a',
      name: 'Upper A',
      focus: 'Push and pull balance',
      slots: [
        { slot: 'horizontal_push', priority: 1 },
        { slot: 'horizontal_pull', priority: 1 },
      ],
      targetExercises: 2,
      minExercises: 2,
      minPrimaryExercises: 2,
    },
    exercises: [
      makeExercise('bench', 'Barbell Bench Press', 'chest', 'Upper Body', 'horizontal_push'),
      makeExercise('row', 'Chest Supported Row', 'back', 'Back / Pull', 'horizontal_pull'),
    ],
  });

  assert.equal(result.exercises.length, 2);
  assert.equal(result.selectedExercises.length, 2);
  assert.deepEqual(
    result.selectedExercises.map((entry) => [entry.slot, entry.sets, entry.repRange, entry.restSeconds]),
    [
      ['horizontal_push', 4, [6, 10], 120],
      ['horizontal_pull', 4, [6, 10], 120],
    ],
  );
});

test('slot-based selection can fill rear delt and shoulder raise slots in the same day', () => {
  const result = selectExercisesForGeneratedSplitDay({
    familyKey: 'upper_lower_5',
    dayIndex: 5,
    daysPerWeek: 5,
    day: {
      key: 'upper_c',
      name: 'Upper C',
      focus: 'Shoulders and arms finisher',
      slots: [
        { slot: 'rear_delt', priority: 1 },
        { slot: 'shoulder_raise', priority: 1 },
      ],
      targetExercises: 2,
      minExercises: 2,
      minPrimaryExercises: 2,
    },
    exercises: [
      makeExercise('rear-delt', 'Rear Delt Fly', 'rear_delts', 'Upper Body', 'rear_delt'),
      makeExercise('lateral-raise', 'Dumbbell Lateral Raise', 'shoulders', 'Upper Body', 'shoulder_accessory'),
    ],
  });

  assert.deepEqual(
    result.exercises.map((exercise) => exercise.name),
    ['Rear Delt Fly', 'Dumbbell Lateral Raise'],
  );
});

test('slot-based selection prefers staple full-gym defaults over novelty substitutions', () => {
  const result = selectExercisesForGeneratedSplitDay({
    familyKey: 'upper_lower_4',
    dayIndex: 1,
    daysPerWeek: 4,
    day: {
      key: 'upper_a',
      name: 'Upper A',
      focus: 'Push and pull balance',
      slots: [
        { slot: 'horizontal_push', priority: 1 },
        { slot: 'horizontal_pull', priority: 1 },
      ],
      targetExercises: 2,
      minExercises: 2,
      minPrimaryExercises: 2,
    },
    exercises: [
      makeExercise('bench', 'Barbell Bench Press', 'chest', 'Upper Body', 'horizontal_push'),
      makeExercise('medicine-ball', 'Medicine Ball Close Grip Push Up', 'chest', 'Upper Body', 'horizontal_push'),
      makeExercise('row', 'Chest Supported Row', 'back', 'Back / Pull', 'horizontal_pull'),
      makeExercise('bodyweight-row', 'Bodyweight Standing One Arm Row', 'back', 'Back / Pull', 'horizontal_pull'),
    ],
    qualityContext: {
      experienceLevel: 'beginner',
      equipmentAccess: 'full_gym',
      primaryGoal: 'lose_fat',
      trainingStylePreference: 'general_fitness',
      sessionDurationMin: 60,
    },
  });

  assert.deepEqual(
    result.exercises.map((exercise) => exercise.name),
    ['Barbell Bench Press', 'Chest Supported Row'],
  );
});

test('bro split blueprint keeps arms day and legs day in the authored order', () => {
  const armsProfile = resolveGeneratedSplitDayProfile({
    familyKey: 'bro_split_5',
    dayIndex: 4,
    trainingDaysPerWeek: 5,
    day: {
      key: 'bro_arms',
      name: 'Arms Day',
      focus: 'Biceps + triceps isolation',
    },
  });

  const legsProfile = resolveGeneratedSplitDayProfile({
    familyKey: 'bro_split_5',
    dayIndex: 5,
    trainingDaysPerWeek: 5,
    day: {
      key: 'bro_legs',
      name: 'Legs Day',
      focus: 'Quads, hams, glutes, calves',
    },
  });

  assert.ok(armsProfile.primaryFocuses.includes('arms'));
  assert.ok(legsProfile.primaryFocuses.includes('legs'));
});
