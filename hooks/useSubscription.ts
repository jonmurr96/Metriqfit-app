/**
 * React Query hooks for Subscription Service
 * Handles Free / Premium / Elite subscription status and purchases.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  getSubscription,
  checkEntitlementStatus,
  getAvailablePackages,
  getBillingIntegrationStatus,
  getRevenueCatEntitlementIdentifier,
  purchasePackage,
  restorePurchases,
  syncSubscriptionFromRevenueCat,
  canAccessFeature,
  getFeatureRequiredTier,
  getFeatureUpgradeTier,
  getFeatureLimit,
  type BillingIntegrationStatus,
} from '../services/subscriptionService';
import {
  presentHostedPaywallIfNeeded,
  presentRevenueCatCustomerCenter,
} from '../services/revenuecatUiService';
import type { FeatureGateKey } from '../lib/subscription/plans';

// Query Keys
export const subscriptionKeys = {
  all: ['subscription'] as const,
  status: (userId: string) => [...subscriptionKeys.all, 'status', userId] as const,
  entitlement: (userId: string) => [...subscriptionKeys.all, 'entitlement', userId] as const,
  packages: (userId: string) => [...subscriptionKeys.all, 'packages', userId] as const,
};

/**
 * Get current subscription status
 */
export function useSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: subscriptionKeys.status(user?.id || ''),
    queryFn: () => getSubscription(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check entitlement status
 */
export function useEntitlementStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: subscriptionKeys.entitlement(user?.id || ''),
    queryFn: () => checkEntitlementStatus(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Get available subscription packages
 */
export function useAvailablePackages() {
  const { user } = useAuth();

  return useQuery({
    queryKey: subscriptionKeys.packages(user?.id || ''),
    queryFn: () => getAvailablePackages(user?.id),
    enabled: !!user,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Purchase a subscription package
 */
export function usePurchasePackage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (packageId: string) => purchasePackage(user!.id, packageId),
    onSuccess: () => {
      // Invalidate subscription and entitlement queries
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.status(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.entitlement(user!.id),
      });
    },
  });
}

/**
 * Restore purchases
 */
export function useRestorePurchases() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => restorePurchases(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.status(user!.id),
      });
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.entitlement(user!.id),
      });
    },
  });
}

export function useHostedPaywall() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => presentHostedPaywallIfNeeded(getRevenueCatEntitlementIdentifier()),
    onSuccess: async (outcome) => {
      if (!user?.id) return;

      if (outcome.success) {
        await syncSubscriptionFromRevenueCat(user.id).catch((error) => {
          console.warn('[RevenueCat] Post-paywall sync failed:', error);
        });
      }

      await queryClient.invalidateQueries({
        queryKey: subscriptionKeys.all,
      });
    },
  });
}

export function useCustomerCenter() {
  return useMutation({
    mutationFn: () => presentRevenueCatCustomerCenter(),
  });
}

/**
 * Hook for checking if user can access a feature
 */
export function useFeatureAccess(
  feature: FeatureGateKey,
) {
  const { data: entitlement, isLoading } = useEntitlementStatus();

  const tier = entitlement?.tier || 'free';
  const requiredTier = getFeatureRequiredTier(feature);
  const upgradeTier = getFeatureUpgradeTier(feature);
  const hasAccess = canAccessFeature(feature, tier);

  return {
    hasAccess,
    requiredTier,
    upgradeTier,
    requiresElite: requiredTier === 'elite',
    isPremium: entitlement?.isPremium || false,
    isElite: entitlement?.isElite || false,
    tier,
    isLoading,
  };
}

/**
 * Hook for getting feature limits
 */
export function useFeatureLimit(feature: 'ai_messages' | 'plan_regenerations' | 'food_scans') {
  const { data: entitlement, isLoading } = useEntitlementStatus();

  const tier = entitlement?.tier || 'free';
  const limit = getFeatureLimit(feature, tier);

  return {
    limit,
    isUnlimited: limit === Infinity,
    tier,
    isPremium: entitlement?.isPremium || false,
    isElite: entitlement?.isElite || false,
    isLoading,
  };
}

/**
 * Combined hook for subscription UI
 */
export function useSubscriptionUI() {
  const subscriptionQuery = useSubscription();
  const entitlementQuery = useEntitlementStatus();
  const packagesQuery = useAvailablePackages();
  const purchaseMutation = usePurchasePackage();
  const restoreMutation = useRestorePurchases();

  return {
    // Data
    subscription: subscriptionQuery.data,
    entitlement: entitlementQuery.data,
    packages: packagesQuery.data || [],

    // Loading states
    isLoading: subscriptionQuery.isLoading || entitlementQuery.isLoading,
    isLoadingPackages: packagesQuery.isLoading,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,

    // Computed
    tier: entitlementQuery.data?.tier || 'free',
    planType: entitlementQuery.data?.planType || 'free',
    planLabel: entitlementQuery.data?.planLabel || 'Free',
    isPremium: entitlementQuery.data?.isPremium || false,
    isElite: entitlementQuery.data?.isElite || false,
    isTrialing: entitlementQuery.data?.isTrialing || false,
    trialEndsAt: entitlementQuery.data?.trialEndsAt,
    expiresAt: entitlementQuery.data?.expiresAt,
    trialConfig: entitlementQuery.data?.trialConfig,
    grandfatheredIntoTier: entitlementQuery.data?.grandfatheredIntoTier,
    grandfatheredUntil: entitlementQuery.data?.grandfatheredUntil,

    // Actions
    purchase: purchaseMutation.mutate,
    restore: restoreMutation.mutate,

    // Errors
    purchaseError: purchaseMutation.error,
    restoreError: restoreMutation.error,
  };
}

/**
 * Hook for paywall logic
 */
export function usePaywall() {
  const entitlementQuery = useEntitlementStatus();
  const packagesQuery = useAvailablePackages();
  const packages = packagesQuery.data || [];

  return {
    shouldShowPaywall: !entitlementQuery.isLoading && (entitlementQuery.data?.tier ?? 'free') === 'free',
    isLoading: entitlementQuery.isLoading,
    packages,
    freeTier: entitlementQuery.data?.tier === 'free',
    premiumMonthlyPackage: packages.find((p) => p.id === 'premium_monthly'),
    premiumAnnualPackage: packages.find((p) => p.id === 'premium_annual'),
    eliteMonthlyPackage: packages.find((p) => p.id === 'elite_monthly'),
    eliteAnnualPackage: packages.find((p) => p.id === 'elite_annual'),
  };
}

export function useBillingStatus() {
  return useQuery<BillingIntegrationStatus>({
    queryKey: [...subscriptionKeys.all, 'billing-status'],
    queryFn: async () => getBillingIntegrationStatus(),
    staleTime: 60 * 1000,
  });
}
