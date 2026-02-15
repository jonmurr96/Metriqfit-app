import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Linking, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';
import { useSubscriptionUI } from '../../hooks/useSubscription';

export default function SubscriptionScreen() {
    const { c, s, ty, r, shadow } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { isElite, expiresAt, restore, isRestoring } = useSubscriptionUI();

    const renewalLabel = expiresAt
        ? `Renews ${new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : isElite ? 'Active' : 'Not subscribed';

    const handleManageSubscription = async () => {
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
        restore(undefined, {
            onSuccess: () => Alert.alert('Success', 'Purchases restored successfully!'),
            onError: (err: any) => Alert.alert('Restore Failed', err?.message || 'Could not restore purchases.'),
        });
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

                {/* Active Plan Card */}
                <View style={styles.planContainer}>
                    <View style={{ alignItems: 'center', marginBottom: -20, zIndex: 10 }}>
                        <View style={[styles.statusBadge, { backgroundColor: c.primary, ...shadow.glow }]}>
                            <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: 10, letterSpacing: 1 }}>
                                {isElite ? 'CURRENTLY ACTIVE' : 'FREE PLAN'}
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
                            {/* Glow Blob */}
                            <View style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, backgroundColor: 'rgba(34, 211, 238, 0.15)', borderRadius: 60 }} />

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: s.lg, marginTop: s.sm }}>
                                <View>
                                    <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 24 }}>
                                        MetriqFit Elite
                                    </Text>
                                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 14, marginTop: 4 }}>
                                        {renewalLabel}
                                    </Text>
                                </View>
                                <TabBarIcon name="diamond" color={c.primary} size={32} />
                            </View>

                            <View style={{ height: 1, backgroundColor: c.border, marginVertical: s.md }} />

                            <View style={{ gap: 12 }}>
                                {[
                                    'Unlimited AI Coaching',
                                    'Advanced Analytics',
                                    'Smart Meal Planning',
                                    'Pro Modules'
                                ].map((feature) => (
                                    <View key={feature} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <TabBarIcon name="checkmark-circle" color={c.primary} size={18} />
                                        <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: 14 }}>
                                            {feature}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </GlassCard>
                    </LinearGradient>
                </View>

                {/* Actions */}
                <View style={{ marginTop: s.xl, gap: 16 }}>
                    <Pressable
                        style={[styles.actionButton, { backgroundColor: c.surface2, borderRadius: r.md }]}
                        onPress={handleManageSubscription}
                    >
                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>Manage Subscription</Text>
                        <TabBarIcon name="open-outline" color={c.textMuted} size={16} />
                    </Pressable>

                    <Pressable
                        style={[styles.actionButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border, borderRadius: r.md, opacity: isRestoring ? 0.6 : 1 }]}
                        onPress={handleRestorePurchases}
                        disabled={isRestoring}
                    >
                        {isRestoring ? (
                            <ActivityIndicator color={c.textMuted} size="small" />
                        ) : (
                            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Restore Purchases</Text>
                        )}
                    </Pressable>
                </View>

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
});
