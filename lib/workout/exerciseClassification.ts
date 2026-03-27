import { normalizeWorkoutToken, type ProgramExercise } from './programMappingRules.ts';

export type ExerciseClassification = {
  isCommon: boolean;
  isCompound: boolean;
  movementPatternGroup: string;
  equipmentTier: 'common_gym' | 'home' | 'bodyweight' | 'specialty';
};

/**
 * Common gym exercises (175 exercises)
 * These are prioritized for workout generation as they're widely accessible
 */
const COMMON_EXERCISE_PATTERNS = [
  // Chest
  'barbell bench press',
  'incline barbell bench press',
  'decline barbell bench press',
  'dumbbell bench press',
  'incline dumbbell bench press',
  'decline dumbbell bench press',
  'cable flye',
  'dumbbell flye',
  'pec deck',
  'chest press machine',
  'push up',
  'dip',

  // Back
  'barbell row',
  'bent over row',
  'pendlay row',
  'dumbbell row',
  'one arm row',
  't bar row',
  'cable row',
  'seated cable row',
  'lat pulldown',
  'wide grip pulldown',
  'narrow grip pulldown',
  'pull up',
  'chin up',
  'face pull',
  'seal row',
  'inverted row',
  'machine row',

  // Shoulders
  'overhead press',
  'military press',
  'barbell overhead press',
  'dumbbell overhead press',
  'arnold press',
  'push press',
  'lateral raise',
  'dumbbell lateral raise',
  'cable lateral raise',
  'front raise',
  'rear delt flye',
  'rear delt raise',
  'upright row',
  'face pull',

  // Legs - Quads
  'back squat',
  'front squat',
  'goblet squat',
  'leg press',
  'hack squat',
  'bulgarian split squat',
  'split squat',
  'lunge',
  'walking lunge',
  'reverse lunge',
  'leg extension',
  'step up',

  // Legs - Hamstrings/Glutes
  'deadlift',
  'romanian deadlift',
  'rdl',
  'stiff leg deadlift',
  'good morning',
  'leg curl',
  'lying leg curl',
  'seated leg curl',
  'nordic curl',
  'hip thrust',
  'barbell hip thrust',
  'glute bridge',
  'cable pull through',

  // Legs - Calves
  'calf raise',
  'standing calf raise',
  'seated calf raise',

  // Arms - Biceps
  'barbell curl',
  'ez bar curl',
  'dumbbell curl',
  'hammer curl',
  'preacher curl',
  'concentration curl',
  'cable curl',

  // Arms - Triceps
  'close grip bench press',
  'tricep pushdown',
  'cable pushdown',
  'overhead tricep extension',
  'dumbbell tricep extension',
  'skull crusher',
  'dip',

  // Core
  'plank',
  'side plank',
  'crunch',
  'bicycle crunch',
  'russian twist',
  'leg raise',
  'hanging leg raise',
  'ab wheel',
  'pallof press',
  'dead bug',
  'bird dog',
];

/**
 * Keywords indicating compound (multi-joint) exercises
 */
const COMPOUND_KEYWORDS = [
  'press',
  'squat',
  'deadlift',
  'row',
  'pull up',
  'chin up',
  'dip',
  'lunge',
  'push up',
  'clean',
  'snatch',
  'jerk',
  'thruster',
];

/**
 * Movement pattern groups for exercise complementarity scoring
 */
function inferMovementPatternGroup(pattern: string, name: string): string {
  const normalizedPattern = normalizeWorkoutToken(pattern);
  const normalizedName = normalizeWorkoutToken(name);

  // Push patterns
  if (normalizedPattern.includes('horizontal push') || normalizedName.includes('bench press') || normalizedName.includes('push up')) {
    return 'horizontal_push';
  }
  if (normalizedPattern.includes('vertical push') || normalizedPattern.includes('shoulder') || normalizedName.includes('overhead press') || normalizedName.includes('shoulder press')) {
    return 'vertical_push';
  }

  // Pull patterns
  if (normalizedPattern.includes('horizontal pull') || normalizedName.includes('row')) {
    return 'horizontal_pull';
  }
  if (normalizedPattern.includes('vertical pull') || normalizedName.includes('pulldown') || normalizedName.includes('pull up') || normalizedName.includes('chin up')) {
    return 'vertical_pull';
  }

  // Lower body patterns
  if (normalizedPattern.includes('squat') || normalizedName.includes('squat') || normalizedName.includes('leg press')) {
    return 'squat';
  }
  if (normalizedPattern.includes('hinge') || normalizedName.includes('deadlift') || normalizedName.includes('rdl') || normalizedName.includes('good morning')) {
    return 'hinge';
  }

  // Accessory patterns
  if (normalizedPattern.includes('chest') && (normalizedName.includes('flye') || normalizedName.includes('cable'))) {
    return 'chest_accessory';
  }
  if (normalizedPattern.includes('back') && (normalizedName.includes('face pull') || normalizedName.includes('rear delt'))) {
    return 'back_accessory';
  }
  if (normalizedPattern.includes('bicep') || normalizedName.includes('curl')) {
    return 'biceps_accessory';
  }
  if (normalizedPattern.includes('tricep') || normalizedName.includes('pushdown') || normalizedName.includes('extension')) {
    return 'triceps_accessory';
  }
  if (normalizedPattern.includes('quad') || normalizedName.includes('leg extension')) {
    return 'quad_accessory';
  }
  if (normalizedPattern.includes('ham') || normalizedName.includes('leg curl')) {
    return 'hamstring_accessory';
  }
  if (normalizedPattern.includes('glute') || normalizedName.includes('hip thrust') || normalizedName.includes('glute bridge')) {
    return 'glute_accessory';
  }

  // Core
  if (normalizedPattern.includes('core') || normalizedName.includes('plank') || normalizedName.includes('crunch')) {
    return 'core';
  }

  // Default fallback
  return normalizedPattern || 'unknown';
}

/**
 * Infer equipment tier based on equipment requirements
 */
function inferEquipmentTier(equipment: string[]): 'common_gym' | 'home' | 'bodyweight' | 'specialty' {
  if (!equipment || equipment.length === 0) {
    return 'bodyweight';
  }

  const normalized = equipment.map(e => normalizeWorkoutToken(e));

  // Common gym equipment
  if (normalized.some(e => ['barbell', 'cable', 'machine', 'smith machine'].includes(e))) {
    return 'common_gym';
  }

  // Home equipment
  if (normalized.some(e => ['dumbbell', 'bench', 'kettlebell'].includes(e))) {
    return 'home';
  }

  // Bodyweight
  if (normalized.every(e => ['bodyweight', 'none', ''].includes(e))) {
    return 'bodyweight';
  }

  // Specialty (bands, TRX, etc.)
  return 'specialty';
}

/**
 * Classify an exercise for optimization scoring
 */
export function classifyExercise(exercise: ProgramExercise): ExerciseClassification {
  const name = normalizeWorkoutToken(exercise.name || '');
  const category = normalizeWorkoutToken(exercise.category || '');
  const pattern = normalizeWorkoutToken(exercise.pattern || '');

  // Common exercise detection
  const isCommon = COMMON_EXERCISE_PATTERNS.some(commonPattern => {
    const normalized = normalizeWorkoutToken(commonPattern);
    return name.includes(normalized);
  });

  // Compound detection
  const isCompound = category.includes('compound') ||
    COMPOUND_KEYWORDS.some(keyword => name.includes(keyword));

  // Movement pattern grouping
  const movementPatternGroup = inferMovementPatternGroup(pattern, name);

  // Equipment tier
  const equipment = exercise.equipment_required || [];
  const equipmentTier = inferEquipmentTier(equipment);

  return {
    isCommon,
    isCompound,
    movementPatternGroup,
    equipmentTier,
  };
}
