import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  applyWorkoutAdaptationRecommendation,
  generateWorkoutAdaptationRecommendations,
  getWorkoutAdaptationRecommendations,
  setWorkoutAdaptationRecommendationStatus,
} from '../services/workoutAdaptationService';

export const workoutAdaptationKeys = {
  all: ['workout-adaptation'] as const,
  recommendations: (planId?: string) => [...workoutAdaptationKeys.all, 'recommendations', planId || 'all'] as const,
};

export function useWorkoutAdaptationRecommendations(planId?: string) {
  return useQuery({
    queryKey: workoutAdaptationKeys.recommendations(planId),
    queryFn: () => getWorkoutAdaptationRecommendations(planId),
    staleTime: 1000 * 30,
  });
}

export function useGenerateWorkoutAdaptationRecommendations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateWorkoutAdaptationRecommendations,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: workoutAdaptationKeys.recommendations(vars?.planId) });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}

export function useApplyWorkoutAdaptationRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applyWorkoutAdaptationRecommendation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutAdaptationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}

export function useSetWorkoutAdaptationRecommendationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setWorkoutAdaptationRecommendationStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutAdaptationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}
