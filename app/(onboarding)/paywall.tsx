import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTokens } from '../../lib/theme';
import {
  EliteFeatureGrid,
  FreePlanSummary,
  PlanComparisonHeader,
  PricingFooterActions,
} from '../../components/onboarding/paywall';
import { useProfile } from '../../hooks/useUser';
import { useBillingStatus, useGenerationHistory, usePaywall, usePurchasePackage } from '../../hooks';
import { useAuth } from '../../lib/auth';
import { ensureFreeSubscription } from '../../services/subscriptionService';
import { useSetPricingDecision } from '../../hooks/useOnboardingReview';
import { trackEvent } from '../../lib/analytics';

function packageToTier(packageId: string | null): 'elite_monthly' | 'elite_annual' | 'elite_lifetime' {
  if (packageId === 'elite_monthly') return 'elite_monthly';
  if (packageId === 'elite_lifetime') return 'elite_lifetime';
  return 'elite_annual';
}

function describePackage(packageData: any, fallback: string) {
  if (!packageData) return fallback;
  const raw = String(packageData.price_string || '').trim();
  if (raw) return raw;
  const price = Number(packageData.price || 0);
  if (!price) return fallback;
  if (packageData.period === 'annual') return `$${price.toFixed(2)}/year`;
  if (packageData.period === 'monthly') return `$${price.toFixed(2)}/mo`;
  return `$${price.toFixed(2)}`;
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
  const { monthlyPackage, annualPackage, isLoading } = usePaywall();
  const { data: billingStatus } = useBillingStatus();
  const purchasePackage = usePurchasePackage();
  const setPricingDecision = useSetPricingDecision();

  const [selectedPackageId, setSelectedPackageId] = useState<string>('elite_annual');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const resolvedRunId = routeRunId || generationHistory?.[0]?.id || null;

  useEffect(() => {
    trackEvent('onboarding_pricing_viewed', {
      generation_run_id: resolvedRunId,
    });
  }, [resolvedRunId]);

  useEffect(() => {
    if (annualPackage?.id) {
      setSelectedPackageId(annualPackage.id);
      return;
    }
    if (monthlyPackage?.id) {
      setSelectedPackageId(monthlyPackage.id);
    }
  }, [annualPackage?.id, monthlyPackage?.id]);

  const displayName = `${profile?.first_name || 'MetriqFit'} ${profile?.last_name || ''}`.trim();

  const selectedPackage = useMemo(() => {
    if (selectedPackageId === monthlyPackage?.id) return monthlyPackage;
    if (selectedPackageId === annualPackage?.id) return annualPackage;
    return annualPackage || monthlyPackage || null;
  }, [annualPackage, monthlyPackage, selectedPackageId]);

  const onSelectPackage = (packageId: string) => {
    setSelectedPackageId(packageId);
    setInlineError(null);
    trackEvent('onboarding_pricing_tier_selected', {
      generation_run_id: resolvedRunId,
      package_id: packageId,
    });
  };

  const completeWithFreeTier = async () => {
    if (!user?.id) return;

    try {
      await ensureFreeSubscription(user.id);
      if (resolvedRunId) {
        await setPricingDecision.mutateAsync({ runId: resolvedRunId, tier: 'free' });
      }
      trackEvent('onboarding_free_selected', {
        generation_run_id: resolvedRunId,
      });
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Unable to continue', error?.message || 'Please try again.');
    }
  };

  const handlePurchaseElite = async () => {
    if (!selectedPackageId || !user?.id) return;
    if (billingStatus && !billingStatus.canPurchase) {
      setInlineError(billingStatus.reason);
      return;
    }

    setInlineError(null);
    trackEvent('onboarding_purchase_started', {
      generation_run_id: resolvedRunId,
      package_id: selectedPackageId,
    });

    const result = await purchasePackage.mutateAsync(selectedPackageId);

    if (!result?.success) {
      const message = result?.error || 'Purchase could not be completed.';
      setInlineError(message);
      trackEvent('onboarding_purchase_failed', {
        generation_run_id: resolvedRunId,
        package_id: selectedPackageId,
        reason: message,
      });
      return;
    }

    if (resolvedRunId) {
      await setPricingDecision.mutateAsync({
        runId: resolvedRunId,
        tier: packageToTier(selectedPackageId),
      });
    }

    trackEvent('onboarding_purchase_succeeded', {
      generation_run_id: resolvedRunId,
      package_id: selectedPackageId,
    });

    router.replace('/(tabs)/home');
  };

  const monthly = {
    id: monthlyPackage?.id || 'elite_monthly',
    price: describePackage(monthlyPackage, '$14.99/mo'),
    helper: 'Flexible billing, cancel anytime.',
    trialLabel: monthlyPackage?.trial_days ? `${monthlyPackage.trial_days}-day trial` : undefined,
  };

  const yearly = {
    id: annualPackage?.id || 'elite_annual',
    price: describePackage(annualPackage, '$9.99/mo'),
    helper: annualPackage?.price ? `Billed yearly at $${Number(annualPackage.price).toFixed(2)}` : 'Billed annually, best value.',
    badge: 'Save 30%',
    trialLabel: annualPackage?.trial_days ? `${annualPackage.trial_days}-day trial` : undefined,
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
        <PlanComparisonHeader
          name={displayName}
          subtitle="Plan Comparison"
          onClose={completeWithFreeTier}
        />

        <Text style={[styles.headline, { color: c.text, fontFamily: ty.heading.familySemibold }]}>Choose your</Text>
        <Text style={[styles.headlineAccent, { color: c.primary, fontFamily: ty.heading.familySemibold }]}>training path</Text>

        <Text style={[styles.sectionLabel, { color: c.primary, fontFamily: ty.body.familySemibold }]}>Elite Plan</Text>
        <EliteFeatureGrid
          selectedPackageId={selectedPackageId}
          monthly={monthly}
          yearly={yearly}
          onSelectPackage={onSelectPackage}
        />

        <Text style={[styles.sectionLabelMuted, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>Free Plan</Text>
        <FreePlanSummary />

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

        <PricingFooterActions
          eliteLabel={`Continue with Elite ${selectedPackage ? `(${describePackage(selectedPackage, '')})` : ''}`.trim()}
          onContinueElite={handlePurchaseElite}
          onSelectFree={completeWithFreeTier}
          onRedoOnboarding={() => router.replace('/(onboarding)/identity')}
          isProcessing={purchasePackage.isPending || setPricingDecision.isPending}
        />
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
    textAlign: 'center',
  },
  sectionLabelMuted: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textAlign: 'center',
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
});
