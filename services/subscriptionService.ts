/**
 * Subscription Service
 * Handles RevenueCat integration for Free / Premium / Elite subscriptions.
 *
 * Modes:
 * - Mock test mode: disabled for entitlement writes; paid access must be verified server-side.
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
import {
  DEFAULT_TRIAL_CONFIG,
  SUBSCRIPTION_PACKAGES,
  getFeatureLimit as getTierFeatureLimit,
  getPlanLabel,
  getRequiredTierForFeature,
  getSubscriptionTier,
  getTierLabel,
  getTrialConfigForPlan,
  getUpgradeTierForFeature,
  hasFeatureAccess,
  type FeatureGateKey,
  type LimitedFeatureKey,
  type SubscriptionPlanType,
  type SubscriptionStatus,
  type SubscriptionTier,
} from '../lib/subscription/plans';

// Types
export interface Subscription {
  id: string;
  user_id: string;
  revenuecat_customer_id: string | null;
  plan_type: SubscriptionPlanType;
  status: SubscriptionStatus;
  started_at: string | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  legacy_plan_type?: SubscriptionPlanType | null;
  grandfathered_into_tier?: Exclude<SubscriptionTier, 'free'> | null;
  grandfathered_until?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPackage {
  id: SubscriptionPlanType;
  identifier: string;
  product_id: string;
  price: number;
  price_string: string;
  period: 'weekly' | 'monthly' | 'annual' | 'lifetime';
  trial_days: number | null;
  tier: SubscriptionTier;
  tagline?: string;
  badge?: string;
}

export interface EntitlementStatus {
  tier: SubscriptionTier;
  planType: SubscriptionPlanType;
  planLabel: string;
  isPremium: boolean;
  isElite: boolean;
  expiresAt?: string;
  isTrialing: boolean;
  trialEndsAt?: string;
  trialConfig: {
    has_trial: boolean;
    trial_days: number;
    trial_available_on_monthly: boolean;
    trial_available_on_annual: boolean;
  };
  grandfatheredIntoTier?: Exclude<SubscriptionTier, 'free'> | null;
  grandfatheredUntil?: string;
}

export interface BillingIntegrationStatus {
  mode:
    | 'test_mock'
    | 'revenuecat_native'
    | 'revenuecat_sandbox'
    | 'revenuecat_test_store'
    | 'revenuecat_unavailable'
    | 'disabled';
  canPurchase: boolean;
  reason: string;
  isReleaseSafe: boolean;
  blockingReason?: string;
}

const FALLBACK_PACKAGES: SubscriptionPackage[] = SUBSCRIPTION_PACKAGES.map((pkg) => ({
  id: pkg.id,
  identifier: pkg.identifier,
  product_id: pkg.productId,
  price: pkg.price,
  price_string: pkg.priceString,
  period: pkg.period,
  trial_days: pkg.trialDays,
  tier: pkg.tier,
  tagline: pkg.tagline,
  badge: pkg.badge,
}));

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function isBillingTestModeEnabled(): boolean {
  return parseBooleanEnv(process.env.EXPO_PUBLIC_BILLING_TEST_MODE, false);
}

function isRevenueCatSandboxEnabled(): boolean {
  return parseBooleanEnv(process.env.EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED, false);
}

function isRevenueCatNativePluginEnabled(): boolean {
  return parseBooleanEnv(process.env.EXPO_PUBLIC_REVENUECAT_NATIVE_PLUGIN_ENABLED, false);
}

function getRevenueCatTestStoreKey(): string | null {
  return process.env.EXPO_PUBLIC_REVENUECAT_TEST_STORE_KEY || null;
}

function isRevenueCatTestStoreEnabled(): boolean {
  return Boolean(getRevenueCatTestStoreKey());
}

export function getRevenueCatEntitlementIdentifier(): string {
  return process.env.EXPO_PUBLIC_REVENUECAT_REQUIRED_ENTITLEMENT_ID || 'Metriqffit Pro';
}

function getAppEnv(): 'local' | 'staging' | 'prod' {
  const raw = String(process.env.EXPO_PUBLIC_APP_ENV || 'local').toLowerCase();
  if (raw === 'prod') return 'prod';
  if (raw === 'staging') return 'staging';
  return 'local';
}

function isProductionBillingEnvironment(): boolean {
  return getAppEnv() === 'prod';
}

function getRevenueCatApiKeyForPlatform(): string | null {
  if (!isProductionBillingEnvironment()) {
    const testStoreKey = getRevenueCatTestStoreKey();
    if (testStoreKey) return testStoreKey;
  }

  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || null;
  }
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || null;
  }
  return null;
}

function buildFreeEntitlementStatus(): EntitlementStatus {
  return {
    tier: 'free',
    planType: 'free',
    planLabel: 'Free',
    isPremium: false,
    isElite: false,
    isTrialing: false,
    trialConfig: DEFAULT_TRIAL_CONFIG.free,
  };
}

function resolveGrandfatheredTier(
  subscription: Subscription,
  now: Date,
): Exclude<SubscriptionTier, 'free'> | null {
  if (!subscription.grandfathered_into_tier) return null;
  if (!subscription.grandfathered_until) return subscription.grandfathered_into_tier;

  const grandfatheredUntil = new Date(subscription.grandfathered_until);
  if (!Number.isFinite(grandfatheredUntil.getTime())) return null;
  return grandfatheredUntil > now ? subscription.grandfathered_into_tier : null;
}

function isPaidSubscriptionActive(subscription: Subscription, now: Date, isTrialing: boolean): boolean {
  const planTier = getSubscriptionTier(subscription.plan_type);
  const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;

  return Boolean(
    planTier !== 'free' &&
    (subscription.status === 'active'
      || subscription.status === 'grace_period'
      || isTrialing
      || subscription.plan_type === 'elite_lifetime'
      || (expiresAt && expiresAt > now)),
  );
}

function buildEntitlementFromSubscription(subscription: Subscription | null): EntitlementStatus {
  if (!subscription) return buildFreeEntitlementStatus();

  const now = new Date();
  const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const isTrialing = Boolean(
    subscription.status === 'trial' && trialEndsAt && trialEndsAt > now,
  );
  const isPaidActive = isPaidSubscriptionActive(subscription, now, isTrialing);

  if (!isPaidActive) {
    return {
      ...buildFreeEntitlementStatus(),
      grandfatheredIntoTier: subscription.grandfathered_into_tier ?? undefined,
      grandfatheredUntil: subscription.grandfathered_until ?? undefined,
    };
  }

  const planTier = getSubscriptionTier(subscription.plan_type);
  const grandfatheredTier = resolveGrandfatheredTier(subscription, now);
  const effectiveTier = grandfatheredTier ?? planTier;
  const effectivePlanLabel = grandfatheredTier && grandfatheredTier !== planTier
    ? `${getTierLabel(grandfatheredTier)} (Grandfathered)`
    : getPlanLabel(subscription.plan_type);

  return {
    tier: effectiveTier,
    planType: subscription.plan_type,
    planLabel: effectivePlanLabel,
    isPremium: effectiveTier === 'premium' || effectiveTier === 'elite',
    isElite: effectiveTier === 'elite',
    expiresAt: subscription.expires_at ?? undefined,
    isTrialing,
    trialEndsAt: subscription.trial_ends_at ?? undefined,
    trialConfig: getTrialConfigForPlan(subscription.plan_type),
    grandfatheredIntoTier: subscription.grandfathered_into_tier ?? undefined,
    grandfatheredUntil: subscription.grandfathered_until ?? undefined,
  };
}

async function getEntitlementStatusFromDatabase(userId: string): Promise<EntitlementStatus> {
  const subscription = await getSubscription(userId);
  return buildEntitlementFromSubscription(subscription);
}

async function syncRevenueCatSubscriptionOnServer(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('sync-revenuecat-subscription', {
    body: {
      user_id: userId,
      platform: Platform.OS,
    },
  });

  if (error) throw error;
}

function resolveRevenueCatStatus(): BillingIntegrationStatus {
  if (Platform.OS === 'web') {
    return {
      mode: 'revenuecat_unavailable',
      canPurchase: false,
      reason: 'RevenueCat sandbox mode requires an iOS or Android dev build. Web uses test/mock mode.',
      isReleaseSafe: false,
      blockingReason: isProductionBillingEnvironment()
        ? 'Production billing cannot run on web.'
        : undefined,
    };
  }

  if (!isRevenueCatNativePluginEnabled()) {
    return {
      mode: 'disabled',
      canPurchase: false,
      reason: 'RevenueCat native plugin is disabled for this build.',
      isReleaseSafe: false,
      blockingReason: 'Enable EXPO_PUBLIC_REVENUECAT_NATIVE_PLUGIN_ENABLED for native billing.',
    };
  }

  if (!isRevenueCatSdkAvailable()) {
    return {
      mode: 'revenuecat_unavailable',
      canPurchase: false,
      reason: 'RevenueCat SDK is not available in this build.',
      isReleaseSafe: false,
      blockingReason: 'RevenueCat SDK is unavailable in this native build.',
    };
  }

  if (isProductionBillingEnvironment() && isRevenueCatTestStoreEnabled()) {
    return {
      mode: 'revenuecat_unavailable',
      canPurchase: false,
      reason: 'RevenueCat Test Store keys are only valid for local or staging builds.',
      isReleaseSafe: false,
      blockingReason: 'Use platform-specific iOS and Android RevenueCat public SDK keys in production.',
    };
  }

  const key = getRevenueCatApiKeyForPlatform();
  if (!key) {
    return {
      mode: 'revenuecat_unavailable',
      canPurchase: false,
      reason: isProductionBillingEnvironment()
        ? `Missing RevenueCat API key for ${Platform.OS}. Set EXPO_PUBLIC_REVENUECAT_${Platform.OS === 'ios' ? 'IOS' : 'ANDROID'}_KEY.`
        : 'Missing RevenueCat Test Store or platform API key for this native build.',
      isReleaseSafe: false,
      blockingReason: `Missing RevenueCat API key for ${Platform.OS}.`,
    };
  }

  return {
    mode: isRevenueCatTestStoreEnabled()
      ? 'revenuecat_test_store'
      : isRevenueCatSandboxEnabled()
        ? 'revenuecat_sandbox'
        : 'revenuecat_native',
    canPurchase: true,
    reason: isRevenueCatTestStoreEnabled()
      ? 'RevenueCat Test Store mode enabled. Purchases use RevenueCat test products in this dev build.'
      : isRevenueCatSandboxEnabled()
        ? 'RevenueCat sandbox mode enabled. Purchases use App Store / Play sandbox.'
        : 'RevenueCat native billing is enabled for this build.',
    isReleaseSafe: true,
  };
}

function shouldUseRevenueCatNative(): boolean {
  if (isBillingTestModeEnabled()) return false;
  return isProductionBillingEnvironment() || isRevenueCatSandboxEnabled() || isRevenueCatTestStoreEnabled();
}

async function syncRevenueCatSnapshotToDatabase(
  userId: string,
  _snapshot: unknown,
): Promise<void> {
  await syncRevenueCatSubscriptionOnServer(userId);
}

/**
 * Sync RevenueCat entitlement snapshot into our subscriptions table.
 * No-op outside native RevenueCat sandbox mode.
 */
export async function syncSubscriptionFromRevenueCat(
  userId: string,
): Promise<EntitlementStatus | null> {
  const useRevenueCat = shouldUseRevenueCatNative();
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

  return getEntitlementStatusFromDatabase(userId);
}

/**
 * Surface billing mode + readiness for UI.
 */
export function getBillingIntegrationStatus(): BillingIntegrationStatus {
  if (isProductionBillingEnvironment() && isBillingTestModeEnabled()) {
    return {
      mode: 'test_mock',
      canPurchase: false,
      reason: 'Mock billing is enabled, which is blocked for production builds.',
      isReleaseSafe: false,
      blockingReason: 'Disable EXPO_PUBLIC_BILLING_TEST_MODE before App Store release.',
    };
  }

  if (isBillingTestModeEnabled()) {
    return {
      mode: 'test_mock',
      canPurchase: false,
      reason: 'Mock billing cannot grant entitlements. Use RevenueCat sandbox/Test Store or a verified server webhook.',
      isReleaseSafe: !isProductionBillingEnvironment(),
    };
  }

  if (shouldUseRevenueCatNative()) {
    return resolveRevenueCatStatus();
  }

  return {
    mode: 'disabled',
    canPurchase: false,
    reason: isProductionBillingEnvironment()
      ? 'Billing is not configured for production. Enable native RevenueCat with platform keys.'
      : 'Billing is disabled in this build. Enable EXPO_PUBLIC_BILLING_TEST_MODE, EXPO_PUBLIC_REVENUECAT_TEST_STORE_KEY, or RevenueCat sandbox/native billing.',
    isReleaseSafe: !isProductionBillingEnvironment(),
    blockingReason: isProductionBillingEnvironment()
      ? 'Production billing requires RevenueCat native plugin plus platform API keys.'
      : undefined,
  };
}

/**
 * Initialize RevenueCat SDK
 * Call this on app startup or when auth user changes.
 */
export async function initializeRevenueCat(userId: string): Promise<void> {
  if (!userId) return;
  if (!shouldUseRevenueCatNative()) return;

  const status = resolveRevenueCatStatus();
  if (!status.canPurchase) {
    if (isProductionBillingEnvironment()) {
      console.warn('[RevenueCat] Initialization skipped:', status.reason);
    }
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
 * Check current subscription entitlement state.
 */
export async function checkEntitlementStatus(userId: string): Promise<EntitlementStatus> {
  const useRevenueCat = shouldUseRevenueCatNative();

  if (useRevenueCat) {
    try {
      const synced = await syncSubscriptionFromRevenueCat(userId);
      if (synced) return synced;
    } catch (error) {
      console.warn('[RevenueCat] Entitlement fetch/sync failed, falling back to DB:', error);
    }
  }

  return getEntitlementStatusFromDatabase(userId);
}

/**
 * Get available subscription packages.
 * Uses RevenueCat offerings in sandbox mode when available, otherwise falls back.
 */
export async function getAvailablePackages(userId?: string): Promise<SubscriptionPackage[]> {
  const useRevenueCat = shouldUseRevenueCatNative();

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
            tier: pkg.tier,
            tagline: pkg.tagline,
            badge: pkg.badge,
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
  void userId;
  void packageId;
  return {
    success: false,
    error: 'Mock billing cannot grant entitlements. Use RevenueCat sandbox/Test Store or a verified server webhook.',
  };
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

  if (
    billingStatus.mode !== 'revenuecat_sandbox'
    && billingStatus.mode !== 'revenuecat_native'
    && billingStatus.mode !== 'revenuecat_test_store'
  ) {
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
    if (!snapshot || snapshot.tier === 'free') {
      return {
        success: false,
        error: 'Purchase completed, but paid entitlement was not granted.',
      };
    }

    await syncRevenueCatSnapshotToDatabase(userId, snapshot);

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
  void userId;
  // Free access is the default when no verified subscription row exists.
  // The client must not write subscription rows directly.
}

/**
 * Restore purchases (for when user reinstalls or logs in on new device)
 */
export async function restorePurchases(userId: string): Promise<EntitlementStatus> {
  const useRevenueCat = shouldUseRevenueCatNative();

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

    return getEntitlementStatusFromDatabase(userId);
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
 * Resolve the minimum tier needed for a feature.
 */
export function getFeatureRequiredTier(feature: FeatureGateKey): SubscriptionTier {
  return getRequiredTierForFeature(feature);
}

export function getFeatureUpgradeTier(feature: FeatureGateKey): Exclude<SubscriptionTier, 'free'> {
  return getUpgradeTierForFeature(feature);
}

export function isEliteFeature(feature: FeatureGateKey): boolean {
  return getRequiredTierForFeature(feature) === 'elite';
}

export function canAccessFeature(feature: FeatureGateKey, tier: SubscriptionTier): boolean {
  return hasFeatureAccess(tier, feature);
}

/**
 * Get feature limit based on subscription tier
 */
export function getFeatureLimit(
  feature: LimitedFeatureKey,
  tier: SubscriptionTier,
): number {
  return getTierFeatureLimit(feature, tier);
}
