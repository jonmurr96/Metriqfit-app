import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { metriqfitTheme } from '../../lib/theme';
import {
  useOnboarding,
  ExperienceLevel,
  EquipmentAccess,
  MinutesPerWorkout,
  Weekday,
  Injury,
  ProgressionPreference,
  SessionEmphasis,
  resolvePreferredDaysOff,
  formatWeekday,
} from '../../lib/onboarding';
import {
  PremiumHeader,
  PremiumTitle,
  PremiumFooter,
  PremiumOptionCard,
  PremiumChipSelect,
} from '../../components/onboarding/premium';
import { useWorkoutProgramFamilies } from '../../hooks/useWorkoutBuilder';

const { onboarding: o, spacing: s, radius: r } = metriqfitTheme;

const daysPerWeekOptions = [2, 3, 4, 5, 6];

const minutesOptions: { value: MinutesPerWorkout; label: string }[] = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90_plus', label: '90+ min' },
];

const daysOffOptions = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
  { value: 'no_preference', label: 'None' },
];

const experienceOptions: { value: ExperienceLevel; label: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: keyof typeof o.iconColors }[] = [
  { value: 'beginner', label: 'Beginner', description: 'New to training or < 1 year', icon: 'leaf-outline', color: 'green' },
  { value: 'intermediate', label: 'Intermediate', description: '1-3 years of training', icon: 'star-half-outline', color: 'yellow' },
  { value: 'advanced', label: 'Advanced', description: '3+ years of training', icon: 'trophy-outline', color: 'purple' },
];

const injuryOptions = [
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'knees', label: 'Knees' },
  { value: 'back', label: 'Back' },
  { value: 'wrists', label: 'Wrists' },
  { value: 'ankles', label: 'Ankles' },
  { value: 'hips', label: 'Hips' },
  { value: 'elbows', label: 'Elbows' },
  { value: 'neck', label: 'Neck' },
  { value: 'other', label: 'Other' },
  { value: 'none', label: 'None' },
];

const equipmentOptions: { value: EquipmentAccess; label: string; icon: keyof typeof Ionicons.glyphMap; color: keyof typeof o.iconColors }[] = [
  { value: 'full_gym', label: 'Full Gym', icon: 'barbell-outline', color: 'purple' },
  { value: 'dumbbells_only', label: 'Dumbbells Only', icon: 'fitness-outline', color: 'blue' },
  { value: 'dumbbells_plus_bench', label: 'Dumbbells + Bench', icon: 'apps-outline', color: 'cyan' },
  { value: 'bands_only', label: 'Resistance Bands', icon: 'infinite-outline', color: 'green' },
  { value: 'bodyweight_only', label: 'Bodyweight Only', icon: 'body-outline', color: 'orange' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: 'teal' },
];

const splitFamilyFallbackOptions = [
  { value: 'no_preference', label: 'No Preference' },
  { value: 'bro_split_5', label: 'Bro Split (5)' },
  { value: 'arnold_split_6', label: 'Arnold Split (6)' },
  { value: 'ppl_3', label: 'PPL (3)' },
  { value: 'ppl_6', label: 'PPL (6)' },
  { value: 'upper_lower_4', label: 'Upper/Lower (4)' },
  { value: 'phul_4', label: 'PHUL (4)' },
  { value: 'phat_5', label: 'PHAT (5)' },
  { value: 'full_body_beginner_3', label: 'Full Body (3)' },
];

const techniquePreferenceOptions = [
  { value: 'none', label: 'No preference' },
  { value: 'superset', label: 'Supersets' },
  { value: 'drop_set', label: 'Drop sets' },
  { value: 'pause_reps', label: 'Pause reps' },
  { value: 'rest_pause', label: 'Rest-pause' },
  { value: 'amrap', label: 'AMRAP' },
  { value: 'tempo', label: 'Tempo work' },
];

const progressionOptions: { value: ProgressionPreference; label: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: keyof typeof o.iconColors }[] = [
  { value: 'linear_overload', label: 'Linear Overload', description: 'Simple week-to-week progression', icon: 'trending-up-outline', color: 'teal' },
  { value: 'undulating', label: 'Undulating', description: 'Rotate intensity across the week', icon: 'analytics-outline', color: 'cyan' },
  { value: 'autoregulated', label: 'Auto-Regulated', description: 'Adjust by readiness and performance', icon: 'pulse-outline', color: 'purple' },
  { value: 'no_preference', label: 'No Preference', description: 'Let AI choose best fit', icon: 'options-outline', color: 'yellow' },
];

const sessionEmphasisOptions: { value: SessionEmphasis; label: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: keyof typeof o.iconColors }[] = [
  { value: 'strength', label: 'Strength', description: 'Heavier sets and lower reps', icon: 'barbell-outline', color: 'orange' },
  { value: 'hypertrophy', label: 'Hypertrophy', description: 'Muscle growth and volume focus', icon: 'body-outline', color: 'blue' },
  { value: 'balanced', label: 'Balanced', description: 'Blend strength and hypertrophy', icon: 'git-compare-outline', color: 'green' },
  { value: 'conditioning', label: 'Conditioning', description: 'Work capacity and cardio support', icon: 'walk-outline', color: 'teal' },
  { value: 'no_preference', label: 'No Preference', description: 'Let AI decide emphasis', icon: 'options-outline', color: 'yellow' },
];

export default function TrainingSetupScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();
  const { data: splitFamilies = [] } = useWorkoutProgramFamilies();
  const dayOffResolution = resolvePreferredDaysOff(data.training_days_per_week, data.preferred_days_off);
  const hasDroppedDaysOff = dayOffResolution.droppedDaysOff.length > 0;
  const splitFamilyOptions = useMemo(() => {
    const mapped = splitFamilies.map((family) => ({
      value: family.external_key,
      label: family.display_name,
    }));

    return [
      { value: 'no_preference', label: 'No Preference' },
      ...(mapped.length > 0 ? mapped : splitFamilyFallbackOptions.slice(1)),
    ];
  }, [splitFamilies]);

  const isValid =
    data.training_days_per_week &&
    data.minutes_per_workout &&
    data.experience_level &&
    data.injuries.length > 0 &&
    data.equipment_access &&
    (!data.injuries.includes('other') || data.injuries_other_text) &&
    (data.equipment_access !== 'other' || data.equipment_other_text);

  const handleContinue = () => {
    if (isValid) {
      updateData({
        preferred_days_off: dayOffResolution.resolvedDaysOff as Weekday[],
      });
      setCurrentStep(5);
      router.push('/(onboarding)/nutrition-prefs');
    }
  };

  const handleBack = () => {
    setCurrentStep(3);
    router.back();
  };

  const handleInjurySelect = (values: string[]) => {
    if (values.includes('none')) {
      updateData({ injuries: ['none'] as Injury[] });
    } else {
      updateData({ injuries: values.filter(v => v !== 'none') as Injury[] });
    }
  };

  const handleDaysOffSelect = (values: string[]) => {
    if (values.includes('no_preference')) {
      updateData({ preferred_days_off: ['no_preference'] as Weekday[] });
    } else {
      updateData({ preferred_days_off: values.filter(v => v !== 'no_preference') as Weekday[] });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PremiumHeader currentStep={4} totalSteps={5} />

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
              line1="Let's set up your"
              line2Gradient="training plan"
              subtitle="Help us build your workout schedule"
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Days you can train per week (exact schedule)</Text>
              <View style={styles.daysRow}>
                {daysPerWeekOptions.map((day) => (
                  <Pressable
                    key={day}
                    style={[
                      styles.dayButton,
                      data.training_days_per_week === day && styles.dayButtonSelected,
                    ]}
                    onPress={() => updateData({ training_days_per_week: day })}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        data.training_days_per_week === day && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Minutes per workout</Text>
              <View style={styles.minutesRow}>
                {minutesOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.minuteButton,
                      data.minutes_per_workout === option.value && styles.minuteButtonSelected,
                    ]}
                    onPress={() => updateData({ minutes_per_workout: option.value })}
                  >
                    <Text
                      style={[
                        styles.minuteText,
                        data.minutes_per_workout === option.value && styles.minuteTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <PremiumChipSelect
              label="Preferred days off"
              options={daysOffOptions}
              selected={data.preferred_days_off}
              onSelect={handleDaysOffSelect}
              noneOption="no_preference"
            />

            {hasDroppedDaysOff ? (
              <View style={styles.warningBox}>
                <Ionicons name="warning-outline" size={16} color={o.iconColors.orange} />
                <Text style={styles.warningText}>
                  {dayOffResolution.warning}
                </Text>
              </View>
            ) : null}

            {data.training_days_per_week ? (
              <View style={styles.infoBox}>
                <Ionicons name="calendar-outline" size={16} color={o.iconColors.cyan} />
                <Text style={styles.infoText}>
                  Exact schedule: {data.training_days_per_week} training day(s)/week.
                  {dayOffResolution.resolvedDaysOff.length
                    ? ` Days off kept: ${dayOffResolution.resolvedDaysOff.map(formatWeekday).join(', ')}.`
                    : ' No fixed days off selected.'}
                  {data.preferred_split_family && data.preferred_split_family !== 'no_preference'
                    ? ` Preferred split: ${data.preferred_split_family.replaceAll('_', ' ')}.`
                    : ''}
                </Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Experience level</Text>
              {experienceOptions.map((option) => (
                <PremiumOptionCard
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  icon={option.icon}
                  iconColor={option.color}
                  selected={data.experience_level === option.value}
                  onPress={() => updateData({ experience_level: option.value })}
                />
              ))}
            </View>

            <PremiumChipSelect
              label="Any injuries or limitations?"
              options={injuryOptions}
              selected={data.injuries}
              onSelect={handleInjurySelect}
              noneOption="none"
            />

            {data.injuries.includes('other') && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Describe your injury</Text>
                <TextInput
                  style={styles.input}
                  placeholder="E.g., rotator cuff issue"
                  placeholderTextColor={o.textSubtle}
                  value={data.injuries_other_text || ''}
                  onChangeText={(text) => updateData({ injuries_other_text: text })}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Equipment access</Text>
              {equipmentOptions.map((option) => (
                <PremiumOptionCard
                  key={option.value}
                  label={option.label}
                  icon={option.icon}
                  iconColor={option.color}
                  selected={data.equipment_access === option.value}
                  onPress={() => updateData({ equipment_access: option.value })}
                />
              ))}
            </View>

            {data.equipment_access === 'other' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Describe your equipment</Text>
                <TextInput
                  style={styles.input}
                  placeholder="E.g., kettlebells and pull-up bar"
                  placeholderTextColor={o.textSubtle}
                  value={data.equipment_other_text || ''}
                  onChangeText={(text) => updateData({ equipment_other_text: text })}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred split family (optional)</Text>
              <PremiumChipSelect
                label=""
                options={splitFamilyOptions}
                selected={data.preferred_split_family ? [data.preferred_split_family] : []}
                onSelect={(values) => updateData({ preferred_split_family: values[0] || null })}
                multiple={false}
                columns={2}
              />
            </View>

            <PremiumChipSelect
              label="Preferred training techniques (optional)"
              options={techniquePreferenceOptions}
              selected={data.technique_preferences}
              onSelect={(values) => {
                if (values.includes('none')) {
                  updateData({ technique_preferences: [] });
                  return;
                }
                updateData({ technique_preferences: values });
              }}
              noneOption="none"
              columns={2}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Progression style (optional)</Text>
              {progressionOptions.map((option) => (
                <PremiumOptionCard
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  icon={option.icon}
                  iconColor={option.color}
                  selected={data.progression_preference === option.value}
                  onPress={() => updateData({ progression_preference: option.value })}
                />
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Session emphasis (optional)</Text>
              {sessionEmphasisOptions.map((option) => (
                <PremiumOptionCard
                  key={option.value}
                  label={option.label}
                  description={option.description}
                  icon={option.icon}
                  iconColor={option.color}
                  selected={data.session_emphasis === option.value}
                  onPress={() => updateData({ session_emphasis: option.value })}
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    borderWidth: 1,
    borderColor: o.iconColors.orange,
    backgroundColor: `${o.iconColors.orange}14`,
    borderRadius: r.sm,
    paddingHorizontal: s.md,
    paddingVertical: s.sm,
    marginBottom: s.xl,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: o.textMuted,
    fontFamily: 'Sora_400Regular',
    lineHeight: 17,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s.sm,
    borderWidth: 1,
    borderColor: o.iconColors.cyan,
    backgroundColor: `${o.iconColors.cyan}14`,
    borderRadius: r.sm,
    paddingHorizontal: s.md,
    paddingVertical: s.sm,
    marginBottom: s.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: o.textMuted,
    fontFamily: 'Sora_400Regular',
    lineHeight: 17,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: o.text,
    marginBottom: s.md,
  },
  daysRow: {
    flexDirection: 'row',
    gap: s.sm,
  },
  dayButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: o.surface,
    borderWidth: 1,
    borderColor: o.border,
    borderRadius: r.sm,
    paddingVertical: 14,
  },
  dayButtonSelected: {
    backgroundColor: o.iconColors.teal,
    borderColor: o.iconColors.teal,
  },
  dayText: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: o.text,
  },
  dayTextSelected: {
    color: '#000',
  },
  minutesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s.sm,
  },
  minuteButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: o.surface,
    borderWidth: 1,
    borderColor: o.border,
    borderRadius: r.sm,
  },
  minuteButtonSelected: {
    backgroundColor: o.iconColors.teal,
    borderColor: o.iconColors.teal,
  },
  minuteText: {
    fontSize: 14,
    fontFamily: 'Sora_500Medium',
    color: o.text,
  },
  minuteTextSelected: {
    color: '#000',
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
});
