/**
 * Nutrition Plan Viewing Screen
 * Shows the user's active nutrition plan with macro targets,
 * meal timing, plan regeneration, and version history
 */

import { useState, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Pressable,
    ScrollView,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import {
    useActiveNutritionPlan,
    useNutritionPlanHistory,
    useTriggerPlanGeneration,
    useReactivatePlan,
} from '../../../hooks/usePlan';
import { useTargets } from '../../../lib/targets/useTargets';


export default function MyNutritionPlanScreen() {
    const { c, s, ty, r } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [showHistory, setShowHistory] = useState(false);

    // Fetch user targets for macro goals
    const { targets, loading: targetsLoading, refetch: refetchTargets } = useTargets();

    // Fetch active nutrition plan
    const {
        data: nutritionPlan,
        isLoading,
        isRefetching,
        refetch,
    } = useActiveNutritionPlan();

    // Fetch plan history
    const { data: planHistory } = useNutritionPlanHistory();

    // Mutations
    const regenerateMutation = useTriggerPlanGeneration();
    const reactivateMutation = useReactivatePlan();

    const handleRefresh = useCallback(() => {
        refetch();
        refetchTargets();
    }, [refetch, refetchTargets]);

    const handleRegenerate = () => {
        Alert.alert(
            'Regenerate Nutrition Plan',
            'This will create a new AI-generated nutrition plan based on your current profile and goals. Your old plan will be saved in history.\n\nFree: 1/hour • Elite: 3/hour',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Regenerate',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await regenerateMutation.mutateAsync('nutrition');
                            Alert.alert('Success', 'Your nutrition plan has been regenerated!');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to regenerate plan');
                        }
                    },
                },
            ]
        );
    };

    const handleReactivatePlan = (planId: string, version: number) => {
        Alert.alert(
            'Reactivate Plan',
            `Switch back to Nutrition Plan v${version}? Your current targets will be updated.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reactivate',
                    onPress: async () => {
                        try {
                            await reactivateMutation.mutateAsync({ planId, planType: 'nutrition' });
                            setShowHistory(false);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to reactivate plan');
                        }
                    },
                },
            ]
        );
    };

    // Loading state
    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
                <View style={[styles.header, { paddingHorizontal: s.lg }]}>
                    <Pressable
                        onPress={() => router.back()}
                        style={[styles.backButton, { backgroundColor: c.surface }]}
                    >
                        <TabBarIcon name="chevron-back" color={c.text} size={24} />
                    </Pressable>
                    <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}>
                        My Nutrition Plan
                    </Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={[styles.loadingContainer, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={c.primary} />
                </View>
            </View>
        );
    }

    // No plan state
    if (!nutritionPlan) {
        return (
            <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
                <View style={[styles.header, { paddingHorizontal: s.lg }]}>
                    <Pressable
                        onPress={() => router.back()}
                        style={[styles.backButton, { backgroundColor: c.surface }]}
                    >
                        <TabBarIcon name="chevron-back" color={c.text} size={24} />
                    </Pressable>
                    <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}>
                        My Nutrition Plan
                    </Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={[styles.emptyState, { padding: s.xl }]}>
                    <View style={[styles.emptyCard, { backgroundColor: c.surface, borderRadius: r.lg, padding: s.xl }]}>
                        <TabBarIcon name="nutrition-outline" color={c.textMuted} size={64} />
                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.lg, textAlign: 'center' }}>
                            No Nutrition Plan Yet
                        </Text>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.md, marginTop: s.sm, textAlign: 'center' }}>
                            Complete your onboarding or generate a new AI-powered nutrition plan tailored to your goals.
                        </Text>
                        <Pressable
                            style={[styles.generateButton, { backgroundColor: c.primary, borderRadius: r.md, marginTop: s.xl }]}
                            onPress={handleRegenerate}
                            disabled={regenerateMutation.isPending}
                        >
                            {regenerateMutation.isPending ? (
                                <ActivityIndicator color={c.bg} size="small" />
                            ) : (
                                <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                                    Generate Nutrition Plan
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        );
    }

    // Plan view
    return (
        <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: s.lg }]}>
                <Pressable
                    onPress={() => router.back()}
                    style={[styles.backButton, { backgroundColor: c.surface }]}
                >
                    <TabBarIcon name="chevron-back" color={c.text} size={24} />
                </Pressable>
                <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}>
                    My Nutrition Plan
                </Text>
                <Pressable
                    onPress={() => setShowHistory(!showHistory)}
                    style={[styles.backButton, { backgroundColor: showHistory ? c.primary : c.surface }]}
                >
                    <TabBarIcon name="time-outline" color={showHistory ? c.bg : c.text} size={20} />
                </Pressable>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + s.xl }}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} tintColor={c.primary} />
                }
            >
                {/* Plan Info */}
                <View style={[styles.planCard, { backgroundColor: c.surface, borderRadius: r.lg, padding: s.lg, marginBottom: s.lg }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                                v{nutritionPlan.version} • PERSONALIZED
                            </Text>
                            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.xs }}>
                                {nutritionPlan.name || 'Nutrition Plan'}
                            </Text>
                            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                                {nutritionPlan.description || 'AI-generated nutrition targets'}
                            </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: nutritionPlan.is_active ? c.success : c.surface2, borderRadius: r.sm }]}>
                            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                                {nutritionPlan.is_active ? 'Active' : 'Inactive'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Show History or Plan Details */}
                {showHistory ? (
                    // Plan History
                    <View>
                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginBottom: s.md }}>
                            Plan History
                        </Text>
                        {planHistory && planHistory.length > 0 ? (
                            planHistory.map((plan: any) => (
                                <Pressable
                                    key={plan.id}
                                    style={[
                                        styles.historyCard,
                                        {
                                            backgroundColor: plan.is_active ? c.surface2 : c.surface,
                                            borderRadius: r.md,
                                            padding: s.md,
                                            marginBottom: s.sm,
                                            borderWidth: plan.is_active ? 1 : 0,
                                            borderColor: c.primary,
                                        },
                                    ]}
                                    onPress={() => !plan.is_active && handleReactivatePlan(plan.id, plan.version)}
                                    disabled={plan.is_active}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                                                v{plan.version} - {plan.name || 'Nutrition Plan'}
                                            </Text>
                                            <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                                                {new Date(plan.created_at).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        {plan.is_active ? (
                                            <View style={[styles.badge, { backgroundColor: c.primary, borderRadius: r.sm }]}>
                                                <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                                                    Current
                                                </Text>
                                            </View>
                                        ) : (
                                            <TabBarIcon name="refresh" color={c.textMuted} size={18} />
                                        )}
                                    </View>
                                </Pressable>
                            ))
                        ) : (
                            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                                No plan history yet.
                            </Text>
                        )}
                    </View>
                ) : (
                    // Plan Details
                    <View>
                        {/* Daily Targets */}
                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginBottom: s.md }}>
                            Daily Targets
                        </Text>

                        {/* Calorie Target */}
                        <View style={[styles.targetCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, marginBottom: s.sm }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.iconBadge, { backgroundColor: c.primary, borderRadius: r.sm, marginRight: s.md }]}>
                                        <TabBarIcon name="flame" color={c.bg} size={18} />
                                    </View>
                                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                                        Calories
                                    </Text>
                                </View>
                                <Text style={{ color: c.primary, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>
                                    {targets.calories || 2000}
                                </Text>
                            </View>
                        </View>

                        {/* Macro Targets */}
                        <View style={{ flexDirection: 'row', gap: s.sm, marginBottom: s.lg }}>
                            {/* Protein */}
                            <View style={[styles.macroCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, flex: 1 }]}>
                                <Text style={{ color: '#EF4444', fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
                                    {targets.protein_g || 150}g
                                </Text>
                                <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                                    Protein
                                </Text>
                            </View>

                            {/* Carbs */}
                            <View style={[styles.macroCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, flex: 1 }]}>
                                <Text style={{ color: '#3B82F6', fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
                                    {targets.carbs_g || 250}g
                                </Text>
                                <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                                    Carbs
                                </Text>
                            </View>

                            {/* Fat */}
                            <View style={[styles.macroCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, flex: 1 }]}>
                                <Text style={{ color: '#F59E0B', fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
                                    {targets.fat_g || 65}g
                                </Text>
                                <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                                    Fat
                                </Text>
                            </View>
                        </View>

                        {/* Hydration Target */}
                        {targets.water_ml > 0 && (
                            <View style={[styles.targetCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, marginBottom: s.lg }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.iconBadge, { backgroundColor: '#3B82F6', borderRadius: r.sm, marginRight: s.md }]}>
                                            <TabBarIcon name="water" color="#fff" size={18} />
                                        </View>
                                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                                            Water
                                        </Text>
                                    </View>
                                    <Text style={{ color: '#3B82F6', fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
                                        {(targets.water_ml / 1000).toFixed(1)}L
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Quick Actions */}
                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginBottom: s.md }}>
                            Quick Actions
                        </Text>

                        <View style={{ flexDirection: 'row', gap: s.sm }}>
                            <Pressable
                                style={[styles.actionCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, flex: 1 }]}
                                onPress={() => router.push('/(tabs)/nutrition/food-search')}
                            >
                                <TabBarIcon name="search" color={c.primary} size={24} />
                                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: s.sm, textAlign: 'center' }}>
                                    Log Food
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[styles.actionCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, flex: 1 }]}
                                onPress={() => router.push('/(tabs)/nutrition/barcode-scanner')}
                            >
                                <TabBarIcon name="barcode-outline" color={c.primary} size={24} />
                                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: s.sm, textAlign: 'center' }}>
                                    Scan Barcode
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[styles.actionCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, flex: 1 }]}
                                onPress={() => router.push('/(tabs)/nutrition/food-camera')}
                            >
                                <TabBarIcon name="camera" color={c.primary} size={24} />
                                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: s.sm, textAlign: 'center' }}>
                                    AI Photo
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                {/* Regenerate Button */}
                <Pressable
                    style={[
                        styles.regenerateButton,
                        {
                            backgroundColor: c.surface,
                            borderRadius: r.md,
                            marginTop: s.xl,
                            borderWidth: 1,
                            borderColor: c.primary,
                        },
                    ]}
                    onPress={handleRegenerate}
                    disabled={regenerateMutation.isPending}
                >
                    {regenerateMutation.isPending ? (
                        <ActivityIndicator color={c.primary} size="small" />
                    ) : (
                        <>
                            <TabBarIcon name="sparkles" color={c.primary} size={18} />
                            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md, marginLeft: s.sm }}>
                                Regenerate with AI
                            </Text>
                        </>
                    )}
                </Pressable>

                <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs, textAlign: 'center', marginTop: s.sm }}>
                    Free: 1/hour • Elite: 3/hour
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        letterSpacing: -0.3,
    },
    placeholder: {
        width: 40,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
    },
    emptyCard: {
        alignItems: 'center',
    },
    generateButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        alignItems: 'center',
    },
    planCard: {},
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    historyCard: {},
    targetCard: {},
    macroCard: {
        alignItems: 'center',
    },
    iconBadge: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryCard: {},
    actionCard: {
        alignItems: 'center',
    },
    regenerateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
});
