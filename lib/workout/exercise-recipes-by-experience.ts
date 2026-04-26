/**
 * exercise-recipes-by-experience.ts
 *
 * Per-Experience Recipe Variants
 * Part of Phase 2: Recipe System Enhancement
 *
 * Provides day templates tailored to each experience level:
 * - Beginners: 4-5 exercises, foundational only, technique focus
 * - Intermediates: 6-7 exercises, mixed complexity, progressive overload
 * - Advanced: 7-8 exercises, full variety, periodization ready
 */

import type { PatternSlot } from './exerciseClassification.ts';
import type { ExperienceLevel } from './training-profile.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExerciseSlot = {
  pattern: PatternSlot;
  sets: number;
  reps: string;
  restSeconds: number;
  rpe?: number; // Rate of Perceived Exertition target
  technique?: string; // Optional technique cue
};

export type DayRecipe = {
  name: string;
  description: string;
  focus: string[];
  slots: ExerciseSlot[];
  totalSets: number;
  estimatedDurationMin: number;
  complexity: 'foundational' | 'mixed' | 'all';
  goal: 'build_muscle' | 'lose_fat' | 'build_strength' | 'general_fitness';
};

export type ExperienceRecipeSet = {
  beginner: DayRecipe[];
  intermediate: DayRecipe[];
  advanced: DayRecipe[];
};

// ---------------------------------------------------------------------------
// Beginner Recipes (0-1 year experience)
// Focus: Technique mastery, motor learning, injury prevention
// ---------------------------------------------------------------------------

const BEGINNER_UPPER_A: DayRecipe = {
  name: 'Upper A - Push/Pull Foundation',
  description: 'Fundamental pushing and pulling patterns with emphasis on form',
  focus: ['upper', 'push', 'pull'],
  complexity: 'foundational',
  goal: 'build_muscle',
  slots: [
    {
      pattern: 'horizontal_push',
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
      rpe: 7,
      technique: 'Control the eccentric, pause at chest',
    },
    {
      pattern: 'horizontal_pull',
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
      rpe: 7,
      technique: 'Squeeze shoulder blades at contraction',
    },
    {
      pattern: 'vertical_pull',
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
      rpe: 7,
      technique: 'Lead with elbows, full range of motion',
    },
    {
      pattern: 'vertical_push',
      sets: 3,
      reps: '8-12',
      restSeconds: 120,
      rpe: 7,
      technique: 'Brace core, avoid lower back arch',
    },
    {
      pattern: 'rear_delt',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      rpe: 7,
      technique: 'Light weight, focus on rear delt contraction',
    },
    {
      pattern: 'core',
      sets: 3,
      reps: '30-45s',
      restSeconds: 60,
      rpe: 7,
      technique: 'Hips neutral, breathe normally',
    },
  ],
  totalSets: 18,
  estimatedDurationMin: 50,
};

const BEGINNER_UPPER_B: DayRecipe = {
  name: 'Upper B - Strength & Hypertrophy',
  description: 'Variation of pushing and pulling with dumbbell focus',
  focus: ['upper', 'push', 'pull'],
  complexity: 'foundational',
  goal: 'build_muscle',
  slots: [
    {
      pattern: 'horizontal_pull',
      sets: 4,
      reps: '8-10',
      restSeconds: 90,
      rpe: 7,
      technique: 'Pull to lower chest/upper abdomen',
    },
    {
      pattern: 'horizontal_push',
      sets: 4,
      reps: '8-10',
      restSeconds: 120,
      rpe: 7,
      technique: 'Slight arch, drive through feet',
    },
    {
      pattern: 'vertical_pull',
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
      rpe: 7,
      technique: 'Vary grip width for complete lat development',
    },
    {
      pattern: 'chest_fly',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      rpe: 7,
      technique: 'Slight elbow bend, squeeze at peak contraction',
    },
    {
      pattern: 'bicep_curl',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      rpe: 7,
      technique: 'No swinging, elbows fixed at sides',
    },
    {
      pattern: 'tricep_ext',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      rpe: 7,
      technique: 'Full extension, control the negative',
    },
  ],
  totalSets: 20,
  estimatedDurationMin: 55,
};

const BEGINNER_LOWER_A: DayRecipe = {
  name: 'Lower A - Squat & Hinge Foundation',
  description: 'Essential lower body patterns with quad and posterior chain emphasis',
  focus: ['lower', 'legs', 'quads'],
  complexity: 'foundational',
  goal: 'build_muscle',
  slots: [
    {
      pattern: 'compound_squat',
      sets: 3,
      reps: '8-12',
      restSeconds: 120,
      rpe: 7,
      technique: 'Break at hips and knees simultaneously, depth over weight',
    },
    {
      pattern: 'compound_hinge',
      sets: 3,
      reps: '10-12',
      restSeconds: 120,
      rpe: 7,
      technique: 'Soft knees, feel hamstring stretch, hip hinge not squat',
    },
    {
      pattern: 'single_leg',
      sets: 3,
      reps: '8-10',
      restSeconds: 90,
      rpe: 7,
      technique: 'Front knee tracks over toe, torso upright',
    },
    {
      pattern: 'leg_curl',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      rpe: 7,
      technique: 'Squeeze hamstrings, control the negative',
    },
    {
      pattern: 'calf',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      rpe: 7,
      technique: 'Full range of motion, pause at stretch and contraction',
    },
  ],
  totalSets: 15,
  estimatedDurationMin: 45,
};

const BEGINNER_LOWER_B: DayRecipe = {
  name: 'Lower B - Hinge & Glute Emphasis',
  description: 'Posterior chain focus with deadlift progression',
  focus: ['lower', 'legs', 'glutes', 'hamstrings'],
  complexity: 'foundational',
  goal: 'build_muscle',
  slots: [
    {
      pattern: 'compound_hinge',
      sets: 3,
      reps: '8-10',
      restSeconds: 180,
      rpe: 7,
      technique: 'Barbell or trap bar, flat back, drive hips forward',
    },
    {
      pattern: 'compound_squat',
      sets: 3,
      reps: '8-12',
      restSeconds: 120,
      rpe: 7,
      technique: 'Goblet or front squat for quad emphasis',
    },
    {
      pattern: 'hip_thrust',
      sets: 3,
      reps: '10-12',
      restSeconds: 90,
      rpe: 7,
      technique: 'Squeeze glutes at top, chin tucked',
    },
    {
      pattern: 'leg_curl',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      rpe: 7,
      technique: 'Isolate hamstrings, minimal hip movement',
    },
    {
      pattern: 'calf',
      sets: 3,
      reps: '15-20',
      restSeconds: 60,
      rpe: 7,
      technique: 'Slow tempo, full stretch at bottom',
    },
    {
      pattern: 'core',
      sets: 3,
      reps: '30-45s',
      restSeconds: 60,
      rpe: 7,
      technique: 'Dead bug or plank variation',
    },
  ],
  totalSets: 18,
  estimatedDurationMin: 50,
};

const BEGINNER_FULL_BODY_A: DayRecipe = {
  name: 'Full Body A - All Patterns',
  description: 'Complete body workout hitting all major movement patterns',
  focus: ['full_body'],
  complexity: 'foundational',
  goal: 'build_muscle',
  slots: [
    {
      pattern: 'compound_squat',
      sets: 3,
      reps: '8-12',
      restSeconds: 120,
      rpe: 7,
      technique: 'Master the squat pattern',
    },
    {
      pattern: 'horizontal_push',
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
      rpe: 7,
      technique: 'Control the negative',
    },
    {
      pattern: 'horizontal_pull',
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
      rpe: 7,
      technique: 'Squeeze at contraction',
    },
    {
      pattern: 'compound_hinge',
      sets: 3,
      reps: '10-12',
      restSeconds: 120,
      rpe: 7,
      technique: 'Hip hinge, flat back',
    },
    {
      pattern: 'core',
      sets: 3,
      reps: '30-45s',
      restSeconds: 60,
      rpe: 7,
      technique: 'Stable core, breathing pattern',
    },
  ],
  totalSets: 15,
  estimatedDurationMin: 50,
};

const BEGINNER_FULL_BODY_B: DayRecipe = {
  name: 'Full Body B - Variation Day',
  description: 'Variation of full body with different exercise angles',
  focus: ['full_body'],
  complexity: 'foundational',
  goal: 'build_muscle',
  slots: [
    {
      pattern: 'compound_hinge',
      sets: 3,
      reps: '8-10',
      restSeconds: 150,
      rpe: 7,
      technique: 'Trap bar or RDL variation',
    },
    {
      pattern: 'vertical_push',
      sets: 3,
      reps: '8-12',
      restSeconds: 120,
      rpe: 7,
      technique: 'Overhead press pattern',
    },
    {
      pattern: 'vertical_pull',
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
      rpe: 7,
      technique: 'Lat pulldown or assisted pull-up',
    },
    {
      pattern: 'single_leg',
      sets: 3,
      reps: '8-10',
      restSeconds: 90,
      rpe: 7,
      technique: 'Lunge or split squat pattern',
    },
    {
      pattern: 'core',
      sets: 3,
      reps: '30-45s',
      restSeconds: 60,
      rpe: 7,
      technique: 'Pallof press or cable crunch',
    },
  ],
  totalSets: 15,
  estimatedDurationMin: 50,
};

// ---------------------------------------------------------------------------
// Intermediate Recipes (1-3 years experience)
// Focus: Progressive overload, exercise variation, volume accumulation
// ---------------------------------------------------------------------------

const INTERMEDIATE_UPPER_A: DayRecipe = {
  name: 'Upper A - Strength & Size',
  description: 'Heavy compounds with accessory volume for mass',
  focus: ['upper', 'push', 'pull'],
  complexity: 'mixed',
  goal: 'build_muscle',
  slots: [
    {
      pattern: 'horizontal_push',
      sets: 4,
      reps: '6-8',
      restSeconds: 150,
      rpe: 8,
      technique: 'Heavy barbell, slight arch, leg drive',
    },
    {
      pattern: 'horizontal_pull',
      sets: 4,
      reps: '8-10',
      restSeconds: 120,
      rpe: 8,
      technique: 'Heavy row variation, controlled negative',
    },
    {
      pattern: 'vertical_push',
      sets: 3,
      reps: '8-10',
      restSeconds: 120,
      rpe: 8,
      technique: 'Overhead press, strict form',
    },
    {
      pattern: 'vertical_pull',
      sets: 3,
      reps: '8-10',
      restSeconds: 90,
      rpe: 8,
      technique: 'Pull-ups or weighted pulldowns',
    },
    {
      pattern: 'chest_fly',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Peak contraction focus',
    },
    {
      pattern: 'rear_delt',
      sets: 3,
      reps: '15-20',
      restSeconds: 60,
      rpe: 8,
      technique: 'High reps for shoulder health',
    },
    {
      pattern: 'bicep_curl',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      rpe: 8,
      technique: 'Controlled tempo, squeeze at top',
    },
    {
      pattern: 'tricep_ext',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      rpe: 8,
      technique: 'Full range of motion',
    },
  ],
  totalSets: 26,
  estimatedDurationMin: 65,
};

const INTERMEDIATE_UPPER_B: DayRecipe = {
  name: 'Upper B - Hypertrophy Focus',
  description: 'Higher rep ranges with exercise variations',
  focus: ['upper', 'push', 'pull'],
  complexity: 'mixed',
  goal: 'build_muscle',
  slots: [
    {
      pattern: 'horizontal_pull',
      sets: 4,
      reps: '8-12',
      restSeconds: 90,
      rpe: 8,
      technique: 'Wide grip or t-bar for variety',
    },
    {
      pattern: 'horizontal_push',
      sets: 4,
      reps: '8-12',
      restSeconds: 120,
      rpe: 8,
      technique: 'Incline press for upper chest',
    },
    {
      pattern: 'vertical_pull',
      sets: 3,
      reps: '10-12',
      restSeconds: 90,
      rpe: 8,
      technique: 'Underhand grip for biceps emphasis',
    },
    {
      pattern: 'vertical_push',
      sets: 3,
      reps: '10-12',
      restSeconds: 90,
      rpe: 8,
      technique: 'Dumbbell for range of motion',
    },
    {
      pattern: 'chest_fly',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Cable fly for constant tension',
    },
    {
      pattern: 'shoulder_raise',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Lateral raise for width',
    },
    {
      pattern: 'bicep_curl',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Incline curl for stretch',
    },
    {
      pattern: 'tricep_ext',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Overhead extension for long head',
    },
  ],
  totalSets: 26,
  estimatedDurationMin: 65,
};

const INTERMEDIATE_LOWER_A: DayRecipe = {
  name: 'Lower A - Squat Dominant',
  description: 'Heavy squat focus with posterior chain support',
  focus: ['lower', 'legs', 'quads'],
  complexity: 'mixed',
  goal: 'build_muscle',
  slots: [
    {
      pattern: 'compound_squat',
      sets: 4,
      reps: '5-8',
      restSeconds: 180,
      rpe: 8,
      technique: 'Heavy back squat, competition depth',
    },
    {
      pattern: 'compound_hinge',
      sets: 4,
      reps: '6-8',
      restSeconds: 180,
      rpe: 8,
      technique: 'Romanian deadlift for hamstrings',
    },
    {
      pattern: 'single_leg',
      sets: 3,
      reps: '8-10',
      restSeconds: 90,
      rpe: 8,
      technique: 'Bulgarian split squat for stability',
    },
    {
      pattern: 'leg_curl',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      rpe: 8,
      technique: 'Control the negative',
    },
    {
      pattern: 'leg_extension',
      sets: 3,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Quad isolation, full extension',
    },
    {
      pattern: 'calf',
      sets: 4,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Standing and seated variations',
    },
  ],
  totalSets: 21,
  estimatedDurationMin: 60,
};

const INTERMEDIATE_LOWER_B: DayRecipe = {
  name: 'Lower B - Hinge Dominant',
  description: 'Deadlift focus with quad and glute balance',
  focus: ['lower', 'legs', 'hamstrings', 'glutes'],
  complexity: 'mixed',
  goal: 'build_muscle',
  slots: [
    {
      pattern: 'compound_hinge',
      sets: 4,
      reps: '4-6',
      restSeconds: 240,
      rpe: 9,
      technique: 'Heavy conventional or sumo deadlift',
    },
    {
      pattern: 'compound_squat',
      sets: 3,
      reps: '8-10',
      restSeconds: 150,
      rpe: 8,
      technique: 'Front squat or safety bar squat',
    },
    {
      pattern: 'single_leg',
      sets: 3,
      reps: '8-10',
      restSeconds: 90,
      rpe: 8,
      technique: 'Reverse lunge or step-up',
    },
    {
      pattern: 'hip_thrust',
      sets: 3,
      reps: '10-12',
      restSeconds: 90,
      rpe: 8,
      technique: 'Heavy glute bridge/barbell hip thrust',
    },
    {
      pattern: 'leg_curl',
      sets: 3,
      reps: '10-12',
      restSeconds: 60,
      rpe: 8,
      technique: 'Seated or lying leg curl',
    },
    {
      pattern: 'calf',
      sets: 4,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Slow eccentrics',
    },
  ],
  totalSets: 20,
  estimatedDurationMin: 65,
};

// ---------------------------------------------------------------------------
// Advanced Recipes (3+ years experience)
// Focus: High volume, periodization, intensity techniques
// ---------------------------------------------------------------------------

const ADVANCED_UPPER_A: DayRecipe = {
  name: 'Upper A - Heavy Strength',
  description: 'Maximal strength focus with high-intensity accessories',
  focus: ['upper', 'push', 'pull'],
  complexity: 'all',
  goal: 'build_strength',
  slots: [
    {
      pattern: 'horizontal_push',
      sets: 5,
      reps: '3-5',
      restSeconds: 240,
      rpe: 9,
      technique: 'Competition bench press technique',
    },
    {
      pattern: 'horizontal_pull',
      sets: 5,
      reps: '5-8',
      restSeconds: 180,
      rpe: 9,
      technique: 'Heavy barbell or t-bar row',
    },
    {
      pattern: 'vertical_push',
      sets: 4,
      reps: '5-8',
      restSeconds: 180,
      rpe: 9,
      technique: 'Heavy overhead press, strict',
    },
    {
      pattern: 'vertical_pull',
      sets: 4,
      reps: '6-8',
      restSeconds: 120,
      rpe: 9,
      technique: 'Weighted pull-ups or pulldowns',
    },
    {
      pattern: 'chest_fly',
      sets: 4,
      reps: '10-12',
      restSeconds: 90,
      rpe: 8,
      technique: 'Rest-pause or drop set technique',
    },
    {
      pattern: 'shoulder_raise',
      sets: 4,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Cable or machine for constant tension',
    },
    {
      pattern: 'rear_delt',
      sets: 4,
      reps: '15-20',
      restSeconds: 60,
      rpe: 8,
      technique: 'High volume for shoulder health',
    },
    {
      pattern: 'bicep_curl',
      sets: 4,
      reps: '10-12',
      restSeconds: 60,
      rpe: 8,
      technique: 'EZ bar or cable variation',
    },
    {
      pattern: 'tricep_ext',
      sets: 4,
      reps: '10-12',
      restSeconds: 60,
      rpe: 8,
      technique: 'Close-grip bench or weighted dip',
    },
  ],
  totalSets: 38,
  estimatedDurationMin: 80,
};

const ADVANCED_UPPER_B: DayRecipe = {
  name: 'Upper B - Volume & Variation',
  description: 'High volume day with exercise rotation',
  focus: ['upper', 'push', 'pull'],
  complexity: 'all',
  goal: 'build_muscle',
  slots: [
    {
      pattern: 'horizontal_pull',
      sets: 5,
      reps: '8-10',
      restSeconds: 120,
      rpe: 8,
      technique: 'Chest-supported or seal row',
    },
    {
      pattern: 'horizontal_push',
      sets: 5,
      reps: '6-8',
      restSeconds: 150,
      rpe: 8,
      technique: 'Close-grip or incline press variation',
    },
    {
      pattern: 'vertical_pull',
      sets: 4,
      reps: '8-10',
      restSeconds: 90,
      rpe: 8,
      technique: 'Wide grip or neutral grip pull-ups',
    },
    {
      pattern: 'vertical_push',
      sets: 4,
      reps: '8-10',
      restSeconds: 120,
      rpe: 8,
      technique: 'Push press or dumbbell press',
    },
    {
      pattern: 'chest_fly',
      sets: 4,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Incline dumbbell fly or pec deck',
    },
    {
      pattern: 'rear_delt',
      sets: 4,
      reps: '15-20',
      restSeconds: 60,
      rpe: 8,
      technique: 'Face pulls with external rotation',
    },
    {
      pattern: 'bicep_curl',
      sets: 4,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Preacher or spider curl',
    },
    {
      pattern: 'tricep_ext',
      sets: 4,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Skullcrushers or JM press',
    },
  ],
  totalSets: 34,
  estimatedDurationMin: 75,
};

const ADVANCED_LOWER_A: DayRecipe = {
  name: 'Lower A - Squat Intensity',
  description: 'Heavy squatting with comprehensive leg development',
  focus: ['lower', 'legs', 'quads'],
  complexity: 'all',
  goal: 'build_strength',
  slots: [
    {
      pattern: 'compound_squat',
      sets: 5,
      reps: '3-5',
      restSeconds: 300,
      rpe: 9,
      technique: 'Competition squat, pause option',
    },
    {
      pattern: 'compound_hinge',
      sets: 5,
      reps: '4-6',
      restSeconds: 240,
      rpe: 9,
      technique: 'Heavy RDL or stiff-leg deadlift',
    },
    {
      pattern: 'single_leg',
      sets: 4,
      reps: '6-8',
      restSeconds: 120,
      rpe: 8,
      technique: 'Bulgarian split squat with weight',
    },
    {
      pattern: 'leg_curl',
      sets: 4,
      reps: '8-10',
      restSeconds: 90,
      rpe: 8,
      technique: 'Myo-reps or rest-pause',
    },
    {
      pattern: 'leg_extension',
      sets: 4,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Drop set on final set',
    },
    {
      pattern: 'calf',
      sets: 5,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Standing and seated combo',
    },
  ],
  totalSets: 27,
  estimatedDurationMin: 75,
};

const ADVANCED_LOWER_B: DayRecipe = {
  name: 'Lower B - Deadlift & Posterior',
  description: 'Heavy pulling with glute and hamstring emphasis',
  focus: ['lower', 'legs', 'hamstrings', 'glutes'],
  complexity: 'all',
  goal: 'build_strength',
  slots: [
    {
      pattern: 'compound_hinge',
      sets: 5,
      reps: '2-4',
      restSeconds: 300,
      rpe: 9,
      technique: 'Maximal deadlift, sumo or conventional',
    },
    {
      pattern: 'compound_squat',
      sets: 4,
      reps: '5-8',
      restSeconds: 180,
      rpe: 8,
      technique: 'Front squat or safety bar squat',
    },
    {
      pattern: 'hip_thrust',
      sets: 4,
      reps: '8-10',
      restSeconds: 120,
      rpe: 8,
      technique: 'Heavy barbell hip thrust',
    },
    {
      pattern: 'single_leg',
      sets: 4,
      reps: '6-8',
      restSeconds: 120,
      rpe: 8,
      technique: 'Step-ups or lunges with weight',
    },
    {
      pattern: 'leg_curl',
      sets: 4,
      reps: '10-12',
      restSeconds: 90,
      rpe: 8,
      technique: 'High volume for hamstrings',
    },
    {
      pattern: 'calf',
      sets: 5,
      reps: '12-15',
      restSeconds: 60,
      rpe: 8,
      technique: 'Slow eccentrics, pause at stretch',
    },
  ],
  totalSets: 26,
  estimatedDurationMin: 75,
};

// ---------------------------------------------------------------------------
// Recipe Registry
// ---------------------------------------------------------------------------

export const EXPERIENCE_RECIPES: Record<string, ExperienceRecipeSet> = {
  upper_lower_4: {
    beginner: [BEGINNER_UPPER_A, BEGINNER_LOWER_A, BEGINNER_UPPER_B, BEGINNER_LOWER_B],
    intermediate: [INTERMEDIATE_UPPER_A, INTERMEDIATE_LOWER_A, INTERMEDIATE_UPPER_B, INTERMEDIATE_LOWER_B],
    advanced: [ADVANCED_UPPER_A, ADVANCED_LOWER_A, ADVANCED_UPPER_B, ADVANCED_LOWER_B],
  },
  full_body_3: {
    beginner: [BEGINNER_FULL_BODY_A, BEGINNER_FULL_BODY_B, BEGINNER_FULL_BODY_A],
    intermediate: [
      INTERMEDIATE_UPPER_A, // Adapted for full body
      INTERMEDIATE_LOWER_A, // Adapted for full body
      {
        ...INTERMEDIATE_UPPER_B,
        name: 'Full Body C - Volume',
        description: 'Volume accumulation day with all patterns',
        focus: ['full_body'],
        slots: [
          { pattern: 'compound_squat', sets: 3, reps: '6-8', restSeconds: 150, rpe: 8 },
          { pattern: 'horizontal_push', sets: 3, reps: '8-10', restSeconds: 120, rpe: 8 },
          { pattern: 'horizontal_pull', sets: 3, reps: '8-10', restSeconds: 120, rpe: 8 },
          { pattern: 'compound_hinge', sets: 3, reps: '6-8', restSeconds: 150, rpe: 8 },
          { pattern: 'vertical_push', sets: 2, reps: '8-10', restSeconds: 90, rpe: 8 },
          { pattern: 'bicep_curl', sets: 3, reps: '10-12', restSeconds: 60, rpe: 8 },
          { pattern: 'tricep_ext', sets: 3, reps: '10-12', restSeconds: 60, rpe: 8 },
        ],
        totalSets: 20,
        estimatedDurationMin: 60,
      },
    ],
    advanced: [
      // Advanced full body adaptations
      {
        ...ADVANCED_UPPER_A,
        name: 'Full Body A - Power',
        focus: ['full_body'],
        slots: [
          { pattern: 'compound_squat', sets: 4, reps: '3-5', restSeconds: 240, rpe: 9 },
          { pattern: 'horizontal_push', sets: 4, reps: '3-5', restSeconds: 240, rpe: 9 },
          { pattern: 'horizontal_pull', sets: 4, reps: '5-6', restSeconds: 180, rpe: 9 },
          { pattern: 'compound_hinge', sets: 4, reps: '3-5', restSeconds: 240, rpe: 9 },
          { pattern: 'vertical_push', sets: 3, reps: '5-6', restSeconds: 150, rpe: 8 },
          { pattern: 'core', sets: 4, reps: '45-60s', restSeconds: 60, rpe: 8 },
        ],
        totalSets: 23,
        estimatedDurationMin: 70,
      },
      {
        ...ADVANCED_UPPER_B,
        name: 'Full Body B - Volume',
        focus: ['full_body'],
        slots: [
          { pattern: 'compound_hinge', sets: 4, reps: '6-8', restSeconds: 180, rpe: 8 },
          { pattern: 'horizontal_push', sets: 4, reps: '6-8', restSeconds: 150, rpe: 8 },
          { pattern: 'horizontal_pull', sets: 4, reps: '8-10', restSeconds: 120, rpe: 8 },
          { pattern: 'compound_squat', sets: 4, reps: '6-8', restSeconds: 180, rpe: 8 },
          { pattern: 'vertical_pull', sets: 3, reps: '8-10', restSeconds: 90, rpe: 8 },
          { pattern: 'single_leg', sets: 3, reps: '8-10', restSeconds: 90, rpe: 8 },
          { pattern: 'calf', sets: 4, reps: '12-15', restSeconds: 60, rpe: 8 },
        ],
        totalSets: 26,
        estimatedDurationMin: 75,
      },
      {
        ...ADVANCED_LOWER_A,
        name: 'Full Body C - Pump',
        focus: ['full_body'],
        slots: [
          { pattern: 'compound_squat', sets: 4, reps: '8-10', restSeconds: 150, rpe: 8 },
          { pattern: 'horizontal_push', sets: 4, reps: '8-10', restSeconds: 120, rpe: 8 },
          { pattern: 'horizontal_pull', sets: 4, reps: '10-12', restSeconds: 90, rpe: 8 },
          { pattern: 'compound_hinge', sets: 4, reps: '8-10', restSeconds: 150, rpe: 8 },
          { pattern: 'vertical_push', sets: 3, reps: '10-12', restSeconds: 90, rpe: 8 },
          { pattern: 'bicep_curl', sets: 4, reps: '12-15', restSeconds: 60, rpe: 8 },
          { pattern: 'tricep_ext', sets: 4, reps: '12-15', restSeconds: 60, rpe: 8 },
          { pattern: 'rear_delt', sets: 4, reps: '15-20', restSeconds: 60, rpe: 8 },
        ],
        totalSets: 31,
        estimatedDurationMin: 80,
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Recipe Selection Functions
// ---------------------------------------------------------------------------

export function getRecipeForSplit(
  splitKey: string,
  experienceLevel: ExperienceLevel,
  dayIndex: number
): DayRecipe | null {
  const splitRecipes = EXPERIENCE_RECIPES[splitKey];
  if (!splitRecipes) return null;

  const experienceRecipes = splitRecipes[experienceLevel];
  if (!experienceRecipes || experienceRecipes.length === 0) return null;

  // Cycle through available recipes for the day
  return experienceRecipes[dayIndex % experienceRecipes.length];
}

export function getRecipesForSplit(
  splitKey: string,
  experienceLevel: ExperienceLevel,
  daysPerWeek: number
): DayRecipe[] {
  const splitRecipes = EXPERIENCE_RECIPES[splitKey];
  if (!splitRecipes) return [];

  const experienceRecipes = splitRecipes[experienceLevel];
  if (!experienceRecipes) return [];

  // Repeat recipes to match days per week
  const recipes: DayRecipe[] = [];
  for (let i = 0; i < daysPerWeek; i++) {
    recipes.push(experienceRecipes[i % experienceRecipes.length]);
  }
  return recipes;
}

export function getMinimumExercises(experienceLevel: ExperienceLevel): number {
  switch (experienceLevel) {
    case 'beginner':
      return 5;
    case 'intermediate':
      return 6;
    case 'advanced':
      return 7;
    default:
      return 5;
  }
}

export function getMinimumSetsPerSession(experienceLevel: ExperienceLevel): number {
  switch (experienceLevel) {
    case 'beginner':
      return 15;
    case 'intermediate':
      return 18;
    case 'advanced':
      return 22;
    default:
      return 15;
  }
}

export function getMaximumExercises(experienceLevel: ExperienceLevel, sessionDurationMin: number): number {
  const baseMax = Math.floor((sessionDurationMin - 10) / 8); // 8 min per exercise including rest

  switch (experienceLevel) {
    case 'beginner':
      return Math.min(baseMax, 7);
    case 'intermediate':
      return Math.min(baseMax, 9);
    case 'advanced':
      return Math.min(baseMax, 10);
    default:
      return baseMax;
  }
}

// ---------------------------------------------------------------------------
// Recipe Validation
// ---------------------------------------------------------------------------

export function validateRecipe(recipe: DayRecipe, experienceLevel: ExperienceLevel): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const minExercises = getMinimumExercises(experienceLevel);
  const minSets = getMinimumSetsPerSession(experienceLevel);

  if (recipe.slots.length < minExercises) {
    issues.push(`Recipe has ${recipe.slots.length} exercises, minimum ${minExercises} required for ${experienceLevel}`);
  }

  if (recipe.totalSets < minSets) {
    issues.push(`Recipe has ${recipe.totalSets} sets, minimum ${minSets} required for ${experienceLevel}`);
  }

  // Check for required patterns
  const requiredPatterns: PatternSlot[] = ['horizontal_push', 'horizontal_pull'];
  const hasPattern = (pattern: PatternSlot) => recipe.slots.some((slot) => slot.pattern === pattern);

  if (recipe.focus.includes('upper') || recipe.focus.includes('push') || recipe.focus.includes('pull')) {
    for (const pattern of requiredPatterns) {
      if (!hasPattern(pattern)) {
        issues.push(`Missing required pattern: ${pattern}`);
      }
    }
  }

  if (recipe.focus.includes('lower') || recipe.focus.includes('legs')) {
    if (!hasPattern('compound_squat') && !hasPattern('compound_hinge')) {
      issues.push('Lower body day should include squat or hinge pattern');
    }
  }

  return { valid: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// Goal-Specific Modifications
// ---------------------------------------------------------------------------

export function applyGoalModifications(recipe: DayRecipe, goal: string): DayRecipe {
  const modified = { ...recipe };

  switch (goal) {
    case 'lose_fat':
      // Reduce rest periods, add conditioning
      modified.slots = recipe.slots.map((slot) => ({
        ...slot,
        restSeconds: Math.max(60, slot.restSeconds - 30),
        reps: slot.reps.includes('15') ? slot.reps : `${parseInt(slot.reps.split('-')[0])}-${Math.min(15, parseInt(slot.reps.split('-')[1] || slot.reps.split('-')[0]) + 2)}`,
      }));
      // Add conditioning if not present
      if (!modified.slots.some((s) => s.pattern === 'conditioning')) {
        modified.slots.push({
          pattern: 'conditioning',
          sets: 1,
          reps: '10-15 min',
          restSeconds: 0,
          rpe: 7,
          technique: 'Steady-state cardio or intervals',
        });
      }
      break;

    case 'build_strength':
      // Lower reps, increase rest
      modified.slots = recipe.slots
        .filter((slot) => slot.pattern.includes('compound'))
        .slice(0, 5) // Focus on compounds
        .map((slot) => ({
          ...slot,
          sets: Math.min(5, slot.sets + 1),
          reps: '3-6',
          restSeconds: Math.min(300, slot.restSeconds + 60),
          rpe: 9,
        }));
      break;

    case 'build_muscle':
    default:
      // Recipe is already hypertrophy-focused
      break;
  }

  return modified;
}
