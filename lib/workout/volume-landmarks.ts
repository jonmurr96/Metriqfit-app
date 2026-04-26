/**
 * volume-landmarks.ts
 *
 * Volume Landmarks System for Sprint 3
 * 
 * Defines weekly volume targets (MV, MEV, MAV, MRV) per experience level
 * and muscle group. Enforces volume constraints based on recovery burden.
 * 
 * Volume Landmarks (based on scientific literature and practical experience):
 * - MV (Maintenance Volume): Minimum to maintain muscle
 * - MEV (Minimum Effective Volume): Minimum to grow
 * - MAV (Maximum Adaptive Volume): Optimal range for growth
 * - MRV (Maximum Recoverable Volume): Upper limit before overreaching
 */

import type { ExperienceLevel, RecoveryBurden } from './training-profile.ts';

// ---------------------------------------------------------------------------
// Volume Landmark Types
// ---------------------------------------------------------------------------

export type VolumeLandmark = {
  /** Minimum to maintain (Maintenance Volume) */
  mv: number;
  /** Minimum to grow (Minimum Effective Volume) */
  mev: number;
  /** Lower bound of optimal range (MAV-) */
  mavLow: number;
  /** Upper bound of optimal range (MAV+) */
  mavHigh: number;
  /** Maximum recoverable (Maximum Recoverable Volume) */
  mrv: number;
};

export type MuscleGroup = 
  | 'chest' | 'back' | 'shoulders' | 'quads' | 'hamstrings' 
  | 'glutes' | 'biceps' | 'triceps' | 'calves' | 'abs' 
  | 'forearms' | 'traps' | 'rear_delts';

export type VolumeTargets = Record<MuscleGroup, VolumeLandmark>;

// ---------------------------------------------------------------------------
// Volume Landmarks by Experience Level
// 
// Based on:
// - Helms et al. "The Muscle and Strength Pyramid"
// - Israetel et al. "Scientific Principles of Hypertrophy Training"
// - Practical adjustments for app-based training compliance
// ---------------------------------------------------------------------------

const BEGINNER_VOLUME: VolumeLandmark = {
  mv: 4,    // 4 sets/week maintains
  mev: 6,   // 6 sets/week minimum to grow
  mavLow: 8,
  mavHigh: 12, // Optimal: 8-12 sets
  mrv: 16,  // Cap at 16 sets/week
};

const INTERMEDIATE_VOLUME: VolumeLandmark = {
  mv: 6,
  mev: 10,
  mavLow: 12,
  mavHigh: 18,
  mrv: 22,
};

const ADVANCED_VOLUME: VolumeLandmark = {
  mv: 8,
  mev: 12,
  mavLow: 16,
  mavHigh: 22,
  mrv: 28,
};

// ---------------------------------------------------------------------------
// Per-Muscle Group Volume Targets
// 
// Multipliers adjust base volume based on:
// - Muscle size (larger = more volume tolerance)
// - Recovery demands (lower back = higher systemic fatigue)
// - Practical considerations
// ---------------------------------------------------------------------------

const MUSCLE_GROUP_MULTIPLIERS: Record<MuscleGroup, number> = {
  // Large muscle groups - can handle more volume
  back: 1.2,      // Large, can tolerate high volume
  quads: 1.2,     // Large, high work capacity
  chest: 1.1,     // Moderate-large
  
  // Medium muscle groups
  shoulders: 1.0,
  hamstrings: 1.0,
  glutes: 1.0,
  traps: 0.9,
  
  // Small muscle groups - less volume needed
  biceps: 0.8,
  triceps: 0.8,
  rear_delts: 0.7,
  calves: 0.7,
  abs: 0.6,
  forearms: 0.5,
};

// ---------------------------------------------------------------------------
// Recovery Burden Adjustments
// ---------------------------------------------------------------------------

const RECOVERY_VOLUME_MULTIPLIER: Record<RecoveryBurden, number> = {
  low: 1.0,       // Full volume
  moderate: 0.85, // 15% reduction
  high: 0.70,     // 30% reduction
};

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function applyMultiplier(landmark: VolumeLandmark, multiplier: number): VolumeLandmark {
  return {
    mv: Math.round(landmark.mv * multiplier),
    mev: Math.round(landmark.mev * multiplier),
    mavLow: Math.round(landmark.mavLow * multiplier),
    mavHigh: Math.round(landmark.mavHigh * multiplier),
    mrv: Math.round(landmark.mrv * multiplier),
  };
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Get volume landmarks for a specific muscle group and experience level
 */
export function getVolumeLandmark(
  muscleGroup: MuscleGroup,
  experienceLevel: ExperienceLevel,
  recoveryBurden: RecoveryBurden = 'moderate'
): VolumeLandmark {
  // Get base volume for experience level
  const baseVolume = experienceLevel === 'beginner' 
    ? BEGINNER_VOLUME 
    : experienceLevel === 'intermediate' 
    ? INTERMEDIATE_VOLUME 
    : ADVANCED_VOLUME;
  
  // Apply muscle group multiplier
  const muscleMultiplier = MUSCLE_GROUP_MULTIPLIERS[muscleGroup] ?? 1.0;
  const muscleAdjusted = applyMultiplier(baseVolume, muscleMultiplier);
  
  // Apply recovery burden adjustment
  const recoveryMultiplier = RECOVERY_VOLUME_MULTIPLIER[recoveryBurden];
  const finalVolume = applyMultiplier(muscleAdjusted, recoveryMultiplier);
  
  return finalVolume;
}

/**
 * Get all volume targets for a user profile
 */
export function getVolumeTargets(
  experienceLevel: ExperienceLevel,
  recoveryBurden: RecoveryBurden = 'moderate'
): VolumeTargets {
  const targets = {} as VolumeTargets;
  
  (Object.keys(MUSCLE_GROUP_MULTIPLIERS) as MuscleGroup[]).forEach((muscle) => {
    targets[muscle] = getVolumeLandmark(muscle, experienceLevel, recoveryBurden);
  });
  
  return targets;
}

// ---------------------------------------------------------------------------
// Weekly Volume Analysis
// ---------------------------------------------------------------------------

export type MuscleVolumeStatus = {
  muscle: MuscleGroup;
  currentSets: number;
  target: VolumeLandmark;
  status: 'below_mev' | 'in_mav' | 'above_mrv' | 'maintenance';
  recommendation: string;
};

export type WeeklyVolumeAnalysis = {
  muscleVolumes: Record<MuscleGroup, number>;
  statusByMuscle: MuscleVolumeStatus[];
  totalWeeklySets: number;
  averageSetsPerDay: number;
  recoveryRisk: 'low' | 'moderate' | 'high';
  recommendations: string[];
};

/**
 * Analyze weekly volume against landmarks
 */
export function analyzeWeeklyVolume(
  muscleVolumes: Record<MuscleGroup, number>,
  experienceLevel: ExperienceLevel,
  recoveryBurden: RecoveryBurden,
  daysPerWeek: number
): WeeklyVolumeAnalysis {
  const targets = getVolumeTargets(experienceLevel, recoveryBurden);
  const statusByMuscle: MuscleVolumeStatus[] = [];
  let totalWeeklySets = 0;
  let musclesAboveMRV = 0;
  let musclesBelowMEV = 0;
  
  (Object.keys(targets) as MuscleGroup[]).forEach((muscle) => {
    const currentSets = muscleVolumes[muscle] || 0;
    const target = targets[muscle];
    totalWeeklySets += currentSets;
    
    let status: MuscleVolumeStatus['status'];
    let recommendation: string;
    
    if (currentSets === 0) {
      status = 'below_mev';
      recommendation = `Consider adding ${target.mev} sets/week for ${muscle}`;
    } else if (currentSets < target.mev) {
      status = 'below_mev';
      recommendation = `Increase ${muscle} from ${currentSets} to ${target.mev}-${target.mavLow} sets`;
      musclesBelowMEV++;
    } else if (currentSets > target.mrv) {
      status = 'above_mrv';
      recommendation = `Reduce ${muscle} from ${currentSets} to ${target.mavHigh} sets max`;
      musclesAboveMRV++;
    } else if (currentSets >= target.mavLow && currentSets <= target.mavHigh) {
      status = 'in_mav';
      recommendation = `${muscle} volume is optimal`;
    } else if (currentSets < target.mv) {
      status = 'maintenance';
      recommendation = `${muscle} is in maintenance range`;
    } else {
      status = 'in_mav';
      recommendation = `${muscle} volume is acceptable`;
    }
    
    statusByMuscle.push({ muscle, currentSets, target, status, recommendation });
  });
  
  // Determine recovery risk
  let recoveryRisk: WeeklyVolumeAnalysis['recoveryRisk'];
  if (musclesAboveMRV >= 2 || totalWeeklySets > daysPerWeek * 20) {
    recoveryRisk = 'high';
  } else if (musclesAboveMRV === 1 || totalWeeklySets > daysPerWeek * 16) {
    recoveryRisk = 'moderate';
  } else {
    recoveryRisk = 'low';
  }
  
  // Generate overall recommendations
  const recommendations: string[] = [];
  
  if (musclesAboveMRV > 0) {
    recommendations.push(`${musclesAboveMRV} muscle group(s) exceed Maximum Recoverable Volume. Consider reducing volume.`);
  }
  
  if (musclesBelowMEV > 0) {
    recommendations.push(`${musclesBelowMEV} muscle group(s) below Minimum Effective Volume. Consider adding targeted work.`);
  }
  
  if (recoveryRisk === 'high') {
    recommendations.push('High recovery risk detected. Monitor fatigue closely and ensure adequate sleep/nutrition.');
  }
  
  return {
    muscleVolumes,
    statusByMuscle,
    totalWeeklySets,
    averageSetsPerDay: Math.round(totalWeeklySets / daysPerWeek),
    recoveryRisk,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Volume Planning Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate target sets per muscle for a given split
 */
export function calculateTargetSetsPerMuscle(
  splitDays: number,
  experienceLevel: ExperienceLevel,
  recoveryBurden: RecoveryBurden
): Record<MuscleGroup, number> {
  const targets = getVolumeTargets(experienceLevel, recoveryBurden);
  const result = {} as Record<MuscleGroup, number>;
  
  // Frequency factor: more days = can split volume more
  const frequencyFactor = Math.min(splitDays / 3, 1.2);
  
  (Object.keys(targets) as MuscleGroup[]).forEach((muscle) => {
    const landmark = targets[muscle];
    // Target MAV- (lower end of optimal) as default
    result[muscle] = Math.round(landmark.mavLow * frequencyFactor);
  });
  
  return result;
}

/**
 * Check if a weekly volume plan is appropriate
 */
export function validateVolumePlan(
  plannedVolumes: Record<MuscleGroup, number>,
  experienceLevel: ExperienceLevel,
  recoveryBurden: RecoveryBurden
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const targets = getVolumeTargets(experienceLevel, recoveryBurden);
  
  (Object.keys(targets) as MuscleGroup[]).forEach((muscle) => {
    const planned = plannedVolumes[muscle] || 0;
    const target = targets[muscle];
    
    if (planned > target.mrv) {
      issues.push(`${muscle}: ${planned} sets exceeds MRV (${target.mrv})`);
    }
    
    // Warn if significantly below MEV for major muscle groups
    if ((muscle === 'chest' || muscle === 'back' || muscle === 'quads') && planned < target.mev) {
      issues.push(`${muscle}: ${planned} sets is below MEV (${target.mev})`);
    }
  });
  
  return { valid: issues.length === 0, issues };
}
