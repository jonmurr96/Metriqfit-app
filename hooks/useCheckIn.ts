import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { applyCheckInUpdates, previewCheckIn, type CheckInPreviewResult } from '../services/checkInService';
import { nutritionDashboardKeys } from './useNutritionDashboard';
import { progressBodyKeys } from './useProgressBody';
import { progressMetricKeys } from './useProgressMetrics';
import { userKeys } from './useUser';
import { waterKeys } from './useWater';

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
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.profile(user!.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.targets(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: waterKeys.all });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: progressMetricKeys.all });
      queryClient.invalidateQueries({ queryKey: progressBodyKeys.all });
    },
  });
}

export function useApplyCheckInUpdates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preview: CheckInPreviewResult) => applyCheckInUpdates(user!.id, preview),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.profile(user!.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.targets(user!.id) });
      queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: waterKeys.all });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      queryClient.invalidateQueries({ queryKey: progressMetricKeys.all });
      queryClient.invalidateQueries({ queryKey: progressBodyKeys.all });
    },
  });
}
