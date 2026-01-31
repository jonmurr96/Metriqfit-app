/**
 * Macro Math Utilities
 * All nutrition calculations for the app
 *
 * FORMULA: (per_100g_value * grams) / 100
 */

// ===========================================
// TYPES
// ===========================================

export interface MacrosPer100g {
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  sugar_per_100g?: number;
  sodium_per_100g?: number;
}

export interface CalculatedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
}

export interface MacroProgress {
  consumed: number;
  target: number;
  remaining: number;
  percentage: number;
}

// ===========================================
// CORE CALCULATIONS
// ===========================================

/**
 * Calculate macros for a food item at a given weight
 * Formula: (per_100g * grams) / 100
 */
export function calculateMacros(
  food: MacrosPer100g,
  grams: number
): CalculatedMacros {
  return {
    calories: Math.round((food.calories_per_100g * grams) / 100),
    protein: roundToDecimal((food.protein_per_100g * grams) / 100, 1),
    carbs: roundToDecimal((food.carbs_per_100g * grams) / 100, 1),
    fat: roundToDecimal((food.fat_per_100g * grams) / 100, 1),
    fiber: food.fiber_per_100g
      ? roundToDecimal((food.fiber_per_100g * grams) / 100, 1)
      : undefined,
    sugar: food.sugar_per_100g
      ? roundToDecimal((food.sugar_per_100g * grams) / 100, 1)
      : undefined,
    sodium: food.sodium_per_100g
      ? roundToDecimal((food.sodium_per_100g * grams) / 100, 0)
      : undefined,
  };
}

/**
 * Sum multiple macro entries
 */
export function sumMacros(items: CalculatedMacros[]): CalculatedMacros {
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: roundToDecimal(acc.protein + item.protein, 1),
      carbs: roundToDecimal(acc.carbs + item.carbs, 1),
      fat: roundToDecimal(acc.fat + item.fat, 1),
      fiber: item.fiber !== undefined
        ? roundToDecimal((acc.fiber || 0) + item.fiber, 1)
        : acc.fiber,
      sugar: item.sugar !== undefined
        ? roundToDecimal((acc.sugar || 0) + item.sugar, 1)
        : acc.sugar,
      sodium: item.sodium !== undefined
        ? Math.round((acc.sodium || 0) + item.sodium)
        : acc.sodium,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Calculate progress towards targets
 */
export function calculateProgress(
  consumed: CalculatedMacros,
  targets: MacroTargets
): {
  calories: MacroProgress;
  protein: MacroProgress;
  carbs: MacroProgress;
  fat: MacroProgress;
} {
  return {
    calories: {
      consumed: consumed.calories,
      target: targets.calories,
      remaining: Math.max(0, targets.calories - consumed.calories),
      percentage: Math.min(100, Math.round((consumed.calories / targets.calories) * 100)),
    },
    protein: {
      consumed: consumed.protein,
      target: targets.protein_g,
      remaining: Math.max(0, roundToDecimal(targets.protein_g - consumed.protein, 1)),
      percentage: Math.min(100, Math.round((consumed.protein / targets.protein_g) * 100)),
    },
    carbs: {
      consumed: consumed.carbs,
      target: targets.carbs_g,
      remaining: Math.max(0, roundToDecimal(targets.carbs_g - consumed.carbs, 1)),
      percentage: Math.min(100, Math.round((consumed.carbs / targets.carbs_g) * 100)),
    },
    fat: {
      consumed: consumed.fat,
      target: targets.fat_g,
      remaining: Math.max(0, roundToDecimal(targets.fat_g - consumed.fat, 1)),
      percentage: Math.min(100, Math.round((consumed.fat / targets.fat_g) * 100)),
    },
  };
}

// ===========================================
// TARGET CALCULATIONS (Mifflin-St Jeor)
// ===========================================

export interface UserMetrics {
  weight_kg: number;
  height_cm: number;
  age_years: number;
  sex: 'male' | 'female' | 'other';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
}

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2, // Little or no exercise
  light: 1.375, // Light exercise 1-3 days/week
  moderate: 1.55, // Moderate exercise 3-5 days/week
  active: 1.725, // Hard exercise 6-7 days/week
  very_active: 1.9, // Very hard exercise & physical job
};

const GOAL_ADJUSTMENTS = {
  lose: -500, // 500 calorie deficit
  maintain: 0,
  gain: 300, // 300 calorie surplus
};

/**
 * Calculate BMR using Mifflin-St Jeor equation
 */
export function calculateBMR(metrics: Pick<UserMetrics, 'weight_kg' | 'height_cm' | 'age_years' | 'sex'>): number {
  const { weight_kg, height_cm, age_years, sex } = metrics;

  // Mifflin-St Jeor Equation
  // Men: BMR = 10W + 6.25H - 5A + 5
  // Women: BMR = 10W + 6.25H - 5A - 161
  const baseBMR = 10 * weight_kg + 6.25 * height_cm - 5 * age_years;

  if (sex === 'male') {
    return Math.round(baseBMR + 5);
  }
  return Math.round(baseBMR - 161);
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(metrics: UserMetrics): number {
  const bmr = calculateBMR(metrics);
  const multiplier = ACTIVITY_MULTIPLIERS[metrics.activity_level];
  return Math.round(bmr * multiplier);
}

/**
 * Calculate daily calorie target
 */
export function calculateCalorieTarget(metrics: UserMetrics): number {
  const tdee = calculateTDEE(metrics);
  const adjustment = GOAL_ADJUSTMENTS[metrics.goal];
  // Ensure minimum safe intake
  return Math.max(1200, tdee + adjustment);
}

/**
 * Calculate macro targets based on calorie target
 * Default split: 30% protein, 40% carbs, 30% fat
 */
export function calculateMacroTargets(
  calories: number,
  proteinRatio = 0.3,
  carbRatio = 0.4,
  fatRatio = 0.3
): MacroTargets {
  // Calories per gram: Protein = 4, Carbs = 4, Fat = 9
  const protein_g = Math.round((calories * proteinRatio) / 4);
  const carbs_g = Math.round((calories * carbRatio) / 4);
  const fat_g = Math.round((calories * fatRatio) / 9);

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
  };
}

/**
 * Calculate water target based on body weight
 * General recommendation: 30-35ml per kg body weight
 */
export function calculateWaterTarget(weight_kg: number): number {
  const mlPerKg = 33; // Middle of range
  return Math.round((weight_kg * mlPerKg) / 100) * 100; // Round to nearest 100ml
}

/**
 * Calculate all targets for a user
 */
export function calculateAllTargets(metrics: UserMetrics): MacroTargets & { water_ml: number } {
  const calories = calculateCalorieTarget(metrics);
  const macros = calculateMacroTargets(calories);
  const water_ml = calculateWaterTarget(metrics.weight_kg);

  return {
    ...macros,
    water_ml,
  };
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Round number to specified decimal places
 */
function roundToDecimal(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Calculate percentage of daily value (for nutrition labels)
 */
export function calculateDV(
  value: number,
  dailyValue: number
): number {
  if (dailyValue === 0) return 0;
  return Math.round((value / dailyValue) * 100);
}

/**
 * Format macro value for display
 */
export function formatMacro(value: number, unit: 'g' | 'mg' | 'kcal'): string {
  if (unit === 'kcal') {
    return `${Math.round(value)} kcal`;
  }
  if (unit === 'mg') {
    return `${Math.round(value)}mg`;
  }
  return `${roundToDecimal(value, 1)}g`;
}

/**
 * Get macro color based on percentage of target
 */
export function getMacroColor(percentage: number): 'success' | 'warning' | 'danger' | 'primary' {
  if (percentage >= 100) return 'success';
  if (percentage >= 75) return 'primary';
  if (percentage >= 50) return 'warning';
  return 'danger';
}
