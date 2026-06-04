/**
 * React Query hooks for Gamification Service
 * Handles XP, levels, streaks, and achievements
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  getUserXPLevel,
  getUserXPEvents,
  getXPEarnedToday,
  getXPEarnedThisWeek,
  getLevelProgressDisplay,
  awardXP,
  getUserStreaks,
  getStreakDisplays,
  updateStreak,
  getAllAchievementsWithStatus,
  checkAchievements,
  getGamificationSummary,
  getWeeklyRecap,
  getAchievementDefinitions,
} from '../services/gamificationService';
import type {
  XPEventType,
  StreakType,
  AchievementCategory,
} from '../types/gamification';

// =====================================================
// QUERY KEYS
// =====================================================

export const gamificationKeys = {
  all: ['gamification'] as const,

  // XP & Levels
  xpLevel: (userId: string) => [...gamificationKeys.all, 'xp-level', userId] as const,
  xpEvents: (userId: string, limit?: number) =>
    [...gamificationKeys.all, 'xp-events', userId, limit] as const,
  xpToday: (userId: string) => [...gamificationKeys.all, 'xp-today', userId] as const,
  xpThisWeek: (userId: string) => [...gamificationKeys.all, 'xp-this-week', userId] as const,
  levelProgress: (userId: string) =>
    [...gamificationKeys.all, 'level-progress', userId] as const,

  // Streaks
  streaks: (userId: string) => [...gamificationKeys.all, 'streaks', userId] as const,
  streakDisplay: (userId: string, streakType: StreakType) =>
    [...gamificationKeys.all, 'streak-display', userId, streakType] as const,

  // Achievements
  achievements: (userId: string, category?: AchievementCategory) =>
    category
      ? [...gamificationKeys.all, 'achievements', userId, category]
      : [...gamificationKeys.all, 'achievements', userId],
  allAchievements: () => [...gamificationKeys.all, 'all-achievements'] as const,
  achievementsByCategory: (category: AchievementCategory) =>
    [...gamificationKeys.all, 'achievements-by-category', category] as const,

  // Summary & Recap
  summary: (userId: string) => [...gamificationKeys.all, 'summary', userId] as const,
  weeklyRecap: (userId: string, weekStart: string) =>
    [...gamificationKeys.all, 'weekly-recap', userId, weekStart] as const,
};

// =====================================================
// XP & LEVEL HOOKS
// =====================================================

/**
 * Get user's current XP level
 */
export function useUserXPLevel() {
  const { user } = useAuth();

  return useQuery({
    queryKey: gamificationKeys.xpLevel(user?.id || ''),
    queryFn: () => getUserXPLevel(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get user's XP events history
 */
export function useUserXPEvents(limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: gamificationKeys.xpEvents(user?.id || '', limit),
    queryFn: () => getUserXPEvents(user!.id, limit),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Get XP earned today
 */
export function useXPEarnedToday() {
  const { user } = useAuth();

  return useQuery({
    queryKey: gamificationKeys.xpToday(user?.id || ''),
    queryFn: () => getXPEarnedToday(user!.id),
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Get XP earned this week
 */
export function useXPEarnedThisWeek() {
  const { user } = useAuth();

  return useQuery({
    queryKey: gamificationKeys.xpThisWeek(user?.id || ''),
    queryFn: () => getXPEarnedThisWeek(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get level progress display data
 */
export function useLevelProgressDisplay() {
  const { user } = useAuth();

  return useQuery({
    queryKey: gamificationKeys.levelProgress(user?.id || ''),
    queryFn: () => getLevelProgressDisplay(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Award XP mutation
 */
export function useAwardXP() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventType,
      metadata,
    }: {
      eventType: XPEventType;
      metadata?: Record<string, any>;
    }) => awardXP(user!.id, eventType, metadata),
    onSuccess: (data, variables) => {
      // Invalidate all XP-related queries
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.xpLevel(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.xpEvents(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.xpToday(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.xpThisWeek(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.levelProgress(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.summary(user!.id),
      });

      // If achievements unlocked, invalidate achievements
      if (data.achievements_unlocked && data.achievements_unlocked.length > 0) {
        queryClient.invalidateQueries({
          queryKey: gamificationKeys.achievements(user!.id),
        });
      }
    },
  });
}

// =====================================================
// STREAK HOOKS
// =====================================================

/**
 * Get all user streaks
 */
export function useUserStreaks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: gamificationKeys.streaks(user?.id || ''),
    queryFn: () => getUserStreaks(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Get streak display data for a specific streak type
 */
export function useStreakDisplay(streakType: StreakType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: gamificationKeys.streakDisplay(user?.id || '', streakType),
    queryFn: async () => {
      const displays = await getStreakDisplays(user!.id);
      return displays.find((d) => d.type === streakType) || null;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Update streak mutation
 */
export function useUpdateStreak() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      streakType,
      activityDate,
    }: {
      streakType: StreakType;
      activityDate?: string;
    }) => updateStreak(user!.id, streakType, activityDate || new Date().toISOString().split('T')[0]),
    onSuccess: (data, variables) => {
      // Invalidate streak queries
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.streaks(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.streakDisplay(user!.id, variables.streakType),
      });
      queryClient.invalidateQueries({
        queryKey: gamificationKeys.summary(user!.id),
      });

      // Check for streak milestone achievements
      if (data && data.current_streak && data.current_streak % 7 === 0) {
        queryClient.invalidateQueries({
          queryKey: gamificationKeys.achievements(user!.id),
        });
      }
    },
  });
}

// =====================================================
// ACHIEVEMENT HOOKS
// =====================================================

/**
 * Get user achievements (with optional category filter)
 */
export function useUserAchievements(category?: AchievementCategory) {
  const { user } = useAuth();

  return useQuery({
    queryKey: gamificationKeys.achievements(user?.id || '', category),
    queryFn: async () => {
      const all = await getAllAchievementsWithStatus(user!.id);
      if (!category) return all;
      return all.filter((a) => a.category === category);
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get all achievement definitions (un-joined)
 */
export function useAllAchievements() {
  return useQuery({
    queryKey: gamificationKeys.allAchievements(),
    queryFn: () => getAchievementDefinitions(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Check achievements mutation
 */
export function useCheckAchievements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventType,
      metadata,
    }: {
      eventType?: string;
      metadata?: Record<string, any>;
    }) => checkAchievements(user!.id, eventType || 'general', metadata),
    onSuccess: (data) => {
      if (data.length > 0) {
        // Invalidate achievements queries
        queryClient.invalidateQueries({
          queryKey: gamificationKeys.achievements(user!.id),
        });
        queryClient.invalidateQueries({
          queryKey: gamificationKeys.summary(user!.id),
        });

        // Also invalidate XP queries since achievements award XP
        queryClient.invalidateQueries({
          queryKey: gamificationKeys.xpLevel(user!.id),
        });
      }
    },
  });
}

// =====================================================
// SUMMARY & RECAP HOOKS
// =====================================================

/**
 * Get gamification summary (level, streaks, recent achievements)
 */
export function useGamificationSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: gamificationKeys.summary(user?.id || ''),
    queryFn: () => getGamificationSummary(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get weekly recap data
 */
export function useWeeklyRecapData(weekStart?: string) {
  const { user } = useAuth();

  // Default to current week start (Sunday)
  const defaultWeekStart = (() => {
    const today = new Date();
    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() - today.getDay());
    return weekStartDate.toISOString().split('T')[0];
  })();

  const targetWeekStart = weekStart || defaultWeekStart;

  return useQuery({
    queryKey: gamificationKeys.weeklyRecap(user?.id || '', targetWeekStart),
    queryFn: () => getWeeklyRecap(user!.id),
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// =====================================================
// HELPER HOOKS
// =====================================================

/**
 * Get highest current streak
 */
export function useHighestStreak() {
  const { data: streaks, isLoading, isError } = useUserStreaks();

  return {
    data:
      !streaks || streaks.length === 0
        ? { streakType: 'fitness' as StreakType, currentStreak: 0 }
        : (() => {
            const highest = streaks.reduce((max, streak) =>
              streak.current_streak > max.current_streak ? streak : max
            );
            return {
              streakType: highest.streak_type,
              currentStreak: highest.current_streak,
            };
          })(),
    isLoading,
    isError,
  };
}

/**
 * Get achievement completion percentage
 */
export function useAchievementCompletionPercentage() {
  const { data: userAchievements } = useUserAchievements();
  const { data: allAchievements } = useAllAchievements();

  if (!userAchievements || !allAchievements) {
    return 0;
  }

  const unlockedCount = userAchievements.filter((a) => a.unlocked).length;
  const totalCount = allAchievements.length;

  return totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
}

/**
 * Get user level (alias for useUserXPLevel for consistency)
 */
export function useUserLevel() {
  return useUserXPLevel();
}

/**
 * Get achievement stats (unlocked counts, XP earned, recent unlocks)
 */
export function useAchievementStats() {
  const { data: achievements } = useUserAchievements();

  const emptyStats = {
    data: {
      total_xp_from_achievements: 0,
      common_count: 0,
      rare_count: 0,
      epic_count: 0,
      legendary_count: 0,
      recent_unlocks_7d: 0,
      recent_unlocks_30d: 0,
    },
  };

  if (!achievements) return emptyStats;

  // getAllAchievementsWithStatus returns Achievement[] where unlocked is a boolean
  const unlockedAchievements = achievements.filter((a: any) => a.unlocked || a.unlocked_at);
  if (unlockedAchievements.length === 0) return emptyStats;

  const totalXP = unlockedAchievements.reduce((sum: number, a: any) => sum + (a.xp_reward || 0), 0);

  const rarityCounts = unlockedAchievements.reduce(
    (counts: Record<string, number>, a: any) => {
      const rarity = a.rarity || 'common';
      counts[rarity] = (counts[rarity] || 0) + 1;
      return counts;
    },
    { common: 0, rare: 0, epic: 0, legendary: 0 }
  );

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const recent7d = unlockedAchievements.filter(
    (a: any) => a.unlocked_at && new Date(a.unlocked_at) >= sevenDaysAgo
  ).length;

  const recent30d = unlockedAchievements.filter(
    (a: any) => a.unlocked_at && new Date(a.unlocked_at) >= thirtyDaysAgo
  ).length;

  return {
    data: {
      total_xp_from_achievements: totalXP,
      common_count: rarityCounts.common,
      rare_count: rarityCounts.rare,
      epic_count: rarityCounts.epic,
      legendary_count: rarityCounts.legendary,
      recent_unlocks_7d: recent7d,
      recent_unlocks_30d: recent30d,
    },
  };
}

/**
 * Get streak history (placeholder - can be expanded with actual history data)
 */
export function useStreakHistory(streakType?: StreakType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...gamificationKeys.streaks(user?.id || ''), 'history', streakType],
    queryFn: async () => {
      // This is a placeholder - you can expand this to fetch actual history
      // from a streak_history table if you implement one
      return [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
