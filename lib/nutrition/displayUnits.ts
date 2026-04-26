export type FoodMeasurement = 'metric' | 'imperial_mixed';

const OZ_PER_GRAM = 1 / 28.3495;

export function formatFoodQuantity(
  grams: number,
  category: 'protein' | 'carb' | 'fat' | 'unknown',
  preference: FoodMeasurement
): { value: string; unit: string; rawValue: number } {
  if (preference === 'imperial_mixed' && category === 'protein') {
    const oz = grams * OZ_PER_GRAM;
    return {
      value: oz >= 10 ? Math.round(oz).toString() : oz.toFixed(1),
      unit: 'oz',
      rawValue: oz,
    };
  }
  return { value: Math.round(grams).toString(), unit: 'g', rawValue: grams };
}

export function toGrams(displayValue: number, unit: 'g' | 'oz'): number {
  return unit === 'oz' ? displayValue / OZ_PER_GRAM : displayValue;
}

export function toOunces(grams: number): number {
  return grams * OZ_PER_GRAM;
}

/**
 * Best-effort category detection from item name.
 * Used because user_nutrition_plan_meal_variant_items does not store category.
 */
export function detectFoodCategory(name: string): 'protein' | 'carb' | 'fat' | 'unknown' {
  const lower = name.toLowerCase();

  // Fat indicators
  if (
    lower.includes('oil') ||
    lower.includes('butter') ||
    lower.includes('nuts') ||
    lower.includes('almond') ||
    lower.includes('walnut') ||
    lower.includes('cashew') ||
    lower.includes('peanut butter') ||
    lower.includes('avocado') ||
    lower.includes('cheese') ||
    lower.includes('seeds') ||
    lower.includes('sunflower') ||
    lower.includes('tahini') ||
    lower.includes('coconut oil') ||
    lower.includes('olive oil') ||
    lower.includes('dark chocolate')
  ) {
    return 'fat';
  }

  // Carb indicators
  if (
    lower.includes('rice') ||
    lower.includes('oats') ||
    lower.includes('pasta') ||
    lower.includes('potato') ||
    lower.includes('bread') ||
    lower.includes('quinoa') ||
    lower.includes('couscous') ||
    lower.includes('tortilla') ||
    lower.includes('banana') ||
    lower.includes('apple') ||
    lower.includes('mango') ||
    lower.includes('granola') ||
    lower.includes('squash') ||
    lower.includes('lentils') || // lentils are protein-ish but carb-heavy in typical tracking
    lower.includes('black beans') ||
    lower.includes('edamame')
  ) {
    return 'carb';
  }

  // Protein indicators
  if (
    lower.includes('chicken') ||
    lower.includes('beef') ||
    lower.includes('steak') ||
    lower.includes('salmon') ||
    lower.includes('fish') ||
    lower.includes('tuna') ||
    lower.includes('cod') ||
    lower.includes('shrimp') ||
    lower.includes('turkey') ||
    lower.includes('pork') ||
    lower.includes('egg') ||
    lower.includes('whey') ||
    lower.includes('protein powder') ||
    lower.includes('tofu') ||
    lower.includes('tempeh') ||
    lower.includes('cottage cheese') ||
    lower.includes('greek yogurt')
  ) {
    return 'protein';
  }

  return 'unknown';
}

export function formatMacroDisplay(
  value: number,
  _macro: 'protein' | 'carbs' | 'fat',
  _preference: FoodMeasurement
): { value: string; unit: string; rawValue: number } {
  // Macros (P/C/F) are always displayed in grams regardless of food-measurement
  // preference. The imperial/metric toggle only applies to food portion sizes.
  return { value: Math.round(value).toString(), unit: 'g', rawValue: value };
}

export function getDefaultFoodMeasurement(unitSystem: 'imperial' | 'metric' | null | undefined): FoodMeasurement {
  return unitSystem === 'imperial' ? 'imperial_mixed' : 'metric';
}
