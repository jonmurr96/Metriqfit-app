// =====================================================
// MetriqFit Elite - Gamification Type Definitions
// =====================================================

// =====================================================
// STREAK TYPES
// =====================================================

export type StreakType = 'fitness' | 'workout' | 'nutrition' | 'hydration' | 'weigh_in';

export interface UserStreak {
  id: string;
  user_id: string;
  streak_type: StreakType;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  freeze_tokens: number;
  created_at: string;
  updated_at: string;
}

export interface StreakFreeze {
  id: string;
  user_id: string;
  streak_type: StreakType;
  frozen_date: string;
  created_at: string;
}

export interface StreakUpdateResult {
  streak_type: StreakType;
  current_streak: number;
  longest_streak: number;
  is_new_record: boolean;
  freeze_used: boolean;
  freeze_tokens_remaining: number;
  status: 'continued' | 'broken' | 'frozen' | 'started';
}

// =====================================================
// XP & LEVEL TYPES
// =====================================================

export interface UserXPLevel {
  id: string;
  user_id: string;
  current_level: number;
  current_xp: number;
  total_xp_earned: number;
  level_up_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface XPEvent {
  id: string;
  user_id: string;
  event_type: string;
  xp_amount: number;
  multiplier: number;
  final_xp: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export type XPEventType =
  | 'workout_completed'
  | 'workout_on_time'
  | 'all_sets_completed'
  | 'pr_achieved'
  | 'meal_logged'
  | 'daily_calories_met'
  | 'daily_macros_met'
  | 'water_goal_hit'
  | 'weight_logged'
  | 'progress_photo'
  | 'seven_day_streak'
  | 'thirty_day_streak'
  | 'perfect_week'
  | 'app_checkin'
  | 'ai_coach_interaction'
  | 'plan_regeneration';

export interface XPAwardResult {
  xp_awarded: number;
  level_up: boolean;
  new_level?: number;
  new_level_name?: string;
  new_tier?: string;
  tier_up?: boolean; // Crossed tier boundary (e.g., Rookie → Builder)
  achievements_unlocked?: Achievement[];
  total_xp: number;
  xp_to_next_level: number;
}

export interface LevelInfo {
  level: number;
  level_name: string; // e.g., "Athlete 2"
  tier_name: string; // e.g., "Athlete"
  tier_number: number; // 1-5 within tier
  description: string;
  xp_threshold: number;
  xp_for_next_level: number;
  xp_needed: number;
  is_max_level: boolean;
}

export type TierName = 'Rookie' | 'Builder' | 'Athlete' | 'Elite' | 'Legend' | 'Master';

// =====================================================
// ACHIEVEMENT TYPES
// =====================================================

export type AchievementCategory =
  | 'milestone'
  | 'streak'
  | 'consistency'
  | 'pr'
  | 'nutrition'
  | 'transformation'
  | 'elite'
  | 'hidden';

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type AchievementTier = 'free' | 'elite';

export interface AchievementDefinition {
  id: string;
  external_id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon_name: string;
  xp_reward: number;
  tier: AchievementTier;
  rarity: AchievementRarity;
  unlock_condition: Record<string, any>;
  is_hidden: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress_percentage: number;
  metadata?: Record<string, any>;
  // Populated via join
  achievement?: AchievementDefinition;
}

export interface Achievement extends AchievementDefinition {
  unlocked: boolean;
  unlocked_at?: string;
  progress_percentage?: number;
}

// =====================================================
// DISPLAY TYPES
// =====================================================

export interface StreakDisplay {
  type: StreakType;
  label: string;
  icon: string;
  current: number;
  longest: number;
  color: string;
  is_active: boolean;
  days_until_milestone: number;
  next_milestone: number;
}

export interface LevelProgressDisplay {
  current_level: number;
  level_name: string;
  tier_name: TierName;
  tier_number: number;
  current_xp: number;
  xp_to_next_level: number;
  xp_for_next_level: number;
  progress_percentage: number;
  is_max_level: boolean;
}

export interface AchievementBadgeDisplay {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: AchievementRarity;
  unlocked: boolean;
  unlocked_at?: string;
  xp_reward: number;
  is_hidden: boolean;
  progress_percentage?: number;
}

// =====================================================
// GAMIFICATION SERVICE TYPES
// =====================================================

export interface GamificationSummary {
  level: LevelProgressDisplay;
  streaks: StreakDisplay[];
  recent_achievements: Achievement[];
  total_achievements_unlocked: number;
  total_achievements_available: number;
  xp_earned_today: number;
  xp_earned_this_week: number;
}

export interface WeeklyRecapData {
  week_start: string;
  week_end: string;
  xp_earned: number;
  achievements_unlocked: Achievement[];
  streaks_maintained: StreakDisplay[];
  workouts_completed: number;
  meals_logged: number;
  water_goals_hit: number;
  level_ups: number;
  new_level?: number;
  new_tier?: TierName;
}

// =====================================================
// CONSTANTS
// =====================================================

export const LEVEL_THRESHOLDS: number[] = [
  0, 500, 1200, 2000, 3000, 4200, 5600, 7200, 9000, 11000,
  13500, 16200, 19200, 22500, 26000, 30000, 34500, 39500, 45000, 51000,
  58000, 65500, 73500, 82000, 91000, 101000, 112000, 124000, 137000, 151000,
];

export const TIER_NAMES: Record<number, TierName> = {
  1: 'Rookie',
  2: 'Builder',
  3: 'Athlete',
  4: 'Elite',
  5: 'Legend',
  6: 'Master',
};

export const STREAK_LABELS: Record<StreakType, string> = {
  fitness: 'Fitness',
  workout: 'Workout',
  nutrition: 'Nutrition',
  hydration: 'Hydration',
  weigh_in: 'Weigh-In',
};

export const STREAK_ICONS: Record<StreakType, string> = {
  fitness: 'flame',
  workout: 'barbell',
  nutrition: 'restaurant',
  hydration: 'water',
  weigh_in: 'scale',
};

export const RARITY_COLORS: Record<AchievementRarity, string> = {
  common: '#FFFFFF',
  rare: '#22D3EE', // Cyan
  epic: '#A78BFA', // Purple
  legendary: '#FBBF24', // Gold
};

export const RARITY_LABELS: Record<AchievementRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

// =====================================================
// XP EVENT VALUES
// =====================================================

export const XP_VALUES: Record<XPEventType, number> = {
  workout_completed: 100,
  workout_on_time: 25,
  all_sets_completed: 25,
  pr_achieved: 150, // Compound lifts, accessories get 50
  meal_logged: 15,
  daily_calories_met: 50,
  daily_macros_met: 75,
  water_goal_hit: 25,
  weight_logged: 20,
  progress_photo: 30,
  seven_day_streak: 200,
  thirty_day_streak: 1000,
  perfect_week: 300,
  app_checkin: 10,
  ai_coach_interaction: 5,
  plan_regeneration: 50,
};

export const XP_DAILY_CAPS: Partial<Record<XPEventType, number>> = {
  workout_completed: 200,
  pr_achieved: 300,
  meal_logged: 60,
  daily_calories_met: 50,
  daily_macros_met: 75,
  water_goal_hit: 25,
  weight_logged: 20,
  progress_photo: 30,
  app_checkin: 10,
  ai_coach_interaction: 20,
  plan_regeneration: 50,
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getLevelInfo(level: number): LevelInfo {
  const tierIndex = Math.ceil(level / 5);
  const tierName = TIER_NAMES[tierIndex] || 'Master';
  const tierNumber = ((level - 1) % 5) + 1;
  const levelName = `${tierName} ${tierNumber}`;

  const xpThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const xpForNextLevel = level < 30 ? LEVEL_THRESHOLDS[level] : LEVEL_THRESHOLDS[29];
  const xpNeeded = xpForNextLevel - xpThreshold;

  return {
    level,
    level_name: levelName,
    tier_name: tierName,
    tier_number: tierNumber,
    description: getLevelDescription(level),
    xp_threshold: xpThreshold,
    xp_for_next_level: xpForNextLevel,
    xp_needed: xpNeeded,
    is_max_level: level >= 30,
  };
}

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

export function getProgressPercentage(currentXP: number, level: number): number {
  if (level >= 30) return 100;

  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = LEVEL_THRESHOLDS[level];
  const xpInLevel = currentXP - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;

  return Math.min(Math.round((xpInLevel / xpNeeded) * 100), 100);
}

function getLevelDescription(level: number): string {
  const descriptions: Record<number, string> = {
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

  return descriptions[level] || 'Training hard';
}

export function getRarityBorderColor(rarity: AchievementRarity, theme: any): string {
  switch (rarity) {
    case 'common':
      return theme.colors.text30; // White/light border
    case 'rare':
      return theme.colors.primary; // Cyan
    case 'epic':
      return '#A78BFA'; // Purple
    case 'legendary':
      return '#FBBF24'; // Gold
    default:
      return theme.colors.text30;
  }
}

export function getStreakColor(streakType: StreakType, theme: any): string {
  switch (streakType) {
    case 'fitness':
      return theme.colors.primary; // Cyan
    case 'workout':
      return theme.colors.macros.protein; // Cyan
    case 'nutrition':
      return theme.colors.macros.carbs; // Orange
    case 'hydration':
      return theme.colors.primary; // Cyan
    case 'weigh_in':
      return theme.colors.text50; // Gray
    default:
      return theme.colors.primary;
  }
}
