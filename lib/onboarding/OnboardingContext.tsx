import React, { createContext, useContext, useState, useCallback } from 'react';

export type GoalType = 'lose_weight' | 'gain_weight' | 'maintain_weight' | 'recomp' | 'increase_endurance' | 'general_fitness';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
export type SleepHours = 'lt5' | '5_6' | '6_7' | '7_8' | '8_plus';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentAccess = 'full_gym' | 'dumbbells_only' | 'dumbbells_plus_bench' | 'bands_only' | 'bodyweight_only' | 'other';
export type DietaryPreference = 'anything' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'pescatarian' | 'other';
export type GoalTimeline = '1_month' | '3_months' | '6_months' | '1_year' | 'custom_date';
export type MinutesPerWorkout = '30' | '45' | '60' | '90_plus';
export type MealsPerDay = '2' | '3' | '4' | '5_plus' | 'no_preference';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'no_preference';
export type Injury = 'shoulders' | 'knees' | 'back' | 'wrists' | 'ankles' | 'hips' | 'elbows' | 'neck' | 'other' | 'none';
export type AllergyExclusion = 'gluten' | 'dairy' | 'peanuts' | 'soy' | 'eggs' | 'shellfish' | 'fish' | 'other' | 'none';
export type RefusedFood = 'pork' | 'beef' | 'chicken' | 'turkey' | 'seafood' | 'rice' | 'pasta' | 'potatoes' | 'oats' | 'cheese' | 'milk' | 'yogurt' | 'whey' | 'nuts' | 'other';

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
  minutes_per_workout: MinutesPerWorkout | null;
  preferred_days_off: Weekday[];
  experience_level: ExperienceLevel | null;
  injuries: Injury[];
  injuries_other_text: string | null;
  equipment_access: EquipmentAccess | null;
  equipment_other_text: string | null;
  dietary_preference: DietaryPreference | null;
  dietary_preference_other_text: string | null;
  allergies_exclusions: AllergyExclusion[];
  allergies_other_text: string | null;
  refused_foods: RefusedFood[];
  refused_foods_other_text: string | null;
  meals_per_day: MealsPerDay | null;
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
  target_weight_enabled: false,
  target_weight_lb: null,
  goal_timeline: null,
  target_date: null,
  goal_type: null,
  activity_level: null,
  step_tracking: false,
  avg_steps: null,
  sleep_hours: null,
  training_days_per_week: null,
  minutes_per_workout: null,
  preferred_days_off: [],
  experience_level: null,
  injuries: [],
  injuries_other_text: null,
  equipment_access: null,
  equipment_other_text: null,
  dietary_preference: null,
  dietary_preference_other_text: null,
  allergies_exclusions: [],
  allergies_other_text: null,
  refused_foods: [],
  refused_foods_other_text: null,
  meals_per_day: null,
  userId: null,
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

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
