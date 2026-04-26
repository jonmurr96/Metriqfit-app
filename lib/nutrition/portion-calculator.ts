/**
 * Portion Calculator
 * 
 * Utilities for calculating exact food portions to hit macro targets
 */

import type { FoodItem } from './food-database';

export interface PortionResult {
  grams: number;
  ounces: number;
  display: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * Calculate portion needed to hit a specific macro target
 */
export function calculatePortionForMacro(
  food: FoodItem,
  targetMacro: 'protein' | 'carbs' | 'fat' | 'calories',
  targetAmount: number,
  tolerance: number = 0.05 // 5% tolerance
): PortionResult {
  const macroPer100g = food.macrosPer100g[targetMacro];
  
  if (macroPer100g === 0) {
    return {
      grams: 0,
      ounces: 0,
      display: '0g',
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    };
  }
  
  // Calculate required grams
  const grams = (targetAmount / macroPer100g) * 100;
  
  // Round to practical amounts
  let roundedGrams: number;
  if (grams < 10) {
    roundedGrams = Math.round(grams); // Round to nearest gram for small amounts
  } else if (grams < 100) {
    roundedGrams = Math.round(grams / 5) * 5; // Round to nearest 5g
  } else {
    roundedGrams = Math.round(grams / 10) * 10; // Round to nearest 10g
  }
  
  // Calculate actual macros for this portion
  const ratio = roundedGrams / 100;
  const macros = {
    calories: Math.round(food.macrosPer100g.calories * ratio),
    protein: Math.round(food.macrosPer100g.protein * ratio * 10) / 10,
    carbs: Math.round(food.macrosPer100g.carbs * ratio * 10) / 10,
    fat: Math.round(food.macrosPer100g.fat * ratio * 10) / 10,
  };
  
  const ounces = roundedGrams / 28.35;
  
  return {
    grams: roundedGrams,
    ounces: Math.round(ounces * 10) / 10,
    display: formatPortionDisplay(roundedGrams),
    macros,
  };
}

/**
 * Calculate portions for multiple foods to hit a macro target
 * Useful for when you want to combine foods (e.g., chicken + rice)
 */
export function calculateMixedPortions(
  foods: { food: FoodItem; ratio: number }[], // ratios should sum to 1
  targetMacros: {
    protein?: number;
    carbs?: number;
    fat?: number;
    calories?: number;
  }
): { food: FoodItem; portion: PortionResult }[] {
  const results: { food: FoodItem; portion: PortionResult }[] = [];
  
  // Determine which macro to optimize for (prioritize protein, then carbs, then calories)
  const targetMacro = targetMacros.protein ? 'protein' : 
                      targetMacros.carbs ? 'carbs' : 
                      targetMacros.fat ? 'fat' : 'calories';
  const targetAmount = targetMacros[targetMacro] || 0;
  
  // Calculate portions based on ratios
  for (const { food, ratio } of foods) {
    const targetForFood = targetAmount * ratio;
    const portion = calculatePortionForMacro(food, targetMacro, targetForFood);
    results.push({ food, portion });
  }
  
  return results;
}

/**
 * Adjust portion to hit exact macro target
 * Returns adjusted portion that gets as close as possible
 */
export function adjustPortionToTarget(
  food: FoodItem,
  currentGrams: number,
  targetMacros: {
    protein?: number;
    carbs?: number;
    fat?: number;
  },
  priority: 'protein' | 'carbs' | 'fat' | 'calories' = 'protein'
): PortionResult {
  const targetAmount = targetMacros[priority];
  
  if (!targetAmount) {
    // Just return current portion
    return calculatePortionForMacro(food, 'calories', 0);
  }
  
  return calculatePortionForMacro(food, priority, targetAmount);
}

/**
 * Format portion for display
 */
export function formatPortionDisplay(grams: number, preferOunces: boolean = false): string {
  if (preferOunces) {
    const ounces = grams / 28.35;
    if (ounces >= 1) {
      return `${Math.round(ounces * 10) / 10} oz`;
    }
  }
  
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)}kg`;
  }
  
  return `${Math.round(grams)}g`;
}

/**
 * Get practical serving size for a food
 * Returns "standard" portion size that's commonly used
 */
export function getPracticalServingSize(food: FoodItem): number {
  const name = food.name.toLowerCase();
  
  // Proteins
  if (food.category === 'protein') {
    if (name.includes('egg') && !name.includes('white')) {
      return 50; // ~1 large egg
    }
    if (name.includes('egg_white')) {
      return 150; // ~3-4 egg whites
    }
    if (name.includes('protein') && name.includes('powder')) {
      return 30; // 1 scoop
    }
    return 150; // ~5oz meat
  }
  
  // Carbs
  if (food.category === 'carb') {
    if (name.includes('rice') || name.includes('pasta') || name.includes('quinoa')) {
      return 200; // ~1 cup cooked
    }
    if (name.includes('oats')) {
      return 80; // ~1 cup dry oats
    }
    if (name.includes('potato') || name.includes('sweet')) {
      return 200; // ~1 medium potato
    }
    if (name.includes('banana')) {
      return 120; // 1 medium banana
    }
    if (name.includes('berry') || name.includes('apple')) {
      return 150; // ~1 cup berries / 1 medium apple
    }
    if (name.includes('vegetable') || name.includes('broccoli') || name.includes('spinach')) {
      return 200; // 2 cups raw
    }
    return 150;
  }
  
  // Fats
  if (food.category === 'fat') {
    if (name.includes('oil')) {
      return 15; // 1 tbsp
    }
    if (name.includes('butter') || name.includes('nut')) {
      return 30; // 2 tbsp
    }
    if (name.includes('avocado')) {
      return 75; // 1/4 avocado
    }
    if (name.includes('nut') || name.includes('almond') || name.includes('walnut')) {
      return 30; // 1 oz / small handful
    }
    return 15;
  }
  
  return 100; // Default 100g
}

/**
 * Calculate how much of each macro is in a standard serving
 */
export function getServingInfo(food: FoodItem): {
  servingSize: number;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  display: string;
} {
  const servingSize = getPracticalServingSize(food);
  const ratio = servingSize / 100;
  
  return {
    servingSize,
    macros: {
      calories: Math.round(food.macrosPer100g.calories * ratio),
      protein: Math.round(food.macrosPer100g.protein * ratio * 10) / 10,
      carbs: Math.round(food.macrosPer100g.carbs * ratio * 10) / 10,
      fat: Math.round(food.macrosPer100g.fat * ratio * 10) / 10,
    },
    display: formatPortionDisplay(servingSize),
  };
}

/**
 * Calculate how many servings needed to hit target
 */
export function calculateServingsNeeded(
  food: FoodItem,
  targetMacro: 'protein' | 'carbs' | 'fat' | 'calories',
  targetAmount: number
): { servings: number; totalGrams: number; display: string } {
  const servingSize = getPracticalServingSize(food);
  const servingMacro = (food.macrosPer100g[targetMacro] / 100) * servingSize;
  
  if (servingMacro === 0) {
    return { servings: 0, totalGrams: 0, display: '0 servings' };
  }
  
  const servings = targetAmount / servingMacro;
  const totalGrams = servingSize * servings;
  
  return {
    servings: Math.round(servings * 10) / 10,
    totalGrams: Math.round(totalGrams),
    display: servings < 1 
      ? `${Math.round(servings * 100)}% serving`
      : servings === 1 
        ? '1 serving'
        : `${Math.round(servings * 10) / 10} servings`,
  };
}

// Common portion reference
export const COMMON_PORTIONS: Record<string, { grams: number; description: string }> = {
  'chicken_breast': { grams: 150, description: '1 medium breast' },
  'ground_beef_93_7': { grams: 150, description: '1/3 lb patty' },
  'salmon': { grams: 150, description: '1 fillet' },
  'white_rice_cooked': { grams: 200, description: '1 cup cooked' },
  'sweet_potato': { grams: 200, description: '1 medium' },
  'oats': { grams: 80, description: '1 cup dry' },
  'banana': { grams: 120, description: '1 medium' },
  'olive_oil': { grams: 15, description: '1 tbsp' },
  'almonds': { grams: 30, description: 'small handful' },
  'avocado': { grams: 75, description: '1/4 avocado' },
  'whey_protein': { grams: 30, description: '1 scoop' },
};

/**
 * Get human-readable portion description
 */
export function getPortionDescription(foodId: string, grams: number): string {
  const common = COMMON_PORTIONS[foodId];
  if (common) {
    const ratio = grams / common.grams;
    if (ratio >= 0.9 && ratio <= 1.1) {
      return common.description;
    }
    if (ratio < 0.9) {
      return `${Math.round(ratio * 100)}% ${common.description}`;
    }
    return `${Math.round(ratio * 10) / 10}x ${common.description}`;
  }
  return `${grams}g`;
}
