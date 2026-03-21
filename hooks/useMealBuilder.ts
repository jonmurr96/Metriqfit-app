import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import { buildMealsFromConstraints, applyMealsBatch } from '../services/mealBuilderService';
import { planKeys } from './usePlan';
import { groceryKeys } from './useGrocery';
import { pantryKeys } from './usePantry';
import { nutritionDashboardKeys } from './useNutritionDashboard';

export const mealBuilderKeys = {
  all: ['meal-builder'] as const,
};

export function useBuildMealsFromConstraints() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: buildMealsFromConstraints,
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: groceryKeys.lists(user.id) });
        queryClient.invalidateQueries({ queryKey: pantryKeys.items(user.id) });
        queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.tools(user.id) });
      }
    },
  });
}

export function useApplyMealsBatch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: applyMealsBatch,
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
        queryClient.invalidateQueries({ queryKey: planKeys.nutritionActive(user.id) });
        queryClient.invalidateQueries({ queryKey: planKeys.nutritionEditable(user.id) });
        queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
      }
    },
  });
}
