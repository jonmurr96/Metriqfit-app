/**
 * React Query hooks for Plan Service
 * Handles workout and nutrition plan management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  triggerPlanGeneration,
  getActiveWorkoutPlan,
  getActiveNutritionPlan,
  getPlanHistory,
  getWorkoutPlanDay,
  getTodaysWorkout,
  markDayCompleted,
  swapExercise,
  updateExerciseTargets,
  getGenerationHistory,
  reactivatePlan,
  type UserWorkoutPlan,
  type UserWorkoutPlanDay,
  type UserNutritionPlan,
  type PlanGenerationRun,
} from '../services/planService';

// Query Keys
export const planKeys = {
  all: ['plans'] as const,
  workout: () => [...planKeys.all, 'workout'] as const,
  workoutActive: (userId: string) => [...planKeys.workout(), 'active', userId] as const,
  workoutHistory: (userId: string) => [...planKeys.workout(), 'history', userId] as const,
  workoutDay: (dayId: string) => [...planKeys.workout(), 'day', dayId] as const,
  todaysWorkout: (userId: string) => [...planKeys.workout(), 'today', userId] as const,
  nutrition: () => [...planKeys.all, 'nutrition'] as const,
  nutritionActive: (userId: string) => [...planKeys.nutrition(), 'active', userId] as const,
  nutritionHistory: (userId: string) => [...planKeys.nutrition(), 'history', userId] as const,
  generations: (userId: string) => [...planKeys.all, 'generations', userId] as const,
};

/**
 * Get active workout plan with days and exercises
 */
export function useActiveWorkoutPlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.workoutActive(user?.id || ''),
    queryFn: () => getActiveWorkoutPlan(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get active nutrition plan
 */
export function useActiveNutritionPlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.nutritionActive(user?.id || ''),
    queryFn: () => getActiveNutritionPlan(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get workout plan history (all versions)
 */
export function useWorkoutPlanHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.workoutHistory(user?.id || ''),
    queryFn: () => getPlanHistory(user!.id, 'workout'),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get nutrition plan history (all versions)
 */
export function useNutritionPlanHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.nutritionHistory(user?.id || ''),
    queryFn: () => getPlanHistory(user!.id, 'nutrition'),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get specific workout plan day with exercises
 */
export function useWorkoutPlanDay(dayId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: planKeys.workoutDay(dayId),
    queryFn: () => getWorkoutPlanDay(dayId),
    enabled: !!dayId && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get today's scheduled workout
 */
export function useTodaysWorkout() {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.todaysWorkout(user?.id || ''),
    queryFn: () => getTodaysWorkout(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get plan generation history (audit log)
 */
export function useGenerationHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.generations(user?.id || ''),
    queryFn: () => getGenerationHistory(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Trigger AI plan generation
 */
export function useTriggerPlanGeneration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planType: 'workout' | 'nutrition' | 'both') => triggerPlanGeneration(user!.id, planType),
    onSuccess: (_, planType) => {
      // Invalidate relevant plan queries based on type
      if (planType === 'workout' || planType === 'both') {
        queryClient.invalidateQueries({
          queryKey: planKeys.workoutActive(user!.id),
        });
        queryClient.invalidateQueries({
          queryKey: planKeys.workoutHistory(user!.id),
        });
        queryClient.invalidateQueries({
          queryKey: planKeys.todaysWorkout(user!.id),
        });
      }
      if (planType === 'nutrition' || planType === 'both') {
        queryClient.invalidateQueries({
          queryKey: planKeys.nutritionActive(user!.id),
        });
        queryClient.invalidateQueries({
          queryKey: planKeys.nutritionHistory(user!.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: planKeys.generations(user!.id),
      });
    },
  });
}

/**
 * Mark a workout day as completed
 */
export function useMarkDayCompleted() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dayId: string) => markDayCompleted(dayId),
    onSuccess: (_, dayId) => {
      queryClient.invalidateQueries({
        queryKey: planKeys.workoutDay(dayId),
      });
      queryClient.invalidateQueries({
        queryKey: planKeys.workoutActive(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: planKeys.todaysWorkout(user!.id),
      });
    },
  });
}

/**
 * Swap an exercise in a plan
 */
export function useSwapExercise() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planExerciseId, newExerciseId }: { planExerciseId: string; newExerciseId: string }) =>
      swapExercise(planExerciseId, newExerciseId),
    onSuccess: () => {
      // Invalidate all workout plan queries
      queryClient.invalidateQueries({
        queryKey: planKeys.workout(),
      });
    },
  });
}

/**
 * Update exercise targets (sets, reps, rest)
 */
export function useUpdateExerciseTargets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planExerciseId,
      updates,
    }: {
      planExerciseId: string;
      updates: {
        sets_target?: number;
        reps_min?: number;
        reps_max?: number;
        rest_seconds?: number;
      };
    }) => updateExerciseTargets(planExerciseId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: planKeys.workout(),
      });
    },
  });
}

/**
 * Reactivate an old plan version
 */
export function useReactivatePlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, planType }: { planId: string; planType: 'workout' | 'nutrition' }) =>
      reactivatePlan(user!.id, planId, planType),
    onSuccess: (_, variables) => {
      if (variables.planType === 'workout') {
        queryClient.invalidateQueries({
          queryKey: planKeys.workout(),
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: planKeys.nutrition(),
        });
      }
    },
  });
}

/**
 * Combined hook for plan dashboard
 */
export function usePlanDashboard() {
  const workoutPlanQuery = useActiveWorkoutPlan();
  const nutritionPlanQuery = useActiveNutritionPlan();
  const todaysWorkoutQuery = useTodaysWorkout();

  return {
    // Data
    workoutPlan: workoutPlanQuery.data,
    nutritionPlan: nutritionPlanQuery.data,
    todaysWorkout: todaysWorkoutQuery.data,

    // Loading states
    isLoading: workoutPlanQuery.isLoading || nutritionPlanQuery.isLoading || todaysWorkoutQuery.isLoading,

    // Computed
    hasWorkoutPlan: !!workoutPlanQuery.data,
    hasNutritionPlan: !!nutritionPlanQuery.data,
    hasTodaysWorkout: !!todaysWorkoutQuery.data,

    // Refetch
    refetch: () => {
      workoutPlanQuery.refetch();
      nutritionPlanQuery.refetch();
      todaysWorkoutQuery.refetch();
    },
  };
}
