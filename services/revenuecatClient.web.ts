export type RevenueCatPeriod = 'monthly' | 'annual' | 'lifetime';

export interface RevenueCatPackageSummary {
  id: 'elite_monthly' | 'elite_annual' | 'elite_lifetime';
  identifier: string;
  product_id: string;
  price: number;
  price_string: string;
  period: RevenueCatPeriod;
  trial_days: number | null;
  nativePackage: any;
}

export interface RevenueCatEntitlementSnapshot {
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
    isElite: false,
    isTrialing: false,
  };
}
