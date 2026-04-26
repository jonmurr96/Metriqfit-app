import type {
  BillingPeriod,
  SubscriptionPlanType,
  SubscriptionTier,
} from '../lib/subscription/plans';

export type RevenueCatPeriod = BillingPeriod;

export interface RevenueCatPackageSummary {
  id: SubscriptionPlanType;
  identifier: string;
  product_id: string;
  price: number;
  price_string: string;
  period: RevenueCatPeriod;
  trial_days: number | null;
  tier: SubscriptionTier;
  tagline?: string;
  badge?: string;
  nativePackage: any;
}

export interface RevenueCatEntitlementSnapshot {
  tier: SubscriptionTier;
  isPremium: boolean;
  isElite: boolean;
  isTrialing: boolean;
  expiresAt?: string;
  trialEndsAt?: string;
  activeProductId?: string;
  activeEntitlementId?: string;
  customerId?: string;
}

export function isRevenueCatSdkAvailable() {
  return false;
}

export async function configureRevenueCat(): Promise<{ ok: boolean; reason?: string }> {
  return {
    ok: false,
    reason: 'RevenueCat native SDK is unavailable on web.',
  };
}

export async function getRevenueCatPackages(): Promise<RevenueCatPackageSummary[]> {
  return [];
}

export async function purchaseRevenueCatPackage(): Promise<{
  ok: boolean;
  cancelled?: boolean;
  snapshot?: RevenueCatEntitlementSnapshot;
  reason?: string;
}> {
  return {
    ok: false,
    reason: 'RevenueCat native purchases are unavailable on web.',
  };
}

export async function restoreRevenueCatPurchases(): Promise<{
  ok: boolean;
  snapshot?: RevenueCatEntitlementSnapshot;
  reason?: string;
}> {
  return {
    ok: false,
    reason: 'RevenueCat native purchases are unavailable on web.',
  };
}

export async function getRevenueCatEntitlementSnapshot(): Promise<RevenueCatEntitlementSnapshot> {
  return {
    tier: 'free',
    isPremium: false,
    isElite: false,
    isTrialing: false,
  };
}

export type RevenueCatCustomerInfoListener = (snapshot: RevenueCatEntitlementSnapshot) => void;

export function addRevenueCatCustomerInfoUpdateListener(
  _listener: RevenueCatCustomerInfoListener,
): () => void {
  return () => {};
}

export async function logoutRevenueCat(): Promise<void> {}
