/**
 * Subscription Service
 * Handles RevenueCat integration for Elite tier subscriptions.
 *
 * Modes:
 * - Mock test mode (default): writes subscriptions directly, no billing charge.
 * - RevenueCat sandbox mode (native only): real SDK purchases on iOS/Android sandbox.
 */

import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import {
  configureRevenueCat,
  getRevenueCatEntitlementSnapshot,
  getRevenueCatPackages,
  isRevenueCatSdkAvailable,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from './revenuecatClient';

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

export interface BillingIntegrationStatus {
  mode: 'test_mock' | 'revenuecat_sandbox' | 'revenuecat_unavailable' | 'disabled';
  canPurchase: boolean;
  reason: string;
}

const FALLBACK_PACKAGES: SubscriptionPackage[] = [
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

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function isBillingTestModeEnabled(): boolean {
  return parseBooleanEnv(process.env.EXPO_PUBLIC_BILLING_TEST_MODE, true);
}

function isRevenueCatSandboxEnabled(): boolean {
  return parseBooleanEnv(process.env.EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED, false);
}

function getRevenueCatApiKeyForPlatform(): string | null {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || null;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || null;
  }
  return null;
}

function getPlanTypeFromPackageId(packageId: string): Subscription['plan_type'] {
  if (packageId === 'elite_monthly') return 'elite_monthly';
  if (packageId === 'elite_lifetime') return 'elite_lifetime';
  return 'elite_annual';
}

function inferPlanTypeFromProductId(productId: string | undefined | null): Subscription['plan_type'] {
  const normalized = String(productId || '').toLowerCase();
  if (normalized.includes('lifetime') || normalized.includes('life')) return 'elite_lifetime';
  if (normalized.includes('annual') || normalized.includes('year')) return 'elite_annual';
  if (normalized.includes('month')) return 'elite_monthly';
  return 'elite_monthly';
}

async function upsertSubscriptionRow(userId: string, payload: {
  planType: Subscription['plan_type'];
  status: Subscription['status'];
  expiresAt?: string | null;
  trialEndsAt?: string | null;
  productId?: string | null;
  revenuecatCustomerId?: string | null;
}) {
  const { error } = await (supabase as any).rpc('upsert_subscription', {
    p_user_id: userId,
    p_plan_type: payload.planType,
    p_status: payload.status,
    p_expires_at: payload.expiresAt ?? null,
    p_trial_ends_at: payload.trialEndsAt ?? null,
    p_revenuecat_customer_id: payload.revenuecatCustomerId ?? null,
    p_platform: Platform.OS,
    p_product_id: payload.productId ?? null,
  });

  if (error) throw error;
}

function resolveRevenueCatStatus(): BillingIntegrationStatus {
  if (Platform.OS === 'web') {
    return {
      mode: 'revenuecat_unavailable',
      canPurchase: false,
      reason: 'RevenueCat sandbox mode requires an iOS or Android dev build. Web uses test/mock mode.',
    };
  }

  if (!isRevenueCatSdkAvailable()) {
    return {
      mode: 'revenuecat_unavailable',
      canPurchase: false,
      reason: 'RevenueCat SDK is not available in this build.',
    };
  }

  const key = getRevenueCatApiKeyForPlatform();
  if (!key) {
    return {
      mode: 'revenuecat_unavailable',
      canPurchase: false,
      reason: `Missing RevenueCat API key for ${Platform.OS}. Set EXPO_PUBLIC_REVENUECAT_${Platform.OS === 'ios' ? 'IOS' : 'ANDROID'}_KEY.`,
    };
  }

  return {
    mode: 'revenuecat_sandbox',
    canPurchase: true,
    reason: 'RevenueCat sandbox mode enabled. Purchases use App Store / Play sandbox.',
  };
}

function convertSnapshotToEntitlement(snapshot: {
  isElite: boolean;
  isTrialing: boolean;
  expiresAt?: string;
  trialEndsAt?: string;
}): EntitlementStatus {
  return {
    isElite: snapshot.isElite,
    isTrialing: snapshot.isTrialing,
    expiresAt: snapshot.expiresAt,
    trialEndsAt: snapshot.trialEndsAt,
  };
}

async function syncRevenueCatSnapshotToDatabase(
  userId: string,
  snapshot: {
    isElite: boolean;
    isTrialing: boolean;
    expiresAt?: string;
    trialEndsAt?: string;
    activeProductId?: string;
    customerId?: string;
  },
): Promise<void> {
  if (!snapshot.isElite) {
    await upsertSubscriptionRow(userId, {
      planType: 'free',
      status: 'active',
      expiresAt: null,
      trialEndsAt: null,
      productId: null,
      revenuecatCustomerId: snapshot.customerId || null,
    });
    return;
  }

  await upsertSubscriptionRow(userId, {
    planType: inferPlanTypeFromProductId(snapshot.activeProductId),
    status: snapshot.isTrialing ? 'trial' : 'active',
    expiresAt: snapshot.expiresAt || null,
    trialEndsAt: snapshot.trialEndsAt || null,
    productId: snapshot.activeProductId || null,
    revenuecatCustomerId: snapshot.customerId || null,
  });
}

/**
 * Sync RevenueCat entitlement snapshot into our subscriptions table.
 * No-op outside native RevenueCat sandbox mode.
 */
export async function syncSubscriptionFromRevenueCat(
  userId: string,
): Promise<EntitlementStatus | null> {
  const useRevenueCat = !isBillingTestModeEnabled() && isRevenueCatSandboxEnabled();
  if (!useRevenueCat) return null;

  const status = resolveRevenueCatStatus();
  if (!status.canPurchase) return null;

  const apiKey = getRevenueCatApiKeyForPlatform();
  if (!apiKey) return null;

  const setup = await configureRevenueCat(apiKey, userId);
  if (!setup.ok) {
    throw new Error(setup.reason || 'RevenueCat initialization failed.');
  }

  const snapshot = await getRevenueCatEntitlementSnapshot();
  await syncRevenueCatSnapshotToDatabase(userId, snapshot);

  return convertSnapshotToEntitlement(snapshot);
}

/**
 * Surface billing mode + readiness for UI.
 */
export function getBillingIntegrationStatus(): BillingIntegrationStatus {
  if (isBillingTestModeEnabled()) {
    return {
      mode: 'test_mock',
      canPurchase: true,
      reason: 'Test billing mode is enabled. Elite selection writes subscription state without charging.',
    };
  }

  if (isRevenueCatSandboxEnabled()) {
    return resolveRevenueCatStatus();
  }

  return {
    mode: 'disabled',
    canPurchase: false,
    reason: 'Billing is disabled in this build. Enable EXPO_PUBLIC_BILLING_TEST_MODE or EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED.',
  };
}

/**
 * Initialize RevenueCat SDK
 * Call this on app startup or when auth user changes.
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  if (!userId) return;
  if (isBillingTestModeEnabled()) return;
  if (!isRevenueCatSandboxEnabled()) return;

  const status = resolveRevenueCatStatus();
  if (!status.canPurchase) {
    console.warn('[RevenueCat] Initialization skipped:', status.reason);
    return;
  }

  const apiKey = getRevenueCatApiKeyForPlatform();
  if (!apiKey) return;

  const setup = await configureRevenueCat(apiKey, userId);
  if (!setup.ok) {
    console.warn('[RevenueCat] Initialization failed:', setup.reason);
    return;
  }

  try {
    const snapshot = await getRevenueCatEntitlementSnapshot();
    await syncRevenueCatSnapshotToDatabase(userId, snapshot);
  } catch (error) {
    console.warn('[RevenueCat] Initial entitlement sync failed:', error);
  }
}

/**
 * Get current subscription status from database
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Check if user has Elite entitlement.
 */
export async function checkEntitlementStatus(userId: string): Promise<EntitlementStatus> {
  const useRevenueCat = !isBillingTestModeEnabled() && isRevenueCatSandboxEnabled();

  if (useRevenueCat) {
    try {
      const synced = await syncSubscriptionFromRevenueCat(userId);
      if (synced) return synced;
    } catch (error) {
      console.warn('[RevenueCat] Entitlement fetch/sync failed, falling back to DB:', error);
    }
  }

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

  const isTrialing = Boolean(
    subscription.status === 'trial' && trialEndsAt && trialEndsAt > now,
  );

  const isElite = Boolean(
    subscription.plan_type !== 'free' &&
    (subscription.status === 'active'
      || isTrialing
      || subscription.plan_type === 'elite_lifetime'
      || (expiresAt && expiresAt > now)),
  );

  return {
    isElite,
    expiresAt: subscription.expires_at ?? undefined,
    isTrialing,
    trialEndsAt: subscription.trial_ends_at ?? undefined,
  };
}

/**
 * Get available subscription packages.
 * Uses RevenueCat offerings in sandbox mode when available, otherwise falls back.
 */
export async function getAvailablePackages(userId?: string): Promise<SubscriptionPackage[]> {
  const useRevenueCat = !isBillingTestModeEnabled() && isRevenueCatSandboxEnabled();

  if (useRevenueCat) {
    const status = resolveRevenueCatStatus();
    if (status.canPurchase) {
      try {
        if (userId) {
          const apiKey = getRevenueCatApiKeyForPlatform();
          if (apiKey) {
            const setup = await configureRevenueCat(apiKey, userId);
            if (!setup.ok) {
              console.warn('[RevenueCat] Offering init failed:', setup.reason);
            }
          }
        }

        const offerings = await getRevenueCatPackages();
        if (offerings.length) {
          return offerings.map((pkg) => ({
            id: pkg.id,
            identifier: pkg.identifier,
            product_id: pkg.product_id,
            price: pkg.price,
            price_string: pkg.price_string,
            period: pkg.period,
            trial_days: pkg.trial_days,
          }));
        }
      } catch (error) {
        console.warn('[RevenueCat] Failed loading offerings, using fallback:', error);
      }
    }
  }

  return FALLBACK_PACKAGES;
}

async function purchaseMockPackage(
  userId: string,
  packageId: string,
): Promise<{ success: boolean; error?: string }> {
  const pkg = FALLBACK_PACKAGES.find((candidate) => candidate.id === packageId);
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

  try {
    await upsertSubscriptionRow(userId, {
      planType: getPlanTypeFromPackageId(pkg.id),
      status: pkg.trial_days ? 'trial' : 'active',
      expiresAt,
      trialEndsAt,
      productId: pkg.product_id,
    });

    const entitlement = await checkEntitlementStatus(userId);
    if (!entitlement.isElite) {
      return {
        success: false,
        error: 'Subscription write completed, but elite entitlement could not be confirmed.',
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Purchase failed',
    };
  }
}

/**
 * Purchase a subscription package.
 */
export async function purchasePackage(
  userId: string,
  packageId: string,
): Promise<{ success: boolean; error?: string }> {
  const billingStatus = getBillingIntegrationStatus();

  if (!billingStatus.canPurchase) {
    return { success: false, error: billingStatus.reason };
  }

  if (billingStatus.mode === 'test_mock') {
    return purchaseMockPackage(userId, packageId);
  }

  if (billingStatus.mode !== 'revenuecat_sandbox') {
    return { success: false, error: billingStatus.reason };
  }

  try {
    const apiKey = getRevenueCatApiKeyForPlatform();
    if (!apiKey) {
      return { success: false, error: 'Missing RevenueCat API key for this platform.' };
    }

    const setup = await configureRevenueCat(apiKey, userId);
    if (!setup.ok) {
      return { success: false, error: setup.reason || 'RevenueCat initialization failed.' };
    }

    const offerings = await getRevenueCatPackages();
    const targetPackage = offerings.find((pkg) => pkg.id === packageId);

    if (!targetPackage) {
      return {
        success: false,
        error: 'Selected package is not available in current RevenueCat offering.',
      };
    }

    const purchaseResult = await purchaseRevenueCatPackage(targetPackage);

    if (!purchaseResult.ok) {
      return {
        success: false,
        error: purchaseResult.reason || 'Purchase failed.',
      };
    }

    const snapshot = purchaseResult.snapshot;
    if (!snapshot?.isElite) {
      return {
        success: false,
        error: 'Purchase completed, but elite entitlement was not granted.',
      };
    }

    const resolvedPlanType = snapshot.activeProductId
      ? inferPlanTypeFromProductId(snapshot.activeProductId)
      : getPlanTypeFromPackageId(packageId);

    await upsertSubscriptionRow(userId, {
      planType: resolvedPlanType,
      status: snapshot.isTrialing ? 'trial' : 'active',
      expiresAt: snapshot.expiresAt || null,
      trialEndsAt: snapshot.trialEndsAt || null,
      productId: snapshot.activeProductId || targetPackage.product_id,
      revenuecatCustomerId: snapshot.customerId || null,
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Purchase failed',
    };
  }
}

/**
 * Ensure a user has a free subscription row.
 * Does not overwrite existing paid subscriptions.
 */
export async function ensureFreeSubscription(userId: string): Promise<void> {
  const existing = await getSubscription(userId);
  if (existing) return;

  await upsertSubscriptionRow(userId, {
    planType: 'free',
    status: 'active',
    expiresAt: null,
    trialEndsAt: null,
    productId: null,
  });
}

/**
 * Restore purchases (for when user reinstalls or logs in on new device)
 */
export async function restorePurchases(userId: string): Promise<EntitlementStatus> {
  const useRevenueCat = !isBillingTestModeEnabled() && isRevenueCatSandboxEnabled();

  if (useRevenueCat) {
    const status = resolveRevenueCatStatus();
    if (!status.canPurchase) {
      throw new Error(status.reason);
    }

    const apiKey = getRevenueCatApiKeyForPlatform();
    if (!apiKey) {
      throw new Error('Missing RevenueCat API key for this platform.');
    }

    const setup = await configureRevenueCat(apiKey, userId);
    if (!setup.ok) {
      throw new Error(setup.reason || 'RevenueCat initialization failed.');
    }

    const restored = await restoreRevenueCatPurchases();
    if (!restored.ok || !restored.snapshot) {
      throw new Error(restored.reason || 'Restore purchases failed.');
    }

    const snapshot = restored.snapshot;
    await syncRevenueCatSnapshotToDatabase(userId, snapshot);

    return convertSnapshotToEntitlement(snapshot);
  }

  return checkEntitlementStatus(userId);
}

/**
 * Cancel subscription (directs to app store)
 */
export function getManageSubscriptionUrl(): string {
  if (Platform.OS === 'android') {
    return 'https://play.google.com/store/account/subscriptions';
  }
  return 'https://apps.apple.com/account/subscriptions';
}

/**
 * Check if a feature requires Elite
 */
export function isEliteFeature(
  feature:
    | 'food_photo_scan'
    | 'barcode_scan'
    | 'unlimited_ai'
    | 'advanced_analytics'
    | 'recipe_url_import'
    | 'menu_scan'
    | 'grocery_pantry_builder',
): boolean {
  const eliteFeatures = [
    'food_photo_scan',
    'barcode_scan',
    'unlimited_ai',
    'advanced_analytics',
    'recipe_url_import',
    'menu_scan',
    'grocery_pantry_builder',
  ];
  return eliteFeatures.includes(feature);
}

/**
 * Get feature limit based on subscription tier
 */
export function getFeatureLimit(
  feature: 'ai_messages' | 'plan_regenerations' | 'food_scans',
  isElite: boolean,
): number {
  const limits = {
    ai_messages: { free: 5, elite: Infinity },
    plan_regenerations: { free: 1, elite: 3 },
    food_scans: { free: 3, elite: Infinity },
  };

  return isElite ? limits[feature].elite : limits[feature].free;
}
