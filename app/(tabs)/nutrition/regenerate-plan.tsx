import React from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { useTokens } from '../../../lib/theme';
import { NutritionPreviewBanner } from '../../../components/nutrition/NutritionPreviewBanner';
import { NutritionSectionShell } from '../../../components/nutrition/NutritionSectionShell';
import {
  useEditableNutritionPlanContext,
  useGenerateNutritionPlanPreview,
  useApplyNutritionPlanPreview,
  useDiscardNutritionPlanPreview,
} from '../../../hooks/usePlan';
import {
  trackNutritionPlanPreviewApplied,
  trackNutritionPlanPreviewDiscarded,
  trackNutritionPlanPreviewOpened,
} from '../../../lib/analytics';
import { buildNutritionPlanDiff } from '../../../lib/nutrition/plan-regeneration-diff';
import {
  buildNutritionPlanComparableSnapshot,
  type NutritionRegenerationIssueFlag,
  type NutritionRegenerationReason,
} from '../../../services/planService';

const REASON_OPTIONS: { id: NutritionRegenerationReason; label: string }[] = [
  { id: 'not_hitting_macros', label: 'Macros are off' },
  { id: 'too_repetitive', label: 'Need more variety' },
  { id: 'prep_takes_too_long', label: 'Prep is too slow' },
  { id: 'budget_changed', label: 'Budget changed' },
  { id: 'dietary_preferences_changed', label: 'Diet preferences changed' },
  { id: 'allergy_or_food_issue', label: 'Food or allergy issue' },
  { id: 'schedule_changed', label: 'Schedule changed' },
  { id: 'want_different_meals', label: 'Want different meals' },
  { id: 'other', label: 'Other' },
];

const ISSUE_OPTIONS: { id: NutritionRegenerationIssueFlag; label: string }[] = [
  { id: 'too_many_meals', label: 'Too many meals' },
  { id: 'too_few_meals', label: 'Too few meals' },
  { id: 'wrong_macros', label: 'Wrong macros' },
  { id: 'need_more_variety', label: 'Need more variety' },
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'prep_too_complex', label: 'Prep too complex' },
  { id: 'foods_i_wont_eat', label: 'Foods I will not eat' },
];

function splitCsv(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function toNumberOrNull(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function NutritionRegeneratePlanScreen() {
  const { user } = useAuth();
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const editableContextQuery = useEditableNutritionPlanContext();
  const generatePreviewMutation = useGenerateNutritionPlanPreview();
  const applyPreviewMutation = useApplyNutritionPlanPreview();
  const discardPreviewMutation = useDiscardNutritionPlanPreview();

  const livePlan = editableContextQuery.data?.livePlan || null;
  const previewPlan = editableContextQuery.data?.previewPlan || null;

  const [reason, setReason] = React.useState<NutritionRegenerationReason>('want_different_meals');
  const [issueFlags, setIssueFlags] = React.useState<NutritionRegenerationIssueFlag[]>([]);
  const [mealsPerDayOverride, setMealsPerDayOverride] = React.useState('');
  const [dietaryPreferenceOverride, setDietaryPreferenceOverride] = React.useState('');
  const [allergies, setAllergies] = React.useState('');
  const [refusedFoods, setRefusedFoods] = React.useState('');
  const [prepTimeTargetMin, setPrepTimeTargetMin] = React.useState('');
  const [budgetLimit, setBudgetLimit] = React.useState('');
  const [keepMealSlots, setKeepMealSlots] = React.useState(true);
  const [startFresh, setStartFresh] = React.useState(false);
  const [lastValidationFailure, setLastValidationFailure] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!previewPlan) return;
    trackNutritionPlanPreviewOpened({
      preview_plan_id: previewPlan.id,
      replaces_plan_id: previewPlan.replaces_plan_id,
      source: 'regenerate_plan',
    });
  }, [previewPlan]);

  const diffQuery = useQuery({
    queryKey: ['nutrition-preview-diff', user?.id || '', livePlan?.id || '', previewPlan?.id || ''],
    enabled: !!user && !!livePlan && !!previewPlan,
    queryFn: async () => {
      const [currentPlan, previewComparable] = await Promise.all([
        buildNutritionPlanComparableSnapshot(user!.id, livePlan!),
        buildNutritionPlanComparableSnapshot(user!.id, previewPlan!),
      ]);
      return buildNutritionPlanDiff({
        currentPlan,
        previewPlan: previewComparable,
      });
    },
    staleTime: 30 * 1000,
  });

  const toggleIssueFlag = React.useCallback((flag: NutritionRegenerationIssueFlag) => {
    setIssueFlags((current) => {
      if (current.includes(flag)) {
        return current.filter((value) => value !== flag);
      }
      return [...current, flag];
    });
  }, []);

  const handleGeneratePreview = React.useCallback(async () => {
    if (!livePlan) {
      Alert.alert('No live plan', 'A live nutrition plan is required before you can create a regeneration preview.');
      return;
    }

    setLastValidationFailure(null);

    try {
      const result = await generatePreviewMutation.mutateAsync({
        current_plan_id: livePlan.id,
        reason,
        issue_flags: issueFlags,
        meals_per_day_override: toNumberOrNull(mealsPerDayOverride),
        dietary_preference_override: dietaryPreferenceOverride.trim() || null,
        allergies: splitCsv(allergies),
        refused_foods: splitCsv(refusedFoods),
        prep_time_target_min: toNumberOrNull(prepTimeTargetMin),
        budget_limit: toNumberOrNull(budgetLimit),
        keep_meal_slots: keepMealSlots,
        start_fresh: startFresh,
      });

      if ('status' in result && result.status === 'validation_failed') {
        setLastValidationFailure(result.message);
        return;
      }

      editableContextQuery.refetch();
      diffQuery.refetch();
    } catch (error: any) {
      Alert.alert('Preview failed', error?.message || 'Could not create a nutrition preview.');
    }
  }, [
    allergies,
    budgetLimit,
    dietaryPreferenceOverride,
    diffQuery,
    editableContextQuery,
    generatePreviewMutation,
    issueFlags,
    keepMealSlots,
    livePlan,
    mealsPerDayOverride,
    prepTimeTargetMin,
    reason,
    refusedFoods,
    startFresh,
  ]);

  const handleApplyPreview = React.useCallback(async () => {
    if (!previewPlan) return;
    try {
      await applyPreviewMutation.mutateAsync(previewPlan.id);
      trackNutritionPlanPreviewApplied({ preview_plan_id: previewPlan.id, source: 'regenerate_plan' });
      router.replace('/(tabs)/nutrition/my-plan');
    } catch (error: any) {
      Alert.alert('Apply failed', error?.message || 'Could not apply this nutrition preview.');
    }
  }, [applyPreviewMutation, previewPlan, router]);

  const handleDiscardPreview = React.useCallback(async () => {
    if (!previewPlan) return;
    try {
      await discardPreviewMutation.mutateAsync(previewPlan.id);
      trackNutritionPlanPreviewDiscarded({ preview_plan_id: previewPlan.id, source: 'regenerate_plan' });
      router.replace('/(tabs)/nutrition/my-plan');
    } catch (error: any) {
      Alert.alert('Discard failed', error?.message || 'Could not discard this nutrition preview.');
    }
  }, [discardPreviewMutation, previewPlan, router]);

  return (
    <NutritionSectionShell title="Regenerate Plan" primarySection="plan" showBackButton>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + s.xl, gap: s.lg }}
      >
        {previewPlan ? (
          <NutritionPreviewBanner
            previewName={previewPlan.name || 'Preview nutrition plan'}
            onReview={() => {}}
          />
        ) : null}

        {!livePlan ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: c.surface,
                borderRadius: r.xl,
                borderWidth: 1,
                borderColor: c.border,
                padding: s.lg,
              },
            ]}
          >
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
              No live nutrition plan
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
              Generate the first live nutrition plan from the Plan screen before creating regeneration previews.
            </Text>
            <Pressable
              onPress={() => router.replace('/(tabs)/nutrition/my-plan')}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: c.primary,
                  borderRadius: r.lg,
                  marginTop: s.lg,
                },
              ]}
            >
              <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                Back to Plan
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: c.surface,
                  borderRadius: r.xl,
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: s.lg,
                },
              ]}
            >
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
                What needs to change?
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
                This creates a preview only. Your current live plan stays active until you explicitly apply the new version.
              </Text>

              <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginTop: s.lg }]}>
                PRIMARY REASON
              </Text>
              <View style={styles.chipGroup}>
                {REASON_OPTIONS.map((option) => (
                  <Chip
                    key={option.id}
                    label={option.label}
                    active={reason === option.id}
                    onPress={() => setReason(option.id)}
                  />
                ))}
              </View>

              <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginTop: s.lg }]}>
                ISSUE FLAGS
              </Text>
              <View style={styles.chipGroup}>
                {ISSUE_OPTIONS.map((option) => (
                  <Chip
                    key={option.id}
                    label={option.label}
                    active={issueFlags.includes(option.id)}
                    onPress={() => toggleIssueFlag(option.id)}
                  />
                ))}
              </View>

              <View style={styles.fieldRow}>
                <Field label="Meals / day" value={mealsPerDayOverride} onChangeText={setMealsPerDayOverride} keyboardType="number-pad" />
                <Field label="Prep target min" value={prepTimeTargetMin} onChangeText={setPrepTimeTargetMin} keyboardType="number-pad" />
              </View>

              <View style={styles.fieldRow}>
                <Field label="Budget limit" value={budgetLimit} onChangeText={setBudgetLimit} keyboardType="decimal-pad" />
                <Field label="Diet preference" value={dietaryPreferenceOverride} onChangeText={setDietaryPreferenceOverride} />
              </View>

              <Field label="Allergies (comma separated)" value={allergies} onChangeText={setAllergies} />
              <Field label="Refused foods (comma separated)" value={refusedFoods} onChangeText={setRefusedFoods} />

              <View style={styles.toggleRow}>
                <ToggleLine label="Keep current meal slots" active={keepMealSlots} onPress={() => setKeepMealSlots((value) => !value)} />
                <ToggleLine label="Start fresh" active={startFresh} onPress={() => setStartFresh((value) => !value)} />
              </View>

              {lastValidationFailure ? (
                <Text style={{ color: c.warning, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.md }}>
                  {lastValidationFailure}
                </Text>
              ) : null}

              <Pressable
                onPress={handleGeneratePreview}
                disabled={generatePreviewMutation.isPending}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: c.primary,
                    borderRadius: r.lg,
                    marginTop: s.lg,
                  },
                ]}
              >
                {generatePreviewMutation.isPending ? (
                  <ActivityIndicator color={c.bg} size="small" />
                ) : (
                  <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Generate Preview
                  </Text>
                )}
              </Pressable>
            </View>

            {previewPlan ? (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: c.surface,
                    borderRadius: r.xl,
                    borderWidth: 1,
                    borderColor: `${c.accent}35`,
                    padding: s.lg,
                  },
                ]}
              >
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
                  Preview review
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
                  Compare the pending preview against the current live plan before applying it.
                </Text>

                {diffQuery.isLoading ? (
                  <View style={styles.loadingInline}>
                    <ActivityIndicator color={c.primary} />
                  </View>
                ) : diffQuery.data ? (
                  <>
                    <View style={[styles.summaryGrid, { marginTop: s.lg }]}>
                      <SummaryStat label="Changed days" value={String(diffQuery.data.changedDayCount)} />
                      <SummaryStat label="Changed meals" value={String(diffQuery.data.changedMealCount)} />
                      <SummaryStat label="Changed slots" value={String(diffQuery.data.changedSlotCount)} />
                    </View>

                    {diffQuery.data.changeSummary.slice(0, 4).map((line) => (
                      <Text
                        key={line}
                        style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}
                      >
                        {line}
                      </Text>
                    ))}

                    {diffQuery.data.replacedMealNames.slice(0, 4).map((change) => (
                      <Text
                        key={`${change.dayOfWeek}-${change.mealSlot}-${change.previewMealName}`}
                        style={{ color: c.textSubtle, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.sm }}
                      >
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][change.dayOfWeek]} {change.mealSlot}: {change.currentMealName} {'->'} {change.previewMealName}
                      </Text>
                    ))}

                    <View style={[styles.actionRow, { marginTop: s.lg }]}>
                      <Pressable
                        onPress={handleApplyPreview}
                        disabled={applyPreviewMutation.isPending}
                        style={[
                          styles.primaryButton,
                          {
                            flex: 1,
                            backgroundColor: c.primary,
                            borderRadius: r.lg,
                          },
                        ]}
                      >
                        {applyPreviewMutation.isPending ? (
                          <ActivityIndicator color={c.bg} size="small" />
                        ) : (
                          <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                            Apply Preview
                          </Text>
                        )}
                      </Pressable>
                      <Pressable
                        onPress={handleDiscardPreview}
                        disabled={discardPreviewMutation.isPending}
                        style={[
                          styles.secondaryButton,
                          {
                            flex: 1,
                            borderRadius: r.lg,
                            borderWidth: 1,
                            borderColor: `${c.warning}45`,
                            backgroundColor: c.bg,
                          },
                        ]}
                      >
                        {discardPreviewMutation.isPending ? (
                          <ActivityIndicator color={c.warning} size="small" />
                        ) : (
                          <Text style={{ color: c.warning, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                            Discard Preview
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.md }}>
                    Diff details are not available yet. The preview is still ready to review from the Plan screen.
                  </Text>
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </NutritionSectionShell>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { c, ty, r } = useTokens();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderRadius: r.pill,
          borderWidth: 1,
          borderColor: active ? c.primary : c.border,
          backgroundColor: active ? `${c.primary}15` : c.bg,
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
      ]}
    >
      <Text style={{ color: active ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
}) {
  const { c, s, ty, r } = useTokens();
  return (
    <View style={styles.field}>
      <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.xs }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={label}
        placeholderTextColor={c.textSubtle}
        style={[
          styles.input,
          {
            color: c.text,
            borderColor: c.border,
            backgroundColor: c.bg,
            borderRadius: r.lg,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
            paddingHorizontal: 14,
            paddingVertical: 12,
          },
        ]}
      />
    </View>
  );
}

function ToggleLine({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { c, ty, r } = useTokens();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggleLine,
        {
          borderRadius: r.lg,
          borderWidth: 1,
          borderColor: active ? c.primary : c.border,
          backgroundColor: active ? `${c.primary}14` : c.bg,
          paddingHorizontal: 14,
          paddingVertical: 12,
        },
      ]}
    >
      <Text style={{ color: active ? c.primary : c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SummaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { c, s, ty, r } = useTokens();
  return (
    <View
      style={[
        styles.summaryStat,
        {
          backgroundColor: c.bg,
          borderRadius: r.lg,
          padding: s.md,
        },
      ]}
    >
      <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
        {label}
      </Text>
      <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.xs }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  chip: {},
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  field: {
    flex: 1,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
  },
  label: {
    letterSpacing: 1.1,
  },
  toggleRow: {
    gap: 12,
    marginTop: 16,
  },
  toggleLine: {},
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  loadingInline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryStat: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
