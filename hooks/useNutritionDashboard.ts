import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  getNutritionTodaySnapshot,
  type NutritionTodaySnapshot,
} from '../services/nutritionDashboardService';
import {
  getNutritionToolsSnapshot,
  type NutritionToolsSnapshot,
} from '../services/nutritionToolsService';

export const nutritionDashboardKeys = {
  all: ['nutrition-dashboard'] as const,
  today: (userId: string, date: string) => [...nutritionDashboardKeys.all, 'today', userId, date] as const,
  tools: (userId: string) => [...nutritionDashboardKeys.all, 'tools', userId] as const,
};

function resolveDate(date?: string) {
  return date || new Date().toISOString().split('T')[0];
}

export function useNutritionTodaySnapshot(date?: string) {
  const { user } = useAuth();
  const targetDate = resolveDate(date);

  return useQuery<NutritionTodaySnapshot>({
    queryKey: nutritionDashboardKeys.today(user?.id || '', targetDate),
    queryFn: () => getNutritionTodaySnapshot(user!.id, targetDate),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function useNutritionToolsSnapshot() {
  const { user } = useAuth();

  return useQuery<NutritionToolsSnapshot>({
    queryKey: nutritionDashboardKeys.tools(user?.id || ''),
    queryFn: () => getNutritionToolsSnapshot(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}
