import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import { MacroStatCard } from '../../../components/nutrition/MacroStatCard';
import { useApplyMealPlanChange, useNutritionPlanMeal } from '../../../hooks/usePlan';
import { useSetReviewSectionAccepted } from '../../../hooks/useOnboardingReview';
import { useProfile } from '../../../hooks/useUser';
import { toOunces, formatMacroDisplay, detectFoodCategory, getDefaultFoodMeasurement } from '../../../lib/nutrition/displayUnits';

type EditableItem = {
  key: string;
  food_item_id?: string | null;
  item_name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  caloriesPer100?: number;
  proteinPer100?: number;
  carbsPer100?: number;
  fatPer100?: number;
  fiberPer100?: number;
};

function safeNum(value: string | number | undefined | null) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function buildDeltaStatus(delta: number, unit: string, neutralLabel = 'On target') {
  if (Math.abs(delta) <= 1) {
    return neutralLabel;
  }

  if (delta > 0) {
    return `+${round1(delta)}${unit} over`;
  }

  return `${round1(Math.abs(delta))}${unit} under`;
}

export default function NutritionPlanMealEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, s, ty, r } = useTokens();
  const params = useLocalSearchParams<{ mealId?: string; returnTo?: string; runId?: string; dayOfWeek?: string }>();
  const mealId = String(params.mealId || '');
  const returnTo = String(params.returnTo || '');
  const runId = typeof params.runId === 'string' ? params.runId : null;
  const returnDay = typeof params.dayOfWeek === 'string' ? params.dayOfWeek : undefined;

  const { data: meal, isLoading } = useNutritionPlanMeal(mealId, { enabled: !!mealId });
  const applyChangeMutation = useApplyMealPlanChange();
  const setSectionAccepted = useSetReviewSectionAccepted();
  const { data: profile } = useProfile();
  const foodMeasurement = getDefaultFoodMeasurement(profile?.unit_system);
  const displayFoodMeasurement = (profile?.display_preferences?.food_measurement as any) ?? foodMeasurement;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);

  useEffect(() => {
    if (!meal) return;

    setName(meal.selected_variant?.name || meal.name || 'Custom Meal');
    setDescription(meal.selected_variant?.description || meal.description || '');

    const srcItems = meal.selected_variant?.items || [];
    setItems(
      srcItems.map((item, idx) => {
        const grams = safeNum(item.grams);
        return {
          key: `${item.id || idx}`,
          food_item_id: item.food_item_id,
          item_name: item.item_name,
          grams,
          calories: safeNum(item.calories),
          protein: safeNum(item.protein),
          carbs: safeNum(item.carbs),
          fat: safeNum(item.fat),
          fiber: safeNum(item.fiber),
          caloriesPer100: grams > 0 ? safeNum(item.calories) / grams * 100 : undefined,
          proteinPer100: grams > 0 ? safeNum(item.protein) / grams * 100 : undefined,
          carbsPer100: grams > 0 ? safeNum(item.carbs) / grams * 100 : undefined,
          fatPer100: grams > 0 ? safeNum(item.fat) / grams * 100 : undefined,
          fiberPer100: grams > 0 ? safeNum(item.fiber) / grams * 100 : undefined,
        };
      }),
    );
  }, [meal]);

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.calories += safeNum(item.calories);
        acc.protein += safeNum(item.protein);
        acc.carbs += safeNum(item.carbs);
        acc.fat += safeNum(item.fat);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [items]);

  const target = {
    calories: safeNum(meal?.target_calories),
    protein: safeNum(meal?.target_protein),
    carbs: safeNum(meal?.target_carbs),
    fat: safeNum(meal?.target_fat),
  };

  const delta = {
    calories: round1(totals.calories - target.calories),
    protein: round1(totals.protein - target.protein),
    carbs: round1(totals.carbs - target.carbs),
    fat: round1(totals.fat - target.fat),
  };

  const updateItem = (key: string, patch: Partial<EditableItem>) => {
    setItems((prev) => prev.map((item) => {
      if (item.key !== key) return item;
      const next = { ...item, ...patch };

      if (patch.grams !== undefined) {
        const grams = safeNum(patch.grams);
        if (item.caloriesPer100 !== undefined) next.calories = round1((item.caloriesPer100 * grams) / 100);
        if (item.proteinPer100 !== undefined) next.protein = round1((item.proteinPer100 * grams) / 100);
        if (item.carbsPer100 !== undefined) next.carbs = round1((item.carbsPer100 * grams) / 100);
        if (item.fatPer100 !== undefined) next.fat = round1((item.fatPer100 * grams) / 100);
        if (item.fiberPer100 !== undefined) next.fiber = round1((item.fiberPer100 * grams) / 100);
      }

      if (patch.calories !== undefined && safeNum(next.grams) > 0) {
        next.caloriesPer100 = round1((safeNum(patch.calories) / safeNum(next.grams)) * 100);
      }
      if (patch.protein !== undefined && safeNum(next.grams) > 0) {
        next.proteinPer100 = round1((safeNum(patch.protein) / safeNum(next.grams)) * 100);
      }
      if (patch.carbs !== undefined && safeNum(next.grams) > 0) {
        next.carbsPer100 = round1((safeNum(patch.carbs) / safeNum(next.grams)) * 100);
      }
      if (patch.fat !== undefined && safeNum(next.grams) > 0) {
        next.fatPer100 = round1((safeNum(patch.fat) / safeNum(next.grams)) * 100);
      }
      if (patch.fiber !== undefined && safeNum(next.grams) > 0) {
        next.fiberPer100 = round1((safeNum(patch.fiber) / safeNum(next.grams)) * 100);
      }

      return next;
    }));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        item_name: 'Custom Food',
        grams: 100,
        calories: 100,
        protein: 10,
        carbs: 10,
        fat: 3,
        fiber: 0,
        caloriesPer100: 100,
        proteinPer100: 10,
        carbsPer100: 10,
        fatPer100: 3,
        fiberPer100: 0,
      },
    ]);
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const saveChanges = async () => {
    if (!mealId) return;
    if (!items.length) {
      Alert.alert('Missing Items', 'Add at least one ingredient before saving.');
      return;
    }

    try {
      await applyChangeMutation.mutateAsync({
        planMealId: mealId,
        operation: 'customize_variant_items',
        name,
        description,
        items: items.map((item) => ({
          food_item_id: item.food_item_id || null,
          item_name: item.item_name,
          quantity_value: round1(item.grams),
          quantity_unit: 'g',
          grams: round1(item.grams),
          calories: round1(item.calories),
          protein: round1(item.protein),
          carbs: round1(item.carbs),
          fat: round1(item.fat),
          fiber: round1(item.fiber),
        })),
      });

      if (runId) {
        await setSectionAccepted.mutateAsync({
          runId,
          section: 'nutrition_plan',
          accepted: false,
        });
      }

      if (returnTo === 'onboarding-edit-nutrition') {
        router.replace({
          pathname: '/(onboarding)/edit-nutrition-plan',
          params: {
            ...(runId ? { runId } : {}),
            ...(returnDay ? { dayOfWeek: returnDay } : {}),
          },
        });
        return;
      }

      Alert.alert('Updated', 'Meal customization saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save meal changes');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable
          onPress={() => {
            if (returnTo === 'onboarding-edit-nutrition') {
              // Coming from onboarding - navigate back to onboarding edit screen
              router.push({
                pathname: '/(onboarding)/edit-nutrition-plan',
                params: { 
                  ...(runId ? { runId } : {}), 
                  ...(returnDay ? { day: returnDay } : {}) 
                },
              });
            } else {
              // Normal tabs navigation - use back
              router.back();
            }
          }}
          style={[styles.backButton, { backgroundColor: c.surface }]}
        >
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
          Edit Meal
        </Text>
        <Pressable
          onPress={saveChanges}
          disabled={applyChangeMutation.isPending}
          style={[styles.saveButton, { backgroundColor: c.primary }]}
        >
          {applyChangeMutation.isPending ? (
            <ActivityIndicator color={c.bg} size="small" />
          ) : (
            <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
              Save
            </Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + s.xl }}
      >
        <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md }]}> 
          <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
            MEAL NAME
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Meal Name"
            placeholderTextColor={c.textMuted}
            style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
          />

          <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs, marginTop: s.sm }}>
            DESCRIPTION
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Notes"
            placeholderTextColor={c.textMuted}
            style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
          />
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, marginTop: s.lg }]}> 
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
            Real-time Macro Delta
          </Text>
          <Text style={{ color: c.textMuted, marginTop: s.xs, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
            Totals update as you edit ingredient quantities.
          </Text>

          <View style={[styles.deltaGrid, { marginTop: s.md }]}>
            <MacroStatCard
              macro="calories"
              label="Calories"
              primaryValue={`${Math.round(totals.calories)} / ${Math.round(target.calories)}`}
              secondaryValue={`${delta.calories >= 0 ? '+' : ''}${Math.round(delta.calories)} kcal`}
              statusText={buildDeltaStatus(delta.calories, ' kcal')}
              compact
            />
            <MacroStatCard
              macro="protein"
              label="Protein"
              primaryValue={`${formatMacroDisplay(totals.protein, 'protein', displayFoodMeasurement).value}${formatMacroDisplay(totals.protein, 'protein', displayFoodMeasurement).unit} / ${formatMacroDisplay(target.protein, 'protein', displayFoodMeasurement).value}${formatMacroDisplay(target.protein, 'protein', displayFoodMeasurement).unit}`}
              secondaryValue={`${delta.protein >= 0 ? '+' : ''}${formatMacroDisplay(delta.protein, 'protein', displayFoodMeasurement).value}${formatMacroDisplay(delta.protein, 'protein', displayFoodMeasurement).unit}`}
              statusText={buildDeltaStatus(delta.protein, formatMacroDisplay(delta.protein, 'protein', displayFoodMeasurement).unit)}
              compact
            />
            <MacroStatCard
              macro="carbs"
              label="Carbs"
              primaryValue={`${formatMacroDisplay(totals.carbs, 'carbs', displayFoodMeasurement).value}${formatMacroDisplay(totals.carbs, 'carbs', displayFoodMeasurement).unit} / ${formatMacroDisplay(target.carbs, 'carbs', displayFoodMeasurement).value}${formatMacroDisplay(target.carbs, 'carbs', displayFoodMeasurement).unit}`}
              secondaryValue={`${delta.carbs >= 0 ? '+' : ''}${formatMacroDisplay(delta.carbs, 'carbs', displayFoodMeasurement).value}${formatMacroDisplay(delta.carbs, 'carbs', displayFoodMeasurement).unit}`}
              statusText={buildDeltaStatus(delta.carbs, formatMacroDisplay(delta.carbs, 'carbs', displayFoodMeasurement).unit)}
              compact
            />
            <MacroStatCard
              macro="fat"
              label="Fat"
              primaryValue={`${formatMacroDisplay(totals.fat, 'fat', displayFoodMeasurement).value}${formatMacroDisplay(totals.fat, 'fat', displayFoodMeasurement).unit} / ${formatMacroDisplay(target.fat, 'fat', displayFoodMeasurement).value}${formatMacroDisplay(target.fat, 'fat', displayFoodMeasurement).unit}`}
              secondaryValue={`${delta.fat >= 0 ? '+' : ''}${formatMacroDisplay(delta.fat, 'fat', displayFoodMeasurement).value}${formatMacroDisplay(delta.fat, 'fat', displayFoodMeasurement).unit}`}
              statusText={buildDeltaStatus(delta.fat, formatMacroDisplay(delta.fat, 'fat', displayFoodMeasurement).unit)}
              compact
            />
          </View>
        </View>

        <View style={{ marginTop: s.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Ingredients
          </Text>
          <Pressable
            onPress={addItem}
            style={[styles.addBtn, { borderColor: c.primary }]}
          >
            <TabBarIcon name="add" color={c.primary} size={18} />
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginLeft: s.xs }}>
              Add
            </Text>
          </Pressable>
        </View>

        {items.map((item) => (
          <View key={item.key} style={[styles.card, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md, marginTop: s.md }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TextInput
                value={item.item_name}
                onChangeText={(value) => updateItem(item.key, { item_name: value })}
                style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family, flex: 1 }]}
                placeholder="Ingredient"
                placeholderTextColor={c.textMuted}
              />
              <Pressable onPress={() => removeItem(item.key)} style={{ marginLeft: s.sm }}>
                <TabBarIcon name="trash-outline" color={c.danger || '#ef4444'} size={18} />
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: c.textMuted, fontFamily: ty.mono.family }]}>{displayFoodMeasurement === 'imperial_mixed' && detectFoodCategory(item.item_name) === 'protein' ? 'oz (grams)' : 'grams'}</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={String(item.grams)}
                  onChangeText={(value) => updateItem(item.key, { grams: safeNum(value) })}
                  style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                />
                {displayFoodMeasurement === 'imperial_mixed' && detectFoodCategory(item.item_name) === 'protein' && (
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                    ≈ {round1(toOunces(item.grams))} oz
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: c.textMuted, fontFamily: ty.mono.family }]}>cal</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={String(item.calories)}
                  onChangeText={(value) => updateItem(item.key, { calories: safeNum(value) })}
                  style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: c.textMuted, fontFamily: ty.mono.family }]}>P</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={String(item.protein)}
                  onChangeText={(value) => updateItem(item.key, { protein: safeNum(value) })}
                  style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: c.textMuted, fontFamily: ty.mono.family }]}>C</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={String(item.carbs)}
                  onChangeText={(value) => updateItem(item.key, { carbs: safeNum(value) })}
                  style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: c.textMuted, fontFamily: ty.mono.family }]}>F</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={String(item.fat)}
                  onChangeText={(value) => updateItem(item.key, { fat: safeNum(value) })}
                  style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: c.textMuted, fontFamily: ty.mono.family }]}>Fiber</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  value={String(item.fiber)}
                  onChangeText={(value) => updateItem(item.key, { fiber: safeNum(value) })}
                  style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    minWidth: 68,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  card: {},
  deltaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    minHeight: 36,
  },
  addBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
