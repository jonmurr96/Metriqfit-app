import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
  ProteinSource,
  CarbSource,
  FatSource,
  WakeTime,
  FirstMealDelay,
  LastMealBeforeBed,
  TrainingTime,
  CarbTolerance,
  CookingLevel,
  normalizeOnboardingAnswers,
} from '../../lib/onboarding';
import { PremiumHeader, PremiumFooter } from '../../components/onboarding/premium';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { calculateTargets } from '../../lib/targets/calculateTargets';
import type { Database } from '../../lib/supabase/types';

const { spacing: s } = metriqfitTheme;
const CYAN = '#22D3EE';
const ORANGE = '#F97316';
const PURPLE = '#A855F7';
const BG = '#050510';
const SURFACE = '#0A1128';

type DietConfig = {
  value: DietaryPreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const DIETS: DietConfig[] = [
  { value: 'anything',    label: 'No Restrictions', icon: 'restaurant-outline',   color: '#22C55E' },
  { value: 'vegetarian',  label: 'Vegetarian',       icon: 'leaf-outline',         color: '#34D399' },
  { value: 'vegan',       label: 'Vegan',            icon: 'nutrition-outline',    color: CYAN },
  { value: 'keto',        label: 'Keto',             icon: 'egg-outline',          color: ORANGE },
  { value: 'paleo',       label: 'Paleo',            icon: 'bonfire-outline',      color: '#F59E0B' },
  { value: 'pescatarian', label: 'Pescatarian',      icon: 'fish-outline',         color: '#38BDF8' },
  { value: 'other',       label: 'Other',            icon: 'create-outline',       color: PURPLE },
];

const ALLERGIES: { value: AllergyExclusion; label: string }[] = [
  { value: 'none',      label: '✓ None' },
  { value: 'gluten',    label: 'Gluten' },
  { value: 'dairy',     label: 'Dairy' },
  { value: 'peanuts',   label: 'Peanuts' },
  { value: 'soy',       label: 'Soy' },
  { value: 'eggs',      label: 'Eggs' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'fish',      label: 'Fish' },
  { value: 'other',     label: 'Other' },
];

const AVOID_FOODS: { value: RefusedFood | 'none'; label: string }[] = [
  { value: 'none' as any, label: '✓ None' },
  { value: 'pork',        label: 'Pork' },
  { value: 'beef',        label: 'Beef' },
  { value: 'chicken',     label: 'Chicken' },
  { value: 'turkey',      label: 'Turkey' },
  { value: 'seafood',     label: 'Seafood' },
  { value: 'rice',        label: 'Rice' },
  { value: 'pasta',       label: 'Pasta' },
  { value: 'potatoes',    label: 'Potatoes' },
  { value: 'oats',        label: 'Oats' },
  { value: 'nuts',        label: 'Nuts' },
];

const MEALS: { value: MealsPerDay; label: string }[] = [
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5_plus', label: '5+' },
  { value: 'no_preference', label: 'Any' },
];

// NEW: Enhanced Nutrition Options
const PROTEINS: { value: ProteinSource; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'chicken', label: 'Chicken', icon: 'fast-food-outline' },
  { value: 'turkey', label: 'Turkey', icon: 'fast-food-outline' },
  { value: 'beef', label: 'Beef', icon: 'restaurant-outline' },
  { value: 'pork', label: 'Pork', icon: 'restaurant-outline' },
  { value: 'fish', label: 'Fish', icon: 'fish-outline' },
  { value: 'shellfish', label: 'Shellfish', icon: 'fish-outline' },
  { value: 'eggs', label: 'Eggs', icon: 'egg-outline' },
  { value: 'dairy', label: 'Dairy', icon: 'cafe-outline' },
  { value: 'tofu_tempeh', label: 'Tofu/Tempeh', icon: 'cube-outline' },
  { value: 'legumes', label: 'Legumes', icon: 'leaf-outline' },
  { value: 'protein_powder', label: 'Protein Powder', icon: 'flask-outline' },
];

const CARBS: { value: CarbSource; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { value: 'rice', label: 'Rice', icon: 'bowl-outline', description: 'Fast energy' },
  { value: 'oats', label: 'Oats', icon: 'restaurant-outline', description: 'Slow release' },
  { value: 'sweet_potato', label: 'Sweet Potato', icon: 'nutrition-outline', description: 'Nutrient dense' },
  { value: 'potato', label: 'Potato', icon: 'nutrition-outline', description: 'Versatile' },
  { value: 'quinoa', label: 'Quinoa', icon: 'leaf-outline', description: 'Complete protein' },
  { value: 'pasta', label: 'Pasta', icon: 'restaurant-outline', description: 'Quick energy' },
  { value: 'bread', label: 'Bread', icon: 'cafe-outline', description: 'Convenient' },
  { value: 'fruit', label: 'Fruit', icon: 'sunny-outline', description: 'Natural sugars' },
];

const FATS: { value: FatSource; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { value: 'olive_oil', label: 'Olive Oil', icon: 'water-outline', description: 'Mediterranean' },
  { value: 'almonds', label: 'Almonds', icon: 'nutrition-outline', description: 'Vitamin E' },
  { value: 'walnuts', label: 'Walnuts', icon: 'nutrition-outline', description: 'Omega-3' },
  { value: 'avocado', label: 'Avocado', icon: 'leaf-outline', description: 'Potassium' },
  { value: 'peanut_butter', label: 'Peanut Butter', icon: 'restaurant-outline', description: 'Protein+fat' },
  { value: 'chia_seeds', label: 'Chia Seeds', icon: 'seed-outline', description: 'Fiber' },
  { value: 'coconut_oil', label: 'Coconut Oil', icon: 'water-outline', description: 'MCTs' },
  { value: 'cheese', label: 'Cheese', icon: 'cafe-outline', description: 'Calcium' },
];

const WAKE_TIMES: { value: WakeTime; label: string }[] = [
  { value: '5_6am', label: '5-6 AM' },
  { value: '7_8am', label: '7-8 AM' },
  { value: '9_10am', label: '9-10 AM' },
  { value: 'other', label: 'Other' },
];

const FIRST_MEAL_DELAYS: { value: FirstMealDelay; label: string }[] = [
  { value: 'immediate', label: 'Immediately' },
  { value: '1_2hrs', label: '1-2 hours' },
  { value: '3hrs_plus', label: '3+ hours' },
];

const LAST_MEAL_OPTIONS: { value: LastMealBeforeBed; label: string }[] = [
  { value: '2hrs', label: '2 hours before' },
  { value: '3_4hrs', label: '3-4 hours before' },
  { value: 'no_constraint', label: 'No preference' },
];

const TRAINING_TIMES: { value: TrainingTime; label: string }[] = [
  { value: 'early_morning', label: 'Early Morning\n(5-7 AM)' },
  { value: 'mid_morning', label: 'Mid Morning\n(8-10 AM)' },
  { value: 'midday', label: 'Midday\n(11 AM-2 PM)' },
  { value: 'afternoon', label: 'Afternoon\n(3-6 PM)' },
  { value: 'evening', label: 'Evening\n(7-9 PM)' },
  { value: 'no_training', label: 'No Training' },
];

const CARB_RESPONSES: { value: CarbTolerance; label: string; description: string }[] = [
  { value: 'energized_satiated', label: 'Energized & Full', description: 'Carbs fuel me well' },
  { value: 'hungry_quickly', label: 'Hungry Quickly', description: 'I need more protein/fat' },
  { value: 'tired_sleepy', label: 'Tired / Sluggish', description: 'Carbs make me crash' },
  { value: 'bloated', label: 'Bloated', description: 'Digestive sensitivity' },
];

const COOKING_LEVELS: { value: CookingLevel; label: string; description: string }[] = [
  { value: 'minimal', label: 'Minimal', description: 'Simple prep only' },
  { value: 'basic', label: 'Basic', description: 'Standard recipes' },
  { value: 'moderate', label: 'Moderate', description: 'Comfortable cooking' },
  { value: 'full', label: 'Full', description: 'Love complex meals' },
];



export default function NutritionScreen() {
  const { data, updateData, setCurrentStep } = useOnboarding();
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug validation
  const validationChecks = {
    dietary_preference: !!data.dietary_preference,
    allergies_exclusions: data.allergies_exclusions.length > 0,
    preferred_proteins: data.preferred_proteins.length > 0,
    wake_time: !!data.wake_time,
    first_meal_delay: !!data.first_meal_delay,
    last_meal_before_bed: !!data.last_meal_before_bed,
    training_time: !!data.training_time,
    meals_per_day: !!data.meals_per_day,
    dietary_other_text: (data.dietary_preference !== 'other' || !!data.dietary_preference_other_text),
    allergies_other_text: (!data.allergies_exclusions.includes('other') || !!data.allergies_other_text),
  };
  
  const isValid = Object.values(validationChecks).every(Boolean);
  
  // Log validation state for debugging
  React.useEffect(() => {
    if (!isValid) {
      const failed = Object.entries(validationChecks)
        .filter(([_, v]) => !v)
        .map(([k]) => k);
      console.log('🔴 Validation failed for:', failed);
      console.log('📊 Current data:', {
        dietary: data.dietary_preference,
        allergies: data.allergies_exclusions,
        proteins: data.preferred_proteins,
        wake: data.wake_time,
        firstMeal: data.first_meal_delay,
        lastMeal: data.last_meal_before_bed,
        training: data.training_time,
        meals: data.meals_per_day,
      });
    }
  }, [isValid, data]);

  const handleAllergySelect = (val: AllergyExclusion) => {
    if (val === 'none') {
      updateData({ allergies_exclusions: ['none'] });
      return;
    }
    let next = data.allergies_exclusions.filter((a) => a !== 'none');
    if (next.includes(val)) next = next.filter((a) => a !== val);
    else next = [...next, val];
    updateData({ allergies_exclusions: next });
  };

  const handleAvoidSelect = (val: string) => {
    if (val === 'none') {
      updateData({ refused_foods: [] });
      return;
    }
    let next = data.refused_foods as string[];
    if (next.includes(val)) next = next.filter((f) => f !== val);
    else next = [...next, val];
    updateData({ refused_foods: next as RefusedFood[] });
  };

  // NEW: Handle protein preference selection (max 3)
  const handleProteinSelect = (val: ProteinSource) => {
    let next = [...data.preferred_proteins];
    if (next.includes(val)) {
      next = next.filter((p) => p !== val);
    } else if (next.length < 3) {
      next = [...next, val];
    }
    updateData({ preferred_proteins: next });
  };

  // Handle carb preference selection (max 3)
  const handleCarbSelect = (val: CarbSource) => {
    let next = [...data.preferred_carbs];
    if (next.includes(val)) {
      next = next.filter((c) => c !== val);
    } else if (next.length < 3) {
      next = [...next, val];
    }
    updateData({ preferred_carbs: next });
  };

  // Handle fat preference selection (max 3)
  const handleFatSelect = (val: FatSource) => {
    let next = [...data.preferred_fats];
    if (next.includes(val)) {
      next = next.filter((f) => f !== val);
    } else if (next.length < 3) {
      next = [...next, val];
    }
    updateData({ preferred_fats: next });
  };

  const handleComplete = async () => {
    if (!isValid) { setError('Please complete all required fields'); return; }
    setIsLoading(true);
    setError(null);
    try {
      const userId = session?.user?.id;
      if (!userId) {
        const { data: { session: s2 } } = await supabase.auth.getSession();
        if (!s2?.user?.id) {
          setError('Session expired. Please sign in again.');
          router.replace('/(auth)/sign-in');
          return;
        }
      }
      const uid = session?.user?.id || (await supabase.auth.getSession()).data.session?.user?.id;
      if (!uid) throw new Error('No user session');

      const normalizedAnswers = normalizeOnboardingAnswers(data);

      // Validate required earlier-step data is present
      if (!normalizedAnswers.goal_type || !normalizedAnswers.sex || !normalizedAnswers.dob || !normalizedAnswers.experience_level) {
        setError('Missing required profile information. Please complete the earlier onboarding steps.');
        setIsLoading(false);
        return;
      }

      // Save onboarding answers
      const { error: answersError } = await supabase
        .from('onboarding_answers')
        .upsert({
          user_id: uid,
          answers: normalizedAnswers as unknown as Database['public']['Tables']['onboarding_answers']['Insert']['answers'],
          completed_at: new Date().toISOString(),
        } satisfies Database['public']['Tables']['onboarding_answers']['Insert'], { onConflict: 'user_id' });
      if (answersError) throw answersError;

      // Calculate targets
      const targets = calculateTargets({
        sex: normalizedAnswers.sex!,
        dob: normalizedAnswers.dob!,
        height_ft: normalizedAnswers.height_ft!,
        height_in: normalizedAnswers.height_in!,
        current_weight_lb: normalizedAnswers.current_weight_lb!,
        goal_type: normalizedAnswers.goal_type!,
        activity_level: normalizedAnswers.activity_level!,
        training_days_per_week: normalizedAnswers.training_days_per_week ?? 3,
        minutes_per_workout: normalizedAnswers.minutes_per_workout!,
        experience_level: normalizedAnswers.experience_level!,
        avg_steps: normalizedAnswers.avg_steps,
        target_weight_lb: normalizedAnswers.target_weight_lb ?? normalizedAnswers.current_weight_lb ?? 0,
        target_date: normalizedAnswers.target_date,
        dietary_preference: normalizedAnswers.dietary_preference,
      });

      if (!targets.calories || !targets.protein_g || !targets.carbs_g || !targets.fat_g || !targets.water_ml) {
        throw new Error('Invalid targets calculated.');
      }

      // Save targets
      const { error: targetsError } = await supabase
        .from('user_targets')
        .upsert({
          user_id: uid,
          calories: targets.calories,
          protein_g: targets.protein_g,
          carbs_g: targets.carbs_g,
          fat_g: targets.fat_g,
          water_ml: targets.water_ml,
          computation_method: targets.computation_method || 'mifflin_st_jeor',
        }, { onConflict: 'user_id' });
      if (targetsError) throw targetsError;

      // Upsert profile — guarantees the row exists even if the auth trigger failed on signup
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: uid, first_name: data.first_name, last_name: data.last_name }, { onConflict: 'id' });
      if (profileError) throw profileError;

      router.replace('/(onboarding)/plan-generation');
    } catch (err: any) {
      setError(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStep(6);
    router.back();
  };

  const avoidedNone = data.refused_foods.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <PremiumHeader currentStep={7} totalSteps={7} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400 } as any}
            style={styles.content}
          >
            {/* Title */}
            <View style={styles.titleBlock}>
              <Text style={styles.titleLine1}>Final step —</Text>
              <Text style={[styles.titleAccent, { color: ORANGE }]}>nutrition</Text>
              <Text style={styles.subtitle}>Personalises your meal plan and macros</Text>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            
            {/* Dietary preference */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Dietary Style</Text>
              <View style={styles.dietGrid}>
                {DIETS.map((d) => {
                  const sel = data.dietary_preference === d.value;
                  return (
                    <Pressable
                      key={d.value}
                      style={[styles.dietCard, sel && { borderColor: d.color, backgroundColor: `${d.color}10` }]}
                      onPress={() => updateData({ dietary_preference: d.value })}
                    >
                      <View style={[styles.dietIcon, { backgroundColor: sel ? d.color : `${d.color}20` }]}>
                        <Ionicons name={d.icon} size={18} color={sel ? BG : d.color} />
                      </View>
                      <Text style={[styles.dietLabel, sel && { color: d.color }]}>{d.label}</Text>
                      {sel && <View style={[styles.dietDot, { backgroundColor: d.color }]} />}
                    </Pressable>
                  );
                })}
              </View>
              {data.dietary_preference === 'other' && (
                <TextInput
                  style={styles.otherInput}
                  placeholder="Describe your diet..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={data.dietary_preference_other_text || ''}
                  onChangeText={(t) => updateData({ dietary_preference_other_text: t })}
                />
              )}
            </View>

            {/* Allergies */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Food Allergies</Text>
              <Text style={styles.sectionHint}>Select all that apply</Text>
              <View style={styles.chipRowWrap}>
                {ALLERGIES.map((a) => {
                  const sel = data.allergies_exclusions.includes(a.value);
                  return (
                    <Pressable
                      key={a.value}
                      style={[styles.chip, sel && (a.value === 'none' ? styles.chipSelectedGreen : styles.chipSelectedRed)]}
                      onPress={() => handleAllergySelect(a.value)}
                    >
                      <Text style={[styles.chipText, sel && { color: a.value === 'none' ? '#22C55E' : '#EF4444' }]}>{a.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {data.allergies_exclusions.includes('other') && (
                <TextInput
                  style={styles.otherInput}
                  placeholder="Describe your allergy..."
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  value={data.allergies_other_text || ''}
                  onChangeText={(t) => updateData({ allergies_other_text: t })}
                />
              )}
            </View>

            {/* Foods to avoid */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Foods to Avoid</Text>
              <Text style={styles.sectionHint}>Optional · Things you just won't eat</Text>
              <View style={styles.chipRowWrap}>
                {AVOID_FOODS.map((f) => {
                  const isNoneOpt = f.value === 'none';
                  const sel = isNoneOpt ? avoidedNone : data.refused_foods.includes(f.value as RefusedFood);
                  return (
                    <Pressable
                      key={f.value}
                      style={[styles.chip, sel && (isNoneOpt ? styles.chipSelectedGreen : styles.chipSelectedOrange)]}
                      onPress={() => handleAvoidSelect(f.value)}
                    >
                      <Text style={[styles.chipText, sel && { color: isNoneOpt ? '#22C55E' : ORANGE }]}>{f.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* NEW: Preferred Proteins */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Top 3 Protein Sources</Text>
              <Text style={styles.sectionHint}>Pick your favorites — we'll prioritize these</Text>
              <View style={styles.chipRowWrap}>
                {PROTEINS.map((p) => {
                  const sel = data.preferred_proteins.includes(p.value);
                  const rank = data.preferred_proteins.indexOf(p.value) + 1;
                  return (
                    <Pressable
                      key={p.value}
                      style={[styles.proteinChip, sel && styles.proteinChipSelected]}
                      onPress={() => handleProteinSelect(p.value)}
                    >
                      <Ionicons name={p.icon} size={16} color={sel ? CYAN : 'rgba(255,255,255,0.7)'} style={{ marginRight: 6 }} />
                      <Text style={[styles.proteinChipText, sel && styles.proteinChipTextSelected]}>{p.label}</Text>
                      {sel && (
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankBadgeText}>{rank}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* NEW: Preferred Carbs */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Top 3 Carb Sources</Text>
              <Text style={styles.sectionHint}>Pick your favorites — energy for training</Text>
              <View style={styles.chipRowWrap}>
                {CARBS.map((c) => {
                  const sel = data.preferred_carbs.includes(c.value);
                  const rank = data.preferred_carbs.indexOf(c.value) + 1;
                  return (
                    <Pressable
                      key={c.value}
                      style={[styles.proteinChip, sel && styles.proteinChipSelected]}
                      onPress={() => handleCarbSelect(c.value)}
                    >
                      <Ionicons name={c.icon} size={16} color={sel ? CYAN : 'rgba(255,255,255,0.7)'} style={{ marginRight: 6 }} />
                      <Text style={[styles.proteinChipText, sel && styles.proteinChipTextSelected]}>{c.label}</Text>
                      {sel && (
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankBadgeText}>{rank}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* NEW: Preferred Fats */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Top 3 Fat Sources</Text>
              <Text style={styles.sectionHint}>Pick your favorites — healthy fats for hormones</Text>
              <View style={styles.chipRowWrap}>
                {FATS.map((f) => {
                  const sel = data.preferred_fats.includes(f.value);
                  const rank = data.preferred_fats.indexOf(f.value) + 1;
                  return (
                    <Pressable
                      key={f.value}
                      style={[styles.proteinChip, sel && styles.proteinChipSelected]}
                      onPress={() => handleFatSelect(f.value)}
                    >
                      <Ionicons name={f.icon} size={16} color={sel ? CYAN : 'rgba(255,255,255,0.7)'} style={{ marginRight: 6 }} />
                      <Text style={[styles.proteinChipText, sel && styles.proteinChipTextSelected]}>{f.label}</Text>
                      {sel && (
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankBadgeText}>{rank}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Schedule — Wake Time */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Wake Up Time</Text>
              <Text style={styles.sectionHint}>When do you typically wake up?</Text>
              <View style={styles.mealRow}>
                {WAKE_TIMES.map((w) => {
                  const sel = data.wake_time === w.value;
                  return (
                    <Pressable
                      key={w.value}
                      style={[styles.mealBtn, sel && styles.mealBtnSelected]}
                      onPress={() => updateData({ wake_time: w.value })}
                    >
                      <Text style={[styles.mealBtnText, sel && styles.mealBtnTextSelected]}>{w.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Schedule — First Meal */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>First Meal</Text>
              <Text style={styles.sectionHint}>How long after waking do you eat?</Text>
              <View style={styles.mealRow}>
                {FIRST_MEAL_DELAYS.map((d) => {
                  const sel = data.first_meal_delay === d.value;
                  return (
                    <Pressable
                      key={d.value}
                      style={[styles.mealBtn, sel && styles.mealBtnSelected]}
                      onPress={() => updateData({ first_meal_delay: d.value })}
                    >
                      <Text style={[styles.mealBtnText, sel && styles.mealBtnTextSelected]}>{d.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Schedule — Last Meal Before Bed */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Last Meal Before Bed</Text>
              <Text style={styles.sectionHint}>How early do you stop eating before sleep?</Text>
              <View style={styles.mealRow}>
                {LAST_MEAL_OPTIONS.map((l) => {
                  const sel = data.last_meal_before_bed === l.value;
                  return (
                    <Pressable
                      key={l.value}
                      style={[styles.mealBtn, sel && styles.mealBtnSelected]}
                      onPress={() => updateData({ last_meal_before_bed: l.value })}
                    >
                      <Text style={[styles.mealBtnText, sel && styles.mealBtnTextSelected]}>{l.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* NEW: Training Time */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Training Time</Text>
              <Text style={styles.sectionHint}>When do you typically work out?</Text>
              <View style={styles.trainingGrid}>
                {TRAINING_TIMES.map((t) => {
                  const sel = data.training_time === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      style={[styles.trainingCard, sel && styles.trainingCardSelected]}
                      onPress={() => updateData({ training_time: t.value })}
                    >
                      <Text style={[styles.trainingCardText, sel && styles.trainingCardTextSelected]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Carb Response */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>After a Carb-Heavy Meal I Feel…</Text>
              <Text style={styles.sectionHint}>Helps us calibrate your carb balance</Text>
              <View style={styles.carbGrid}>
                {CARB_RESPONSES.map((c) => {
                  const sel = data.carb_tolerance === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      style={[styles.carbCard, sel && styles.carbCardSelected]}
                      onPress={() => updateData({ carb_tolerance: c.value })}
                    >
                      <Text style={[styles.carbCardLabel, sel && styles.carbCardLabelSelected]}>{c.label}</Text>
                      <Text style={[styles.carbCardDesc, sel && styles.carbCardDescSelected]}>{c.description}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Cooking Level */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cooking Comfort Level</Text>
              <Text style={styles.sectionHint}>We'll match meal complexity to your skill</Text>
              <View style={styles.cookingGrid}>
                {COOKING_LEVELS.map((c) => {
                  const sel = data.cooking_level === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      style={[styles.cookingCard, sel && styles.cookingCardSelected]}
                      onPress={() => updateData({ cooking_level: c.value })}
                    >
                      <Text style={[styles.cookingCardLabel, sel && styles.cookingCardLabelSelected]}>{c.label}</Text>
                      <Text style={[styles.cookingCardDesc, sel && styles.cookingCardDescSelected]}>{c.description}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Meals per day */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Meals Per Day</Text>
              <View style={styles.mealRow}>
                {MEALS.map((m) => {
                  const sel = data.meals_per_day === m.value;
                  return (
                    <Pressable
                      key={m.value}
                      style={[styles.mealBtn, sel && styles.mealBtnSelected]}
                      onPress={() => updateData({ meals_per_day: m.value })}
                    >
                      <Text style={[styles.mealBtnText, sel && styles.mealBtnTextSelected]}>{m.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </MotiView>
        </ScrollView>

        <PremiumFooter
          onBack={handleBack}
          onContinue={handleComplete}
          canContinue={isValid}
          isLoading={isLoading}
          continueLabel="Generate My Plan"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  content: { paddingHorizontal: s.xl, paddingTop: s.lg },
  titleBlock: { marginBottom: 28 },
  titleLine1: { fontSize: 28, fontFamily: 'Unbounded_700Bold', color: '#FFFFFF' },
  titleAccent: { fontSize: 28, fontFamily: 'Unbounded_700Bold' },
  subtitle: { fontSize: 13, fontFamily: 'Sora_400Regular', color: 'rgba(255,255,255,0.4)', marginTop: 10 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Sora_400Regular', color: '#EF4444' },
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 12, fontFamily: 'Sora_600SemiBold', color: `${CYAN}CC`,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12, fontFamily: 'Sora_400Regular', color: 'rgba(255,255,255,0.3)', marginBottom: 14,
  },

  // Diet grid (2 cols)
  dietGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dietCard: {
    width: '47.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: SURFACE,
    position: 'relative',
  },
  dietIcon: {
    width: 36, height: 36, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  dietLabel: {
    fontSize: 13,
    fontFamily: 'Sora_600SemiBold',
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },
  dietDot: {
    position: 'absolute', top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
  },

  // Chips
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: SURFACE,
  },
  chipSelected: { backgroundColor: `${CYAN}10`, borderColor: CYAN },
  chipSelectedGreen: { backgroundColor: '#22C55E10', borderColor: '#22C55E' },
  chipSelectedRed: { backgroundColor: '#EF444410', borderColor: '#EF4444' },
  chipSelectedOrange: { backgroundColor: `${ORANGE}10`, borderColor: ORANGE },
  chipText: { fontSize: 13, fontFamily: 'Sora_500Medium', color: 'rgba(255,255,255,0.5)' },
  chipTextSelected: { color: CYAN },

  // Meals
  mealRow: { flexDirection: 'row', gap: 10 },
  mealBtn: {
    flex: 1, height: 50, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)', backgroundColor: SURFACE,
  },
  mealBtnSelected: {
    backgroundColor: `${ORANGE}10`, borderColor: ORANGE,
  } as any,
  mealBtnText: { fontSize: 16, fontFamily: 'Sora_700Bold', color: 'rgba(255,255,255,0.5)' },
  mealBtnTextSelected: { color: ORANGE },

  otherInput: {
    marginTop: 12, backgroundColor: SURFACE,
    borderWidth: 1, borderColor: `${CYAN}40`,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, fontFamily: 'Sora_400Regular', color: '#FFFFFF',
  },

  // NEW: Protein Chips
  proteinChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: SURFACE,
    position: 'relative',
  },
  proteinChipSelected: {
    backgroundColor: `${CYAN}10`,
    borderColor: CYAN,
  },
  proteinChipText: {
    fontSize: 13, fontFamily: 'Sora_500Medium', color: 'rgba(255,255,255,0.7)',
  },
  proteinChipTextSelected: {
    color: CYAN,
    fontFamily: 'Sora_600SemiBold',
  },
  rankBadge: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: ORANGE,
    alignItems: 'center', justifyContent: 'center',
  },
  rankBadgeText: {
    fontSize: 11, fontFamily: 'Sora_700Bold', color: BG,
  },

  // NEW: Training Time Grid
  trainingGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  trainingCard: {
    width: '30%',
    paddingVertical: 14, paddingHorizontal: 8,
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: SURFACE,
    alignItems: 'center',
  },
  trainingCardSelected: {
    backgroundColor: `${PURPLE}10`,
    borderColor: PURPLE,
  },
  trainingCardText: {
    fontSize: 11, fontFamily: 'Sora_500Medium', color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  trainingCardTextSelected: {
    color: PURPLE,
    fontFamily: 'Sora_600SemiBold',
  },

  // NEW: Carb Response Grid
  carbGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  carbCard: {
    width: '47%',
    padding: 14,
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: SURFACE,
  },
  carbCardSelected: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  carbCardLabel: {
    fontSize: 14, fontFamily: 'Sora_600SemiBold', color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  carbCardLabelSelected: {
    color: BG,
  },
  carbCardDesc: {
    fontSize: 11, fontFamily: 'Sora_400Regular', color: 'rgba(255,255,255,0.4)',
  },
  carbCardDescSelected: {
    color: 'rgba(0,0,0,0.6)',
  },

  // NEW: Cooking Level Grid
  cookingGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  cookingCard: {
    width: '47%',
    padding: 14,
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: SURFACE,
  },
  cookingCardSelected: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  cookingCardLabel: {
    fontSize: 14, fontFamily: 'Sora_600SemiBold', color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  cookingCardLabelSelected: {
    color: BG,
  },
  cookingCardDesc: {
    fontSize: 11, fontFamily: 'Sora_400Regular', color: 'rgba(255,255,255,0.4)',
  },
  cookingCardDescSelected: {
    color: 'rgba(0,0,0,0.6)',
  },
});
