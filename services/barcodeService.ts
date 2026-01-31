/**
 * Barcode Scanner Service
 * Handles barcode scanning and food lookup integration
 */

import { supabase } from '../lib/supabase';
import { lookupBarcode, BarcodeLookupFood } from '../lib/Barcode Scan/barcodeLookupClient';

export interface BarcodeScanResult {
  barcode: string;
  food: BarcodeLookupFood | null;
  matchedFoodItem?: {
    id: string;
    name: string;
    brand: string | null;
    calories_per_100g: number;
    protein_per_100g: number;
    carbs_per_100g: number;
    fat_per_100g: number;
  };
  requiresManualEntry: boolean;
}

/**
 * Scan a barcode and lookup food information
 * @param barcode - Scanned barcode string
 * @param userId - User ID for potential caching/history
 * @returns BarcodeScanResult with food data or null if not found
 */
export async function scanBarcode(
  barcode: string,
  userId: string
): Promise<BarcodeScanResult> {
  // First, try to lookup the barcode using the Edge Function
  const lookupResult = await lookupBarcode(barcode);

  if (!lookupResult) {
    // Barcode not found in external APIs
    return {
      barcode,
      food: null,
      requiresManualEntry: true,
    };
  }

  // Try to find a matching food item in our database
  // This could be an existing item that matches the barcode
  const { data: existingFood } = await supabase
    .from('food_items')
    .select('id, name, brand, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
    .eq('barcode', barcode)
    .maybeSingle();

  if (existingFood) {
    return {
      barcode,
      food: lookupResult,
      matchedFoodItem: existingFood,
      requiresManualEntry: false,
    };
  }

  // Check if we need to create a new food item from the barcode data
  if (lookupResult.needs_manual_review) {
    return {
      barcode,
      food: lookupResult,
      requiresManualEntry: true,
    };
  }

  // Auto-create a food item from the barcode data if it's high quality
  try {
    const { data: newFood, error } = await supabase
      .from('food_items')
      .insert({
        name: lookupResult.name || 'Unknown Food',
        brand: lookupResult.brand || null,
        barcode,
        calories_per_100g: lookupResult.kcal_100g || 0,
        protein_per_100g: lookupResult.protein_g_100g || 0,
        carbs_per_100g: lookupResult.carbs_g_100g || 0,
        fat_per_100g: lookupResult.fat_g_100g || 0,
        serving_size_g: 100,
        serving_size_description: '100g',
        category: 'packaged',
        source: lookupResult.source,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create food item from barcode:', error);
      return {
        barcode,
        food: lookupResult,
        requiresManualEntry: true,
      };
    }

    return {
      barcode,
      food: lookupResult,
      matchedFoodItem: newFood,
      requiresManualEntry: false,
    };
  } catch (err) {
    console.error('Error processing barcode scan:', err);
    return {
      barcode,
      food: lookupResult,
      requiresManualEntry: true,
    };
  }
}

/**
 * Save barcode scan to user's scan history
 */
export async function saveBarcodeToHistory(
  userId: string,
  barcode: string,
  foodItemId?: string
): Promise<void> {
  try {
    await supabase.from('barcode_scan_history').insert({
      user_id: userId,
      barcode,
      food_item_id: foodItemId || null,
      scanned_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to save barcode to history:', error);
    // Non-critical, don't throw
  }
}

/**
 * Get user's recent barcode scans
 */
export async function getRecentBarcodeScans(
  userId: string,
  limit: number = 10
): Promise<any[]> {
  const { data, error } = await supabase
    .from('barcode_scan_history')
    .select(`
      *,
      food_item:food_items(*)
    `)
    .eq('user_id', userId)
    .order('scanned_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch barcode history:', error);
    return [];
  }

  return data || [];
}
