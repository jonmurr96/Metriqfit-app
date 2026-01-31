/**
 * React Query hooks for Subscription Service
 * Handles Elite subscription status and purchases
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  getSubscription,
  checkEntitlementStatus,
  getAvailablePackages,
  purchasePackage,
  restorePurchases,
  isEliteFeature,
  getFeatureLimit,
  type Subscription,
  type SubscriptionPackage,
  type EntitlementStatus,
} from '../services/subscriptionService';

// Query Keys
export const subscriptionKeys = {
  all: ['subscription'] as const,
  status: (userId: string) => [...subscriptionKeys.all, 'status', userId] as const,
  entitlement: (userId: string) => [...subscriptionKeys.all, 'entitlement', userId] as const,
  packages: () => [...subscriptionKeys.all, 'packages'] as const,
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
 * Check Elite entitlement status
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
  return useQuery({
    queryKey: subscriptionKeys.packages(),
    queryFn: getAvailablePackages,
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

/**
 * Hook for checking if user can access a feature
 */
export function useFeatureAccess(feature: 'food_photo_scan' | 'barcode_scan' | 'unlimited_ai' | 'advanced_analytics') {
  const { data: entitlement, isLoading } = useEntitlementStatus();

  const requiresElite = isEliteFeature(feature);
  const hasAccess = !requiresElite || entitlement?.isElite || false;

  return {
    hasAccess,
    requiresElite,
    isElite: entitlement?.isElite || false,
    isLoading,
  };
}

/**
 * Hook for getting feature limits
 */
export function useFeatureLimit(feature: 'ai_messages' | 'plan_regenerations' | 'food_scans') {
  const { data: entitlement, isLoading } = useEntitlementStatus();

  const isElite = entitlement?.isElite || false;
  const limit = getFeatureLimit(feature, isElite);

  return {
    limit,
    isUnlimited: limit === Infinity,
    isElite,
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
    isElite: entitlementQuery.data?.isElite || false,
    isTrialing: entitlementQuery.data?.isTrialing || false,
    trialEndsAt: entitlementQuery.data?.trialEndsAt,
    expiresAt: entitlementQuery.data?.expiresAt,

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

  return {
    shouldShowPaywall: !entitlementQuery.isLoading && !(entitlementQuery.data?.isElite ?? false),
    isLoading: entitlementQuery.isLoading,
    packages: packagesQuery.data || [],
    monthlyPackage: packagesQuery.data?.find((p) => p.period === 'monthly'),
    annualPackage: packagesQuery.data?.find((p) => p.period === 'annual'),
    lifetimePackage: packagesQuery.data?.find((p) => p.period === 'lifetime'),
  };
}
