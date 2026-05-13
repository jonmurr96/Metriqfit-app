export type GoalType =
  | 'lose_weight'
  | 'build_muscle'
  | 'get_fitter'
  | 'gain_weight'
  | 'maintain_weight'
  | 'recomp'
  | 'increase_endurance'
  | 'general_fitness';

export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type DietaryPreference = 'anything' | 'vegetarian' | 'vegan' | 'keto' | 'paleo' | 'pescatarian' | 'other';
export type CarbTolerance = 'energized_satiated' | 'hungry_quickly' | 'tired_sleepy' | 'bloated';
export type MinutesPerWorkout = '30' | '45' | '60' | '90_plus' | string;

export interface TargetInput {
  sex: 'male' | 'female';
  dob: string;
  height_ft: number;
  height_in: number;
  current_weight_lb: number;
  goal_type: GoalType;
  activity_level: ActivityLevel;
  training_days_per_week: number;
  minutes_per_workout: MinutesPerWorkout;
  experience_level: ExperienceLevel;
  dietary_preference?: DietaryPreference | null;
  carb_tolerance?: CarbTolerance | null;
  avg_steps?: number | null;
  target_weight_lb?: number | null;
  target_date?: string | null;
  reference_date?: string | null;
}

export interface DayMacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface TargetDiagnostics {
  method_version: string;
  age: number;
  bmr: number;
  lifestyle_multiplier: number;
  lifestyle_tdee: number;
  training_kcal_per_day: number;
  steps_kcal_per_day: number;
  estimated_tdee: number;
  goal_adjustment_kcal: number;
  weight_delta_lb: number;
  target_weeks: number | null;
  target_rate_lb_per_week: number | null;
  clamped_rate_lb_per_week: number | null;
  training_day_count: number;
  rest_day_count: number;
  warnings: string[];
}

export interface TargetOutput extends DayMacroTargets {
  water_ml: number;
  computation_method: string;
  daily: DayMacroTargets;
  trainingDay: DayMacroTargets;
  restDay: DayMacroTargets;
  day_type_targets: {
    daily: DayMacroTargets;
    trainingDay: DayMacroTargets;
    restDay: DayMacroTargets;
  };
  target_diagnostics: TargetDiagnostics;
}

const LB_TO_KG = 0.45359237;
const IN_TO_CM = 2.54;
const OZ_TO_ML = 29.5735;
const CALORIES_PER_LB = 3500;
const METHOD_VERSION = 'mifflin_st_jeor_training_load_v2';

const LIFESTYLE_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.3,
  moderately_active: 1.4,
  very_active: 1.5,
};

const BASELINE_STEPS: Record<ActivityLevel, number> = {
  sedentary: 3000,
  lightly_active: 6000,
  moderately_active: 8500,
  very_active: 11000,
};

const DEFAULT_GOAL_ADJUSTMENTS: Record<GoalType, number> = {
  lose_weight: -450,
  build_muscle: 250,
  get_fitter: 0,
  gain_weight: 350,
  maintain_weight: 0,
  recomp: -150,
  increase_endurance: 100,
  general_fitness: 0,
};

const PROTEIN_G_PER_KG: Record<GoalType, Record<ExperienceLevel, number>> = {
  lose_weight: { beginner: 2.0, intermediate: 2.2, advanced: 2.3 },
  recomp: { beginner: 1.9, intermediate: 2.1, advanced: 2.2 },
  maintain_weight: { beginner: 1.5, intermediate: 1.7, advanced: 1.8 },
  general_fitness: { beginner: 1.5, intermediate: 1.7, advanced: 1.8 },
  increase_endurance: { beginner: 1.5, intermediate: 1.7, advanced: 1.8 },
  gain_weight: { beginner: 1.8, intermediate: 2.0, advanced: 2.1 },
  build_muscle: { beginner: 1.9, intermediate: 2.1, advanced: 2.2 },
  get_fitter: { beginner: 1.5, intermediate: 1.7, advanced: 1.8 },
};

const SAFETY_MIN_CALORIES = { male: 1500, female: 1200 };
const GOAL_TYPES = new Set<GoalType>([
  'lose_weight',
  'build_muscle',
  'get_fitter',
  'gain_weight',
  'maintain_weight',
  'recomp',
  'increase_endurance',
  'general_fitness',
]);
const ACTIVITY_LEVELS = new Set<ActivityLevel>(['sedentary', 'lightly_active', 'moderately_active', 'very_active']);
const EXPERIENCE_LEVELS = new Set<ExperienceLevel>(['beginner', 'intermediate', 'advanced']);

function assertFiniteNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid target input: ${field} must be a finite number.`);
  }
}

function validateTargetInput(input: TargetInput): void {
  if (input.sex !== 'male' && input.sex !== 'female') {
    throw new Error('Invalid target input: sex must be male or female.');
  }
  if (!input.dob || !Number.isFinite(new Date(input.dob).getTime())) {
    throw new Error('Invalid target input: dob must be a valid date.');
  }
  assertFiniteNumber(input.height_ft, 'height_ft');
  assertFiniteNumber(input.height_in, 'height_in');
  assertFiniteNumber(input.current_weight_lb, 'current_weight_lb');
  assertFiniteNumber(input.training_days_per_week, 'training_days_per_week');
  if (input.height_ft < 3 || input.height_ft > 8 || input.height_in < 0 || input.height_in >= 12) {
    throw new Error('Invalid target input: height must be in realistic feet/inches bounds.');
  }
  if (input.current_weight_lb < 70 || input.current_weight_lb > 700) {
    throw new Error('Invalid target input: current_weight_lb is outside supported bounds.');
  }
  if (input.target_weight_lb != null && (!Number.isFinite(input.target_weight_lb) || input.target_weight_lb < 70 || input.target_weight_lb > 700)) {
    throw new Error('Invalid target input: target_weight_lb is outside supported bounds.');
  }
  if (input.avg_steps != null && (!Number.isFinite(input.avg_steps) || input.avg_steps < 0 || input.avg_steps > 60000)) {
    throw new Error('Invalid target input: avg_steps is outside supported bounds.');
  }
  if (!GOAL_TYPES.has(input.goal_type)) {
    throw new Error('Invalid target input: unsupported goal_type.');
  }
  if (!ACTIVITY_LEVELS.has(input.activity_level)) {
    throw new Error('Invalid target input: unsupported activity_level.');
  }
  if (!EXPERIENCE_LEVELS.has(input.experience_level)) {
    throw new Error('Invalid target input: unsupported experience_level.');
  }
}

function calculateAge(dob: string, referenceDate?: string | null): number {
  const birthDate = new Date(dob);
  const today = referenceDate ? new Date(referenceDate) : new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (!Number.isFinite(age) || age < 13 || age > 100) {
    throw new Error('Invalid target input: age is outside supported bounds.');
  }
  return age;
}

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseWorkoutMinutes(value: MinutesPerWorkout): number {
  if (value === '90_plus') return 90;
  const parsed = Number.parseInt(String(value || '60'), 10);
  return Number.isFinite(parsed) ? clamp(parsed, 20, 120) : 60;
}

function daysBetween(start: string | null | undefined, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) return null;
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / 86_400_000);
  return days > 0 ? days : null;
}

function calculateBmr(input: TargetInput, age: number): number {
  const heightCm = (input.height_ft * 12 + input.height_in) * IN_TO_CM;
  const weightKg = input.current_weight_lb * LB_TO_KG;
  return input.sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

function estimateTrainingKcalPerDay(weightKg: number, daysPerWeek: number, minutesPerWorkout: number): number {
  if (daysPerWeek <= 0 || minutesPerWorkout <= 0) return 0;
  const resistanceTrainingMet = 5.5;
  const kcalPerSession = resistanceTrainingMet * 3.5 * weightKg / 200 * minutesPerWorkout;
  return kcalPerSession * clamp(daysPerWeek, 0, 7) / 7;
}

function estimateStepsKcalPerDay(input: TargetInput): number {
  if (!input.avg_steps || input.avg_steps <= 0) return 0;
  const expectedSteps = BASELINE_STEPS[input.activity_level];
  const stepDelta = input.avg_steps - expectedSteps;
  return clamp(stepDelta * 0.04, -180, 260);
}

function maxWeeklyChangePercent(goal: GoalType, experience: ExperienceLevel): number {
  if (goal === 'lose_weight') return 0.0075;
  if (goal === 'recomp') return 0.0035;
  if (goal === 'build_muscle') {
    if (experience === 'beginner') return 0.0045;
    if (experience === 'intermediate') return 0.0035;
    return 0.0025;
  }
  if (goal === 'gain_weight') return 0.006;
  return 0.003;
}

function minWeeklyChangePercent(goal: GoalType): number {
  if (goal === 'maintain_weight' || goal === 'general_fitness' || goal === 'get_fitter' || goal === 'increase_endurance') {
    return 0;
  }
  return 0.0015;
}

function calculateGoalAdjustment(input: TargetInput, tdee: number) {
  const warnings: string[] = [];
  const targetWeight = input.target_weight_lb ?? input.current_weight_lb;
  const weightDelta = targetWeight - input.current_weight_lb;
  const referenceDate = input.reference_date || new Date().toISOString().slice(0, 10);
  const targetDays = daysBetween(referenceDate, input.target_date);
  const targetWeeks = targetDays ? targetDays / 7 : null;
  let targetRate: number | null = null;
  let clampedRate: number | null = null;
  let adjustment = DEFAULT_GOAL_ADJUSTMENTS[input.goal_type] || 0;

  if (targetWeeks && Math.abs(weightDelta) >= 1) {
    targetRate = weightDelta / targetWeeks;
    const intendedDirection =
      input.goal_type === 'lose_weight' || input.goal_type === 'recomp' ? -1 :
      input.goal_type === 'build_muscle' || input.goal_type === 'gain_weight' ? 1 :
      Math.sign(weightDelta);
    const directionMatches = intendedDirection === 0 || Math.sign(targetRate) === intendedDirection;

    if (directionMatches) {
      const minWeekly = input.current_weight_lb * minWeeklyChangePercent(input.goal_type);
      const maxWeekly = input.current_weight_lb * maxWeeklyChangePercent(input.goal_type, input.experience_level);
      const absRate = Math.abs(targetRate);
      const clampedAbsRate = clamp(absRate, minWeekly, maxWeekly || absRate);
      clampedRate = clampedAbsRate * Math.sign(targetRate);

      if (Math.abs(clampedRate - targetRate) > 0.05) {
        warnings.push('target_rate_clamped');
      }

      const caloriesPerLb =
        input.goal_type === 'build_muscle' ? 2500 :
        input.goal_type === 'gain_weight' ? 3000 :
        CALORIES_PER_LB;
      adjustment = clampedRate * caloriesPerLb / 7;
    } else {
      warnings.push('target_weight_direction_conflicts_with_goal');
    }
  } else if (
    (input.goal_type === 'maintain_weight' || input.goal_type === 'general_fitness' || input.goal_type === 'get_fitter') &&
    Math.abs(weightDelta) >= 5
  ) {
    adjustment = clamp(weightDelta * 5, -150, 150);
  }

  const minCalories = SAFETY_MIN_CALORIES[input.sex];
  if (tdee + adjustment < minCalories) {
    warnings.push('minimum_calorie_floor_applied');
  }

  return {
    adjustment: roundToNearest(adjustment, 10),
    weightDelta,
    targetWeeks: targetWeeks ? round1(targetWeeks) : null,
    targetRate: targetRate === null ? null : round1(targetRate),
    clampedRate: clampedRate === null ? null : round1(clampedRate),
    warnings,
  };
}

function proteinGrams(input: TargetInput, weightKg: number): number {
  const perKg = PROTEIN_G_PER_KG[input.goal_type]?.[input.experience_level] ?? 1.7;
  return roundToNearest(clamp(weightKg * perKg, weightKg * 1.4, weightKg * 2.4), 5);
}

function fatPercent(input: TargetInput, dayType: 'daily' | 'training' | 'rest'): number {
  if (input.dietary_preference === 'keto') {
    return dayType === 'training' ? 0.52 : 0.58;
  }

  const carbTolerance = input.carb_tolerance || 'energized_satiated';
  let base =
    carbTolerance === 'hungry_quickly' ? 0.22 :
    carbTolerance === 'tired_sleepy' ? 0.32 :
    carbTolerance === 'bloated' ? 0.38 :
    0.25;

  if (input.goal_type === 'lose_weight' || input.goal_type === 'recomp') base += 0.02;
  if (input.goal_type === 'increase_endurance' || input.goal_type === 'build_muscle' || input.goal_type === 'gain_weight') base -= 0.02;
  if (dayType === 'training') base -= 0.03;
  if (dayType === 'rest') base += 0.04;

  return clamp(base, 0.2, 0.45);
}

function fiberTarget(calories: number, input: TargetInput): number {
  if (input.dietary_preference === 'keto') return roundToNearest(clamp(calories / 1000 * 10, 18, 35), 1);
  return roundToNearest(clamp(calories / 1000 * 14, 25, 55), 1);
}

function buildDayTargets(
  calories: number,
  protein_g: number,
  input: TargetInput,
  dayType: 'daily' | 'training' | 'rest',
): DayMacroTargets {
  let fat_g = roundToNearest(calories * fatPercent(input, dayType) / 9, 5);
  const weightKg = input.current_weight_lb * LB_TO_KG;
  const minFat = roundToNearest(weightKg * 0.6, 5);
  fat_g = Math.max(fat_g, minFat);

  let carbs_g = roundToNearest((calories - protein_g * 4 - fat_g * 9) / 4, 5);

  if (input.dietary_preference === 'keto') {
    const ketoCarbCap = dayType === 'training' ? 75 : 50;
    carbs_g = Math.min(carbs_g, ketoCarbCap);
    fat_g = roundToNearest((calories - protein_g * 4 - carbs_g * 4) / 9, 5);
  }

  if (carbs_g < 0) {
    carbs_g = 0;
    fat_g = roundToNearest(Math.max(minFat, (calories - protein_g * 4) / 9), 5);
  }

  return {
    calories: Math.round(calories),
    protein_g: Math.round(protein_g),
    carbs_g: Math.round(carbs_g),
    fat_g: Math.round(fat_g),
    fiber_g: Math.round(fiberTarget(calories, input)),
  };
}

function weightedAverage(
  trainingDay: DayMacroTargets,
  restDay: DayMacroTargets,
  trainingDays: number,
): DayMacroTargets {
  const train = clamp(trainingDays, 0, 7);
  const rest = 7 - train;
  const avg = (key: keyof DayMacroTargets) => roundToNearest((trainingDay[key] * train + restDay[key] * rest) / 7, key === 'calories' ? 10 : 5);
  return {
    calories: Math.round(avg('calories')),
    protein_g: Math.round(avg('protein_g')),
    carbs_g: Math.round(avg('carbs_g')),
    fat_g: Math.round(avg('fat_g')),
    fiber_g: Math.round(avg('fiber_g')),
  };
}

export function calculateTargets(input: TargetInput): TargetOutput {
  validateTargetInput(input);
  const trainingDays = clamp(Math.round(input.training_days_per_week || 0), 0, 7);
  const restDays = 7 - trainingDays;
  const age = calculateAge(input.dob, input.reference_date);
  const weightKg = input.current_weight_lb * LB_TO_KG;
  const bmr = calculateBmr(input, age);
  const lifestyleMultiplier = LIFESTYLE_MULTIPLIERS[input.activity_level];
  const lifestyleTdee = bmr * lifestyleMultiplier;
  const trainingKcalPerDay = estimateTrainingKcalPerDay(weightKg, trainingDays, parseWorkoutMinutes(input.minutes_per_workout));
  const stepsKcalPerDay = estimateStepsKcalPerDay(input);
  const estimatedTdee = lifestyleTdee + trainingKcalPerDay + stepsKcalPerDay;
  const goal = calculateGoalAdjustment(input, estimatedTdee);
  const averageCalories = roundToNearest(Math.max(estimatedTdee + goal.adjustment, SAFETY_MIN_CALORIES[input.sex]), 10);
  const protein_g = proteinGrams(input, weightKg);

  let trainingCalories = averageCalories;
  let restCalories = averageCalories;
  if (trainingDays > 0 && restDays > 0) {
    const cyclingPercent =
      input.goal_type === 'increase_endurance' ? 0.05 :
      input.goal_type === 'build_muscle' || input.goal_type === 'gain_weight' ? 0.04 :
      0.03;
    trainingCalories = roundToNearest(averageCalories * (1 + cyclingPercent), 10);
    restCalories = roundToNearest((averageCalories * 7 - trainingCalories * trainingDays) / restDays, 10);
    if (restCalories < averageCalories * 0.9) {
      restCalories = roundToNearest(averageCalories * 0.9, 10);
      trainingCalories = roundToNearest((averageCalories * 7 - restCalories * restDays) / trainingDays, 10);
    }
  }

  const trainingDay = buildDayTargets(trainingCalories, protein_g, input, 'training');
  const restDay = buildDayTargets(restCalories, protein_g, input, 'rest');
  const daily = trainingDays === 0
    ? buildDayTargets(averageCalories, protein_g, input, 'daily')
    : weightedAverage(trainingDay, restDay, trainingDays);

  const baselineOz = input.current_weight_lb * 0.5;
  const trainingBonusOz = trainingDays >= 5 ? 16 : trainingDays >= 3 ? 12 : trainingDays > 0 ? 6 : 0;
  const stepsBonusOz = input.avg_steps && input.avg_steps >= 10000 ? 16 : input.avg_steps && input.avg_steps >= 8000 ? 8 : 0;
  const water_ml = Math.round(clamp(baselineOz + trainingBonusOz + stepsBonusOz, 60, 180) * OZ_TO_ML);

  const target_diagnostics: TargetDiagnostics = {
    method_version: METHOD_VERSION,
    age,
    bmr: Math.round(bmr),
    lifestyle_multiplier: lifestyleMultiplier,
    lifestyle_tdee: Math.round(lifestyleTdee),
    training_kcal_per_day: Math.round(trainingKcalPerDay),
    steps_kcal_per_day: Math.round(stepsKcalPerDay),
    estimated_tdee: Math.round(estimatedTdee),
    goal_adjustment_kcal: Math.round(goal.adjustment),
    weight_delta_lb: round1(goal.weightDelta),
    target_weeks: goal.targetWeeks,
    target_rate_lb_per_week: goal.targetRate,
    clamped_rate_lb_per_week: goal.clampedRate,
    training_day_count: trainingDays,
    rest_day_count: restDays,
    warnings: goal.warnings,
  };

  return {
    ...daily,
    water_ml,
    computation_method: METHOD_VERSION,
    daily,
    trainingDay,
    restDay,
    day_type_targets: { daily, trainingDay, restDay },
    target_diagnostics,
  };
}
