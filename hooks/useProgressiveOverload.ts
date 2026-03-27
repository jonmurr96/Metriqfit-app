/**
 * React Query hooks for Progressive Overload Service
 * Handles progression suggestions, analysis, and application
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  analyzeExerciseProgression,
  detectProgressionOpportunity,
  getPendingSuggestions,
  getSuggestionsForExercises,
  applySuggestion,
  dismissSuggestion,
  generateSuggestionsForWorkout,
  type ProgressionSuggestion,
  type ProgressionRecommendation,
  type ExerciseProgressionAnalysis,
} from '../services/progressiveOverloadService';

export const progressionKeys = {
  all: ['progression'] as const,
  suggestions: (userId: string) => [...progressionKeys.all, 'suggestions', userId] as const,
  pending: (userId: string) => [...progressionKeys.suggestions(userId), 'pending'] as const,
  forExercises: (userId: string, exerciseIds: string[]) =>
    [...progressionKeys.suggestions(userId), 'exercises', exerciseIds] as const,
  analysis: (userId: string, exerciseId: string) =>
    [...progressionKeys.all, 'analysis', userId, exerciseId] as const,
};

/**
 * Get pending progression suggestions for the current user
 */
export function usePendingSuggestions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: progressionKeys.pending(user?.id || ''),
    queryFn: () => getPendingSuggestions(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get progression suggestions for specific exercises (for pre-workout display)
 */
export function useSuggestionsForExercises(exerciseIds: string[]) {
  const { user } = useAuth();

  return useQuery({
    queryKey: progressionKeys.forExercises(user?.id || '', exerciseIds),
    queryFn: () => getSuggestionsForExercises(user!.id, exerciseIds),
    enabled: !!user && exerciseIds.length > 0,
    staleTime: 60 * 1000, // 1 minute (suggestions should be fresh)
  });
}

/**
 * Analyze a single exercise's progression opportunity
 * Useful for exercise detail views or real-time analysis
 */
export function useExerciseProgression(exerciseId: string, exerciseName?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: progressionKeys.analysis(user?.id || '', exerciseId),
    queryFn: async (): Promise<{
      analysis: ExerciseProgressionAnalysis | null;
      recommendation: ProgressionRecommendation | null;
    }> => {
      if (!user) return { analysis: null, recommendation: null };

      const analysis = await analyzeExerciseProgression(user.id, exerciseId, exerciseName);
      if (!analysis) return { analysis: null, recommendation: null };

      const recommendation = detectProgressionOpportunity(analysis);
      return { analysis, recommendation };
    },
    enabled: !!user && !!exerciseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Generate progression suggestions for an entire workout
 * Called when user starts a workout session
 */
export function useGenerateSuggestionsForWorkout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (exercises: Array<{ id: string; name: string }>) => {
      if (!user) throw new Error('User not authenticated');
      return generateSuggestionsForWorkout(user.id, exercises);
    },
    onSuccess: (recommendations, exercises) => {
      // Invalidate suggestions cache to show new recommendations
      queryClient.invalidateQueries({
        queryKey: progressionKeys.suggestions(user!.id),
      });

      // Also invalidate specific exercise analyses
      exercises.forEach(ex => {
        queryClient.invalidateQueries({
          queryKey: progressionKeys.analysis(user!.id, ex.id),
        });
      });
    },
  });
}

/**
 * Apply a progression suggestion
 * Marks suggestion as applied and can update session exercise targets
 */
export function useApplySuggestion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      suggestionId,
      sessionExerciseId,
    }: {
      suggestionId: string;
      sessionExerciseId?: string;
    }) => {
      await applySuggestion(suggestionId);
      return { suggestionId, sessionExerciseId };
    },
    onSuccess: () => {
      // Invalidate suggestions to update UI
      queryClient.invalidateQueries({
        queryKey: progressionKeys.suggestions(user!.id),
      });

      // Invalidate active session if session exercise was updated
      queryClient.invalidateQueries({
        queryKey: ['workout', 'active-session'],
      });
    },
  });
}

/**
 * Dismiss a progression suggestion
 */
export function useDismissSuggestion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (suggestionId: string) => {
      await dismissSuggestion(suggestionId);
      return suggestionId;
    },
    onSuccess: () => {
      // Invalidate suggestions to update UI
      queryClient.invalidateQueries({
        queryKey: progressionKeys.suggestions(user!.id),
      });
    },
  });
}

/**
 * Helper hook to check if there are any actionable suggestions
 */
export function useHasProgressionOpportunities() {
  const { data: suggestions, isLoading } = usePendingSuggestions();

  const actionableSuggestions = (suggestions || []).filter(
    s =>
      s.suggestion_type === 'increase_weight' ||
      s.suggestion_type === 'increase_reps' ||
      s.suggestion_type === 'deload'
  );

  return {
    hasOpportunities: actionableSuggestions.length > 0,
    count: actionableSuggestions.length,
    suggestions: actionableSuggestions,
    isLoading,
  };
}

// Export types for convenience
export type {
  ProgressionSuggestion,
  ProgressionRecommendation,
  ExerciseProgressionAnalysis,
};
