/**
 * Intelligent Meal Generator
 * 
 * Generates goal-based, timing-optimized meal plans with:
 * - Protein prioritization (80% user's top 3)
 * - Food form selection (whole vs ground based on goal)
 * - Carb/fat timing (fast/slow carbs, minimal fats around training)
 * - Exact portion calculations
 */

import type { 
  ProteinSource, 
  WakeTime, 
  FirstMealDelay,
  LastMealBeforeBed,
  TrainingTime, 
  CarbTolerance,
  CookingLevel 
} from '../onboarding/OnboardingContext';
import type { MacroTargets } from './target-calculator';
import {
  type FoodItem,
  type MealTiming,
  type GoalPreference,
  proteinFoods,
  carbFoods,
  fatFoods,
  calculatePortion,
  calculateMacrosForPortion,
  formatPortion,
  getFoodsForTiming,
  getFoodsForGoal,
} from './food-database';
import { 
  calculateMealTimes, 
  type MealSlot,
  type MealTimeConfig,
  isTrainingMeal,
} from './meal-timing-engine';

export type GoalType = 'bulk' | 'cut' | 'maintain' | 'recomp';

export interface MealGenerationConfig {
  // User preferences
  topProteins: ProteinSource[]; // Top 3 ranked proteins
  goal: GoalType;
  trainingTime: TrainingTime;
  wakeTime: WakeTime;
  firstMealDelay: FirstMealDelay;
  lastMealBeforeBed: LastMealBeforeBed;
  carbTolerance: CarbTolerance;
  cookingLevel: CookingLevel;
  
  // Targets
  trainingDayTargets: MacroTargets;
  restDayTargets: MacroTargets;
  
  // Optional
  customWakeTime?: string;
  customTrainingTime?: string;
}

export interface FoodPortion {
  food: FoodItem;
  grams: number;
  displayPortion: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  form?: 'whole' | 'ground' | 'lean' | 'minced' | 'liquid';
}

export interface GeneratedMeal {
  slot: MealSlot['slot'];
  label: string;
  time: string;
  isTrainingRelated: boolean;
  foods: FoodPortion[];
  targetMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  actualMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  notes: string[]; // Internal notes, not displayed to user
}

export interface GeneratedDayPlan {
  day: string;
  isTrainingDay: boolean;
  meals: GeneratedMeal[];
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// ============================================
// GOAL MATCHING HELPER
// ============================================

function foodMatchesGoal(foodGoal: GoalPreference, userGoal: GoalType): boolean {
  if (foodGoal === 'both') return true;
  if (userGoal === 'bulk') return foodGoal === 'bulk';
  if (userGoal === 'cut') return foodGoal === 'cut';
  // maintain and recomp accept any food preference
  return true;
}

// ============================================
// PROTEIN SELECTION LOGIC
// ============================================

/**
 * Map protein source enum to food IDs
 */
function getProteinFoodIds(source: ProteinSource): string[] {
  const mapping: Record<ProteinSource, string[]> = {
    'chicken': ['chicken_breast', 'chicken_thigh', 'ground_chicken'],
    'turkey': ['turkey_breast', 'ground_turkey_93_7'],
    'beef': ['beef_steak_sirloin', 'ground_beef_93_7', 'ground_beef_85_15'],
    'pork': ['ground_beef_93_7'], // Fallback to lean beef if pork not available
    'fish': ['tilapia', 'cod', 'salmon', 'tuna'],
    'shellfish': ['shrimp', 'cod'], // Fallback
    'eggs': ['whole_eggs', 'egg_whites'],
    'dairy': ['greek_yogurt_nonfat', 'cottage_cheese_lowfat'],
    'tofu_tempeh': ['tofu_firm', 'tempeh'],
    'legumes': ['tempeh', 'tofu_firm'], // Fallback to soy
    'protein_powder': ['whey_protein', 'casein_protein'],
  };
  return mapping[source] || [];
}

/**
 * Select protein for a meal with 80/20 rule
 * 80% of time: use one of user's top 3 proteins
 * 20% of time: use variety protein
 */
function selectProtein(
  topProteins: ProteinSource[],
  goal: GoalType,
  timing: MealTiming,
  excludeFoods: string[] = []
): FoodItem | null {
  const useTopProtein = Math.random() < 0.8;
  let candidateIds: string[] = [];
  
  if (useTopProtein) {
    // Pick one of top 3 proteins randomly
    const randomTop = topProteins[Math.floor(Math.random() * Math.min(3, topProteins.length))];
    candidateIds = getProteinFoodIds(randomTop);
  } else {
    // Use variety - get all other proteins
    const varietyProteins = proteinFoods.filter(p => 
      !topProteins.some(tp => getProteinFoodIds(tp).includes(p.id))
    );
    candidateIds = varietyProteins.map(p => p.id);
  }
  
  // Filter out excluded foods
  candidateIds = candidateIds.filter(id => !excludeFoods.includes(id));
  
  // Get food items
  let candidates = candidateIds
    .map(id => proteinFoods.find(p => p.id === id))
    .filter((p): p is FoodItem => p !== undefined);
  
  // Filter by timing appropriateness
  candidates = candidates.filter(p => p.timingAppropriate.includes(timing));
  
  // Filter by goal preference
  candidates = candidates.filter(p => foodMatchesGoal(p.goalPreference, goal));
  
  if (candidates.length === 0) {
    // Fallback: any protein that fits timing
    candidates = proteinFoods.filter(p => 
      p.timingAppropriate.includes(timing) &&
      foodMatchesGoal(p.goalPreference, goal)
    );
  }
  
  if (candidates.length === 0) {
    // Last resort: chicken breast
    return proteinFoods.find(p => p.id === 'chicken_breast') || null;
  }
  
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * Get appropriate form for protein based on goal
 */
function getProteinForm(protein: FoodItem, goal: GoalType): string {
  // Map maintain/recomp to a concrete form since the DB only stores bulk/cut
  const mappedGoal: 'bulk' | 'cut' =
    goal === 'bulk' ? 'bulk' :
    goal === 'cut' ? 'cut' :
    goal === 'recomp' ? 'cut' : // lean form for recomp
    'bulk'; // maintain defaults to whole/bulk form
  
  const goalForm = protein.defaultFormForGoal[mappedGoal];
  
  if (protein.availableForms.includes(goalForm)) {
    return goalForm;
  }
  
  return protein.availableForms[0];
}

// ============================================
// CARB SELECTION LOGIC
// ============================================

/**
 * Select carb source based on goal, timing, and meal slot
 */
function selectCarb(
  goal: GoalType,
  slot: MealSlot['slot'],
  isTrainingDay: boolean,
  targetCarbs: number
): FoodItem | null {
  let candidates: FoodItem[] = [];
  
  if (slot === 'pre_workout' || slot === 'post_workout') {
    // Training meals: fast-acting carbs
    candidates = carbFoods.filter(c => 
      c.digestionSpeed === 'fast' &&
      c.timingAppropriate.includes(slot === 'pre_workout' ? 'pre-workout' : 'post-workout')
    );
  } else if (slot === 'evening_snack') {
    // Evening: low calorie density
    candidates = carbFoods.filter(c => 
      c.goalPreference === 'cut' ||
      c.tags.includes('low-calorie') ||
      c.tags.includes('vegetable')
    );
  } else if (slot === 'breakfast') {
    // Breakfast: based on goal
    if (goal === 'cut' || goal === 'recomp') {
      // Cutting / recomp: slow-acting, high satiety
      candidates = carbFoods.filter(c => 
        c.digestionSpeed === 'slow' || c.tags.includes('high-fiber') || c.goalPreference === 'both'
      );
    } else if (goal === 'bulk') {
      // Bulking: any good carb
      candidates = carbFoods.filter(c => 
        c.goalPreference === 'bulk' || c.goalPreference === 'both'
      );
    } else {
      // Maintenance: balanced
      candidates = carbFoods.filter(c => foodMatchesGoal(c.goalPreference, goal));
    }
  } else {
    // Regular meals: goal-based
    if (goal === 'cut') {
      // Cutting: prefer vegetables and low-calorie options
      candidates = carbFoods.filter(c => 
        c.goalPreference === 'cut' || c.tags.includes('vegetable') || c.goalPreference === 'both'
      );
    } else if (goal === 'recomp') {
      // Recomp: favor balanced and cut-friendly carbs
      candidates = carbFoods.filter(c => 
        c.goalPreference !== 'bulk' || c.tags.includes('high-fiber')
      );
    } else if (goal === 'bulk') {
      // Bulking: energy-dense carbs
      candidates = carbFoods.filter(c => 
        c.goalPreference === 'bulk' || c.goalPreference === 'both'
      );
    } else {
      // Maintenance: balanced
      candidates = carbFoods.filter(c => foodMatchesGoal(c.goalPreference, goal));
    }
  }
  
  if (candidates.length === 0) {
    candidates = carbFoods;
  }
  
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ============================================
// FAT SELECTION LOGIC
// ============================================

/**
 * Select fat source based on goal and timing
 */
function selectFat(
  goal: GoalType,
  slot: MealSlot['slot'],
  targetFat: number
): FoodItem | null {
  // Around training: minimal fat
  if (slot === 'pre_workout' || slot === 'post_workout') {
    // Use just a small amount of oil for cooking
    return fatFoods.find(f => f.id === 'olive_oil') || null;
  }
  
  let candidates = fatFoods;
  
  if (goal === 'cut' || goal === 'recomp') {
    // Cutting / recomp: controlled portions, avoid calorie bombs
    candidates = fatFoods.filter(f => 
      !f.tags.includes('calorie-dense') || f.id === 'olive_oil'
    );
  }
  
  if (slot === 'breakfast') {
    // Breakfast: eggs, avocado, nuts
    candidates = candidates.filter(f => 
      f.tags.includes('eggs') || 
      f.tags.includes('nuts') ||
      f.id === 'avocado'
    );
  } else if (slot === 'evening_snack') {
    // Evening: slow-digesting (casein, nuts)
    candidates = candidates.filter(f => 
      f.digestionSpeed === 'slow' || f.tags.includes('nuts')
    );
  }
  
  if (candidates.length === 0) {
    candidates = fatFoods;
  }
  
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ============================================
// PORTION CALCULATION
// ============================================

/**
 * Calculate protein portion to hit target
 */
function calculateProteinPortion(protein: FoodItem, targetProtein: number): number {
  // Aim for slightly under to allow for trace proteins from carbs/fats
  const adjustedTarget = targetProtein * 0.95;
  return calculatePortion(protein, 'protein', adjustedTarget);
}

/**
 * Calculate carb portion to hit target
 */
function calculateCarbPortion(carb: FoodItem, targetCarbs: number): number {
  const adjustedTarget = targetCarbs * 0.9;
  return calculatePortion(carb, 'carbs', adjustedTarget);
}

/**
 * Calculate fat portion to hit target
 */
function calculateFatPortion(fat: FoodItem, targetFat: number): number {
  // Around training: minimal fat
  if (targetFat < 5) {
    return 5; // Just a teaspoon of oil for cooking
  }
  return calculatePortion(fat, 'fat', targetFat);
}

// ============================================
// MEAL GENERATION
// ============================================

/**
 * Calculate macro distribution across meals based on timing
 */
function calculateMealMacros(
  slots: MealSlot[],
  dailyTargets: MacroTargets,
  isTrainingDay: boolean
): Map<MealSlot['slot'], Partial<MacroTargets>> {
  const distributions = new Map<MealSlot['slot'], Partial<MacroTargets>>();
  
  const requiredMeals = slots.filter(s => s.isRequired);
  const mealCount = requiredMeals.length;
  
  if (!isTrainingDay) {
    // Rest day: distribute evenly with slightly more in evening
    const baseProtein = Math.round(dailyTargets.protein / mealCount);
    const baseCarbs = Math.round(dailyTargets.carbs / mealCount);
    const baseFat = Math.round(dailyTargets.fat / mealCount);
    
    for (const slot of requiredMeals) {
      if (slot.slot === 'dinner') {
        distributions.set(slot.slot, {
          protein: baseProtein,
          carbs: Math.round(baseCarbs * 0.8),
          fat: Math.round(baseFat * 1.2),
        });
      } else {
        distributions.set(slot.slot, {
          protein: baseProtein,
          carbs: baseCarbs,
          fat: baseFat,
        });
      }
    }
  } else {
    // Training day: prioritize pre/post workout
    const preWorkoutSlot = slots.find(s => s.slot === 'pre_workout');
    const postWorkoutSlot = slots.find(s => s.slot === 'post_workout');
    const otherMeals = slots.filter(s => 
      s.isRequired && s.slot !== 'pre_workout' && s.slot !== 'post_workout'
    );
    
    // Allocate 25% of protein to pre, 35% to post
    const preProtein = Math.round(dailyTargets.protein * 0.2);
    const postProtein = Math.round(dailyTargets.protein * 0.35);
    const remainingProtein = dailyTargets.protein - preProtein - postProtein;
    const otherProtein = Math.round(remainingProtein / otherMeals.length);
    
    // Carbs: 30% pre, 40% post (energy for workout + recovery)
    const preCarbs = Math.round(dailyTargets.carbs * 0.25);
    const postCarbs = Math.round(dailyTargets.carbs * 0.4);
    const remainingCarbs = dailyTargets.carbs - preCarbs - postCarbs;
    const otherCarbs = Math.round(remainingCarbs / otherMeals.length);
    
    // Fat: minimal around workout, normal elsewhere
    const preFat = 5; // Just cooking oil
    const postFat = 8;
    const remainingFat = dailyTargets.fat - preFat - postFat;
    const otherFat = Math.round(remainingFat / otherMeals.length);
    
    if (preWorkoutSlot) {
      distributions.set('pre_workout', {
        protein: preProtein,
        carbs: preCarbs,
        fat: preFat,
      });
    }
    
    if (postWorkoutSlot) {
      distributions.set('post_workout', {
        protein: postProtein,
        carbs: postCarbs,
        fat: postFat,
      });
    }
    
    for (const meal of otherMeals) {
      distributions.set(meal.slot, {
        protein: otherProtein,
        carbs: otherCarbs,
        fat: otherFat,
      });
    }
  }
  
  // Calculate calories for each
  for (const [slot, macros] of distributions) {
    distributions.set(slot, {
      ...macros,
      calories: (macros.protein || 0) * 4 + (macros.carbs || 0) * 4 + (macros.fat || 0) * 9,
    });
  }
  
  return distributions;
}

/**
 * Generate a single meal
 */
function generateMeal(
  slot: MealSlot,
  targetMacros: Partial<MacroTargets>,
  config: MealGenerationConfig,
  isTrainingDay: boolean,
  usedProteins: string[] = []
): GeneratedMeal {
  const { topProteins, goal } = config;
  const foods: FoodPortion[] = [];
  const timing: MealTiming = isTrainingMeal(slot.slot) 
    ? slot.slot === 'pre_workout' ? 'pre-workout' : 'post-workout'
    : 'anytime';
  
  // Select protein
  const protein = selectProtein(topProteins, goal, timing, usedProteins);
  if (protein && targetMacros.protein) {
    const grams = calculateProteinPortion(protein, targetMacros.protein);
    const form = getProteinForm(protein, goal);
    
    foods.push({
      food: protein,
      grams,
      displayPortion: formatPortion(grams),
      macros: calculateMacrosForPortion(protein, grams),
      form: form as any,
    });
  }
  
  // Select carb
  if (targetMacros.carbs && targetMacros.carbs > 0) {
    const carb = selectCarb(goal, slot.slot, isTrainingDay, targetMacros.carbs);
    if (carb) {
      const grams = calculateCarbPortion(carb, targetMacros.carbs);
      foods.push({
        food: carb,
        grams,
        displayPortion: formatPortion(grams),
        macros: calculateMacrosForPortion(carb, grams),
      });
    }
  }
  
  // Select fat (only if not already covered by protein)
  const fatFromProtein = foods.find(f => f.food.category === 'protein')?.macros.fat || 0;
  const remainingFat = Math.max(0, (targetMacros.fat || 0) - fatFromProtein);
  
  if (remainingFat > 3) {
    const fat = selectFat(goal, slot.slot, remainingFat);
    if (fat) {
      const grams = calculateFatPortion(fat, remainingFat);
      foods.push({
        food: fat,
        grams,
        displayPortion: formatPortion(grams),
        macros: calculateMacrosForPortion(fat, grams),
      });
    }
  }
  
  // Calculate actual totals
  const actualMacros = foods.reduce(
    (acc, f) => ({
      calories: acc.calories + f.macros.calories,
      protein: acc.protein + f.macros.protein,
      carbs: acc.carbs + f.macros.carbs,
      fat: acc.fat + f.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  
  return {
    slot: slot.slot,
    label: slot.label,
    time: slot.time,
    isTrainingRelated: slot.isTrainingRelated,
    foods,
    targetMacros: {
      calories: targetMacros.calories || 0,
      protein: targetMacros.protein || 0,
      carbs: targetMacros.carbs || 0,
      fat: targetMacros.fat || 0,
    },
    actualMacros: {
      calories: Math.round(actualMacros.calories),
      protein: Math.round(actualMacros.protein * 10) / 10,
      carbs: Math.round(actualMacros.carbs * 10) / 10,
      fat: Math.round(actualMacros.fat * 10) / 10,
    },
    notes: [],
  };
}

/**
 * Generate a complete day meal plan
 */
export function generateDayMealPlan(
  config: MealGenerationConfig,
  dayName: string,
  isTrainingDay: boolean
): GeneratedDayPlan {
  // Calculate meal times
  const timeConfig: MealTimeConfig = {
    wakeTime: config.wakeTime,
    firstMealDelay: config.firstMealDelay,
    trainingTime: config.trainingTime,
    lastMealBeforeBed: config.lastMealBeforeBed,
    customWakeTime: config.customWakeTime,
    customTrainingTime: config.customTrainingTime,
  };
  
  const mealSlots = calculateMealTimes(timeConfig);
  
  // Calculate macro distribution
  const dailyTargets = isTrainingDay ? config.trainingDayTargets : config.restDayTargets;
  const macroDistribution = calculateMealMacros(
    mealSlots,
    dailyTargets,
    isTrainingDay
  );
  
  // Generate meals
  const meals: GeneratedMeal[] = [];
  const usedProteins: string[] = [];
  
  for (const slot of mealSlots) {
    const targetMacros = macroDistribution.get(slot.slot) || {};
    
    const meal = generateMeal(
      slot,
      targetMacros,
      config,
      isTrainingDay,
      usedProteins
    );
    
    meals.push(meal);
    
    // Track used proteins for variety
    const proteinFood = meal.foods.find(f => f.food.category === 'protein');
    if (proteinFood) {
      usedProteins.push(proteinFood.food.id);
    }
  }
  
  // Calculate daily totals
  const dailyTotals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.actualMacros.calories,
      protein: acc.protein + m.actualMacros.protein,
      carbs: acc.carbs + m.actualMacros.carbs,
      fat: acc.fat + m.actualMacros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  
  return {
    day: dayName,
    isTrainingDay,
    meals,
    dailyTotals: {
      calories: Math.round(dailyTotals.calories),
      protein: Math.round(dailyTotals.protein),
      carbs: Math.round(dailyTotals.carbs),
      fat: Math.round(dailyTotals.fat),
    },
  };
}

/**
 * Generate a full week meal plan
 */
export function generateWeekMealPlan(
  config: MealGenerationConfig,
  trainingDays: string[] = ['monday', 'wednesday', 'friday']
): GeneratedDayPlan[] {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  return days.map(day => {
    const isTrainingDay = trainingDays.includes(day);
    return generateDayMealPlan(config, day, isTrainingDay);
  });
}

// ============================================
// UTILITIES
// ============================================

/**
 * Format meal for display
 */
export function formatMealForDisplay(meal: GeneratedMeal): string {
  const foods = meal.foods
    .map(f => `${f.displayPortion} ${f.food.displayName}`)
    .join(', ');
  
  return `${meal.label} (${meal.time}): ${foods}`;
}

/**
 * Get protein diversity stats for a week
 */
export function getProteinDiversity(weekPlan: GeneratedDayPlan[]): {
  uniqueProteins: string[];
  topProteinCount: number;
  varietyCount: number;
  topProteinPercentage: number;
} {
  const proteinCounts = new Map<string, number>();
  
  for (const day of weekPlan) {
    for (const meal of day.meals) {
      for (const food of meal.foods) {
        if (food.food.category === 'protein') {
          const count = proteinCounts.get(food.food.id) || 0;
          proteinCounts.set(food.food.id, count + 1);
        }
      }
    }
  }
  
  const entries = Array.from(proteinCounts.entries());
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  
  entries.sort((a, b) => b[1] - a[1]);
  
  const top3Count = entries.slice(0, 3).reduce((sum, [, count]) => sum + count, 0);
  
  return {
    uniqueProteins: entries.map(([id]) => id),
    topProteinCount: top3Count,
    varietyCount: total - top3Count,
    topProteinPercentage: total > 0 ? Math.round((top3Count / total) * 100) : 0,
  };
}
