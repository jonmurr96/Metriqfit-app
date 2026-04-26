import React, { createContext, useContext, useState, useCallback } from 'react';

export type GoalType = 'lose_weight' | 'build_muscle' | 'get_fitter' | 'gain_weight' | 'maintain_weight' | 'recomp' | 'increase_endurance' | 'general_fitness';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
export type SleepHours = 'lt5' | '5_6' | '6_7' | '7_8' | '8_plus';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentAccess = 'full_gym' | 'dumbbells_only' | 'dumbbells_plus_bench' | 'bodyweight_only' | 'other';
export type DietaryPreference = 'anything' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'pescatarian' | 'other';
export type GoalTimeline = '1_month' | '3_months' | '6_months' | '1_year' | 'custom_date';
export type MinutesPerWorkout = '30' | '45' | '60' | '90_plus';
export type MealsPerDay = '2' | '3' | '4' | '5_plus' | 'no_preference';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'no_preference';
export type Injury = 'shoulders' | 'knees' | 'back' | 'wrists' | 'ankles' | 'hips' | 'elbows' | 'neck' | 'lower_body_joints' | 'upper_body_joints' | 'other' | 'none';
export type AllergyExclusion = 'gluten' | 'dairy' | 'peanuts' | 'soy' | 'eggs' | 'shellfish' | 'fish' | 'other' | 'none';
export type RefusedFood = 'pork' | 'beef' | 'chicken' | 'turkey' | 'seafood' | 'rice' | 'pasta' | 'potatoes' | 'oats' | 'cheese' | 'milk' | 'yogurt' | 'whey' | 'nuts' | 'other';
export type ProgressionPreference = 'linear_overload' | 'undulating' | 'autoregulated' | 'no_preference';
export type SessionEmphasis = 'strength' | 'hypertrophy' | 'balanced' | 'conditioning' | 'no_preference';
export type PrepDiscipline = 'bodybuilding' | 'powerlifting';
export type PrepPhase = 'cut' | 'bulk';

// NEW: Enhanced Nutrition Types
export type ProteinSource = 'chicken' | 'turkey' | 'beef' | 'pork' | 'fish' | 'shellfish' | 'eggs' | 'dairy' | 'tofu_tempeh' | 'legumes' | 'protein_powder';
export type CarbSource = 'rice' | 'oats' | 'sweet_potato' | 'potato' | 'quinoa' | 'pasta' | 'bread' | 'fruit';
export type FatSource = 'olive_oil' | 'almonds' | 'walnuts' | 'avocado' | 'peanut_butter' | 'chia_seeds' | 'coconut_oil' | 'cheese';
export type WakeTime = '5_6am' | '7_8am' | '9_10am' | 'other';
export type FirstMealDelay = 'immediate' | '1_2hrs' | '3hrs_plus';
export type LastMealBeforeBed = '2hrs' | '3_4hrs' | 'no_constraint';
export type TrainingTime = 'early_morning' | 'mid_morning' | 'midday' | 'afternoon' | 'evening' | 'no_training';
export type CarbTolerance = 'energized_satiated' | 'hungry_quickly' | 'tired_sleepy' | 'bloated';
export type CookingLevel = 'minimal' | 'basic' | 'moderate' | 'full';

export interface OnboardingData {
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  sex: 'male' | 'female' | null;
  height_ft: number | null;
  height_in: number | null;
  current_weight_lb: number | null;
  target_weight_enabled: boolean;
  target_weight_lb: number | null;
  goal_timeline: GoalTimeline | null;
  target_date: string | null;
  goal_type: GoalType | null;
  activity_level: ActivityLevel | null;
  step_tracking: boolean;
  avg_steps: number | null;
  sleep_hours: SleepHours | null;
  training_days_per_week: number | null;
  training_days: Weekday[];
  minutes_per_workout: MinutesPerWorkout | null;
  preferred_days_off: Weekday[];
  experience_level: ExperienceLevel | null;
  injuries: Injury[];
  injuries_other_text: string | null;
  equipment_access: EquipmentAccess | null;
  equipment_other_text: string | null;
  preferred_split_family: string | null;
  technique_preferences: string[];
  progression_preference: ProgressionPreference | null;
  session_emphasis: SessionEmphasis | null;
  prep_mode_enabled: boolean;
  prep_discipline: PrepDiscipline | null;
  prep_phase: PrepPhase | null;
  prep_auto_adjust_enabled: boolean;
  dietary_preference: DietaryPreference | null;
  dietary_preference_other_text: string | null;
  allergies_exclusions: AllergyExclusion[];
  allergies_other_text: string | null;
  refused_foods: RefusedFood[];
  refused_foods_other_text: string | null;
  meals_per_day: MealsPerDay | null;
  // NEW: Enhanced Nutrition Fields
  preferred_proteins: ProteinSource[];
  preferred_carbs: CarbSource[];
  preferred_fats: FatSource[];
  traditional_meals: boolean;
  wake_time: WakeTime | null;
  first_meal_delay: FirstMealDelay | null;
  last_meal_before_bed: LastMealBeforeBed | null;
  training_time: TrainingTime | null;
  carb_tolerance: CarbTolerance | null;
  cooking_level: CookingLevel | null;
  userId: string | null;
}

interface OnboardingContextType {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  resetData: () => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
}

const defaultData: OnboardingData = {
  first_name: null,
  last_name: null,
  dob: null,
  sex: null,
  height_ft: null,
  height_in: null,
  current_weight_lb: null,
  target_weight_enabled: true,
  target_weight_lb: null,
  goal_timeline: null,
  target_date: null,
  goal_type: null,
  activity_level: null,
  step_tracking: false,
  avg_steps: null,
  sleep_hours: null,
  training_days_per_week: null,
  training_days: [],
  minutes_per_workout: null,
  preferred_days_off: [],
  experience_level: null,
  injuries: [],
  injuries_other_text: null,
  equipment_access: null,
  equipment_other_text: null,
  preferred_split_family: null,
  technique_preferences: [],
  progression_preference: null,
  session_emphasis: null,
  prep_mode_enabled: false,
  prep_discipline: null,
  prep_phase: null,
  prep_auto_adjust_enabled: false,
  dietary_preference: null,
  dietary_preference_other_text: null,
  allergies_exclusions: [],
  allergies_other_text: null,
  refused_foods: [],
  refused_foods_other_text: null,
  meals_per_day: null,
  // NEW: Enhanced Nutrition Defaults
  preferred_proteins: [],
  preferred_carbs: [],
  preferred_fats: [],
  traditional_meals: true,
  wake_time: null,
  first_meal_delay: null,
  last_meal_before_bed: null,
  training_time: null,
  carb_tolerance: null,
  cooking_level: null,
  userId: null,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [currentStep, setCurrentStep] = useState(1);
  // Updated to 7 steps for the new flow:
  // 1. Identity → 2. About You → 3. Height → 4. Weight → 5. Goals → 6. Training → 7. Nutrition
  const totalSteps = 7;

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetData = useCallback(() => {
    setData(defaultData);
    setCurrentStep(1);
  }, []);

  return (
    <OnboardingContext.Provider value={{ data, updateData, resetData, currentStep, setCurrentStep, totalSteps }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
