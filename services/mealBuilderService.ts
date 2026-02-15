import { supabase } from '../lib/supabase';

export interface BuiltMeal {
  name: string;
  slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  ingredients: Array<{
    food_item_id: string | null;
    item_name: string;
    grams: number;
    quantity_unit: string;
    quantity_value: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }>;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  estimatedCost: number;
  substitutions: Array<{
    ingredient: string;
    alternatives: string[];
  }>;
  score: number;
}

export interface MealBuilderResult {
  meals: BuiltMeal[];
  groceryList: {
    listId: string | null;
    totalEstimatedCost: number;
    items: Array<{
      item_name: string;
      food_item_id: string | null;
      required_quantity: number;
      on_hand_quantity: number;
      to_buy_quantity: number;
      quantity_unit: string;
      estimated_unit_cost: number;
      estimated_total_cost: number;
      substitution_suggestions: string[];
    }>;
  };
  leftoversPlan: Array<{
    item_name: string;
    expected_leftover_grams: number;
    note: string;
  }>;
  appliedMealIds: string[];
  warnings: string[];
}

export async function buildMealsFromConstraints(input: {
  constraints: {
    meal_count?: number;
    meal_slot?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    protein_target?: number;
    max_calories?: number;
    budget_limit?: number;
    allergies?: string[];
    refused_foods?: string[];
  };
  pantry_mode?: 'full_inventory' | 'off';
  persist_grocery_list?: boolean;
  apply_target?: {
    plan_id?: string;
    day_of_week?: number;
    meal_slots?: Array<'breakfast' | 'lunch' | 'dinner' | 'snack'>;
    selected_indexes?: number[];
  };
}): Promise<MealBuilderResult> {
  const { data, error } = await supabase.functions.invoke('build-meals-from-constraints', {
    body: input,
  });

  if (error) {
    throw new Error(error.message || 'Meal builder failed');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Meal builder failed');
  }

  return {
    meals: data.meals || [],
    groceryList: data.groceryList,
    leftoversPlan: data.leftoversPlan || [],
    appliedMealIds: data.appliedMealIds || [],
    warnings: data.warnings || [],
  };
}

export async function applyMealsBatch(input: {
  planId?: string;
  dayOfWeek: number;
  meals: Array<{
    meal_slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    name: string;
    description?: string;
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fat?: number;
    prep_time_min?: number;
    items?: Array<{
      food_item_id?: string | null;
      item_name?: string;
      quantity_value?: number;
      quantity_unit?: string;
      grams?: number;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
    }>;
  }>;
}) {
  const { data, error } = await supabase.functions.invoke('apply-meal-plan-batch-change', {
    body: {
      plan_id: input.planId,
      day_of_week: input.dayOfWeek,
      meals: input.meals,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to apply meal batch');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to apply meal batch');
  }

  return {
    planId: data.plan_id as string,
    dayOfWeek: Number(data.day_of_week),
    changedMealIds: (data.changed_meal_ids || []) as string[],
  };
}
