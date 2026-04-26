import { normalizeWorkoutToken, type ProgramExercise } from './programMappingRules.ts';

// ---------------------------------------------------------------------------
// PatternSlot — canonical movement categories used by the slot-based selector
// Maps directly from the DB `pattern` field and name-based inference.
// `unknown` = stretch/mobility/reference junk — excluded from slot filling.
// ---------------------------------------------------------------------------
export type PatternSlot =
  | 'compound_squat'   // Back squat, front squat, leg press, goblet squat, hack squat
  | 'compound_hinge'   // Deadlift, RDL, good morning, Romanian deadlift
  | 'single_leg'       // Bulgarian split squat, lunge, step up, single-leg RDL
  | 'hip_thrust'       // Hip thrust, glute bridge (barbell or machine)
  | 'leg_extension'    // Leg extension, terminal knee extension
  | 'leg_curl'         // Seated/lying leg curl, Nordic curl, hamstring curl
  | 'calf'             // Calf raise (standing, seated, machine)
  | 'horizontal_push'  // Bench press, DB press, push-up, dip
  | 'vertical_push'    // Overhead press, Arnold press, push press, Z-press
  | 'horizontal_pull'  // Barbell row, DB row, cable row, machine row, seal row
  | 'vertical_pull'    // Lat pulldown, pull-up, chin-up, neutral-grip pulldown
  | 'chest_fly'        // Cable flye, DB flye, pec deck, cable crossover
  | 'shoulder_raise'   // Lateral raise, front raise, upright row, cable raise
  | 'rear_delt'        // Face pull, rear delt flye, reverse pec deck
  | 'bicep_curl'       // All curl variations
  | 'tricep_ext'       // Pushdown, skull crusher, overhead extension, dip (isolation)
  | 'core'             // Plank, crunch, leg raise, ab wheel, Pallof press, dead bug
  | 'conditioning'     // Carries, sled, circuits, cardio intervals
  | 'unknown';         // Stretches, mobility, reference movements — excluded from slots

export type ExerciseClassification = {
  isCommon: boolean;
  isCompound: boolean;
  movementPatternGroup: string;
  equipmentTier: 'common_gym' | 'home' | 'bodyweight' | 'specialty';
  patternSlot: PatternSlot;
};

// ---------------------------------------------------------------------------
// DB pattern → PatternSlot mapping
// Based on the actual pattern values observed in the exercises table.
// ---------------------------------------------------------------------------
const DB_PATTERN_TO_SLOT: Record<string, PatternSlot> = {
  // Lower body — primary patterns
  squat: 'compound_squat',
  hinge: 'compound_hinge',
  unilateral_lower: 'single_leg',
  glute_isolation: 'hip_thrust',
  knee_isolation: 'leg_extension',
  ham_isolation: 'leg_curl',
  calves: 'calf',
  hip_flexion: 'core', // leg raise variations

  // Upper body — push
  horizontal_push: 'horizontal_push',
  vertical_push: 'vertical_push',
  chest_isolation: 'chest_fly',

  // Upper body — pull
  horizontal_pull: 'horizontal_pull',
  vertical_pull: 'vertical_pull',
  rear_delt_isolation: 'rear_delt',

  // Shoulder accessories
  shoulder_accessory: 'shoulder_raise', // includes lateral/front raise AND some rear delt
  lateral_raise: 'shoulder_raise',
  front_raise: 'shoulder_raise',
  shrug: 'shoulder_raise',

  // Arms
  biceps: 'bicep_curl',
  triceps: 'tricep_ext',

  // Core
  spinal_flexion: 'core',
  rotation: 'core',
  anti_extension: 'core',
  anti_rotation: 'core',
  core_other: 'core',

  // Conditioning
  cardio: 'conditioning',
  conditioning: 'conditioning',
  grip_carry: 'conditioning',

  // Junk — explicitly excluded
  reference_movement: 'unknown',
};

// ---------------------------------------------------------------------------
// Name-based pattern slot inference (fallback when DB pattern doesn't map)
// Ordered from most specific to most general.
// ---------------------------------------------------------------------------
const NAME_SLOT_RULES: Array<{ patterns: string[]; slot: PatternSlot }> = [
  // Compound lower
  { patterns: ['back squat', 'front squat', 'goblet squat', 'hack squat', 'leg press', 'pendulum squat', 'belt squat', 'smith squat', 'box squat'], slot: 'compound_squat' },
  { patterns: ['deadlift', 'rdl', 'romanian deadlift', 'stiff leg', 'good morning', 'trap bar'], slot: 'compound_hinge' },
  { patterns: ['bulgarian', 'split squat', 'walking lunge', 'reverse lunge', 'forward lunge', 'step up', 'step-up', 'single leg squat', 'pistol squat', 'single leg rdl'], slot: 'single_leg' },
  { patterns: ['hip thrust', 'glute bridge', 'frog pump'], slot: 'hip_thrust' },
  { patterns: ['leg extension', 'terminal knee'], slot: 'leg_extension' },
  { patterns: ['leg curl', 'nordic curl', 'hamstring curl', 'lying curl', 'seated curl'], slot: 'leg_curl' },
  { patterns: ['calf raise', 'standing calf', 'seated calf', 'donkey calf'], slot: 'calf' },

  // Upper push
  { patterns: ['bench press', 'chest press', 'db press', 'dumbbell press', 'push up', 'push-up', 'dip'], slot: 'horizontal_push' },
  { patterns: ['overhead press', 'shoulder press', 'military press', 'arnold press', 'push press', 'z press', 'landmine press'], slot: 'vertical_push' },

  // Upper pull
  { patterns: ['barbell row', 'bent over row', 'pendlay row', 'dumbbell row', 'db row', 'one arm row', 't bar row', 'seal row', 'cable row', 'seated row', 'machine row', 'chest supported row', 'meadows row', 'kroc row'], slot: 'horizontal_pull' },
  { patterns: ['lat pulldown', 'pull up', 'pullup', 'pull-up', 'chin up', 'chinup', 'chin-up', 'pulldown', 'assisted pull'], slot: 'vertical_pull' },
  { patterns: ['face pull', 'rear delt', 'reverse flye', 'reverse fly', 'prone y raise', 'w raise'], slot: 'rear_delt' },

  // Chest accessories after rear-delt matching so "Rear Delt Fly" does not get
  // misclassified as a chest fly.
  { patterns: ['flye', 'fly', 'pec deck', 'cable crossover', 'chest cable', 'cable flye'], slot: 'chest_fly' },

  // Shoulder
  { patterns: ['lateral raise', 'side raise', 'front raise', 'upright row', 'cable raise', 'plate raise'], slot: 'shoulder_raise' },

  // Arms
  { patterns: ['barbell curl', 'dumbbell curl', 'ez bar curl', 'hammer curl', 'preacher curl', 'concentration curl', 'cable curl', 'incline curl', 'spider curl', 'zottman curl'], slot: 'bicep_curl' },
  { patterns: ['pushdown', 'tricep extension', 'skull crusher', 'close grip bench', 'overhead extension', 'rope extension', 'cable extension', 'lying extension'], slot: 'tricep_ext' },

  // Core
  { patterns: ['plank', 'dead bug', 'bird dog', 'hollow body', 'pallof press', 'ab wheel', 'rollout', 'hanging leg raise', 'leg raise', 'crunch', 'sit up', 'russian twist', 'side plank', 'cable crunch', 'decline crunch'], slot: 'core' },

  // Conditioning
  { patterns: ['sled', 'farmer carry', 'farmer walk', 'battle rope', 'rower', 'air bike', 'sprint', 'jump rope'], slot: 'conditioning' },
];

// ---------------------------------------------------------------------------
// Common gym exercises (prioritized in scoring)
// ---------------------------------------------------------------------------
const COMMON_EXERCISE_PATTERNS = [
  // Chest
  'barbell bench press', 'incline barbell bench press', 'decline barbell bench press',
  'dumbbell bench press', 'incline dumbbell bench press', 'decline dumbbell bench press',
  'cable flye', 'dumbbell flye', 'pec deck', 'machine chest press', 'chest press machine',
  // Back
  'barbell row', 'bent over row', 'pendlay row', 'one arm dumbbell row',
  't bar row', 'cable row', 'seated cable row', 'lat pulldown', 'wide grip pulldown',
  'narrow grip pulldown', 'assisted pull up', 'assisted pull-up', 'face pull', 'seal row', 'machine row', 'chest supported row',
  // Shoulders
  'overhead press', 'military press', 'barbell overhead press', 'dumbbell overhead press',
  'arnold press', 'push press', 'lateral raise', 'dumbbell lateral raise',
  'cable lateral raise', 'rear delt flye', 'rear delt raise', 'upright row',
  // Legs — quads
  'back squat', 'front squat', 'goblet squat', 'leg press', 'hack squat',
  'bulgarian split squat', 'split squat', 'lunge', 'walking lunge', 'reverse lunge',
  'leg extension', 'step up',
  // Legs — hinge/hamstrings/glutes
  'deadlift', 'romanian deadlift', 'rdl', 'stiff leg deadlift', 'good morning',
  'leg curl', 'lying leg curl', 'seated leg curl', 'nordic curl',
  'hip thrust', 'barbell hip thrust', 'glute bridge', 'cable pull through',
  // Calves
  'calf raise', 'standing calf raise', 'seated calf raise',
  // Arms
  'barbell curl', 'ez bar curl', 'dumbbell curl', 'hammer curl', 'preacher curl',
  'concentration curl', 'cable curl', 'close grip bench press', 'tricep pushdown',
  'cable pushdown', 'overhead tricep extension', 'dumbbell tricep extension', 'skull crusher',
  // Core
  'plank', 'side plank', 'crunch', 'bicycle crunch', 'russian twist', 'leg raise',
  'hanging leg raise', 'ab wheel', 'pallof press', 'dead bug', 'bird dog',
];

const COMPOUND_SLOTS = new Set<PatternSlot>([
  'compound_squat',
  'compound_hinge',
  'single_leg',
  'hip_thrust',
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
]);

// ---------------------------------------------------------------------------
// inferPatternSlot — primary entry point for slot resolution
// ---------------------------------------------------------------------------
export function inferPatternSlot(exercise: ProgramExercise): PatternSlot {
  const dbPattern = (exercise.pattern || '').trim().toLowerCase();

  // 1. Direct DB pattern lookup
  if (dbPattern && DB_PATTERN_TO_SLOT[dbPattern]) {
    const mapped = DB_PATTERN_TO_SLOT[dbPattern];
    // For shoulder_accessory, try to distinguish rear_delt vs shoulder_raise by name
    if (mapped === 'shoulder_raise' && dbPattern === 'shoulder_accessory') {
      const name = normalizeWorkoutToken(exercise.name || '');
      if (
        name.includes('face pull') ||
        name.includes('rear delt') ||
        name.includes('reverse fly') ||
        name.includes('reverse flye') ||
        name.includes('prone y') ||
        name.includes('w raise')
      ) {
        return 'rear_delt';
      }
    }
    return mapped;
  }

  // 2. Name-based fallback
  const name = normalizeWorkoutToken(exercise.name || '');
  for (const rule of NAME_SLOT_RULES) {
    if (rule.patterns.some((p) => name.includes(normalizeWorkoutToken(p)))) {
      return rule.slot;
    }
  }

  // 3. Category + primary_muscle fallback
  const category = normalizeWorkoutToken(exercise.category || '');
  const muscle = normalizeWorkoutToken(exercise.primary_muscle || '');

  if (category.includes('core') || muscle === 'core') return 'core';
  if (category.includes('cardio') || muscle === 'conditioning') return 'conditioning';

  return 'unknown';
}

// ---------------------------------------------------------------------------
// inferMovementPatternGroup — used for family deduplication (unchanged)
// ---------------------------------------------------------------------------
function inferMovementPatternGroup(pattern: string, name: string): string {
  const p = normalizeWorkoutToken(pattern);
  const n = normalizeWorkoutToken(name);

  if (p.includes('horizontal push') || n.includes('bench press') || n.includes('push up')) return 'horizontal_push';
  if (p.includes('vertical push') || n.includes('overhead press') || n.includes('shoulder press')) return 'vertical_push';
  if (p.includes('horizontal pull') || n.includes('row')) return 'horizontal_pull';
  if (p.includes('vertical pull') || n.includes('pulldown') || n.includes('pull up') || n.includes('chin up')) return 'vertical_pull';
  if (p.includes('squat') || n.includes('squat') || n.includes('leg press')) return 'squat';
  if (p.includes('hinge') || n.includes('deadlift') || n.includes('rdl') || n.includes('good morning')) return 'hinge';
  if (n.includes('hip thrust') || n.includes('glute bridge')) return 'hip_thrust';
  if (n.includes('leg curl') || n.includes('hamstring curl') || n.includes('nordic')) return 'leg_curl';
  if (n.includes('leg extension')) return 'leg_extension';
  if (n.includes('lunge') || n.includes('split squat') || n.includes('step up')) return 'single_leg';
  if (n.includes('calf raise')) return 'calf';
  if (n.includes('face pull') || n.includes('rear delt') || n.includes('reverse fly')) return 'rear_delt';
  if (n.includes('flye') || n.includes('fly') || n.includes('pec deck')) return 'chest_fly';
  if (n.includes('lateral raise') || n.includes('front raise') || n.includes('upright row')) return 'shoulder_raise';
  if (n.includes('curl')) return 'bicep_curl';
  if (n.includes('pushdown') || n.includes('skull') || n.includes('tricep extension')) return 'tricep_ext';
  if (p.includes('core') || n.includes('plank') || n.includes('crunch')) return 'core';

  // DB pattern as fallback family key
  if (p && p !== 'reference movement' && p !== 'reference_movement') return p;

  return n.split(' ').slice(0, 3).join('_') || 'unknown';
}

// ---------------------------------------------------------------------------
// inferEquipmentTier
// ---------------------------------------------------------------------------
function inferEquipmentTier(equipment: string[]): 'common_gym' | 'home' | 'bodyweight' | 'specialty' {
  if (!equipment?.length) return 'bodyweight';
  const normalized = equipment.map((e) => normalizeWorkoutToken(e));
  if (normalized.some((e) => ['barbell', 'cable', 'machine', 'smith machine'].includes(e))) return 'common_gym';
  if (normalized.some((e) => ['dumbbell', 'bench', 'kettlebell'].includes(e))) return 'home';
  if (normalized.every((e) => ['bodyweight', 'none', ''].includes(e))) return 'bodyweight';
  return 'specialty';
}

// ---------------------------------------------------------------------------
// classifyExercise — public API (extended with patternSlot)
// ---------------------------------------------------------------------------
export function classifyExercise(exercise: ProgramExercise): ExerciseClassification {
  const name = normalizeWorkoutToken(exercise.name || '');
  const pattern = normalizeWorkoutToken(exercise.pattern || '');
  const patternSlot = inferPatternSlot(exercise);
  const explicitCompound = Boolean((exercise as { is_compound?: boolean }).is_compound);

  const isCommon = COMMON_EXERCISE_PATTERNS.some((p) => name.includes(normalizeWorkoutToken(p)));
  const isCompound = explicitCompound || COMPOUND_SLOTS.has(patternSlot);
  const movementPatternGroup = inferMovementPatternGroup(pattern, name);
  const equipmentTier = inferEquipmentTier(exercise.equipment_required || []);

  return { isCommon, isCompound, movementPatternGroup, equipmentTier, patternSlot };
}
