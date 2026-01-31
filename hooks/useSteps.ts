/**
 * React Query hooks for Steps Service
 * Handles step logging and history tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  logSteps,
  deleteStepLog,
  getStepsForDate,
  getDailyStepSummary,
  getStepHistory,
  getStepStats,
  type StepLog,
  type DailyStepSummary,
  type StepStats,
  type StepSource,
} from '../services/stepsService';

// Query Keys
export const stepsKeys = {
  all: ['steps'] as const,
  forDate: (userId: string, date: string) => [...stepsKeys.all, userId, date] as const,
  summary: (userId: string, date: string) => [...stepsKeys.all, 'summary', userId, date] as const,
  history: (userId: string, startDate: string, endDate: string) =>
    [...stepsKeys.all, 'history', userId, startDate, endDate] as const,
  stats: (userId: string, startDate: string, endDate: string) =>
    [...stepsKeys.all, 'stats', userId, startDate, endDate] as const,
};

/**
 * Get steps for a specific date
 */
export function useStepsForDate(date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: stepsKeys.forDate(user?.id || '', date),
    queryFn: () => getStepsForDate(user!.id, date),
    enabled: !!user,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get daily step summary
 */
export function useDailyStepSummary(date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: stepsKeys.summary(user?.id || '', date),
    queryFn: () => getDailyStepSummary(user!.id, date),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

/**
 * Get step history for a date range
 */
export function useStepHistory(startDate: string, endDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: stepsKeys.history(user?.id || '', startDate, endDate),
    queryFn: () => getStepHistory(user!.id, startDate, endDate),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get step statistics
 */
export function useStepStats(startDate: string, endDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: stepsKeys.stats(user?.id || '', startDate, endDate),
    queryFn: () => getStepStats(user!.id, startDate, endDate),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Log steps mutation
 */
export function useLogSteps() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      steps,
      source = 'manual',
      loggedDate,
    }: {
      steps: number;
      source?: StepSource;
      loggedDate?: string;
    }) => logSteps(user!.id, steps, source, loggedDate),
    onSuccess: (_, variables) => {
      const date = variables.loggedDate || new Date().toISOString().split('T')[0];

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: stepsKeys.forDate(user!.id, date),
      });
      queryClient.invalidateQueries({
        queryKey: stepsKeys.summary(user!.id, date),
      });
      // Invalidate all history queries that might include this date
      queryClient.invalidateQueries({
        queryKey: stepsKeys.all,
      });
    },
  });
}

/**
 * Delete step log mutation
 */
export function useDeleteStepLog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (logId: string) => deleteStepLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: stepsKeys.all,
      });
    },
  });
}

/**
 * Combined hook for today's steps
 */
export function useTodaySteps() {
  const today = new Date().toISOString().split('T')[0];
  const summaryQuery = useDailyStepSummary(today);
  const logMutation = useLogSteps();

  return {
    // Data
    summary: summaryQuery.data,
    steps: summaryQuery.data?.totalSteps || 0,
    source: summaryQuery.data?.source || 'manual',

    // Loading states
    isLoading: summaryQuery.isLoading,
    isSaving: logMutation.isPending,

    // Actions
    logSteps: logMutation.mutate,

    // Error states
    error: summaryQuery.error || logMutation.error,
  };
}
