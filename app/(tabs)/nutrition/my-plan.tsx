/**
 * Nutrition Plan Viewing Screen
 * 7-day selector, ingredient-level variants, swap/customize actions,
 * and macro totals vs daily targets.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
  useNutritionPlanDay,
  useApplyMealPlanChange,
} from '../../../hooks/usePlan';
import { useTargets } from '../../../lib/targets/useTargets';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export default function MyNutritionPlanScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [showHistory, setShowHistory] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const { targets, loading: targetsLoading, refetch: refetchTargets } = useTargets();

  const {
    data: nutritionPlan,
    isLoading,
    isRefetching,
    refetch,
  } = useActiveNutritionPlan();

  const {
    data: dayPlan,
    isLoading: dayLoading,
    refetch: refetchDay,
  } = useNutritionPlanDay(selectedDay, {
    enabled: !!nutritionPlan,
    planId: nutritionPlan?.id,
  });

  const { data: planHistory } = useNutritionPlanHistory();

  const regenerateMutation = useTriggerPlanGeneration();
  const reactivateMutation = useReactivatePlan();
  const applyMealChangeMutation = useApplyMealPlanChange();

  const handleRefresh = useCallback(() => {
    refetch();
    refetchTargets();
    refetchDay();
  }, [refetch, refetchTargets, refetchDay]);

  const handleRegenerate = () => {
    Alert.alert(
      'Regenerate Nutrition Plan',
      'This regenerates your 7-day plan from onboarding data and current targets. Your previous plan is kept in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            try {
              await regenerateMutation.mutateAsync({
                planType: 'nutrition',
                options: {
                  generation_horizon_days: { nutrition: 7 },
                  include_variants: true,
                  macro_tolerance_percent: 10,
                },
              });
              Alert.alert('Success', 'Your nutrition plan has been regenerated.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to regenerate plan');
            }
          },
        },
      ],
    );
  };

  const handleReactivatePlan = (planId: string, version: number) => {
    Alert.alert(
      'Reactivate Plan',
      `Switch back to Nutrition Plan v${version}?`,
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
      ],
    );
  };

  const handleSwapVariant = async (mealId: string, variantId: string) => {
    try {
      await applyMealChangeMutation.mutateAsync({
        planMealId: mealId,
        operation: 'swap_variant',
        variantId,
      });
    } catch (error: any) {
      Alert.alert('Swap Failed', error.message || 'Unable to swap meal variant');
    }
  };

  const todayTarget = useMemo(() => {
    return {
      calories: targets.calories || 0,
      protein: targets.protein_g || 0,
      carbs: targets.carbs_g || 0,
      fat: targets.fat_g || 0,
    };
  }, [targets]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
        <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}> 
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

  if (!nutritionPlan) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
        <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}> 
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
              Generate a complete 7-day ingredient-based plan tied to your onboarding data.
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

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}> 
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
        refreshControl={<RefreshControl refreshing={isRefetching || targetsLoading} onRefresh={handleRefresh} tintColor={c.primary} />}
      >
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
                7-day meal structure with swap-ready variants and ingredient customization.
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: nutritionPlan.is_active ? c.success : c.surface2, borderRadius: r.sm }]}> 
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                {nutritionPlan.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>

        {showHistory ? (
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
          <View>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginBottom: s.sm }}>
              7-Day Meal Plan
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: s.sm, paddingBottom: s.sm }}>
              {DAY_LABELS.map((label, index) => {
                const selected = index === selectedDay;
                return (
                  <Pressable
                    key={label}
                    onPress={() => setSelectedDay(index)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: selected ? c.primary : c.surface,
                    }}
                  >
                    <Text style={{ color: selected ? c.bg : c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.planCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, marginBottom: s.md }]}> 
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                Daily Macro Totals vs Target
              </Text>
              <Text style={{ color: c.textMuted, marginTop: s.xs, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                Values reflect selected variants for {DAY_LABELS[selectedDay]}.
              </Text>

              <View style={{ marginTop: s.sm, gap: s.xs }}>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Calories: {Math.round(dayPlan?.totals.calories || 0)} / {Math.round(todayTarget.calories)}
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Protein: {round1(dayPlan?.totals.protein || 0)}g / {round1(todayTarget.protein)}g
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Carbs: {round1(dayPlan?.totals.carbs || 0)}g / {round1(todayTarget.carbs)}g
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Fat: {round1(dayPlan?.totals.fat || 0)}g / {round1(todayTarget.fat)}g
                </Text>
              </View>
            </View>

            {dayLoading ? (
              <View style={{ paddingVertical: s.xl, alignItems: 'center' }}>
                <ActivityIndicator color={c.primary} />
              </View>
            ) : (
              <View>
                {(dayPlan?.meals || []).map((meal) => (
                  <View key={meal.id} style={[styles.mealCard, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, marginBottom: s.md }]}> 
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                          {meal.meal_slot[0].toUpperCase() + meal.meal_slot.slice(1)}
                        </Text>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                          {meal.selected_variant?.name || meal.name}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => router.push({ pathname: '/(tabs)/nutrition/plan-meal-editor', params: { mealId: meal.id } })}
                        style={[styles.swapButton, { borderColor: c.primary }]}
                      >
                        <TabBarIcon name="create-outline" color={c.primary} size={14} />
                        <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginLeft: s.xs }}>
                          Customize
                        </Text>
                      </Pressable>
                    </View>

                    <View style={{ marginTop: s.sm }}>
                      {(meal.selected_variant?.items || []).map((item) => (
                        <Text key={item.id} style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginBottom: 2 }}>
                          • {item.quantity_value}{item.quantity_unit} {item.item_name} ({Math.round(item.calories || 0)} kcal)
                        </Text>
                      ))}
                    </View>

                    <Text style={{ color: c.text, fontFamily: ty.body.familyMedium, fontSize: ty.sizes.xs, marginTop: s.sm }}>
                      Meal Macros: {Math.round(meal.selected_variant?.target_calories || meal.target_calories || 0)} kcal • P {round1(Number(meal.selected_variant?.target_protein || meal.target_protein || 0))}g • C {round1(Number(meal.selected_variant?.target_carbs || meal.target_carbs || 0))}g • F {round1(Number(meal.selected_variant?.target_fat || meal.target_fat || 0))}g
                    </Text>

                    {(meal.variants || []).filter((variant) => variant.id !== meal.selected_variant_id).length > 0 && (
                      <View style={{ marginTop: s.sm }}>
                        <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs, marginBottom: s.xs }}>
                          SWAP WITH SIMILAR MACROS
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.xs }}>
                          {(meal.variants || []).filter((variant) => variant.id !== meal.selected_variant_id).map((variant) => (
                            <Pressable
                              key={variant.id}
                              onPress={() => handleSwapVariant(meal.id, variant.id)}
                              style={[styles.swapButton, { borderColor: c.border }]}
                              disabled={applyMealChangeMutation.isPending}
                            >
                              <Text style={{ color: c.text, fontFamily: ty.body.familyMedium, fontSize: ty.sizes.xs }}>
                                {variant.name}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                ))}

                {!dayPlan?.meals?.length && (
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                    No meals generated for this day yet.
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

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
  mealCard: {},
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  historyCard: {},
  swapButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
});
