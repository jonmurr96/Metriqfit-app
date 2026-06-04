/**
 * split-selector.ts
 *
 * Deterministic rules engine: user profile → split family key.
 *
 * Rules priority (higher = checked first):
 * 1. User explicitly requested a split family → honour it (with override if needed)
 * 2. Recovery burden hard constraints (high burden → max 4 days)
 * 3. Experience level gates (beginner → max 4 days without override)
 * 4. Days per week hard constraints
 * 5. Goal modifiers (strength → powerbuilding/PHUL, hypertrophy → PPL/Upper-Lower)
 * 6. Default fallback by days
 */

import type {
  EquipmentAccess,
  ExperienceLevel,
  PrimaryGoal,
  RecoveryBurden,
  TrainingStylePreference,
} from './training-profile.ts';

export type SplitSelectorInput = {
  daysPerWeek: number;
  experienceLevel: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  preferredSplitFamily?: string | null;
  explicitBodybuildingIntent?: boolean | null;
  equipmentAccess?: EquipmentAccess | string | null;
  sessionDurationMin?: number | null;
  injuries?: string[];
  trainingStylePreference?: TrainingStylePreference | null;
  recoveryBurden?: RecoveryBurden | null;
  /** User acknowledges this plan is aggressive and wants to proceed anyway */
  acknowledgeAggressivePlan?: boolean;
  /** User's age (affects recovery recommendations) */
  age?: number | null;
};

export type SplitSelection = {
  familyKey: string;
  displayName: string;
  rationale: string;
  warningIfAny: string | null;
  /** Whether this split requires user override for their profile */
  requiresOverride: boolean;
  /** The constraint that triggered the override requirement */
  overrideReason?: string;
};

// ---------------------------------------------------------------------------
// Split complexity levels
// ---------------------------------------------------------------------------
export type SplitComplexity = 'low' | 'medium' | 'high';

// ---------------------------------------------------------------------------
// Enhanced split definitions with recovery burden and complexity
// ---------------------------------------------------------------------------

type SplitDefinition = {
  familyKey: string;
  displayName: string;
  minDays: number;
  maxDays: number;
  minExperience: ExperienceLevel;
  /** Maximum experience level this split is appropriate for (optional) */
  maxExperience?: ExperienceLevel;
  /** Maximum recovery burden this split is appropriate for */
  maxRecoveryBurden: RecoveryBurden;
  /** Split complexity - beginners should stick to low/medium */
  complexity: SplitComplexity;
  goalAffinity: PrimaryGoal[];
  equipmentRequired: string[];
  shortSessionFriendly?: boolean;
  styleBias?: TrainingStylePreference | 'flexible';
  /** Whether this split requires explicit user override for beginners */
  requiresExplicitIntent?: boolean;
  /** Weekly training volume estimate (total working sets) */
  weeklyVolumeEstimate: number;
};

// ---------------------------------------------------------------------------
// Complete split library covering all requested options
// ---------------------------------------------------------------------------

const SPLITS: SplitDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 2-DAY SPLITS (Beginner-friendly, minimalist)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    familyKey: 'full_body_2',
    displayName: 'Full Body (2x/week)',
    minDays: 2, maxDays: 2,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['general_fitness', 'lose_fat', 'build_muscle'],
    equipmentRequired: [],
    shortSessionFriendly: true,
    styleBias: 'general_fitness',
    weeklyVolumeEstimate: 30,
  },
  {
    familyKey: 'upper_lower_2',
    displayName: 'Upper / Lower (2x/week)',
    minDays: 2, maxDays: 2,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['general_fitness', 'lose_fat', 'build_muscle'],
    equipmentRequired: [],
    shortSessionFriendly: true,
    styleBias: 'balanced',
    weeklyVolumeEstimate: 32,
  },
  {
    familyKey: 'push_pull_2',
    displayName: 'Push / Pull (2x/week)',
    minDays: 2, maxDays: 2,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['general_fitness', 'lose_fat', 'build_muscle'],
    equipmentRequired: [],
    shortSessionFriendly: true,
    styleBias: 'balanced',
    weeklyVolumeEstimate: 32,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3-DAY SPLITS (Beginner-friendly, most popular)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    familyKey: 'full_body_beginner_3',
    displayName: 'Full Body (3x/week)',
    minDays: 3, maxDays: 3,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['build_muscle', 'get_stronger', 'general_fitness', 'lose_fat'],
    equipmentRequired: [],
    shortSessionFriendly: true,
    styleBias: 'general_fitness',
    weeklyVolumeEstimate: 45,
  },
  {
    familyKey: 'full_body_strength_3',
    displayName: 'Full Body Strength (3x/week)',
    minDays: 3, maxDays: 3,
    minExperience: 'intermediate',
    maxRecoveryBurden: 'high',
    complexity: 'medium',
    goalAffinity: ['get_stronger', 'build_muscle'],
    equipmentRequired: ['barbell'],
    shortSessionFriendly: true,
    styleBias: 'strength',
    weeklyVolumeEstimate: 48,
  },
  {
    familyKey: 'general_fitness_beginner_3',
    displayName: 'General Fitness (3x/week)',
    minDays: 3, maxDays: 3,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['general_fitness', 'lose_fat', 'improve_endurance'],
    equipmentRequired: [],
    shortSessionFriendly: true,
    styleBias: 'general_fitness',
    weeklyVolumeEstimate: 42,
  },
  {
    familyKey: 'upper_lower_full_3',
    displayName: 'Upper / Lower / Full',
    minDays: 3, maxDays: 3,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['build_muscle', 'general_fitness', 'lose_fat'],
    equipmentRequired: [],
    shortSessionFriendly: true,
    styleBias: 'balanced',
    weeklyVolumeEstimate: 45,
  },
  {
    familyKey: 'ppl_3',
    displayName: 'Push / Pull / Legs (3x/week)',
    minDays: 3, maxDays: 3,
    minExperience: 'intermediate',
    maxRecoveryBurden: 'high',
    complexity: 'medium',
    goalAffinity: ['build_muscle', 'lose_fat'],
    equipmentRequired: [],
    shortSessionFriendly: false,
    styleBias: 'bodybuilding',
    weeklyVolumeEstimate: 48,
  },
  {
    familyKey: 'chest_back_legs_should_arms_3',
    displayName: 'Chest-Back / Legs / Shoulders-Arms',
    minDays: 3, maxDays: 3,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['build_muscle', 'general_fitness'],
    equipmentRequired: [],
    shortSessionFriendly: true,
    styleBias: 'bodybuilding',
    weeklyVolumeEstimate: 45,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4-DAY SPLITS (Upper/Lower focused)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    familyKey: 'upper_lower_4',
    displayName: 'Upper / Lower (4x/week)',
    minDays: 4, maxDays: 4,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['build_muscle', 'get_stronger', 'lose_fat'],
    equipmentRequired: [],
    shortSessionFriendly: true,
    styleBias: 'balanced',
    weeklyVolumeEstimate: 56,
  },
  {
    familyKey: 'phul_4',
    displayName: 'PHUL (Power Hypertrophy)',
    minDays: 4, maxDays: 4,
    minExperience: 'intermediate',
    maxRecoveryBurden: 'moderate',
    complexity: 'medium',
    goalAffinity: ['get_stronger', 'build_muscle'],
    equipmentRequired: ['barbell'],
    shortSessionFriendly: false,
    styleBias: 'strength',
    weeklyVolumeEstimate: 60,
  },
  {
    familyKey: 'ppl_upper_4',
    displayName: 'PPL + Upper (4x/week)',
    minDays: 4, maxDays: 4,
    minExperience: 'intermediate',
    maxRecoveryBurden: 'moderate',
    complexity: 'medium',
    goalAffinity: ['build_muscle', 'lose_fat'],
    equipmentRequired: [],
    shortSessionFriendly: false,
    styleBias: 'bodybuilding',
    weeklyVolumeEstimate: 58,
  },
  {
    familyKey: 'body_part_4',
    displayName: '4-Day Body Part Split',
    minDays: 4, maxDays: 4,
    minExperience: 'intermediate',
    maxRecoveryBurden: 'moderate',
    complexity: 'medium',
    goalAffinity: ['build_muscle'],
    equipmentRequired: [],
    styleBias: 'bodybuilding',
    weeklyVolumeEstimate: 56,
  },
  {
    familyKey: 'torso_limbs_4',
    displayName: 'Torso / Limbs (4x/week)',
    minDays: 4, maxDays: 4,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['build_muscle', 'general_fitness', 'lose_fat'],
    equipmentRequired: [],
    shortSessionFriendly: true,
    styleBias: 'balanced',
    weeklyVolumeEstimate: 54,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5-DAY SPLITS (Higher volume, requires more recovery)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    familyKey: 'upper_lower_5',
    displayName: 'Upper / Lower (5-day)',
    minDays: 5, maxDays: 5,
    minExperience: 'intermediate',
    maxRecoveryBurden: 'moderate',
    complexity: 'medium',
    goalAffinity: ['build_muscle', 'get_stronger', 'general_fitness', 'lose_fat'],
    equipmentRequired: [],
    shortSessionFriendly: true,
    styleBias: 'balanced',
    weeklyVolumeEstimate: 70,
  },
  {
    familyKey: 'bro_split_5',
    displayName: 'Bro Split (1 muscle/day)',
    minDays: 5, maxDays: 5,
    minExperience: 'intermediate',
    maxRecoveryBurden: 'moderate',
    complexity: 'high',
    goalAffinity: ['build_muscle'],
    equipmentRequired: [],
    styleBias: 'bodybuilding',
    requiresExplicitIntent: true,
    weeklyVolumeEstimate: 75,
  },
  {
    familyKey: 'ppl_ul_hybrid_5',
    displayName: 'PPL + Upper / Lower Hybrid',
    minDays: 5, maxDays: 5,
    minExperience: 'intermediate',
    maxRecoveryBurden: 'moderate',
    complexity: 'high',
    goalAffinity: ['build_muscle', 'lose_fat'],
    equipmentRequired: [],
    styleBias: 'bodybuilding',
    weeklyVolumeEstimate: 72,
  },
  {
    familyKey: 'chest_back_legs_should_arms_5',
    displayName: 'Chest / Back / Legs / Shoulders / Arms',
    minDays: 5, maxDays: 5,
    minExperience: 'intermediate',
    maxRecoveryBurden: 'moderate',
    complexity: 'high',
    goalAffinity: ['build_muscle'],
    equipmentRequired: [],
    styleBias: 'bodybuilding',
    weeklyVolumeEstimate: 75,
  },
  {
    familyKey: 'phat_5',
    displayName: 'PHAT (Power Hypertrophy Adaptive Training)',
    minDays: 5, maxDays: 5,
    minExperience: 'advanced',
    maxRecoveryBurden: 'low',
    complexity: 'high',
    goalAffinity: ['get_stronger', 'build_muscle'],
    equipmentRequired: ['barbell'],
    styleBias: 'strength',
    weeklyVolumeEstimate: 70,
  },
  {
    familyKey: 'powerbuilding_5',
    displayName: 'Powerbuilding',
    minDays: 5, maxDays: 5,
    minExperience: 'intermediate',
    maxRecoveryBurden: 'moderate',
    complexity: 'high',
    goalAffinity: ['get_stronger', 'build_muscle'],
    equipmentRequired: ['barbell'],
    styleBias: 'strength',
    weeklyVolumeEstimate: 68,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6-DAY SPLITS (High frequency, requires excellent recovery)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    familyKey: 'ppl_6',
    displayName: 'Push / Pull / Legs (6x/week)',
    minDays: 6, maxDays: 6,
    minExperience: 'intermediate',
    maxRecoveryBurden: 'low',
    complexity: 'high',
    goalAffinity: ['build_muscle'],
    equipmentRequired: [],
    styleBias: 'bodybuilding',
    weeklyVolumeEstimate: 84,
  },
  {
    familyKey: 'upper_lower_6',
    displayName: 'Upper / Lower (6x/week)',
    minDays: 6, maxDays: 6,
    minExperience: 'advanced',
    maxRecoveryBurden: 'low',
    complexity: 'high',
    goalAffinity: ['build_muscle', 'get_stronger'],
    equipmentRequired: [],
    styleBias: 'balanced',
    weeklyVolumeEstimate: 82,
  },
  {
    familyKey: 'arnold_split_6',
    displayName: 'Arnold Split (Chest-Back / Shoulders-Arms / Legs)',
    minDays: 6, maxDays: 6,
    minExperience: 'advanced',
    maxRecoveryBurden: 'low',
    complexity: 'high',
    goalAffinity: ['build_muscle'],
    equipmentRequired: [],
    styleBias: 'bodybuilding',
    requiresExplicitIntent: true,
    weeklyVolumeEstimate: 86,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIALTY SPLITS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    familyKey: 'minimalist_full_body_2',
    displayName: 'Minimalist Full Body (2 days)',
    minDays: 2, maxDays: 2,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['general_fitness', 'lose_fat'],
    equipmentRequired: [],
    shortSessionFriendly: true,
    styleBias: 'general_fitness',
    weeklyVolumeEstimate: 24,
  },
  {
    familyKey: 'bodyweight_only_3',
    displayName: 'Bodyweight Only',
    minDays: 2, maxDays: 6,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['build_muscle', 'lose_fat', 'general_fitness', 'improve_endurance'],
    equipmentRequired: ['bodyweight'],
    shortSessionFriendly: true,
    styleBias: 'general_fitness',
    weeklyVolumeEstimate: 40,
  },
  {
    familyKey: 'home_dumbbell_4',
    displayName: 'Home / Dumbbell',
    minDays: 3, maxDays: 5,
    minExperience: 'beginner',
    maxRecoveryBurden: 'high',
    complexity: 'low',
    goalAffinity: ['build_muscle', 'lose_fat', 'general_fitness'],
    equipmentRequired: ['dumbbell'],
    shortSessionFriendly: true,
    styleBias: 'balanced',
    weeklyVolumeEstimate: 50,
  },
];

// ---------------------------------------------------------------------------
// Experience level ordering for comparisons
// ---------------------------------------------------------------------------

const EXPERIENCE_ORDER: Record<ExperienceLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const RECOVERY_BURDEN_ORDER: Record<RecoveryBurden, number> = {
  low: 0,
  moderate: 1,
  high: 2,
};

// ---------------------------------------------------------------------------
// Split gating rules by experience level
// ---------------------------------------------------------------------------

const EXPERIENCE_GATES = {
  beginner: {
    /** Maximum training days per week without override */
    maxDaysWithoutOverride: 4,
    /** Maximum split complexity allowed */
    maxComplexity: 'medium' as SplitComplexity,
    /** Maximum recovery burden to allow */
    maxRecoveryBurden: 'high' as RecoveryBurden,
    /** Splits that require explicit override for beginners */
    blockedWithoutOverride: [
      'bro_split_5',
      'phat_5',
      'ppl_6',
      'upper_lower_6',
      'arnold_split_6',
    ],
  },
  intermediate: {
    maxDaysWithoutOverride: 6,
    maxComplexity: 'high' as SplitComplexity,
    maxRecoveryBurden: 'high' as RecoveryBurden,
    blockedWithoutOverride: [
      'phat_5',
      'arnold_split_6',
    ],
  },
  advanced: {
    maxDaysWithoutOverride: 6,
    maxComplexity: 'high' as SplitComplexity,
    maxRecoveryBurden: 'high' as RecoveryBurden,
    blockedWithoutOverride: [] as string[],
  },
};

// ---------------------------------------------------------------------------
// Recovery-based constraints
// ---------------------------------------------------------------------------

const RECOVERY_CONSTRAINTS = {
  high: {
    maxDaysPerWeek: 4,
    maxSessionDuration: 60,
    requireRestDaysBetween: true,
    blockSplits: ['ppl_6', 'arnold_6', 'upper_lower_6', 'phat_5'],
  },
  moderate: {
    maxDaysPerWeek: 5,
    maxSessionDuration: 75,
    requireRestDaysBetween: false,
    blockSplits: ['arnold_6'],
  },
  low: {
    maxDaysPerWeek: 6,
    maxSessionDuration: 90,
    requireRestDaysBetween: false,
    blockSplits: [] as string[],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function userHasEquipment(access: string | null | undefined, required: string[]): boolean {
  if (!required.length) return true;
  if (!access) return false;
  const a = access.toLowerCase();
  if (a === 'full_gym') return true;
  if (required.includes('bodyweight')) return true;
  if (required.includes('dumbbell') && (a.includes('dumbbell') || a === 'full_gym')) return true;
  if (required.includes('barbell') && a === 'full_gym') return true;
  return false;
}

function complexityAllowedForExperience(
  splitComplexity: SplitComplexity,
  maxAllowed: SplitComplexity,
): boolean {
  const order = { low: 0, medium: 1, high: 2 };
  return order[splitComplexity] <= order[maxAllowed];
}

function scoreForUser(
  split: SplitDefinition,
  days: number,
  experience: ExperienceLevel,
  goal: PrimaryGoal,
  sessionDurationMin: number | null,
  trainingStylePreference: TrainingStylePreference | null,
  recoveryBurden: RecoveryBurden | null,
): number {
  let score = 0;
  
  // Days match (strong signal)
  if (days >= split.minDays && days <= split.maxDays) score += 100;
  else if (days >= split.minDays) score += 30; // too many days but can extend
  
  // Goal affinity
  if (split.goalAffinity.includes(goal)) score += 50;
  
  // Experience match (prefer splits appropriate to user level)
  const userLevel = EXPERIENCE_ORDER[experience];
  const splitLevel = EXPERIENCE_ORDER[split.minExperience];
  if (splitLevel === userLevel) score += 20;
  else if (splitLevel < userLevel) score += 10; // can always do easier split
  
  // Recovery burden alignment
  if (recoveryBurden) {
    const burdenOrder = { low: 0, moderate: 1, high: 2 };
    const userBurden = burdenOrder[recoveryBurden];
    const splitMaxBurden = burdenOrder[split.maxRecoveryBurden];
    if (userBurden <= splitMaxBurden) score += 15;
    else score -= 30; // Penalty for recovery mismatch
  }
  
  // Session duration
  if (sessionDurationMin && sessionDurationMin <= 45) {
    score += split.shortSessionFriendly ? 20 : -18;
  }
  
  // Training style preference
  if (trainingStylePreference) {
    if (split.styleBias === trainingStylePreference) score += 24;
    else if (split.styleBias === 'flexible') score += 8;
    else if (trainingStylePreference === 'general_fitness' && split.styleBias === 'balanced') score += 10;
    else if (trainingStylePreference === 'balanced' && split.styleBias === 'general_fitness') score += 10;
    else score -= 4;
  }
  
  // Volume appropriateness (prefer moderate volume for most users)
  if (split.weeklyVolumeEstimate >= 50 && split.weeklyVolumeEstimate <= 70) {
    score += 10; // Sweet spot
  }
  
  return score;
}

// ---------------------------------------------------------------------------
// Main selector
// ---------------------------------------------------------------------------

export function selectSplit(input: SplitSelectorInput): SplitSelection {
  const {
    daysPerWeek,
    experienceLevel,
    primaryGoal,
    preferredSplitFamily,
    explicitBodybuildingIntent = false,
    equipmentAccess,
    sessionDurationMin,
    trainingStylePreference = null,
    recoveryBurden = null,
    acknowledgeAggressivePlan = false,
    age,
  } = input;
  
  const prefersBodybuilding = trainingStylePreference === 'bodybuilding';
  const shortOnTime = !!sessionDurationMin && sessionDurationMin <= 45;
  const highRecoveryBurden = recoveryBurden === 'high';
  
  // Get experience gate rules
  const gateRules = EXPERIENCE_GATES[experienceLevel];
  
  // Check if user exceeds days limit for their experience
  const exceedsDaysLimit = daysPerWeek > gateRules.maxDaysWithoutOverride;
  
  // Age-based adjustment (older = more conservative)
  const ageAdjustedBurden = age && age >= 40 && recoveryBurden === 'low' 
    ? 'moderate' as RecoveryBurden 
    : recoveryBurden;

  // 1. Honour explicit user preference if valid
  if (preferredSplitFamily) {
    const preferred = SPLITS.find((s) => s.familyKey === preferredSplitFamily);
    if (preferred) {
      const equipmentOk = userHasEquipment(equipmentAccess, preferred.equipmentRequired);
      const daysOk = daysPerWeek >= preferred.minDays;
      const expLevel = EXPERIENCE_ORDER[experienceLevel];
      const expOk = expLevel >= EXPERIENCE_ORDER[preferred.minExperience];
      const recoveryOk = !ageAdjustedBurden || RECOVERY_BURDEN_ORDER[ageAdjustedBurden] <= RECOVERY_BURDEN_ORDER[preferred.maxRecoveryBurden];
      const complexityOk = complexityAllowedForExperience(preferred.complexity, gateRules.maxComplexity);
      
      // Check if split requires explicit intent (e.g., bro split)
      const explicitIntentOk = !preferred.requiresExplicitIntent || explicitBodybuildingIntent;
      
      // Check if split is in blocked list for this experience level
      const isBlocked = gateRules.blockedWithoutOverride.includes(preferred.familyKey);
      
      if (daysOk && expOk && equipmentOk && recoveryOk && complexityOk && explicitIntentOk && (!isBlocked || acknowledgeAggressivePlan)) {
        const warning = isBlocked && acknowledgeAggressivePlan
          ? `This ${preferred.displayName} is aggressive for a ${experienceLevel} lifter. Ensure you can recover adequately.`
          : null;
        
        return {
          familyKey: preferred.familyKey,
          displayName: preferred.displayName,
          rationale: `User selected ${preferred.displayName}.`,
          warningIfAny: warning,
          requiresOverride: false,
        };
      }

      // Build reason for why preference couldn't be honored
      const reasons = [];
      if (!daysOk) reasons.push(`requires ${preferred.minDays}+ days`);
      if (!expOk) reasons.push(`designed for ${preferred.minExperience}+ lifters`);
      if (!recoveryOk) reasons.push(`too demanding for your recovery profile`);
      if (!complexityOk) reasons.push(`too complex for beginners`);
      if (!explicitIntentOk) reasons.push(`requires explicit bodybuilding preference`);
      if (isBlocked) reasons.push(`aggressive for ${experienceLevel} lifters`);
      
      const reason = reasons.join(', ');

      // Still use it with a warning if only days don't match
      if (!daysOk && expOk && equipmentOk && recoveryOk && complexityOk && explicitIntentOk && (!isBlocked || acknowledgeAggressivePlan)) {
        return {
          familyKey: preferred.familyKey,
          displayName: preferred.displayName,
          rationale: `User selected ${preferred.displayName}; adapted for ${daysPerWeek} days.`,
          warningIfAny: reason,
          requiresOverride: false,
        };
      }
      
      // Return override option if blocked
      if (isBlocked) {
        return {
          familyKey: preferred.familyKey,
          displayName: preferred.displayName,
          rationale: `${preferred.displayName} is typically for advanced lifters, but you've chosen it.`,
          warningIfAny: `This plan is aggressive for a ${experienceLevel} lifter. ${preferred.maxRecoveryBurden === 'low' ? 'It requires excellent recovery.' : ''} Proceed with caution.`,
          requiresOverride: true,
          overrideReason: reason,
        };
      }
    }
  }

  // 2. Recovery burden hard constraints (override high burden plans)
  if (ageAdjustedBurden === 'high') {
    const constraints = RECOVERY_CONSTRAINTS.high;
    if (daysPerWeek > constraints.maxDaysPerWeek && !acknowledgeAggressivePlan) {
      // Force down to max allowed days
      const fallbackSplits = SPLITS.filter(s => 
        s.minDays <= constraints.maxDaysPerWeek && 
        s.maxDays >= constraints.maxDaysPerWeek &&
        EXPERIENCE_ORDER[s.minExperience] <= EXPERIENCE_ORDER[experienceLevel] &&
        userHasEquipment(equipmentAccess, s.equipmentRequired) &&
        RECOVERY_BURDEN_ORDER[s.maxRecoveryBurden] >= RECOVERY_BURDEN_ORDER['high']
      );
      
      if (fallbackSplits.length > 0) {
        const best = fallbackSplits.sort((a, b) => b.weeklyVolumeEstimate - a.weeklyVolumeEstimate)[0];
        return {
          familyKey: best.familyKey,
          displayName: best.displayName,
          rationale: `High recovery burden detected — reduced to ${constraints.maxDaysPerWeek} days for better recovery.`,
          warningIfAny: `Your profile suggests high recovery demands. We've reduced training frequency to ${constraints.maxDaysPerWeek} days to ensure adequate recovery.`,
          requiresOverride: false,
        };
      }
    }
  }

  // 3. Beginner + Very Active protection
  if (experienceLevel === 'beginner' && exceedsDaysLimit && !acknowledgeAggressivePlan) {
    const recommendedDays = Math.min(daysPerWeek, gateRules.maxDaysWithoutOverride);
    const fallbackSplit = SPLITS.find(s => 
      s.minDays <= recommendedDays && 
      s.maxDays >= recommendedDays &&
      s.minExperience === 'beginner' &&
      userHasEquipment(equipmentAccess, s.equipmentRequired)
    );
    
    if (fallbackSplit) {
      return {
        familyKey: fallbackSplit.familyKey,
        displayName: fallbackSplit.displayName,
        rationale: `Beginner protection — capped at ${gateRules.maxDaysWithoutOverride} days to ensure adequate recovery and progression.`,
        warningIfAny: `As a beginner, we recommend starting with ${gateRules.maxDaysWithoutOverride} training days. You can increase frequency as you adapt.`,
        requiresOverride: true,
        overrideReason: `exceeds recommended ${gateRules.maxDaysWithoutOverride} days for beginners`,
      };
    }
  }

  // 4. Equipment-first gates
  if (equipmentAccess === 'bodyweight_only') {
    return {
      familyKey: 'bodyweight_only_3',
      displayName: 'Bodyweight',
      rationale: 'No gym equipment — bodyweight program selected.',
      warningIfAny: null,
      requiresOverride: false,
    };
  }
  if (equipmentAccess === 'dumbbells_only' || equipmentAccess === 'dumbbells_plus_bench') {
    const key = daysPerWeek <= 3 ? 'full_body_beginner_3' : 'home_dumbbell_4';
    const split = SPLITS.find((s) => s.familyKey === key)!;
    return {
      familyKey: split.familyKey,
      displayName: split.displayName,
      rationale: 'Limited equipment — home/dumbbell program selected.',
      warningIfAny: null,
      requiresOverride: false,
    };
  }

  // 5. Days hard constraints with experience filtering
  if (daysPerWeek <= 3) {
    // Check for 3-day PPL for non-beginners with bodybuilding intent
    if (daysPerWeek === 3 && explicitBodybuildingIntent && experienceLevel !== 'beginner' && !shortOnTime) {
      return {
        familyKey: 'ppl_3',
        displayName: 'Push / Pull / Legs',
        rationale: '3 training days with explicit bodybuilding intent — Push / Pull / Legs keeps each session focused without overloading any single day.',
        warningIfAny: null,
        requiresOverride: false,
      };
    }

    return {
      familyKey: 'full_body_beginner_3',
      displayName: 'Full Body',
      rationale: `${daysPerWeek} training days — Full Body maximizes frequency for beginners.`,
      warningIfAny: null,
      requiresOverride: false,
    };
  }

  if (daysPerWeek === 4) {
    if (
      trainingStylePreference === 'strength'
      && primaryGoal === 'get_stronger'
      && equipmentAccess === 'full_gym'
      && !shortOnTime
      && experienceLevel !== 'beginner'
    ) {
      return {
        familyKey: 'phul_4',
        displayName: 'PHUL (Power Hypertrophy)',
        rationale: '4 full-gym days with a strength bias — PHUL keeps heavy lifts in the week while preserving hypertrophy work.',
        warningIfAny: null,
        requiresOverride: false,
      };
    }

    return {
      familyKey: 'upper_lower_4',
      displayName: 'Upper / Lower',
      rationale: '4 training days — Upper / Lower is the default because it balances muscle frequency, fatigue, and session clarity.',
      warningIfAny: null,
      requiresOverride: false,
    };
  }

  // 6. 5-day splits with experience and recovery gating
  if (daysPerWeek === 5) {
    // Block beginners from 5-day splits unless they explicitly override
    if (experienceLevel === 'beginner' && !acknowledgeAggressivePlan) {
      return {
        familyKey: 'upper_lower_4',
        displayName: 'Upper / Lower',
        rationale: 'Beginner protection — 5 days is aggressive for beginners. Starting with 4-day Upper/Lower.',
        warningIfAny: 'We recommend 4 training days for beginners. You can increase to 5 days after building a foundation.',
        requiresOverride: true,
        overrideReason: '5 days exceeds recommended 4 days for beginners',
      };
    }
    
    // High recovery burden check
    if (ageAdjustedBurden === 'high' && !acknowledgeAggressivePlan) {
      return {
        familyKey: 'upper_lower_4',
        displayName: 'Upper / Lower',
        rationale: 'Recovery protection — 5 days may be too demanding with your current recovery capacity.',
        warningIfAny: 'Your profile suggests high recovery demands. Consider 4 days to ensure adequate recovery.',
        requiresOverride: true,
        overrideReason: '5 days with high recovery burden',
      };
    }

    // Bro split with explicit intent check
    if (
      explicitBodybuildingIntent
      && !highRecoveryBurden
      && !shortOnTime
    ) {
      return {
        familyKey: 'bro_split_5',
        displayName: 'Bro Split (1 muscle/day)',
        rationale: '5 training days with explicit bodybuilding intent — Bro Split is allowed because you asked for body-part training.',
        warningIfAny: 'Bro Split reduces weekly muscle frequency. Use it only when session preference and adherence justify it.',
        requiresOverride: false,
      };
    }

    // Powerbuilding for strength goals
    if (
      primaryGoal === 'get_stronger'
      && equipmentAccess === 'full_gym'
      && trainingStylePreference === 'strength'
      && !shortOnTime
    ) {
      return {
        familyKey: 'powerbuilding_5',
        displayName: 'Powerbuilding',
        rationale: '5 full-gym training days with a strength goal — Powerbuilding preserves heavy compounds while keeping hypertrophy volume.',
        warningIfAny: null,
        requiresOverride: false,
      };
    }

    // Short on time
    if (shortOnTime) {
      return {
        familyKey: 'upper_lower_5',
        displayName: 'Upper / Lower (5-day)',
        rationale: '5 training days with a short session budget — Upper / Lower (5-day) keeps each session compact.',
        warningIfAny: null,
        requiresOverride: false,
      };
    }

    // General fitness
    if (primaryGoal === 'general_fitness') {
      return {
        familyKey: 'upper_lower_5',
        displayName: 'Upper / Lower (5-day)',
        rationale: '5 training days with a general-fitness goal — Upper / Lower (5-day) keeps frequency high without bodybuilding specialization.',
        warningIfAny: null,
        requiresOverride: false,
      };
    }

    // Muscle building default
    if (primaryGoal === 'build_muscle') {
      return {
        familyKey: 'ppl_ul_hybrid_5',
        displayName: 'PPL + Upper / Lower Hybrid',
        rationale: '5 training days with a hypertrophy goal — PPL + Upper / Lower Hybrid balances frequency and recovery.',
        warningIfAny: null,
        requiresOverride: false,
      };
    }

    // Default 5-day
    return {
      familyKey: 'upper_lower_5',
      displayName: 'Upper / Lower (5-day)',
      rationale: '5 training days — Upper / Lower provides balanced frequency across the week.',
      warningIfAny: null,
      requiresOverride: false,
    };
  }

  // 7. 6-day splits (advanced/intermediate only, requires good recovery)
  if (daysPerWeek === 6) {
    // Hard block for beginners
    if (experienceLevel === 'beginner') {
      return {
        familyKey: 'upper_lower_4',
        displayName: 'Upper / Lower',
        rationale: 'Beginner protection — 6 days is not recommended for beginners. Starting with 4-day Upper/Lower.',
        warningIfAny: '6 training days is aggressive for beginners. We strongly recommend 4 days to start.',
        requiresOverride: true,
        overrideReason: '6 days is excessive for beginners',
      };
    }
    
    // High recovery burden check
    if (ageAdjustedBurden === 'high' && !acknowledgeAggressivePlan) {
      return {
        familyKey: 'upper_lower_4',
        displayName: 'Upper / Lower',
        rationale: 'Recovery protection — 6 days requires excellent recovery capacity.',
        warningIfAny: 'Your profile suggests high recovery demands. 6 days may lead to overtraining. Consider 4 days instead.',
        requiresOverride: true,
        overrideReason: '6 days with high recovery burden',
      };
    }

    if (
      !highRecoveryBurden
      && !shortOnTime
    ) {
      if (explicitBodybuildingIntent && preferredSplitFamily === 'arnold_split_6') {
        return {
          familyKey: 'arnold_split_6',
          displayName: 'Arnold Split',
          rationale: '6 training days with explicit bodybuilding intent — Arnold Split is for experienced users who can recover from extra volume.',
          warningIfAny: null,
          requiresOverride: false,
        };
      }

      return {
        familyKey: 'ppl_6',
        displayName: 'Push / Pull / Legs (6-day)',
        rationale: '6 training days with adequate recovery — Push / Pull / Legs (6-day) is the default high-frequency hypertrophy split.',
        warningIfAny: null,
        requiresOverride: false,
      };
    }
  }

  // 8. Score all valid splits
  const eligible = SPLITS.filter((s) => {
    const expOk = EXPERIENCE_ORDER[experienceLevel] >= EXPERIENCE_ORDER[s.minExperience];
    const eqOk = userHasEquipment(equipmentAccess, s.equipmentRequired);
    const daysMin = daysPerWeek >= s.minDays;
    const daysMax = daysPerWeek <= s.maxDays;
    const recoveryOk = !ageAdjustedBurden || RECOVERY_BURDEN_ORDER[ageAdjustedBurden] <= RECOVERY_BURDEN_ORDER[s.maxRecoveryBurden];
    const complexityOk = complexityAllowedForExperience(s.complexity, gateRules.maxComplexity);
    
    if (s.familyKey === 'bodyweight_only_3' && equipmentAccess === 'full_gym') return false;
    if (s.familyKey === 'bro_split_5' && !prefersBodybuilding) return false;
    if (gateRules.blockedWithoutOverride.includes(s.familyKey) && !acknowledgeAggressivePlan) return false;
    
    return expOk && eqOk && daysMin && daysMax && recoveryOk && complexityOk;
  });

  if (!eligible.length) {
    // Ultimate fallback
    return {
      familyKey: 'full_body_beginner_3',
      displayName: 'Full Body',
      rationale: 'Fallback — Full Body fits all profiles.',
      warningIfAny: 'Could not match an ideal split. Using Full Body as a safe default.',
      requiresOverride: false,
    };
  }

  const scored = eligible
    .map((s) => ({
      split: s,
      score: scoreForUser(s, daysPerWeek, experienceLevel, primaryGoal, sessionDurationMin || null, trainingStylePreference, ageAdjustedBurden),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0].split;

  const rationale =
    daysPerWeek >= 4 && experienceLevel === 'beginner'
      ? `${best.displayName} — good volume distribution for beginners training ${daysPerWeek}x/week.`
      : `${best.displayName} — optimal for ${experienceLevel} lifters training ${daysPerWeek}x/week focused on ${primaryGoal.replace(/_/g, ' ')}.`;

  // Warn if Bro Split was picked for intermediate
  const warning =
    best.familyKey === 'bro_split_5' && experienceLevel !== 'advanced'
      ? 'Bro Splits train each muscle 1x/week — research shows 2x/week frequency is superior for hypertrophy for most lifters.'
      : null;

  return { 
    familyKey: best.familyKey, 
    displayName: best.displayName, 
    rationale, 
    warningIfAny: warning,
    requiresOverride: false,
  };
}

// ---------------------------------------------------------------------------
// Helper to check if a split would require override
// ---------------------------------------------------------------------------

export function wouldRequireOverride(
  splitFamilyKey: string,
  input: Omit<SplitSelectorInput, 'preferredSplitFamily'>,
): { requiresOverride: boolean; reason?: string } {
  const split = SPLITS.find(s => s.familyKey === splitFamilyKey);
  if (!split) return { requiresOverride: false };
  
  const gateRules = EXPERIENCE_GATES[input.experienceLevel];
  
  // Check blocked list
  if (gateRules.blockedWithoutOverride.includes(splitFamilyKey)) {
    return { 
      requiresOverride: true, 
      reason: `${split.displayName} is designed for advanced lifters` 
    };
  }
  
  // Check days limit
  if (input.daysPerWeek > gateRules.maxDaysWithoutOverride) {
    return { 
      requiresOverride: true, 
      reason: `${input.daysPerWeek} days exceeds recommended ${gateRules.maxDaysWithoutOverride} days for ${input.experienceLevel} lifters` 
    };
  }
  
  // Check recovery burden
  if (input.recoveryBurden && RECOVERY_BURDEN_ORDER[input.recoveryBurden] > RECOVERY_BURDEN_ORDER[split.maxRecoveryBurden]) {
    return { 
      requiresOverride: true, 
      reason: `${split.displayName} is too demanding for your recovery profile` 
    };
  }
  
  // Check complexity
  if (!complexityAllowedForExperience(split.complexity, gateRules.maxComplexity)) {
    return { 
      requiresOverride: true, 
      reason: `${split.displayName} is too complex for ${input.experienceLevel} lifters` 
    };
  }
  
  return { requiresOverride: false };
}
