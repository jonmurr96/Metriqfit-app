import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getWorkoutImportJob,
  importWorkoutPlan,
  resolveWorkoutImportMappings,
  type WorkoutImportResult,
  type WorkoutImportSourceType,
} from '../services/workoutImportService';

export const workoutImportKeys = {
  all: ['workout-import'] as const,
  job: (jobId: string) => [...workoutImportKeys.all, 'job', jobId] as const,
};

export function useWorkoutImportJob(jobId?: string) {
  return useQuery({
    queryKey: workoutImportKeys.job(jobId || ''),
    queryFn: () => getWorkoutImportJob(jobId || ''),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status;
      if (status === 'processing' || status === 'pending') return 1500;
      return false;
    },
  });
}

export function useImportWorkoutPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      sourceType: WorkoutImportSourceType;
      payload: string | Record<string, any>;
      format?: string;
      activate?: boolean;
    }): Promise<WorkoutImportResult> => importWorkoutPlan(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
      if (data.jobId) queryClient.invalidateQueries({ queryKey: workoutImportKeys.job(data.jobId) });
    },
  });
}

export function useResolveWorkoutImportMappings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveWorkoutImportMappings,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
      if (data.jobId) queryClient.invalidateQueries({ queryKey: workoutImportKeys.job(data.jobId) });
    },
  });
}
