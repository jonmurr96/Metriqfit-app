/**
 * Gamification Service - Production Implementation
 *
 * Handles:
 * - XP awards and level progression
 * - Streak tracking and freeze tokens
 * - Achievement unlocking and progress
 * - Gamification summary and analytics
 * - Weekly recap generation
 */

import { supabase } from '../lib/supabase';
import { invokeFunction } from '../lib/supabase/invokeFunction';
import { DeviceEventEmitter } from 'react-native';
import {
  getLevelFromXP,
  getLevelInfo,
  getProgressPercentage,
  isTierUp,
} from '../lib/gamification/levels';
import type {
  UserXPLevel,
  XPEvent,
  UserStreak,
  Achievement,
  AchievementDefinition,
  UserAchievement,
  XPAwardResult,
  StreakUpdateResult,
  GamificationSummary,
  WeeklyRecapData,
  LevelProgressDisplay,
  StreakDisplay,
  XPEventType,
  StreakType,
} from '../types/gamification';

// =====================================================
// XP & LEVEL MANAGEMENT
// =====================================================

/**
 * Award XP to user and check for level-ups
 * Calls Edge Function for server-side calculation with multipliers and caps
 */
export async function awardXP(
  userId: string,
  eventType: XPEventType,
  metadata?: Record<string, any>
): Promise<XPAwardResult> {
  try {
    // PRE-FLIGHT CHECK: Ensure the user's XP level row exists in the database
    // This safely catches and initializes new users, preventing the Edge Function from throwing a 404
    await getUserXPLevel(userId);

    const { data, parsedError, rawError } = await invokeFunction(() =>
      supabase.functions.invoke('award-xp', {
        body: { userId, eventType, metadata },
      })
    );

    if (rawError) throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to award XP');

    const result = data as XPAwardResult;

    if (result && result.xp_awarded > 0) {
      const EVENT_MESSAGES: Record<string, string> = {
        workout_completed: "Workout Completed!",
        workout_on_time: "On Schedule!",
        all_sets_completed: "All Sets Crushed!",
        pr_achieved: "New PR Achieved!",
        meal_logged: "Meal Tracked!",
        daily_calories_met: "Calories On Point!",
        daily_macros_met: "Macros Perfected!",
        water_goal_hit: "Hydration Goal Hit!",
        weight_logged: "Weight Tracked!",
        progress_photo: "Progress Captured!",
        seven_day_streak: "7-Day Streak Bonus!",
        thirty_day_streak: "30-Day Streak Bonus!",
        perfect_week: "Perfect Week Master!",
        app_checkin: "Daily Check-in!",
        ai_coach_interaction: "Coach Chat Completed!",
        plan_regeneration: "Plan Refreshed!",
      };
      
      DeviceEventEmitter.emit('GAMIFICATION_XP_AWARDED', {
        xp: result.xp_awarded,
        message: EVENT_MESSAGES[eventType] || "XP Earned!"
      });
    }

    return result;
  } catch (error) {
    console.error('[GamificationService] Error awarding XP:', error);
    // Return fallback result instead of throwing
    return {
      xp_awarded: 0,
      level_up: false,
      total_xp: 0,
      xp_to_next_level: 0,
    };
  }
}

/**
 * Get user's current XP level
 */
export async function getUserXPLevel(userId: string): Promise<UserXPLevel | null> {
  try {
    const { data, error } = await supabase
      .from('user_xp_levels')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No row found - initialize
        return await initializeUserXP(userId);
      }
      throw error;
    }

    return data as UserXPLevel;
  } catch (error) {
    console.error('[GamificationService] Error getting user XP level:', error);
    return null;
  }
}

/**
 * Initialize user XP level (Rookie 1)
 */
async function initializeUserXP(userId: string): Promise<UserXPLevel> {
  const { data, error } = await supabase
    .from('user_xp_levels')
    .insert({
      user_id: userId,
      current_level: 1,
      current_xp: 0,
      total_xp_earned: 0,
    })
    .select()
    .single();

  if (error) throw error;

  return data as UserXPLevel;
}

/**
 * Get user's XP events history
 */
export async function getUserXPEvents(
  userId: string,
  limit = 50
): Promise<XPEvent[]> {
  try {
    const { data, error } = await supabase
      .from('user_xp_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data as XPEvent[]) || [];
  } catch (error) {
    console.error('[GamificationService] Error getting XP events:', error);
    return [];
  }
}

/**
 * Get XP earned today
 */
export async function getXPEarnedToday(userId: string): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('user_xp_events')
      .select('final_xp')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    if (error) throw error;

    return data?.reduce((sum, event) => sum + event.final_xp, 0) || 0;
  } catch (error) {
    console.error('[GamificationService] Error getting XP earned today:', error);
    return 0;
  }
}

/**
 * Get XP earned this week
 */
export async function getXPEarnedThisWeek(userId: string): Promise<number> {
  try {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    weekStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('user_xp_events')
      .select('final_xp')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString());

    if (error) throw error;

    return data?.reduce((sum, event) => sum + event.final_xp, 0) || 0;
  } catch (error) {
    console.error('[GamificationService] Error getting XP earned this week:', error);
    return 0;
  }
}

/**
 * Get level progress display data
 */
export async function getLevelProgressDisplay(
  userId: string
): Promise<LevelProgressDisplay | null> {
  try {
    const xpLevel = await getUserXPLevel(userId);
    if (!xpLevel) return null;

    const levelInfo = getLevelInfo(xpLevel.current_level);
    const xpToNextLevel = levelInfo.xp_for_next_level - xpLevel.total_xp_earned;
    const progressPercentage = getProgressPercentage(
      xpLevel.total_xp_earned,
      xpLevel.current_level
    );

    return {
      current_level: xpLevel.current_level,
      level_name: levelInfo.level_name,
      tier_name: levelInfo.tier_name as any,
      tier_number: levelInfo.tier_number,
      current_xp: xpLevel.total_xp_earned,
      xp_to_next_level: xpToNextLevel,
      xp_for_next_level: levelInfo.xp_for_next_level,
      progress_percentage: progressPercentage,
      is_max_level: levelInfo.is_max_level,
    };
  } catch (error) {
    console.error('[GamificationService] Error getting level progress:', error);
    return null;
  }
}

// =====================================================
// STREAK MANAGEMENT
// =====================================================

/**
 * Update user streak
 * Calls Edge Function for server-side streak logic with freeze tokens
 */
export async function updateStreak(
  userId: string,
  streakType: StreakType,
  activityDate: string
): Promise<StreakUpdateResult | null> {
  try {
    await ensureUserStreakRow(userId, streakType);

    const { data, parsedError, rawError } = await invokeFunction(() =>
      supabase.functions.invoke('update-streak', {
        body: { userId, streakType, activityDate },
      })
    );

    if (rawError) throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to update streak');

    return data as StreakUpdateResult;
  } catch (error) {
    console.error('[GamificationService] Error updating streak:', error);
    return null;
  }
}

async function ensureUserStreakRow(userId: string, streakType: StreakType): Promise<void> {
  const { data, error } = await supabase
    .from('user_streaks')
    .select('id')
    .eq('user_id', userId)
    .eq('streak_type', streakType)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return;
  }

  const { error: insertError } = await supabase
    .from('user_streaks')
    .insert({
      user_id: userId,
      streak_type: streakType,
      current_streak: 0,
      longest_streak: 0,
      freeze_tokens: 0,
    });

  if (insertError && insertError.code !== '23505') {
    throw insertError;
  }
}

/**
 * Get all user streaks
 */
export async function getUserStreaks(userId: string): Promise<UserStreak[]> {
  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', userId)
      .order('streak_type');

    if (error) {
      if (error.code === 'PGRST116') {
        // No streaks found - initialize
        return await initializeUserStreaks(userId);
      }
      throw error;
    }

    return (data as UserStreak[]) || [];
  } catch (error) {
    console.error('[GamificationService] Error getting user streaks:', error);
    return [];
  }
}

/**
 * Initialize all 5 streak types for user
 */
async function initializeUserStreaks(userId: string): Promise<UserStreak[]> {
  const streakTypes: StreakType[] = [
    'fitness',
    'workout',
    'nutrition',
    'hydration',
    'weigh_in',
  ];

  const { data, error } = await supabase
    .from('user_streaks')
    .insert(
      streakTypes.map((type) => ({
        user_id: userId,
        streak_type: type,
        current_streak: 0,
        longest_streak: 0,
        freeze_tokens: 0,
      }))
    )
    .select();

  if (error) throw error;

  return (data as UserStreak[]) || [];
}

/**
 * Get streak display data for UI
 */
export async function getStreakDisplays(userId: string): Promise<StreakDisplay[]> {
  try {
    const streaks = await getUserStreaks(userId);

    const displays: StreakDisplay[] = streaks.map((streak) => {
      const milestones = [3, 7, 14, 30, 60, 90, 180, 365];
      const nextMilestone =
        milestones.find((m) => m > streak.current_streak) || Infinity;
      const daysUntilMilestone =
        nextMilestone === Infinity ? 0 : nextMilestone - streak.current_streak;

      return {
        type: streak.streak_type,
        label: getStreakLabel(streak.streak_type),
        icon: getStreakIcon(streak.streak_type),
        current: streak.current_streak,
        longest: streak.longest_streak,
        color: getStreakColor(streak.streak_type),
        is_active: streak.current_streak > 0,
        days_until_milestone: daysUntilMilestone,
        next_milestone: nextMilestone === Infinity ? 0 : nextMilestone,
      };
    });

    return displays;
  } catch (error) {
    console.error('[GamificationService] Error getting streak displays:', error);
    return [];
  }
}

/**
 * Use freeze token to preserve streak
 */
export async function useFreezeToken(
  userId: string,
  streakType: StreakType,
  date: string
): Promise<boolean> {
  // TODO: streak-freeze feature is not implemented yet — the `use-freeze-token`
  // edge function does not exist remotely or locally. Calling it previously returned
  // a 404 and the catch silently no-op'd; this no-op skips the wasted round-trip.
  // Build the edge function (or move the logic into a Postgres RPC) before enabling
  // freeze tokens in the UI.
  void userId; void streakType; void date;
  return false;
}

// =====================================================
// ACHIEVEMENT MANAGEMENT
// =====================================================

/**
 * Get all achievement definitions
 */
export async function getAchievementDefinitions(): Promise<AchievementDefinition[]> {
  try {
    const { data, error } = await supabase
      .from('achievement_definitions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    return (data as AchievementDefinition[]) || [];
  } catch (error) {
    console.error('[GamificationService] Error getting achievement definitions:', error);
    return [];
  }
}

/**
 * Get user's unlocked achievements
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  try {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(
        `
        *,
        achievement:achievement_definitions(*)
      `
      )
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) throw error;

    return (data as UserAchievement[]) || [];
  } catch (error) {
    console.error('[GamificationService] Error getting user achievements:', error);
    return [];
  }
}

/**
 * Get all achievements with unlock status
 */
export async function getAllAchievementsWithStatus(
  userId: string
): Promise<Achievement[]> {
  try {
    const [definitions, unlocked] = await Promise.all([
      getAchievementDefinitions(),
      getUserAchievements(userId),
    ]);

    const unlockedIds = new Set(unlocked.map((a) => a.achievement_id));

    return definitions.map((def) => ({
      ...def,
      unlocked: unlockedIds.has(def.id),
      unlocked_at: unlocked.find((a) => a.achievement_id === def.id)?.unlocked_at,
      progress_percentage: unlocked.find((a) => a.achievement_id === def.id)
        ?.progress_percentage,
    }));
  } catch (error) {
    console.error('[GamificationService] Error getting achievements with status:', error);
    return [];
  }
}

/**
 * Check and unlock achievements
 * Called after any user action that might unlock achievements
 */
export async function checkAchievements(
  userId: string,
  eventType: string,
  metadata?: Record<string, any>
): Promise<Achievement[]> {
  try {
    const { data, parsedError, rawError } = await invokeFunction(() =>
      supabase.functions.invoke('check-achievements', {
        body: { userId, eventType, metadata },
      })
    );

    if (rawError) throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to check achievements');

    return (data?.unlocked || []) as Achievement[];
  } catch (error) {
    console.error('[GamificationService] Error checking achievements:', error);
    return [];
  }
}

// =====================================================
// GAMIFICATION SUMMARY
// =====================================================

/**
 * Get complete gamification summary for user
 */
export async function getGamificationSummary(
  userId: string
): Promise<GamificationSummary | null> {
  try {
    const [levelProgress, streaks, achievements, xpToday, xpWeek] = await Promise.all([
      getLevelProgressDisplay(userId),
      getStreakDisplays(userId),
      getAllAchievementsWithStatus(userId),
      getXPEarnedToday(userId),
      getXPEarnedThisWeek(userId),
    ]);

    if (!levelProgress) return null;

    const unlockedAchievements = achievements.filter((a) => a.unlocked);
    const recentAchievements = unlockedAchievements
      .sort(
        (a, b) =>
          new Date(b.unlocked_at || 0).getTime() -
          new Date(a.unlocked_at || 0).getTime()
      )
      .slice(0, 5);

    return {
      level: levelProgress,
      streaks,
      recent_achievements: recentAchievements,
      total_achievements_unlocked: unlockedAchievements.length,
      total_achievements_available: achievements.length,
      xp_earned_today: xpToday,
      xp_earned_this_week: xpWeek,
    };
  } catch (error) {
    console.error('[GamificationService] Error getting gamification summary:', error);
    return null;
  }
}

// =====================================================
// WEEKLY RECAP
// =====================================================

/**
 * Generate weekly recap data
 */
export async function getWeeklyRecap(userId: string): Promise<WeeklyRecapData | null> {
  try {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const weekEnd = new Date(today);

    // Get XP earned this week
    const { data: xpEvents, error: xpError } = await supabase
      .from('user_xp_events')
      .select('final_xp')
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString());

    if (xpError) throw xpError;

    const xpEarned = xpEvents?.reduce((sum, event) => sum + event.final_xp, 0) || 0;

    // Get achievements unlocked this week
    const { data: unlockedAchievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select(
        `
        *,
        achievement:achievement_definitions(*)
      `
      )
      .eq('user_id', userId)
      .gte('unlocked_at', weekStart.toISOString())
      .lte('unlocked_at', weekEnd.toISOString());

    if (achievementsError) throw achievementsError;

    // Get streaks
    const streaks = await getStreakDisplays(userId);

    return {
      week_start: weekStart.toISOString().split('T')[0],
      week_end: weekEnd.toISOString().split('T')[0],
      xp_earned: xpEarned,
      achievements_unlocked: (unlockedAchievements || []).map((a) => ({
        ...(a.achievement as AchievementDefinition),
        unlocked: true,
        unlocked_at: a.unlocked_at,
        progress_percentage: a.progress_percentage,
      })),
      streaks_maintained: streaks.filter((s) => s.is_active),
      workouts_completed: 0, // TODO: Get from workout service
      meals_logged: 0, // TODO: Get from nutrition service
      water_goals_hit: 0, // TODO: Get from water service
      level_ups: 0, // TODO: Calculate from XP events
    };
  } catch (error) {
    console.error('[GamificationService] Error generating weekly recap:', error);
    return null;
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getStreakLabel(type: StreakType): string {
  const labels: Record<StreakType, string> = {
    fitness: 'Fitness',
    workout: 'Workout',
    nutrition: 'Nutrition',
    hydration: 'Hydration',
    weigh_in: 'Weigh-In',
  };
  return labels[type];
}

function getStreakIcon(type: StreakType): string {
  const icons: Record<StreakType, string> = {
    fitness: 'flame',
    workout: 'barbell',
    nutrition: 'restaurant',
    hydration: 'water',
    weigh_in: 'scale',
  };
  return icons[type];
}

function getStreakColor(type: StreakType): string {
  const colors: Record<StreakType, string> = {
    fitness: '#22D3EE', // Primary cyan
    workout: '#22D3EE', // Primary cyan
    nutrition: '#FB923C', // Orange (carbs)
    hydration: '#22D3EE', // Primary cyan
    weigh_in: '#9CA3AF', // Gray
  };
  return colors[type];
}
