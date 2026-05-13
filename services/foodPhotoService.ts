/**
 * Food Photo Recognition Service
 * Handles AI-powered food recognition from photos using OpenAI Vision API
 */

import { supabase } from '../lib/supabase';
import { invokeFunction } from '../lib/supabase/invokeFunction';
import { File } from 'expo-file-system';
import { getFeatureLimit } from './subscriptionService';
import { getSubscriptionTier, getTierLabel, type SubscriptionTier } from '../lib/subscription/plans';
import { addSentryBreadcrumb, captureSentryIssue, withSentrySpan } from '../lib/sentry';

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
  tier: SubscriptionTier;
  isUnlimited: boolean;
  remainingScans: number;
}

export interface FoodPhotoInput {
  uri: string;
  base64?: string | null;
}

/**
 * Get today's photo scan usage for rate limiting
 */
export async function getPhotoScanUsage(userId: string): Promise<PhotoScanUsage> {
  // Check user subscription status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_type, status, updated_at')
    .eq('user_id', userId)
    .in('status', ['active', 'trial', 'grace_period'])
    .order('updated_at', { ascending: false })
    .maybeSingle();

  const tier = getSubscriptionTier(subscription?.plan_type);
  const scansLimit = getFeatureLimit('food_scans', tier);
  const isUnlimited = !Number.isFinite(scansLimit);

  if (isUnlimited) {
    return {
      scansToday: 0,
      scansLimit: -1, // -1 means unlimited
      tier,
      isUnlimited: true,
      remainingScans: -1,
    };
  }
  const today = new Date().toISOString().split('T')[0];

  const { data: usage, error: usageError } = await supabase
    .from('ai_usage_daily')
    .select('food_photo_scans')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  if (usageError && usageError.code !== 'PGRST116') {
    throw usageError;
  }

  const scansToday = usage?.food_photo_scans || 0;

  return {
    scansToday,
    scansLimit: Number(scansLimit),
    tier,
    isUnlimited: false,
    remainingScans: Math.max(0, scansLimit - scansToday),
  };
}

/**
 * Check if user can scan a photo (rate limit check)
 */
export async function canScanPhoto(userId: string): Promise<boolean> {
  const usage = await getPhotoScanUsage(userId);

  if (usage.isUnlimited) return true;
  return usage.remainingScans > 0;
}

/**
 * Convert image URI to base64 for API submission
 */
async function imageInputToBase64(photo: string | FoodPhotoInput): Promise<string> {
  const uri = typeof photo === 'string' ? photo : photo.uri;
  const inlineBase64 = typeof photo === 'string' ? null : photo.base64;

  if (inlineBase64?.trim()) {
    return stripDataUriPrefix(inlineBase64);
  }

  if (!uri?.trim()) {
    throw new Error('Failed to process image: missing photo URI.');
  }

  try {
    const file = new File(uri);
    if (!file.exists || file.size <= 0) {
      throw new Error('Captured photo file is not readable.');
    }
    return stripDataUriPrefix(await file.base64());
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    throw new Error('Failed to process image. Please retake the photo and try again.');
  }
}

function stripDataUriPrefix(value: string): string {
  return value.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
}

/**
 * Analyze a food photo using AI
 * @param photoUri - Local URI of the captured photo
 * @param userId - User ID for rate limiting
 * @returns FoodPhotoAnalysis with recognized foods
 */
export async function analyzeFoodPhoto(
  photo: string | FoodPhotoInput,
  userId: string
): Promise<FoodPhotoAnalysis> {
  return withSentrySpan('Analyze food photo', 'food.photo.analyze', async () => {
    addSentryBreadcrumb('Food photo scan started', 'nutrition.photo', {
      userId,
    });

    const canScan = await canScanPhoto(userId);
    if (!canScan) {
      const usage = await getPhotoScanUsage(userId);
      const nextTierLabel = usage.tier === 'premium' ? 'Elite' : 'Premium';
      throw new Error(
        `Daily scan limit reached (${usage.scansLimit} scans/day on ${getTierLabel(usage.tier)}). Upgrade to ${nextTierLabel} for ${usage.tier === 'premium' ? 'unlimited scans' : 'more scans'}.`
      );
    }

    const base64Image = await imageInputToBase64(photo);
    if (!base64Image) {
      throw new Error('Failed to process image. Please retake the photo and try again.');
    }

    const { data, parsedError, rawError } = await invokeFunction<FoodPhotoAnalysis>(() =>
      supabase.functions.invoke('analyze-food-photo', {
        body: {
          image: base64Image,
          userId,
        },
      })
    );

    if (rawError) {
      addSentryBreadcrumb('Food photo scan failed', 'nutrition.photo', {
        status: parsedError?.status || rawError?.context?.status || null,
        message: parsedError?.error || parsedError?.message || rawError?.message || null,
      });
      captureSentryIssue(rawError, {
        operation: 'food.photo.analyze',
        status: parsedError?.status || rawError?.context?.status || null,
        userId,
        category: 'backend_failure',
        severity: 'error',
      });
      console.error('AI food photo analysis error:', rawError);
      const message = parsedError?.error || parsedError?.message || rawError?.message || 'Failed to analyze photo. Please try again.';
      throw new Error(message.replace(/^Photo analysis failed \(429\)$/i, 'Photo analysis is temporarily busy. Please wait a few seconds and try again.'));
    }

    if (!data?.foods || !Array.isArray(data.foods)) {
      throw new Error('Photo analysis returned an invalid result. Please try again.');
    }

    addSentryBreadcrumb('Food photo scan completed', 'nutrition.photo', {
      userId,
      foods: data.foods.length,
      totalCalories: data.totalCalories,
    });
    return data as FoodPhotoAnalysis;
  });
}

/**
 * Convert recognized foods to meal log items ready for database insertion
 */
export function convertToMealLogItems(
  analysis: FoodPhotoAnalysis,
  mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): {
  food_name: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_slot: string;
  source: string;
}[] {
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
