import assert from 'node:assert/strict';
import test from 'node:test';

import { buildExercisePool } from './exercise-pool.ts';

function makeRawExercise(overrides = {}) {
  return {
    id: overrides.id || 'exercise-1',
    name: overrides.name || 'Barbell Bench Press',
    category: overrides.category || 'Upper Body',
    movement_pattern: overrides.movement_pattern || 'horizontal_push',
    equipment: overrides.equipment || 'barbell',
    is_compound: overrides.is_compound ?? true,
    muscle_groups: overrides.muscle_groups || ['chest'],
    primary_muscles: overrides.primary_muscles || ['chest'],
    secondary_muscles: overrides.secondary_muscles || ['triceps'],
    split_tags: overrides.split_tags || ['push', 'upper'],
    equipment_options: overrides.equipment_options || ['barbell', 'bench'],
    experience_min: overrides.experience_min || 'beginner',
    difficulty: overrides.difficulty ?? 2,
    popularity_score: overrides.popularity_score ?? 90,
    force_type: overrides.force_type || null,
    is_unilateral: overrides.is_unilateral ?? false,
    requires_spotter: overrides.requires_spotter ?? false,
    joint_stress_level: overrides.joint_stress_level ?? 2,
    is_system_exercise: overrides.is_system_exercise ?? true,
    technique_compatibility: overrides.technique_compatibility || [],
    cues: overrides.cues || null,
  };
}

test('exercise pool filters out low-popularity exercises for beginners', () => {
  const pool = buildExercisePool(
    [
      makeRawExercise({ id: 'bench', name: 'Barbell Bench Press', popularity_score: 92 }),
      makeRawExercise({ id: 'obscure', name: 'Cable Supine Reverse Fly', movement_pattern: 'rear_delt', primary_muscles: ['rear_delts'], split_tags: ['push'], popularity_score: 8, is_compound: false }),
    ],
    {
      equipmentAccess: 'full_gym',
      experienceLevel: 'beginner',
    },
  );

  assert.deepEqual(pool.map((exercise) => exercise.id), ['bench']);
});

test('exercise pool respects injury keyword filtering', () => {
  const pool = buildExercisePool(
    [
      makeRawExercise({ id: 'bench', name: 'Barbell Bench Press', movement_pattern: 'horizontal_push' }),
      makeRawExercise({ id: 'ohp', name: 'Overhead Press', movement_pattern: 'vertical_push', primary_muscles: ['shoulders'], split_tags: ['push', 'shoulders'] }),
    ],
    {
      equipmentAccess: 'full_gym',
      experienceLevel: 'intermediate',
      injuries: ['shoulders'],
    },
  );

  assert.deepEqual(pool.map((exercise) => exercise.id), ['bench']);
});

test('exercise pool excludes stretch and reference movements from normal workout pools', () => {
  const pool = buildExercisePool(
    [
      makeRawExercise({ id: 'bench', name: 'Barbell Bench Press', popularity_score: 92 }),
      makeRawExercise({
        id: 'toe-touch',
        name: 'Basic Toe Touch (Male)',
        movement_pattern: null,
        category: 'Mobility',
        primary_muscles: [],
        split_tags: ['mobility'],
        equipment_options: ['bodyweight'],
        popularity_score: 95,
        is_compound: false,
      }),
    ],
    {
      equipmentAccess: 'full_gym',
      experienceLevel: 'beginner',
    },
  );

  assert.deepEqual(pool.map((exercise) => exercise.id), ['bench']);
});

test('exercise pool strips awkward full-gym novelty variants for beginners', () => {
  const pool = buildExercisePool(
    [
      makeRawExercise({ id: 'bench', name: 'Barbell Bench Press', popularity_score: 92 }),
      makeRawExercise({
        id: 'medicine-ball',
        name: 'Medicine Ball Close Grip Push Up',
        movement_pattern: 'horizontal_push',
        equipment_options: ['medicine_ball', 'bodyweight'],
        popularity_score: 58,
      }),
    ],
    {
      equipmentAccess: 'full_gym',
      experienceLevel: 'beginner',
      primaryGoal: 'lose_fat',
      trainingStylePreference: 'general_fitness',
      sessionDurationMin: 60,
    },
  );

  assert.deepEqual(pool.map((exercise) => exercise.id), ['bench']);
});
