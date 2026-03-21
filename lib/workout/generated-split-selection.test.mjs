import assert from 'node:assert/strict';
import test from 'node:test';

import { selectExercisesForGeneratedSplitDay } from './generated-split-selection.ts';

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
  assert.ok(result.exercises.length >= result.minExercises);
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
