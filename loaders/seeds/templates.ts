import {
  GoalBucket,
  TrainingStyle,
  LiftComfort,
  SessionEnvironment,
  ProgressionModel,
  DayType,
  ReplacementGroup,
  SlotArchetype,
  ExperienceLevel
} from '../../types/v1_engine.ts';

export const coreTemplates = [
  // ─── BEGINNER: FULL BODY BARBELL (3-day) ────────────────────────────────────
  {
    external_id: 'tmp_beginner_fb_v1',
    name: 'Beginner Full Body',
    goal_bucket: GoalBucket.Strength,
    training_style: TrainingStyle.FullBody,
    days_per_week: 3,
    lift_comfort: LiftComfort.BarbellBasic,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Beginner,
    days: [
      {
        day_number: 1,
        day_type: DayType.FullBodyStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 3, reps_min: 5, reps_max: 8,  target_rpe: 7, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 3, reps_min: 5, reps_max: 8,  target_rpe: 7, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
        ]
      },
      {
        day_number: 2,
        day_type: DayType.FullBodyStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 3, reps_min: 5, reps_max: 8,  target_rpe: 7, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 3, reps_min: 5, reps_max: 8,  target_rpe: 7, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
        ]
      },
      {
        day_number: 3,
        day_type: DayType.FullBodyStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 3, reps_min: 5, reps_max: 8,  target_rpe: 8, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 3, reps_min: 5, reps_max: 8,  target_rpe: 8, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
        ]
      }
    ]
  },

  // ─── BEGINNER: MACHINE / DB FULL BODY (3-day) ───────────────────────────────
  {
    external_id: 'tmp_beginner_machine_fb_v1',
    name: 'Beginner Machine/DB Full Body',
    goal_bucket: GoalBucket.GenFitness,
    training_style: TrainingStyle.FullBody,
    days_per_week: 3,
    lift_comfort: LiftComfort.MachineDB,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Beginner,
    days: [
      {
        day_number: 1,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 7, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 7, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 7, rest_seconds: 120 },
        ]
      },
      {
        day_number: 2,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 7, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 7, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 7, rest_seconds: 120 },
        ]
      },
      {
        day_number: 3,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
        ]
      }
    ]
  },

  // ─── HYPERTROPHY: FULL BODY (3-day) ─────────────────────────────────────────
  {
    external_id: 'tmp_hyp_fb_v1',
    name: 'Hypertrophy Full Body',
    goal_bucket: GoalBucket.Hypertrophy,
    training_style: TrainingStyle.FullBody,
    days_per_week: 3,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        // Day A: Squat-dominant full body
        day_number: 1,
        day_type: DayType.FullBodyHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
        ]
      },
      {
        // Day B: Hinge-dominant full body
        day_number: 2,
        day_type: DayType.FullBodyHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
        ]
      },
      {
        // Day A+: Squat-dominant with added chest isolation
        day_number: 3,
        day_type: DayType.FullBodyHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 9, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8,  reps_max: 12, target_rpe: 9, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Chest_Fly,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      }
    ]
  },

  // ─── HYPERTROPHY: UPPER / LOWER (4-day) ─────────────────────────────────────
  {
    external_id: 'tmp_hyp_ul_v1',
    name: 'Hypertrophy Upper/Lower',
    goal_bucket: GoalBucket.Hypertrophy,
    training_style: TrainingStyle.UpperLower,
    days_per_week: 4,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        // Upper A: horizontal focus
        day_number: 1,
        day_type: DayType.UpperHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Press,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 3, architectural_group: ReplacementGroup.Primary_Vertical_Pull,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
        ]
      },
      {
        // Lower A: squat-dominant
        day_number: 2,
        day_type: DayType.LowerHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,    is_required: false, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Hamstring_Curl,  is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        // Upper B: vertical focus + isolation work
        day_number: 3,
        day_type: DayType.UpperHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 9, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Pull,    is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 9, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Chest_Fly,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Bicep_Flexion,  is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        // Lower B: hinge-dominant + isolation
        day_number: 4,
        day_type: DayType.LowerHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 9, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 9, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Quad_Extension, is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Calf_Raise,     is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 15, reps_max: 20, target_rpe: 8, rest_seconds: 60  },
        ]
      }
    ]
  },

  // ─── HYPERTROPHY: PPL (6-day) ────────────────────────────────────────────────
  {
    external_id: 'tmp_hyp_ppl_v1',
    name: 'Hypertrophy PPL',
    goal_bucket: GoalBucket.Hypertrophy,
    training_style: TrainingStyle.PPL,
    days_per_week: 6,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Advanced,
    days: [
      {
        // Push A
        day_number: 1,
        day_type: DayType.Push,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Chest_Fly,        is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Lateral_Delt,     is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 15, reps_max: 20, target_rpe: 8, rest_seconds: 60  },
          { order_index: 4, architectural_group: ReplacementGroup.Isolation_Tricep_Extension, is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        // Pull A
        day_number: 2,
        day_type: DayType.Pull,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Bicep_Flexion,   is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Hamstring_Curl,  is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        // Legs A: squat-dominant
        day_number: 3,
        day_type: DayType.Legs,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,   is_required: false, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Quad_Extension, is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
          { order_index: 4, architectural_group: ReplacementGroup.Isolation_Calf_Raise,     is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 15, reps_max: 20, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        // Push B
        day_number: 4,
        day_type: DayType.Push,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 9, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 9, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Chest_Fly,        is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Lateral_Delt,     is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 15, reps_max: 20, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        // Pull B
        day_number: 5,
        day_type: DayType.Pull,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 9, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Pull,    is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 9, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Bicep_Flexion,  is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        // Legs B: hinge-dominant
        day_number: 6,
        day_type: DayType.Legs,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 9, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 9, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Unilateral_Hinge,          is_required: false, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Calf_Raise,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 15, reps_max: 20, target_rpe: 8, rest_seconds: 60  },
        ]
      }
    ]
  },

  {
    external_id: 'tmp_hyp_5_day_v1',
    name: 'Hypertrophy PPL-UL (5-Day)',
    goal_bucket: GoalBucket.Hypertrophy,
    training_style: TrainingStyle.UpperLower, // Mixed Style
    days_per_week: 5,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Advanced,
    days: [
      {
        day_number: 1, // Push
        day_type: DayType.Push,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8,  reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Chest_Fly,        is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Tricep_Extension, is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        day_number: 2, // Pull
        day_type: DayType.Pull,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8,  reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Bicep_Flexion,   is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        day_number: 3, // Legs
        day_type: DayType.Legs,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8,  reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Isolation_Hamstring_Curl,  is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Quad_Extension,  is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Calf_Raise,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 15, reps_max: 20, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        day_number: 4, // Upper
        day_type: DayType.UpperHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Vertical_Press,     is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8,  reps_max: 10, target_rpe: 9, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Lateral_Delt,     is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 15, reps_max: 20, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        day_number: 5, // Lower
        day_type: DayType.LowerHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8,  reps_max: 10, target_rpe: 9, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,    is_required: false, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Trunk_Anti_Extension,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 30, reps_max: 60, target_rpe: 7, rest_seconds: 45  },
        ]
      }
    ]
  },

  // ─── FAT LOSS: FULL BODY (3-day) ─────────────────────────────────────────────
  {
    external_id: 'tmp_fatloss_fb_v1',
    name: 'Fat Loss Full Body',
    goal_bucket: GoalBucket.FatLoss,
    training_style: TrainingStyle.FullBody,
    days_per_week: 3,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        day_number: 1,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 60 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 60 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 7, rest_seconds: 60 },
        ]
      },
      {
        day_number: 2,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 60 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 7, rest_seconds: 60 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 7, rest_seconds: 60 },
        ]
      },
      {
        // Day 3: higher density — adds metabolic finisher
        day_number: 3,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,           is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression,        sets: 3, reps_min: 10, reps_max: 15, target_rpe: 8, rest_seconds: 60 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,          is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression,        sets: 3, reps_min: 10, reps_max: 15, target_rpe: 8, rest_seconds: 60 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,           is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression,        sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60 },
          { order_index: 3, architectural_group: ReplacementGroup.Conditioning_Metabolic_Finisher,   is_required: false, archetype: SlotArchetype.Finisher,          progression_model: ProgressionModel.Density,                  sets: 3, reps_min: 10, reps_max: 20, target_rpe: 8, rest_seconds: 45 },
        ]
      }
    ]
  },

  // ─── STRENGTH: FULL BODY (3-day) ─────────────────────────────────────────────
  {
    external_id: 'tmp_str_fb_v1',
    name: 'Strength Full Body',
    goal_bucket: GoalBucket.Strength,
    training_style: TrainingStyle.FullBody,
    days_per_week: 3,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        day_number: 1,
        day_type: DayType.FullBodyStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 5, reps_min: 5, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 5, reps_min: 5, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
        ]
      },
      {
        day_number: 2,
        day_type: DayType.FullBodyStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,  is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 5, reps_min: 5, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,   is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 5, reps_min: 5, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,    is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
        ]
      },
      {
        day_number: 3,
        day_type: DayType.FullBodyStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Top_Set_Backoff,    sets: 5, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Top_Set_Backoff,    sets: 5, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 5, reps_max: 8, target_rpe: 9, rest_seconds: 120 },
        ]
      }
    ]
  },

  // ─── STRENGTH: UPPER / LOWER (4-day) ─────────────────────────────────────────
  {
    external_id: 'tmp_str_ul_v1',
    name: 'Strength Upper/Lower',
    goal_bucket: GoalBucket.Strength,
    training_style: TrainingStyle.UpperLower,
    days_per_week: 4,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Advanced,
    days: [
      {
        // Upper A: press-dominant
        day_number: 1,
        day_type: DayType.UpperStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 5, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 5, reps_min: 4, reps_max: 6, target_rpe: 8, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
        ]
      },
      {
        // Lower A: squat-dominant
        day_number: 2,
        day_type: DayType.LowerStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true, archetype: SlotArchetype.PrimeCompound, progression_model: ProgressionModel.Linear_Load, sets: 5, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,  is_required: true, archetype: SlotArchetype.PrimeCompound, progression_model: ProgressionModel.Linear_Load, sets: 3, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
        ]
      },
      {
        // Upper B: pull-dominant
        day_number: 3,
        day_type: DayType.UpperStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Top_Set_Backoff,    sets: 5, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Pull,    is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 4, reps_max: 6, target_rpe: 9, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
        ]
      },
      {
        // Lower B: hinge-dominant with unilateral accessory
        day_number: 4,
        day_type: DayType.LowerStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Top_Set_Backoff,    sets: 5, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,        sets: 4, reps_min: 4, reps_max: 6, target_rpe: 8, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,   is_required: false, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 90  },
        ]
      }
    ]
  },

  // ─── MINIMAL EQUIPMENT: DB-ONLY (3-day, AptHotel) ───────────────────────────
  {
    external_id: 'tmp_min_equip_db_v1',
    name: 'Minimal Equipment DB-Only',
    goal_bucket: GoalBucket.Hypertrophy,
    training_style: TrainingStyle.FullBody,
    days_per_week: 3,
    lift_comfort: LiftComfort.MachineDB,
    environment: SessionEnvironment.AptHotel,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        // Day A: push + pull
        day_number: 1,
        day_type: DayType.FullBodyHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
        ]
      },
      {
        // Day B: hinge + shoulder + lat
        day_number: 2,
        day_type: DayType.FullBodyHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
        ]
      },
      {
        // Day C: push + pull + isolation delt
        day_number: 3,
        day_type: DayType.FullBodyHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 10, reps_max: 12, target_rpe: 9, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 9, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 9, rest_seconds: 90 },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Lateral_Delt,   is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 15, reps_max: 20, target_rpe: 8, rest_seconds: 60 },
        ]
      }
    ]
  },

  // ─── AT HOME: BODYWEIGHT (3-day) ─────────────────────────────────────────────
  {
    external_id: 'tmp_at_home_bw_v1',
    name: 'At Home Bodyweight',
    goal_bucket: GoalBucket.GenFitness,
    training_style: TrainingStyle.FullBody,
    days_per_week: 3,
    lift_comfort: LiftComfort.NoBarbell,
    environment: SessionEnvironment.Bodyweight,
    experience_level: ExperienceLevel.Beginner,
    days: [
      {
        // Day A: squat + push + pull
        day_number: 1,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Rep_Goal,       sets: 3, reps_min: 10, reps_max: 20, target_rpe: 7, rest_seconds: 60 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Mechanical_BW, sets: 3, reps_min: 8,  reps_max: 15, target_rpe: 7, rest_seconds: 60 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,  is_required: false, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Mechanical_BW, sets: 3, reps_min: 8,  reps_max: 15, target_rpe: 7, rest_seconds: 60 },
        ]
      },
      {
        // Day B: hinge + press + core
        day_number: 2,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Mechanical_BW,     sets: 3, reps_min: 10, reps_max: 20, target_rpe: 7, rest_seconds: 60 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Mechanical_BW,     sets: 3, reps_min: 8,  reps_max: 15, target_rpe: 7, rest_seconds: 60 },
          { order_index: 2, architectural_group: ReplacementGroup.Trunk_Anti_Extension,     is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 20, reps_max: 45, target_rpe: 7, rest_seconds: 45 },
        ]
      },
      {
        // Day C: squat + push + core flexion (full body density)
        day_number: 3,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Rep_Goal,       sets: 3, reps_min: 15, reps_max: 25, target_rpe: 8, rest_seconds: 60 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press, is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Mechanical_BW, sets: 3, reps_min: 10, reps_max: 20, target_rpe: 8, rest_seconds: 60 },
          { order_index: 2, architectural_group: ReplacementGroup.Trunk_Flexion,            is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,       sets: 3, reps_min: 15, reps_max: 25, target_rpe: 7, rest_seconds: 45 },
        ]
      }
    ]
  },
  // ─── HYPERTROPHY: FULL BODY (2-day) ─────────────────────────────────────────
  {
    external_id: 'tmp_hyp_2_day_v1',
    name: 'Hypertrophy 2-Day Full Body',
    goal_bucket: GoalBucket.Hypertrophy,
    training_style: TrainingStyle.FullBody,
    days_per_week: 2,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        day_number: 1,
        day_type: DayType.FullBodyHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Lateral_Delt,    is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        day_number: 2,
        day_type: DayType.FullBodyHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Bicep_Flexion,   is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      }
    ]
  },

  // ─── STRENGTH: FULL BODY (2-day) ─────────────────────────────────────────────
  {
    external_id: 'tmp_str_2_day_v1',
    name: 'Strength 2-Day Full Body',
    goal_bucket: GoalBucket.Strength,
    training_style: TrainingStyle.FullBody,
    days_per_week: 2,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        day_number: 1,
        day_type: DayType.FullBodyStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true, archetype: SlotArchetype.PrimeCompound, progression_model: ProgressionModel.Linear_Load,    sets: 5, reps_min: 5, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true, archetype: SlotArchetype.PrimeCompound, progression_model: ProgressionModel.Linear_Load,    sets: 5, reps_min: 5, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
        ]
      },
      {
        day_number: 2,
        day_type: DayType.FullBodyStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true, archetype: SlotArchetype.PrimeCompound, progression_model: ProgressionModel.Linear_Load,    sets: 5, reps_min: 5, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true, archetype: SlotArchetype.PrimeCompound, progression_model: ProgressionModel.Linear_Load,    sets: 5, reps_min: 5, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
        ]
      }
    ]
  },

  // ─── GEN FITNESS: FULL BODY (2-day) ──────────────────────────────────────────
  {
    external_id: 'tmp_gen_2_day_v1',
    name: 'GenFitness 2-Day Full Body',
    goal_bucket: GoalBucket.GenFitness,
    training_style: TrainingStyle.FullBody,
    days_per_week: 2,
    lift_comfort: LiftComfort.MachineDB,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        day_number: 1,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 7, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 7, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 7, rest_seconds: 90 },
          { order_index: 3, architectural_group: ReplacementGroup.Conditioning_Metabolic_Finisher, is_required: false, archetype: SlotArchetype.Finisher,          progression_model: ProgressionModel.Density,            sets: 3, reps_min: 12, reps_max: 20, target_rpe: 8, rest_seconds: 45 },
        ]
      },
      {
        day_number: 2,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 7, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 7, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 7, rest_seconds: 90 },
          { order_index: 3, architectural_group: ReplacementGroup.Trunk_Anti_Extension,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 20, reps_max: 45, target_rpe: 7, rest_seconds: 45 },
        ]
      }
    ]
  },

  // ─── STRENGTH: PPL-UL (5-day) ────────────────────────────────────────────────
  {
    external_id: 'tmp_str_5_day_v1',
    name: 'Strength PPL-UL (5-Day)',
    goal_bucket: GoalBucket.Strength,
    training_style: TrainingStyle.UpperLower, // Mixed
    days_per_week: 5,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Advanced,
    days: [
      {
        day_number: 1, // Push (Bench Focus)
        day_type: DayType.Push,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press,   is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,    sets: 5, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,     is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Lateral_Delt,     is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        day_number: 2, // Pull (Deadlift Focus)
        day_type: DayType.Pull,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,    sets: 3, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 240 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 6, reps_max: 8, target_rpe: 9, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 10, target_rpe: 8, rest_seconds: 90  },
        ]
      },
      {
        day_number: 3, // Legs (Squat Focus)
        day_type: DayType.Legs,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,    sets: 5, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,    is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Calf_Raise,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        day_number: 4, // Upper (Vol/Acc)
        day_type: DayType.UpperStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press,   is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Top_Set_Backoff, sets: 4, reps_min: 5, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8, reps_max: 10, target_rpe: 8, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,    is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
        ]
      },
      {
        day_number: 5, // Lower (Vol/Acc)
        day_type: DayType.LowerStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Top_Set_Backoff, sets: 4, reps_min: 5, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Trunk_Anti_Extension,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,        sets: 3, reps_min: 30, reps_max: 60, target_rpe: 7, rest_seconds: 45  },
        ]
      }
    ]
  },

  // ─── HYPERTROPHY: PPL-UL (5-day) ─────────────────────────────────────────────
  {
    external_id: 'tmp_hyp_5_day_machine_v1',
    name: 'Hypertrophy PPL-UL (5-Day)',
    goal_bucket: GoalBucket.Hypertrophy,
    training_style: TrainingStyle.UpperLower, // Mixed
    days_per_week: 5,
    lift_comfort: LiftComfort.MachineDB, // Favors SFR
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Advanced,
    days: [
      {
        day_number: 1, // Push
        day_type: DayType.Push,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Chest_Fly,       is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 9, rest_seconds: 60  },
        ]
      },
      {
        day_number: 2, // Pull
        day_type: DayType.Pull,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 90  },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Bicep_Flexion,   is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 9, rest_seconds: 60  },
        ]
      },
      {
        day_number: 3, // Legs
        day_type: DayType.Legs,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 8,  reps_max: 10, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Isolation_Hamstring_Curl, is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 9, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Calf_Raise,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60  },
        ]
      },
      {
        day_number: 4, // Upper
        day_type: DayType.UpperHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,    is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90  },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,   is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Lateral_Delt,     is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 20, target_rpe: 9, rest_seconds: 60  },
        ]
      },
      {
        day_number: 5, // Lower
        day_type: DayType.LowerHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 4, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Isolation_Quad_Extension,  is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 9, rest_seconds: 90  },
          { order_index: 2, architectural_group: ReplacementGroup.Trunk_Flexion,             is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 15, reps_max: 25, target_rpe: 8, rest_seconds: 45  },
        ]
      }
    ]
  },

  // ─── MINIMALIST: FULL BODY (2-day) ─────────────────────────────────────────
  {
    external_id: 'tmp_minimalist_2_day_v1',
    name: 'Minimalist 2-Day Full Body',
    goal_bucket: GoalBucket.GenFitness,
    training_style: TrainingStyle.FullBody,
    days_per_week: 2,
    lift_comfort: LiftComfort.MachineDB, // ensures Goblet Squat, DB Bench, DB RDL, etc.
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Beginner,
    days: [
      {
        day_number: 1,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 3, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 4, architectural_group: ReplacementGroup.Trunk_Flexion,             is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 15, reps_max: 25, target_rpe: 7, rest_seconds: 45 },
        ]
      },
      {
        day_number: 2,
        day_type: DayType.FullBodyGenFit,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 3, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 4, architectural_group: ReplacementGroup.Trunk_Anti_Extension,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 30, reps_max: 60, target_rpe: 7, rest_seconds: 45 },
        ]
      }
    ]
  },

  // ─── MINIMALIST: STRENGTH FB (2-day) ─────────────────────────────────────────
  {
    external_id: 'tmp_minimalist_2_day_strength_v1',
    name: 'Minimalist Strength 2-Day',
    goal_bucket: GoalBucket.Strength,
    training_style: TrainingStyle.FullBody,
    days_per_week: 2,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        // Day A: Squat / Press emphasis — linear load, building week-over-week
        day_number: 1,
        day_type: DayType.FullBodyStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 3, reps_min: 5, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,       sets: 3, reps_min: 5, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Bicep_Flexion,   is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 15, target_rpe: 8, rest_seconds: 90 },
        ]
      },
      {
        // Day B: Hinge / OHP emphasis — top set + backoff for intensity variation
        day_number: 2,
        day_type: DayType.FullBodyStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Top_Set_Backoff,    sets: 3, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Top_Set_Backoff,    sets: 3, reps_min: 3, reps_max: 5, target_rpe: 9, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
          { order_index: 3, architectural_group: ReplacementGroup.Trunk_Flexion,             is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 15, reps_max: 25, target_rpe: 8, rest_seconds: 60 },
        ]
      }
    ]
  },

  // ─── MINIMALIST: AESTHETICS FB (2-day) ─────────────────────────────────────────
  {
    external_id: 'tmp_minimalist_2_day_aesthetics_v1',
    name: 'Minimalist Aesthetics 2-Day',
    goal_bucket: GoalBucket.Hypertrophy,
    training_style: TrainingStyle.FullBody,
    days_per_week: 2,
    lift_comfort: LiftComfort.MachineDB,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        // Day A: Squat / Hpress / VPull emphasis — slightly more quad-anterior chain
        day_number: 1,
        day_type: DayType.FullBodyHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 15, target_rpe: 9, rest_seconds: 90 },
          { order_index: 3, architectural_group: ReplacementGroup.Isolation_Lateral_Delt,    is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 20, target_rpe: 9, rest_seconds: 60 },
          { order_index: 4, architectural_group: ReplacementGroup.Isolation_Calf_Raise,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 20, target_rpe: 9, rest_seconds: 60 },
        ]
      },
      {
        // Day B: Hinge / VPress / HPull emphasis — slightly more posterior chain
        day_number: 2,
        day_type: DayType.FullBodyHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 15, target_rpe: 9, rest_seconds: 90 },
          { order_index: 3, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 15, target_rpe: 9, rest_seconds: 90 },
          { order_index: 4, architectural_group: ReplacementGroup.Isolation_Hamstring_Curl,  is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 9, rest_seconds: 60 },
        ]
      }
    ]
  },

  // ─── MINIMALIST: ATHLETIC FB (2-day) ─────────────────────────────────────────
  // NOTE: day_type intentionally set to FullBodyGenFit. There is no FullBodyAthletic
  // enum value yet. This is a deliberate placeholder — if a FullBodyAthletic enum
  // is added to DayType, this should be updated to match. Do not silently change this.
  {
    external_id: 'tmp_minimalist_2_day_athletic_v1',
    name: 'Minimalist Athletic 2-Day',
    goal_bucket: GoalBucket.Athletic,
    training_style: TrainingStyle.FullBody,
    days_per_week: 2,
    lift_comfort: LiftComfort.MachineDB,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        // Day A: Unilateral lower / Hpress / HPull — power & functional control
        day_number: 1,
        day_type: DayType.FullBodyGenFit, // TODO: replace with FullBodyAthletic when enum is added
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,    is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 7, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 3, architectural_group: ReplacementGroup.Trunk_Anti_Extension,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 30, reps_max: 60, target_rpe: 8, rest_seconds: 60 },
          { order_index: 4, architectural_group: ReplacementGroup.Conditioning_Metabolic_Finisher, is_required: false, archetype: SlotArchetype.Isolation,   progression_model: ProgressionModel.Density,            sets: 1, reps_min: 1, reps_max: 1, target_rpe: 9, rest_seconds: 0 },
        ]
      },
      {
        // Day B: Bilateral hinge / VPress / VPull — posterior chain strength + core
        day_number: 2,
        day_type: DayType.FullBodyGenFit, // TODO: replace with FullBodyAthletic when enum is added
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 5, reps_max: 8, target_rpe: 7, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 3, architectural_group: ReplacementGroup.Trunk_Flexion,             is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 15, reps_max: 20, target_rpe: 8, rest_seconds: 60 },
          { order_index: 4, architectural_group: ReplacementGroup.Conditioning_Metabolic_Finisher, is_required: false, archetype: SlotArchetype.Isolation,   progression_model: ProgressionModel.Density,            sets: 1, reps_min: 1, reps_max: 1, target_rpe: 9, rest_seconds: 0 },
        ]
      }
    ]
  },

  // ─── ATHLETIC: UPPER / LOWER (4-day) ─────────────────────────────────────────
  {
    external_id: 'tmp_athletic_ul_v1',
    name: 'Athletic Performance Upper/Lower',
    goal_bucket: GoalBucket.Athletic,
    training_style: TrainingStyle.UpperLower,
    days_per_week: 4,
    lift_comfort: LiftComfort.BarbellAdv,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        day_number: 1, // Lower: Power + Bilateral Squat
        day_type: DayType.LowerStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Power_Dynamic_Primer,       is_required: true,  archetype: SlotArchetype.PrimeCompound, progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 3, reps_max: 5, target_rpe: 7, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,    is_required: true,  archetype: SlotArchetype.PrimeCompound, progression_model: ProgressionModel.Linear_Load,        sets: 3, reps_min: 5, reps_max: 5, target_rpe: 8, rest_seconds: 180 },
          { order_index: 2, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 10, target_rpe: 8, rest_seconds: 90 },
          { order_index: 3, architectural_group: ReplacementGroup.Trunk_Rotational_Anti_Rotation, is_required: false, archetype: SlotArchetype.Isolation, progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 10, reps_max: 15, target_rpe: 7, rest_seconds: 60 },
        ]
      },
      {
        day_number: 2, // Upper: Horizontal + Anti-Ext
        day_type: DayType.UpperStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press,   is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 6, reps_max: 8, target_rpe: 8, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Primary_Vertical_Press,     is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 3, architectural_group: ReplacementGroup.Trunk_Anti_Extension,       is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 30, reps_max: 60, target_rpe: 7, rest_seconds: 60 },
        ]
      },
      {
        day_number: 3, // Lower: Bilateral Hinge + Conditioning
        day_type: DayType.LowerStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,    is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Linear_Load,        sets: 3, reps_min: 5, reps_max: 5, target_rpe: 8, rest_seconds: 180 },
          { order_index: 1, architectural_group: ReplacementGroup.Isolation_Hamstring_Curl,  is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 9, rest_seconds: 60 },
          { order_index: 2, architectural_group: ReplacementGroup.Conditioning_Metabolic_Finisher, is_required: true, archetype: SlotArchetype.Finisher,  progression_model: ProgressionModel.Density,            sets: 3, reps_min: 10, reps_max: 20, target_rpe: 9, rest_seconds: 60 },
        ]
      },
      {
        day_number: 4, // Upper: Vertical/Horizontal Mixed
        day_type: DayType.UpperStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,    is_required: true, archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 8, reps_max: 10, target_rpe: 8, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Press,   is_required: true, archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Lateral_Delt,     is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60 },
        ]
      }
    ]
  },

  // ─── FAT LOSS: UPPER / LOWER (4-day) ─────────────────────────────────────────
  {
    external_id: 'tmp_fatloss_ul_v1',
    name: 'Fat Loss Upper/Lower',
    goal_bucket: GoalBucket.FatLoss,
    training_style: TrainingStyle.UpperLower,
    days_per_week: 4,
    lift_comfort: LiftComfort.MachineDB,
    environment: SessionEnvironment.Commercial,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        day_number: 1, // Lower A
        day_type: DayType.LowerHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 60 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60 },
          { order_index: 2, architectural_group: ReplacementGroup.Trunk_Flexion,             is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 15, reps_max: 20, target_rpe: 7, rest_seconds: 45 },
        ]
      },
      {
        day_number: 2, // Upper A
        day_type: DayType.UpperHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 60 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 60 },
          { order_index: 2, architectural_group: ReplacementGroup.Conditioning_Metabolic_Finisher, is_required: true, archetype: SlotArchetype.Finisher,  progression_model: ProgressionModel.Density,            sets: 3, reps_min: 15, reps_max: 25, target_rpe: 8, rest_seconds: 45 },
        ]
      },
      {
        day_number: 3, // Lower B
        day_type: DayType.LowerHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 60 },
          { order_index: 1, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Hamstring_Curl,  is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 45 },
        ]
      },
      {
        day_number: 4, // Upper B
        day_type: DayType.UpperHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 60 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 60 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Bicep_Flexion,   is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 45 },
        ]
      }
    ]
  },

  // ─── MINIMAL EQUIPMENT: DB-ONLY UL (4-day) ──────────────────────────────────
  {
    external_id: 'tmp_db_only_ul_v1',
    name: 'DB-Only Upper/Lower',
    goal_bucket: GoalBucket.Hypertrophy,
    training_style: TrainingStyle.UpperLower,
    days_per_week: 4,
    lift_comfort: LiftComfort.MachineDB,
    environment: SessionEnvironment.AptHotel,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        day_number: 1, // Lower A
        day_type: DayType.LowerHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Calf_Raise,      is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60 },
        ]
      },
      {
        day_number: 2, // Upper A
        day_type: DayType.UpperHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Lateral_Delt,    is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60 },
        ]
      },
      {
        day_number: 3, // Lower B
        day_type: DayType.LowerHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Trunk_Flexion,             is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 15, reps_max: 20, target_rpe: 7, rest_seconds: 45 },
        ]
      },
      {
        day_number: 4, // Upper B
        day_type: DayType.UpperHypertrophy,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 10, reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Isolation_Bicep_Flexion,   is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Double_Progression, sets: 3, reps_min: 12, reps_max: 15, target_rpe: 8, rest_seconds: 60 },
        ]
      }
    ]
  },

  // ─── BODYWEIGHT: SKILL UL (4-day) ──────────────────────────────────────────
  {
    external_id: 'tmp_bw_skill_ul_v1',
    name: 'Bodyweight Skill Upper/Lower',
    goal_bucket: GoalBucket.GenFitness,
    training_style: TrainingStyle.UpperLower,
    days_per_week: 4,
    lift_comfort: LiftComfort.NoBarbell,
    environment: SessionEnvironment.Bodyweight,
    experience_level: ExperienceLevel.Intermediate,
    days: [
      {
        day_number: 1, // Lower A: Explosive + Squat
        day_type: DayType.LowerStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Power_Dynamic_Primer,       is_required: true,  archetype: SlotArchetype.PrimeCompound, progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 5,  reps_max: 8,  target_rpe: 7, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Bilateral_Squat,    is_required: true,  archetype: SlotArchetype.PrimeCompound, progression_model: ProgressionModel.Mechanical_BW,     sets: 3, reps_min: 10, reps_max: 20, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Trunk_Anti_Extension,       is_required: false, archetype: SlotArchetype.Isolation,     progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 30, reps_max: 60, target_rpe: 7, rest_seconds: 60 },
        ]
      },
      {
        day_number: 2, // Upper A: Press/Pull Skill
        day_type: DayType.UpperStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Horizontal_Press,  is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Mechanical_BW,     sets: 3, reps_min: 8,  reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Vertical_Pull,     is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Mechanical_BW,     sets: 3, reps_min: 6,  reps_max: 10, target_rpe: 9, rest_seconds: 120 },
          { order_index: 2, architectural_group: ReplacementGroup.Trunk_Rotational_Anti_Rotation, is_required: false, archetype: SlotArchetype.Isolation, progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 10, reps_max: 15, target_rpe: 7, rest_seconds: 45 },
        ]
      },
      {
        day_number: 3, // Lower B: Hinge + Unilateral
        day_type: DayType.LowerStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Bilateral_Hinge,    is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Mechanical_BW,     sets: 3, reps_min: 10, reps_max: 15, target_rpe: 8, rest_seconds: 90 },
          { order_index: 1, architectural_group: ReplacementGroup.Unilateral_Squat_Lunge,     is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Mechanical_BW,     sets: 3, reps_min: 8,  reps_max: 12, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Conditioning_Metabolic_Finisher, is_required: true, archetype: SlotArchetype.Finisher,  progression_model: ProgressionModel.Density,            sets: 3, reps_min: 1,  reps_max: 1,  target_rpe: 9, rest_seconds: 60 },
        ]
      },
      {
        day_number: 4, // Upper B: OHP/Pull Skill
        day_type: DayType.UpperStrength,
        slots: [
          { order_index: 0, architectural_group: ReplacementGroup.Primary_Vertical_Press,    is_required: true,  archetype: SlotArchetype.PrimeCompound,     progression_model: ProgressionModel.Mechanical_BW,     sets: 3, reps_min: 5,  reps_max: 10, target_rpe: 9, rest_seconds: 120 },
          { order_index: 1, architectural_group: ReplacementGroup.Primary_Horizontal_Pull,   is_required: true,  archetype: SlotArchetype.SecondaryCompound, progression_model: ProgressionModel.Mechanical_BW,     sets: 3, reps_min: 10, reps_max: 15, target_rpe: 8, rest_seconds: 90 },
          { order_index: 2, architectural_group: ReplacementGroup.Trunk_Flexion,             is_required: false, archetype: SlotArchetype.Isolation,         progression_model: ProgressionModel.Rep_Goal,           sets: 3, reps_min: 15, reps_max: 25, target_rpe: 7, rest_seconds: 45 },
        ]
      }
    ]
  }
];
