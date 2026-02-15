import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { metriqfitTheme } from '../../lib/theme';
import {
  useOnboarding,
  GoalType,
  ActivityLevel,
  SleepHours,
  PrepDiscipline,
  PrepPhase,
} from '../../lib/onboarding';
import {
  PremiumHeader,
  PremiumTitle,
  PremiumFooter,
  PremiumOptionCard,
} from '../../components/onboarding/premium';

const { onboarding: o, spacing: s, radius: r } = metriqfitTheme;

const goalOptions: { value: GoalType; label: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: keyof typeof o.iconColors }[] = [
  { value: 'lose_weight', label: 'Lose Weight', description: 'Burn fat and get leaner', icon: 'flame-outline', color: 'red' },
  { value: 'gain_weight', label: 'Gain Weight', description: 'Build mass and size', icon: 'trending-up-outline', color: 'green' },
  { value: 'maintain_weight', label: 'Maintain Weight', description: 'Stay at your current weight', icon: 'analytics-outline', color: 'cyan' },
  { value: 'recomp', label: 'Body Recomposition', description: 'Lose fat, build muscle', icon: 'body-outline', color: 'purple' },
  { value: 'increase_endurance', label: 'Increase Endurance', description: 'Improve cardio and stamina', icon: 'heart-outline', color: 'orange' },
  { value: 'general_fitness', label: 'General Fitness', description: 'Get healthier overall', icon: 'fitness-outline', color: 'teal' },
];

const activityOptions: { value: ActivityLevel; label: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: keyof typeof o.iconColors }[] = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', icon: 'bed-outline', color: 'purple' },
  { value: 'lightly_active', label: 'Lightly Active', description: '1-3 days/week', icon: 'walk-outline', color: 'blue' },
  { value: 'moderately_active', label: 'Moderately Active', description: '3-5 days/week', icon: 'bicycle-outline', color: 'cyan' },
  { value: 'very_active', label: 'Very Active', description: '6-7 days/week', icon: 'barbell-outline', color: 'green' },
];

const sleepOptions: { value: SleepHours; label: string }[] = [
  { value: 'lt5', label: '< 5 hrs' },
  { value: '5_6', label: '5-6 hrs' },
  { value: '6_7', label: '6-7 hrs' },
  { value: '7_8', label: '7-8 hrs' },
  { value: '8_plus', label: '8+ hrs' },
];

const prepDisciplineOptions: { value: PrepDiscipline; label: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: keyof typeof o.iconColors }[] = [
  { value: 'bodybuilding', label: 'Bodybuilding', description: 'Hypertrophy and physique-focused prep', icon: 'barbell-outline', color: 'orange' },
  { value: 'powerlifting', label: 'Powerlifting', description: 'Strength performance and fatigue management', icon: 'fitness-outline', color: 'blue' },
];

const prepPhaseOptions: { value: PrepPhase; label: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: keyof typeof o.iconColors }[] = [
  { value: 'cut', label: 'Cut', description: 'Reduce body weight while preserving performance', icon: 'trending-down-outline', color: 'red' },
  { value: 'bulk', label: 'Bulk', description: 'Gain body weight with controlled surplus', icon: 'trending-up-outline', color: 'green' },
];

function defaultPrepPhase(goalType: GoalType | null): PrepPhase | null {
  if (goalType === 'lose_weight') return 'cut';
  if (goalType === 'gain_weight') return 'bulk';
  return null;
}

export default function GoalsLifestyleScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();
  const [avgSteps, setAvgSteps] = useState(data.avg_steps?.toString() || '');

  const handleGoalSelect = (goalType: GoalType) => {
    const mappedPhase = defaultPrepPhase(goalType);
    if (data.prep_mode_enabled && mappedPhase) {
      updateData({ goal_type: goalType, prep_phase: mappedPhase });
      return;
    }
    updateData({ goal_type: goalType });
  };

  const handlePrepModeToggle = (enabled: boolean) => {
    if (enabled) {
      updateData({
        prep_mode_enabled: true,
        prep_auto_adjust_enabled: true,
        prep_discipline: data.prep_discipline || 'bodybuilding',
        prep_phase: data.prep_phase || defaultPrepPhase(data.goal_type) || null,
      });
      return;
    }

    updateData({
      prep_mode_enabled: false,
      prep_discipline: null,
      prep_phase: null,
      prep_auto_adjust_enabled: false,
    });
  };

  const handleAvgStepsChange = (value: string) => {
    setAvgSteps(value);
    if (value === '') {
      updateData({ avg_steps: null });
    } else {
      const parsed = parseInt(value, 10);
      updateData({ avg_steps: Number.isNaN(parsed) ? null : parsed });
    }
  };

  const isValid =
    data.goal_type &&
    data.activity_level &&
    data.sleep_hours &&
    (!data.step_tracking || data.avg_steps) &&
    (!data.prep_mode_enabled || (data.prep_discipline && data.prep_phase));

  const handleContinue = () => {
    if (isValid) {
      setCurrentStep(4);
      router.push('/(onboarding)/training-setup');
    }
  };

  const handleBack = () => {
    setCurrentStep(2);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PremiumHeader currentStep={3} totalSteps={5} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 } as any}
            style={styles.content}
          >
            <PremiumTitle
              line1="What's your"
              line2Gradient="main goal?"
              subtitle="We'll personalize your experience"
            />

            {/* Goal Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select your goal</Text>
              {goalOptions.map((option) => (
                <PremiumOptionCard
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  icon={option.icon}
                  iconColor={option.color}
                  selected={data.goal_type === option.value}
                  onPress={() => handleGoalSelect(option.value)}
                />
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Enable AI Prep Coach (Elite)</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  style={[
                    styles.toggleButton,
                    data.prep_mode_enabled && styles.toggleButtonSelected,
                  ]}
                  onPress={() => handlePrepModeToggle(true)}
                >
                  <Text style={[styles.toggleText, data.prep_mode_enabled && styles.toggleTextSelected]}>
                    Enable
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.toggleButton,
                    data.prep_mode_enabled === false && styles.toggleButtonSelected,
                  ]}
                  onPress={() => handlePrepModeToggle(false)}
                >
                  <Text style={[styles.toggleText, data.prep_mode_enabled === false && styles.toggleTextSelected]}>
                    Off
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.hintText}>
                Prep mode enables check-in driven macro, meal, and workout adjustments for Elite users.
              </Text>
            </View>

            {data.prep_mode_enabled && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Prep discipline</Text>
                  {prepDisciplineOptions.map((option) => (
                    <PremiumOptionCard
                      key={option.value}
                      label={option.label}
                      description={option.description}
                      icon={option.icon}
                      iconColor={option.color}
                      selected={data.prep_discipline === option.value}
                      onPress={() => updateData({ prep_discipline: option.value, prep_auto_adjust_enabled: true })}
                    />
                  ))}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Prep phase</Text>
                  {prepPhaseOptions.map((option) => (
                    <PremiumOptionCard
                      key={option.value}
                      label={option.label}
                      description={option.description}
                      icon={option.icon}
                      iconColor={option.color}
                      selected={data.prep_phase === option.value}
                      onPress={() => updateData({ prep_phase: option.value, prep_auto_adjust_enabled: true })}
                    />
                  ))}
                  <Text style={styles.hintText}>
                    Auto-adjust is enabled when Prep Mode is on and your Elite subscription is active.
                  </Text>
                </View>
              </>
            )}

            {/* Sleep — moved BEFORE Activity Level for better discoverability */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>How much sleep do you get?</Text>
              <View style={styles.sleepRow}>
                {sleepOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.sleepButton,
                      data.sleep_hours === option.value && styles.sleepButtonSelected,
                    ]}
                    onPress={() => updateData({ sleep_hours: option.value })}
                  >
                    <Text
                      style={[
                        styles.sleepText,
                        data.sleep_hours === option.value && styles.sleepTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Step Tracking */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Do you track your steps?</Text>
              <View style={styles.toggleRow}>
                <Pressable
                  style={[
                    styles.toggleButton,
                    data.step_tracking && styles.toggleButtonSelected,
                  ]}
                  onPress={() => updateData({ step_tracking: true })}
                >
                  <Text style={[styles.toggleText, data.step_tracking && styles.toggleTextSelected]}>
                    Yes
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.toggleButton,
                    data.step_tracking === false && styles.toggleButtonSelected,
                  ]}
                  onPress={() => updateData({ step_tracking: false })}
                >
                  <Text style={[styles.toggleText, data.step_tracking === false && styles.toggleTextSelected]}>
                    No
                  </Text>
                </Pressable>
              </View>
            </View>

            {data.step_tracking && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Average Daily Steps</Text>
                <TextInput
                  style={styles.input}
                  placeholder="8000"
                  placeholderTextColor={o.textSubtle}
                  keyboardType="number-pad"
                  value={avgSteps}
                  onChangeText={handleAvgStepsChange}
                />
              </View>
            )}

            {/* Activity Level */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Activity level</Text>
              {activityOptions.map((option) => (
                <PremiumOptionCard
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  icon={option.icon}
                  iconColor={option.color}
                  selected={data.activity_level === option.value}
                  onPress={() => updateData({ activity_level: option.value })}
                />
              ))}
            </View>
          </MotiView>
        </ScrollView>

        <PremiumFooter
          onBack={handleBack}
          onContinue={handleContinue}
          canContinue={!!isValid}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: o.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: s.xl,
  },
  content: {
    flex: 1,
    paddingHorizontal: s.xl,
    paddingTop: s.lg,
  },
  inputGroup: {
    marginBottom: s.xl,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: o.text,
    marginBottom: s.md,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: s.md,
  },
  toggleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: o.surface,
    borderWidth: 1,
    borderColor: o.border,
    borderRadius: r.sm,
    paddingVertical: 14,
  },
  toggleButtonSelected: {
    backgroundColor: o.cardSelected.bg,
    borderColor: o.cardSelected.border,
  },
  toggleText: {
    fontSize: 15,
    fontFamily: 'Sora_500Medium',
    color: o.text,
  },
  toggleTextSelected: {
    color: o.iconColors.teal,
  },
  hintText: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: o.textSubtle,
    marginTop: s.sm,
    lineHeight: 18,
  },
  input: {
    backgroundColor: o.surfaceInput,
    borderWidth: 1,
    borderColor: o.borderMedium,
    borderRadius: r.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Sora_400Regular',
    color: o.text,
  },
  sleepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s.sm,
  },
  sleepButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: o.surface,
    borderWidth: 1,
    borderColor: o.border,
    borderRadius: r.sm,
  },
  sleepButtonSelected: {
    backgroundColor: o.iconColors.teal,
    borderColor: o.iconColors.teal,
  },
  sleepText: {
    fontSize: 13,
    fontFamily: 'Sora_500Medium',
    color: o.text,
  },
  sleepTextSelected: {
    color: '#000',
  },
});
