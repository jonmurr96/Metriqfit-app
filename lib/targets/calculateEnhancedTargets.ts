/**
 * Enhanced Target Calculator
 * 
 * Calculates personalized macro targets with carb tolerance adjustments
 */

import type { GoalType, ActivityLevel, ExperienceLevel, CarbTolerance } from '../onboarding';

export interface EnhancedTargetInput {
  sex: 'male' | 'female';
  dob: string;
  height_ft: number;
  height_in: number;
  current_weight_lb: number;
  goal_type: GoalType;
  activity_level: ActivityLevel;
  training_days_per_week: number;
  minutes_per_workout: string;
  experience_level: ExperienceLevel;
  carb_tolerance: CarbTolerance;
  avg_steps?: number | null;
  target_weight_lb?: number | null;
  target_date?: string | null;
}

export interface DayTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface EnhancedTargetOutput {
  trainingDay: DayTargets;
  restDay: DayTargets;
  computation_method: string;
  water_ml: number;
}

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;
const OZ_TO_ML = 29.5735;

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

const CALORIE_ADJUSTMENTS: Record<GoalType, { mode: string; kcal?: number; default_kcal?: number }> = {
  maintain_weight: { mode: 'offset', kcal: 0 },
  general_fitness: { mode: 'offset', kcal: 0 },
  increase_endurance: { mode: 'offset', kcal: 150 },
  lose_weight: { mode: 'range_deficit', default_kcal: 450 },
  recomp: { mode: 'range_deficit', default_kcal: 250 },
  gain_weight: { mode: 'range_surplus', default_kcal: 300 },
};

const PROTEIN_G_PER_LB: Record<GoalType, Record<ExperienceLevel, number>> = {
  lose_weight: { beginner: 1.0, intermediate: 1.05, advanced: 1.1 },
  recomp: { beginner: 1.0, intermediate: 1.05, advanced: 1.1 },
  maintain_weight: { beginner: 0.8, intermediate: 0.9, advanced: 1.0 },
  general_fitness: { beginner: 0.8, intermediate: 0.9, advanced: 1.0 },
  increase_endurance: { beginner: 0.8, intermediate: 0.9, advanced: 1.0 },
  gain_weight: { beginner: 0.8, intermediate: 0.9, advanced: 1.0 },
};

// Carb tolerance adjustments to macro ratios
const CARB_TOLERANCE_RATIOS: Record<CarbTolerance, { trainingCarb: number; restCarb: number; trainingFat: number; restFat: number }> = {
  // User feels good with carbs
  energized_satiated: {
    trainingCarb: 0.45, // 45% carbs on training days
    restCarb: 0.40,     // 40% carbs on rest days
    trainingFat: 0.25,  // 25% fat on training days
    restFat: 0.30,      // 30% fat on rest days
  },
  // User needs carbs for satiety
  hungry_quickly: {
    trainingCarb: 0.50, // Higher carbs for satiety
    restCarb: 0.45,
    trainingFat: 0.20,
    restFat: 0.25,
  },
  // User doesn't do well with carbs
  tired_sleepy: {
    trainingCarb: 0.35, // Lower carbs overall
    restCarb: 0.30,
    trainingFat: 0.35,  // Higher fat
    restFat: 0.40,
  },
  // User has GI issues with carbs
  bloated: {
    trainingCarb: 0.30, // Lowest carbs
    restCarb: 0.25,
    trainingFat: 0.40,  // Highest fat
    restFat: 0.45,
  },
};

const SAFETY_MIN_CALORIES = { male: 1500, female: 1200 };

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate enhanced targets with carb tolerance adjustments
 */
export function calculateEnhancedTargets(input: EnhancedTargetInput): EnhancedTargetOutput {
  const {
    sex,
    dob,
    height_ft,
    height_in,
    current_weight_lb,
    goal_type,
    activity_level,
    training_days_per_week,
    experience_level,
    carb_tolerance,
    avg_steps,
  } = input;

  const age = calculateAge(dob);
  const heightInches = height_ft * 12 + height_in;
  const heightCm = heightInches * IN_TO_CM;
  const weightKg = current_weight_lb * LB_TO_KG;

  // Calculate BMR using Mifflin-St Jeor
  let bmr: number;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  const activityMultiplier = ACTIVITY_MULTIPLIERS[activity_level];
  const tdee = bmr * activityMultiplier;

  // Apply goal adjustment
  const adjustment = CALORIE_ADJUSTMENTS[goal_type];
  let goalAdjustment = 0;

  if (adjustment.mode === 'offset') {
    goalAdjustment = adjustment.kcal || 0;
  } else if (adjustment.mode === 'range_deficit') {
    goalAdjustment = -(adjustment.default_kcal || 450);
  } else if (adjustment.mode === 'range_surplus') {
    goalAdjustment = adjustment.default_kcal || 300;
  }

  // Base calories (training day calories)
  let baseCalories = tdee + goalAdjustment;
  const minCalories = SAFETY_MIN_CALORIES[sex];
  baseCalories = Math.max(baseCalories, minCalories);
  baseCalories = roundToNearest(baseCalories, 10);

  // Calculate protein
  const proteinPerLb = PROTEIN_G_PER_LB[goal_type][experience_level];
  const protein_g = roundToNearest(current_weight_lb * proteinPerLb, 5);

  // Get macro ratios based on carb tolerance
  const ratios = CARB_TOLERANCE_RATIOS[carb_tolerance];

  // Calculate training day macros
  const trainingCalories = baseCalories;
  const trainingProteinCalories = protein_g * 4;
  const trainingCarbCalories = trainingCalories * ratios.trainingCarb;
  const trainingFatCalories = trainingCalories * ratios.trainingFat;

  // Verify calories add up (protein + carbs + fat should equal total)
  const totalMacroCalories = trainingProteinCalories + trainingCarbCalories + trainingFatCalories;
  const calorieAdjustment = trainingCalories / totalMacroCalories;

  const trainingDay: DayTargets = {
    calories: Math.round(trainingCalories),
    protein_g: Math.round(protein_g),
    carbs_g: Math.round((trainingCarbCalories * calorieAdjustment) / 4),
    fat_g: Math.round((trainingFatCalories * calorieAdjustment) / 9),
    fiber_g: Math.round(current_weight_lb * 0.14), // ~14g per 1000 calories standard
  };

  // Calculate rest day macros (slightly lower calories, different carb/fat split)
  const restCalories = roundToNearest(baseCalories * 0.92, 10); // 8% fewer calories on rest days
  const restProteinCalories = protein_g * 4;
  const restCarbCalories = restCalories * ratios.restCarb;
  const restFatCalories = restCalories * ratios.restFat;

  const restTotalMacroCalories = restProteinCalories + restCarbCalories + restFatCalories;
  const restCalorieAdjustment = restCalories / restTotalMacroCalories;

  const restDay: DayTargets = {
    calories: Math.round(restCalories),
    protein_g: Math.round(protein_g),
    carbs_g: Math.round((restCarbCalories * restCalorieAdjustment) / 4),
    fat_g: Math.round((restFatCalories * restCalorieAdjustment) / 9),
    fiber_g: Math.round(current_weight_lb * 0.12), // Slightly less fiber on rest days
  };

  // Calculate water target
  const baselineOz = 0.5 * current_weight_lb;
  let trainingBonusOz = 6;
  if (training_days_per_week >= 5) {
    trainingBonusOz = 16;
  } else if (training_days_per_week >= 3) {
    trainingBonusOz = 12;
  }

  let stepsBonusOz = 0;
  if (avg_steps && avg_steps >= 10000) {
    stepsBonusOz = 16;
  } else if (avg_steps && avg_steps >= 8000) {
    stepsBonusOz = 8;
  }

  const waterTargetOz = clamp(baselineOz + trainingBonusOz + stepsBonusOz, 60, 180);
  const water_ml = Math.round(waterTargetOz * OZ_TO_ML);

  return {
    trainingDay,
    restDay,
    computation_method: 'mifflin_st_jeor_carb_adaptive',
    water_ml,
  };
}

/**
 * Get macro split description for display
 */
export function getMacroSplitDescription(carbTolerance: CarbTolerance): string {
  switch (carbTolerance) {
    case 'energized_satiated':
      return 'Balanced macros with moderate carbs for sustained energy';
    case 'hungry_quickly':
      return 'Higher carb approach for improved satiety';
    case 'tired_sleepy':
      return 'Moderate-low carbs to prevent energy crashes';
    case 'bloated':
      return 'Lower carb, higher fat for digestive comfort';
    default:
      return 'Balanced macro approach';
  }
}
