import type { NutritionPlanMeal } from '../../services/planService';
import type { MealLog, MealSlot } from '../../services/nutritionService';
import { getMealSlotIndex, getMealSlotLabel, normalizeMealSlot } from './meal-slots';
import { detectFoodCategory, formatFoodQuantity } from './displayUnits';
import type { FoodMeasurement } from './displayUnits';

export interface PlannedFoodItem {
  name: string;
  amount: string;
  unit: string;
  grams: number | null;
}

export interface HomeMealPreviewItem {
  slot: MealSlot;
  label: string;
  plannedName: string;
  mealSummary: string | null;
  foods: PlannedFoodItem[];
  canDirectLog: boolean;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  loggedCalories: number;
  loggedItemCount: number;
  isLogged: boolean;
  planMealId: string;
}

export interface HomeMealPreviewCardMeal {
  slot: MealSlot;
  label: string;
  plannedName: string;
  mealSummary?: string | null;
  foods?: PlannedFoodItem[];
  canDirectLog?: boolean;
  targetCalories: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  loggedCalories: number;
  loggedItemCount: number;
  isLogged: boolean;
  planMealId?: string;
}

export interface HomeMealPreviewState {
  meals: HomeMealPreviewItem[];
  activeIndex: number;
  activeMeal: HomeMealPreviewItem | null;
  completedCount: number;
  isDayComplete: boolean;
}

function sumLoggedCalories(mealLog: MealLog | undefined): number {
  return Math.round(
    (mealLog?.items || []).reduce((total, item) => total + Number(item.calories || 0), 0)
  );
}

function buildMealSummary(meal: NutritionPlanMeal): string | null {
  const itemNames = (meal.selected_variant?.items || [])
    .slice()
    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
    .map((item) => String(item.item_name || '').trim())
    .filter(Boolean);

  if (!itemNames.length) return null;
  if (itemNames.length === 1) return itemNames[0];
  if (itemNames.length === 2) return `${itemNames[0]} + ${itemNames[1]}`;
  return `${itemNames[0]}, ${itemNames[1]} + ${itemNames.length - 2} more`;
}

function buildFoodItems(
  meal: NutritionPlanMeal,
  measurement: FoodMeasurement
): PlannedFoodItem[] {
  const items = (meal.selected_variant?.items || [])
    .slice()
    .sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));

  return items.map((item) => {
    const name = String(item.item_name || '').trim();
    const grams = item.grams ?? 0;
    const category = detectFoodCategory(name);
    const formatted = formatFoodQuantity(grams, category, measurement);

    return {
      name,
      amount: formatted.value,
      unit: formatted.unit,
      grams: item.grams,
    };
  });
}

export function buildHomeMealPreviewItems(
  planMeals: NutritionPlanMeal[] | null | undefined,
  dailyMeals: MealLog[] | null | undefined,
  measurement: FoodMeasurement = 'metric',
): HomeMealPreviewItem[] {
  if (!planMeals?.length) return [];

  return [...planMeals]
    .sort((a, b) => getMealSlotIndex(a.meal_slot) - getMealSlotIndex(b.meal_slot))
    .map((meal) => {
      const slot = normalizeMealSlot(meal.meal_slot);
      if (!slot) return null;

      const matchingLog = dailyMeals?.find((log) => normalizeMealSlot(log.mealSlot) === slot);
      const loggedItemCount = matchingLog?.items?.length || 0;
      const selectedVariant = meal.selected_variant;

      return {
        slot,
        label: getMealSlotLabel(slot),
        plannedName: selectedVariant?.name || meal.name || `${getMealSlotLabel(slot)} Meal`,
        mealSummary: buildMealSummary(meal),
        foods: buildFoodItems(meal, measurement),
        canDirectLog: !!meal.can_direct_log,
        targetCalories: Math.round(
          Number(selectedVariant?.target_calories ?? meal.target_calories ?? 0),
        ),
        targetProtein: Number(selectedVariant?.target_protein ?? meal.target_protein ?? 0),
        targetCarbs: Number(selectedVariant?.target_carbs ?? meal.target_carbs ?? 0),
        targetFat: Number(selectedVariant?.target_fat ?? meal.target_fat ?? 0),
        loggedCalories: sumLoggedCalories(matchingLog),
        loggedItemCount,
        isLogged: loggedItemCount > 0,
        planMealId: meal.id,
      };
    })
    .filter((meal): meal is HomeMealPreviewItem => !!meal);
}

export function getHomeMealPreviewState(
  meals: HomeMealPreviewItem[],
  preferredIndex?: number,
): HomeMealPreviewState {
  const completedCount = meals.filter((meal) => meal.isLogged).length;
  const isDayComplete = meals.length > 0 && completedCount === meals.length;
  const firstUnloggedIndex = meals.findIndex((meal) => !meal.isLogged);
  const fallbackIndex = firstUnloggedIndex >= 0 ? firstUnloggedIndex : 0;
  const requestedIndex = typeof preferredIndex === 'number' ? preferredIndex : fallbackIndex;
  const boundedIndex = meals.length ? Math.min(Math.max(requestedIndex, 0), meals.length - 1) : 0;

  return {
    meals,
    activeIndex: boundedIndex,
    activeMeal: meals[boundedIndex] || null,
    completedCount,
    isDayComplete,
  };
}
