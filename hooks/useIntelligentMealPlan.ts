/**
 * useIntelligentMealPlan Hook
 * 
 * React hook for generating and managing intelligent meal plans
 */

import { useState, useCallback, useEffect } from 'react';
import { useOnboarding } from '@/lib/onboarding';
import {
  generateWeeklyMealPlan,
  generateSingleDayMeals,
  type GeneratedMealPlan,
  type GeneratedDayPlan,
  type GeneratedMeal,
} from '@/lib/nutrition';

export interface UseIntelligentMealPlanOptions {
  trainingDays?: string[];
  autoGenerate?: boolean;
}

export interface UseIntelligentMealPlanReturn {
  // Data
  weekPlan: GeneratedMealPlan | null;
  currentDayPlan: GeneratedDayPlan | null;
  
  // Loading states
  isLoading: boolean;
  isGenerating: boolean;
  
  // Actions
  generatePlan: () => void;
  generateDay: (isTrainingDay: boolean) => void;
  refreshPlan: () => void;
  swapMeal: (dayIndex: number, mealIndex: number, newMeal: GeneratedMeal) => void;
  
  // Stats
  proteinDiversity: number;
  averageCalories: number;
}

/**
 * Hook for intelligent meal plan generation
 */
export function useIntelligentMealPlan(
  options: UseIntelligentMealPlanOptions = {}
): UseIntelligentMealPlanReturn {
  const { trainingDays = ['monday', 'wednesday', 'friday'], autoGenerate = true } = options;
  const { data: onboardingData } = useOnboarding();
  
  const [weekPlan, setWeekPlan] = useState<GeneratedMealPlan | null>(null);
  const [currentDayPlan, setCurrentDayPlan] = useState<GeneratedDayPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get today's day index (0 = Monday)
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  /**
   * Generate full week meal plan
   */
  const generatePlan = useCallback(() => {
    if (!onboardingData) {
      console.warn('Cannot generate plan: No onboarding data');
      return;
    }
    
    setIsGenerating(true);
    setIsLoading(true);
    
    try {
      const plan = generateWeeklyMealPlan(onboardingData, undefined, trainingDays);
      setWeekPlan(plan);
      setCurrentDayPlan(plan.weekPlan[todayIndex]);
    } catch (error) {
      console.error('Error generating meal plan:', error);
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  }, [onboardingData, trainingDays, todayIndex]);

  /**
   * Generate single day meal plan
   */
  const generateDay = useCallback((isTrainingDay: boolean) => {
    if (!onboardingData) {
      console.warn('Cannot generate day: No onboarding data');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const dayPlan = generateSingleDayMeals(onboardingData, isTrainingDay);
      setCurrentDayPlan(dayPlan);
    } catch (error) {
      console.error('Error generating day plan:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onboardingData]);

  /**
   * Refresh existing plan
   */
  const refreshPlan = useCallback(() => {
    generatePlan();
  }, [generatePlan]);

  /**
   * Swap a meal in the plan
   */
  const swapMeal = useCallback((
    dayIndex: number,
    mealIndex: number,
    newMeal: GeneratedMeal
  ) => {
    setWeekPlan(prev => {
      if (!prev) return null;
      
      const newWeekPlan = { ...prev };
      const newDayPlan = { ...newWeekPlan.weekPlan[dayIndex] };
      const newMeals = [...newDayPlan.meals];
      
      newMeals[mealIndex] = newMeal;
      newDayPlan.meals = newMeals;
      
      // Recalculate daily totals
      newDayPlan.dailyTotals = newMeals.reduce(
        (acc, meal) => ({
          calories: acc.calories + meal.actualMacros.calories,
          protein: acc.protein + meal.actualMacros.protein,
          carbs: acc.carbs + meal.actualMacros.carbs,
          fat: acc.fat + meal.actualMacros.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      
      newWeekPlan.weekPlan[dayIndex] = newDayPlan;
      
      // Update current day if it's the one being modified
      if (dayIndex === todayIndex) {
        setCurrentDayPlan(newDayPlan);
      }
      
      return newWeekPlan;
    });
  }, [todayIndex]);

  // Auto-generate on mount if enabled
  useEffect(() => {
    if (autoGenerate && onboardingData && !weekPlan) {
      generatePlan();
    }
  }, [autoGenerate, onboardingData, weekPlan, generatePlan]);

  // Stats
  const proteinDiversity = weekPlan?.summary.proteinDiversity.topProteinPercentage || 0;
  const averageCalories = weekPlan?.summary.averageCalories || 0;

  return {
    // Data
    weekPlan,
    currentDayPlan,
    
    // Loading states
    isLoading,
    isGenerating,
    
    // Actions
    generatePlan,
    generateDay,
    refreshPlan,
    swapMeal,
    
    // Stats
    proteinDiversity,
    averageCalories,
  };
}
