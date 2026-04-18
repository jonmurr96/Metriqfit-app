
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { 
  ReplacementGroup, 
  ExerciseTier, 
  SessionEnvironment, 
  GoalBucket, 
  LiftComfort, 
  ExperienceLevel,
  EquipmentCategory
} from '../../types/v1_engine';
import { hydrateTemplate } from './v1_architect';

// Fake template that has a Unilateral_Squat_Lunge slot
const testTemplate = {
  external_id: 'tmp_repro',
  name: 'Repro Template',
  goal_bucket: GoalBucket.Hypertrophy,
  training_style: 'UpperLower',
  days_per_week: 1,
  lift_comfort: LiftComfort.MachineDB,
  environment: SessionEnvironment.AptHotel,
  experience_level: ExperienceLevel.Intermediate,
  days: [
    {
      day_number: 1,
      day_type: 'Legs',
      slots: [
        {
          order_index: 1,
          architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,
          is_required: true,
          archetype: 'PrimeCompound',
          progression_model: 'Double_Progression',
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          target_rpe: 8,
          rest_seconds: 90
        }
      ]
    }
  ]
};

test('AptHotel (Dumbbells Only) should hydrate Bulgarian Split Squats', () => {
  const user_persona = {
    goal: GoalBucket.Hypertrophy,
    environment: SessionEnvironment.AptHotel,
    comfort: LiftComfort.MachineDB, // AptHotel/Home (Dumbbells Only) mapping
    injuries: [],
    experience_level: ExperienceLevel.Intermediate
  };

  try {
    const hydrated = hydrateTemplate(testTemplate, 'fam_repro', user_persona);
    assert.ok(hydrated, 'Workout should be hydrated');
    const exercise = hydrated.days[0].exercises[0];
    assert.ok(exercise, 'Exercise should be found');
    console.log('Successfully hydrated with Exercise:', exercise.name);
  } catch (err) {
    console.error('FAILED TO HYDRATE:', err.message);
    throw err;
  }
});
