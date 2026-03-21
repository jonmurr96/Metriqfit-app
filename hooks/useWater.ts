/**
 * React Query hooks for Water Service
 * Handles water logging and daily tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import { progressMetricKeys } from './useProgressMetrics';
import { nutritionDashboardKeys } from './useNutritionDashboard';
import {
  logWater,
  getDailyWaterLogs,
  getDailyWaterSummary,
  deleteWaterLog,
  getWaterHistory,
} from '../services/waterService';

// Query Keys
export const waterKeys = {
  all: ['water'] as const,
  logs: (userId: string, date: string) => [...waterKeys.all, 'logs', userId, date] as const,
  summary: (userId: string, date: string) => [...waterKeys.all, 'summary', userId, date] as const,
  history: (userId: string, days: number) => [...waterKeys.all, 'history', userId, days] as const,
};

/**
 * Get daily water logs
 */
export function useDailyWaterLogs(date?: string) {
  const { user } = useAuth();
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: waterKeys.logs(user?.id || '', targetDate),
    queryFn: () => getDailyWaterLogs(user!.id, targetDate),
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get daily water summary (total, target, percentage)
 */
export function useDailyWaterSummary(date?: string) {
  const { user } = useAuth();
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: waterKeys.summary(user?.id || '', targetDate),
    queryFn: () => getDailyWaterSummary(user!.id, targetDate),
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

/**
 * Get water history for trends
 */
export function useWaterHistory(days = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: waterKeys.history(user?.id || '', days),
    queryFn: () => {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      return getWaterHistory(user!.id, startDate, endDate);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Log water intake mutation
 */
export function useLogWater() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (amountMl: number) => logWater(user!.id, amountMl),
    onSuccess: () => {
      const targetDate = new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({
        queryKey: waterKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: nutritionDashboardKeys.today(user!.id, targetDate),
      });
      // Home and readiness surfaces derive hydration from progress snapshot.
      queryClient.invalidateQueries({
        queryKey: progressMetricKeys.all,
      });
    },
  });
}

/**
 * Delete water log mutation
 */
export function useDeleteWaterLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (logId: string) => deleteWaterLog(logId),
    onSuccess: () => {
      // Invalidate all water queries since we don't know the date
      queryClient.invalidateQueries({
        queryKey: waterKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: nutritionDashboardKeys.all,
      });
    },
  });
}

/**
 * Quick add water (convenience hook with preset amounts)
 */
export function useQuickAddWater() {
  const logWaterMutation = useLogWater();

  return {
    ...logWaterMutation,
    addGlass: () => logWaterMutation.mutate(250), // 8oz glass
    addBottle: () => logWaterMutation.mutate(500), // 16oz bottle
    addLargeBottle: () => logWaterMutation.mutate(750), // 24oz bottle
    addCustom: (amountMl: number) => logWaterMutation.mutate(amountMl),
  };
}
