import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { metriqfitTheme } from '../../lib/theme';
import { useOnboarding, GoalType, ActivityLevel, SleepHours } from '../../lib/onboarding';
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

export default function GoalsLifestyleScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();
  const [avgSteps, setAvgSteps] = useState(data.avg_steps?.toString() || '');

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
    (!data.step_tracking || data.avg_steps);

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
          showsVerticalScrollIndicator={false}
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
                  onPress={() => updateData({ goal_type: option.value })}
                />
              ))}
            </View>

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
