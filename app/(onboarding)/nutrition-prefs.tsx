import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { metriqfitTheme } from '../../lib/theme';
import {
  useOnboarding,
  DietaryPreference,
  AllergyExclusion,
  RefusedFood,
  MealsPerDay,
  normalizeOnboardingAnswers,
  resolvePreferredDaysOff,
  formatWeekday,
} from '../../lib/onboarding';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/supabase/types';
import { calculateTargets } from '../../lib/targets/calculateTargets';
import {
  PremiumHeader,
  PremiumTitle,
  PremiumFooter,
  PremiumOptionCard,
  PremiumChipSelect,
} from '../../components/onboarding/premium';

const { onboarding: o, spacing: s, radius: r, colors: c } = metriqfitTheme;

const dietaryOptions: { value: DietaryPreference; label: string; icon: keyof typeof Ionicons.glyphMap; color: keyof typeof o.iconColors }[] = [
  { value: 'anything', label: 'No Restrictions', icon: 'restaurant-outline', color: 'green' },
  { value: 'vegetarian', label: 'Vegetarian', icon: 'leaf-outline', color: 'teal' },
  { value: 'vegan', label: 'Vegan', icon: 'nutrition-outline', color: 'cyan' },
  { value: 'keto', label: 'Keto', icon: 'egg-outline', color: 'yellow' },
  { value: 'paleo', label: 'Paleo', icon: 'bonfire-outline', color: 'orange' },
  { value: 'pescatarian', label: 'Pescatarian', icon: 'fish-outline', color: 'blue' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: 'purple' },
];

const allergyOptions = [
  { value: 'gluten', label: 'Gluten' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'peanuts', label: 'Peanuts' },
  { value: 'soy', label: 'Soy' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'fish', label: 'Fish' },
  { value: 'other', label: 'Other' },
  { value: 'none', label: 'None' },
];

const refusedFoodOptions = [
  { value: 'pork', label: 'Pork' },
  { value: 'beef', label: 'Beef' },
  { value: 'chicken', label: 'Chicken' },
  { value: 'turkey', label: 'Turkey' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'rice', label: 'Rice' },
  { value: 'pasta', label: 'Pasta' },
  { value: 'potatoes', label: 'Potatoes' },
  { value: 'oats', label: 'Oats' },
  { value: 'cheese', label: 'Cheese' },
  { value: 'milk', label: 'Milk' },
  { value: 'yogurt', label: 'Yogurt' },
  { value: 'whey', label: 'Whey' },
  { value: 'nuts', label: 'Nuts' },
];

const mealsOptions: { value: MealsPerDay; label: string }[] = [
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5_plus', label: '5+' },
  { value: 'no_preference', label: 'Any' },
];

export default function NutritionPrefsScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureSession = async (): Promise<string | null> => {
    if (session?.user?.id) {
      return session.user.id;
    }

    const { data: { session: refreshedSession }, error } = await supabase.auth.getSession();
    if (error || !refreshedSession?.user?.id) return null;
    return refreshedSession.user.id;
  };

  const isValid =
    data.dietary_preference &&
    data.allergies_exclusions.length > 0 &&
    data.meals_per_day &&
    (data.dietary_preference !== 'other' || data.dietary_preference_other_text) &&
    (!data.allergies_exclusions.includes('other') || data.allergies_other_text);
  const resolvedDaysOff = resolvePreferredDaysOff(
    data.training_days_per_week,
    data.preferred_days_off,
  ).resolvedDaysOff;

  const handleAllergySelect = (values: string[]) => {
    if (values.includes('none')) {
      updateData({ allergies_exclusions: ['none'] as AllergyExclusion[] });
    } else {
      updateData({ allergies_exclusions: values.filter(v => v !== 'none') as AllergyExclusion[] });
    }
  };

  const handleComplete = async () => {
    if (!isValid) {
      setError('Please complete all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userId = await ensureSession();

      if (!userId) {
        setError('Session expired. Please sign in again.');
        setIsLoading(false);
        router.replace('/(auth)/sign-in');
        return;
      }

      const normalizedAnswers = normalizeOnboardingAnswers(data);

      console.log('[Onboarding] Saving answers...');
      const { error: answersError } = await supabase
        .from('onboarding_answers')
        .upsert({
          user_id: userId,
          answers: normalizedAnswers as unknown as Database['public']['Tables']['onboarding_answers']['Insert']['answers'],
          completed_at: new Date().toISOString(),
        } satisfies Database['public']['Tables']['onboarding_answers']['Insert'], { onConflict: 'user_id' });

      if (answersError) throw answersError;

      // Calculate and save targets
      console.log('[Onboarding] Calculating targets...');
      const targets = calculateTargets({
        sex: normalizedAnswers.sex!,
        dob: normalizedAnswers.dob!,
        height_ft: normalizedAnswers.height_ft!,
        height_in: normalizedAnswers.height_in!,
        current_weight_lb: normalizedAnswers.current_weight_lb!,
        goal_type: normalizedAnswers.goal_type!,
        activity_level: normalizedAnswers.activity_level!,
        training_days_per_week: normalizedAnswers.training_days_per_week!,
        minutes_per_workout: normalizedAnswers.minutes_per_workout!,
        experience_level: normalizedAnswers.experience_level!,
        avg_steps: normalizedAnswers.avg_steps,
        target_weight_lb: normalizedAnswers.target_weight_lb,
        target_date: normalizedAnswers.target_date,
      });

      if (!targets.calories || !targets.protein_g || !targets.carbs_g || !targets.fat_g || !targets.water_ml) {
        throw new Error('Invalid targets calculated.');
      }

      console.log('[Onboarding] Saving targets to user_targets...');
      const { error: targetsError } = await supabase
        .from('user_targets')
        .upsert({
          user_id: userId,
          calories: targets.calories,
          protein_g: targets.protein_g,
          carbs_g: targets.carbs_g,
          fat_g: targets.fat_g,
          water_ml: targets.water_ml,
          computation_method: targets.computation_method || 'mifflin_st_jeor',
        }, { onConflict: 'user_id' });

      if (targetsError) throw targetsError;

      // Update basic profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Success - Redirect to generation screen which will handle the AI calls
      console.log('[Onboarding] Data saved, redirecting to generation...');
      router.replace('/(onboarding)/plan-generation');
    } catch (err: any) {
      console.error('[Onboarding] Error:', err);
      let errorMessage = 'Failed to complete onboarding. Please try again.';
      if (err.message) errorMessage = err.message;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(4);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PremiumHeader currentStep={5} totalSteps={5} />

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
              line1="Last step!"
              line2Gradient="Nutrition preferences"
              subtitle="Help us personalize your meal suggestions"
            />

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Before we generate your plans</Text>
              <Text style={styles.summaryText}>
                Training days: <Text style={styles.summaryStrong}>{data.training_days_per_week || '-'}/week</Text>
              </Text>
              <Text style={styles.summaryText}>
                Days off: <Text style={styles.summaryStrong}>
                  {resolvedDaysOff.length ? resolvedDaysOff.map(formatWeekday).join(', ') : 'none fixed'}
                </Text>
              </Text>
              <Text style={styles.summaryText}>
                Equipment: <Text style={styles.summaryStrong}>{(data.equipment_access || 'not set').replaceAll('_', ' ')}</Text>
              </Text>
              <Text style={styles.summaryText}>
                Injuries: <Text style={styles.summaryStrong}>{data.injuries.length ? data.injuries.join(', ') : 'none selected'}</Text>
              </Text>
              <Text style={styles.summaryText}>
                Goal: <Text style={styles.summaryStrong}>{(data.goal_type || 'not set').replaceAll('_', ' ')}</Text>
              </Text>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color={c.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dietary preference</Text>
              {dietaryOptions.map((option) => (
                <PremiumOptionCard
                  key={option.value}
                  label={option.label}
                  icon={option.icon}
                  iconColor={option.color}
                  selected={data.dietary_preference === option.value}
                  onPress={() => updateData({ dietary_preference: option.value })}
                />
              ))}
            </View>

            {data.dietary_preference === 'other' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Describe your diet</Text>
                <TextInput
                  style={styles.input}
                  placeholder="E.g., Mediterranean diet"
                  placeholderTextColor={o.textSubtle}
                  value={data.dietary_preference_other_text || ''}
                  onChangeText={(text) => updateData({ dietary_preference_other_text: text })}
                />
              </View>
            )}

            <PremiumChipSelect
              label="Food allergies or exclusions"
              options={allergyOptions}
              selected={data.allergies_exclusions}
              onSelect={handleAllergySelect}
              noneOption="none"
            />

            {data.allergies_exclusions.includes('other') && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Describe your allergy</Text>
                <TextInput
                  style={styles.input}
                  placeholder="E.g., tree nuts"
                  placeholderTextColor={o.textSubtle}
                  value={data.allergies_other_text || ''}
                  onChangeText={(text) => updateData({ allergies_other_text: text })}
                />
              </View>
            )}

            <PremiumChipSelect
              label="Foods you refuse to eat (optional)"
              options={refusedFoodOptions}
              selected={data.refused_foods}
              onSelect={(values) => updateData({ refused_foods: values as RefusedFood[] })}
            />

            {data.refused_foods.includes('other') && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Other foods to avoid</Text>
                <TextInput
                  style={styles.input}
                  placeholder="E.g., tofu, tempeh"
                  placeholderTextColor={o.textSubtle}
                  value={data.refused_foods_other_text || ''}
                  onChangeText={(text) => updateData({ refused_foods_other_text: text })}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Meals per day</Text>
              <View style={styles.mealsRow}>
                {mealsOptions.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.mealButton,
                      data.meals_per_day === option.value && styles.mealButtonSelected,
                    ]}
                    onPress={() => updateData({ meals_per_day: option.value })}
                  >
                    <Text
                      style={[
                        styles.mealText,
                        data.meals_per_day === option.value && styles.mealTextSelected,
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
          onContinue={handleComplete}
          canContinue={!!isValid}
          isLoading={isLoading}
          continueLabel="Complete Setup"
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
  summaryCard: {
    backgroundColor: o.surface,
    borderWidth: 1,
    borderColor: o.borderMedium,
    borderRadius: r.md,
    padding: s.md,
    marginBottom: s.xl,
    gap: 6,
  },
  summaryLabel: {
    color: o.iconColors.teal,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: 'Sora_600SemiBold',
  },
  summaryText: {
    color: o.textMuted,
    fontSize: 13,
    fontFamily: 'Sora_400Regular',
  },
  summaryStrong: {
    color: o.text,
    fontFamily: 'Sora_600SemiBold',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: o.text,
    marginBottom: s.md,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: s.md,
    borderRadius: r.sm,
    backgroundColor: 'rgba(255,77,109,0.15)',
    borderWidth: 1,
    borderColor: c.danger,
    marginBottom: s.lg,
    gap: s.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Sora_400Regular',
    color: c.danger,
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
  mealsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s.sm,
  },
  mealButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: o.surface,
    borderWidth: 1,
    borderColor: o.border,
    borderRadius: r.sm,
  },
  mealButtonSelected: {
    backgroundColor: o.iconColors.teal,
    borderColor: o.iconColors.teal,
  },
  mealText: {
    fontSize: 15,
    fontFamily: 'Sora_600SemiBold',
    color: o.text,
  },
  mealTextSelected: {
    color: '#000',
  },
});
