import type { NutritionPlanMealVariantItem } from '../../services/planService';
import type { MealLogItem } from '../../services/nutritionService';

export interface PlannedMealItemState {
  id: string;
  foodItemId: string | null;
  name: string;
  quantityLabel: string;
  grams: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isQuickAddable: boolean;
  isAdded: boolean;
}

export interface PlannedMealDerivedState {
  items: PlannedMealItemState[];
  quickAddableCount: number;
  addedCount: number;
  remainingQuickAddCount: number;
  hasAnyLoggedItems: boolean;
  hasAllLoggedItems: boolean;
  canLogWholeMeal: boolean;
  status: 'planned' | 'partially_logged' | 'logged' | 'needs_manual_add';
}

function formatQuantityLabel(item: NutritionPlanMealVariantItem) {
  const grams = typeof item.grams === 'number' && Number.isFinite(item.grams) ? Math.round(item.grams) : null;
  if (grams && grams > 0) {
    return `${grams}g`;
  }

  if (item.quantity_value && item.quantity_unit) {
    return `${item.quantity_value}${item.quantity_unit}`;
  }

  return item.quantity_unit || 'Planned amount';
}

export function buildPlannedMealDerivedState(
  items: NutritionPlanMealVariantItem[] | null | undefined,
  loggedItems: MealLogItem[] | null | undefined,
): PlannedMealDerivedState {
  const safeItems = items || [];
  const safeLoggedItems = loggedItems || [];
  const loggedByFood = new Map<string, Array<{ grams: number; used: boolean }>>();

  for (const item of safeLoggedItems) {
    const bucket = loggedByFood.get(item.foodItemId) || [];
    bucket.push({ grams: Number(item.grams || 0), used: false });
    loggedByFood.set(item.foodItemId, bucket);
  }

  const mappedItems = safeItems.map<PlannedMealItemState>((item) => {
    const isQuickAddable = !!item.food_item_id && !!item.grams && item.grams > 0;
    let isAdded = false;

    if (isQuickAddable) {
      const bucket = loggedByFood.get(item.food_item_id!);
      const match = bucket?.find((logged) => !logged.used && Math.abs(logged.grams - Number(item.grams || 0)) <= 1);
      if (match) {
        match.used = true;
        isAdded = true;
      }
    }

    return {
      id: item.id,
      foodItemId: item.food_item_id,
      name: item.item_name,
      quantityLabel: formatQuantityLabel(item),
      grams: item.grams ?? null,
      calories: Math.round(Number(item.calories || 0)),
      protein: Math.round(Number(item.protein || 0)),
      carbs: Math.round(Number(item.carbs || 0)),
      fat: Math.round(Number(item.fat || 0)),
      isQuickAddable,
      isAdded,
    };
  });

  const quickAddableCount = mappedItems.filter((item) => item.isQuickAddable).length;
  const addedCount = mappedItems.filter((item) => item.isAdded).length;
  const hasAnyLoggedItems = safeLoggedItems.length > 0;
  const hasAllLoggedItems = quickAddableCount > 0 && addedCount >= quickAddableCount;
  const remainingQuickAddCount = Math.max(0, quickAddableCount - addedCount);
  const canLogWholeMeal = quickAddableCount > 0 && quickAddableCount === mappedItems.length && !hasAnyLoggedItems;

  let status: PlannedMealDerivedState['status'] = 'planned';
  if (!mappedItems.length || quickAddableCount === 0) {
    status = 'needs_manual_add';
  } else if (hasAllLoggedItems) {
    status = 'logged';
  } else if (hasAnyLoggedItems) {
    status = 'partially_logged';
  }

  return {
    items: mappedItems,
    quickAddableCount,
    addedCount,
    remainingQuickAddCount,
    hasAnyLoggedItems,
    hasAllLoggedItems,
    canLogWholeMeal,
    status,
  };
}
