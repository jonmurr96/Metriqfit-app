import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTokens } from '../../lib/theme';
import { useProfile } from '../../hooks/useUser';
import {
  useBillingStatus,
  useGenerationHistory,
  useHostedPaywall,
  usePaywall,
  usePurchasePackage,
  useRestorePurchases,
} from '../../hooks';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import {
  checkEntitlementStatus,
  ensureFreeSubscription,
} from '../../services/subscriptionService';
import { useSetPricingDecision } from '../../hooks/useOnboardingReview';
import { trackEvent } from '../../lib/analytics';

type BillingPeriod = 'annual' | 'monthly';
type PricingDecision = 'free' | 'premium_monthly' | 'premium_annual' | 'elite_monthly' | 'elite_annual';

function toPricingDecision(planType: string | undefined, fallback: PricingDecision): PricingDecision {
  switch (planType) {
    case 'premium_monthly':
    case 'premium_annual':
    case 'elite_monthly':
    case 'elite_annual':
      return planType;
    default:
      return fallback;
  }
}

export default function PaywallScreen() {
  const { c, s, ty } = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ runId?: string }>();
  const routeRunId = typeof params.runId === 'string' ? params.runId : null;

  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: generationHistory } = useGenerationHistory();
  const {
    premiumMonthlyPackage,
    premiumAnnualPackage,
    eliteMonthlyPackage,
    eliteAnnualPackage,
    isLoading,
  } = usePaywall();
  const { data: billingStatus } = useBillingStatus();
  const hostedPaywall = useHostedPaywall();
  const purchasePackage = usePurchasePackage();
  const restorePurchases = useRestorePurchases();
  const setPricingDecision = useSetPricingDecision();

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const [selectedTier, setSelectedTier] = useState<'premium' | 'elite'>('elite');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const resolvedRunId = routeRunId || generationHistory?.[0]?.id || null;

  useEffect(() => {
    trackEvent('onboarding_pricing_viewed', {
      generation_run_id: resolvedRunId,
    });
  }, [resolvedRunId]);

  const displayName = `${profile?.first_name || 'MetriqFit'} ${profile?.last_name || ''}`.trim();

  const selectedPackage = useMemo(() => {
    if (selectedTier === 'premium') {
      return billingPeriod === 'annual' ? premiumAnnualPackage : premiumMonthlyPackage;
    }
    return billingPeriod === 'annual' ? eliteAnnualPackage : eliteMonthlyPackage;
  }, [billingPeriod, eliteAnnualPackage, eliteMonthlyPackage, premiumAnnualPackage, premiumMonthlyPackage, selectedTier]);

  const pricingCards = [
    {
      tier: 'free' as const,
      title: 'Free',
      subtitle: 'Start tracking and build momentum',
      badge: 'Get started',
      price: '$0',
      helper: 'Habit-forming core tracking',
      features: ['Calorie, macro, and water tracking', 'Workout and nutrition plan access', '5 AI messages/day · 3 scans/day · 1 plan refresh/day'],
      packageId: null,
    },
    {
      tier: 'premium' as const,
      title: 'Premium',
      subtitle: 'More power, deeper analytics, higher daily limits',
      badge: 'Most practical',
      price: billingPeriod === 'annual'
        ? (premiumAnnualPackage?.price_string || '$69.99/year')
        : (premiumMonthlyPackage?.price_string || '$9.99/month'),
      helper: billingPeriod === 'annual' ? 'Best value for consistent tracking' : 'Mainstream paid utility pricing',
      features: ['Advanced analytics and unlimited history', 'Barcode scan and higher daily limits', '25 AI messages/day · 15 scans/day · 5 plan refresh/day'],
      packageId: billingPeriod === 'annual'
        ? (premiumAnnualPackage?.id || 'premium_annual')
        : (premiumMonthlyPackage?.id || 'premium_monthly'),
    },
    {
      tier: 'elite' as const,
      title: 'Elite',
      subtitle: 'Unlimited AI coaching, automation, and smart nutrition tools',
      badge: 'Best for results',
      price: billingPeriod === 'annual'
        ? (eliteAnnualPackage?.price_string || '$129.99/year')
        : (eliteMonthlyPackage?.price_string || '$19.99/month'),
      helper: billingPeriod === 'annual' ? 'Best value for daily AI coaching' : 'AI-first, coaching-first, no limits',
      trialLabel: '7-day free trial',
      features: ['Unlimited AI coach, scans, and plan regenerations', 'Menu scan, recipe import, grocery planner, pantry', 'Prep auto-adjust and highest-touch personalization'],
      packageId: billingPeriod === 'annual'
        ? (eliteAnnualPackage?.id || 'elite_annual')
        : (eliteMonthlyPackage?.id || 'elite_monthly'),
    },
  ];

  const comparisonRows = [
    ['AI Coach messages/day', '5', '25', 'Unlimited'],
    ['Food scans/day', '3', '15', 'Unlimited'],
    ['Plan regenerations/day', '1', '5', 'Unlimited'],
    ['Advanced analytics', 'No', 'Yes', 'Yes'],
    ['Barcode scan', 'No', 'Yes', 'Yes'],
    ['Menu scan', 'No', 'No', 'Yes'],
    ['Recipe import', 'No', 'No', 'Yes'],
    ['Grocery planner', 'No', 'No', 'Yes'],
    ['Pantry', 'No', 'No', 'Yes'],
    ['Prep auto-adjust', 'No', 'No', 'Yes'],
    ['Unlimited history', 'No', 'Yes', 'Yes'],
  ] as const;

  async function markPaywallComplete(userId: string) {
    await supabase
      .from('onboarding_answers')
      .upsert(
        { user_id: userId, paywall_completed_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  }

  const completeWithFreeTier = async () => {
    if (!user?.id) return;

    try {
      await ensureFreeSubscription(user.id);
      if (resolvedRunId) {
        await setPricingDecision.mutateAsync({ runId: resolvedRunId, tier: 'free' });
      }
      await markPaywallComplete(user.id);
      trackEvent('onboarding_free_selected', {
        generation_run_id: resolvedRunId,
      });
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Unable to continue', error?.message || 'Please try again.');
    }
  };

  const handlePurchase = async () => {
    if (!user?.id) return;
    if (billingStatus && !billingStatus.canPurchase) {
      setInlineError(billingStatus.reason);
      return;
    }

    setInlineError(null);
    trackEvent('onboarding_purchase_started', {
      generation_run_id: resolvedRunId,
      package_id: selectedPackage?.id,
      tier: selectedTier,
      billing_period: billingPeriod,
    });

    if (
      billingStatus?.mode === 'revenuecat_native'
      || billingStatus?.mode === 'revenuecat_sandbox'
      || billingStatus?.mode === 'revenuecat_test_store'
    ) {
      const hostedResult = await hostedPaywall.mutateAsync();

      if (hostedResult.cancelled) {
        return;
      }

      const refreshedEntitlement = await checkEntitlementStatus(user.id).catch(() => null);
      const hasPaidAccess = Boolean(refreshedEntitlement?.isPremium || refreshedEntitlement?.isElite);

      if (hostedResult.success || (hostedResult.notPresented && hasPaidAccess)) {
        if (resolvedRunId) {
          await setPricingDecision.mutateAsync({
            runId: resolvedRunId,
            tier: toPricingDecision(
              refreshedEntitlement?.planType,
              (selectedPackage?.id as PricingDecision | undefined) || 'elite_annual',
            ),
          });
        }

        await markPaywallComplete(user.id);
        trackEvent('onboarding_purchase_succeeded', {
          generation_run_id: resolvedRunId,
          package_id: refreshedEntitlement?.planType || selectedPackage?.id,
          tier: refreshedEntitlement?.tier || selectedTier,
          billing_period: billingPeriod,
          paywall_mode: billingStatus.mode,
        });

        router.replace('/(tabs)/home');
        return;
      }

      if (!selectedPackage?.id) {
        const message = 'RevenueCat paywall could not complete a purchase.';
        setInlineError(message);
        trackEvent('onboarding_purchase_failed', {
          generation_run_id: resolvedRunId,
          package_id: selectedPackage?.id,
          reason: message,
        });
        return;
      }
    }

    if (!selectedPackage?.id) return;

    const result = await purchasePackage.mutateAsync(selectedPackage.id);

    if (!result?.success) {
      const message = result?.error || 'Purchase could not be completed.';
      setInlineError(message);
      trackEvent('onboarding_purchase_failed', {
        generation_run_id: resolvedRunId,
        package_id: selectedPackage.id,
        reason: message,
      });
      return;
    }

    if (resolvedRunId) {
      await setPricingDecision.mutateAsync({
        runId: resolvedRunId,
        tier: selectedPackage.id as PricingDecision,
      });
    }

    await markPaywallComplete(user.id);
    trackEvent('onboarding_purchase_succeeded', {
      generation_run_id: resolvedRunId,
      package_id: selectedPackage.id,
      tier: selectedTier,
      billing_period: billingPeriod,
    });

    router.replace('/(tabs)/home');
  };

  const handleRestorePurchases = async () => {
    if (!billingStatus?.canPurchase) {
      Alert.alert('Restore unavailable', billingStatus?.reason || 'Purchase restore is not available in this build.');
      return;
    }

    trackEvent('onboarding_restore_started', {
      generation_run_id: resolvedRunId,
      source: 'onboarding_paywall',
    });

    const result = await restorePurchases.mutateAsync();

    if (!result?.isPremium && !result?.isElite) {
      trackEvent('onboarding_restore_failed', {
        generation_run_id: resolvedRunId,
        source: 'onboarding_paywall',
        reason: 'no_active_purchase_found',
      });
      Alert.alert('No purchases found', 'We could not find an active purchase to restore for this account.');
      return;
    }

    if (user?.id) await markPaywallComplete(user.id);
    trackEvent('onboarding_restore_succeeded', {
      generation_run_id: resolvedRunId,
      source: 'onboarding_paywall',
      tier: result.tier,
      plan_type: result.planType,
      grandfathered_into_tier: result.grandfatheredIntoTier,
    });

    router.replace('/(tabs)/home');
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: c.bg }]}> 
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}> 
      <LinearGradient colors={[c.bg, c.surface]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + s.md,
          paddingHorizontal: s.lg,
          paddingBottom: insets.bottom + s.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.sectionLabel, { color: c.primary, fontFamily: ty.body.familySemibold }]}>Plan Comparison</Text>
            <Text style={[styles.headline, { color: c.text, fontFamily: ty.heading.familySemibold }]}>Choose your</Text>
            <Text style={[styles.headlineAccent, { color: c.primary, fontFamily: ty.heading.familySemibold }]}>training path</Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 10 }}>
              {displayName}, Free builds the habit, Premium expands the system, and Elite removes the limits.
            </Text>
          </View>
          <Pressable onPress={completeWithFreeTier} style={[styles.closeButton, { backgroundColor: c.surface2 }]}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold }}>Skip</Text>
          </Pressable>
        </View>

        <View style={[styles.billingToggle, { backgroundColor: c.surface2 }]}>
          {(['annual', 'monthly'] as const).map((value) => {
            const active = billingPeriod === value;
            return (
              <Pressable
                key={value}
                style={[styles.billingToggleOption, { backgroundColor: active ? c.surface : 'transparent' }]}
                onPress={() => setBillingPeriod(value)}
              >
                <Text style={{ color: active ? c.text : c.textMuted, fontFamily: ty.body.familySemibold }}>
                  {value === 'annual' ? 'Annual' : 'Monthly'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ gap: s.md, marginTop: s.lg }}>
          {pricingCards.map((card) => {
            const selected = card.tier !== 'free' && selectedTier === card.tier;
            const highlighted = card.tier === 'elite';
            return (
              <Pressable
                key={card.tier}
                style={[
                  styles.planCard,
                  {
                    borderColor: selected ? c.primary : highlighted ? `${c.primary}88` : c.border,
                    backgroundColor: c.surface,
                  },
                ]}
                onPress={() => {
                  if (card.tier === 'free') return;
                  setSelectedTier(card.tier);
                  setInlineError(null);
                  trackEvent('onboarding_pricing_tier_selected', {
                    generation_run_id: resolvedRunId,
                    tier: card.tier,
                    billing_period: billingPeriod,
                    package_id: card.packageId,
                  });
                }}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.cardBadge, { backgroundColor: highlighted ? c.primary : c.surface2 }]}>
                    <Text style={{ color: highlighted ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                      {card.badge}
                    </Text>
                  </View>
                  {card.tier === 'elite' ? (
                    <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 12 }}>
                      {card.trialLabel}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 26, marginTop: 12 }}>
                  {card.title}
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 6 }}>
                  {card.subtitle}
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 30, marginTop: 18 }}>
                  {card.price}
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>
                  {card.helper}
                </Text>
                <View style={{ marginTop: 18, gap: 10 }}>
                  {card.features.map((feature) => (
                    <View key={feature} style={{ flexDirection: 'row', gap: 10 }}>
                      <Text style={{ color: card.tier === 'free' ? c.textMuted : c.primary }}>•</Text>
                      <Text style={{ color: c.text, fontFamily: ty.body.family, flex: 1 }}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.tableWrap, { borderColor: c.border, backgroundColor: c.surface, marginTop: s.xl }]}>
          <View style={[styles.tableHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.tableLabel, { color: c.text, fontFamily: ty.body.familySemibold }]}>Feature</Text>
            <Text style={[styles.tableCellHeader, { color: c.text, fontFamily: ty.body.familySemibold }]}>Free</Text>
            <Text style={[styles.tableCellHeader, { color: c.text, fontFamily: ty.body.familySemibold }]}>Premium</Text>
            <Text style={[styles.tableCellHeader, { color: c.primary, fontFamily: ty.body.familySemibold }]}>Elite</Text>
          </View>
          {comparisonRows.map((row, index) => (
            <View
              key={row[0]}
              style={[
                styles.tableRow,
                {
                  borderBottomWidth: index === comparisonRows.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  borderBottomColor: c.border,
                },
              ]}
            >
              <Text style={[styles.tableLabel, { color: c.textMuted, fontFamily: ty.body.family }]}>{row[0]}</Text>
              <Text style={[styles.tableCell, { color: c.text }]}>{row[1]}</Text>
              <Text style={[styles.tableCell, { color: c.text }]}>{row[2]}</Text>
              <Text style={[styles.tableCell, { color: c.primary, fontFamily: ty.body.familySemibold }]}>{row[3]}</Text>
            </View>
          ))}
        </View>

        {billingStatus ? (
          <View style={[styles.integrationStatusBox, { borderColor: c.border, backgroundColor: c.surface2 }]}> 
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 12 }}>
              {billingStatus.reason}
            </Text>
          </View>
        ) : null}

        {inlineError ? (
          <View style={[styles.errorBox, { borderColor: c.danger, backgroundColor: c.surface }]}> 
            <Text style={{ color: c.danger, fontFamily: ty.body.family }}>{inlineError}</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.primaryButton,
            {
              backgroundColor: c.primary,
              opacity:
                purchasePackage.isPending
                || hostedPaywall.isPending
                || restorePurchases.isPending
                || setPricingDecision.isPending
                  ? 0.7
                  : 1,
            },
          ]}
          onPress={handlePurchase}
          disabled={
            purchasePackage.isPending
            || hostedPaywall.isPending
            || restorePurchases.isPending
            || setPricingDecision.isPending
          }
        >
          <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: 16 }}>
            {billingStatus?.mode === 'revenuecat_native'
              || billingStatus?.mode === 'revenuecat_sandbox'
              || billingStatus?.mode === 'revenuecat_test_store'
              ? 'View Pro plans'
              : selectedTier === 'elite'
                ? `Start Elite trial${selectedPackage ? ` • ${selectedPackage.price_string}` : ''}`
                : `Choose Premium${selectedPackage ? ` • ${selectedPackage.price_string}` : ''}`}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, { borderColor: c.border }]}
          onPress={handleRestorePurchases}
          disabled={
            purchasePackage.isPending
            || hostedPaywall.isPending
            || restorePurchases.isPending
            || setPricingDecision.isPending
          }
        >
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
            {restorePurchases.isPending ? 'Restoring purchases…' : 'Restore Purchases'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondaryButton, { borderColor: c.border }]}
          onPress={completeWithFreeTier}
          disabled={
            purchasePackage.isPending
            || hostedPaywall.isPending
            || restorePurchases.isPending
            || setPricingDecision.isPending
          }
        >
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold }}>Continue with Free</Text>
        </Pressable>

        <Text style={{ color: c.textSubtle, fontFamily: ty.body.family, fontSize: 12, lineHeight: 18, marginTop: s.md }}>
          Elite includes a 7-day free trial on monthly and annual billing. After the trial, your subscription renews automatically at the selected price unless canceled before renewal.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: 42,
    lineHeight: 44,
  },
  headlineAccent: {
    fontSize: 42,
    lineHeight: 44,
    marginBottom: 16,
  },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  errorBox: {
    borderWidth: 1,
    padding: 10,
    marginTop: 12,
  },
  integrationStatusBox: {
    borderWidth: 1,
    padding: 10,
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  closeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  billingToggle: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 14,
  },
  billingToggleOption: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  cardBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableWrap: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tableLabel: {
    flex: 2,
    fontSize: 13,
  },
  tableCellHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 18,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    marginTop: 12,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
