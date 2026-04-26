import { supabase } from '../lib/supabase';
import {
  getDailyMeals,
  getDailyTotals,
  type DailyNutritionTotals,
  type MealLog,
  type MealSlot,
} from './nutritionService';
import { formatTime12h, getMealTimes } from './mealTimesService';
import { getDailyWaterSummary } from './waterService';
import { getPrepCoachState, type PrepCoachState } from './prepCoachService';
import {
  getActiveNutritionPlan,
  getLatestNutritionPlanPreview,
  getNutritionPlanMealsForDay,
  type NutritionPlanDayDetails,
  type NutritionPlanMeal,
  type NutritionPlanWithDetails,
} from './planService';

export type NutritionTodayStatus = 'on_track' | 'behind' | 'quiet' | 'plan_gap' | 'insufficient_data';

export interface NutritionNextMealSnapshot {
  planMealId: string;
  mealSlot: MealSlot;
  slotLabel: string;
  mealName: string;
  timeLabel: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
}

export interface NutritionMealTimelineEntry {
  slot: MealSlot;
  slotLabel: string;
  timeLabel: string;
  planMealId: string | null;
  plannedMealName: string | null;
  canDirectLog: boolean;
  mappingState: 'ready' | 'repairable' | 'unmapped';
  unmappedItemCount: number;
  targetCalories: number;
  loggedMealId: string | null;
  loggedCalories: number;
  loggedItems: {
    id: string;
    name: string;
    portion: string;
    calories: number;
  }[];
  status: 'logged' | 'planned' | 'empty';
}

export interface NutritionTodaySnapshot {
  date: string;
  status: NutritionTodayStatus;
  headline: string;
  subheadline: string;
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    waterMl: number;
  };
  consumed: DailyNutritionTotals;
  remaining: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    waterMl: number;
  };
  hydration: {
    currentMl: number;
    targetMl: number;
    percentageComplete: number;
  };
  previewPlan: {
    id: string;
    name: string;
    replacesPlanId: string | null;
  } | null;
  livePlan: Pick<NutritionPlanWithDetails, 'id' | 'name' | 'version'> | null;
  dayPlan: NutritionPlanDayDetails | null;
  nextMeal: NutritionNextMealSnapshot | null;
  mealTimeline: NutritionMealTimelineEntry[];
  prepCoach: {
    enabled: boolean;
    state: PrepCoachState | null;
  };
}

type UserTargetsRow = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  water_ml: number | null;
};

const SLOT_LABEL_MAP: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const SLOT_ORDER: Record<MealSlot, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

function clampRemaining(target: number, consumed: number) {
  return Math.max(0, Math.round((target - consumed) * 10) / 10);
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function toDateString(input?: string) {
  return input || new Date().toISOString().split('T')[0];
}

function formatSlotTime(slot: MealSlot, mealTimes: Awaited<ReturnType<typeof getMealTimes>>) {
  return formatTime12h(mealTimes[slot]);
}

function toMinutes(rawTime: string | undefined) {
  if (!rawTime || rawTime === 'anytime') return Number.POSITIVE_INFINITY;
  const [hours, minutes] = rawTime.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.POSITIVE_INFINITY;
  return hours * 60 + minutes;
}

function getMealTotals(meal: NutritionPlanMeal) {
  const source = meal.selected_variant || meal;
  return {
    calories: Number(source.target_calories || meal.target_calories || 0),
    protein: Number(source.target_protein || meal.target_protein || 0),
    carbs: Number(source.target_carbs || meal.target_carbs || 0),
    fat: Number(source.target_fat || meal.target_fat || 0),
  };
}

function buildTimeline(
  dayPlan: NutritionPlanDayDetails | null,
  dailyMeals: MealLog[],
  mealTimes: Awaited<ReturnType<typeof getMealTimes>>,
): NutritionMealTimelineEntry[] {
  const loggedBySlot = new Map<MealSlot, MealLog>();
  for (const meal of dailyMeals) {
    loggedBySlot.set(meal.mealSlot, meal);
  }

  const planMeals = new Map<MealSlot, NutritionPlanMeal>();
  for (const meal of dayPlan?.meals || []) {
    planMeals.set(meal.meal_slot, meal);
  }

  const allSlots = Array.from(
    new Set<MealSlot>([
      ...Array.from(planMeals.keys()),
      ...Array.from(loggedBySlot.keys()),
      'breakfast',
      'lunch',
      'dinner',
      'snack',
    ]),
  ).sort((a, b) => SLOT_ORDER[a] - SLOT_ORDER[b]);

  return allSlots.map((slot) => {
    const loggedMeal = loggedBySlot.get(slot) || null;
    const plannedMeal = planMeals.get(slot) || null;
    const planTotals = plannedMeal ? getMealTotals(plannedMeal) : null;
    const loggedCalories = (loggedMeal?.items || []).reduce((sum, item) => sum + Number(item.calories || 0), 0);

    return {
      slot,
      slotLabel: SLOT_LABEL_MAP[slot],
      timeLabel: formatSlotTime(slot, mealTimes),
      planMealId: plannedMeal?.id || null,
      plannedMealName: plannedMeal?.selected_variant?.name || plannedMeal?.name || null,
      canDirectLog: !!plannedMeal?.can_direct_log,
      mappingState: plannedMeal?.mapping_state || 'unmapped',
      unmappedItemCount: plannedMeal?.unmapped_item_count || 0,
      targetCalories: Number(planTotals?.calories || 0),
      loggedMealId: loggedMeal?.id || null,
      loggedCalories: round1(loggedCalories),
      loggedItems: (loggedMeal?.items || []).map((item) => ({
        id: item.id,
        name: item.food?.name || 'Unknown Food',
        portion: `${Math.round(item.grams)}g`,
        calories: Number(item.calories || 0),
      })),
      status: loggedMeal ? 'logged' : plannedMeal ? 'planned' : 'empty',
    };
  });
}

function buildNextMeal(
  dayPlan: NutritionPlanDayDetails | null,
  dailyMeals: MealLog[],
  mealTimes: Awaited<ReturnType<typeof getMealTimes>>,
): NutritionNextMealSnapshot | null {
  const meals = dayPlan?.meals || [];
  if (!meals.length) return null;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const loggedSlots = new Set<MealSlot>(dailyMeals.map((meal) => meal.mealSlot));

  const sortedMeals = [...meals]
    .map((meal) => ({
      meal,
      minutes: toMinutes(mealTimes[meal.meal_slot]),
    }))
    .sort((a, b) => {
      if (a.minutes === b.minutes) return SLOT_ORDER[a.meal.meal_slot] - SLOT_ORDER[b.meal.meal_slot];
      return a.minutes - b.minutes;
    });

  const unresolved = sortedMeals.filter((entry) => !loggedSlots.has(entry.meal.meal_slot));
  const nextEntry = unresolved.find((entry) => entry.minutes >= nowMinutes)
    || unresolved.find((entry) => Number.isFinite(entry.minutes))
    || unresolved[0]
    || null;

  if (!nextEntry) return null;

  const totals = getMealTotals(nextEntry.meal);

  return {
    planMealId: nextEntry.meal.id,
    mealSlot: nextEntry.meal.meal_slot,
    slotLabel: SLOT_LABEL_MAP[nextEntry.meal.meal_slot],
    mealName: nextEntry.meal.selected_variant?.name || nextEntry.meal.name || 'Planned Meal',
    timeLabel: formatSlotTime(nextEntry.meal.meal_slot, mealTimes),
    targetCalories: totals.calories,
    targetProtein: totals.protein,
    targetCarbs: totals.carbs,
    targetFat: totals.fat,
  };
}

function buildStatusSummary(input: {
  livePlan: NutritionPlanWithDetails | null;
  consumed: DailyNutritionTotals;
  targets: NutritionTodaySnapshot['targets'];
  mealTimeline: NutritionMealTimelineEntry[];
  nextMeal: NutritionNextMealSnapshot | null;
  hydration: NutritionTodaySnapshot['hydration'];
}): Pick<NutritionTodaySnapshot, 'status' | 'headline' | 'subheadline'> {
  const { livePlan, consumed, targets, mealTimeline, nextMeal, hydration } = input;
  const caloriesPct = targets.calories > 0 ? consumed.calories / targets.calories : 0;
  const proteinPct = targets.protein > 0 ? consumed.protein / targets.protein : 0;
  const loggedMeals = mealTimeline.filter((meal) => meal.status === 'logged').length;
  const nowHour = new Date().getHours();

  if (!livePlan) {
    return {
      status: 'plan_gap' as const,
      headline: 'No live nutrition plan',
      subheadline: 'You can still log meals today, but next-meal guidance will appear once a plan is active.',
    };
  }

  if (targets.calories <= 0 && targets.protein <= 0) {
    return {
      status: 'insufficient_data' as const,
      headline: 'Targets still need setup',
      subheadline: 'Set calorie and macro targets to make daily adherence tracking meaningful.',
    };
  }

  if (!loggedMeals && caloriesPct === 0) {
    return {
      status: nowHour < 12 ? 'quiet' : 'behind',
      headline: nowHour < 12 ? 'Quiet day so far' : 'Logging is behind today',
      subheadline: nextMeal
        ? `${nextMeal.slotLabel} is next. ${Math.round(nextMeal.targetCalories)} kcal planned at ${nextMeal.timeLabel}.`
        : 'Start logging your first meal to bring today into focus.',
    };
  }

  if (caloriesPct >= 0.45 && proteinPct >= 0.45) {
    return {
      status: 'on_track' as const,
      headline: 'Nutrition is holding today',
      subheadline: `Protein is ${Math.round(proteinPct * 100)}% in and hydration is ${Math.round(
        hydration.percentageComplete,
      )}% complete.`,
    };
  }

  if (loggedMeals >= 2 && proteinPct >= 0.35) {
    return {
      status: 'on_track' as const,
      headline: 'You are moving in the right direction',
      subheadline: nextMeal
        ? `${nextMeal.slotLabel} is still open. ${Math.round(targets.protein - consumed.protein)}g protein left.`
        : 'Keep logging the remaining meals to finish the day cleanly.',
    };
  }

  return {
    status: 'behind' as const,
    headline: 'Nutrition needs attention',
    subheadline: `You still have ${Math.max(0, Math.round(targets.calories - consumed.calories))} kcal and ${Math.max(
      0,
      Math.round(targets.protein - consumed.protein),
    )}g protein left today.`,
  };
}

async function getUserTargets(userId: string): Promise<UserTargetsRow | null> {
  const { data, error } = await supabase
    .from('user_targets')
    .select('calories, protein_g, carbs_g, fat_g, water_ml')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch nutrition targets:', error);
    return null;
  }

  return data;
}

export async function getNutritionTodaySnapshot(
  userId: string,
  date?: string,
): Promise<NutritionTodaySnapshot> {
  const targetDate = toDateString(date);
  const dayOfWeek = new Date(`${targetDate}T00:00:00`).getDay();

  const [
    targetsRow,
    consumed,
    dailyMeals,
    waterSummary,
    mealTimes,
    livePlan,
    previewPlan,
    prepState,
  ] = await Promise.all([
    getUserTargets(userId),
    getDailyTotals(userId, targetDate),
    getDailyMeals(userId, targetDate),
    getDailyWaterSummary(userId, targetDate),
    getMealTimes(userId),
    getActiveNutritionPlan(userId),
    getLatestNutritionPlanPreview(userId),
    getPrepCoachState(userId).catch(() => null),
  ]);

  const dayPlan = livePlan ? await getNutritionPlanMealsForDay(userId, dayOfWeek, livePlan.id) : null;
  const targets = {
    calories: Number(targetsRow?.calories || 0),
    protein: Number(targetsRow?.protein_g || 0),
    carbs: Number(targetsRow?.carbs_g || 0),
    fat: Number(targetsRow?.fat_g || 0),
    waterMl: Number(targetsRow?.water_ml || waterSummary?.targetMl || 0),
  };

  const hydration = {
    currentMl: Number(waterSummary?.totalMl || 0),
    targetMl: Number(waterSummary?.targetMl || targets.waterMl || 0),
    percentageComplete: Number(waterSummary?.percentageComplete || 0),
  };

  const mealTimeline = buildTimeline(dayPlan, dailyMeals, mealTimes);
  const nextMeal = buildNextMeal(dayPlan, dailyMeals, mealTimes);
  const statusSummary = buildStatusSummary({
    livePlan,
    consumed,
    targets,
    mealTimeline,
    nextMeal,
    hydration,
  });

  return {
    date: targetDate,
    status: statusSummary.status,
    headline: statusSummary.headline,
    subheadline: statusSummary.subheadline,
    targets,
    consumed,
    remaining: {
      calories: clampRemaining(targets.calories, consumed.calories),
      protein: clampRemaining(targets.protein, consumed.protein),
      carbs: clampRemaining(targets.carbs, consumed.carbs),
      fat: clampRemaining(targets.fat, consumed.fat),
      waterMl: clampRemaining(hydration.targetMl, hydration.currentMl),
    },
    hydration,
    previewPlan: previewPlan
      ? {
          id: previewPlan.id,
          name: previewPlan.name || 'Preview nutrition plan',
          replacesPlanId: previewPlan.replaces_plan_id || null,
        }
      : null,
    livePlan: livePlan
      ? {
          id: livePlan.id,
          name: livePlan.name || 'Nutrition Plan',
          version: Number(livePlan.version || 1),
        }
      : null,
    dayPlan,
    nextMeal,
    mealTimeline,
    prepCoach: {
      enabled: !!prepState?.enabled,
      state: prepState,
    },
  };
}
