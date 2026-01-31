// Nutrition Service - Supabase Integration
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';

// Database row types
type FoodItemRow = Database['public']['Tables']['food_items']['Row'];
type MealLogRow = Database['public']['Tables']['meal_logs']['Row'];
type MealLogItemRow = Database['public']['Tables']['meal_log_items']['Row'];

// Service types - mapped from database schema
export interface FoodItem {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
  sugarPer100g: number | null;
  sodiumPer100g: number | null;
  servingSizeG: number | null;
  servingDescription: string | null;
  barcode: string | null;
  source: 'internal' | 'usda_fdc' | 'openfoodfacts' | 'manual';
  imageUrl: string | null;
  isVerified: boolean;
}

export interface MacroBreakdown {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

// Type alias for hook compatibility
export type DailyNutritionTotals = MacroBreakdown;

// Type for meal slot
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealLogItem {
  id: string;
  mealLogId: string;
  foodItemId: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  food: FoodItem;
}

export interface MealLog {
  id: string;
  userId: string;
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  loggedAt: string;
  notes: string | null;
  items: MealLogItem[];
}

// Helper: Convert database row to service type
function mapFoodItemRow(row: FoodItemRow): FoodItem {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    caloriesPer100g: row.calories_per_100g,
    proteinPer100g: row.protein_per_100g,
    carbsPer100g: row.carbs_per_100g,
    fatPer100g: row.fat_per_100g,
    fiberPer100g: row.fiber_per_100g,
    sugarPer100g: row.sugar_per_100g,
    sodiumPer100g: row.sodium_per_100g,
    servingSizeG: row.serving_size_g,
    servingDescription: row.serving_description,
    barcode: row.barcode,
    source: row.source,
    imageUrl: row.image_url,
    isVerified: row.is_verified,
  };
}

/**
 * Get a single food item by ID
 */
export async function getFoodById(id: string): Promise<FoodItem | null> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching food item:', error);
    return null;
  }

  return data ? mapFoodItemRow(data) : null;
}

/**
 * Search food items by name or brand
 * Uses PostgreSQL full-text search
 */
export async function searchFoods(query: string, limit = 50): Promise<FoodItem[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = `%${query.toLowerCase()}%`;

  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .or(`name.ilike.${searchTerm},brand.ilike.${searchTerm}`)
    .order('is_verified', { ascending: false })
    .order('name')
    .limit(limit);

  if (error) {
    console.error('Error searching foods:', error);
    return [];
  }

  return data.map(mapFoodItemRow);
}

/**
 * Calculate macros for a given food and portion size
 * Formula: (per_100g_value * grams) / 100
 */
export function calculateMacros(food: FoodItem, grams: number): MacroBreakdown {
  const multiplier = grams / 100;

  return {
    calories: Math.round(food.caloriesPer100g * multiplier),
    protein: Math.round(food.proteinPer100g * multiplier * 10) / 10,
    carbs: Math.round(food.carbsPer100g * multiplier * 10) / 10,
    fat: Math.round(food.fatPer100g * multiplier * 10) / 10,
    fiber: Math.round((food.fiberPer100g || 0) * multiplier * 10) / 10,
  };
}

/**
 * Log a food item to a meal
 * Creates meal_log if needed, then inserts meal_log_item
 */
export async function logFood(
  userId: string,
  foodId: string,
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  grams: number,
  date?: Date
): Promise<MealLogItem> {
  // Get the food item to calculate macros
  const food = await getFoodById(foodId);
  if (!food) {
    throw new Error(`Food item not found: ${foodId}`);
  }

  // Calculate macros for this portion
  const macros = calculateMacros(food, grams);

  // Use provided date or current date/time
  const loggedAt = date ? date.toISOString() : new Date().toISOString();
  const loggedDate = loggedAt.split('T')[0]; // YYYY-MM-DD

  // Check if meal_log exists for this user, date, and meal slot
  const { data: existingMealLog } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('meal_slot', mealSlot)
    .gte('logged_at', `${loggedDate}T00:00:00`)
    .lte('logged_at', `${loggedDate}T23:59:59`)
    .maybeSingle();

  let mealLogId: string;

  if (existingMealLog) {
    // Use existing meal log
    mealLogId = existingMealLog.id;
  } else {
    // Create new meal log
    const { data: newMealLog, error: mealLogError } = await supabase
      .from('meal_logs')
      .insert({
        user_id: userId,
        meal_slot: mealSlot,
        logged_at: loggedAt,
      })
      .select()
      .single();

    if (mealLogError) {
      console.error('Error creating meal log:', mealLogError);
      throw new Error('Failed to create meal log');
    }

    mealLogId = newMealLog.id;
  }

  // Insert meal log item
  const { data: mealLogItem, error: itemError } = await supabase
    .from('meal_log_items')
    .insert({
      meal_log_id: mealLogId,
      food_item_id: foodId,
      grams,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    })
    .select()
    .single();

  if (itemError) {
    console.error('Error creating meal log item:', itemError);
    throw new Error('Failed to log food item');
  }

  return {
    id: mealLogItem.id,
    mealLogId: mealLogItem.meal_log_id,
    foodItemId: mealLogItem.food_item_id,
    grams: mealLogItem.grams,
    calories: mealLogItem.calories,
    protein: mealLogItem.protein,
    carbs: mealLogItem.carbs,
    fat: mealLogItem.fat,
    food,
  };
}

/**
 * Get total nutrition for a given day
 * Sums all meal_log_items for the user on the specified date
 */
export async function getDailyNutritionTotal(
  userId: string,
  date: Date
): Promise<MacroBreakdown> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Query all meal logs for the day
  const { data: mealLogs, error: mealLogsError } = await supabase
    .from('meal_logs')
    .select('id')
    .eq('user_id', userId)
    .gte('logged_at', startOfDay.toISOString())
    .lte('logged_at', endOfDay.toISOString());

  if (mealLogsError) {
    console.error('Error fetching meal logs:', mealLogsError);
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }

  if (!mealLogs || mealLogs.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }

  const mealLogIds = mealLogs.map(log => log.id);

  // Query all meal log items for these logs
  const { data: items, error: itemsError } = await supabase
    .from('meal_log_items')
    .select('calories, protein, carbs, fat')
    .in('meal_log_id', mealLogIds);

  if (itemsError) {
    console.error('Error fetching meal log items:', itemsError);
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }

  // Sum all macros
  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: 0, // fiber not stored in meal_log_items
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
  };
}

/**
 * Get all meals for a given day with their food items
 */
export async function getMealsForDay(userId: string, date: Date): Promise<MealLog[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Query meal logs with their items and food details
  const { data: mealLogs, error } = await supabase
    .from('meal_logs')
    .select(`
      *,
      items:meal_log_items(
        *,
        food:food_items(*)
      )
    `)
    .eq('user_id', userId)
    .gte('logged_at', startOfDay.toISOString())
    .lte('logged_at', endOfDay.toISOString())
    .order('logged_at', { ascending: true });

  if (error) {
    console.error('Error fetching meals for day:', error);
    return [];
  }

  // Map to service types
  return mealLogs.map((log: any) => ({
    id: log.id,
    userId: log.user_id,
    mealSlot: log.meal_slot,
    loggedAt: log.logged_at,
    notes: log.notes,
    items: (log.items || []).map((item: any) => ({
      id: item.id,
      mealLogId: item.meal_log_id,
      foodItemId: item.food_item_id,
      grams: item.grams,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      food: mapFoodItemRow(item.food),
    })),
  }));
}

/**
 * Get food item by barcode
 */
export async function getFoodByBarcode(barcode: string): Promise<FoodItem | null> {
  const { data, error } = await supabase
    .from('food_items')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle();

  if (error) {
    console.error('Error fetching food by barcode:', error);
    return null;
  }

  return data ? mapFoodItemRow(data) : null;
}

/**
 * Delete a meal log item
 */
export async function deleteMealLogItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_log_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error('Error deleting meal log item:', error);
    throw new Error('Failed to delete meal log item');
  }
}

// Hook-compatible aliases (accept date string instead of Date object)
/**
 * Get daily nutrition totals (hook-compatible version)
 * @param userId - User ID
 * @param date - Date string in YYYY-MM-DD format
 */
export async function getDailyTotals(
  userId: string,
  date: string
): Promise<DailyNutritionTotals> {
  const dateObj = new Date(date);
  return getDailyNutritionTotal(userId, dateObj);
}

/**
 * Get daily meals (hook-compatible version)
 * @param userId - User ID
 * @param date - Date string in YYYY-MM-DD format
 */
export async function getDailyMeals(userId: string, date: string): Promise<MealLog[]> {
  const dateObj = new Date(date);
  return getMealsForDay(userId, dateObj);
}

/**
 * Get nutrition stats for a date range
 * Returns map of date -> totals
 */
export async function getNutritionStats(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, MacroBreakdown>> {
  // Query all meal logs in range
  const { data: mealLogs, error } = await supabase
    .from('meal_logs')
    .select(`
      logged_at,
      items:meal_log_items(
        calories, protein, carbs, fat
      )
    `)
    .eq('user_id', userId)
    .gte('logged_at', startDate)
    .lte('logged_at', endDate);

  if (error) {
    console.error('Error fetching nutrition stats:', error);
    return {};
  }

  const stats: Record<string, MacroBreakdown> = {};

  // Initialize all days in range with 0 (optional, but good for charts)
  // construct a loop from start to end? 
  // For now, let's just return the days we have data for, UI can fill gaps.

  mealLogs?.forEach((log: any) => {
    const date = log.logged_at.split('T')[0];

    if (!stats[date]) {
      stats[date] = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    }

    log.items?.forEach((item: any) => {
      stats[date].calories += item.calories || 0;
      stats[date].protein += item.protein || 0;
      stats[date].carbs += item.carbs || 0;
      stats[date].fat += item.fat || 0;
    });
  });

  return stats;
}

/**
 * Copy all meals from one day to another
 */
export async function copyDayMeals(userId: string, fromDate: string, toDate: string): Promise<void> {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  // 1. Get original meals
  const originalMeals = await getMealsForDay(userId, from);

  if (originalMeals.length === 0) return;

  // 2. Iterate and copy
  // We use sequential await to ensure order and avoid overwhelming db
  for (const meal of originalMeals) {
    if (!meal.items) continue;

    for (const item of meal.items) {
      try {
        // Log to target date
        // Note: This will group them into the same meal slots (Breakfast, Lunch, etc)
        await logFood(
          userId,
          item.foodItemId,
          meal.mealSlot,
          item.grams,
          to
        );
      } catch (e) {
        console.error("Failed to copy item", e);
      }
    }
  }
}
