import type { GoalType, ActivityLevel, ExperienceLevel } from '../onboarding/OnboardingContext';

interface TargetInput {
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
  avg_steps?: number | null;
  target_weight_lb: number;
  target_date?: string | null;
  dietary_preference?: string | null;
}

interface TargetOutput {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  water_ml: number;
  computation_method?: string;
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

const CALORIE_ADJUSTMENTS: Record<GoalType, { mode: string; kcal?: number; min_kcal?: number; max_kcal?: number; default_kcal?: number }> = {
  maintain_weight: { mode: 'offset', kcal: 0 },
  general_fitness: { mode: 'offset', kcal: 0 },
  increase_endurance: { mode: 'offset', kcal: 150 },
  lose_weight: { mode: 'range_deficit', min_kcal: 300, max_kcal: 700, default_kcal: 450 },
  recomp: { mode: 'offset', kcal: 0 },
  gain_weight: { mode: 'range_surplus', min_kcal: 200, max_kcal: 500, default_kcal: 300 },
  build_muscle: { mode: 'range_surplus', min_kcal: 250, max_kcal: 600, default_kcal: 350 },
  get_fitter: { mode: 'range_deficit', min_kcal: 150, max_kcal: 300, default_kcal: 200 },
};

const PROTEIN_G_PER_LB: Record<GoalType, Record<ExperienceLevel, number>> = {
  lose_weight: { beginner: 1.0, intermediate: 1.05, advanced: 1.1 },
  recomp: { beginner: 1.0, intermediate: 1.05, advanced: 1.1 },
  maintain_weight: { beginner: 0.8, intermediate: 0.9, advanced: 1.0 },
  general_fitness: { beginner: 0.8, intermediate: 0.9, advanced: 1.0 },
  increase_endurance: { beginner: 0.8, intermediate: 0.9, advanced: 1.0 },
  gain_weight: { beginner: 0.8, intermediate: 0.9, advanced: 1.0 },
  build_muscle: { beginner: 0.85, intermediate: 0.95, advanced: 1.05 },
  get_fitter: { beginner: 0.8, intermediate: 0.9, advanced: 1.0 },
};

const FAT_G_PER_LB_DEFAULT = 0.35;
const FAT_G_PER_LB_MIN = 0.3;
const FAT_G_PER_LB_MAX = 0.4;

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

export function calculateTargets(input: TargetInput): TargetOutput {
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
    avg_steps,
  } = input;

  const age = calculateAge(dob);
  const heightInches = height_ft * 12 + height_in;
  const heightCm = heightInches * IN_TO_CM;
  const weightKg = current_weight_lb * LB_TO_KG;

  let bmr: number;
  if (sex === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  const activityMultiplier = ACTIVITY_MULTIPLIERS[activity_level];
  const tdee = bmr * activityMultiplier;

  const adjustment = CALORIE_ADJUSTMENTS[goal_type];
  if (!adjustment) {
    throw new Error(`Invalid or missing goal type: ${String(goal_type)}`);
  }
  let goalAdjustment = 0;

  if (adjustment.mode === 'offset') {
    goalAdjustment = adjustment.kcal || 0;
  } else if (adjustment.mode === 'range_deficit') {
    goalAdjustment = -(adjustment.default_kcal || 450);
  } else if (adjustment.mode === 'range_surplus') {
    goalAdjustment = adjustment.default_kcal || 300;
  }

  // Scale adjustment by target weight delta for more aggressive/personalized targets
  const weightDelta = (input.target_weight_lb ?? current_weight_lb) - current_weight_lb;
  if (adjustment.mode === 'range_deficit' && weightDelta < 0) {
    const scale = clamp(Math.abs(weightDelta) / 20, 0.5, 1.5); // 0.5x for small deltas, 1.5x for large
    goalAdjustment = -(clamp((adjustment.default_kcal || 450) * scale, adjustment.min_kcal || 300, adjustment.max_kcal || 700));
  } else if (adjustment.mode === 'range_surplus' && weightDelta > 0) {
    const scale = clamp(weightDelta / 20, 0.6, 1.6);
    goalAdjustment = clamp((adjustment.default_kcal || 350) * scale, adjustment.min_kcal || 200, adjustment.max_kcal || 600);
  } else if (adjustment.mode === 'offset') {
    // For get_fitter / maintain, nudge slightly toward target if there's a small delta
    if (Math.abs(weightDelta) >= 5) {
      goalAdjustment = clamp(weightDelta * 5, -150, 150);
    }
  }

  let calories = tdee + goalAdjustment;
  const minCalories = SAFETY_MIN_CALORIES[sex];
  calories = Math.max(calories, minCalories);
  calories = roundToNearest(calories, 10);

  const proteinPerLb = PROTEIN_G_PER_LB[goal_type]?.[experience_level];
  if (proteinPerLb === undefined) {
    throw new Error(`Invalid goal type or experience level: ${String(goal_type)}, ${String(experience_level)}`);
  }
  let protein_g = current_weight_lb * proteinPerLb;
  protein_g = roundToNearest(protein_g, 5);
  // Cap protein to avoid unreachable targets for users with high body fat
  protein_g = Math.min(protein_g, 220);

  let fat_g = current_weight_lb * FAT_G_PER_LB_DEFAULT;
  fat_g = clamp(fat_g, current_weight_lb * FAT_G_PER_LB_MIN, current_weight_lb * FAT_G_PER_LB_MAX);
  fat_g = roundToNearest(fat_g, 5);

  let carbs_g = (calories - (protein_g * 4 + fat_g * 9)) / 4;
  carbs_g = Math.max(0, roundToNearest(carbs_g, 5));

  // Keto/very-low-carb override: dietary preference must drive the macro split, not just food selection.
  // Keto: ≤50g net carbs (≈5% of calories), fat fills residual after protein.
  const dietPref = (input.dietary_preference || '').toLowerCase();
  if (dietPref === 'keto' || dietPref === 'ketogenic' || dietPref === 'very_low_carb') {
    carbs_g = Math.min(carbs_g, 50);
    carbs_g = roundToNearest(carbs_g, 5);
    fat_g = Math.round((calories - protein_g * 4 - carbs_g * 4) / 9);
    fat_g = Math.max(fat_g, roundToNearest(current_weight_lb * FAT_G_PER_LB_MIN, 5));
    fat_g = roundToNearest(fat_g, 5);
  }

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
  const water_target_ml = Math.round(waterTargetOz * OZ_TO_ML);

  return {
    calories: Math.round(calories),
    protein_g: Math.round(protein_g),
    carbs_g: Math.round(carbs_g),
    fat_g: Math.round(fat_g),
    water_ml: water_target_ml,
    computation_method: 'mifflin_st_jeor',
  };
}
