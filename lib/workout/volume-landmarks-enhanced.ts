/**
 * volume-landmarks-enhanced.ts
 *
 * Science-Based Volume Landmarks by Experience Level
 * Part of Phase 1: Foundation
 *
 * MEV (Minimum Effective Volume): Minimum sets/week to see progress
 * MAV (Maximum Adaptive Volume): Optimal range for growth
 * MRV (Maximum Recoverable Volume): Maximum sets/week before overreaching
 *
 * Based on research by Mike Israetel (Renaissance Periodization) and
 * meta-analyses by Schoenfeld et al. on dose-response relationships.
 */

import type { ExperienceLevel, RecoveryBurden } from './training-profile.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VolumeTargets = {
  mev: number; // Minimum Effective Volume (sets/week)
  mavLow: number; // Lower bound of Maximum Adaptive Volume
  mavHigh: number; // Upper bound of Maximum Adaptive Volume
  mrv: number; // Maximum Recoverable Volume
};

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'shoulders'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'calves'
  | 'abs'
  | 'traps'
  | 'forearms';

export type VolumeAnalysis = {
  muscle: MuscleGroup;
  currentSets: number;
  target: VolumeTargets;
  status: 'below_mev' | 'in_mav' | 'above_mrv' | 'optimal';
  recommendation: string;
};

// ---------------------------------------------------------------------------
// Volume Landmarks by Experience Level
// ---------------------------------------------------------------------------

/**
 * Scientific rationale for volume progression:
 *
 * BEGINNERS (0-1 year):
 * - Lower MEV: New trainees respond to minimal stimulus
 * - Lower MRV: Poor work capacity, need less volume to fatigue
 * - Focus: Motor learning, technique mastery
 * - Research: Beginners gain on 3-6 sets/week, optimal 8-12
 *
 * INTERMEDIATES (1-3 years):
 * - Higher MEV: Adaptation requires more stimulus
 * - Higher MRV: Better work capacity, can handle more
 * - Focus: Progressive overload, muscle building
 * - Research: 10-20 sets/week optimal for hypertrophy
 *
 * ADVANCED (3+ years):
 * - Highest MEV: Significant stimulus needed to progress
 * - Highest MRV: Years of conditioning enable high volume
 * - Focus: Periodization, intensity techniques
 * - Research: 15-30+ sets/week needed for elite progress
 */
export const VOLUME_LANDMARKS: Record<ExperienceLevel, Record<MuscleGroup, VolumeTargets>> = {
  // ==================== BEGINNER (0-1 year) ====================
  beginner: {
    chest: { mev: 6, mavLow: 8, mavHigh: 12, mrv: 16 },
    back: { mev: 8, mavLow: 10, mavHigh: 14, mrv: 18 },
    quads: { mev: 6, mavLow: 8, mavHigh: 12, mrv: 16 },
    hamstrings: { mev: 4, mavLow: 6, mavHigh: 10, mrv: 14 },
    glutes: { mev: 4, mavLow: 6, mavHigh: 10, mrv: 12 },
    shoulders: { mev: 6, mavLow: 8, mavHigh: 12, mrv: 16 },
    front_delts: { mev: 4, mavLow: 6, mavHigh: 10, mrv: 14 },
    side_delts: { mev: 4, mavLow: 6, mavHigh: 10, mrv: 14 },
    rear_delts: { mev: 4, mavLow: 6, mavHigh: 10, mrv: 14 },
    biceps: { mev: 4, mavLow: 6, mavHigh: 10, mrv: 14 },
    triceps: { mev: 4, mavLow: 6, mavHigh: 10, mrv: 14 },
    calves: { mev: 4, mavLow: 6, mavHigh: 8, mrv: 12 },
    abs: { mev: 2, mavLow: 4, mavHigh: 8, mrv: 12 },
    traps: { mev: 4, mavLow: 6, mavHigh: 10, mrv: 14 },
    forearms: { mev: 2, mavLow: 4, mavHigh: 8, mrv: 12 },
  },

  // ==================== INTERMEDIATE (1-3 years) ====================
  intermediate: {
    chest: { mev: 10, mavLow: 12, mavHigh: 18, mrv: 22 },
    back: { mev: 12, mavLow: 14, mavHigh: 20, mrv: 24 },
    quads: { mev: 10, mavLow: 12, mavHigh: 18, mrv: 22 },
    hamstrings: { mev: 8, mavLow: 10, mavHigh: 16, mrv: 20 },
    glutes: { mev: 6, mavLow: 8, mavHigh: 14, mrv: 18 },
    shoulders: { mev: 10, mavLow: 12, mavHigh: 18, mrv: 22 },
    front_delts: { mev: 6, mavLow: 8, mavHigh: 14, mrv: 18 },
    side_delts: { mev: 8, mavLow: 10, mavHigh: 16, mrv: 20 },
    rear_delts: { mev: 6, mavLow: 8, mavHigh: 14, mrv: 18 },
    biceps: { mev: 8, mavLow: 10, mavHigh: 14, mrv: 20 },
    triceps: { mev: 8, mavLow: 10, mavHigh: 14, mrv: 20 },
    calves: { mev: 6, mavLow: 8, mavHigh: 12, mrv: 16 },
    abs: { mev: 4, mavLow: 6, mavHigh: 10, mrv: 14 },
    traps: { mev: 6, mavLow: 8, mavHigh: 14, mrv: 18 },
    forearms: { mev: 4, mavLow: 6, mavHigh: 10, mrv: 14 },
  },

  // ==================== ADVANCED (3+ years) ====================
  advanced: {
    chest: { mev: 12, mavLow: 16, mavHigh: 24, mrv: 28 },
    back: { mev: 14, mavLow: 18, mavHigh: 26, mrv: 32 },
    quads: { mev: 12, mavLow: 16, mavHigh: 24, mrv: 28 },
    hamstrings: { mev: 10, mavLow: 14, mavHigh: 20, mrv: 26 },
    glutes: { mev: 8, mavLow: 12, mavHigh: 18, mrv: 24 },
    shoulders: { mev: 12, mavLow: 16, mavHigh: 22, mrv: 28 },
    front_delts: { mev: 8, mavLow: 10, mavHigh: 16, mrv: 22 },
    side_delts: { mev: 10, mavLow: 12, mavHigh: 18, mrv: 24 },
    rear_delts: { mev: 8, mavLow: 10, mavHigh: 16, mrv: 22 },
    biceps: { mev: 10, mavLow: 12, mavHigh: 18, mrv: 24 },
    triceps: { mev: 10, mavLow: 12, mavHigh: 18, mrv: 24 },
    calves: { mev: 8, mavLow: 10, mavHigh: 14, mrv: 20 },
    abs: { mev: 6, mavLow: 8, mavHigh: 14, mrv: 18 },
    traps: { mev: 8, mavLow: 10, mavHigh: 16, mrv: 22 },
    forearms: { mev: 6, mavLow: 8, mavHigh: 12, mrv: 16 },
  },
};

// ---------------------------------------------------------------------------
// Recovery Burden Adjustments
// ---------------------------------------------------------------------------

/**
 * Recovery multipliers based on lifestyle factors
 * High recovery burden reduces safe volume capacity
 */
export const RECOVERY_MULTIPLIERS: Record<RecoveryBurden, number> = {
  low: 1.0, // Can handle full volume
  moderate: 0.85, // Reduce 15%
  high: 0.7, // Reduce 30%
};

/**
 * Additional factors that reduce volume capacity
 */
export const VOLUME_REDUCTION_FACTORS = {
  sleep: {
    'less_than_6h': 0.85, // -15%
    '6_to_7h': 0.95, // -5%
    '7_plus': 1.0,
  },
  stress: {
    high: 0.9, // -10%
    moderate: 0.95, // -5%
    low: 1.0,
  },
  age: {
    'under_30': 1.0,
    '30_to_40': 0.95, // -5%
    '40_to_50': 0.9, // -10%
    'over_50': 0.85, // -15%
  },
};

// ---------------------------------------------------------------------------
// Volume Calculation Functions
// ---------------------------------------------------------------------------

export function getVolumeTargets(
  muscleGroup: MuscleGroup,
  experienceLevel: ExperienceLevel,
  recoveryBurden: RecoveryBurden = 'low'
): VolumeTargets {
  const base = VOLUME_LANDMARKS[experienceLevel][muscleGroup];
  const multiplier = RECOVERY_MULTIPLIERS[recoveryBurden];

  return {
    mev: Math.round(base.mev * multiplier),
    mavLow: Math.round(base.mavLow * multiplier),
    mavHigh: Math.round(base.mavHigh * multiplier),
    mrv: Math.round(base.mrv * multiplier),
  };
}

export function analyzeMuscleVolume(
  muscle: MuscleGroup,
  currentSets: number,
  experienceLevel: ExperienceLevel,
  recoveryBurden: RecoveryBurden = 'low'
): VolumeAnalysis {
  const target = getVolumeTargets(muscle, experienceLevel, recoveryBurden);

  let status: VolumeAnalysis['status'];
  let recommendation: string;

  if (currentSets < target.mev) {
    status = 'below_mev';
    const setsNeeded = target.mev - currentSets;
    recommendation = `Add ${setsNeeded} sets/week to reach minimum effective volume (${target.mev} sets)`;
  } else if (currentSets > target.mrv) {
    status = 'above_mrv';
    const setsToRemove = currentSets - target.mrv;
    recommendation = `Reduce by ${setsToRemove} sets/week to avoid overreaching (max: ${target.mrv} sets)`;
  } else if (currentSets >= target.mavLow && currentSets <= target.mavHigh) {
    status = 'optimal';
    recommendation = 'Volume is in optimal range for progress';
  } else {
    status = 'in_mav';
    if (currentSets < target.mavLow) {
      const setsToAdd = target.mavLow - currentSets;
      recommendation = `Consider adding ${setsToAdd} sets to reach optimal range (${target.mavLow}-${target.mavHigh})`;
    } else {
      recommendation = `Volume is acceptable but approaching maximum (${target.mrv} sets)`;
    }
  }

  return { muscle, currentSets, target, status, recommendation };
}

// ---------------------------------------------------------------------------
// Weekly Volume Analysis
// ---------------------------------------------------------------------------

export type WeeklyVolumeReport = {
  analyses: VolumeAnalysis[];
  summary: {
    totalSets: number;
    musclesBelowMEV: MuscleGroup[];
    musclesInOptimalRange: MuscleGroup[];
    musclesAboveMRV: MuscleGroup[];
    averageStatus: number; // 0-100 score
  };
  recommendations: string[];
};

export function analyzeWeeklyVolume(
  muscleVolumes: Partial<Record<MuscleGroup, number>>,
  experienceLevel: ExperienceLevel,
  recoveryBurden: RecoveryBurden = 'low'
): WeeklyVolumeReport {
  const analyses: VolumeAnalysis[] = [];
  const musclesBelowMEV: MuscleGroup[] = [];
  const musclesInOptimalRange: MuscleGroup[] = [];
  const musclesAboveMRV: MuscleGroup[] = [];
  let totalSets = 0;
  let score = 0;

  const muscleGroups = Object.keys(VOLUME_LANDMARKS.beginner) as MuscleGroup[];

  for (const muscle of muscleGroups) {
    const currentSets = muscleVolumes[muscle] || 0;
    totalSets += currentSets;

    const analysis = analyzeMuscleVolume(muscle, currentSets, experienceLevel, recoveryBurden);
    analyses.push(analysis);

    switch (analysis.status) {
      case 'below_mev':
        musclesBelowMEV.push(muscle);
        score += 25;
        break;
      case 'optimal':
        musclesInOptimalRange.push(muscle);
        score += 100;
        break;
      case 'in_mav':
        score += 75;
        break;
      case 'above_mrv':
        musclesAboveMRV.push(muscle);
        score += 50;
        break;
    }
  }

  const averageStatus = Math.round(score / muscleGroups.length);

  // Generate overall recommendations
  const recommendations: string[] = [];

  if (musclesBelowMEV.length > 0) {
    recommendations.push(
      `Increase volume for: ${musclesBelowMEV.join(', ')} (below minimum effective volume)`
    );
  }

  if (musclesAboveMRV.length > 0) {
    recommendations.push(
      `Reduce volume for: ${musclesAboveMRV.join(', ')} (risk of overreaching)`
    );
  }

  if (musclesBelowMEV.length === 0 && musclesAboveMRV.length === 0) {
    recommendations.push('Volume distribution looks good! Maintain current programming.');
  }

  // Add posterior chain check
  const quadVolume = muscleVolumes['quads'] || 0;
  const hamVolume = muscleVolumes['hamstrings'] || 0;
  const gluteVolume = muscleVolumes['glutes'] || 0;
  const posteriorVolume = hamVolume + gluteVolume;

  const posteriorRatio = quadVolume > 0 ? posteriorVolume / quadVolume : 0;
  const targetRatio = experienceLevel === 'beginner' ? 0.7 : experienceLevel === 'intermediate' ? 0.8 : 0.9;

  if (posteriorRatio < targetRatio) {
    recommendations.push(
      `Posterior chain volume (${posteriorVolume} sets) is ${Math.round(posteriorRatio * 100)}% of quad volume. ` +
      `Target: ${Math.round(targetRatio * 100)}% for balanced development.`
    );
  }

  return {
    analyses,
    summary: {
      totalSets,
      musclesBelowMEV,
      musclesInOptimalRange,
      musclesAboveMRV,
      averageStatus,
    },
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Volume Presets for Common Splits
// ---------------------------------------------------------------------------

export const SPLIT_VOLUME_PRESETS: Record<string, Record<ExperienceLevel, Partial<Record<MuscleGroup, number>>>> = {
  'full_body_3': {
    beginner: {
      quads: 9, hamstrings: 6, glutes: 6,
      chest: 9, back: 9,
      shoulders: 6, biceps: 4, triceps: 4,
    },
    intermediate: {
      quads: 12, hamstrings: 10, glutes: 8,
      chest: 12, back: 14,
      shoulders: 10, biceps: 8, triceps: 8,
    },
    advanced: {
      quads: 16, hamstrings: 14, glutes: 12,
      chest: 16, back: 18,
      shoulders: 14, biceps: 10, triceps: 10,
    },
  },
  'upper_lower_4': {
    beginner: {
      quads: 8, hamstrings: 6, glutes: 6,
      chest: 10, back: 12,
      shoulders: 8, biceps: 6, triceps: 6,
    },
    intermediate: {
      quads: 12, hamstrings: 10, glutes: 8,
      chest: 14, back: 16,
      shoulders: 12, biceps: 10, triceps: 10,
    },
    advanced: {
      quads: 16, hamstrings: 14, glutes: 12,
      chest: 18, back: 20,
      shoulders: 16, biceps: 12, triceps: 12,
    },
  },
  'ppl_6': {
    beginner: {
      // Not recommended for beginners - but if used
      quads: 10, hamstrings: 8, glutes: 6,
      chest: 12, back: 14,
      shoulders: 10, biceps: 8, triceps: 8,
    },
    intermediate: {
      quads: 14, hamstrings: 12, glutes: 10,
      chest: 16, back: 18,
      shoulders: 14, biceps: 12, triceps: 12,
    },
    advanced: {
      quads: 20, hamstrings: 18, glutes: 16,
      chest: 22, back: 24,
      shoulders: 20, biceps: 16, triceps: 16,
    },
  },
};

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

export function getOptimalSetRange(
  muscle: MuscleGroup,
  experienceLevel: ExperienceLevel,
  recoveryBurden: RecoveryBurden = 'low'
): string {
  const targets = getVolumeTargets(muscle, experienceLevel, recoveryBurden);
  return `${targets.mavLow}-${targets.mavHigh} sets/week`;
}

export function isVolumeAppropriate(
  muscle: MuscleGroup,
  sets: number,
  experienceLevel: ExperienceLevel,
  recoveryBurden: RecoveryBurden = 'low'
): { appropriate: boolean; message: string } {
  const analysis = analyzeMuscleVolume(muscle, sets, experienceLevel, recoveryBurden);

  if (analysis.status === 'below_mev') {
    return { appropriate: false, message: analysis.recommendation };
  }
  if (analysis.status === 'above_mrv') {
    return { appropriate: false, message: analysis.recommendation };
  }

  return { appropriate: true, message: analysis.recommendation };
}
