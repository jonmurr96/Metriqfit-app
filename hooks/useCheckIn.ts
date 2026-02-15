import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { applyCheckInUpdates, previewCheckIn, type CheckInPreviewResult } from '../services/checkInService';

export function usePreviewCheckIn() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      weightValue,
      unitSystem,
      sleep,
      stress,
      energy,
    }: {
      weightValue: number;
      unitSystem: 'imperial' | 'metric';
      sleep: number;
      stress: number;
      energy: number;
    }) =>
      previewCheckIn({
        userId: user!.id,
        weightValue,
        unitSystem,
        sleep,
        stress,
        energy,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
  });
}

export function useApplyCheckInUpdates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preview: CheckInPreviewResult) => applyCheckInUpdates(user!.id, preview),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: ['water'] });
    },
  });
}
