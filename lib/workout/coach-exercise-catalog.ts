import type { PatternSlot } from './exerciseClassification.ts';
import { normalizeWorkoutToken, type ProgramExercise } from './programMappingRules.ts';

export type CoachExerciseStatus =
  | 'approved_default'
  | 'approved_progression'
  | 'approved_alternate'
  | 'disallowed';

export type CoachAllowedUsage =
  | 'general'
  | 'hypertrophy'
  | 'strength_anchor'
  | 'limited_equipment'
  | 'vertical_pull_progression'
  | 'bodyweight_progression';

export type CoachEquipmentTier =
  | 'full_gym_basic'
  | 'home_basic'
  | 'bodyweight_basic'
  | 'conditioning_basic'
  | 'specialty';

/**
 * Exercise complexity classification for experience-based gating
 * - foundational: Safe for all experience levels, fundamental movement patterns
 * - intermediate: Requires some movement competency, stabilization, or coordination
 * - advanced: Complex movements requiring significant strength, mobility, or skill
 */
export type ExerciseComplexity = 'foundational' | 'intermediate' | 'advanced';

export type CoachExerciseCatalogMatch = {
  catalogVersion: string;
  canonicalFamily: string;
  movementRole: PatternSlot;
  equipmentTier: CoachEquipmentTier;
  status: CoachExerciseStatus;
  complexity: ExerciseComplexity;
  allowedUsage: CoachAllowedUsage[];
  reasons: string[];
};

type CoachCatalogDefinition = {
  canonicalFamily: string;
  movementRole: PatternSlot;
  equipmentTier: CoachEquipmentTier;
  status: CoachExerciseStatus;
  complexity: ExerciseComplexity;
  allowedUsage: CoachAllowedUsage[];
  aliases: string[];
};

export const COACH_EXERCISE_CATALOG_VERSION = 'coach_catalog_v2';

const DISALLOWED_PATTERNS = [
  'scapula',
  'archer',
  'paused',
  'pause ',
  'tempo',
  'medicine ball',
  'with towel',
  'towel',
  'stability ball',
  'swiss ball',
  'bosu',
  'standing one arm row',
  'bodyweight standing one arm row',
  'cable assisted inverse',
  'pike to cobra',
  'pike-to-cobra',
  'front raise',
  'plate front raise',
  'side pov',
  'rear view',
  'front pov',
  'demo',
  'stretch',
  'mobility',
  'warm up',
  'warm-up',
  'rehab',
  'drill',
  'animal flow',
  'bear crawl',
  'crab walk',
  'single leg split squat',
];

/**
 * Exercise-specific complexity overrides
 * These exercises have non-default complexity based on their specific name
 * (more granular than family-level complexity)
 */
const EXERCISE_COMPLEXITY_OVERRIDES: Record<string, ExerciseComplexity> = {
  // Foundational movements that should be accessible to beginners
  'reverse lunge': 'foundational',
  'walking lunge': 'foundational',
  'stationary lunge': 'foundational',
  'split squat': 'foundational',
  'goblet squat': 'foundational',
  'leg press': 'foundational',
  'hack squat': 'foundational',
  'step up': 'foundational',
  'step-up': 'foundational',
  
  // Foundational row variations
  'chest supported row': 'foundational',
  'machine row': 'foundational',
  'seated cable row': 'foundational',
  'lat pulldown': 'foundational',
  
  // Foundational press variations
  'machine shoulder press': 'foundational',
  'machine chest press': 'foundational',
  
  // Advanced unilateral/complex movements
  'barbell one arm side deadlift': 'advanced',
  'barbell one-arm side deadlift': 'advanced',
  'one arm side deadlift': 'advanced',
  'one-arm side deadlift': 'advanced',
  'pistol squat': 'advanced',
  'single leg rdl': 'intermediate',
  'single-leg rdl': 'intermediate',
  'single leg romanian deadlift': 'intermediate',
  'single-leg romanian deadlift': 'intermediate',
  
  // Intermediate unilateral variations (but still appropriate for beginners with limitations)
  'bulgarian split squat': 'intermediate',
  'deficit deadlift': 'advanced',
  'snatch grip deadlift': 'advanced',
  'sumo deadlift': 'intermediate',
  
  // Smith machine variations (intermediate complexity due to fixed path)
  'smith squat': 'intermediate',
  'smith hack squat': 'intermediate',
  'smith machine squat': 'intermediate',
  'smith machine hack squat': 'intermediate',
  'smith bench press': 'intermediate',
  'smith machine bench press': 'intermediate',
  'smith overhead press': 'intermediate',
  'smith machine overhead press': 'intermediate',
  'smith incline press': 'intermediate',
  'smith machine incline press': 'intermediate',
  'smith hip thrust': 'intermediate',
  'smith machine hip thrust': 'intermediate',
  
  // Overhead/unilateral pressing
  'single arm overhead press': 'intermediate',
  'single-arm overhead press': 'intermediate',
  'one arm overhead press': 'intermediate',
  'one-arm overhead press': 'intermediate',
  'landmine press': 'intermediate',
  
  // Complex row variations
  'meadows row': 'advanced',
  't-bar row': 'intermediate',
  't bar row': 'intermediate',
  
  // Complex curl/extension variations
  'incline curl': 'intermediate',
  'preacher curl': 'intermediate',
  'spider curl': 'advanced',
  'overhead tricep extension': 'intermediate',
  'overhead triceps extension': 'intermediate',
  'skull crusher': 'intermediate',
  'jm press': 'advanced',
  
  // Bodyweight progressions
  'muscle up': 'advanced',
  'muscle-up': 'advanced',
  'handstand pushup': 'advanced',
  'handstand push-up': 'advanced',
  'plyometric pushup': 'advanced',
  'clapping pushup': 'advanced',
  
  // Complex core
  'dragon flag': 'advanced',
  'ab wheel rollout': 'intermediate',
  'copenhagen plank': 'intermediate',
};

/**
 * Default complexity by canonical family
 * Used when exercise doesn't have a specific override
 */
const DEFAULT_FAMILY_COMPLEXITY: Record<string, ExerciseComplexity> = {
  'flat_press': 'foundational',
  'incline_press': 'intermediate',
  'dip_press': 'foundational',
  'pushup_press': 'foundational',
  'vertical_press': 'foundational',
  'row_supported': 'foundational',
  'row_free': 'intermediate',
  'vertical_pull_default': 'foundational',
  'vertical_pull_progression': 'intermediate',
  'squat_pattern': 'foundational',
  'hinge_pattern': 'foundational',
  'single_leg_pattern': 'foundational',  // Most single leg exercises are foundational (lunges, step-ups)
  'hip_thrust_pattern': 'foundational',
  'leg_curl_pattern': 'foundational',
  'leg_extension_pattern': 'foundational',
  'calf_raise_pattern': 'foundational',
  'chest_fly_pattern': 'foundational',
  'lateral_raise_pattern': 'foundational',
  'rear_delt_pattern': 'foundational',
  'bicep_curl_pattern': 'foundational',
  'tricep_extension_pattern': 'foundational',
  'core_bracing_pattern': 'foundational',
  'conditioning_pattern': 'foundational',
};

const COACH_CATALOG: CoachCatalogDefinition[] = [
  {
    canonicalFamily: 'flat_press',
    movementRole: 'horizontal_push',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy', 'strength_anchor'],
    aliases: ['barbell bench press', 'dumbbell bench press', 'machine chest press', 'chest press'],
  },
  {
    canonicalFamily: 'incline_press',
    movementRole: 'horizontal_push',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'intermediate',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['incline dumbbell press', 'incline bench press', 'incline barbell bench press'],
  },
  {
    canonicalFamily: 'dip_press',
    movementRole: 'horizontal_push',
    equipmentTier: 'bodyweight_basic',
    status: 'approved_alternate',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy', 'bodyweight_progression'],
    aliases: ['dip', 'parallel bar dip', 'weighted dip'],
  },
  {
    canonicalFamily: 'pushup_press',
    movementRole: 'horizontal_push',
    equipmentTier: 'bodyweight_basic',
    status: 'approved_alternate',
    complexity: 'foundational',
    allowedUsage: ['general', 'limited_equipment'],
    aliases: ['push up', 'push-up', 'pushup'],
  },
  {
    canonicalFamily: 'vertical_press',
    movementRole: 'vertical_push',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy', 'strength_anchor'],
    aliases: ['barbell overhead press', 'overhead press', 'dumbbell shoulder press', 'machine shoulder press', 'shoulder press'],
  },
  {
    canonicalFamily: 'row_supported',
    movementRole: 'horizontal_pull',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['chest supported row', 'seated cable row', 'machine row', 't bar row', 't-bar row'],
  },
  {
    canonicalFamily: 'row_free',
    movementRole: 'horizontal_pull',
    equipmentTier: 'full_gym_basic',
    status: 'approved_alternate',
    complexity: 'intermediate',
    allowedUsage: ['general', 'hypertrophy', 'strength_anchor'],
    aliases: ['one arm dumbbell row', 'one-arm dumbbell row', 'barbell row'],
  },
  {
    canonicalFamily: 'vertical_pull_default',
    movementRole: 'vertical_pull',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['lat pulldown', 'neutral grip pulldown', 'close grip lat pulldown'],
  },
  {
    canonicalFamily: 'vertical_pull_default',
    movementRole: 'vertical_pull',
    equipmentTier: 'bodyweight_basic',
    status: 'approved_alternate',
    complexity: 'foundational',
    allowedUsage: ['general', 'limited_equipment', 'bodyweight_progression'],
    aliases: ['pull up', 'pull-up', 'chin up', 'chin-up', 'chinup'],
  },
  {
    canonicalFamily: 'vertical_pull_progression',
    movementRole: 'vertical_pull',
    equipmentTier: 'full_gym_basic',
    status: 'approved_progression',
    complexity: 'intermediate',
    allowedUsage: ['vertical_pull_progression'],
    aliases: ['assisted pull up', 'assisted pull-up', 'weighted pull up', 'weighted pull-up'],
  },
  {
    canonicalFamily: 'squat_pattern',
    movementRole: 'compound_squat',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy', 'strength_anchor'],
    aliases: ['back squat', 'front squat', 'hack squat', 'leg press', 'goblet squat', 'smith squat'],
  },
  {
    canonicalFamily: 'hinge_pattern',
    movementRole: 'compound_hinge',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy', 'strength_anchor'],
    aliases: ['romanian deadlift', 'rdl', 'trap bar deadlift', 'deadlift'],
  },
  {
    canonicalFamily: 'single_leg_pattern',
    movementRole: 'single_leg',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'intermediate',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['bulgarian split squat', 'split squat', 'reverse lunge', 'walking lunge', 'step up', 'step-up'],
  },
  {
    canonicalFamily: 'hip_thrust_pattern',
    movementRole: 'hip_thrust',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['hip thrust', 'glute bridge', 'machine hip thrust', 'smith hip thrust'],
  },
  {
    canonicalFamily: 'leg_curl_pattern',
    movementRole: 'leg_curl',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['seated leg curl', 'lying leg curl', 'leg curl'],
  },
  {
    canonicalFamily: 'leg_extension_pattern',
    movementRole: 'leg_extension',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['leg extension'],
  },
  {
    canonicalFamily: 'calf_raise_pattern',
    movementRole: 'calf',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['standing calf raise', 'seated calf raise', 'leg press calf raise'],
  },
  {
    canonicalFamily: 'chest_fly_pattern',
    movementRole: 'chest_fly',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['cable fly', 'cable flye', 'pec deck', 'dumbbell flye', 'cable crossover'],
  },
  {
    canonicalFamily: 'lateral_raise_pattern',
    movementRole: 'shoulder_raise',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['dumbbell lateral raise', 'cable lateral raise', 'machine lateral raise', 'lateral raise'],
  },
  {
    canonicalFamily: 'rear_delt_pattern',
    movementRole: 'rear_delt',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['rear delt cable fly', 'rear delt fly', 'reverse pec deck', 'face pull', 'reverse flye', 'reverse fly'],
  },
  {
    canonicalFamily: 'bicep_curl_pattern',
    movementRole: 'bicep_curl',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['dumbbell curl', 'hammer curl', 'ez bar curl', 'cable curl', 'preacher curl', 'incline curl'],
  },
  {
    canonicalFamily: 'tricep_extension_pattern',
    movementRole: 'tricep_ext',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy'],
    aliases: ['cable pushdown', 'tricep pushdown', 'rope pushdown', 'overhead tricep extension', 'overhead triceps extension', 'overhead rope extension'],
  },
  {
    canonicalFamily: 'core_bracing_pattern',
    movementRole: 'core',
    equipmentTier: 'full_gym_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy', 'limited_equipment'],
    aliases: ['plank', 'cable crunch', 'hanging leg raise', 'pallof press', 'dead bug', 'side plank'],
  },
  {
    canonicalFamily: 'conditioning_pattern',
    movementRole: 'conditioning',
    equipmentTier: 'conditioning_basic',
    status: 'approved_default',
    complexity: 'foundational',
    allowedUsage: ['general', 'hypertrophy', 'limited_equipment'],
    aliases: ['farmer carry', 'sled push', 'air bike', 'assault bike', 'rower', 'jump rope'],
  },
];

function normalizedName(exercise: ProgramExercise) {
  return normalizeWorkoutToken(exercise.name || '');
}

function matchesAlias(name: string, aliases: string[]) {
  return aliases.some((alias) => name.includes(normalizeWorkoutToken(alias)));
}

function matchesDisallowedPattern(name: string) {
  return DISALLOWED_PATTERNS.some((pattern) => name.includes(normalizeWorkoutToken(pattern)));
}

/**
 * Determine exercise complexity based on specific name overrides or family default
 */
function determineComplexity(exerciseName: string, canonicalFamily: string): ExerciseComplexity {
  const normalized = normalizeWorkoutToken(exerciseName);
  
  // Check for specific exercise name overrides first
  for (const [pattern, complexity] of Object.entries(EXERCISE_COMPLEXITY_OVERRIDES)) {
    if (normalized.includes(normalizeWorkoutToken(pattern))) {
      return complexity;
    }
  }
  
  // Fall back to family default
  return DEFAULT_FAMILY_COMPLEXITY[canonicalFamily] || 'intermediate';
}

/**
 * Check if an exercise should be allowed for a given experience level
 * based on complexity classification
 */
export function isExerciseAllowedForExperience(
  complexity: ExerciseComplexity,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  equipmentAccess?: string,
): boolean {
  // Advanced users can do any exercise
  if (experienceLevel === 'advanced') return true;
  
  // Intermediate users can do foundational and intermediate
  if (experienceLevel === 'intermediate') {
    return complexity === 'foundational' || complexity === 'intermediate';
  }
  
  // Beginners: foundational only by default
  // Exception: intermediate allowed if limited equipment and no foundational alternative
  if (experienceLevel === 'beginner') {
    if (complexity === 'foundational') return true;
    
    // Intermediate complexity exercises are allowed for beginners only with limited equipment
    // (where foundational alternatives may not exist)
    if (complexity === 'intermediate') {
      const limitedEquipment = ['dumbbells_only', 'dumbbells_plus_bench', 'bodyweight_only'].includes(
        normalizeWorkoutToken(equipmentAccess || '')
      );
      return limitedEquipment;
    }
    
    // Advanced exercises never allowed for beginners
    return false;
  }
  
  return false;
}

/**
 * Check if an exercise involves smith machine based on name
 */
export function isSmithMachineExercise(exerciseName: string): boolean {
  const normalized = normalizeWorkoutToken(exerciseName);
  return normalized.includes('smith') || normalized.includes('machine') && normalized.includes('hack');
}

/**
 * Get complexity level for an exercise
 */
export function getExerciseComplexity(
  exercise: ProgramExercise,
): { complexity: ExerciseComplexity; source: 'override' | 'family' } {
  const name = normalizedName(exercise);
  const matched = COACH_CATALOG
    .filter((entry) => matchesAlias(name, entry.aliases))
    .sort((left, right) => {
      const leftLongest = Math.max(...left.aliases.map((alias) => alias.length));
      const rightLongest = Math.max(...right.aliases.map((alias) => alias.length));
      return rightLongest - leftLongest;
    })[0];
  
  if (!matched) {
    return { complexity: 'intermediate', source: 'family' };
  }
  
  const complexity = determineComplexity(name, matched.canonicalFamily);
  
  // Determine if this came from an override
  const normalized = normalizeWorkoutToken(exercise.name || '');
  let source: 'override' | 'family' = 'family';
  
  for (const pattern of Object.keys(EXERCISE_COMPLEXITY_OVERRIDES)) {
    if (normalized.includes(normalizeWorkoutToken(pattern))) {
      source = 'override';
      break;
    }
  }
  
  return { complexity, source };
}

export function resolveCoachExerciseCatalogEntry(
  exercise: ProgramExercise,
): CoachExerciseCatalogMatch {
  const name = normalizedName(exercise);
  const reasons: string[] = [];

  if (!name) {
    return {
      catalogVersion: COACH_EXERCISE_CATALOG_VERSION,
      canonicalFamily: 'unclassified',
      movementRole: 'unknown',
      equipmentTier: 'specialty',
      status: 'disallowed',
      complexity: 'advanced',
      allowedUsage: [],
      reasons: ['missing_name'],
    };
  }

  if (matchesDisallowedPattern(name)) {
    return {
      catalogVersion: COACH_EXERCISE_CATALOG_VERSION,
      canonicalFamily: 'disallowed_variant',
      movementRole: 'unknown',
      equipmentTier: 'specialty',
      status: 'disallowed',
      complexity: 'advanced',
      allowedUsage: [],
      reasons: ['disallowed_variant'],
    };
  }

  const matched = COACH_CATALOG
    .filter((entry) => matchesAlias(name, entry.aliases))
    .sort((left, right) => {
      const leftLongest = Math.max(...left.aliases.map((alias) => alias.length));
      const rightLongest = Math.max(...right.aliases.map((alias) => alias.length));
      return rightLongest - leftLongest;
    })[0];

  if (!matched) {
    return {
      catalogVersion: COACH_EXERCISE_CATALOG_VERSION,
      canonicalFamily: 'unclassified',
      movementRole: 'unknown',
      equipmentTier: 'specialty',
      status: 'disallowed',
      complexity: 'advanced',
      allowedUsage: [],
      reasons: ['not_in_curated_catalog'],
    };
  }

  reasons.push(matched.status);
  
  // Determine complexity based on specific exercise name
  const complexity = determineComplexity(exercise.name || '', matched.canonicalFamily);

  return {
    catalogVersion: COACH_EXERCISE_CATALOG_VERSION,
    canonicalFamily: matched.canonicalFamily,
    movementRole: matched.movementRole,
    equipmentTier: matched.equipmentTier,
    status: matched.status,
    complexity,
    allowedUsage: matched.allowedUsage,
    reasons,
  };
}
