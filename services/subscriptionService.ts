/**
 * Subscription Service
 * Handles RevenueCat integration for Elite tier subscriptions
 */

import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';

// Note: In a real implementation, you would import from react-native-purchases
// import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';

// Types
export interface Subscription {
  id: string;
  user_id: string;
  revenuecat_customer_id: string | null;
  plan_type: 'free' | 'elite_monthly' | 'elite_annual' | 'elite_lifetime';
  status: 'active' | 'expired' | 'cancelled' | 'trial' | 'grace_period';
  started_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPackage {
  id: string;
  identifier: string;
  product_id: string;
  price: number;
  price_string: string;
  period: 'monthly' | 'annual' | 'lifetime';
  trial_days: number | null;
}

export interface EntitlementStatus {
  isElite: boolean;
  expiresAt?: string;
  isTrialing: boolean;
  trialEndsAt?: string;
}

// RevenueCat entitlement identifier
const ELITE_ENTITLEMENT = 'elite';

/**
 * Initialize RevenueCat SDK
 * Call this on app startup
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  // In a real implementation:
  // Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  // await Purchases.logIn(userId);
  console.log('RevenueCat initialized for user:', userId);
}

/**
 * Get current subscription status from database
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Check if user has Elite entitlement
 */
export async function checkEntitlementStatus(userId: string): Promise<EntitlementStatus> {
  const subscription = await getSubscription(userId);

  if (!subscription) {
    return {
      isElite: false,
      isTrialing: false,
    };
  }

  const now = new Date();
  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
  const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;

  // Check if in trial
  const isTrialing = Boolean(
    subscription.status === 'trial' && trialEndsAt && trialEndsAt > now
  );

  // Check if Elite is active
  const isElite = Boolean(
    subscription.plan_type !== 'free' &&
    (subscription.status === 'active' ||
      isTrialing ||
      subscription.plan_type === 'elite_lifetime' ||
      (expiresAt && expiresAt > now))
  );

  return {
    isElite,
    expiresAt: subscription.expires_at ?? undefined,
    isTrialing,
    trialEndsAt: subscription.trial_ends_at ?? undefined,
  };
}

/**
 * Get available subscription packages
 */
export async function getAvailablePackages(): Promise<SubscriptionPackage[]> {
  // In a real implementation, this would call RevenueCat:
  // const offerings = await Purchases.getOfferings();
  // return offerings.current?.availablePackages || [];

  // For now, return static packages
  return [
    {
      id: 'elite_monthly',
      identifier: '$rc_monthly',
      product_id: 'com.metriqfit.elite.monthly',
      price: 9.99,
      price_string: '$9.99/month',
      period: 'monthly',
      trial_days: 7,
    },
    {
      id: 'elite_annual',
      identifier: '$rc_annual',
      product_id: 'com.metriqfit.elite.annual',
      price: 79.99,
      price_string: '$79.99/year',
      period: 'annual',
      trial_days: 7,
    },
    {
      id: 'elite_lifetime',
      identifier: '$rc_lifetime',
      product_id: 'com.metriqfit.elite.lifetime',
      price: 199.99,
      price_string: '$199.99 one-time',
      period: 'lifetime',
      trial_days: null,
    },
  ];
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  userId: string,
  packageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // In a real implementation:
    // const { customerInfo } = await Purchases.purchasePackage(package);
    // Check if entitlement was granted

    // For now, create subscription in database (would be done by webhook in production)
    const packages = await getAvailablePackages();
    const pkg = packages.find((p) => p.id === packageId);

    if (!pkg) {
      return { success: false, error: 'Package not found' };
    }

    let expiresAt: string | undefined;
    if (pkg.period === 'monthly') {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      expiresAt = date.toISOString();
    } else if (pkg.period === 'annual') {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 1);
      expiresAt = date.toISOString();
    }

    let trialEndsAt: string | undefined;
    if (pkg.trial_days) {
      const date = new Date();
      date.setDate(date.getDate() + pkg.trial_days);
      trialEndsAt = date.toISOString();
    }

    const { error } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      plan_type: pkg.id as Subscription['plan_type'],
      status: pkg.trial_days ? 'trial' : 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt ?? null,
      trial_ends_at: trialEndsAt ?? null,
      updated_at: new Date().toISOString(),
    } satisfies Database['public']['Tables']['subscriptions']['Insert']);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Purchase failed',
    };
  }
}

/**
 * Restore purchases (for when user reinstalls or logs in on new device)
 */
export async function restorePurchases(userId: string): Promise<EntitlementStatus> {
  // In a real implementation:
  // const customerInfo = await Purchases.restorePurchases();
  // Sync with database

  return checkEntitlementStatus(userId);
}

/**
 * Cancel subscription (directs to app store)
 */
export function getManageSubscriptionUrl(): string {
  // Platform-specific URLs
  // iOS: https://apps.apple.com/account/subscriptions
  // Android: https://play.google.com/store/account/subscriptions
  return 'https://apps.apple.com/account/subscriptions';
}

/**
 * Check if a feature requires Elite
 */
export function isEliteFeature(
  feature: 'food_photo_scan' | 'barcode_scan' | 'unlimited_ai' | 'advanced_analytics'
): boolean {
  const eliteFeatures = ['food_photo_scan', 'barcode_scan', 'unlimited_ai', 'advanced_analytics'];
  return eliteFeatures.includes(feature);
}

/**
 * Get feature limit based on subscription tier
 */
export function getFeatureLimit(
  feature: 'ai_messages' | 'plan_regenerations' | 'food_scans',
  isElite: boolean
): number {
  const limits = {
    ai_messages: { free: 10, elite: Infinity },
    plan_regenerations: { free: 1, elite: 3 },
    food_scans: { free: 3, elite: Infinity },
  };

  return isElite ? limits[feature].elite : limits[feature].free;
}
