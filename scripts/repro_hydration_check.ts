import { assert } from 'jsr:@std/assert';
import {
  ExperienceLevel,
  GoalBucket,
  LiftComfort,
  DayType,
  ProgressionModel,
  ReplacementGroup,
  SessionEnvironment,
  SlotArchetype,
  TrainingStyle,
} from '../types/v1_engine.ts';
import { hydrateTemplate } from '../lib/workout/v1_architect.ts';

const testTemplate = {
  external_id: 'tmp_repro',
  name: 'Repro Template',
  goal_bucket: GoalBucket.Hypertrophy,
  training_style: TrainingStyle.UpperLower,
  days_per_week: 1,
  lift_comfort: LiftComfort.MachineDB,
  environment: SessionEnvironment.AptHotel,
  experience_level: ExperienceLevel.Intermediate,
  days: [
    {
      day_number: 1,
      day_type: DayType.Legs,
      slots: [
        {
          order_index: 1,
          architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,
          is_required: true,
          archetype: SlotArchetype.PrimeCompound,
          progression_model: ProgressionModel.Double_Progression,
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          target_rpe: 8,
          rest_seconds: 90,
        },
      ],
    },
  ],
};

const user_persona = {
  goal: GoalBucket.Hypertrophy,
  environment: SessionEnvironment.AptHotel,
  comfort: LiftComfort.MachineDB,
  injuries: [],
  experience_level: ExperienceLevel.Intermediate,
};

const hydrated = hydrateTemplate(testTemplate, 'fam_repro', user_persona);
assert(hydrated, 'Workout should be hydrated');
const exercise = hydrated.days[0].exercises[0];
assert(exercise, 'Exercise should be found');
console.log('Successfully hydrated with Exercise:', exercise.name);
