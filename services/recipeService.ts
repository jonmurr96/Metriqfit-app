import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';

export type Recipe = Database['public']['Tables']['recipes']['Row'] & {
    ingredients: (Database['public']['Tables']['recipe_ingredients']['Row'] & {
        food: Database['public']['Tables']['food_items']['Row']
    })[]
};

/**
 * Create a new recipe
 */
export async function createRecipe(
    userId: string,
    name: string,
    instructions: string,
    ingredients: { foodItemId: string; grams: number }[]
) {
    // 1. Create recipe
    const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
            user_id: userId,
            name,
            instructions,
            is_public: false
        })
        .select()
        .single();

    if (recipeError) throw recipeError;
    if (!recipe) throw new Error('Failed to create recipe');

    // 2. Add ingredients
    const ingredientsData = ingredients.map(ing => ({
        recipe_id: recipe.id,
        food_item_id: ing.foodItemId,
        quantity_grams: ing.grams
    }));

    const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsData);

    if (ingredientsError) throw ingredientsError;

    return recipe;
}

/**
 * Get user's recipes
 */
export async function getUserRecipes(userId: string): Promise<Recipe[]> {
    const { data, error } = await supabase
        .from('recipes')
        .select(`
      *,
      ingredients:recipe_ingredients(
        *,
        food:food_items(*)
      )
    `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Recipe[];
}

/**
 * Log a recipe as a meal
 * This calculates total macros based on ingredients and logs as a single meal
 */
export async function logRecipeAsMeal(
    userId: string,
    recipe: Recipe,
    mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    fractionConsumed: number = 1.0 // e.g. 0.5 for half recipe
) {
    const date = new Date().toISOString();
    // We can't batch insert easily into meal_log_items without calculating specific macros per item
    // Or we create a meal log, and insert items corresponding to the recipe ingredients * fraction

    // 1. Create Meal Log
    const { data: mealLog, error: logError } = await supabase
        .from('meal_logs')
        .insert({
            user_id: userId,
            meal_slot: mealSlot,
            logged_at: date,
            notes: `Recipe: ${recipe.name}`
        })
        .select()
        .single();

    if (logError) throw logError;

    // 2. Insert items
    const itemsToLog = recipe.ingredients.map(ing => {
        const amount = ing.quantity_grams * fractionConsumed;
        // Calculate values (simplified, ideally backend trigger or service logic does this)
        const ratio = amount / 100;
        const food = ing.food;

        return {
            meal_log_id: mealLog.id,
            food_item_id: food.id,
            grams: amount,
            calories: food.calories_per_100g * ratio,
            protein: food.protein_per_100g * ratio,
            carbs: food.carbs_per_100g * ratio,
            fat: food.fat_per_100g * ratio
        };
    });

    const { error: itemsError } = await supabase
        .from('meal_log_items')
        .insert(itemsToLog);

    if (itemsError) throw itemsError;

    return mealLog;
}
