/**
 * Nutrition Module
 * 
 * Intelligent meal generation with goal-based food selection,
 * timing optimization, and portion calculations.
 */

// Food database
export {
  proteinFoods,
  carbFoods,
  fatFoods,
  allFoods,
  getFoodById,
  getFoodsByCategory,
  getFoodsByTag,
  getPrimaryProteins,
  getFoodsForTiming,
  getFoodsForGoal,
  calculatePortion,
  calculateMacrosForPortion,
  gramsToOunces,
  formatPortion,
  type FoodItem,
  type FoodCategory,
  type DigestionSpeed,
  type GoalPreference,
  type MealTiming,
  type FoodForm,
} from './food-database';

// Meal timing engine
export {
  calculateMealTimes,
  getMealSlotDescription,
  isTrainingMeal,
  sortMealsByTime,
  type MealTimeConfig,
  type MealSlot,
} from './meal-timing-engine';

// Intelligent meal generator
export {
  generateDayMealPlan,
  generateWeekMealPlan,
  formatMealForDisplay,
  getProteinDiversity,
  type MealGenerationConfig,
  type FoodPortion,
  type GeneratedMeal,
  type GeneratedDayPlan,
  type GoalType,
} from './intelligent-meal-generator';

// Portion calculator
export {
  calculatePortionForMacro,
  calculateMixedPortions,
  adjustPortionToTarget,
  formatPortionDisplay,
  getPracticalServingSize,
  getServingInfo,
  calculateServingsNeeded,
  getPortionDescription,
  COMMON_PORTIONS,
  type PortionResult,
} from './portion-calculator';

// Meal generation service
export {
  generateWeeklyMealPlan,
  generateSingleDayMeals,
  generateLegacyWeeklyMealPlan,
  createIntelligentConfig,
  createLegacyConfig,
  getMealTimingPreview,
  formatMealSimple,
  getFoodEmoji,
  validateNutritionOnboarding,
  getFoodSelectionReason,
  type GeneratedMealPlan,
} from './meal-generation-service';

export {
  recommendMealFrequency,
  resolveMealFrequencyChoice,
  getMealFrequencyWarning,
  getMealFrequencyAdvisory,
  formatMealFrequencyLabel,
  mealFrequencyChoiceToCount,
  mealFrequencyChoiceList,
  type MealFrequencyInput,
  type MealFrequencyRecommendation,
  type MealFrequencyWarningLevel,
} from './meal-frequency';

// Legacy exports for backward compatibility
export {
  generateDayMealPlan as legacyGenerateDayMealPlan,
  type MealGenerationConfig as LegacyMealGenerationConfig,
  type MealPlanDay,
} from './meal-generator';

export {
  matchRecipes,
  type Recipe,
  type RecipeMatchResult as MatchedRecipe,
} from './recipe-matcher';
