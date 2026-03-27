/**
 * Technique Execution State Management
 *
 * Manages advanced training technique state during workout execution:
 * - Supersets (A/B exercise tracking, round progress)
 * - Drop sets (phase tracking, weight reductions)
 * - Tempo (phase timing, rep counting)
 * - RIR/RPE (target tracking, suggestions)
 *
 * This module provides utilities to determine when to show technique UI
 * and manage technique state throughout a workout session.
 */

export type TechniqueType = 'superset' | 'drop_set' | 'tempo' | 'rest_pause' | 'amrap' | null;

export interface TechniqueMetadata {
  technique_type: TechniqueType;
  technique_config_json?: Record<string, any>;
  tempo?: string | null;
  rir_target_min?: number | null;
  rir_target_max?: number | null;
  rpe_target_min?: number | null;
  rpe_target_max?: number | null;
}

export interface SessionExercise {
  id: string;
  exercise: {
    id: string;
    name: string;
  };
  technique_type?: TechniqueType;
  technique_config_json?: Record<string, any>;
  tempo?: string | null;
  rir_target_min?: number | null;
  rir_target_max?: number | null;
  rpe_target_min?: number | null;
  rpe_target_max?: number | null;
  sets: any[];
  sets_target?: number;
}

// ============================================================================
// Technique Detection
// ============================================================================

/**
 * Check if an exercise uses any advanced techniques
 */
export function hasAdvancedTechnique(exercise: SessionExercise): boolean {
  return !!(
    exercise.technique_type ||
    exercise.tempo ||
    (exercise.rir_target_min !== null && exercise.rir_target_min !== undefined) ||
    (exercise.rpe_target_min !== null && exercise.rpe_target_min !== undefined)
  );
}

/**
 * Get the primary technique for an exercise
 * Priority: superset > drop_set > tempo > RIR/RPE
 */
export function getPrimaryTechnique(exercise: SessionExercise): TechniqueType {
  if (exercise.technique_type) {
    return exercise.technique_type;
  }

  if (exercise.tempo) {
    return 'tempo';
  }

  // RIR/RPE is not a "technique" but rather a target - handled separately
  return null;
}

/**
 * Check if exercise should show RIR/RPE targets
 */
export function hasRIRRPETarget(exercise: SessionExercise): boolean {
  return !!(
    (exercise.rir_target_min !== null && exercise.rir_target_min !== undefined) ||
    (exercise.rpe_target_min !== null && exercise.rpe_target_min !== undefined)
  );
}

/**
 * Get RIR/RPE mode and config for an exercise
 */
export function getRIRRPEConfig(exercise: SessionExercise): {
  mode: 'RIR' | 'RPE' | null;
  rir_target_min?: number;
  rir_target_max?: number;
  rpe_target_min?: number;
  rpe_target_max?: number;
} {
  const hasRIR = exercise.rir_target_min !== null && exercise.rir_target_min !== undefined;
  const hasRPE = exercise.rpe_target_min !== null && exercise.rpe_target_min !== undefined;

  if (hasRIR) {
    return {
      mode: 'RIR',
      rir_target_min: exercise.rir_target_min ?? undefined,
      rir_target_max: exercise.rir_target_max ?? undefined,
    };
  }

  if (hasRPE) {
    return {
      mode: 'RPE',
      rpe_target_min: exercise.rpe_target_min ?? undefined,
      rpe_target_max: exercise.rpe_target_max ?? undefined,
    };
  }

  return { mode: null };
}

// ============================================================================
// Superset State Management
// ============================================================================

export interface SupersetState {
  exerciseA: SessionExercise;
  exerciseB: SessionExercise;
  currentRound: number; // 1-indexed
  totalRounds: number;
  activeExercise: 'A' | 'B' | null;
  config: {
    superset_type: 'antagonist' | 'pre_exhaust' | 'post_exhaust' | 'compound';
    rest_between_exercises_sec: number;
    rest_between_rounds_sec: number;
  };
}

/**
 * Detect if current and next exercise form a superset pair
 */
export function detectSuperset(
  currentExercise: SessionExercise,
  nextExercise?: SessionExercise
): SupersetState | null {
  if (!currentExercise.technique_type || currentExercise.technique_type !== 'superset') {
    return null;
  }

  if (!nextExercise || nextExercise.technique_type !== 'superset') {
    return null;
  }

  const config = currentExercise.technique_config_json as any;

  return {
    exerciseA: currentExercise,
    exerciseB: nextExercise,
    currentRound: 1,
    totalRounds: currentExercise.sets_target || 3,
    activeExercise: null,
    config: {
      superset_type: config?.superset_type || 'antagonist',
      rest_between_exercises_sec: config?.rest_between_exercises_sec || 15,
      rest_between_rounds_sec: config?.rest_between_rounds_sec || 90,
    },
  };
}

// ============================================================================
// Drop Set State Management
// ============================================================================

export interface DropSetState {
  workingSetWeight: number;
  workingSetReps: number;
  currentDropPhase: number; // 0 = working set, 1 = first drop, etc.
  config: {
    drop_count: number;
    drop_percentage: number;
    rest_between_drops_sec: number;
  };
  dropsCompleted: Array<{ weight: number; reps: number }>;
}

/**
 * Initialize drop set state
 */
export function initializeDropSet(
  exercise: SessionExercise,
  workingSetWeight: number,
  workingSetReps: number
): DropSetState | null {
  if (exercise.technique_type !== 'drop_set') {
    return null;
  }

  const config = exercise.technique_config_json as any;

  return {
    workingSetWeight,
    workingSetReps,
    currentDropPhase: 0,
    config: {
      drop_count: config?.drop_count || 2,
      drop_percentage: config?.drop_percentage || 20,
      rest_between_drops_sec: config?.rest_between_drops_sec || 0,
    },
    dropsCompleted: [],
  };
}

/**
 * Progress to next drop phase
 */
export function advanceDropPhase(state: DropSetState): DropSetState {
  return {
    ...state,
    currentDropPhase: state.currentDropPhase + 1,
  };
}

/**
 * Check if drop set is complete
 */
export function isDropSetComplete(state: DropSetState): boolean {
  return state.currentDropPhase > state.config.drop_count;
}

// ============================================================================
// Tempo State Management
// ============================================================================

export interface TempoState {
  notation: string; // e.g., "3-0-1-0"
  currentRep: number; // 0-indexed
  targetReps: number;
  isActive: boolean;
  config: {
    tempo_notation: string;
    enforce_compliance: boolean;
  };
}

/**
 * Initialize tempo state
 */
export function initializeTempo(
  exercise: SessionExercise,
  targetReps: number
): TempoState | null {
  if (!exercise.tempo) {
    return null;
  }

  const config = exercise.technique_config_json as any;

  return {
    notation: exercise.tempo,
    currentRep: 0,
    targetReps,
    isActive: false,
    config: {
      tempo_notation: exercise.tempo,
      enforce_compliance: config?.enforce_compliance || false,
    },
  };
}

/**
 * Start tempo tracking for a set
 */
export function startTempoSet(state: TempoState): TempoState {
  return {
    ...state,
    isActive: true,
    currentRep: 0,
  };
}

/**
 * Increment rep count
 */
export function advanceTempoRep(state: TempoState): TempoState {
  return {
    ...state,
    currentRep: state.currentRep + 1,
  };
}

/**
 * Complete tempo set
 */
export function completeTempoSet(state: TempoState): TempoState {
  return {
    ...state,
    isActive: false,
  };
}

// ============================================================================
// Technique Availability Rules
// ============================================================================

/**
 * Check if techniques should be available for a workout program
 * Only show for:
 * - Advanced/Bodybuilding programs
 * - Manual workout builder (user-created sessions)
 */
export function shouldShowTechniques(program: {
  difficulty?: string | null;
  goal_tags?: string[] | null;
  is_from_template?: boolean;
}): boolean {
  const isAdvanced = program.difficulty === 'advanced';
  const isBodybuilding =
    (program.goal_tags || []).includes('bodybuilding') ||
    (program.goal_tags || []).includes('hypertrophy');
  const isManual = !program.is_from_template; // user-built workout

  return isAdvanced || isBodybuilding || isManual;
}

// ============================================================================
// Rest Timer Adjustments
// ============================================================================

/**
 * Get custom rest duration for technique-specific scenarios
 */
export function getTechniqueRestDuration(
  exercise: SessionExercise,
  context: 'between_exercises' | 'between_sets' | 'between_drops'
): number | null {
  const technique = getPrimaryTechnique(exercise);

  if (technique === 'superset') {
    const config = exercise.technique_config_json as any;
    if (context === 'between_exercises') {
      return config?.rest_between_exercises_sec || 15;
    }
    if (context === 'between_sets') {
      return config?.rest_between_rounds_sec || 90;
    }
  }

  if (technique === 'drop_set') {
    const config = exercise.technique_config_json as any;
    if (context === 'between_drops') {
      return config?.rest_between_drops_sec || 0;
    }
  }

  return null; // Use default rest timer
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate tempo notation format (should be "X-X-X-X")
 */
export function isValidTempoNotation(tempo: string): boolean {
  const parts = tempo.split('-');
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    const num = parseInt(part);
    return !isNaN(num) && num >= 0 && num <= 9;
  });
}

/**
 * Parse tempo notation into phases
 */
export function parseTempoNotation(tempo: string): {
  eccentric: number;
  pause1: number;
  concentric: number;
  pause2: number;
} | null {
  if (!isValidTempoNotation(tempo)) return null;

  const [eccentric, pause1, concentric, pause2] = tempo.split('-').map(Number);

  return {
    eccentric,
    pause1,
    concentric,
    pause2,
  };
}
