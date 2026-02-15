import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getMealTimes, 
  updateMealTimes, 
  MealTimes, 
  DEFAULT_MEAL_TIMES,
  formatTime12h 
} from '../services/mealTimesService';
import { useAuth } from '../lib/auth';

export function useMealTimes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['meal-times', user?.id],
    queryFn: () => getMealTimes(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const mutation = useMutation({
    mutationFn: (updates: Partial<MealTimes>) => updateMealTimes(user!.id, updates),
    onSuccess: (newData) => {
      queryClient.setQueryData(['meal-times', user?.id], newData);
    },
  });

  return {
    mealTimes: data || DEFAULT_MEAL_TIMES,
    isLoading,
    error,
    updateMealTimes: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}

/**
 * Hook to get formatted meal times for display
 */
export function useFormattedMealTimes() {
  const { mealTimes, isLoading } = useMealTimes();

  return {
    breakfast: formatTime12h(mealTimes.breakfast),
    lunch: formatTime12h(mealTimes.lunch),
    dinner: formatTime12h(mealTimes.dinner),
    snack: formatTime12h(mealTimes.snack),
    raw: mealTimes,
    isLoading,
  };
}

export { formatTime12h, DEFAULT_MEAL_TIMES };
export type { MealTimes };
