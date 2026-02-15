import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { NutritionEliteGate } from '../../../components/nutrition/NutritionEliteGate';
import { useFeatureAccess } from '../../../hooks/useSubscription';
import { useBuildMealsFromConstraints, useApplyMealsBatch } from '../../../hooks/useMealBuilder';
import { useGroceryLists } from '../../../hooks/useGrocery';

export default function GroceryPlannerScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const access = useFeatureAccess('grocery_pantry_builder');
  const buildMutation = useBuildMealsFromConstraints();
  const applyBatchMutation = useApplyMealsBatch();
  const groceryListsQuery = useGroceryLists();

  const [mealCount, setMealCount] = useState('3');
  const [mealSlot, setMealSlot] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [proteinTarget, setProteinTarget] = useState('40');
  const [maxCalories, setMaxCalories] = useState('650');
  const [budgetLimit, setBudgetLimit] = useState('45');
  const [nutFree, setNutFree] = useState(true);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);

  const generatedMeals = buildMutation.data?.meals || [];

  const effectiveSelected = useMemo(() => {
    if (!generatedMeals.length) return [] as number[];
    if (!selectedIndexes.length) return generatedMeals.map((_, idx) => idx);
    return selectedIndexes;
  }, [generatedMeals, selectedIndexes]);

  const toggleSelection = (index: number) => {
    setSelectedIndexes((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      return [...prev, index];
    });
  };

  const runBuilder = async (persistGroceryList = true) => {
    try {
      await buildMutation.mutateAsync({
        constraints: {
          meal_count: Number(mealCount || 3),
          meal_slot: mealSlot,
          protein_target: Number(proteinTarget || 40),
          max_calories: Number(maxCalories || 650),
          budget_limit: Number(budgetLimit || 0) || undefined,
          allergies: nutFree ? ['nut', 'peanut', 'almond', 'cashew', 'walnut'] : [],
          refused_foods: [],
        },
        pantry_mode: 'full_inventory',
        persist_grocery_list: persistGroceryList,
      });
      setSelectedIndexes([]);
    } catch (error: any) {
      Alert.alert('Builder failed', error?.message || 'Could not generate meals.');
    }
  };

  const applySelectedMeals = async () => {
    if (!generatedMeals.length) {
      Alert.alert('No meals', 'Generate meals first.');
      return;
    }

    const selectedMeals = effectiveSelected
      .map((idx) => generatedMeals[idx])
      .filter(Boolean)
      .map((meal) => ({
        meal_slot: meal.slot,
        name: meal.name,
        description: 'Applied from Grocery Planner',
        target_calories: meal.totals.calories,
        target_protein: meal.totals.protein,
        target_carbs: meal.totals.carbs,
        target_fat: meal.totals.fat,
        prep_time_min: 20,
        items: meal.ingredients,
      }));

    if (!selectedMeals.length) {
      Alert.alert('No selection', 'Select at least one meal to apply.');
      return;
    }

    try {
      await applyBatchMutation.mutateAsync({
        dayOfWeek: new Date().getDay(),
        meals: selectedMeals,
      });

      Alert.alert('Applied', 'Selected meals were applied to your nutrition plan.', [
        { text: 'Open Plan', onPress: () => router.push('/(tabs)/nutrition/my-plan') },
      ]);
    } catch (error: any) {
      Alert.alert('Apply failed', error?.message || 'Could not apply selected meals.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderRadius: r.pill }]}> 
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
          Grocery + Meal Builder
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + s.xl }}>
        {!access.isLoading && !access.hasAccess ? (
          <NutritionEliteGate
            title="Elite Grocery Intelligence"
            subtitle="Generate macro-aligned meals, grocery lists, pantry-aware substitutions, and leftovers plans."
          />
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, padding: s.md }]}> 
              <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.mono.family }]}>Constraints</Text>

              <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.sm }}>
                <Field
                  label="Meals"
                  value={mealCount}
                  onChangeText={setMealCount}
                  placeholder="3"
                  keyboardType="number-pad"
                  colors={{ text: c.text, border: c.border, muted: c.textMuted }}
                  family={ty.body.family}
                />
                <Field
                  label="Protein g"
                  value={proteinTarget}
                  onChangeText={setProteinTarget}
                  placeholder="40"
                  keyboardType="decimal-pad"
                  colors={{ text: c.text, border: c.border, muted: c.textMuted }}
                  family={ty.body.family}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.sm }}>
                <Field
                  label="Max kcal"
                  value={maxCalories}
                  onChangeText={setMaxCalories}
                  placeholder="650"
                  keyboardType="decimal-pad"
                  colors={{ text: c.text, border: c.border, muted: c.textMuted }}
                  family={ty.body.family}
                />
                <Field
                  label="Budget $"
                  value={budgetLimit}
                  onChangeText={setBudgetLimit}
                  placeholder="45"
                  keyboardType="decimal-pad"
                  colors={{ text: c.text, border: c.border, muted: c.textMuted }}
                  family={ty.body.family}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.sm }}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((slot) => {
                  const active = mealSlot === slot;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => setMealSlot(slot)}
                      style={{
                        borderWidth: 1,
                        borderColor: active ? c.primary : c.border,
                        backgroundColor: active ? `${c.primary}15` : c.surface2,
                        borderRadius: r.pill,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: active ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                        {slot}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => setNutFree((prev) => !prev)}
                style={{
                  marginTop: s.sm,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: s.xs,
                }}
              >
                <TabBarIcon name={nutFree ? 'checkbox' : 'square-outline'} color={nutFree ? c.primary : c.textMuted} size={18} />
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Nut-free filtering
                </Text>
              </Pressable>

              <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.md }}>
                <Pressable
                  onPress={() => runBuilder(true)}
                  disabled={buildMutation.isPending}
                  style={[styles.primaryBtn, { flex: 1, backgroundColor: c.primary, borderRadius: r.md }]}
                >
                  {buildMutation.isPending ? (
                    <ActivityIndicator color={c.bg} size="small" />
                  ) : (
                    <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                      Build + Grocery
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => runBuilder(false)}
                  disabled={buildMutation.isPending}
                  style={[styles.secondaryBtn, { flex: 1, borderColor: c.border, borderRadius: r.md }]}
                >
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Build Only
                  </Text>
                </Pressable>
              </View>
            </View>

            {!!generatedMeals.length && (
              <View style={{ marginTop: s.lg, gap: s.sm }}>
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                  Generated Meals
                </Text>

                {generatedMeals.map((meal, index) => {
                  const selected = effectiveSelected.includes(index);
                  return (
                    <Pressable
                      key={`${meal.name}-${index}`}
                      onPress={() => toggleSelection(index)}
                      style={{
                        borderRadius: r.md,
                        borderWidth: 1,
                        borderColor: selected ? c.primary : c.border,
                        backgroundColor: c.surface,
                        padding: s.md,
                      }}
                    >
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                        {meal.name}
                      </Text>
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                        {meal.totals.calories} kcal • {meal.totals.protein}P / {meal.totals.carbs}C / {meal.totals.fat}F • ${meal.estimatedCost}
                      </Text>
                      {!!meal.substitutions?.length && (
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                          Swap: {meal.substitutions[0].ingredient} → {meal.substitutions[0].alternatives.slice(0, 2).join(', ')}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={applySelectedMeals}
                  disabled={applyBatchMutation.isPending}
                  style={[styles.primaryBtn, { backgroundColor: c.primary, borderRadius: r.md, marginTop: s.sm }]}
                >
                  {applyBatchMutation.isPending ? (
                    <ActivityIndicator color={c.bg} size="small" />
                  ) : (
                    <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                      Add Selected to Plan
                    </Text>
                  )}
                </Pressable>
              </View>
            )}

            {!!buildMutation.data?.groceryList?.items?.length && (
              <View style={[styles.card, { marginTop: s.lg, backgroundColor: c.surface, borderRadius: r.md, padding: s.md }]}> 
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                  Grocery Delta
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                  Estimated cost: ${buildMutation.data.groceryList.totalEstimatedCost}
                </Text>

                <View style={{ marginTop: s.sm, gap: s.xs }}>
                  {buildMutation.data.groceryList.items.map((item) => (
                    <Text key={`${item.item_name}-${item.to_buy_quantity}`} style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                      {item.item_name}: need {item.required_quantity}{item.quantity_unit}, on-hand {item.on_hand_quantity}{item.quantity_unit}, buy {item.to_buy_quantity}{item.quantity_unit}
                    </Text>
                  ))}
                </View>
              </View>
            )}

            {!!buildMutation.data?.leftoversPlan?.length && (
              <View style={[styles.card, { marginTop: s.md, backgroundColor: c.surface, borderRadius: r.md, padding: s.md }]}> 
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.sm }}>
                  Leftovers Logic
                </Text>
                {buildMutation.data.leftoversPlan.map((item) => (
                  <Text key={item.item_name} style={{ marginTop: 4, color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                    {item.item_name}: {item.expected_leftover_grams}g leftover
                  </Text>
                ))}
              </View>
            )}

            {!!groceryListsQuery.data?.length && (
              <View style={[styles.card, { marginTop: s.md, backgroundColor: c.surface, borderRadius: r.md, padding: s.md }]}> 
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.sm }}>
                  Recent Grocery Lists
                </Text>
                {groceryListsQuery.data.slice(0, 3).map((list) => (
                  <Text key={list.id} style={{ marginTop: 4, color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                    {list.title} • {list.total_estimated_cost ? `$${list.total_estimated_cost}` : 'No cost'}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  colors,
  family,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType: 'number-pad' | 'decimal-pad';
  colors: { text: string; border: string; muted: string };
  family: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        style={{
          marginTop: 6,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 10,
          color: colors.text,
          fontFamily: family,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {},
  label: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
});
