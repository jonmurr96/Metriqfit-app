import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { MacroInlineSummary } from '../../components/nutrition/MacroInlineSummary';
import {
  useActiveNutritionPlan,
  useNutritionPlanDay,
  useAddNutritionPlanMeal,
  useMoveNutritionPlanMeal,
  useRemoveNutritionPlanMeal,
  useCopyNutritionDayMeals,
} from '../../hooks/usePlan';
import { useOnboardingAnswers } from '../../hooks/useUser';
import { useSetReviewSectionAccepted, useUpdateReviewNutritionPlan } from '../../hooks/useOnboardingReview';
import { trackEvent } from '../../lib/analytics';

const MEAL_OPTIONS = ['2', '3', '4', '5_plus', 'no_preference'] as const;
const DIET_OPTIONS = ['anything', 'vegetarian', 'vegan', 'keto', 'paleo', 'pescatarian', 'other'] as const;

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const;

const SLOT_SEQUENCE = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const SLOT_INDEX: Record<string, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

function normalizeCsv(text: string) {
  return Array.from(
    new Set(
      text
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function slotLabel(slot: string) {
  if (slot === 'snack') return 'Snack';
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

export default function EditNutritionPlanScreen() {
  const { c, s, ty, r } = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ runId?: string; dayOfWeek?: string }>();
  const runId = typeof params.runId === 'string' ? params.runId : null;

  const parsedDayFromParams = Number(params.dayOfWeek);
  const fallbackToday = new Date().getDay();
  const initialDay = Number.isFinite(parsedDayFromParams) && parsedDayFromParams >= 0 && parsedDayFromParams <= 6
    ? parsedDayFromParams
    : fallbackToday;

  const [selectedDay, setSelectedDay] = useState(initialDay);

  const { data: nutritionPlan, isLoading: nutritionLoading } = useActiveNutritionPlan();
  const { data: onboardingAnswers, isLoading: onboardingLoading } = useOnboardingAnswers();
  const {
    data: selectedDayMeals,
    isLoading: selectedDayMealsLoading,
  } = useNutritionPlanDay(selectedDay, {
    enabled: Boolean(nutritionPlan),
    planId: nutritionPlan?.id,
  });

  const updateNutrition = useUpdateReviewNutritionPlan();
  const setSectionAccepted = useSetReviewSectionAccepted();
  const addMealMutation = useAddNutritionPlanMeal();
  const moveMealMutation = useMoveNutritionPlanMeal();
  const removeMealMutation = useRemoveNutritionPlanMeal();
  const copyDayMutation = useCopyNutritionDayMeals();

  const answers = (onboardingAnswers?.answers || {}) as Record<string, any>;

  const [name, setName] = useState(nutritionPlan?.name || 'MetriqFit Adaptive Nutrition Plan');
  const [description, setDescription] = useState(nutritionPlan?.description || '');
  const [mealsPerDay, setMealsPerDay] = useState(String(answers.meals_per_day || '3'));
  const [dietaryPreference, setDietaryPreference] = useState(String(answers.dietary_preference || 'anything'));
  const [allergies, setAllergies] = useState(Array.isArray(answers.allergies_exclusions) ? answers.allergies_exclusions.join(', ') : '');
  const [refusedFoods, setRefusedFoods] = useState(Array.isArray(answers.refused_foods) ? answers.refused_foods.join(', ') : '');
  const [showCopySheet, setShowCopySheet] = useState(false);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);

  useEffect(() => {
    setSelectedDay(initialDay);
  }, [initialDay]);

  useEffect(() => {
    if (nutritionLoading || onboardingLoading || !nutritionPlan) return;
    setName(nutritionPlan?.name || 'MetriqFit Adaptive Nutrition Plan');
    setDescription(nutritionPlan?.description || '');
    setMealsPerDay(String(answers.meals_per_day || '3'));
    setDietaryPreference(String(answers.dietary_preference || 'anything'));
    setAllergies(Array.isArray(answers.allergies_exclusions) ? answers.allergies_exclusions.join(', ') : '');
    setRefusedFoods(Array.isArray(answers.refused_foods) ? answers.refused_foods.join(', ') : '');
  }, [
    answers.allergies_exclusions,
    answers.dietary_preference,
    answers.meals_per_day,
    answers.refused_foods,
    nutritionLoading,
    nutritionPlan,
    onboardingLoading,
  ]);

  const sortedMeals = useMemo(() => {
    if (!selectedDayMeals?.meals?.length) return [];
    return [...selectedDayMeals.meals].sort((a, b) => (SLOT_INDEX[a.meal_slot] ?? 99) - (SLOT_INDEX[b.meal_slot] ?? 99));
  }, [selectedDayMeals?.meals]);

  const usedSlots = useMemo(() => new Set(sortedMeals.map((meal) => meal.meal_slot)), [sortedMeals]);
  const nextAvailableSlot = useMemo(
    () => SLOT_SEQUENCE.find((slot) => !usedSlots.has(slot)),
    [usedSlots],
  );

  const isApplyingStructuralChanges =
    addMealMutation.isPending
    || moveMealMutation.isPending
    || removeMealMutation.isPending
    || copyDayMutation.isPending;

  const markNutritionSectionDirty = async () => {
    if (!runId) return;
    try {
      await setSectionAccepted.mutateAsync({ runId, section: 'nutrition_plan', accepted: false });
    } catch {
      // Non-blocking.
    }
  };

  const handleAddMeal = async () => {
    if (!nextAvailableSlot) {
      Alert.alert('Max meals reached', 'This day already has all available meal slots.');
      return;
    }

    try {
      await addMealMutation.mutateAsync({
        dayOfWeek: selectedDay,
        mealSlot: nextAvailableSlot,
      });
      await markNutritionSectionDirty();
    } catch (error: any) {
      Alert.alert('Add meal failed', error?.message || 'Unable to add meal.');
    }
  };

  const handleMoveMeal = async (planMealId: string, direction: 'up' | 'down') => {
    try {
      await moveMealMutation.mutateAsync({ planMealId, direction });
      await markNutritionSectionDirty();
    } catch (error: any) {
      Alert.alert('Reorder failed', error?.message || 'Unable to reorder meal.');
    }
  };

  const handleRemoveMeal = (planMealId: string) => {
    const runRemoval = async () => {
      try {
        await removeMealMutation.mutateAsync({ planMealId });
        await markNutritionSectionDirty();
      } catch (error: any) {
        Alert.alert('Remove failed', error?.message || 'Unable to remove meal.');
      }
    };

    if (Platform.OS === 'web') {
      runRemoval();
      return;
    }

    Alert.alert(
      'Remove meal',
      'This will remove the meal and its variants for this day.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: runRemoval },
      ],
    );
  };

  const toggleCopyTarget = (day: number) => {
    setCopyTargets((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      return [...prev, day];
    });
  };

  const openCopySheet = () => {
    const defaults = DAY_OPTIONS
      .map((option) => option.value)
      .filter((value) => value !== selectedDay);
    setCopyTargets(defaults);
    setShowCopySheet(true);
  };

  const handleApplyCopy = async () => {
    if (!copyTargets.length) {
      Alert.alert('Select days', 'Choose at least one day to copy into.');
      return;
    }

    try {
      await copyDayMutation.mutateAsync({
        sourceDayOfWeek: selectedDay,
        targetDaysOfWeek: copyTargets,
      });
      await markNutritionSectionDirty();
      setShowCopySheet(false);
    } catch (error: any) {
      Alert.alert('Copy failed', error?.message || 'Unable to copy meals to selected days.');
    }
  };

  const openMealEditor = (mealId: string) => {
    // Use local onboarding route to stay within onboarding navigation group
    router.push({
      pathname: '/(onboarding)/plan-meal-editor',
      params: {
        mealId,
        ...(runId ? { runId } : {}),
        dayOfWeek: String(selectedDay),
      },
    });
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please provide a nutrition plan name.');
      return;
    }

    try {
      await updateNutrition.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        meals_per_day: mealsPerDay as any,
        dietary_preference: dietaryPreference,
        allergies_exclusions: normalizeCsv(allergies),
        refused_foods: normalizeCsv(refusedFoods),
      });

      if (runId) {
        await setSectionAccepted.mutateAsync({ runId, section: 'nutrition_plan', accepted: false });
      }

      trackEvent('plan_review_section_edited', { section: 'nutrition_plan', generation_run_id: runId });
      router.replace({ pathname: '/(onboarding)/plan-review', params: runId ? { runId } : undefined });
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Unable to save nutrition plan changes.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + s.md }]}> 
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable style={[styles.iconButton, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.md }]} onPress={() => router.back()}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>Edit Nutrition Plan</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: insets.bottom + s.xl }}>
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>Plan name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md, fontFamily: ty.body.family }]}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={[styles.textArea, { color: c.text, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md, fontFamily: ty.body.family }]}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>Meals per day</Text>
          <View style={styles.rowWrap}>
            {MEAL_OPTIONS.map((option) => {
              const selected = mealsPerDay === option;
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? c.primary : c.surface,
                      borderColor: selected ? c.primary : c.border,
                      borderRadius: r.pill,
                    },
                  ]}
                  onPress={() => setMealsPerDay(option)}
                >
                  <Text style={{ color: selected ? c.bg : c.text, fontFamily: ty.body.familySemibold }}>
                    {option.replace('_', ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>Dietary preference</Text>
          <View style={styles.rowWrap}>
            {DIET_OPTIONS.map((option) => {
              const selected = dietaryPreference === option;
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? c.primary : c.surface,
                      borderColor: selected ? c.primary : c.border,
                      borderRadius: r.pill,
                    },
                  ]}
                  onPress={() => setDietaryPreference(option)}
                >
                  <Text style={{ color: selected ? c.bg : c.text, fontFamily: ty.body.familySemibold }}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>Allergies / exclusions (comma separated)</Text>
          <TextInput
            value={allergies}
            onChangeText={setAllergies}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md, fontFamily: ty.body.family }]}
            placeholder="e.g. dairy, peanuts"
            placeholderTextColor={c.textSubtle}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: c.text, fontFamily: ty.body.familySemibold }]}>Refused foods (comma separated)</Text>
          <TextInput
            value={refusedFoods}
            onChangeText={setRefusedFoods}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md, fontFamily: ty.body.family }]}
            placeholder="e.g. pork, shellfish"
            placeholderTextColor={c.textSubtle}
          />
        </View>

        <View style={[styles.advancedCard, { borderColor: c.border, backgroundColor: c.surface, borderRadius: r.lg }]}> 
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Meal-Level Customization
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4, fontSize: 12 }}>
            Pick a day and edit each meal’s ingredients, volumes, and macros.
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              style={[styles.actionButton, { borderColor: c.primary, borderRadius: r.pill, opacity: nextAvailableSlot ? 1 : 0.5 }]}
              onPress={handleAddMeal}
              disabled={!nextAvailableSlot || isApplyingStructuralChanges}
            >
              <TabBarIcon name="add" color={c.primary} size={14} />
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                Add meal
              </Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, { borderColor: c.border, borderRadius: r.pill }]}
              onPress={openCopySheet}
              disabled={isApplyingStructuralChanges}
            >
              <TabBarIcon name="copy-outline" color={c.textMuted} size={14} />
              <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                Copy day
              </Text>
            </Pressable>
          </View>

          <View style={[styles.rowWrap, { marginTop: 10 }]}>
            {DAY_OPTIONS.map((option) => {
              const selected = selectedDay === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.dayChip,
                    {
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: selected ? c.primary : c.bg,
                      borderRadius: r.md,
                    },
                  ]}
                  onPress={() => setSelectedDay(option.value)}
                >
                  <Text style={{ color: selected ? c.bg : c.text, fontFamily: ty.body.familySemibold, fontSize: 12 }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 10 }}>
            {selectedDayMealsLoading ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: 20 }} />
            ) : !sortedMeals.length ? (
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 12 }}>
                No meals generated yet for this day.
              </Text>
            ) : (
              sortedMeals.map((meal, idx) => {
                const src = meal.selected_variant;
                const calories = toNumber(src?.target_calories ?? meal.target_calories);
                const protein = toNumber(src?.target_protein ?? meal.target_protein);
                const carbs = toNumber(src?.target_carbs ?? meal.target_carbs);
                const fat = toNumber(src?.target_fat ?? meal.target_fat);
                const canMoveUp = idx > 0;
                const canMoveDown = idx < sortedMeals.length - 1;

                return (
                  <View key={meal.id} style={[styles.mealCard, { borderColor: c.border, borderRadius: r.md, backgroundColor: c.bg }]}> 
                    <View style={styles.mealHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
                          {slotLabel(meal.meal_slot)}: {src?.name || meal.name}
                        </Text>
                        <MacroInlineSummary
                          size="sm"
                          style={{ marginTop: 4 }}
                          items={[
                            { macro: 'calories', value: Math.round(calories), unit: ' kcal' },
                            { macro: 'protein', value: Math.round(protein), unit: 'g' },
                            { macro: 'carbs', value: Math.round(carbs), unit: 'g' },
                            { macro: 'fat', value: Math.round(fat), unit: 'g' },
                          ]}
                        />
                      </View>
                      <Pressable
                        style={[styles.editMealButton, { borderColor: c.primary, borderRadius: r.pill }]}
                        onPress={() => openMealEditor(meal.id)}
                        disabled={isApplyingStructuralChanges}
                      >
                        <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 11 }}>Edit meal</Text>
                      </Pressable>
                    </View>

                    <View style={styles.mealToolsRow}>
                      <Pressable
                        style={[styles.toolButton, { borderColor: c.border, borderRadius: r.sm, opacity: canMoveUp ? 1 : 0.4 }]}
                        onPress={() => handleMoveMeal(meal.id, 'up')}
                        disabled={!canMoveUp || isApplyingStructuralChanges}
                      >
                        <TabBarIcon name="chevron-up" color={c.textMuted} size={14} />
                      </Pressable>
                      <Pressable
                        style={[styles.toolButton, { borderColor: c.border, borderRadius: r.sm, opacity: canMoveDown ? 1 : 0.4 }]}
                        onPress={() => handleMoveMeal(meal.id, 'down')}
                        disabled={!canMoveDown || isApplyingStructuralChanges}
                      >
                        <TabBarIcon name="chevron-down" color={c.textMuted} size={14} />
                      </Pressable>
                      <Pressable
                        style={[styles.toolButton, { borderColor: c.border, borderRadius: r.sm }]}
                        onPress={() => handleRemoveMeal(meal.id)}
                        disabled={isApplyingStructuralChanges}
                      >
                        <TabBarIcon name="trash-outline" color={c.textMuted} size={14} />
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <Pressable style={[styles.saveButton, { backgroundColor: c.primary, borderRadius: r.md, opacity: updateNutrition.isPending ? 0.7 : 1 }]} onPress={save} disabled={updateNutrition.isPending}>
          {updateNutrition.isPending ? (
            <ActivityIndicator color={c.bg} size="small" />
          ) : (
            <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold }}>Save Nutrition Customizations</Text>
          )}
        </Pressable>
      </ScrollView>

      {showCopySheet ? (
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCopySheet(false)} />
          <View style={[styles.copySheet, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg }]}> 
            <View style={styles.copyHeader}>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                Copy Day Plan
              </Text>
              <Pressable onPress={() => setShowCopySheet(false)}>
                <TabBarIcon name="close" color={c.textMuted} size={16} />
              </Pressable>
            </View>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 12, marginBottom: 10 }}>
              Source: {DAY_OPTIONS.find((option) => option.value === selectedDay)?.label}. Select destination days.
            </Text>
            <View style={styles.rowWrap}>
              {DAY_OPTIONS.filter((option) => option.value !== selectedDay).map((option) => {
                const selected = copyTargets.includes(option.value);
                return (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.dayChip,
                      {
                        borderColor: selected ? c.primary : c.border,
                        backgroundColor: selected ? c.primary : c.bg,
                        borderRadius: r.md,
                      },
                    ]}
                    onPress={() => toggleCopyTarget(option.value)}
                  >
                    <Text style={{ color: selected ? c.bg : c.text, fontFamily: ty.body.familySemibold, fontSize: 12 }}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              style={[styles.copyApplyButton, { backgroundColor: c.primary, borderRadius: r.md, opacity: copyDayMutation.isPending ? 0.7 : 1 }]}
              onPress={handleApplyCopy}
              disabled={copyDayMutation.isPending}
            >
              {copyDayMutation.isPending ? (
                <ActivityIndicator color={c.bg} size="small" />
              ) : (
                <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold }}>Apply Copy</Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldWrap: { marginBottom: 12 },
  label: {
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChip: {
    borderWidth: 1,
    minWidth: 52,
    height: 34,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedCard: {
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  actionRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    borderWidth: 1,
    minHeight: 32,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  mealCard: {
    borderWidth: 1,
    padding: 10,
    marginTop: 8,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  editMealButton: {
    borderWidth: 1,
    height: 30,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  mealToolsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
  },
  toolButton: {
    borderWidth: 1,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 12,
  },
  copySheet: {
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  copyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  copyApplyButton: {
    marginTop: 8,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
