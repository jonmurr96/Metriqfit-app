/**
 * Meal Generation Service
 * 
 * Integrates onboarding data with meal plan generation
 * Now with intelligent food selection based on goals and timing
 */

import type { OnboardingData } from '../onboarding';
import { calculateEnhancedTargets } from '../targets/calculateEnhancedTargets';
import type { EnhancedTargetOutput } from '../targets/calculateEnhancedTargets';
import {
  generateDayMealPlan as generateIntelligentDayPlan,
  generateWeekMealPlan as generateIntelligentWeekPlan,
  type MealGenerationConfig as IntelligentConfig,
  type GeneratedDayPlan,
  type GeneratedMeal,
  formatMealForDisplay,
  getProteinDiversity,
  type GoalType,
} from './intelligent-meal-generator';
import {
  calculateMealTimes,
  type MealTimeConfig,
} from './meal-timing-engine';
import type { 
  ProteinSource, 
  WakeTime, 
  FirstMealDelay,
  LastMealBeforeBed,
  TrainingTime,
  CarbTolerance,
  CookingLevel 
} from '../onboarding/OnboardingContext';

// Legacy imports for backward compatibility
import {
  generateDayMealPlan as legacyGenerateDayPlan,
  type MealGenerationConfig as LegacyConfig,
  type MealPlanDay,
} from './meal-generator';
import {
  matchRecipesToMealSlots,
  type Recipe,
  type MatchedRecipe,
} from './recipe-matcher';

export interface GeneratedMealPlan {
  weekPlan: {
    day: string;
    isTrainingDay: boolean;
    meals: GeneratedMeal[];
    totals: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    // Legacy recipe matching (optional)
    recipes?: MatchedRecipe[];
  }[];
  targets: EnhancedTargetOutput;
  summary: {
    trainingDays: number;
    restDays: number;
    averageCalories: number;
    macroSplit: string;
    proteinDiversity: {
      uniqueProteins: string[];
      topProteinPercentage: number;
    };
  };
}

// ============================================
// CONFIGURATION CREATION
// ============================================

/**
 * Map onboarding data to goal type
 */
function getGoalType(onboarding: OnboardingData): GoalType {
  switch (onboarding.goal_type) {
    case 'build_muscle':
    case 'gain_weight':
      return 'bulk';
    case 'lose_weight':
    case 'get_fitter':
      return 'cut';
    case 'recomp':
      return 'recomp';
    case 'maintain_weight':
    case 'increase_endurance':
    case 'general_fitness':
    default:
      return 'maintain';
  }
}

/**
 * Create intelligent meal generation config from onboarding data
 */
export function createIntelligentConfig(
  onboarding: OnboardingData,
  targets: EnhancedTargetOutput
): IntelligentConfig {
  const goal = getGoalType(onboarding);
  
  return {
    topProteins: (onboarding.preferred_proteins || []) as ProteinSource[],
    goal,
    trainingTime: (onboarding.training_time || 'evening') as TrainingTime,
    wakeTime: (onboarding.wake_time || '7_8am') as WakeTime,
    firstMealDelay: (onboarding.first_meal_delay || '1_2hrs') as FirstMealDelay,
    lastMealBeforeBed: (onboarding.last_meal_before_bed || '2hrs') as LastMealBeforeBed,
    carbTolerance: (onboarding.carb_tolerance || 'energized_satiated') as CarbTolerance,
    cookingLevel: (onboarding.cooking_level || 'basic') as CookingLevel,
    trainingDayTargets: {
      calories: targets.trainingDay.calories,
      protein: targets.trainingDay.protein_g,
      carbs: targets.trainingDay.carbs_g,
      fat: targets.trainingDay.fat_g,
    },
    restDayTargets: {
      calories: targets.restDay.calories,
      protein: targets.restDay.protein_g,
      carbs: targets.restDay.carbs_g,
      fat: targets.restDay.fat_g,
    },
  };
}

/**
 * Create legacy config (for backward compatibility)
 */
export function createLegacyConfig(
  onboarding: OnboardingData,
  targets: EnhancedTargetOutput
): LegacyConfig {
  return {
    preferredProteins: onboarding.preferred_proteins || [],
    wakeTime: onboarding.wake_time || '7_8am',
    firstMealDelay: onboarding.first_meal_delay || '1_2hrs',
    lastMealBeforeBed: onboarding.last_meal_before_bed || '2hrs',
    trainingTime: onboarding.training_time || 'evening',
    trainingDaysPerWeek: onboarding.training_days_per_week || 3,
    carbTolerance: onboarding.carb_tolerance || 'energized_satiated',
    cookingLevel: onboarding.cooking_level || 'basic',
    mealsPerDay: onboarding.meals_per_day || '3',
    dailyTargets: {
      trainingDay: {
        calories: targets.trainingDay.calories,
        protein: targets.trainingDay.protein_g,
        carbs: targets.trainingDay.carbs_g,
        fat: targets.trainingDay.fat_g,
      },
      restDay: {
        calories: targets.restDay.calories,
        protein: targets.restDay.protein_g,
        carbs: targets.restDay.carbs_g,
        fat: targets.restDay.fat_g,
      },
    },
  };
}

// ============================================
// MAIN GENERATION FUNCTIONS
// ============================================

/**
 * Generate a complete weekly meal plan using the intelligent system
 */
export function generateWeeklyMealPlan(
  onboarding: OnboardingData,
  recipes?: Recipe[], // Optional for backward compatibility
  trainingDays: string[] = ['monday', 'wednesday', 'friday']
): GeneratedMealPlan {
  // Calculate targets
  const targets = calculateEnhancedTargets({
    sex: onboarding.sex,
    dob: onboarding.dob,
    height_ft: onboarding.height_ft,
    height_in: onboarding.height_in,
    current_weight_lb: onboarding.current_weight_lb,
    goal_type: onboarding.goal_type,
    activity_level: onboarding.activity_level,
    training_days_per_week: onboarding.training_days_per_week || 3,
    minutes_per_workout: onboarding.minutes_per_workout || '60',
    experience_level: onboarding.experience_level,
    carb_tolerance: onboarding.carb_tolerance || 'energized_satiated',
    avg_steps: onboarding.avg_steps,
    target_weight_lb: onboarding.target_weight_lb,
    target_date: onboarding.target_date,
  });

  // Create generation config
  const config = createIntelligentConfig(onboarding, targets);

  // Generate week using intelligent system
  const weekPlan = generateIntelligentWeekPlan(config, trainingDays);
  
  // Map to output format
  const mappedWeekPlan = weekPlan.map(day => ({
    day: day.day,
    isTrainingDay: day.isTrainingDay,
    meals: day.meals,
    totals: day.dailyTotals,
  }));

  // Calculate summary stats
  const trainingDaysCount = mappedWeekPlan.filter(d => d.isTrainingDay).length;
  const restDaysCount = mappedWeekPlan.length - trainingDaysCount;
  const totalCalories = mappedWeekPlan.reduce((sum, d) => sum + d.totals.calories, 0);
  const avgProtein = mappedWeekPlan.reduce((sum, d) => sum + d.totals.protein, 0) / 7;
  const avgCarbs = mappedWeekPlan.reduce((sum, d) => sum + d.totals.carbs, 0) / 7;
  const avgFat = mappedWeekPlan.reduce((sum, d) => sum + d.totals.fat, 0) / 7;
  const totalCals = avgProtein * 4 + avgCarbs * 4 + avgFat * 9;
  
  const macroSplit = totalCals > 0 
    ? `${Math.round((avgProtein * 4 / totalCals) * 100)}P/${Math.round((avgCarbs * 4 / totalCals) * 100)}C/${Math.round((avgFat * 9 / totalCals) * 100)}F`
    : '0P/0C/0F';

  // Calculate protein diversity
  const diversity = getProteinDiversity(weekPlan);

  return {
    weekPlan: mappedWeekPlan,
    targets,
    summary: {
      trainingDays: trainingDaysCount,
      restDays: restDaysCount,
      averageCalories: Math.round(totalCalories / 7),
      macroSplit,
      proteinDiversity: {
        uniqueProteins: diversity.uniqueProteins,
        topProteinPercentage: diversity.topProteinPercentage,
      },
    },
  };
}

/**
 * Generate a single day's meals using the intelligent system
 */
export function generateSingleDayMeals(
  onboarding: OnboardingData,
  isTrainingDay: boolean
): GeneratedDayPlan {
  const targets = calculateEnhancedTargets({
    sex: onboarding.sex,
    dob: onboarding.dob,
    height_ft: onboarding.height_ft,
    height_in: onboarding.height_in,
    current_weight_lb: onboarding.current_weight_lb,
    goal_type: onboarding.goal_type,
    activity_level: onboarding.activity_level,
    training_days_per_week: onboarding.training_days_per_week || 3,
    minutes_per_workout: onboarding.minutes_per_workout || '60',
    experience_level: onboarding.experience_level,
    carb_tolerance: onboarding.carb_tolerance || 'energized_satiated',
    avg_steps: onboarding.avg_steps,
  });

  const config = createIntelligentConfig(onboarding, targets);
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  return generateIntelligentDayPlan(config, dayName, isTrainingDay);
}

/**
 * Legacy function for backward compatibility
 */
export function generateLegacyWeeklyMealPlan(
  onboarding: OnboardingData,
  recipes: Recipe[],
  trainingDays: string[] = ['mon', 'tue', 'thu', 'fri']
): GeneratedMealPlan {
  const targets = calculateEnhancedTargets({
    sex: onboarding.sex,
    dob: onboarding.dob,
    height_ft: onboarding.height_ft,
    height_in: onboarding.height_in,
    current_weight_lb: onboarding.current_weight_lb,
    goal_type: onboarding.goal_type,
    activity_level: onboarding.activity_level,
    training_days_per_week: onboarding.training_days_per_week || 3,
    minutes_per_workout: onboarding.minutes_per_workout || '60',
    experience_level: onboarding.experience_level,
    carb_tolerance: onboarding.carb_tolerance || 'energized_satiated',
    avg_steps: onboarding.avg_steps,
    target_weight_lb: onboarding.target_weight_lb,
    target_date: onboarding.target_date,
  });

  const config = createLegacyConfig(onboarding, targets);
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  
  const weekPlan = days.map(day => {
    const isTrainingDay = trainingDays.includes(day);
    const dayPlan = legacyGenerateDayPlan(config, isTrainingDay);

    const matchedRecipes = matchRecipesToMealSlots(
      dayPlan.meals,
      recipes,
      config.preferredProteins,
      config.cookingLevel,
      config.carbTolerance
    );

    // Convert legacy meals to new format
    const meals: GeneratedMeal[] = dayPlan.meals.map((m, i) => ({
      slot: m.slot as any,
      label: m.name,
      time: m.time,
      isTrainingRelated: m.foodFocus.includes('pre-workout') || m.foodFocus.includes('post-workout'),
      foods: [], // Legacy doesn't have food portions
      targetMacros: m.targetMacros,
      actualMacros: m.targetMacros, // Legacy uses target as actual
      notes: m.foodFocus ? [m.foodFocus] : [],
    }));

    return {
      day,
      isTrainingDay,
      meals,
      totals: dayPlan.totals,
      recipes: matchedRecipes,
    };
  });

  const trainingDaysCount = weekPlan.filter(d => d.isTrainingDay).length;
  const restDaysCount = weekPlan.length - trainingDaysCount;
  const totalCalories = weekPlan.reduce((sum, d) => sum + d.totals.calories, 0);
  const avgProtein = weekPlan.reduce((sum, d) => sum + d.totals.protein, 0) / 7;
  const avgCarbs = weekPlan.reduce((sum, d) => sum + d.totals.carbs, 0) / 7;
  const avgFat = weekPlan.reduce((sum, d) => sum + d.totals.fat, 0) / 7;
  const totalCals = avgProtein * 4 + avgCarbs * 4 + avgFat * 9;
  
  const macroSplit = totalCals > 0
    ? `${Math.round((avgProtein * 4 / totalCals) * 100)}P/${Math.round((avgCarbs * 4 / totalCals) * 100)}C/${Math.round((avgFat * 9 / totalCals) * 100)}F`
    : '0P/0C/0F';

  return {
    weekPlan,
    targets,
    summary: {
      trainingDays: trainingDaysCount,
      restDays: restDaysCount,
      averageCalories: Math.round(totalCalories / 7),
      macroSplit,
      proteinDiversity: {
        uniqueProteins: [],
        topProteinPercentage: 0,
      },
    },
  };
}

// ============================================
// PREVIEW AND UTILITY FUNCTIONS
// ============================================

/**
 * Get meal timing preview for onboarding display
 */
export function getMealTimingPreview(onboarding: OnboardingData): {
  slot: string;
  time: string;
  name: string;
  description: string;
}[] {
  const timeConfig: MealTimeConfig = {
    wakeTime: (onboarding.wake_time || '7_8am') as WakeTime,
    firstMealDelay: (onboarding.first_meal_delay || '1_2hrs') as FirstMealDelay,
    trainingTime: (onboarding.training_time || 'evening') as TrainingTime,
    lastMealBeforeBed: (onboarding.last_meal_before_bed || '2hrs') as LastMealBeforeBed,
  };

  const mealTimes = calculateMealTimes(timeConfig);

  const descriptions: Record<string, string> = {
    breakfast: 'First meal to break the fast',
    lunch: 'Midday fuel',
    dinner: 'Evening meal',
    evening_snack: 'Light evening snack',
    pre_workout: 'Fuel for your training',
    post_workout: 'Recovery nutrition',
  };

  return mealTimes.map(mt => ({
    slot: mt.slot,
    time: mt.time,
    name: mt.label,
    description: descriptions[mt.slot] || '',
  }));
}

/**
 * Format a meal for simple display
 * Shows: "200g Chicken Breast, 150g White Rice"
 */
export function formatMealSimple(meal: GeneratedMeal): string {
  if (meal.foods.length === 0) {
    return 'No foods assigned';
  }
  
  return meal.foods
    .map(f => `${f.displayPortion} ${f.food.displayName}`)
    .join(', ');
}

/**
 * Get food emoji for display
 */
export function getFoodEmoji(foodName: string): string {
  const name = foodName.toLowerCase();
  
  if (name.includes('chicken')) return '';
  if (name.includes('beef') || name.includes('steak')) return '';
  if (name.includes('fish') || name.includes('salmon')) return '';
  if (name.includes('egg')) return '';
  if (name.includes('rice')) return '';
  if (name.includes('potato')) return '';
  if (name.includes('pasta')) return '';
  if (name.includes('bread')) return '';
  if (name.includes('vegetable') || name.includes('broccoli')) return '';
  if (name.includes('fruit') || name.includes('banana') || name.includes('apple')) return '';
  if (name.includes('avocado')) return '';
  if (name.includes('nut') || name.includes('almond')) return '';
  if (name.includes('oil')) return '';
  if (name.includes('yogurt') || name.includes('dairy')) return '';
  
  return '';
}

/**
 * Validate that onboarding has all required nutrition fields
 */
export function validateNutritionOnboarding(onboarding: OnboardingData): {
  valid: boolean;
  missing: string[];
} {
  const required = [
    { field: 'dietary_preference', label: 'Dietary preference' },
    { field: 'allergies', label: 'Allergies' },
    { field: 'preferred_proteins', label: 'Protein preferences' },
    { field: 'wake_time', label: 'Wake time' },
    { field: 'first_meal_delay', label: 'First meal timing' },
    { field: 'training_time', label: 'Training time' },
    { field: 'meals_per_day', label: 'Meals per day' },
  ];

  const missing: string[] = [];

  for (const req of required) {
    const value = onboarding[req.field as keyof OnboardingData];
    if (value === null || value === undefined || 
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'string' && value === '')) {
      missing.push(req.label);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get explanation of why a food was chosen (for debugging/info)
 */
export function getFoodSelectionReason(
  food: GeneratedMeal['foods'][0],
  goal: GoalType,
  isTrainingMeal: boolean
): string {
  const reasons: string[] = [];
  
  if (food.food.category === 'protein') {
    reasons.push(`Primary protein source`);
    if (food.form) {
      reasons.push(`${food.form} form for ${goal}ing`);
    }
  }
  
  if (food.food.category === 'carb') {
    if (isTrainingMeal) {
      reasons.push(`Fast-acting carbs for training`);
    } else if (food.food.goalPreference === 'cut') {
      reasons.push(`Low calorie density for cutting`);
    }
  }
  
  if (food.food.category === 'fat') {
    if (isTrainingMeal) {
      reasons.push(`Minimal fat - around training`);
    } else {
      reasons.push(`Healthy fats`);
    }
  }
  
  return reasons.join('; ');
}
