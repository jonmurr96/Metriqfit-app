import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { metriqfitTheme } from '../../lib/theme';
import { useOnboarding, GoalTimeline } from '../../lib/onboarding';
import {
  PremiumHeader,
  PremiumTitle,
  PremiumFooter,
  PremiumOptionCard,
  PremiumDatePicker,
} from '../../components/onboarding/premium';

const { colors: c, spacing: s, radius: r, glass } = metriqfitTheme;

const timelineOptions: { value: GoalTimeline; label: string; icon: keyof typeof Ionicons.glyphMap; color: 'primary' }[] = [
  { value: '1_month', label: '1 Month', icon: 'flash-outline', color: 'primary' },
  { value: '3_months', label: '3 Months', icon: 'time-outline', color: 'primary' },
  { value: '6_months', label: '6 Months', icon: 'calendar-outline', color: 'primary' },
  { value: '1_year', label: '1 Year', icon: 'ribbon-outline', color: 'primary' },
  { value: 'custom_date', label: 'Custom Date', icon: 'create-outline', color: 'primary' },
];

export default function BodyStatsScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();
  const [heightFt, setHeightFt] = useState(data.height_ft?.toString() || '');
  const [heightIn, setHeightIn] = useState(data.height_in?.toString() || '');
  const [weight, setWeight] = useState(data.current_weight_lb?.toString() || '');
  const [targetWeight, setTargetWeight] = useState(data.target_weight_lb?.toString() || '');

  const parseIntSafe = (value: string): number | null => {
    if (value === '') return null;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const parseFloatSafe = (value: string): number | null => {
    if (value === '') return null;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleHeightFtChange = (value: string) => {
    setHeightFt(value);
    updateData({ height_ft: parseIntSafe(value) });
  };

  const handleHeightInChange = (value: string) => {
    setHeightIn(value);
    updateData({ height_in: parseIntSafe(value) });
  };

  const handleWeightChange = (value: string) => {
    setWeight(value);
    updateData({ current_weight_lb: parseFloatSafe(value) });
  };

  const handleTargetWeightChange = (value: string) => {
    setTargetWeight(value);
    updateData({ target_weight_lb: parseFloatSafe(value) });
  };

  const needsCustomDate = data.goal_timeline === 'custom_date';

  const isValid =
    data.dob &&
    data.sex &&
    data.height_ft &&
    data.height_in !== null &&
    data.current_weight_lb &&
    data.goal_timeline &&
    (!data.target_weight_enabled || data.target_weight_lb) &&
    (!needsCustomDate || data.target_date);

  const handleContinue = () => {
    if (isValid) {
      setCurrentStep(3);
      router.push('/(onboarding)/goals-lifestyle');
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PremiumHeader currentStep={2} totalSteps={5} />

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
              line1="Tell us about"
              line2Gradient="your body"
              subtitle="We'll use this to calculate your targets"
            />

            <PremiumDatePicker
              label="Date of Birth"
              value={data.dob}
              onChange={(date) => updateData({ dob: date })}
              placeholder="Select date"
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                <Pressable
                  style={[
                    styles.genderButton,
                    data.sex === 'male' && styles.genderButtonSelected,
                  ]}
                  onPress={() => updateData({ sex: 'male' })}
                >
                  <Ionicons
                    name="male"
                    size={24}
                    color={data.sex === 'male' ? c.primary : c.textSubtle}
                  />
                  <Text style={[styles.genderText, data.sex === 'male' && styles.genderTextSelected]}>
                    Male
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.genderButton,
                    data.sex === 'female' && styles.genderButtonSelected,
                  ]}
                  onPress={() => updateData({ sex: 'female' })}
                >
                  <Ionicons
                    name="female"
                    size={24}
                    color={data.sex === 'female' ? c.primary : c.textSubtle}
                  />
                  <Text style={[styles.genderText, data.sex === 'female' && styles.genderTextSelected]}>
                    Female
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Height</Text>
              <View style={styles.heightRow}>
                <View style={styles.heightField}>
                  <TextInput
                    style={styles.input}
                    placeholder="5"
                    placeholderTextColor={c.textSubtle}
                    keyboardType="number-pad"
                    value={heightFt}
                    onChangeText={handleHeightFtChange}
                    maxLength={1}
                  />
                  <Text style={styles.unitLabel}>ft</Text>
                </View>
                <View style={styles.heightField}>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    placeholderTextColor={c.textSubtle}
                    keyboardType="number-pad"
                    value={heightIn}
                    onChangeText={handleHeightInChange}
                    maxLength={2}
                  />
                  <Text style={styles.unitLabel}>in</Text>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Weight</Text>
              <View style={styles.weightField}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="165"
                  placeholderTextColor={c.textSubtle}
                  keyboardType="decimal-pad"
                  value={weight}
                  onChangeText={handleWeightChange}
                />
                <Text style={styles.unitLabel}>lbs</Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Set a target weight?</Text>
              <View style={styles.genderRow}>
                <Pressable
                  style={[
                    styles.genderButton,
                    data.target_weight_enabled && styles.genderButtonSelected,
                  ]}
                  onPress={() => updateData({ target_weight_enabled: true })}
                >
                  <Text style={[styles.genderText, data.target_weight_enabled && styles.genderTextSelected]}>
                    Yes
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.genderButton,
                    data.target_weight_enabled === false && styles.genderButtonSelected,
                  ]}
                  onPress={() => updateData({ target_weight_enabled: false })}
                >
                  <Text style={[styles.genderText, data.target_weight_enabled === false && styles.genderTextSelected]}>
                    No
                  </Text>
                </Pressable>
              </View>
            </View>

            {data.target_weight_enabled && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Target Weight</Text>
                <View style={styles.weightField}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="155"
                    placeholderTextColor={c.textSubtle}
                    keyboardType="decimal-pad"
                    value={targetWeight}
                    onChangeText={handleTargetWeightChange}
                  />
                  <Text style={styles.unitLabel}>lbs</Text>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Goal Timeline</Text>
              {timelineOptions.map((option) => (
                <PremiumOptionCard
                  key={option.value}
                  label={option.label}
                  icon={option.icon}
                  iconColor={option.color}
                  selected={data.goal_timeline === option.value}
                  onPress={() => updateData({ goal_timeline: option.value })}
                />
              ))}
            </View>

            {needsCustomDate && (
              <PremiumDatePicker
                label="Target Date"
                value={data.target_date}
                onChange={(date) => updateData({ target_date: date })}
                placeholder="Select date"
                minimumDate={new Date()}
              />
            )}
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
    backgroundColor: c.bg,
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
    marginBottom: s.lg,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: c.text,
    marginBottom: s.sm,
  },
  genderRow: {
    flexDirection: 'row',
    gap: s.md,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: glass.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: r.sm,
    paddingVertical: 14,
    gap: s.sm,
  },
  genderButtonSelected: {
    backgroundColor: `${c.primary}10`,
    borderColor: c.primary,
  },
  genderText: {
    fontSize: 15,
    fontFamily: 'Sora_500Medium',
    color: c.text,
  },
  genderTextSelected: {
    color: c.primary,
  },
  heightRow: {
    flexDirection: 'row',
    gap: s.md,
  },
  heightField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
  },
  input: {
    flex: 1,
    backgroundColor: glass.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: r.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Sora_400Regular',
    color: c.text,
  },
  unitLabel: {
    fontSize: 15,
    fontFamily: 'Sora_500Medium',
    color: c.textMuted,
    minWidth: 30,
  },
  weightField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
  },
});
