/**
 * Meal Generator
 * 
 * Generates personalized meal plans based on:
 * - Preferred proteins (prioritize top 3)
 * - Schedule (wake time, meal timing)
 * - Training time (pre/post workout nutrition)
 * - Carb tolerance (macro distribution)
 * - Cooking level (recipe complexity)
 */

import type {
  ProteinSource,
  WakeTime,
  FirstMealDelay,
  LastMealBeforeBed,
  TrainingTime,
  CarbTolerance,
  CookingLevel,
  MealsPerDay,
} from '../onboarding';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MealTiming {
  slot: 'meal_1' | 'pre_workout' | 'post_workout' | 'meal_2' | 'meal_3' | 'meal_4' | 'snack_1' | 'snack_2' | 'bedtime';
  time: string; // HH:MM format
  description: string;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealPlanMeal {
  slot: MealTiming['slot'];
  time: string;
  name: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  foodFocus: string[];
  avoid: string[];
}

export interface MealPlanDay {
  meals: MealPlanMeal[];
  totals: MacroTargets;
  isTrainingDay: boolean;
}

export interface MealGenerationConfig {
  // User preferences
  preferredProteins: ProteinSource[];
  wakeTime: WakeTime;
  firstMealDelay: FirstMealDelay;
  lastMealBeforeBed: LastMealBeforeBed;
  trainingTime: TrainingTime;
  trainingDaysPerWeek: number;
  carbTolerance: CarbTolerance;
  cookingLevel: CookingLevel;
  mealsPerDay: MealsPerDay;
  
  // Targets
  dailyTargets: {
    trainingDay: MacroTargets;
    restDay: MacroTargets;
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WAKE_TIME_HOURS: Record<WakeTime, number> = {
  '5_6am': 5.5,
  '7_8am': 7.5,
  '9_10am': 9.5,
  'other': 8,
};

const FIRST_MEAL_DELAY_MINUTES: Record<FirstMealDelay, number> = {
  'immediate': 0,
  '1_2hrs': 90,
  '3hrs_plus': 180,
};

const LAST_MEAL_OFFSET_HOURS: Record<LastMealBeforeBed, number> = {
  '2hrs': -2,
  '3_4hrs': -3.5,
  'no_constraint': -1,
};

const TRAINING_TIME_HOURS: Record<TrainingTime, number | null> = {
  'early_morning': 6,
  'mid_morning': 9,
  'midday': 12.5,
  'afternoon': 16.5,
  'evening': 20,
  'no_training': null,
};

// Food timing rules for meal generation
const FOOD_TIMING_RULES: Record<string, {
  priority: string[];
  avoid: string[];
  timing: string;
}> = {
  pre_workout: {
    priority: ['easily_digestible_carbs', 'lean_protein', 'low_fat', 'low_fiber'],
    avoid: ['high_fat', 'high_fiber', 'large_volume', 'spicy'],
    timing: '1-2 hours before training',
  },
  post_workout: {
    priority: ['fast_carbs', 'lean_protein', 'hydration'],
    avoid: ['high_fat', 'high_fiber', 'slow_digesting'],
    timing: 'within 1 hour after training',
  },
  meal_1: {
    priority: ['protein', 'complex_carbs', 'satiating'],
    avoid: ['high_sugar', 'processed'],
    timing: 'first meal of day',
  },
  evening: {
    priority: ['protein', 'vegetables', 'moderate_fat'],
    avoid: ['high_carb', 'large_portions', 'caffeine'],
    timing: 'last substantial meal',
  },
};

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Calculate meal times based on schedule preferences
 */
export function calculateMealTimes(config: MealGenerationConfig): MealTiming[] {
  const wakeHour = WAKE_TIME_HOURS[config.wakeTime];
  const firstMealDelay = FIRST_MEAL_DELAY_MINUTES[config.firstMealDelay];
  const trainingHour = TRAINING_TIME_HOURS[config.trainingTime];
  const mealCount = parseInt(config.mealsPerDay.replace('_plus', '').replace('no_preference', '3')) || 3;
  
  // Calculate first meal time
  const firstMealHour = wakeHour + (firstMealDelay / 60);
  
  // Calculate last meal time (assume bedtime is wake + 16 hours, minus last meal offset)
  const bedTime = wakeHour + 16;
  const lastMealHour = bedTime + LAST_MEAL_OFFSET_HOURS[config.lastMealBeforeBed];
  
  const meals: MealTiming[] = [];
  
  // Determine if training and meal timing relationship
  const isTrainingDay = trainingHour !== null;
  
  if (isTrainingDay && trainingHour) {
    // Pre-workout meal timing
    const preWorkoutTime = trainingHour - 1.5; // 1.5 hours before
    
    // Post-workout meal timing  
    const postWorkoutTime = trainingHour + 0.5; // 30 min after
    
    // Generate meals around training
    if (firstMealHour < preWorkoutTime - 1) {
      meals.push({ slot: 'meal_1', time: formatTime(firstMealHour), description: 'First meal' });
    }
    
    meals.push({ slot: 'pre_workout', time: formatTime(preWorkoutTime), description: 'Pre-workout fuel' });
    meals.push({ slot: 'post_workout', time: formatTime(postWorkoutTime), description: 'Post-workout recovery' });
    
    // Add remaining meals
    let remainingMeals = mealCount - meals.length;
    if (remainingMeals > 0) {
      const gap = (lastMealHour - postWorkoutTime) / (remainingMeals + 1);
      for (let i = 1; i <= remainingMeals; i++) {
        const time = postWorkoutTime + gap * i;
        meals.push({ 
          slot: `meal_${i + 1}` as MealTiming['slot'], 
          time: formatTime(time), 
          description: `Meal ${i + 1}` 
        });
      }
    }
  } else {
    // No training - distribute evenly
    const totalHours = lastMealHour - firstMealHour;
    const gap = totalHours / (mealCount - 1);
    
    for (let i = 0; i < mealCount; i++) {
      const time = firstMealHour + gap * i;
      meals.push({ 
        slot: `meal_${i + 1}` as MealTiming['slot'], 
        time: formatTime(time), 
        description: `Meal ${i + 1}` 
      });
    }
  }
  
  // Sort by time
  meals.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  
  return meals;
}

/**
 * Calculate macro distribution for each meal
 */
export function calculateMealMacros(
  meals: MealTiming[],
  dailyTargets: MacroTargets,
  carbTolerance: CarbTolerance,
  isTrainingDay: boolean
): MacroTargets[] {
  const mealCount = meals.length;
  
  // Base distribution percentages
  let distributions: number[];
  
  // Adjust based on carb tolerance and training
  if (carbTolerance === 'hungry_quickly') {
    // More even distribution for sustained energy
    distributions = Array(mealCount).fill(1 / mealCount);
  } else if (carbTolerance === 'tired_sleepy' || carbTolerance === 'bloated') {
    // Front-load or back-load based on training
    if (isTrainingDay) {
      // Front-load around training
      distributions = meals.map((m, i) => {
        if (m.slot === 'pre_workout') return 0.25;
        if (m.slot === 'post_workout') return 0.30;
        return 0.45 / (mealCount - 2);
      });
    } else {
      // More even on rest days
      distributions = Array(mealCount).fill(1 / mealCount);
    }
  } else {
    // Standard distribution
    distributions = Array(mealCount).fill(1 / mealCount);
  }
  
  // Apply to targets
  return distributions.map(pct => ({
    calories: Math.round(dailyTargets.calories * pct),
    protein: Math.round(dailyTargets.protein * pct),
    carbs: Math.round(dailyTargets.carbs * pct),
    fat: Math.round(dailyTargets.fat * pct),
  }));
}

/**
 * Generate complete meal plan for a day
 */
export function generateDayMealPlan(
  config: MealGenerationConfig,
  isTrainingDay: boolean
): MealPlanDay {
  const targets = isTrainingDay 
    ? config.dailyTargets.trainingDay 
    : config.dailyTargets.restDay;
  
  // Calculate meal times
  const mealTimes = calculateMealTimes(config);
  
  // Calculate macros for each meal
  const mealMacros = calculateMealMacros(
    mealTimes,
    targets,
    config.carbTolerance,
    isTrainingDay
  );
  
  // Generate meals
  const meals: MealPlanMeal[] = mealTimes.map((timing, i) => {
    const macros = mealMacros[i];
    const rules = getFoodTimingRules(timing.slot);
    
    return {
      slot: timing.slot,
      time: timing.time,
      name: getMealName(timing.slot),
      targetCalories: macros.calories,
      targetProtein: macros.protein,
      targetCarbs: macros.carbs,
      targetFat: macros.fat,
      foodFocus: rules.priority,
      avoid: rules.avoid,
    };
  });
  
  return {
    meals,
    totals: targets,
    isTrainingDay,
  };
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function getFoodTimingRules(slot: MealTiming['slot']) {
  if (slot === 'pre_workout') return FOOD_TIMING_RULES.pre_workout;
  if (slot === 'post_workout') return FOOD_TIMING_RULES.post_workout;
  if (slot === 'meal_1') return FOOD_TIMING_RULES.meal_1;
  if (['meal_3', 'meal_4'].includes(slot)) return FOOD_TIMING_RULES.evening;
  return { priority: ['balanced'], avoid: [], timing: 'standard meal' };
}

function getMealName(slot: MealTiming['slot']): string {
  const names: Record<string, string> = {
    meal_1: 'First Meal',
    pre_workout: 'Pre-Workout',
    post_workout: 'Post-Workout',
    meal_2: 'Lunch',
    meal_3: 'Dinner',
    meal_4: 'Evening Meal',
    snack_1: 'Snack',
    snack_2: 'Snack',
    bedtime: 'Bedtime Snack',
  };
  return names[slot] || 'Meal';
}

// ---------------------------------------------------------------------------
// Recipe Matching
// ---------------------------------------------------------------------------

export interface RecipeMatchScore {
  recipeId: string;
  score: number;
  reasons: string[];
}

/**
 * Score recipes based on user preferences
 */
export function scoreRecipesForMeal(
  meal: MealPlanMeal,
  preferredProteins: ProteinSource[],
  cookingLevel: CookingLevel,
  availableRecipes: any[] // Would be Recipe type from recipe system
): RecipeMatchScore[] {
  return availableRecipes.map(recipe => {
    let score = 0;
    const reasons: string[] = [];
    
    // Protein preference match
    const recipeProteins = recipe.proteinSources || [];
    const hasPreferredProtein = preferredProteins.some(p => 
      recipeProteins.includes(p)
    );
    if (hasPreferredProtein) {
      score += 20;
      reasons.push('Uses preferred protein');
    }
    
    // Cooking level match
    const recipeComplexity = recipe.complexity || 'basic';
    const complexityOrder = ['minimal', 'basic', 'moderate', 'full'];
    const userLevel = complexityOrder.indexOf(cookingLevel);
    const recipeLevel = complexityOrder.indexOf(recipeComplexity);
    
    if (recipeLevel <= userLevel) {
      score += 15;
      reasons.push('Matches cooking skill');
    } else {
      score -= 10;
      reasons.push('Too complex');
    }
    
    // Meal slot appropriateness
    if (meal.slot === 'pre_workout' && recipe.preWorkoutAppropriate) {
      score += 25;
      reasons.push('Good pre-workout choice');
    }
    if (meal.slot === 'post_workout' && recipe.postWorkoutAppropriate) {
      score += 25;
      reasons.push('Good post-workout choice');
    }
    
    // Macro alignment
    const calorieDiff = Math.abs(recipe.calories - meal.targetCalories);
    const calorieScore = Math.max(0, 20 - calorieDiff / 20);
    score += calorieScore;
    if (calorieScore > 15) reasons.push('Good calorie match');
    
    return { recipeId: recipe.id, score, reasons };
  }).sort((a, b) => b.score - a.score);
}
