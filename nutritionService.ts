// Nutrition Service - Supabase Integration
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';
import { getNutritionPlanMeal, repairNutritionPlanMappings } from './planService';

// Database row types
type FoodItemRow = Database['public']['Tables']['food_items']['Row'];

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
  externalSourceId: string | null;
  source: 'internal' | 'usda_fdc' | 'openfoodfacts' | 'manual';
  imageUrl: string | null;
  isVerified: boolean;
}

export interface ExternalFoodSearchResult {
  provider: 'usda_fdc' | 'openfoodfacts';
  externalId: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSizeG: number | null;
  servingDescription: string | null;
  confidence: number | null;
}

export interface UpsertExternalFoodItemInput {
  provider: ExternalFoodSearchResult['provider'];
  externalId: string;
  barcode?: string | null;
  name: string;
  brand?: string | null;
  imageUrl?: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSizeG?: number | null;
  servingDescription?: string | null;
}

export interface FoodCatalogSearchResult {
  kind: 'local' | 'external';
  localFood?: FoodItem;
  externalFood?: ExternalFoodSearchResult;
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

export interface LogPlannedMealInput {
  planMealId: string;
  date?: string;
}

export interface LogPlannedMealResult {
  mealLogId: string;
  mealSlot: MealSlot;
  loggedItemCount: number;
  loggedCalories: number;
  planMealId: string;
  plannedMealName: string;
}

export interface FavoriteFood {
  favoriteId: string;
  createdAt: string;
  food: FoodItem;
}

export interface UpsertUserFoodInput {
  name: string;
  brand?: string | null;
  category?: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number | null;
  sugarPer100g?: number | null;
  sodiumPer100g?: number | null;
  servingSizeG?: number | null;
  servingDescription?: string | null;
  imageUrl?: string | null;
  barcode?: string | null;
}

type MealLogInsertItem = {
  foodItemId: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function mapMealLogRecord(log: any): MealLog {
  return {
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
  };
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
    externalSourceId: row.external_source_id,
    source: row.source,
    imageUrl: row.image_url,
    isVerified: row.is_verified,
  };
}

function mapExternalFoodSearchResult(result: any): ExternalFoodSearchResult {
  return {
    provider: result.provider,
    externalId: result.externalId,
    barcode: result.barcode ?? null,
    name: result.name,
    brand: result.brand ?? null,
    imageUrl: result.imageUrl ?? null,
    caloriesPer100g: result.caloriesPer100g,
    proteinPer100g: result.proteinPer100g,
    carbsPer100g: result.carbsPer100g,
    fatPer100g: result.fatPer100g,
    servingSizeG: result.servingSizeG ?? null,
    servingDescription: result.servingDescription ?? null,
    confidence: typeof result.confidence === 'number' ? result.confidence : null,
  };
}

function mapFavoriteFoodRecord(
  record: { id: string; created_at: string; food_item: FoodItemRow | FoodItemRow[] | null },
): FavoriteFood | null {
  const foodItem = Array.isArray(record.food_item) ? record.food_item[0] : record.food_item;

  if (!foodItem) {
    return null;
  }

  return {
    favoriteId: record.id,
    createdAt: record.created_at,
    food: mapFoodItemRow(foodItem),
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

export async function createUserFood(
  _userId: string,
  input: UpsertUserFoodInput,
): Promise<FoodItem> {
  const { data, error } = await supabase.rpc('create_user_food_item', {
    p_name: input.name,
    p_brand: input.brand ?? null,
    p_category: input.category ?? null,
    p_calories_per_100g: input.caloriesPer100g,
    p_protein_per_100g: input.proteinPer100g,
    p_carbs_per_100g: input.carbsPer100g,
    p_fat_per_100g: input.fatPer100g,
    p_fiber_per_100g: input.fiberPer100g ?? null,
    p_sugar_per_100g: input.sugarPer100g ?? null,
    p_sodium_per_100g: input.sodiumPer100g ?? null,
    p_serving_size_g: input.servingSizeG ?? null,
    p_serving_description: input.servingDescription ?? null,
    p_image_url: input.imageUrl ?? null,
    p_barcode: input.barcode ?? null,
  });

  if (error || !data) {
    console.error('Error creating user food item:', error);
    throw new Error('Failed to create saved food');
  }

  return mapFoodItemRow(data as FoodItemRow);
}

export async function getFavoriteFoods(userId: string, query?: string): Promise<FavoriteFood[]> {
  const { data, error } = await supabase
    .from('food_favorites')
    .select(`
      id,
      created_at,
      food_item:food_items(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorite foods:', error);
    return [];
  }

  const favorites = (data || [])
    .map((record) => mapFavoriteFoodRecord(record as { id: string; created_at: string; food_item: FoodItemRow | FoodItemRow[] | null }))
    .filter((record): record is FavoriteFood => Boolean(record));

  if (!query?.trim()) {
    return favorites;
  }

  const searchTerm = query.trim().toLowerCase();
  return favorites.filter(({ food }) =>
    food.name.toLowerCase().includes(searchTerm)
    || food.brand?.toLowerCase().includes(searchTerm),
  );
}

export async function getFavoriteFoodIds(userId: string, foodIds?: string[]): Promise<string[]> {
  let request = supabase
    .from('food_favorites')
    .select('food_item_id')
    .eq('user_id', userId);

  if (foodIds?.length) {
    request = request.in('food_item_id', foodIds);
  }

  const { data, error } = await request;

  if (error) {
    console.error('Error fetching favorite food ids:', error);
    return [];
  }

  return (data || []).map((record) => record.food_item_id);
}

export async function addFavoriteFood(userId: string, foodItemId: string): Promise<void> {
  const { error } = await supabase
    .from('food_favorites')
    .upsert(
      {
        user_id: userId,
        food_item_id: foodItemId,
      },
      {
        onConflict: 'user_id,food_item_id',
        ignoreDuplicates: true,
      },
    );

  if (error) {
    console.error('Error saving favorite food:', error);
    throw new Error('Failed to save food');
  }
}

export async function removeFavoriteFood(userId: string, foodItemId: string): Promise<void> {
  const { error } = await supabase
    .from('food_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('food_item_id', foodItemId);

  if (error) {
    console.error('Error removing favorite food:', error);
    throw new Error('Failed to remove saved food');
  }
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

export async function searchExternalFoods(
  query: string,
  limit = 20,
): Promise<ExternalFoodSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const { data, error } = await supabase.functions.invoke('search-food-catalog', {
    body: {
      query: query.trim(),
      limit,
    },
  });

  if (error) {
    console.error('Error searching external foods:', error);
    return [];
  }

  if (!data?.ok || !Array.isArray(data.results)) {
    return [];
  }

  return data.results.map(mapExternalFoodSearchResult);
}

export async function searchFoodCatalog(
  query: string,
  limit = 50,
): Promise<FoodCatalogSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const [localResults, externalResults] = await Promise.all([
    searchFoods(query, limit),
    searchExternalFoods(query, Math.min(limit, 20)),
  ]);

  const localExternalKeys = new Set(
    localResults
      .filter((food) => food.externalSourceId)
      .map((food) => `${food.source}:${food.externalSourceId}`),
  );
  const localBarcodes = new Set(
    localResults
      .map((food) => food.barcode?.trim())
      .filter((barcode): barcode is string => Boolean(barcode)),
  );

  const filteredExternalResults = externalResults.filter((food) => {
    const externalKey = `${food.provider}:${food.externalId}`;
    const barcode = food.barcode?.trim();

    if (localExternalKeys.has(externalKey)) {
      return false;
    }

    if (barcode && localBarcodes.has(barcode)) {
      return false;
    }

    return true;
  });

  return [
    ...localResults.map((food) => ({
      kind: 'local' as const,
      localFood: food,
    })),
    ...filteredExternalResults.map((food) => ({
      kind: 'external' as const,
      externalFood: food,
    })),
  ];
}

export async function upsertExternalFoodItem(
  input: UpsertExternalFoodItemInput,
): Promise<FoodItem> {
  const { data, error } = await supabase.functions.invoke('upsert-external-food-item', {
    body: {
      provider: input.provider,
      externalId: input.externalId,
      barcode: input.barcode ?? null,
      name: input.name,
      brand: input.brand ?? null,
      imageUrl: input.imageUrl ?? null,
      caloriesPer100g: input.caloriesPer100g,
      proteinPer100g: input.proteinPer100g,
      carbsPer100g: input.carbsPer100g,
      fatPer100g: input.fatPer100g,
      servingSizeG: input.servingSizeG ?? null,
      servingDescription: input.servingDescription ?? null,
    },
  });

  if (error) {
    console.error('Error importing external food item:', error);
    throw new Error(error.message || 'Failed to import food');
  }

  if (!data?.ok || !data.foodItemId) {
    throw new Error(data?.error || 'Failed to import food');
  }

  const food = await getFoodById(data.foodItemId);
  if (!food) {
    throw new Error('Imported food is not available yet');
  }

  return food;
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

function getLogDateInfo(date?: Date | string) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      loggedAt: new Date(`${date}T12:00:00`).toISOString(),
      loggedDate: date,
    };
  }

  const resolved = date instanceof Date ? date : new Date();
  const loggedAt = resolved.toISOString();
  return {
    loggedAt,
    loggedDate: loggedAt.split('T')[0],
  };
}

async function getOrCreateMealLog(
  userId: string,
  mealSlot: MealSlot,
  date?: Date | string,
  notes?: string | null,
) {
  const { loggedAt, loggedDate } = getLogDateInfo(date);

  const { data: existingMealLog, error: existingMealLogError } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('meal_slot', mealSlot)
    .gte('logged_at', `${loggedDate}T00:00:00`)
    .lte('logged_at', `${loggedDate}T23:59:59`)
    .maybeSingle();

  if (existingMealLogError) {
    console.error('Error loading meal log:', existingMealLogError);
    throw new Error('Failed to load meal log');
  }

  if (existingMealLog) {
    return existingMealLog;
  }

  const { data: newMealLog, error: mealLogError } = await supabase
    .from('meal_logs')
    .insert({
      user_id: userId,
      meal_slot: mealSlot,
      logged_at: loggedAt,
      ...(notes ? { notes } : {}),
    })
    .select()
    .single();

  if (mealLogError || !newMealLog) {
    console.error('Error creating meal log:', mealLogError);
    throw new Error('Failed to create meal log');
  }

  return newMealLog;
}

async function insertMealLogItems(
  mealLogId: string,
  items: MealLogInsertItem[],
) {
  const { data, error } = await supabase
    .from('meal_log_items')
    .insert(
      items.map((item) => ({
        meal_log_id: mealLogId,
        food_item_id: item.foodItemId,
        grams: item.grams,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
    )
    .select();

  if (error || !data) {
    console.error('Error creating meal log items:', error);
    throw new Error('Failed to log meal items');
  }

  return data;
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

  const mealLog = await getOrCreateMealLog(userId, mealSlot, date);
  const [mealLogItem] = await insertMealLogItems(mealLog.id, [
    {
      foodItemId: foodId,
      grams,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
    },
  ]);

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

export async function logPlannedMeal(
  userId: string,
  input: LogPlannedMealInput,
): Promise<LogPlannedMealResult> {
  let plannedMeal = await getNutritionPlanMeal(input.planMealId);

  if (!plannedMeal) {
    throw new Error('Planned meal not found');
  }

  if (!plannedMeal.can_direct_log && plannedMeal.mapping_state === 'repairable' && plannedMeal.plan_id) {
    await repairNutritionPlanMappings(plannedMeal.plan_id);
    plannedMeal = await getNutritionPlanMeal(input.planMealId);
  }

  if (!plannedMeal) {
    throw new Error('Planned meal not found');
  }

  const selectedVariant = plannedMeal.selected_variant;
  const loggableItems = (selectedVariant?.items || []).filter((item) => typeof item.grams === 'number' && item.grams > 0);

  if (!selectedVariant || !loggableItems.length) {
    throw new Error('This planned meal can’t be logged directly yet. Add food manually.');
  }

  const mealItems = await Promise.all(
    loggableItems.map(async (item) => {
      if (!item.food_item_id || !item.grams || item.grams <= 0) {
        throw new Error('This planned meal can’t be logged directly yet. Add food manually.');
      }

      const hasStoredMacros = [
        item.calories,
        item.protein,
        item.carbs,
        item.fat,
      ].every((value) => typeof value === 'number' && Number.isFinite(value));

      if (hasStoredMacros) {
        return {
          foodItemId: item.food_item_id,
          grams: item.grams,
          calories: Number(item.calories),
          protein: Number(item.protein),
          carbs: Number(item.carbs),
          fat: Number(item.fat),
        };
      }

      const food = await getFoodById(item.food_item_id);
      if (!food) {
        throw new Error('This planned meal can’t be logged directly yet. Add food manually.');
      }

      const macros = calculateMacros(food, item.grams);
      return {
        foodItemId: item.food_item_id,
        grams: item.grams,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      };
    }),
  );

  const mealLog = await getOrCreateMealLog(
    userId,
    plannedMeal.meal_slot,
    input.date,
    `Planned meal: ${selectedVariant.name || plannedMeal.name}`,
  );

  await insertMealLogItems(mealLog.id, mealItems);

  return {
    mealLogId: mealLog.id,
    mealSlot: plannedMeal.meal_slot,
    loggedItemCount: mealItems.length,
    loggedCalories: Math.round(
      mealItems.reduce((total, item) => total + Number(item.calories || 0), 0),
    ),
    planMealId: plannedMeal.id,
    plannedMealName: selectedVariant.name || plannedMeal.name || 'Planned meal',
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

  return mealLogs.map(mapMealLogRecord);
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
  // Use local midnight (T00:00:00) instead of bare date string which creates UTC midnight
  const dateObj = new Date(`${date}T00:00:00`);
  return getDailyNutritionTotal(userId, dateObj);
}

/**
 * Get daily meals (hook-compatible version)
 * @param userId - User ID
 * @param date - Date string in YYYY-MM-DD format
 */
export async function getDailyMeals(userId: string, date: string): Promise<MealLog[]> {
  // Use local midnight (T00:00:00) instead of bare date string which creates UTC midnight
  const dateObj = new Date(`${date}T00:00:00`);
  return getMealsForDay(userId, dateObj);
}

export async function getMealLogById(mealLogId: string): Promise<MealLog | null> {
  const { data, error } = await supabase
    .from('meal_logs')
    .select(`
      *,
      items:meal_log_items(
        *,
        food:food_items(*)
      )
    `)
    .eq('id', mealLogId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching meal log by id:', error);
    return null;
  }

  return data ? mapMealLogRecord(data) : null;
}

export async function getLoggedMealDetail(
  userId: string,
  date: string,
  mealSlot: MealSlot,
): Promise<MealLog | null> {
  const meals = await getDailyMeals(userId, date);
  return meals.find((meal) => meal.mealSlot === mealSlot) || null;
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
