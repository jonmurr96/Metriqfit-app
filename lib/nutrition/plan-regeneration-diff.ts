export interface NutritionPlanDiffIngredient {
  item_name?: string | null;
  grams?: number | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface NutritionPlanDiffVariant {
  id?: string | null;
  name?: string | null;
  items?: NutritionPlanDiffIngredient[] | null;
}

export interface NutritionPlanDiffMeal {
  id?: string | null;
  meal_slot: string;
  name: string;
  target_calories?: number | null;
  target_protein?: number | null;
  target_carbs?: number | null;
  target_fat?: number | null;
  selected_variant?: NutritionPlanDiffVariant | null;
}

export interface NutritionPlanDiffDay {
  dayOfWeek: number;
  meals: NutritionPlanDiffMeal[];
  totals?: {
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  } | null;
  targets?: {
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  } | null;
  delta?: {
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
  } | null;
}

export interface NutritionPlanComparable {
  id?: string | null;
  name?: string | null;
  days: NutritionPlanDiffDay[];
}

export interface NutritionIngredientChange {
  dayOfWeek: number;
  mealSlot: string;
  mealName: string;
  summary: string;
  removedIngredients: string[];
  addedIngredients: string[];
}

export interface NutritionReplacedMeal {
  dayOfWeek: number;
  mealSlot: string;
  currentMealName: string;
  previewMealName: string;
}

export interface NutritionMacroDeltaDay {
  dayOfWeek: number;
  currentCalories: number;
  previewCalories: number;
  calorieDelta: number;
  proteinDelta: number;
  carbsDelta: number;
  fatDelta: number;
}

export interface NutritionPlanDiffResult {
  changedDayCount: number;
  changedMealCount: number;
  changedSlotCount: number;
  replacedMealNames: NutritionReplacedMeal[];
  ingredientChanges: NutritionIngredientChange[];
  macroDeltaDays: NutritionMacroDeltaDay[];
  changeSummary: string[];
  isMateriallyDifferent: boolean;
}

function normalizeToken(value: string | null | undefined) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function toLabel(value: string | null | undefined, fallback = 'Unspecified') {
  const normalized = normalizeToken(value);
  if (!normalized) return fallback;
  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toNumber(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function ingredientKey(item: NutritionPlanDiffIngredient) {
  return normalizeToken(item.item_name);
}

function dayLabel(dayOfWeek: number) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek] || `Day ${dayOfWeek + 1}`;
}

function collectIngredientNames(variant?: NutritionPlanDiffVariant | null) {
  const namesByKey = new Map<string, string>();
  for (const item of variant?.items || []) {
    const key = ingredientKey(item);
    if (!key) continue;
    namesByKey.set(key, String(item.item_name || '').trim());
  }
  return namesByKey;
}

function diffIngredients(input: {
  dayOfWeek: number;
  meal: NutritionPlanDiffMeal;
  currentVariant?: NutritionPlanDiffVariant | null;
  previewVariant?: NutritionPlanDiffVariant | null;
}): NutritionIngredientChange | null {
  const currentNames = collectIngredientNames(input.currentVariant);
  const previewNames = collectIngredientNames(input.previewVariant);
  const currentKeys = new Set(currentNames.keys());
  const previewKeys = new Set(previewNames.keys());

  const removedKeys = Array.from(currentKeys).filter((key) => !previewKeys.has(key));
  const addedKeys = Array.from(previewKeys).filter((key) => !currentKeys.has(key));

  if (!removedKeys.length && !addedKeys.length) {
    return null;
  }

  const removedIngredients = removedKeys.map((key) => currentNames.get(key) || key);
  const addedIngredients = addedKeys.map((key) => previewNames.get(key) || key);

  const parts: string[] = [];
  if (removedIngredients.length) {
    parts.push(`removed ${removedIngredients.join(', ')}`);
  }
  if (addedIngredients.length) {
    parts.push(`added ${addedIngredients.join(', ')}`);
  }

  return {
    dayOfWeek: input.dayOfWeek,
    mealSlot: input.meal.meal_slot,
    mealName: input.meal.name,
    summary: `${toLabel(input.meal.name)} ${parts.join(' and ')}.`,
    removedIngredients,
    addedIngredients,
  };
}

function buildMacroDelta(currentDay: NutritionPlanDiffDay, previewDay: NutritionPlanDiffDay): NutritionMacroDeltaDay | null {
  const calorieDelta = toNumber(previewDay.totals?.calories) - toNumber(currentDay.totals?.calories);
  const proteinDelta = toNumber(previewDay.totals?.protein) - toNumber(currentDay.totals?.protein);
  const carbsDelta = toNumber(previewDay.totals?.carbs) - toNumber(currentDay.totals?.carbs);
  const fatDelta = toNumber(previewDay.totals?.fat) - toNumber(currentDay.totals?.fat);

  if (
    Math.abs(calorieDelta) < 75
    && Math.abs(proteinDelta) < 8
    && Math.abs(carbsDelta) < 12
    && Math.abs(fatDelta) < 6
  ) {
    return null;
  }

  return {
    dayOfWeek: currentDay.dayOfWeek,
    currentCalories: toNumber(currentDay.totals?.calories),
    previewCalories: toNumber(previewDay.totals?.calories),
    calorieDelta,
    proteinDelta,
    carbsDelta,
    fatDelta,
  };
}

export function buildNutritionPlanDiff(input: {
  currentPlan: NutritionPlanComparable;
  previewPlan: NutritionPlanComparable;
}): NutritionPlanDiffResult {
  const currentDays = new Map((input.currentPlan.days || []).map((day) => [day.dayOfWeek, day]));
  const previewDays = new Map((input.previewPlan.days || []).map((day) => [day.dayOfWeek, day]));
  const allDayKeys = Array.from(new Set([...currentDays.keys(), ...previewDays.keys()])).sort((a, b) => a - b);

  const replacedMealNames: NutritionReplacedMeal[] = [];
  const ingredientChanges: NutritionIngredientChange[] = [];
  const macroDeltaDays: NutritionMacroDeltaDay[] = [];
  const changedDays = new Set<number>();
  let changedMealCount = 0;
  let changedSlotCount = 0;

  for (const dayOfWeek of allDayKeys) {
    const currentDay = currentDays.get(dayOfWeek);
    const previewDay = previewDays.get(dayOfWeek);

    if (!currentDay || !previewDay) {
      changedDays.add(dayOfWeek);
      changedSlotCount += Math.abs((currentDay?.meals?.length || 0) - (previewDay?.meals?.length || 0));
      continue;
    }

    const currentMealsBySlot = new Map((currentDay.meals || []).map((meal) => [meal.meal_slot, meal]));
    const previewMealsBySlot = new Map((previewDay.meals || []).map((meal) => [meal.meal_slot, meal]));
    const allSlots = Array.from(new Set([...currentMealsBySlot.keys(), ...previewMealsBySlot.keys()]));

    for (const slot of allSlots) {
      const currentMeal = currentMealsBySlot.get(slot);
      const previewMeal = previewMealsBySlot.get(slot);

      if (!currentMeal || !previewMeal) {
        changedDays.add(dayOfWeek);
        changedSlotCount += 1;
        changedMealCount += 1;
        replacedMealNames.push({
          dayOfWeek,
          mealSlot: slot,
          currentMealName: currentMeal?.name || 'Removed meal',
          previewMealName: previewMeal?.name || 'Removed meal',
        });
        continue;
      }

      const currentVariantName = normalizeToken(currentMeal.selected_variant?.name || currentMeal.name);
      const previewVariantName = normalizeToken(previewMeal.selected_variant?.name || previewMeal.name);
      const sameVariantName = currentVariantName === previewVariantName;

      if (!sameVariantName) {
        changedDays.add(dayOfWeek);
        changedMealCount += 1;
        replacedMealNames.push({
          dayOfWeek,
          mealSlot: slot,
          currentMealName: currentMeal.name,
          previewMealName: previewMeal.name,
        });
      }

      const ingredientChange = diffIngredients({
        dayOfWeek,
        meal: previewMeal,
        currentVariant: currentMeal.selected_variant,
        previewVariant: previewMeal.selected_variant,
      });

      if (ingredientChange) {
        changedDays.add(dayOfWeek);
        ingredientChanges.push(ingredientChange);
        if (sameVariantName) {
          changedMealCount += 1;
        }
      }
    }

    const macroDelta = buildMacroDelta(currentDay, previewDay);
    if (macroDelta) {
      changedDays.add(dayOfWeek);
      macroDeltaDays.push(macroDelta);
    }
  }

  const changeSummary: string[] = [];
  if (changedSlotCount > 0) {
    changeSummary.push(`Changed meal slots on ${changedSlotCount} slot${changedSlotCount === 1 ? '' : 's'}.`);
  }
  if (changedMealCount > 0) {
    changeSummary.push(`Replaced or materially changed ${changedMealCount} meal${changedMealCount === 1 ? '' : 's'}.`);
  }
  if (macroDeltaDays.length > 0) {
    changeSummary.push(
      `Macro targets shifted on ${macroDeltaDays.length} day${macroDeltaDays.length === 1 ? '' : 's'} (${macroDeltaDays.map((entry) => dayLabel(entry.dayOfWeek)).join(', ')}).`,
    );
  }
  if (ingredientChanges.length > 0) {
    changeSummary.push(`Ingredient changes detected in ${ingredientChanges.length} meal${ingredientChanges.length === 1 ? '' : 's'}.`);
  }

  const isMateriallyDifferent =
    changedSlotCount > 0
    || changedMealCount > 0
    || macroDeltaDays.length > 0
    || ingredientChanges.length > 0;

  return {
    changedDayCount: changedDays.size,
    changedMealCount,
    changedSlotCount,
    replacedMealNames,
    ingredientChanges,
    macroDeltaDays,
    changeSummary,
    isMateriallyDifferent,
  };
}
