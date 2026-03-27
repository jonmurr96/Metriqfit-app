export type SubscriptionTier = 'free' | 'premium' | 'elite';

export type SubscriptionPlanType =
  | 'free'
  | 'premium_monthly'
  | 'premium_annual'
  | 'elite_monthly'
  | 'elite_annual'
  | 'elite_lifetime';

export type SubscriptionStatus =
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'trial'
  | 'grace_period';

export type BillingPeriod = 'weekly' | 'monthly' | 'annual' | 'lifetime';

export type FeatureGateKey =
  | 'food_photo_scan'
  | 'barcode_scan'
  | 'unlimited_ai'
  | 'advanced_analytics'
  | 'recipe_url_import'
  | 'menu_scan'
  | 'grocery_pantry_builder'
  | 'grocery_planner'
  | 'pantry'
  | 'prep_auto_adjust'
  | 'unlimited_history';

export type LimitedFeatureKey =
  | 'ai_messages'
  | 'food_scans'
  | 'plan_regenerations';

export interface TierLimitConfig {
  free: number;
  premium: number;
  elite: number;
}

export interface SubscriptionPackageConfig {
  id: SubscriptionPlanType;
  identifier: string;
  productId: string;
  tier: SubscriptionTier;
  period: BillingPeriod;
  price: number;
  priceString: string;
  trialDays: number | null;
  badge?: string;
  tagline?: string;
}

export interface TrialConfig {
  has_trial: boolean;
  trial_days: number;
  trial_available_on_monthly: boolean;
  trial_available_on_annual: boolean;
}

const FEATURE_ACCESS_MATRIX: Record<FeatureGateKey, SubscriptionTier> = {
  food_photo_scan: 'free',
  barcode_scan: 'premium',
  unlimited_ai: 'elite',
  advanced_analytics: 'premium',
  recipe_url_import: 'elite',
  menu_scan: 'elite',
  grocery_pantry_builder: 'elite',
  grocery_planner: 'elite',
  pantry: 'elite',
  prep_auto_adjust: 'elite',
  unlimited_history: 'premium',
};

const FEATURE_LIMITS: Record<LimitedFeatureKey, TierLimitConfig> = {
  ai_messages: {
    free: 5,
    premium: 25,
    elite: Number.POSITIVE_INFINITY,
  },
  food_scans: {
    free: 3,
    premium: 15,
    elite: Number.POSITIVE_INFINITY,
  },
  plan_regenerations: {
    free: 1,
    premium: 5,
    elite: Number.POSITIVE_INFINITY,
  },
};

export const SUBSCRIPTION_PACKAGES: SubscriptionPackageConfig[] = [
  {
    id: 'premium_monthly',
    identifier: '$rc_premium_monthly',
    productId: 'com.metriqfit.premium.monthly',
    tier: 'premium',
    period: 'monthly',
    price: 9.99,
    priceString: '$9.99/month',
    trialDays: null,
    tagline: 'More power, deeper analytics, higher daily limits',
  },
  {
    id: 'premium_annual',
    identifier: '$rc_premium_annual',
    productId: 'com.metriqfit.premium.annual',
    tier: 'premium',
    period: 'annual',
    price: 69.99,
    priceString: '$69.99/year',
    trialDays: null,
    badge: 'Best value for consistent tracking',
    tagline: 'More power, deeper analytics, higher daily limits',
  },
  {
    id: 'elite_monthly',
    identifier: '$rc_elite_monthly',
    productId: 'com.metriqfit.elite.monthly',
    tier: 'elite',
    period: 'monthly',
    price: 19.99,
    priceString: '$19.99/month',
    trialDays: 7,
    tagline: 'Unlimited AI coaching, automation, and smart nutrition tools',
  },
  {
    id: 'elite_annual',
    identifier: '$rc_elite_annual',
    productId: 'com.metriqfit.elite.annual',
    tier: 'elite',
    period: 'annual',
    price: 129.99,
    priceString: '$129.99/year',
    trialDays: 7,
    badge: 'Best value for daily AI coaching',
    tagline: 'Unlimited AI coaching, automation, and smart nutrition tools',
  },
];

export const DEFAULT_TRIAL_CONFIG: Record<SubscriptionTier, TrialConfig> = {
  free: {
    has_trial: false,
    trial_days: 0,
    trial_available_on_monthly: false,
    trial_available_on_annual: false,
  },
  premium: {
    has_trial: false,
    trial_days: 0,
    trial_available_on_monthly: false,
    trial_available_on_annual: false,
  },
  elite: {
    has_trial: true,
    trial_days: 7,
    trial_available_on_monthly: true,
    trial_available_on_annual: true,
  },
};

export function getSubscriptionTier(planType: SubscriptionPlanType | null | undefined): SubscriptionTier {
  if (!planType || planType === 'free') return 'free';
  if (planType.startsWith('premium')) return 'premium';
  return 'elite';
}

export function getPlanTypeFromPackageId(packageId: string): SubscriptionPlanType {
  const match = SUBSCRIPTION_PACKAGES.find((pkg) => pkg.id === packageId);
  if (match) return match.id;
  if (packageId.includes('premium')) {
    if (packageId.includes('week')) return 'premium_monthly';
    return packageId.includes('annual') || packageId.includes('year')
      ? 'premium_annual'
      : 'premium_monthly';
  }
  if (packageId.includes('lifetime') || packageId.includes('life')) return 'elite_lifetime';
  if (packageId.includes('week')) return 'elite_monthly';
  if (packageId.includes('annual') || packageId.includes('year')) return 'elite_annual';
  if (packageId.includes('month')) return 'elite_monthly';
  return 'elite_annual';
}

export function inferPlanTypeFromProductId(productId: string | null | undefined): SubscriptionPlanType {
  const normalized = String(productId || '').toLowerCase();
  if (!normalized) return 'elite_annual';
  if (normalized.includes('premium')) {
    if (normalized.includes('week')) return 'premium_monthly';
    return normalized.includes('annual') || normalized.includes('year')
      ? 'premium_annual'
      : 'premium_monthly';
  }
  if (normalized.includes('lifetime') || normalized.includes('life')) return 'elite_lifetime';
  if (normalized.includes('week')) return 'elite_monthly';
  if (normalized.includes('annual') || normalized.includes('year')) return 'elite_annual';
  if (normalized.includes('month')) return 'elite_monthly';
  return 'elite_annual';
}

export function getRequiredTierForFeature(feature: FeatureGateKey): SubscriptionTier {
  return FEATURE_ACCESS_MATRIX[feature];
}

export function hasFeatureAccess(tier: SubscriptionTier, feature: FeatureGateKey): boolean {
  const required = getRequiredTierForFeature(feature);
  if (required === 'free') return true;
  if (required === 'premium') return tier === 'premium' || tier === 'elite';
  return tier === 'elite';
}

export function getFeatureLimit(feature: LimitedFeatureKey, tier: SubscriptionTier): number {
  return FEATURE_LIMITS[feature][tier];
}

export function isUnlimitedLimit(value: number): boolean {
  return !Number.isFinite(value);
}

export function getTierLabel(tier: SubscriptionTier): string {
  if (tier === 'premium') return 'Premium';
  if (tier === 'elite') return 'Elite';
  return 'Free';
}

export function getPlanLabel(planType: SubscriptionPlanType | null | undefined): string {
  const tier = getSubscriptionTier(planType);
  if (planType === 'elite_lifetime') return 'Elite Lifetime';
  if (tier === 'premium') return 'Premium';
  if (tier === 'elite') return 'Elite';
  return 'Free';
}

export function getTierIconName(tier: SubscriptionTier): 'leaf' | 'flash-outline' | 'diamond' {
  if (tier === 'premium') return 'flash-outline';
  if (tier === 'elite') return 'diamond';
  return 'leaf';
}

export function getUpgradeTierForFeature(feature: FeatureGateKey): Exclude<SubscriptionTier, 'free'> {
  const required = getRequiredTierForFeature(feature);
  return required === 'free' ? 'premium' : required;
}

export function getTrialConfigForPlan(planType: SubscriptionPlanType | null | undefined): TrialConfig {
  return DEFAULT_TRIAL_CONFIG[getSubscriptionTier(planType)];
}
