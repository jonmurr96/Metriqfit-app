/**
 * Food Photo Recognition Service
 * Handles AI-powered food recognition from photos using OpenAI Vision API
 */

import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';
import * as FileSystem from 'expo-file-system';

export interface RecognizedFood {
  name: string;
  estimatedGrams: number;
  confidence: 'high' | 'medium' | 'low';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodPhotoAnalysis {
  foods: RecognizedFood[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  needsReview: boolean;
  warnings: string[];
}

export interface PhotoScanUsage {
  scansToday: number;
  scansLimit: number;
  isElite: boolean;
  remainingScans: number;
}

/**
 * Get today's photo scan usage for rate limiting
 */
export async function getPhotoScanUsage(userId: string): Promise<PhotoScanUsage> {
  // Check user subscription status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('entitlement_tier')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  const isElite = subscription?.entitlement_tier === 'elite';

  // Elite users have unlimited scans
  if (isElite) {
    return {
      scansToday: 0,
      scansLimit: -1, // -1 means unlimited
      isElite: true,
      remainingScans: -1,
    };
  }

  // Free users: 3 scans per day
  const today = new Date().toISOString().split('T')[0];

  const { data: usage } = await supabase
    .from('ai_usage_daily')
    .select('food_photo_scans')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .single();

  const scansToday = usage?.food_photo_scans || 0;
  const scansLimit = 3;

  return {
    scansToday,
    scansLimit,
    isElite: false,
    remainingScans: Math.max(0, scansLimit - scansToday),
  };
}

/**
 * Check if user can scan a photo (rate limit check)
 */
export async function canScanPhoto(userId: string): Promise<boolean> {
  const usage = await getPhotoScanUsage(userId);

  // Elite users can always scan
  if (usage.isElite) return true;

  // Free users limited to 3/day
  return usage.remainingScans > 0;
}

/**
 * Increment photo scan usage counter
 */
async function incrementPhotoScanUsage(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase.rpc('increment_photo_scan_usage', {
    p_user_id: userId,
    p_date: today,
  });

  if (error) {
    console.error('Failed to increment photo scan usage:', error);
  }
}

/**
 * Convert image URI to base64 for API submission
 */
async function imageUriToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Analyze a food photo using AI
 * @param photoUri - Local URI of the captured photo
 * @param userId - User ID for rate limiting
 * @returns FoodPhotoAnalysis with recognized foods
 */
export async function analyzeFoodPhoto(
  photoUri: string,
  userId: string
): Promise<FoodPhotoAnalysis> {
  // Check rate limit first
  const canScan = await canScanPhoto(userId);
  if (!canScan) {
    const usage = await getPhotoScanUsage(userId);
    throw new Error(
      `Daily scan limit reached (${usage.scansLimit} scans/day for free users). Upgrade to Elite for unlimited scans.`
    );
  }

  // Convert image to base64
  const base64Image = await imageUriToBase64(photoUri);

  // Call Supabase Edge Function for AI analysis
  const { data, error } = await supabase.functions.invoke('analyze-food-photo', {
    body: {
      image: base64Image,
      userId,
    },
  });

  if (error) {
    console.error('AI food photo analysis error:', error);
    throw new Error('Failed to analyze photo. Please try again.');
  }

  // Increment usage counter
  await incrementPhotoScanUsage(userId);

  // Parse and return the analysis
  return data as FoodPhotoAnalysis;
}

/**
 * Convert recognized foods to meal log items ready for database insertion
 */
export function convertToMealLogItems(
  analysis: FoodPhotoAnalysis,
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): Array<{
  food_name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_slot: string;
  source: string;
}> {
  return analysis.foods.map((food) => ({
    food_name: food.name,
    grams: food.estimatedGrams,
    calories: food.calories,
    protein_g: food.protein,
    carbs_g: food.carbs,
    fat_g: food.fat,
    meal_slot: mealSlot,
    source: 'photo_ai',
  }));
}
