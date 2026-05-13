import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Linking, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';
import {
    useBillingStatus,
    useCustomerCenter,
    useHostedPaywall,
    usePaywall,
    usePurchasePackage,
    useSubscriptionUI,
} from '../../hooks/useSubscription';
import { getTierIconName, getTierLabel } from '../../lib/subscription/plans';

export default function SubscriptionScreen() {
    const { c, s, ty, r, shadow } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const {
        tier,
        planLabel,
        isTrialing,
        trialEndsAt,
        expiresAt,
        restore,
        isRestoring,
        grandfatheredIntoTier,
        grandfatheredUntil,
    } = useSubscriptionUI();
    const { premiumMonthlyPackage, premiumAnnualPackage, eliteMonthlyPackage, eliteAnnualPackage } = usePaywall();
    const { data: billingStatus } = useBillingStatus();
    const hostedPaywall = useHostedPaywall();
    const customerCenter = useCustomerCenter();
    const purchasePackage = usePurchasePackage();
    const [billingPeriod, setBillingPeriod] = useState<'annual' | 'monthly'>('annual');

    const renewalLabel = isTrialing && trialEndsAt
        ? `Trial ends ${new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : expiresAt
            ? `Renews ${new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : tier === 'free'
                ? 'No active billing'
                : 'Active subscription';

    const highlightedPackages = useMemo(() => ({
        premium: billingPeriod === 'annual' ? premiumAnnualPackage : premiumMonthlyPackage,
        elite: billingPeriod === 'annual' ? eliteAnnualPackage : eliteMonthlyPackage,
    }), [billingPeriod, eliteAnnualPackage, eliteMonthlyPackage, premiumAnnualPackage, premiumMonthlyPackage]);

    const cards = [
        {
            tierKey: 'free' as const,
            title: 'Free',
            subtitle: 'Start tracking and build momentum',
            price: '$0',
            helper: 'Habit-forming core tracking',
            badge: 'Get started',
            features: ['Calorie, macro, and water tracking', 'Workout and nutrition plan access', '5 AI messages/day · 3 scans/day · 1 plan refresh/day'],
            packageId: null,
        },
        {
            tierKey: 'premium' as const,
            title: 'Premium',
            subtitle: 'More power, deeper analytics, higher daily limits',
            price: highlightedPackages.premium?.price_string || (billingPeriod === 'annual' ? '$69.99/year' : '$9.99/month'),
            helper: billingPeriod === 'annual' ? 'Best value for consistent tracking' : 'Advanced analytics and convenience',
            badge: 'Most practical',
            features: ['Advanced analytics and unlimited history', 'Barcode scan and higher daily limits', '25 AI messages/day · 15 scans/day · 5 plan refresh/day'],
            packageId: highlightedPackages.premium?.id || (billingPeriod === 'annual' ? 'premium_annual' : 'premium_monthly'),
        },
        {
            tierKey: 'elite' as const,
            title: 'Elite',
            subtitle: 'Unlimited AI coaching, automation, and smart nutrition tools',
            price: highlightedPackages.elite?.price_string || (billingPeriod === 'annual' ? '$129.99/year' : '$19.99/month'),
            helper: billingPeriod === 'annual' ? 'Best value for daily AI coaching' : 'AI-first coaching with no limits',
            badge: 'Best for results',
            trialLabel: highlightedPackages.elite?.trial_days ? `${highlightedPackages.elite.trial_days}-day free trial` : '7-day free trial',
            features: ['Unlimited AI coach, scans, and plan regenerations', 'Menu scan, recipe import, and advanced nutrition tools', 'Prep auto-adjust and highest-touch personalization'],
            packageId: highlightedPackages.elite?.id || (billingPeriod === 'annual' ? 'elite_annual' : 'elite_monthly'),
        },
    ];

    const handleManageSubscription = async () => {
        if (!billingStatus?.isReleaseSafe && !billingStatus?.canPurchase) {
            Alert.alert('Billing unavailable', billingStatus?.blockingReason || billingStatus?.reason || 'Billing is not available in this build.');
            return;
        }

        if (
            billingStatus?.mode === 'revenuecat_native'
            || billingStatus?.mode === 'revenuecat_sandbox'
            || billingStatus?.mode === 'revenuecat_test_store'
        ) {
            try {
                await customerCenter.mutateAsync();
                return;
            } catch (error: any) {
                console.warn('[RevenueCat] Customer Center failed, falling back to store URL:', error);
            }
        }

        const url = Platform.OS === 'ios'
            ? 'https://apps.apple.com/account/subscriptions'
            : 'https://play.google.com/store/account/subscriptions';
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
            Linking.openURL(url);
        } else {
            Alert.alert('Subscription Management', 'Please manage your subscription through your device\'s app store settings.');
        }
    };

    const handleRestorePurchases = () => {
        if (!billingStatus?.canPurchase) {
            Alert.alert('Restore unavailable', billingStatus?.reason || 'Purchase restore is not available in this build.');
            return;
        }

        restore(undefined, {
            onSuccess: () => Alert.alert('Success', 'Purchases restored successfully!'),
            onError: (err: any) => Alert.alert('Restore Failed', err?.message || 'Could not restore purchases.'),
        });
    };

    const handleChoosePlan = async (packageId: string | null, selectedTier: 'free' | 'premium' | 'elite') => {
        if (selectedTier === 'free') {
            return;
        }

        if (!packageId) return;
        if (!billingStatus?.canPurchase) {
            Alert.alert('Billing unavailable', billingStatus?.reason || 'Purchases are not available in this build.');
            return;
        }

        if (
            billingStatus.mode === 'revenuecat_native'
            || billingStatus.mode === 'revenuecat_sandbox'
            || billingStatus.mode === 'revenuecat_test_store'
        ) {
            const hostedResult = await hostedPaywall.mutateAsync();
            if (hostedResult.success || hostedResult.notPresented) {
                return;
            }
        }

        const result = await purchasePackage.mutateAsync(packageId);
        if (!result?.success) {
            Alert.alert('Purchase failed', result?.error || 'Purchase could not be completed.');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: c.bg }]}>
            <LinearGradient
                colors={[c.surface, c.bg]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + s.md }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <TabBarIcon name="close" color={c.text} size={24} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                    Membership
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {billingStatus && !billingStatus.isReleaseSafe ? (
                    <View style={[styles.blockerCard, { borderColor: c.warning, backgroundColor: `${c.warning}12` }]}>
                        <Text style={{ color: c.warning, fontFamily: ty.body.familySemibold, fontSize: 15 }}>
                            Billing configuration blocked
                        </Text>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 8, lineHeight: 20 }}>
                            {billingStatus.blockingReason || billingStatus.reason}
                        </Text>
                    </View>
                ) : null}

                <View style={styles.planContainer}>
                    <View style={{ alignItems: 'center', marginBottom: -20, zIndex: 10 }}>
                        <View style={[styles.statusBadge, { backgroundColor: c.primary, ...shadow.glow }]}>
                            <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: 10, letterSpacing: 1 }}>
                                CURRENT PLAN
                            </Text>
                        </View>
                    </View>

                    <LinearGradient
                        colors={[c.primary, 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 0.5 }}
                        style={{ borderRadius: r.lg, padding: 1 }}
                    >
                        <GlassCard intensity="strong" style={{ padding: s.xl }}>
                            <View style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, backgroundColor: 'rgba(34, 211, 238, 0.15)', borderRadius: 60 }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: s.md }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 24 }}>
                                        {planLabel}
                                    </Text>
                                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 14, marginTop: 4 }}>
                                        {renewalLabel}
                                    </Text>
                                    {grandfatheredIntoTier ? (
                                        <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 13, marginTop: 10 }}>
                                            Grandfathered into {getTierLabel(grandfatheredIntoTier)}{grandfatheredUntil ? ` until ${new Date(grandfatheredUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                                        </Text>
                                    ) : null}
                                </View>
                                <TabBarIcon name={getTierIconName(tier)} color={tier === 'free' ? c.textMuted : c.primary} size={30} />
                            </View>
                        </GlassCard>
                    </LinearGradient>
                </View>

                <View style={[styles.billingToggle, { backgroundColor: c.surface2, borderRadius: r.md, marginTop: s.xl }]}>
                    {(['annual', 'monthly'] as const).map((value) => {
                        const active = billingPeriod === value;
                        return (
                            <Pressable
                                key={value}
                                style={[
                                    styles.billingToggleOption,
                                    {
                                        backgroundColor: active ? c.surface : 'transparent',
                                        borderRadius: r.sm,
                                    },
                                ]}
                                onPress={() => setBillingPeriod(value)}
                            >
                                <Text style={{ color: active ? c.text : c.textMuted, fontFamily: ty.body.familySemibold }}>
                                    {value === 'annual' ? 'Annual' : 'Monthly'}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={{ marginTop: s.lg, gap: s.md }}>
                    {cards.map((card) => {
                        const isCurrent = tier === card.tierKey;
                        const isHighlighted = card.tierKey === 'elite';
                        const showTrial = card.tierKey === 'elite';
                        return (
                            <View
                                key={card.tierKey}
                                style={[
                                    styles.tierCardWrap,
                                    {
                                        borderColor: isHighlighted ? c.primary : c.border,
                                        backgroundColor: c.surface,
                                        borderRadius: r.lg,
                                    },
                                ]}
                            >
                                <View style={styles.tierHeaderRow}>
                                    <View style={[styles.tierBadge, { backgroundColor: isHighlighted ? c.primary : c.surface2 }]}>
                                        <Text style={{ color: isHighlighted ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                                            {card.badge}
                                        </Text>
                                    </View>
                                    {showTrial ? (
                                        <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 12 }}>
                                            {card.trialLabel}
                                        </Text>
                                    ) : null}
                                </View>
                                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 24, marginTop: 12 }}>
                                    {card.title}
                                </Text>
                                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 6 }}>
                                    {card.subtitle}
                                </Text>
                                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 28, marginTop: 18 }}>
                                    {card.price}
                                </Text>
                                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>
                                    {card.helper}
                                </Text>
                                <View style={{ marginTop: 18, gap: 10 }}>
                                    {card.features.map((feature) => (
                                        <View key={feature} style={{ flexDirection: 'row', gap: 10 }}>
                                            <TabBarIcon name="checkmark-circle" color={card.tierKey === 'free' ? c.textMuted : c.primary} size={18} />
                                            <Text style={{ color: c.text, fontFamily: ty.body.family, flex: 1 }}>
                                                {feature}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                                <Pressable
                                    style={[
                                        styles.chooseButton,
                                        {
                                            backgroundColor: isCurrent ? c.surface2 : isHighlighted ? c.primary : c.text,
                                            borderRadius: r.md,
                                            opacity: purchasePackage.isPending || hostedPaywall.isPending ? 0.6 : 1,
                                        },
                                    ]}
                                    disabled={purchasePackage.isPending || hostedPaywall.isPending || isCurrent}
                                    onPress={() => handleChoosePlan(card.packageId, card.tierKey)}
                                >
                                    <Text style={{ color: isCurrent ? c.textMuted : isHighlighted ? c.bg : c.bg, fontFamily: ty.body.familySemibold }}>
                                        {isCurrent ? 'Current plan' : card.tierKey === 'elite' && showTrial ? 'Start 7-day trial' : `Choose ${card.title}`}
                                    </Text>
                                </Pressable>
                            </View>
                        );
                    })}
                </View>

                <View style={{ marginTop: s.xl, gap: 16 }}>
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: c.surface2, borderRadius: r.md }]}
                        onPress={handleManageSubscription}
                    >
                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
                            {customerCenter.isPending ? 'Opening Customer Center…' : 'Manage Subscription'}
                        </Text>
                        <TabBarIcon name="open-outline" color={c.textMuted} size={16} />
                    </Pressable>

                    <Pressable
                        style={[styles.actionButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border, borderRadius: r.md, opacity: isRestoring ? 0.6 : 1 }]}
                        onPress={handleRestorePurchases}
                        disabled={isRestoring || !billingStatus?.canPurchase}
                    >
                        {isRestoring ? (
                            <ActivityIndicator color={c.textMuted} size="small" />
                        ) : (
                            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Restore Purchases</Text>
                        )}
                    </Pressable>
                </View>

                <Text style={{ color: c.textSubtle, fontFamily: ty.body.family, fontSize: 12, lineHeight: 18, marginTop: s.lg, marginBottom: s.xl }}>
                    Elite includes a 7-day free trial on monthly and annual billing. After the trial, billing renews automatically at the selected price unless canceled before renewal in your device subscription settings.
                </Text>

            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    headerTitle: {
        fontSize: 18,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    blockerCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    planContainer: {
        marginTop: 10,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 54,
        gap: 8,
    },
    billingToggle: {
        flexDirection: 'row',
        padding: 4,
        gap: 4,
    },
    billingToggleOption: {
        flex: 1,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tierCardWrap: {
        borderWidth: 1,
        padding: 18,
    },
    tierHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    tierBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    chooseButton: {
        height: 48,
        marginTop: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
