import assert from 'node:assert/strict';
import test from 'node:test';

import { runQualityGates } from './quality-gates.ts';

function makeExercise(overrides = {}) {
  return {
    id: overrides.id || 'exercise-1',
    name: overrides.name || 'Barbell Bench Press',
    category: overrides.category || 'Upper Body',
    difficulty: overrides.difficulty || 'intermediate',
    primary_muscle: overrides.primary_muscle || 'chest',
    pattern: overrides.pattern || 'horizontal_push',
    equipment_required: overrides.equipment_required || ['barbell'],
    primary_muscles: overrides.primary_muscles || ['chest'],
    split_tags: overrides.split_tags || ['push'],
    equipment_options: overrides.equipment_options || ['barbell'],
    popularity_score: overrides.popularity_score ?? 90,
    experience_min: overrides.experience_min || 'beginner',
    is_compound: overrides.is_compound ?? true,
    technique_compatibility: overrides.technique_compatibility || [],
    joint_stress_level: overrides.joint_stress_level ?? 2,
    cues: overrides.cues || null,
  };
}

test('quality gates flag weeks that miss rear delt work entirely', () => {
  const result = runQualityGates({
    experienceLevel: 'beginner',
    workoutDays: [
      {
        dayName: 'Push',
        focusTags: ['push'],
        exercises: [
          makeExercise({ id: 'bench', name: 'Barbell Bench Press', pattern: 'horizontal_push' }),
          makeExercise({ id: 'press', name: 'Incline Dumbbell Press', pattern: 'horizontal_push' }),
        ],
      },
      {
        dayName: 'Pull',
        focusTags: ['pull'],
        exercises: [
          makeExercise({ id: 'row', name: 'Chest Supported Row', pattern: 'horizontal_pull', primary_muscle: 'back', primary_muscles: ['back'], split_tags: ['pull'] }),
          makeExercise({ id: 'pulldown', name: 'Lat Pulldown', pattern: 'vertical_pull', primary_muscle: 'lats', primary_muscles: ['lats'], split_tags: ['pull'] }),
        ],
      },
    ],
  });

  assert.equal(result.passed, false);
  assert.ok(result.warnings.some((warning) => /rear delt/i.test(warning)));
  assert.ok(result.fixes.some((fix) => fix.type === 'add_rear_delt'));
});

test('quality gates pass a balanced week with compounds and rear delt coverage', () => {
  const result = runQualityGates({
    experienceLevel: 'intermediate',
    workoutDays: [
      {
        dayName: 'Push',
        focusTags: ['push'],
        exercises: [
          makeExercise({ id: 'bench', name: 'Barbell Bench Press', pattern: 'horizontal_push' }),
          makeExercise({ id: 'ohp', name: 'Standing Overhead Press', pattern: 'vertical_push', primary_muscle: 'shoulders', primary_muscles: ['shoulders'], split_tags: ['push'] }),
          makeExercise({ id: 'incline', name: 'Incline Dumbbell Press', pattern: 'incline_push', primary_muscle: 'chest', primary_muscles: ['chest'], split_tags: ['push'] }),
          makeExercise({ id: 'face-pull', name: 'Face Pull', pattern: 'horizontal_pull', primary_muscle: 'rear_delts', primary_muscles: ['rear_delts'], split_tags: ['pull'], is_compound: false }),
        ],
      },
      {
        dayName: 'Pull',
        focusTags: ['pull'],
        exercises: [
          makeExercise({ id: 'row', name: 'Chest Supported Row', pattern: 'horizontal_pull', primary_muscle: 'back', primary_muscles: ['back'], split_tags: ['pull'] }),
          makeExercise({ id: 'pulldown', name: 'Lat Pulldown', pattern: 'vertical_pull', primary_muscle: 'lats', primary_muscles: ['lats'], split_tags: ['pull'] }),
          makeExercise({ id: 'rear-delt', name: 'Rear Delt Fly', pattern: 'rear_delt', primary_muscle: 'rear_delts', primary_muscles: ['rear_delts'], split_tags: ['pull'], is_compound: false }),
        ],
      },
    ],
  });

  assert.equal(result.passed, true);
  assert.equal(result.warnings.length, 0);
});

test('quality gates reject day focus mismatches and specialty-only exercises', () => {
  const result = runQualityGates({
    experienceLevel: 'beginner',
    workoutDays: [
      {
        dayName: 'Chest',
        focusTags: ['chest', 'push'],
        estimatedDurationMin: 45,
        exercises: [
          makeExercise({ id: 'toe-touch', name: 'Basic Toe Touch (Male)', pattern: null, primary_muscle: null, primary_muscles: [], split_tags: ['mobility'], popularity_score: 95, is_compound: false }),
          makeExercise({ id: 'curl', name: 'EZ Bar Curl', pattern: 'biceps', primary_muscle: 'biceps', primary_muscles: ['biceps'], split_tags: ['arms'], is_compound: false }),
          makeExercise({ id: 'pushdown', name: 'Cable Pushdown', pattern: 'triceps', primary_muscle: 'triceps', primary_muscles: ['triceps'], split_tags: ['push'], is_compound: false }),
          makeExercise({ id: 'flye', name: 'Cable Flye', pattern: 'chest_isolation', primary_muscle: 'chest', primary_muscles: ['chest'], split_tags: ['push'], is_compound: false }),
          makeExercise({ id: 'press', name: 'Machine Chest Press', pattern: 'horizontal_push', primary_muscle: 'chest', primary_muscles: ['chest'], split_tags: ['push'] }),
          makeExercise({ id: 'incline', name: 'Incline Dumbbell Press', pattern: 'incline_push', primary_muscle: 'chest', primary_muscles: ['chest'], split_tags: ['push'] }),
          makeExercise({ id: 'dip', name: 'Weighted Dip', pattern: 'dip', primary_muscle: 'chest', primary_muscles: ['chest'], split_tags: ['push'] }),
        ],
      },
    ],
  });

  assert.equal(result.passed, false);
  assert.ok(result.warnings.some((warning) => /specialty-only/i.test(warning) || /focus mismatch/i.test(warning) || /session budget/i.test(warning)));
  assert.ok(result.fixes.some((fix) => fix.type === 'replace_low_priority_exercise' || fix.type === 'repair_focus_mismatch' || fix.type === 'reduce_session_overflow'));
});

test('quality gates allow an arms day without forcing a compound anchor', () => {
  const result = runQualityGates({
    experienceLevel: 'advanced',
    workoutDays: [
      {
        dayName: 'Arms Day',
        focusTags: ['arms'],
        exercises: [
          makeExercise({ id: 'curl', name: 'Incline Dumbbell Curl', pattern: 'bicep_curl', primary_muscle: 'biceps', primary_muscles: ['biceps'], split_tags: ['arms'], is_compound: false }),
          makeExercise({ id: 'pushdown', name: 'Cable Pushdown', pattern: 'tricep_ext', primary_muscle: 'triceps', primary_muscles: ['triceps'], split_tags: ['arms'], is_compound: false }),
          makeExercise({ id: 'hammer', name: 'Hammer Curl', pattern: 'bicep_curl', primary_muscle: 'biceps', primary_muscles: ['biceps'], split_tags: ['arms'], is_compound: false }),
          makeExercise({ id: 'overhead', name: 'Overhead Rope Extension', pattern: 'tricep_ext', primary_muscle: 'triceps', primary_muscles: ['triceps'], split_tags: ['arms'], is_compound: false }),
        ],
      },
    ],
  });

  assert.equal(result.passed, true);
  assert.ok(!result.warnings.some((warning) => /No compound exercise found/i.test(warning)));
  assert.ok(!result.warnings.some((warning) => /Day focus mismatch/i.test(warning)));
});

test('quality gates reject unjustified full-gym substitutions for conservative-default profiles', () => {
  const result = runQualityGates({
    trainingProfile: {
      experienceLevel: 'beginner',
      equipmentAccess: 'full_gym',
      primaryGoal: 'lose_fat',
      trainingStylePreference: 'general_fitness',
      sessionDurationMin: 60,
      injuries: [],
    },
    workoutDays: [
      {
        dayName: 'Upper A',
        focusTags: ['upper', 'push', 'pull'],
        estimatedDurationMin: 60,
        exercises: [
          makeExercise({ id: 'bench', name: 'Medicine Ball Close Grip Push Up', pattern: 'horizontal_push', is_compound: true, equipment_options: ['medicine_ball', 'bodyweight'] }),
          makeExercise({ id: 'row', name: 'Bodyweight Standing One Arm Row', pattern: 'horizontal_pull', primary_muscle: 'back', primary_muscles: ['back'], split_tags: ['pull'], is_compound: true, equipment_options: ['bodyweight'] }),
          makeExercise({ id: 'rear-delt', name: 'Rear Delt Fly', pattern: 'rear_delt', primary_muscle: 'rear_delts', primary_muscles: ['rear_delts'], split_tags: ['pull'], is_compound: false }),
        ],
      },
    ],
  });

  assert.equal(result.passed, false);
  assert.ok(result.fixes.some((fix) => fix.type === 'replace_full_gym_substitution'));
  assert.ok((result.metrics.fullGymSubstitutionViolations ?? 0) >= 2);
});
