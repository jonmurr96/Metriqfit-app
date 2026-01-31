import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';

export default function PaywallScreen() {
    const { c, s, ty, r, shadow, glass } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleUnlock = () => {
        // In a real app, trigger purchase flow here
        router.replace('/(tabs)/home');
    };

    const handleBasic = () => {
        router.replace('/(tabs)/home');
    };

    return (
        <View style={[styles.container, { backgroundColor: c.bg }]}>
            <LinearGradient
                colors={[c.bg, '#0a101f']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + s.xxl }}>
                {/* Header Image / Hook */}
                <View style={styles.heroContainer}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80' }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['rgba(5, 5, 16, 0.3)', 'rgba(5, 5, 16, 0.9)', c.bg]}
                        style={StyleSheet.absoluteFill}
                    />

                    <View style={[styles.heroContent, { paddingTop: insets.top + s.xl }]}>
                        <View style={[styles.blueprintBadge, { backgroundColor: 'rgba(34, 211, 238, 0.15)', borderColor: 'rgba(34, 211, 238, 0.3)' }]}>
                            <Text style={[styles.blueprintText, { color: c.primary, fontFamily: ty.heading.familySemibold }]}>
                                BLUEPRINT CREATED
                            </Text>
                        </View>
                        <Text style={[styles.heroTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                            Your Plan is Ready! 🎉
                        </Text>
                        <Text style={[styles.heroSubtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>
                            Break your limits and become the version of yourself you've always imagined.
                        </Text>
                    </View>
                </View>

                <View style={[styles.contentContainer, { marginTop: -40 }]}>

                    {/* ELITE Card (Primary) */}
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 500 }}
                    >
                        {/* Most Popular Badge */}
                        <View style={{ zIndex: 10, alignItems: 'center', marginBottom: -12 }}>
                            <View style={{ backgroundColor: c.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: r.pill, ...shadow.glow }}>
                                <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: 11, letterSpacing: 1 }}>
                                    MOST POPULAR
                                </Text>
                            </View>
                        </View>

                        <LinearGradient
                            colors={[c.primary, 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 0.4 }}
                            style={{ borderRadius: r.lg, padding: 1 }}
                        >
                            <GlassCard
                                intensity="strong"
                                style={{ borderRadius: r.lg, padding: 0, overflow: 'hidden' }}
                            >
                                {/* Glow Blob */}
                                <View style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, backgroundColor: 'rgba(34, 211, 238, 0.15)', borderRadius: 75 }} />

                                <View style={{ padding: s.xl }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: s.lg }}>
                                        <View>
                                            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>
                                                MetriqFit Elite
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                                                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 32 }}>
                                                    $14.99
                                                </Text>
                                                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginLeft: 4 }}>
                                                    /mo
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ backgroundColor: 'rgba(34, 211, 238, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: r.sm, borderColor: 'rgba(34, 211, 238, 0.3)', borderWidth: 1 }}>
                                            <Text style={{ color: c.primary, fontFamily: ty.heading.familySemibold, fontSize: 10 }}>
                                                7-DAY TRIAL
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ gap: 12, marginBottom: s.xl }}>
                                        {[
                                            'Unlimited AI-Powered Coaching',
                                            'Advanced Performance Analytics',
                                            'Personalized Smart Meal Plans',
                                            'Unlock All Pro Training Modules'
                                        ].map((feature) => (
                                            <View key={feature} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                <TabBarIcon name="checkmark-circle" color={c.primary} size={20} />
                                                <Text style={{ color: c.text, fontFamily: ty.body.familyMedium, fontSize: ty.sizes.sm }}>
                                                    {feature}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>

                                    <Pressable
                                        style={({ pressed }) => [
                                            styles.ctaButton,
                                            {
                                                backgroundColor: c.primary,
                                                borderRadius: r.md,
                                                opacity: pressed ? 0.9 : 1,
                                                ...shadow.premium,
                                            }
                                        ]}
                                        onPress={handleUnlock}
                                    >
                                        <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
                                            Start Your Transformation
                                        </Text>
                                        <TabBarIcon name="arrow-forward" color={c.bg} size={20} style={{ marginLeft: 8 }} />
                                    </Pressable>

                                    <Text style={{ textAlign: 'center', color: c.textMuted, fontSize: 11, marginTop: 12, opacity: 0.8 }}>
                                        Join 50,000+ athletes. Cancel anytime.
                                    </Text>
                                </View>
                            </GlassCard>
                        </LinearGradient>
                    </MotiView>

                    {/* STARTER Card (Secondary) */}
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 500, delay: 200 }}
                        style={{ marginTop: s.lg }}
                    >
                        <GlassCard intensity="light" style={{ padding: s.lg }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.md }}>
                                <View>
                                    <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
                                        Starter
                                    </Text>
                                    <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>
                                        Free <Text style={{ fontSize: ty.sizes.sm, color: c.textMuted, fontFamily: ty.body.family }}>forever</Text>
                                    </Text>
                                </View>
                                <Pressable onPress={handleBasic} style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: c.border, borderRadius: r.sm }}>
                                    <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 12 }}>
                                        Continue Basic
                                    </Text>
                                </Pressable>
                            </View>

                            <View style={{ height: 1, backgroundColor: c.border, marginBottom: s.md }} />

                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TabBarIcon name="checkmark" color={c.textMuted} size={16} />
                                    <Text style={{ color: c.textMuted, fontSize: ty.sizes.sm }}>Daily Logging</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <TabBarIcon name="checkmark" color={c.textMuted} size={16} />
                                    <Text style={{ color: c.textMuted, fontSize: ty.sizes.sm }}>Social Access</Text>
                                </View>
                            </View>
                        </GlassCard>
                    </MotiView>

                    {/* Footer Links */}
                    <View style={{ alignItems: 'center', marginTop: s.xl, gap: 16 }}>
                        <Text
                            onPress={handleBasic}
                            style={{ color: c.textMuted, fontSize: ty.sizes.sm, fontFamily: ty.body.familySemibold, textDecorationLine: 'underline' }}
                        >
                            Not ready for greatness? Stick to basics
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <Text style={[styles.footerLink, { color: c.textSubtle }]}>Restore</Text>
                            <Text style={{ color: c.textSubtle }}>|</Text>
                            <Text style={[styles.footerLink, { color: c.textSubtle }]}>Terms</Text>
                            <Text style={{ color: c.textSubtle }}>|</Text>
                            <Text style={[styles.footerLink, { color: c.textSubtle }]}>Privacy</Text>
                        </View>
                    </View>

                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    heroContainer: {
        height: 450,
        width: '100%',
        position: 'relative',
    },
    heroContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 60,
        paddingHorizontal: 24,
    },
    blueprintBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        marginBottom: 16,
        backdropFilter: 'blur(10px)',
    },
    blueprintText: {
        fontSize: 10,
        letterSpacing: 2,
    },
    heroTitle: {
        fontSize: 32,
        textAlign: 'center',
        marginBottom: 12,
    },
    heroSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.8,
        maxWidth: 300,
        lineHeight: 24,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    ctaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        width: '100%',
    },
    footerLink: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});
