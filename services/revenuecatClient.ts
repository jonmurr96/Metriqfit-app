import Purchases from 'react-native-purchases';
import {
  inferPlanTypeFromProductId,
  type BillingPeriod,
  type SubscriptionPlanType,
  type SubscriptionTier,
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

let configuredUserId: string | null = null;
let configuredApiKey: string | null = null;

export function isRevenueCatSdkAvailable() {
  return true;
}

function parseIsoPeriodToDays(period: string | undefined | null): number | null {
  if (!period || typeof period !== 'string') return null;
  const match = /^P(?:(\d+)W)?(?:(\d+)D)?$/i.exec(period.trim());
  if (!match) return null;
  const weeks = Number(match[1] || 0);
  const days = Number(match[2] || 0);
  const total = weeks * 7 + days;
  return total > 0 ? total : null;
}

function parseTrialDays(product: any): number | null {
  const intro = product?.introPrice;
  if (!intro) return null;

  const periodUnits = Number(intro.periodNumberOfUnits || intro.period_number_of_units || 0);
  const unit = String(intro.periodUnit || intro.period_unit || '').toUpperCase();

  if (periodUnits > 0 && unit) {
    if (unit.includes('DAY')) return periodUnits;
    if (unit.includes('WEEK')) return periodUnits * 7;
    if (unit.includes('MONTH')) return periodUnits * 30;
  }

  const fromIso = parseIsoPeriodToDays(intro.subscriptionPeriod || intro.subscription_period);
  if (fromIso) return fromIso;

  return null;
}

function mapPeriodFromPackage(pkg: any): RevenueCatPeriod | null {
  const packageType = String(pkg?.packageType || pkg?.package_type || '').toUpperCase();
  if (packageType.includes('WEEK')) return 'weekly';
  if (packageType.includes('MONTH')) return 'monthly';
  if (packageType.includes('ANNUAL') || packageType.includes('YEAR')) return 'annual';
  if (packageType.includes('LIFETIME')) return 'lifetime';

  const productId = String(pkg?.product?.identifier || pkg?.product?.productIdentifier || '').toLowerCase();
  if (productId.includes('week')) return 'weekly';
  if (productId.includes('month')) return 'monthly';
  if (productId.includes('year') || productId.includes('annual')) return 'annual';
  if (productId.includes('life')) return 'lifetime';

  return null;
}

function normalizePackage(pkg: any): RevenueCatPackageSummary | null {
  const period = mapPeriodFromPackage(pkg);
  if (!period) return null;

  const product = pkg?.product || {};
  const productId = String(product?.identifier || product?.productIdentifier || '').trim();
  const inferredPlanType = inferPlanTypeFromProductId(productId);
  const tier = inferredPlanType.startsWith('premium') ? 'premium' : 'elite';
  const identifier = String(pkg?.identifier || '').trim() || inferredPlanType;
  const price = Number(product?.price || 0);
  const priceString = String(product?.priceString || '').trim();

  return {
    id: inferredPlanType,
    identifier,
    product_id: productId,
    price: Number.isFinite(price) ? price : 0,
    price_string: priceString,
    period,
    trial_days: parseTrialDays(product),
    tier,
    tagline: tier === 'premium'
      ? 'More power, deeper analytics, higher daily limits'
      : 'Unlimited AI coaching, automation, and smart nutrition tools',
    badge: period === 'annual'
      ? tier === 'premium'
        ? 'Best value for consistent tracking'
        : 'Best value for daily AI coaching'
      : undefined,
    nativePackage: pkg,
  };
}

function normalizeEntitlement(customerInfo: any): RevenueCatEntitlementSnapshot {
  const activeEntitlements = customerInfo?.entitlements?.active || {};
  const activeEntries = Object.entries(activeEntitlements);
  const [activeEntitlementId, activeEntitlementRaw] = activeEntries.length
    ? [activeEntries[0][0], activeEntries[0][1] as any]
    : [undefined, undefined];

  const activeSubscriptions: string[] = Array.isArray(customerInfo?.activeSubscriptions)
    ? customerInfo.activeSubscriptions
    : [];

  const activeProductId =
    String(activeEntitlementRaw?.productIdentifier || activeEntitlementRaw?.product_identifier || '')
    || activeSubscriptions[0]
    || undefined;

  const entitlementName = String(activeEntitlementId || '').toLowerCase();
  const planType = activeProductId ? inferPlanTypeFromProductId(activeProductId) : 'free';
  const tier = activeEntries.length > 0
    ? planType.startsWith('premium')
      ? 'premium'
      : entitlementName.includes('premium')
        ? 'premium'
        : 'elite'
    : 'free';
  const hasActiveEntitlement = activeEntries.length > 0;

  const periodType = String(activeEntitlementRaw?.periodType || activeEntitlementRaw?.period_type || '').toUpperCase();
  const isTrialing = periodType.includes('TRIAL') || periodType.includes('INTRO');

  const expiration =
    String(activeEntitlementRaw?.expirationDate || activeEntitlementRaw?.expiration_date || '').trim()
    || undefined;

  return {
    tier,
    isPremium: tier === 'premium' || tier === 'elite',
    isElite: tier === 'elite' && hasActiveEntitlement,
    isTrialing,
    expiresAt: expiration,
    trialEndsAt: isTrialing ? expiration : undefined,
    activeEntitlementId,
    activeProductId,
    customerId: String(customerInfo?.originalAppUserId || customerInfo?.appUserID || '').trim() || undefined,
  };
}

export async function configureRevenueCat(apiKey: string, userId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!apiKey) {
    return { ok: false, reason: 'Missing RevenueCat API key for this platform.' };
  }

  try {
    if (!configuredApiKey || configuredApiKey !== apiKey) {
      await Purchases.configure({
        apiKey,
        appUserID: userId,
      });
      configuredApiKey = apiKey;
      configuredUserId = userId;
      return { ok: true };
    }

    if (typeof Purchases.logIn === 'function' && configuredUserId !== userId) {
      await Purchases.logIn(userId);
      configuredUserId = userId;
      configuredApiKey = apiKey;
    }

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      reason: error?.message || 'Failed to initialize RevenueCat SDK.',
    };
  }
}

export type RevenueCatCustomerInfoListener = (snapshot: RevenueCatEntitlementSnapshot) => void;

export function addRevenueCatCustomerInfoUpdateListener(
  listener: RevenueCatCustomerInfoListener,
): () => void {
  const wrappedListener = (customerInfo: any) => {
    listener(normalizeEntitlement(customerInfo));
  };

  Purchases.addCustomerInfoUpdateListener(wrappedListener);

  return () => {
    Purchases.removeCustomerInfoUpdateListener(wrappedListener);
  };
}

export async function logoutRevenueCat(): Promise<void> {
  try {
    if (typeof Purchases.logOut === 'function' && configuredApiKey) {
      await Purchases.logOut();
    }
  } finally {
    configuredUserId = null;
    configuredApiKey = null;
  }
}

export async function getRevenueCatPackages(): Promise<RevenueCatPackageSummary[]> {
  const offerings = await Purchases.getOfferings();
  const current = offerings?.current;
  if (!current) return [];

  return (current.availablePackages || [])
    .map((pkg: any) => normalizePackage(pkg))
    .filter((pkg): pkg is RevenueCatPackageSummary => Boolean(pkg));
}

export async function purchaseRevenueCatPackage(
  pkg: RevenueCatPackageSummary,
): Promise<{ ok: boolean; cancelled?: boolean; snapshot?: RevenueCatEntitlementSnapshot; reason?: string }> {
  try {
    const result = await Purchases.purchasePackage(pkg.nativePackage);
    const customerInfo = (result as any)?.customerInfo || result;
    return {
      ok: true,
      snapshot: normalizeEntitlement(customerInfo),
    };
  } catch (error: any) {
    if (error?.userCancelled) {
      return { ok: false, cancelled: true, reason: 'Purchase cancelled.' };
    }

    return {
      ok: false,
      reason: error?.message || 'Purchase failed.',
    };
  }
}

export async function restoreRevenueCatPurchases(): Promise<{ ok: boolean; snapshot?: RevenueCatEntitlementSnapshot; reason?: string }> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return {
      ok: true,
      snapshot: normalizeEntitlement(customerInfo),
    };
  } catch (error: any) {
    return {
      ok: false,
      reason: error?.message || 'Restore purchases failed.',
    };
  }
}

export async function getRevenueCatEntitlementSnapshot(): Promise<RevenueCatEntitlementSnapshot> {
  const customerInfo = await Purchases.getCustomerInfo();
  return normalizeEntitlement(customerInfo);
}
