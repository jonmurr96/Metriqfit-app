import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabBarIcon } from '../components/navigation/TabBarIcon';
import { useTriggerPlanGeneration } from '../hooks/usePlan';
import { useOnboardingAnswers, useProfile, useUpdateWeightGoal } from '../hooks/useUser';
import { useTokens } from '../lib/theme';
import { kgToLb } from '../lib/progress/weight-units';

export default function SetWeightGoalSheet() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile } = useProfile();
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const updateWeightGoalMutation = useUpdateWeightGoal();
  const regeneratePlanMutation = useTriggerPlanGeneration();
  const isImperial = profile?.unit_system !== 'metric';
  const unit = isImperial ? 'lb' : 'kg';
  const currentWeightLb = profile?.current_weight_kg ? kgToLb(profile.current_weight_kg) : null;
  const currentDisplayWeight = profile?.current_weight_kg
    ? isImperial
      ? Math.round(kgToLb(profile.current_weight_kg) * 10) / 10
      : Math.round(profile.current_weight_kg * 10) / 10
    : null;

  const previousAnswers = (onboardingAnswers?.answers || {}) as Record<string, unknown>;
  const previousGoalType = typeof previousAnswers.goal_type === 'string'
    ? previousAnswers.goal_type
    : null;
  const previousGoalLb = typeof previousAnswers.target_weight_lb === 'number'
    ? previousAnswers.target_weight_lb
    : typeof previousAnswers.target_weight_lb === 'string'
      ? Number.parseFloat(previousAnswers.target_weight_lb)
      : null;

  const initialMode = useMemo<'gain' | 'lose'>(() => {
    if (previousGoalType === 'lose_weight' || previousGoalType === 'recomp') return 'lose';
    if (previousGoalType === 'gain_weight' || previousGoalType === 'build_muscle') return 'gain';
    if (currentWeightLb == null || previousGoalLb == null || !Number.isFinite(previousGoalLb)) return 'gain';
    return previousGoalLb < currentWeightLb ? 'lose' : 'gain';
  }, [currentWeightLb, previousGoalLb, previousGoalType]);

  const suggestedGoal = useMemo(() => {
    if (currentDisplayWeight == null) return '';
    const delta = isImperial ? 10 : 5;
    const direction = initialMode === 'gain' ? 1 : -1;
    return String(Math.round((currentDisplayWeight + direction * delta) * 10) / 10);
  }, [currentDisplayWeight, initialMode, isImperial]);

  const [goalInput, setGoalInput] = useState('');
  const [mode, setMode] = useState<'gain' | 'lose'>(initialMode);
  const isSaving = updateWeightGoalMutation.isPending || regeneratePlanMutation.isPending;

  useEffect(() => {
    if (!currentDisplayWeight || goalInput) return;
    setMode(initialMode);
    setGoalInput(suggestedGoal);
  }, [currentDisplayWeight, goalInput, initialMode, suggestedGoal]);

  const regenerateNutritionPlan = async () => {
    try {
      await regeneratePlanMutation.mutateAsync({
        planType: 'nutrition',
        options: {
          generation_horizon_days: { nutrition: 7 },
          include_variants: true,
          macro_tolerance_percent: 10,
        },
      });
      Alert.alert('Plan updated', 'Your nutrition plan has been rebuilt from the new macros.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      Alert.alert('Plan regeneration failed', error?.message || 'Your macros were updated, but the nutrition plan could not be regenerated right now.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    }
  };

  const handleModeChange = (nextMode: 'gain' | 'lose') => {
    setMode(nextMode);
    if (currentDisplayWeight == null) return;
    const delta = isImperial ? 10 : 5;
    const nextGoal = nextMode === 'gain' ? currentDisplayWeight + delta : currentDisplayWeight - delta;
    setGoalInput(String(Math.round(nextGoal * 10) / 10));
  };

  const handleSave = async () => {
    if (currentWeightLb == null) {
      Alert.alert('Current weight needed', 'Log your current weight before setting the next goal.');
      return;
    }

    const parsedGoal = Number.parseFloat(goalInput);
    if (!Number.isFinite(parsedGoal) || parsedGoal <= 0) {
      Alert.alert('Invalid goal', 'Enter a valid target weight.');
      return;
    }

    const targetWeightLb = isImperial ? parsedGoal : kgToLb(parsedGoal);
    if (targetWeightLb < 70 || targetWeightLb > 700) {
      Alert.alert('Invalid goal', 'Set a goal weight between 70 and 700 lb.');
      return;
    }

    const currentRoundedLb = Math.round(currentWeightLb * 10) / 10;
    if (Math.abs(targetWeightLb - currentRoundedLb) < 0.5) {
      Alert.alert('Choose a new target', 'Set a target above or below your current weight.');
      return;
    }

    try {
      await updateWeightGoalMutation.mutateAsync({
        currentWeightLb: currentRoundedLb,
        targetWeightLb: Math.round(targetWeightLb * 10) / 10,
      });
      Alert.alert(
        'Goal updated',
        'Your calorie, macro, and water targets were recalculated. Regenerate the nutrition plan now so meals match the new targets.',
        [
          { text: 'Later', style: 'cancel', onPress: () => router.back() },
          { text: 'Regenerate Plan', onPress: regenerateNutritionPlan },
        ],
      );
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Could not save your new goal.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg, paddingTop: s.lg }]}>
        <View style={styles.handleBar}>
          <View style={[styles.handle, { backgroundColor: c.textSubtle }]} />
        </View>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeButton, { backgroundColor: c.surface }]}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <TabBarIcon name="close" color={c.text} size={20} />
          </Pressable>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>
            New Weight Goal
          </Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      <View style={[styles.content, { padding: s.xl }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              borderRadius: r.lg,
              padding: s.xl,
            },
          ]}
        >
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
            CONGRATULATIONS
          </Text>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 30, lineHeight: 36, marginTop: s.sm }}>
            Set the next target
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, lineHeight: 20, marginTop: s.sm }}>
            Your current weight becomes the new starting point. Calories, macros, and water targets update from the same formula used during onboarding.
          </Text>

          <View style={[styles.modeRow, { gap: s.sm, marginTop: s.xl }]}>
            {[
              { id: 'gain' as const, label: 'Gain' },
              { id: 'lose' as const, label: 'Lose' },
            ].map((option) => {
              const selected = option.id === mode;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => handleModeChange(option.id)}
                  style={[
                    styles.modeButton,
                    {
                      borderRadius: r.md,
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: selected ? `${c.primary}16` : c.surface2,
                    },
                  ]}
                >
                  <Text style={{ color: selected ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.weightRow, { marginTop: s.xl }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                Current
              </Text>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: 4 }}>
                {currentDisplayWeight == null ? '--' : `${currentDisplayWeight} ${unit}`}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                New goal
              </Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={goalInput}
                  onChangeText={setGoalInput}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  placeholder="0"
                  placeholderTextColor={c.textSubtle}
                  style={{ color: c.text, fontFamily: ty.mono.family, fontSize: 30, minWidth: 80 }}
                />
                <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                  {unit}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingHorizontal: s.lg, paddingBottom: insets.bottom + s.lg, paddingTop: s.lg }]}>
        <Pressable
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveButton, { borderRadius: r.md, backgroundColor: c.primary }]}
        >
          {isSaving ? (
            <ActivityIndicator color={c.bg} />
          ) : (
            <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
              Save New Goal
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {},
  handleBar: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
  },
  modeRow: {
    flexDirection: 'row',
  },
  modeButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  weightRow: {
    flexDirection: 'row',
    gap: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  saveButton: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
