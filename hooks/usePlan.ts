/**
 * React Query hooks for Plan Service
 * Handles workout/nutrition plans, scheduling, and consistency tracking.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  triggerPlanGeneration,
  getActiveWorkoutPlan,
  getActiveNutritionPlan,
  getPlanHistory,
  getLatestNutritionPlanPreview,
  getLatestWorkoutPlanPreview,
  getWorkoutPlanDay,
  getTodaysWorkout,
  markDayCompleted,
  addWorkoutPlanExercise,
  removeWorkoutPlanExercise,
  moveWorkoutPlanExercise,
  swapExercise,
  updateExerciseTargets,
  getGenerationHistory,
  reactivatePlan,
  getNutritionPlanMealsForDay,
  getNutritionPlanMeal,
  addNutritionPlanMeal,
  removeNutritionPlanMeal,
  moveNutritionPlanMeal,
  copyNutritionDayMeals,
  applyMealPlanChange,
  applyMealPlanBatchChange,
  getWorkoutSchedule,
  getWorkoutScheduleByPlanId,
  getTodayWorkoutScheduleEntry,
  rescheduleWorkoutDay,
  computePlanConsistency,
  getConsistencyHistory,
  getLatestConsistency,
  generateNutritionPlanPreview,
  generateWorkoutPlanPreview,
  applyNutritionPlanPreview,
  applyWorkoutPlanPreview,
  discardNutritionPlanPreview,
  discardWorkoutPlanPreview,
  getEditableNutritionPlanContext,
  getWorkoutPlanCoherenceReport,
  repairNutritionPlanMappings,
  repairWorkoutPlanCoherencePreview,
  type UserWorkoutPlan,
  type UserWorkoutPlanDay,
  type UserNutritionPlan,
  type PlanGenerationRun,
  type PlanGenerationOptions,
  type ApplyMealPlanChangeInput,
  type ApplyMealPlanBatchInput,
  type NutritionMealSlot,
  type WorkoutScheduleEntry,
  type NutritionPlanDayDetails,
  type NutritionPlanMeal,
  type NutritionPlanWithDetails,
  type ConsistencyRecord,
  type NutritionPlanPreviewResult,
  type NutritionRegenerationRequest,
  type WorkoutPlanPreview as WorkoutPlanPreviewData,
  type WorkoutPlanPreviewResult,
  type WorkoutPlanCoherenceReport,
  type WorkoutRegenerationRequest,
  type EditableNutritionPlanContext,
} from '../services/planService';
import { nutritionDashboardKeys } from './useNutritionDashboard';
import { progressMetricKeys } from './useProgressMetrics';

// Query Keys
export const planKeys = {
  all: ['plans'] as const,
  mediaVersion: 'media-v2' as const,
  workout: () => [...planKeys.all, 'workout'] as const,
  workoutActive: (userId: string) => [...planKeys.workout(), 'active', userId] as const,
  workoutHistory: (userId: string) => [...planKeys.workout(), 'history', userId] as const,
  workoutPreview: (userId: string, replacesPlanId?: string | null) =>
    [...planKeys.workout(), 'preview', userId, replacesPlanId || 'latest'] as const,
  workoutCoherence: (planId: string) => [...planKeys.workout(), 'coherence', planId] as const,
  workoutDay: (dayId: string) => [...planKeys.workout(), 'day', dayId, planKeys.mediaVersion] as const,
  todaysWorkout: (userId: string) => [...planKeys.workout(), 'today', userId] as const,
  workoutSchedule: (userId: string, startDate: string, endDate: string) =>
    [...planKeys.workout(), 'schedule', userId, startDate, endDate] as const,
  workoutTodaySchedule: (userId: string) => [...planKeys.workout(), 'today-schedule', userId] as const,

  nutrition: () => [...planKeys.all, 'nutrition'] as const,
  nutritionActive: (userId: string) => [...planKeys.nutrition(), 'active', userId] as const,
  nutritionHistory: (userId: string) => [...planKeys.nutrition(), 'history', userId] as const,
  nutritionPreview: (userId: string, replacesPlanId?: string | null) =>
    [...planKeys.nutrition(), 'preview', userId, replacesPlanId || 'latest'] as const,
  nutritionEditable: (userId: string) => [...planKeys.nutrition(), 'editable', userId] as const,
  nutritionDay: (userId: string, dayOfWeek: number, planId?: string | null) =>
    [...planKeys.nutrition(), 'day', userId, dayOfWeek, planId || 'active'] as const,
  nutritionMeal: (mealId: string) => [...planKeys.nutrition(), 'meal', mealId] as const,

  consistency: () => [...planKeys.all, 'consistency'] as const,
  consistencyHistory: (userId: string, days: number) => [...planKeys.consistency(), 'history', userId, days] as const,
  consistencyLatest: (userId: string) => [...planKeys.consistency(), 'latest', userId] as const,

  generations: (userId: string) => [...planKeys.all, 'generations', userId] as const,
};

/**
 * Get active workout plan with days and exercises.
 */
export function useActiveWorkoutPlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.workoutActive(user?.id || ''),
    queryFn: () => getActiveWorkoutPlan(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get active nutrition plan.
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

export function useLatestNutritionPlanPreview(replacesPlanId?: string | null, options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery<NutritionPlanWithDetails | null>({
    queryKey: planKeys.nutritionPreview(user?.id || '', replacesPlanId),
    queryFn: () => getLatestNutritionPlanPreview(user!.id, replacesPlanId),
    enabled: !!user && (options?.enabled ?? true),
    staleTime: 30 * 1000,
  });
}

export function useEditableNutritionPlanContext(options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery<EditableNutritionPlanContext>({
    queryKey: planKeys.nutritionEditable(user?.id || ''),
    queryFn: () => getEditableNutritionPlanContext(user!.id),
    enabled: !!user && (options?.enabled ?? true),
    staleTime: 30 * 1000,
  });
}

/**
 * Get workout plan history.
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
 * Get nutrition plan history.
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
 * Get specific workout plan day with exercises.
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
 * Get today's scheduled workout.
 */
export function useTodaysWorkout() {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.todaysWorkout(user?.id || ''),
    queryFn: () => getTodaysWorkout(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get today's schedule entry including rest/workout type.
 */
export function useTodayWorkoutScheduleEntry() {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.workoutTodaySchedule(user?.id || ''),
    queryFn: () => getTodayWorkoutScheduleEntry(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

/**
 * Get workout schedule entries within date range.
 */
export function useWorkoutSchedule(startDate: string, endDate: string, options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.workoutSchedule(user?.id || '', startDate, endDate),
    queryFn: () => getWorkoutSchedule(user!.id, startDate, endDate),
    enabled: !!user && !!startDate && !!endDate && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

/**
 * Get workout schedule entries for a specific plan ID within date range.
 * This allows fetching schedule for preview or non-active plans.
 */
export function useWorkoutScheduleByPlanId(
  planId: string | null,
  startDate: string,
  endDate: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...planKeys.workoutSchedule('by-plan', startDate, endDate), planId],
    queryFn: () => planId ? getWorkoutScheduleByPlanId(planId, startDate, endDate) : Promise.resolve([]),
    enabled: !!planId && !!startDate && !!endDate && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

/**
 * Get nutrition meals for a specific day of week.
 */
export function useNutritionPlanDay(dayOfWeek: number, options?: { enabled?: boolean; planId?: string | null }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.nutritionDay(user?.id || '', dayOfWeek, options?.planId),
    queryFn: () => getNutritionPlanMealsForDay(user!.id, dayOfWeek, options?.planId),
    enabled: !!user && dayOfWeek >= 0 && dayOfWeek <= 6 && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

/**
 * Get nutrition meal detail.
 */
export function useNutritionPlanMeal(mealId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: planKeys.nutritionMeal(mealId),
    queryFn: () => getNutritionPlanMeal(mealId),
    enabled: !!mealId && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

/**
 * Get plan generation history.
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
 * Trigger AI plan generation.
 */
export function useTriggerPlanGeneration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      input:
        | 'workout'
        | 'nutrition'
        | 'both'
        | { planType: 'workout' | 'nutrition' | 'both'; options?: PlanGenerationOptions },
    ) => {
      const planType = typeof input === 'string' ? input : input.planType;
      const options = typeof input === 'string' ? {} : input.options || {};
      return triggerPlanGeneration(user!.id, planType, options);
    },
    onSuccess: (_, input) => {
      const planType = typeof input === 'string' ? input : input.planType;

      if (planType === 'workout' || planType === 'both') {
        queryClient.invalidateQueries({ queryKey: planKeys.workoutActive(user!.id) });
        queryClient.invalidateQueries({ queryKey: planKeys.workoutHistory(user!.id) });
        queryClient.invalidateQueries({ queryKey: planKeys.todaysWorkout(user!.id) });
        queryClient.invalidateQueries({ queryKey: planKeys.workoutTodaySchedule(user!.id) });
        queryClient.invalidateQueries({ queryKey: planKeys.workout() });
        queryClient.invalidateQueries({ queryKey: progressMetricKeys.home(user!.id) });
      }

      if (planType === 'nutrition' || planType === 'both') {
        queryClient.invalidateQueries({ queryKey: planKeys.nutritionActive(user!.id) });
        queryClient.invalidateQueries({ queryKey: planKeys.nutritionHistory(user!.id) });
        queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
        queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
      }

      queryClient.invalidateQueries({ queryKey: planKeys.generations(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

/**
 * Get the latest workout preview plan replacing the current active plan.
 */
export function useWorkoutPlanPreview(replacesPlanId?: string | null, options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.workoutPreview(user?.id || '', replacesPlanId),
    queryFn: () => getLatestWorkoutPlanPreview(user!.id, replacesPlanId),
    enabled: !!user && (options?.enabled ?? true),
    staleTime: 30 * 1000,
  });
}

export function useWorkoutPlanCoherence(planId?: string | null, options?: { enabled?: boolean }) {
  return useQuery<WorkoutPlanCoherenceReport>({
    queryKey: planKeys.workoutCoherence(planId || ''),
    queryFn: () => getWorkoutPlanCoherenceReport(planId!),
    enabled: !!planId && (options?.enabled ?? true),
    staleTime: 30 * 1000,
  });
}

/**
 * Generate a preview workout plan from regeneration inputs.
 */
export function useGenerateWorkoutPlanPreview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WorkoutRegenerationRequest): Promise<WorkoutPlanPreviewResult> => {
      if (!user) throw new Error('Authentication required');
      return generateWorkoutPlanPreview(user.id, input);
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: planKeys.generations(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutPreview(user!.id, variables.current_plan_id) });
      if ('previewPlanId' in result) {
        queryClient.invalidateQueries({ queryKey: planKeys.workoutHistory(user!.id) });
      }
    },
  });
}

export function useGenerateNutritionPlanPreview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NutritionRegenerationRequest): Promise<NutritionPlanPreviewResult> => {
      if (!user) throw new Error('Authentication required');
      return generateNutritionPlanPreview(user.id, input);
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: planKeys.generations(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionPreview(user!.id, variables.current_plan_id) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionEditable(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
      if ('previewPlanId' in result) {
        queryClient.invalidateQueries({ queryKey: planKeys.nutritionHistory(user!.id) });
      }
    },
  });
}

/**
 * Activate the selected workout preview plan.
 */
export function useApplyWorkoutPlanPreview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (previewPlanId: string) => applyWorkoutPlanPreview(previewPlanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.workout() });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutActive(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutHistory(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutPreview(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.todaysWorkout(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutTodaySchedule(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
      queryClient.invalidateQueries({ queryKey: planKeys.generations(user!.id) });
    },
  });
}

export function useApplyNutritionPlanPreview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (previewPlanId: string) => applyNutritionPlanPreview(previewPlanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionActive(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionHistory(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionPreview(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionEditable(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: planKeys.generations(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

/**
 * Discard the latest workout preview plan.
 */
export function useDiscardWorkoutPlanPreview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (previewPlanId: string) => discardWorkoutPlanPreview(previewPlanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.generations(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutPreview(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutHistory(user!.id) });
    },
  });
}

export function useDiscardNutritionPlanPreview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (previewPlanId: string) => discardNutritionPlanPreview(previewPlanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.generations(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionPreview(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionEditable(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionHistory(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
    },
  });
}

export function useRepairWorkoutPlanPreview() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string): Promise<WorkoutPlanPreviewResult> => {
      if (!user) throw new Error('Authentication required');
      return repairWorkoutPlanCoherencePreview(planId);
    },
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: planKeys.workoutCoherence(planId) });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutPreview(user!.id, planId) });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutHistory(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.generations(user!.id) });
    },
  });
}

/**
 * Mark a workout day as completed.
 */
export function useMarkDayCompleted() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dayId: string) => markDayCompleted(dayId),
    onSuccess: (_, dayId) => {
      queryClient.invalidateQueries({ queryKey: planKeys.workoutDay(dayId) });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutActive(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.todaysWorkout(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutTodaySchedule(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workout() });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

/**
 * Swap an exercise in a plan.
 */
export function useSwapExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planExerciseId, newExerciseId }: { planExerciseId: string; newExerciseId: string }) =>
      swapExercise(planExerciseId, newExerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.workout() });
    },
  });
}

/**
 * Update exercise targets (sets, reps, rest).
 */
export function useUpdateExerciseTargets() {
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
      queryClient.invalidateQueries({ queryKey: planKeys.workout() });
    },
  });
}

/**
 * Add exercise block to a workout plan day.
 */
export function useAddWorkoutPlanExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planDayId,
      exerciseId,
      defaults,
    }: {
      planDayId: string;
      exerciseId: string;
      defaults?: {
        sets_target?: number;
        reps_min?: number;
        reps_max?: number;
        rest_seconds?: number;
      };
    }) => addWorkoutPlanExercise(planDayId, exerciseId, defaults),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.workout() });
    },
  });
}

/**
 * Remove exercise block from a workout plan day.
 */
export function useRemoveWorkoutPlanExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planExerciseId }: { planExerciseId: string }) =>
      removeWorkoutPlanExercise(planExerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.workout() });
    },
  });
}

/**
 * Move exercise block up/down within a workout day.
 */
export function useMoveWorkoutPlanExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planExerciseId, direction }: { planExerciseId: string; direction: 'up' | 'down' }) =>
      moveWorkoutPlanExercise(planExerciseId, direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.workout() });
    },
  });
}

/**
 * Apply meal plan change (swap/customize).
 */
export function useApplyMealPlanChange() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApplyMealPlanChangeInput) => applyMealPlanChange(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionDay(user!.id, data.dayOfWeek) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionEditable(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

export function useRepairNutritionPlanMappings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId }: { planId: string }) => repairNutritionPlanMappings(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionEditable(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

/**
 * Apply multiple meal updates for the same day.
 */
export function useApplyMealPlanBatchChange() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApplyMealPlanBatchInput) => applyMealPlanBatchChange(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionDay(user!.id, data.dayOfWeek, data.planId) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionEditable(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

/**
 * Add a meal slot to a nutrition day.
 */
export function useAddNutritionPlanMeal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ dayOfWeek, mealSlot }: { dayOfWeek: number; mealSlot: NutritionMealSlot }) =>
      addNutritionPlanMeal(user!.id, dayOfWeek, mealSlot),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionEditable(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
    },
  });
}

/**
 * Remove a meal slot from a nutrition day.
 */
export function useRemoveNutritionPlanMeal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planMealId }: { planMealId: string }) => removeNutritionPlanMeal(planMealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionEditable(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
    },
  });
}

/**
 * Move meal slot order within a day.
 */
export function useMoveNutritionPlanMeal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planMealId, direction }: { planMealId: string; direction: 'up' | 'down' }) =>
      moveNutritionPlanMeal(planMealId, direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionEditable(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
    },
  });
}

/**
 * Copy source day meal structure to one or more target days.
 */
export function useCopyNutritionDayMeals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceDayOfWeek, targetDaysOfWeek }: { sourceDayOfWeek: number; targetDaysOfWeek: number[] }) =>
      copyNutritionDayMeals(user!.id, sourceDayOfWeek, targetDaysOfWeek),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
      queryClient.invalidateQueries({ queryKey: planKeys.nutritionEditable(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
    },
  });
}

/**
 * Reschedule workout day.
 */
export function useRescheduleWorkoutDay() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: {
      planId?: string;
      scheduleId?: string;
      fromDate?: string;
      toDate: string;
      notes?: string;
    }) => rescheduleWorkoutDay(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.workout() });
      queryClient.invalidateQueries({ queryKey: planKeys.todaysWorkout(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workoutTodaySchedule(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

/**
 * Compute consistency scores for latest period.
 */
export function useComputePlanConsistency() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input?: { startDate?: string; endDate?: string; days?: number }) =>
      computePlanConsistency(input || {}),
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: planKeys.consistencyLatest(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.consistencyHistory(user!.id, input?.days || 7) });
    },
  });
}

/**
 * Get consistency history.
 */
export function useConsistencyHistory(days = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.consistencyHistory(user?.id || '', days),
    queryFn: () => getConsistencyHistory(user!.id, days),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

/**
 * Get latest consistency row.
 */
export function useLatestConsistency() {
  const { user } = useAuth();

  return useQuery({
    queryKey: planKeys.consistencyLatest(user?.id || ''),
    queryFn: () => getLatestConsistency(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

/**
 * Reactivate an old plan version.
 */
export function useReactivatePlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, planType }: { planId: string; planType: 'workout' | 'nutrition' }) =>
      reactivatePlan(user!.id, planId, planType),
    onSuccess: (_, variables) => {
      if (variables.planType === 'workout') {
        queryClient.invalidateQueries({ queryKey: planKeys.workout() });
      } else {
        queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
        queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
      }
    },
  });
}

/**
 * Combined hook for plan dashboard.
 */
export function usePlanDashboard() {
  const workoutPlanQuery = useActiveWorkoutPlan();
  const nutritionPlanQuery = useActiveNutritionPlan();
  const todaysWorkoutQuery = useTodaysWorkout();
  const latestConsistencyQuery = useLatestConsistency();

  return {
    workoutPlan: workoutPlanQuery.data,
    nutritionPlan: nutritionPlanQuery.data,
    todaysWorkout: todaysWorkoutQuery.data,
    latestConsistency: latestConsistencyQuery.data,

    isLoading:
      workoutPlanQuery.isLoading ||
      nutritionPlanQuery.isLoading ||
      todaysWorkoutQuery.isLoading ||
      latestConsistencyQuery.isLoading,

    hasWorkoutPlan: !!workoutPlanQuery.data,
    hasNutritionPlan: !!nutritionPlanQuery.data,
    hasTodaysWorkout: !!todaysWorkoutQuery.data,

    refetch: () => {
      workoutPlanQuery.refetch();
      nutritionPlanQuery.refetch();
      todaysWorkoutQuery.refetch();
      latestConsistencyQuery.refetch();
    },
  };
}

// Re-export core types for UI usage.
export type {
  UserWorkoutPlan,
  UserWorkoutPlanDay,
  UserNutritionPlan,
  PlanGenerationRun,
  NutritionPlanDayDetails,
  NutritionPlanMeal,
  WorkoutScheduleEntry,
  ConsistencyRecord,
  WorkoutPlanPreviewData,
  WorkoutPlanPreviewResult,
  WorkoutRegenerationRequest,
};
