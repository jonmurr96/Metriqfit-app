// =====================================================
// MetriqFit Elite - Level System Definitions
// =====================================================

import type { LevelInfo, TierName } from '@/types/gamification';

// =====================================================
// LEVEL THRESHOLDS
// =====================================================

export const LEVEL_THRESHOLDS: readonly number[] = [
  0, // Level 1 (Rookie 1)
  500, // Level 2 (Rookie 2)
  1200, // Level 3 (Rookie 3)
  2000, // Level 4 (Rookie 4)
  3000, // Level 5 (Rookie 5)
  4200, // Level 6 (Builder 1)
  5600, // Level 7 (Builder 2)
  7200, // Level 8 (Builder 3)
  9000, // Level 9 (Builder 4)
  11000, // Level 10 (Builder 5)
  13500, // Level 11 (Athlete 1)
  16200, // Level 12 (Athlete 2)
  19200, // Level 13 (Athlete 3)
  22500, // Level 14 (Athlete 4)
  26000, // Level 15 (Athlete 5)
  30000, // Level 16 (Elite 1)
  34500, // Level 17 (Elite 2)
  39500, // Level 18 (Elite 3)
  45000, // Level 19 (Elite 4)
  51000, // Level 20 (Elite 5)
  58000, // Level 21 (Legend 1)
  65500, // Level 22 (Legend 2)
  73500, // Level 23 (Legend 3)
  82000, // Level 24 (Legend 4)
  91000, // Level 25 (Legend 5)
  101000, // Level 26 (Master 1)
  112000, // Level 27 (Master 2)
  124000, // Level 28 (Master 3)
  137000, // Level 29 (Master 4)
  151000, // Level 30 (Master 5)
] as const;

// =====================================================
// TIER DEFINITIONS
// =====================================================

export const TIER_NAMES: Record<number, TierName> = {
  1: 'Rookie',
  2: 'Builder',
  3: 'Athlete',
  4: 'Elite',
  5: 'Legend',
  6: 'Master',
};

export const TIER_DESCRIPTIONS: Record<TierName, string> = {
  Rookie: 'Building the foundation',
  Builder: 'Consistency builds strength',
  Athlete: 'Performance accelerates',
  Elite: 'Top tier performance',
  Legend: 'Legendary status',
  Master: 'Ultimate mastery',
};

export const TIER_LEVEL_RANGES: Record<TierName, [number, number]> = {
  Rookie: [1, 5],
  Builder: [6, 10],
  Athlete: [11, 15],
  Elite: [16, 20],
  Legend: [21, 25],
  Master: [26, 30],
};

// =====================================================
// LEVEL DESCRIPTIONS
// =====================================================

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: 'Starting your fitness journey',
  2: 'Building consistency',
  3: 'Form is becoming second nature',
  4: 'Learning the science',
  5: 'Habits are forming',
  6: 'Constructing your physique',
  7: 'Laying the groundwork',
  8: 'Progress is visible',
  9: 'Strong foundation set',
  10: 'Built to last',
  11: 'Training like a pro',
  12: 'Moving with power',
  13: 'Pushing past limits',
  14: 'Peak performance mode',
  15: 'Athletic excellence',
  16: 'Top 10% of all users',
  17: 'Mastery in motion',
  18: 'Your body is a weapon',
  19: 'Exceptional discipline',
  20: 'Elite status confirmed',
  21: 'Writing your legacy',
  22: 'Defying natural limits',
  23: 'Legendary status achieved',
  24: 'Among the greatest',
  25: 'Legendary performance',
  26: 'Transcending limits',
  27: 'Godlike discipline',
  28: 'Forever elite',
  29: 'No ceiling exists',
  30: 'Ultimate mastery achieved',
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get tier index from level (1-6)
 */
export function getTierIndex(level: number): number {
  return Math.min(Math.ceil(level / 5), 6);
}

/**
 * Get tier name from level
 */
export function getTierName(level: number): TierName {
  const tierIndex = getTierIndex(level);
  return TIER_NAMES[tierIndex] || 'Master';
}

/**
 * Get tier number within tier (1-5)
 */
export function getTierNumber(level: number): number {
  return ((level - 1) % 5) + 1;
}

/**
 * Get full level name (e.g., "Athlete 2")
 */
export function getLevelName(level: number): string {
  const tierName = getTierName(level);
  const tierNumber = getTierNumber(level);
  return `${tierName} ${tierNumber}`;
}

/**
 * Get level description
 */
export function getLevelDescription(level: number): string {
  return LEVEL_DESCRIPTIONS[level] || 'Training hard';
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXP(totalXP: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, 30);
}

/**
 * Get complete level info from level number
 */
export function getLevelInfo(level: number): LevelInfo {
  const clampedLevel = Math.max(1, Math.min(level, 30));
  const tierName = getTierName(clampedLevel);
  const tierNumber = getTierNumber(clampedLevel);
  const levelName = getLevelName(clampedLevel);

  const xpThreshold = LEVEL_THRESHOLDS[clampedLevel - 1] || 0;
  const xpForNextLevel =
    clampedLevel < 30 ? LEVEL_THRESHOLDS[clampedLevel] : LEVEL_THRESHOLDS[29];
  const xpNeeded = xpForNextLevel - xpThreshold;

  return {
    level: clampedLevel,
    level_name: levelName,
    tier_name: tierName,
    tier_number: tierNumber,
    description: getLevelDescription(clampedLevel),
    xp_threshold: xpThreshold,
    xp_for_next_level: xpForNextLevel,
    xp_needed: xpNeeded,
    is_max_level: clampedLevel >= 30,
  };
}

/**
 * Get complete level info from total XP
 */
export function getLevelInfoFromXP(totalXP: number): LevelInfo {
  const level = getLevelFromXP(totalXP);
  return getLevelInfo(level);
}

/**
 * Calculate XP needed for next level
 */
export function getXPNeededForNextLevel(currentXP: number, currentLevel: number): number {
  if (currentLevel >= 30) return 0;

  const nextThreshold = LEVEL_THRESHOLDS[currentLevel];
  return Math.max(0, nextThreshold - currentXP);
}

/**
 * Calculate progress percentage to next level
 */
export function getProgressPercentage(currentXP: number, currentLevel: number): number {
  if (currentLevel >= 30) return 100;

  const currentThreshold = LEVEL_THRESHOLDS[currentLevel - 1];
  const nextThreshold = LEVEL_THRESHOLDS[currentLevel];
  const xpInLevel = currentXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;

  if (xpNeeded === 0) return 100;

  return Math.min(Math.round((xpInLevel / xpNeeded) * 100), 100);
}

/**
 * Check if leveling up crossed a tier boundary
 */
export function isTierUp(oldLevel: number, newLevel: number): boolean {
  const oldTier = getTierIndex(oldLevel);
  const newTier = getTierIndex(newLevel);
  return newTier > oldTier;
}

/**
 * Get all levels in a tier
 */
export function getLevelsInTier(tierName: TierName): number[] {
  const [start, end] = TIER_LEVEL_RANGES[tierName];
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Get tier description
 */
export function getTierDescription(tierName: TierName): string {
  return TIER_DESCRIPTIONS[tierName] || '';
}

/**
 * Check if user is at max level
 */
export function isMaxLevel(level: number): boolean {
  return level >= 30;
}

/**
 * Get milestone levels (tier boundaries)
 */
export function getMilestoneLevels(): number[] {
  return [5, 10, 15, 20, 25, 30]; // End of each tier
}

/**
 * Check if level is a milestone
 */
export function isMilestoneLevel(level: number): boolean {
  return getMilestoneLevels().includes(level);
}

/**
 * Get next milestone level
 */
export function getNextMilestone(currentLevel: number): number | null {
  const milestones = getMilestoneLevels();
  const nextMilestone = milestones.find((m) => m > currentLevel);
  return nextMilestone || null;
}

/**
 * Get levels until next tier
 */
export function getLevelsUntilNextTier(currentLevel: number): number {
  if (currentLevel >= 30) return 0;

  const currentTierNumber = getTierNumber(currentLevel);
  return 6 - currentTierNumber; // 6 because tier numbers are 1-5, and we want levels until tier 1 of next
}
