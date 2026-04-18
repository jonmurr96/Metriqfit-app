/**
 * injury-substitutions.ts
 *
 * Injury-Aware Exercise Substitution System for Sprint 3
 * 
 * Replaces exercises that conflict with user injuries with appropriate
 * alternatives that target the same muscle groups but avoid aggravating
 * the injured area.
 * 
 * Design principles:
 * 1. Maintain training stimulus (same muscle group, similar movement pattern)
 * 2. Reduce joint stress on injured area
 * 3. Prefer machines/isolation over free weights when appropriate
 * 4. Keep exercise complexity appropriate for experience level
 */

import type { ProgramExercise } from './programMappingRules.ts';
import type { ExercisePoolFilter, PoolExercise } from './exercise-pool.ts';
import { buildExerciseMetadata, scoreExerciseForSelection, type ExercisePriorityContext } from './exercise-priority.ts';

// ---------------------------------------------------------------------------
// Injury Types and Severity
// ---------------------------------------------------------------------------

export type InjuryType = 
  | 'knees' 
  | 'back' 
  | 'shoulders' 
  | 'wrists' 
  | 'ankles' 
  | 'hips' 
  | 'elbows' 
  | 'neck';

export type InjurySeverity = 'mild' | 'moderate' | 'severe';

export type UserInjury = {
  type: InjuryType;
  severity: InjurySeverity;
  affectedSide?: 'left' | 'right' | 'both';
  notes?: string;
};

// ---------------------------------------------------------------------------
// Exercise Conflict Detection
// ---------------------------------------------------------------------------

/**
 * Keywords that indicate an exercise conflicts with a specific injury
 */
export const INJURY_CONFLICT_KEYWORDS: Record<InjuryType, string[]> = {
  knees: [
    'sissy squat', 'nordic hamstring', 'plyometric', 'box jump', 'jump squat',
    'lunging', 'walking lunge', 'reverse lunge', 'forward lunge', ' Bulgarian split squat',
    'pistol squat', 'shrimp squat', 'step up', 'high step', 'deep knee',
    'jumping', 'bounds', 'tuck jump', 'depth jump',
  ],
  back: [
    'good morning', 'stiff leg deadlift', 'romanian deadlift', 'russian deadlift',
    'bent over row', 'pendlay row', 'barbell row', 't-bar row', 'seal row',
    'deadlift', 'rack pull', 'block pull', 'deficit deadlift', 'sumo deadlift',
    'snatch', 'clean', 'jerk', 'clean and jerk', 'power clean', 'hang clean',
    'kettlebell swing', 'american swing', 'russian swing',
    'superman', 'back extension', 'reverse hyper',
    ' Jefferson curl', 'good morning',
  ],
  shoulders: [
    'overhead press', 'barbell overhead', 'dumbbell overhead press', 'military press',
    'push press', 'jerk', 'split jerk', 'push jerk',
    'upright row', 'wide upright row', 'cable upright row',
    'behind neck press', 'behind the neck', 'behind neck pull',
    'skull crusher', 'lying tricep extension', 'french press',
    'arnold press', 'kneeling landmine press',
    'muscle up', 'kipping pull up', 'butterfly pull up',
    'dips', 'bench dip', 'tricep dip', 'parallel bar dip',
  ],
  wrists: [
    'barbell curl', 'ez bar curl', 'straight bar curl',
    'skull crusher', 'lying tricep extension', 'french press',
    'close grip bench', 'close grip bench press',
    'front squat', 'cross arm front squat', 'clean grip front squat',
    'wrist curl', 'reverse wrist curl', 'wrist roller',
  ],
  ankles: [
    'box jump', 'jump squat', 'plyometric', 'depth jump', 'bounds',
    'single leg calf raise', 'standing calf raise single',
    'pistol squat', 'shrimp squat',
    'sled push', 'sprint', 'hill sprint',
  ],
  hips: [
    'deep squat', 'ass to grass', 'atg squat',
    'sumo deadlift', 'sumo squat', 'wide stance squat',
    'pistol squat', 'shrimp squat', 'cossack squat',
    'frog stretch', 'pancake stretch',
    'kettlebell swing', 'hip thruster', 'hip thrust',
    'glute bridge', 'single leg glute bridge',
  ],
  elbows: [
    'skull crusher', 'lying tricep extension', 'french press',
    'close grip bench', 'close grip bench press',
    'preacher curl', 'spider curl', 'concentration curl',
    'overhead tricep extension', 'cable overhead extension',
    'tricep kickback', 'cable kickback',
  ],
  neck: [
    'upright row', 'wide upright row', 'cable upright row',
    'behind neck press', 'behind the neck', 'behind neck pull',
    'neck curl', 'neck extension', 'neck harness',
    'bridges', 'wrestler bridge', 'front bridge',
  ],
};

/**
 * Movement patterns that are generally safe for specific injuries
 * (can be used as substitution criteria)
 */
export const INJURY_SAFE_PATTERNS: Record<InjuryType, string[]> = {
  knees: [
    'leg_press', 'hack_squat', 'smith_squat', 'machine_squat',
    'leg_extension', 'lying_leg_curl', 'seated_leg_curl',
    'calf_raise', 'seated_calf_raise', 'standing_calf_raise',
    'hip_thrust', 'glute_bridge', 'glute_kickback', 'donkey_kick',
    'cable_pull_through', 'romanian_deadlift_light',
  ],
  back: [
    'leg_press', 'hack_squat', 'machine_squat', 'smith_squat',
    'lat_pulldown', 'cable_row', 'machine_row', 'chest_supported_row',
    'leg_extension', 'leg_curl', 'calf_raise',
    'pec_deck', 'chest_press_machine', 'shoulder_press_machine',
    'lateral_raise_machine', 'cable_lateral_raise',
  ],
  shoulders: [
    'chest_press', 'machine_press', 'smith_press', 'incline_press',
    'cable_fly', 'pec_deck', 'cable_crossover',
    'lat_pulldown', 'machine_row', 'cable_row',
    'leg_press', 'leg_extension', 'leg_curl',
    'bicep_curl', 'preacher_curl', 'concentration_curl',
    'tricep_pushdown', 'rope_pushdown', 'cable_kickback',
  ],
  wrists: [
    'dumbbell_curl', 'hammer_curl', 'incline_curl', 'spider_curl',
    'tricep_pushdown', 'rope_pushdown', 'v_bar_pushdown',
    'cable_fly', 'pec_deck', 'machine_press',
    'leg_press', 'leg_extension', 'leg_curl',
    'all_lower_body_exercises',
  ],
  ankles: [
    'leg_press', 'hack_squat', 'smith_squat', 'machine_squat',
    'leg_extension', 'leg_curl', 'seated_calf_raise',
    'hip_thrust', 'glute_bridge', 'cable_pull_through',
    'upper_body_all',
  ],
  hips: [
    'leg_press', 'hack_squat', 'smith_squat',
    'leg_extension', 'leg_curl', 'calf_raise',
    'chest_press', 'machine_press', 'dumbbell_press',
    'lat_pulldown', 'cable_row', 'machine_row',
    'shoulder_press_machine', 'lateral_raise',
    'bicep_curl', 'tricep_pushdown',
  ],
  elbows: [
    'cable_curl', 'machine_curl', 'concentration_curl',
    'tricep_pushdown', 'rope_pushdown', 'machine_dip',
    'all_pressing_exercises', 'all_lower_body',
  ],
  neck: [
    'all_exercises_except_upright_row', 'all_exercises_except_behind_neck',
  ],
};

// ---------------------------------------------------------------------------
// Substitution Rules
// ---------------------------------------------------------------------------

export type SubstitutionRule = {
  /** Pattern or exercise name to match */
  match: string | RegExp;
  /** Injury types this rule applies to */
  forInjuries: InjuryType[];
  /** Suggested replacement exercise names (in priority order) */
  replacements: string[];
  /** Reason for substitution */
  reason: string;
  /** Priority (higher = applied first) */
  priority: number;
};

/**
 * Curated substitution rules for common exercise/injury conflicts
 */
export const SUBSTITUTION_RULES: SubstitutionRule[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // KNEE INJURY SUBSTITUTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    match: /barbell squat|back squat/i,
    forInjuries: ['knees'],
    replacements: ['Leg Press', 'Hack Squat', 'Smith Machine Squat', 'Leg Extension'],
    reason: 'Barbell squat loads the knees heavily. Machine alternatives provide similar quad stimulus with more controlled movement.',
    priority: 100,
  },
  {
    match: /lunge|split squat/i,
    forInjuries: ['knees'],
    replacements: ['Leg Press', 'Hack Squat', 'Bulgarian Split Squat (shallow)', 'Step Up (low height)'],
    reason: 'Lunges create high shear forces on the knee. Fixed-path machines reduce this stress.',
    priority: 90,
  },
  {
    match: /sissy squat/i,
    forInjuries: ['knees'],
    replacements: ['Leg Extension', 'Terminal Knee Extension', 'Leg Press (feet high and wide)'],
    reason: 'Sissy squats place extreme stress on the patellar tendon. Leg extensions provide isolated quad work safely.',
    priority: 100,
  },
  {
    match: /jump|plyometric|box jump/i,
    forInjuries: ['knees'],
    replacements: ['Stationary Bike', 'Elliptical', 'Swimming', 'Upper Body Cardio'],
    reason: 'Impact exercises aggravate knee injuries. Use non-impact cardio alternatives.',
    priority: 100,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BACK INJURY SUBSTITUTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    match: /deadlift|romanian deadlift|stiff leg/i,
    forInjuries: ['back'],
    replacements: ['Leg Press', 'Hack Squat', 'Smith Machine Squat', 'Glute-Ham Raise'],
    reason: 'Deadlifts load the lower back heavily. Leg press and machines target legs without spinal loading.',
    priority: 100,
  },
  {
    match: /bent over row|pendlay row|barbell row/i,
    forInjuries: ['back'],
    replacements: ['Chest Supported Row', 'Machine Row', 'Seated Cable Row', 'Single Arm Dumbbell Row (supported)'],
    reason: 'Free-weight rows load the lower back in flexion. Chest-supported alternatives remove this stress.',
    priority: 100,
  },
  {
    match: /t-bar row/i,
    forInjuries: ['back'],
    replacements: ['Chest Supported Row', 'Machine Row', 'Seated Cable Row'],
    reason: 'T-bar rows load the spine. Machine alternatives provide back training without spinal compression.',
    priority: 90,
  },
  {
    match: /good morning/i,
    forInjuries: ['back'],
    replacements: ['Glute-Ham Raise', 'Back Extension (light)', 'Reverse Hyperextension'],
    reason: 'Good mornings place extreme stress on the lower back. Use targeted hamstring/glute exercises instead.',
    priority: 100,
  },
  {
    match: /kettlebell swing|american swing/i,
    forInjuries: ['back'],
    replacements: ['Glute Bridge', 'Hip Thrust', 'Cable Pull Through', 'Leg Curl'],
    reason: 'Kettlebell swings require significant lower back stabilization. Use hip-focused alternatives.',
    priority: 90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOULDER INJURY SUBSTITUTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    match: /overhead press|military press|push press/i,
    forInjuries: ['shoulders'],
    replacements: ['Machine Shoulder Press', 'Landmine Press', 'Cable Lateral Raise', 'Machine Lateral Raise'],
    reason: 'Free-weight overhead pressing can aggravate shoulder impingement. Machines provide fixed path and support.',
    priority: 100,
  },
  {
    match: /upright row/i,
    forInjuries: ['shoulders', 'neck'],
    replacements: ['Lateral Raise', 'Cable Lateral Raise', 'Machine Lateral Raise'],
    reason: 'Upright rows force internal rotation and impingement. Lateral raises target same muscles safely.',
    priority: 100,
  },
  {
    match: /dip|bench dip/i,
    forInjuries: ['shoulders'],
    replacements: ['Close Grip Bench Press', 'Tricep Pushdown', 'Cable Crossover', 'Pec Deck'],
    reason: 'Dips place shoulders in extreme extension. Use pressing alternatives for chest/triceps.',
    priority: 90,
  },
  {
    match: /arnold press/i,
    forInjuries: ['shoulders'],
    replacements: ['Neutral Grip Dumbbell Press', 'Machine Shoulder Press', 'Landmine Press'],
    reason: 'Arnold press combines rotation with pressing. Neutral grip reduces rotator cuff stress.',
    priority: 90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WRIST INJURY SUBSTITUTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    match: /barbell curl|ez bar curl/i,
    forInjuries: ['wrists'],
    replacements: ['Dumbbell Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl'],
    reason: 'Straight and EZ bars force fixed wrist position. Dumbbells allow natural wrist alignment.',
    priority: 100,
  },
  {
    match: /front squat/i,
    forInjuries: ['wrists'],
    replacements: ['Back Squat', 'Safety Bar Squat', 'Leg Press', 'Hack Squat'],
    reason: 'Front squats require significant wrist extension. Use alternatives that don\'t load the wrists.',
    priority: 100,
  },
  {
    match: /skull crusher|french press/i,
    forInjuries: ['wrists', 'elbows'],
    replacements: ['Tricep Pushdown', 'Rope Pushdown', 'Overhead Cable Extension', 'Close Grip Bench'],
    reason: 'Lying extensions load wrists in extension. Cable pushdowns are more joint-friendly.',
    priority: 90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ELBOW INJURY SUBSTITUTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    match: /preacher curl|spider curl/i,
    forInjuries: ['elbows'],
    replacements: ['Cable Curl', 'Machine Curl', 'Concentration Curl'],
    reason: 'Preacher curls place high stress on the distal biceps tendon. Use cable or machine alternatives.',
    priority: 90,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANKLE INJURY SUBSTITUTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    match: /single leg calf raise|standing calf raise/i,
    forInjuries: ['ankles'],
    replacements: ['Seated Calf Raise', 'Leg Press Calf Raise', 'Machine Calf Raise'],
    reason: 'Standing calf raises require ankle stability. Seated alternatives remove balance demands.',
    priority: 90,
  },
  {
    match: /box jump|jump/i,
    forInjuries: ['ankles'],
    replacements: ['Stationary Bike', 'Elliptical', 'Rowing Machine', 'Upper Body Circuit'],
    reason: 'Jumping requires ankle stiffness and stability. Use non-impact cardio alternatives.',
    priority: 100,
  },
];

// ---------------------------------------------------------------------------
// Conflict Detection Functions
// ---------------------------------------------------------------------------

/**
 * Check if an exercise conflicts with a specific injury
 */
export function exerciseConflictsWithInjury(
  exercise: ProgramExercise,
  injury: InjuryType
): boolean {
  const name = (exercise.name || '').toLowerCase();
  const keywords = INJURY_CONFLICT_KEYWORDS[injury] || [];
  
  return keywords.some((keyword) => name.includes(keyword.toLowerCase()));
}

/**
 * Check if an exercise is safe for all listed injuries
 */
export function isExerciseSafeForInjuries(
  exercise: ProgramExercise,
  injuries: InjuryType[]
): boolean {
  return !injuries.some((injury) => exerciseConflictsWithInjury(exercise, injury));
}

/**
 * Get all conflicts for an exercise against a list of injuries
 */
export function getExerciseConflicts(
  exercise: ProgramExercise,
  injuries: InjuryType[]
): { hasConflict: boolean; conflictingInjuries: InjuryType[]; reasons: string[] } {
  const conflictingInjuries: InjuryType[] = [];
  const reasons: string[] = [];
  
  injuries.forEach((injury) => {
    if (exerciseConflictsWithInjury(exercise, injury)) {
      conflictingInjuries.push(injury);
      reasons.push(`Conflicts with ${injury}: exercise contains flagged keywords`);
    }
  });
  
  return {
    hasConflict: conflictingInjuries.length > 0,
    conflictingInjuries,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Substitution Logic
// ---------------------------------------------------------------------------

export type SubstitutionResult = {
  originalExercise: ProgramExercise;
  shouldSubstitute: boolean;
  reason?: string;
  suggestedReplacements: string[];
  confidence: 'high' | 'medium' | 'low';
};

/**
 * Find substitution rules that apply to an exercise for given injuries
 */
export function findSubstitutionRules(
  exercise: ProgramExercise,
  injuries: InjuryType[]
): SubstitutionRule[] {
  const name = exercise.name || '';
  const applicableRules: SubstitutionRule[] = [];
  
  SUBSTITUTION_RULES.forEach((rule) => {
    // Check if rule applies to any of the user's injuries
    const injuryMatch = rule.forInjuries.some((inj) => injuries.includes(inj));
    if (!injuryMatch) return;
    
    // Check if exercise matches the rule pattern
    let exerciseMatch = false;
    if (typeof rule.match === 'string') {
      exerciseMatch = name.toLowerCase().includes(rule.match.toLowerCase());
    } else {
      exerciseMatch = rule.match.test(name);
    }
    
    if (exerciseMatch) {
      applicableRules.push(rule);
    }
  });
  
  // Sort by priority (highest first)
  return applicableRules.sort((a, b) => b.priority - a.priority);
}

/**
 * Determine if an exercise should be substituted and provide alternatives
 */
export function getSubstitutionRecommendation(
  exercise: ProgramExercise,
  injuries: InjuryType[]
): SubstitutionResult {
  // Check for conflicts
  const conflicts = getExerciseConflicts(exercise, injuries);
  
  if (!conflicts.hasConflict) {
    return {
      originalExercise: exercise,
      shouldSubstitute: false,
      suggestedReplacements: [],
      confidence: 'high',
    };
  }
  
  // Find applicable substitution rules
  const rules = findSubstitutionRules(exercise, injuries);
  
  if (rules.length > 0) {
    const primaryRule = rules[0];
    return {
      originalExercise: exercise,
      shouldSubstitute: true,
      reason: primaryRule.reason,
      suggestedReplacements: primaryRule.replacements,
      confidence: 'high',
    };
  }
  
  // No specific rule found, but exercise has conflict
  return {
    originalExercise: exercise,
    shouldSubstitute: true,
    reason: conflicts.reasons.join('; '),
    suggestedReplacements: [],
    confidence: 'low',
  };
}

// ---------------------------------------------------------------------------
// Pool-based Substitution Selection
// ---------------------------------------------------------------------------

export type PoolSubstitutionOptions = {
  /** Available exercises in the pool */
  pool: PoolExercise[];
  /** Injuries to consider */
  injuries: InjuryType[];
  /** Exercise selection context */
  context: ExercisePriorityContext;
  /** Required pattern slot */
  requiredSlot?: string;
  /** Required muscle group */
  requiredMuscle?: string;
};

/**
 * Select the best substitute from the exercise pool
 */
export function selectBestSubstitute(
  originalExercise: ProgramExercise,
  options: PoolSubstitutionOptions
): PoolExercise | null {
  const { pool, injuries, context, requiredSlot, requiredMuscle } = options;
  
  // First, check if original is actually problematic
  const recommendation = getSubstitutionRecommendation(originalExercise, injuries);
  if (!recommendation.shouldSubstitute) {
    // Original exercise is fine
    const originalInPool = pool.find((ex) => ex.id === originalExercise.id);
    return originalInPool || null;
  }
  
  // Filter pool to safe exercises
  const safePool = pool.filter((ex) => isExerciseSafeForInjuries(ex, injuries));
  
  // Further filter by required slot if specified
  const slotFiltered = requiredSlot
    ? safePool.filter((ex) => {
        const metadata = buildExerciseMetadata(ex, context);
        return metadata.patternSlot === requiredSlot;
      })
    : safePool;
  
  // Further filter by required muscle if specified
  const muscleFiltered = requiredMuscle
    ? slotFiltered.filter((ex) => 
        ex.primary_muscles?.includes(requiredMuscle) || 
        ex.primary_muscle === requiredMuscle
      )
    : slotFiltered;
  
  // Score remaining candidates
  const scored = muscleFiltered.map((ex) => ({
    exercise: ex,
    score: scoreExerciseForSelection(ex, context),
    metadata: buildExerciseMetadata(ex, context),
  }));
  
  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);
  
  // Return best match, or null if none available
  return scored.length > 0 ? scored[0].exercise : null;
}

// ---------------------------------------------------------------------------
// Batch Substitution for Plan Validation
// ---------------------------------------------------------------------------

export type PlanSubstitutionCheck = {
  dayIndex: number;
  exerciseIndex: number;
  originalExercise: ProgramExercise;
  recommendation: SubstitutionResult;
  suggestedSubstitute: PoolExercise | null;
};

/**
 * Check all exercises in a plan for injury conflicts
 */
export function checkPlanForInjuryConflicts(
  planDays: Array<{ exercises: ProgramExercise[] }>,
  injuries: InjuryType[],
  pool: PoolExercise[],
  context: ExercisePriorityContext
): PlanSubstitutionCheck[] {
  const conflicts: PlanSubstitutionCheck[] = [];
  
  planDays.forEach((day, dayIndex) => {
    day.exercises.forEach((exercise, exerciseIndex) => {
      const recommendation = getSubstitutionRecommendation(exercise, injuries);
      
      if (recommendation.shouldSubstitute) {
        const suggestedSubstitute = selectBestSubstitute(exercise, {
          pool,
          injuries,
          context,
        });
        
        conflicts.push({
          dayIndex,
          exerciseIndex,
          originalExercise: exercise,
          recommendation,
          suggestedSubstitute,
        });
      }
    });
  });
  
  return conflicts;
}

// ---------------------------------------------------------------------------
// Export Injury Types from User Profile Strings
// ---------------------------------------------------------------------------

/**
 * Parse injury strings from user profile into typed injuries
 */
export function parseInjuries(injuryStrings: string[]): InjuryType[] {
  const injuryMap: Record<string, InjuryType> = {
    'knee': 'knees',
    'knees': 'knees',
    'knee pain': 'knees',
    'back': 'back',
    'lower back': 'back',
    'back pain': 'back',
    'shoulder': 'shoulders',
    'shoulders': 'shoulders',
    'shoulder pain': 'shoulders',
    'rotator cuff': 'shoulders',
    'wrist': 'wrists',
    'wrists': 'wrists',
    'wrist pain': 'wrists',
    'ankle': 'ankles',
    'ankles': 'ankles',
    'ankle pain': 'ankles',
    'hip': 'hips',
    'hips': 'hips',
    'hip pain': 'hips',
    'elbow': 'elbows',
    'elbows': 'elbows',
    'elbow pain': 'elbows',
    'tennis elbow': 'elbows',
    'golfer elbow': 'elbows',
    'neck': 'neck',
    'neck pain': 'neck',
  };
  
  const parsed = new Set<InjuryType>();
  
  injuryStrings.forEach((injury) => {
    const normalized = injury.toLowerCase().trim();
    const mapped = injuryMap[normalized];
    if (mapped) {
      parsed.add(mapped);
    }
  });
  
  return Array.from(parsed);
}
