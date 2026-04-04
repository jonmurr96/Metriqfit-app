/**
 * React Query hooks for Nutrition Service
 * Handles food search, logging, and daily nutrition tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  searchFoods,
  searchFoodCatalog,
  searchExternalFoods,
  upsertExternalFoodItem,
  getFoodById,
  getFoodByBarcode,
  getFavoriteFoods,
  getFavoriteFoodIds,
  addFavoriteFood,
  removeFavoriteFood,
  logFood,
  logPlannedMeal,
  getDailyTotals,
  getDailyMeals,
  deleteMealLogItem,
  copyDayMeals,
  type ExternalFoodSearchResult,
  type FavoriteFood,
  type FoodCatalogSearchResult,
  type MealSlot,
  type LogPlannedMealResult,
} from '../services/nutritionService';
import { nutritionDashboardKeys } from './useNutritionDashboard';

// Query Keys
export const nutritionKeys = {
  all: ['nutrition'] as const,
  foods: () => [...nutritionKeys.all, 'foods'] as const,
  foodSearch: (query: string) => [...nutritionKeys.foods(), 'search', query] as const,
  externalFoodSearch: (query: string) => [...nutritionKeys.foods(), 'external-search', query] as const,
  foodCatalogSearch: (query: string) => [...nutritionKeys.foods(), 'catalog-search', query] as const,
  foodById: (id: string) => [...nutritionKeys.foods(), id] as const,
  foodByBarcode: (barcode: string) => [...nutritionKeys.foods(), 'barcode', barcode] as const,
  favoriteFoods: (userId: string, query: string) => [...nutritionKeys.foods(), 'favorites', userId, query] as const,
  favoriteFoodIds: (userId: string, idsKey: string) => [...nutritionKeys.foods(), 'favorite-ids', userId, idsKey] as const,
  dailyTotals: (userId: string, date: string) => [...nutritionKeys.all, 'totals', userId, date] as const,
  dailyMeals: (userId: string, date: string) => [...nutritionKeys.all, 'meals', userId, date] as const,
};

/**
 * Search foods by query string
 */
export function useSearchFoods(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: nutritionKeys.foodSearch(query),
    queryFn: () => searchFoods(query),
    enabled: query.length >= 2 && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSearchExternalFoods(query: string, options?: { enabled?: boolean }) {
  return useQuery<ExternalFoodSearchResult[]>({
    queryKey: nutritionKeys.externalFoodSearch(query),
    queryFn: () => searchExternalFoods(query),
    enabled: query.length >= 2 && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFoodCatalogSearch(query: string, options?: { enabled?: boolean }) {
  return useQuery<FoodCatalogSearchResult[]>({
    queryKey: nutritionKeys.foodCatalogSearch(query),
    queryFn: () => searchFoodCatalog(query),
    enabled: query.length >= 2 && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a single food item by ID
 */
export function useFoodById(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: nutritionKeys.foodById(id),
    queryFn: () => getFoodById(id),
    enabled: !!id && (options?.enabled ?? true),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get food item by barcode
 */
export function useFoodByBarcode(barcode: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: nutritionKeys.foodByBarcode(barcode),
    queryFn: () => getFoodByBarcode(barcode),
    enabled: !!barcode && (options?.enabled ?? true),
    staleTime: 10 * 60 * 1000,
  });
}

export function useFavoriteFoods(query = '', options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery<FavoriteFood[]>({
    queryKey: nutritionKeys.favoriteFoods(user?.id || '', query.trim().toLowerCase()),
    queryFn: () => getFavoriteFoods(user!.id, query),
    enabled: !!user && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

export function useFavoriteFoodIds(foodIds?: string[], options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const idsKey = (foodIds || []).slice().sort().join(',');

  return useQuery<string[]>({
    queryKey: nutritionKeys.favoriteFoodIds(user?.id || '', idsKey),
    queryFn: () => getFavoriteFoodIds(user!.id, foodIds),
    enabled: !!user && (options?.enabled ?? true),
    staleTime: 60 * 1000,
  });
}

/**
 * Get daily nutrition totals
 */
export function useDailyTotals(date?: string) {
  const { user } = useAuth();
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: nutritionKeys.dailyTotals(user?.id || '', targetDate),
    queryFn: () => getDailyTotals(user!.id, targetDate),
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds - frequently updated
  });
}

/**
 * Get daily meals with items
 */
export function useDailyMeals(date?: string) {
  const { user } = useAuth();
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: nutritionKeys.dailyMeals(user?.id || '', targetDate),
    queryFn: () => getDailyMeals(user!.id, targetDate),
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

/**
 * Log food item mutation
 */
export function useLogFood() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      foodItemId,
      mealSlot,
      grams,
      date,
    }: {
      foodItemId: string;
      mealSlot: MealSlot;
      grams: number;
      date?: string;
    }) => logFood(
      user!.id,
      foodItemId,
      mealSlot,
      grams,
      date ? new Date(`${date}T12:00:00`) : undefined,
    ),
    onSuccess: (_, variables) => {
      const targetDate = variables.date || new Date().toISOString().split('T')[0];
      // Invalidate daily totals and meals
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.dailyTotals(user!.id, targetDate),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.dailyMeals(user!.id, targetDate),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionDashboardKeys.today(user!.id, targetDate),
      });
    },
  });
}

export function useAddFavoriteFood() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (foodItemId: string) => addFavoriteFood(user!.id, foodItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...nutritionKeys.foods(), 'favorites'],
      });
      queryClient.invalidateQueries({
        queryKey: [...nutritionKeys.foods(), 'favorite-ids'],
      });
    },
  });
}

export function useRemoveFavoriteFood() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (foodItemId: string) => removeFavoriteFood(user!.id, foodItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...nutritionKeys.foods(), 'favorites'],
      });
      queryClient.invalidateQueries({
        queryKey: [...nutritionKeys.foods(), 'favorite-ids'],
      });
    },
  });
}

export function useToggleFavoriteFood() {
  const addFavoriteMutation = useAddFavoriteFood();
  const removeFavoriteMutation = useRemoveFavoriteFood();

  return useMutation({
    mutationFn: async ({
      foodItemId,
      isFavorite,
    }: {
      foodItemId: string;
      isFavorite: boolean;
    }) => {
      if (isFavorite) {
        await removeFavoriteMutation.mutateAsync(foodItemId);
        return false;
      }

      await addFavoriteMutation.mutateAsync(foodItemId);
      return true;
    },
  });
}

export function useImportExternalFoodItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertExternalFoodItem,
    onSuccess: (food) => {
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.foods(),
      });
      queryClient.setQueryData(nutritionKeys.foodById(food.id), food);
    },
  });
}

export function useLogPlannedMeal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<
    LogPlannedMealResult,
    Error,
    { planMealId: string; date?: string }
  >({
    mutationFn: ({ planMealId, date }) =>
      logPlannedMeal(user!.id, {
        planMealId,
        date,
      }),
    onSuccess: (_, variables) => {
      const targetDate = variables.date || new Date().toISOString().split('T')[0];
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.dailyTotals(user!.id, targetDate),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.dailyMeals(user!.id, targetDate),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionDashboardKeys.today(user!.id, targetDate),
      });
    },
  });
}

/**
 * Delete meal log item mutation
 */
export function useDeleteMealLogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteMealLogItem(itemId),
    onSuccess: () => {
      // Invalidate all daily queries since we don't know which date
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: nutritionDashboardKeys.all,
      });
    },
  });
}

/**
 * Get nutrition stats (trends)
 */
export function useNutritionStats(days = 7) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nutrition', 'stats', user?.id, days],
    queryFn: async () => {
      if (!user) return {};
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { getNutritionStats } = await import('../services/nutritionService');
      return getNutritionStats(user.id, startDate, endDate);
    },
    enabled: !!user,
  });
}

/**
 * Copy meals from one day to another
 */
export function useCopyMeals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ fromDate, toDate }: { fromDate: string; toDate: string }) =>
      copyDayMeals(user!.id, fromDate, toDate),
    onSuccess: (_, variables) => {
      // Invalidate queries for the target date
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.dailyTotals(user!.id, variables.toDate),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.dailyMeals(user!.id, variables.toDate),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionDashboardKeys.today(user!.id, variables.toDate),
      });
    },
  });
}
