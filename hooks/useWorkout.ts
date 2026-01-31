/**
 * React Query hooks for Workout Service
 * Handles workout programs, sessions, and history
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  getPrograms,
  getProgramWithDays,
  getExercises,
  startSession,
  getActiveSession,
  getSessionDetails,
  logSet,
  finishSession,
  getTemplateDay,
  deleteSet,
  updateSetTarget,
  checkAndUpdatePR,
  type WorkoutTemplate,
  getExerciseHistory,
  getWorkoutHistory,
  swapExercise,
} from '../services/workoutService';

export const workoutKeys = {
  all: ['workout'] as const,
  programs: () => [...workoutKeys.all, 'programs'] as const,
  program: (id: string) => [...workoutKeys.programs(), id] as const,
  exercises: (filters?: any) => [...workoutKeys.all, 'exercises', filters] as const,
  history: (userId: string) => [...workoutKeys.all, 'history', userId] as const,
  exerciseHistory: (userId: string, exerciseId: string) => [...workoutKeys.history(userId), 'exercise', exerciseId] as const,
  activeSession: () => [...workoutKeys.all, 'active-session'] as const,
};

/**
 * Get all available workout programs
 */
export function usePrograms() {
  return useQuery({
    queryKey: workoutKeys.programs(),
    queryFn: () => getPrograms(),
    staleTime: 60 * 60 * 1000, // 1 hour (rarely changes)
  });
}

/**
 * Get specific program details
 */
export function useProgramDetails(programId: string) {
  return useQuery({
    queryKey: workoutKeys.program(programId),
    queryFn: () => getProgramWithDays(programId),
    enabled: !!programId,
  });
}

/**
 * Get specific template day (for preview)
 */
export function useTemplateDay(dayId: string) {
  return useQuery({
    queryKey: ['workout', 'template-day', dayId],
    queryFn: () => getTemplateDay(dayId),
    enabled: !!dayId,
  });
}

/**
 * Get exercises
 */
export function useExercises(filters?: any) {
  return useQuery({
    queryKey: workoutKeys.exercises(filters),
    queryFn: () => getExercises(filters),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Start a new workout session
 */
export function useStartSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      planDayId,
      templateDayId,
      name,
    }: {
      planDayId?: string;
      templateDayId?: string;
      name?: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      return startSession(user.id, planDayId, templateDayId, name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });
}

/**
 * Get active workout session
 */
export function useActiveSession() {
  const { user } = useAuth();

  return useQuery({
    queryKey: workoutKeys.activeSession(),
    queryFn: async () => {
      if (!user) return null;
      return getActiveSession(user.id);
    },
    enabled: !!user,
  });
}

/**
 * Get specific session details
 */
export function useSessionDetails(sessionId: string) {
  return useQuery({
    queryKey: [...workoutKeys.all, 'session', sessionId],
    queryFn: () => getSessionDetails(sessionId),
    enabled: !!sessionId,
  });
}

/**
 * Log a set
 */
export function useLogSet() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sessionExerciseId,
      setNumber,
      reps,
      weightLb,
      rpe,
      isWarmup,
    }: {
      sessionExerciseId: string;
      setNumber: number;
      reps: number;
      weightLb?: number;
      rpe?: number;
      isWarmup?: boolean;
    }) => {
      return logSet(sessionExerciseId, setNumber, reps, weightLb, rpe, isWarmup);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
      // Also invalidate specific exercise history if we want immediate updates
      // queryClient.invalidateQueries({ queryKey: workoutKeys.exerciseHistory(user.id, '...') });
    },
  });
}

/**
 * Finish session
 */
export function useFinishSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, notes }: { sessionId: string; notes?: string }) => {
      return finishSession(sessionId, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });
}

/**
 * Delete a logged set
 */
export function useDeleteSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (setId: string) => {
      return deleteSet(setId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });
}

/**
 * Update set target (add/remove set rows)
 */
export function useUpdateSetTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionExerciseId, target }: { sessionExerciseId: string; target: number }) => {
      return updateSetTarget(sessionExerciseId, target);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
    },
  });
}

/**
 * Check and update PRs
 */
export function useCheckPR() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      exerciseId,
      weightLb,
      reps,
      setId,
    }: {
      exerciseId: string;
      weightLb: number;
      reps: number;
      setId: string;
    }) => {
      if (!user) throw new Error('User not authenticated');
      return checkAndUpdatePR(user.id, exerciseId, weightLb, reps, setId);
    },
    onSuccess: (data) => {
      if (data.isPR) {
        queryClient.invalidateQueries({ queryKey: workoutKeys.all });
      }
    },
  });
}

/**
 * Get exercise history
 */
export function useExerciseHistory(exerciseId: string, limit: number = 10) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: user ? workoutKeys.exerciseHistory(user.id, exerciseId) : [],
    queryFn: () => getExerciseHistory(user!.id, exerciseId, limit),
    enabled: !!user && !!exerciseId,
  });
}

/**
 * Get workout history
 */
export function useWorkoutHistory(limit: number = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: user ? workoutKeys.history(user.id) : [],
    queryFn: () => getWorkoutHistory(user!.id, limit),
    enabled: !!user,
  });
}

/**
 * Swap exercise in session
 */
export function useSwapExercise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionExerciseId,
      newExerciseId,
    }: {
      sessionExerciseId: string;
      newExerciseId: string;
    }) => {
      return swapExercise(sessionExerciseId, newExerciseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutKeys.activeSession() });
    },
  });
}
