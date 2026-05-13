#!/usr/bin/env -S deno run --allow-read --allow-write

import {
  calculateTargets,
  type ActivityLevel,
  type CarbTolerance,
  type DietaryPreference,
  type ExperienceLevel,
  type GoalType,
  type MinutesPerWorkout,
  type TargetInput,
  type TargetOutput,
} from '../lib/targets/calculateTargets.ts';
import { normalizeOnboardingAnswers } from '../lib/onboarding/normalize.ts';
import { validateNutritionOnboarding } from '../lib/nutrition/meal-generation-service.ts';
import {
  formatMealFrequencyLabel,
  getMealFrequencyAdvisory,
  getMealFrequencyWarning,
  mealFrequencyChoiceToCount,
  recommendMealFrequency,
  resolveMealFrequencyChoice,
  type MealFrequencyRecommendation,
  type MealFrequencyWarningLevel,
} from '../lib/nutrition/meal-frequency.ts';

type MealChoice = '2' | '3' | '4' | '5_plus' | 'no_preference';
type OptionalMealChoice = MealChoice | null;
type AllergyExclusion = 'gluten' | 'dairy' | 'peanuts' | 'soy' | 'eggs' | 'shellfish' | 'fish' | 'other' | 'none';
type RefusedFood = 'pork' | 'beef' | 'chicken' | 'turkey' | 'seafood' | 'rice' | 'pasta' | 'potatoes' | 'oats' | 'cheese' | 'milk' | 'yogurt' | 'whey' | 'nuts' | 'other';
type ProteinSource = 'chicken' | 'turkey' | 'beef' | 'pork' | 'fish' | 'shellfish' | 'eggs' | 'dairy' | 'tofu_tempeh' | 'legumes' | 'protein_powder';
type CarbSource = 'rice' | 'oats' | 'sweet_potato' | 'potato' | 'quinoa' | 'pasta' | 'bread' | 'fruit';
type FatSource = 'olive_oil' | 'almonds' | 'walnuts' | 'avocado' | 'peanut_butter' | 'chia_seeds' | 'coconut_oil' | 'cheese';
type WakeTime = '5_6am' | '7_8am' | '9_10am' | 'other';
type FirstMealDelay = 'immediate' | '1_2hrs' | '3hrs_plus';
type LastMealBeforeBed = '2hrs' | '3_4hrs' | 'no_constraint';
type TrainingTime = 'early_morning' | 'mid_morning' | 'midday' | 'afternoon' | 'evening' | 'no_training';
type CookingLevel = 'minimal' | 'basic' | 'moderate' | 'full';
type SessionGoalGroup = 'cut' | 'bulk' | 'maintain' | 'endurance';
type IssueKind = 'positive' | 'control' | 'autofill' | 'normalization';

type NutritionOnboardingInput = {
  first_name: string | null;
  last_name: string | null;
  dob: string | null;
  sex: 'male' | 'female' | null;
  height_ft: number | null;
  height_in: number | null;
  current_weight_lb: number | null;
  target_weight_enabled: boolean;
  target_weight_lb: number | null;
  goal_timeline: string | null;
  target_date: string | null;
  goal_type: GoalType | null;
  activity_level: ActivityLevel | null;
  step_tracking: boolean;
  avg_steps: number | null;
  sleep_hours: string | null;
  training_days_per_week: number | null;
  training_days: string[];
  minutes_per_workout: MinutesPerWorkout | null;
  preferred_days_off: string[];
  experience_level: ExperienceLevel | null;
  injuries: string[];
  injuries_other_text: string | null;
  equipment_access: string | null;
  equipment_other_text: string | null;
  preferred_split_family: string | null;
  technique_preferences: string[];
  progression_preference: string | null;
  session_emphasis: string | null;
  prep_mode_enabled: boolean;
  prep_discipline: string | null;
  prep_phase: string | null;
  prep_auto_adjust_enabled: boolean;
  dietary_preference: DietaryPreference | null;
  dietary_preference_other_text: string | null;
  allergies_exclusions: AllergyExclusion[];
  allergies_other_text: string | null;
  refused_foods: RefusedFood[];
  refused_foods_other_text: string | null;
  meals_per_day: MealChoice | null;
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
};

type GoalScenario = {
  id: string;
  label: string;
  input: TargetInput;
  goalType: GoalType;
};

type NutritionBundle = {
  id: string;
  label: string;
  dietary_preference: DietaryPreference;
  dietary_preference_other_text: string | null;
  allergies_exclusions: AllergyExclusion[];
  allergies_other_text: string | null;
  refused_foods: RefusedFood[];
  refused_foods_other_text: string | null;
  preferred_proteins: ProteinSource[];
  preferred_carbs: CarbSource[];
  preferred_fats: FatSource[];
  wake_time: WakeTime;
  first_meal_delay: FirstMealDelay;
  last_meal_before_bed: LastMealBeforeBed;
  training_time: TrainingTime;
  carb_tolerance: CarbTolerance;
  cooking_level: CookingLevel;
  traditional_meals: boolean;
};

type MatrixResult = {
  kind: IssueKind;
  id: string;
  goalId: string;
  bundleId: string;
  mealChoice: OptionalMealChoice;
  goalLabel: string;
  bundleLabel: string;
  status: 'pass' | 'fail' | 'expected-failure' | 'info';
  issues: string[];
  notes: string[];
  answers?: NutritionOnboardingInput;
  normalized?: ReturnType<typeof normalizeOnboardingAnswers>;
  targets?: TargetOutput;
  recommendation?: MealFrequencyRecommendation;
  resolvedMealsPerDay?: MealChoice | null;
  warningLevel?: MealFrequencyWarningLevel;
  screenMissing?: string[];
  serviceMissing?: string[];
  expectedFailure?: boolean;
};

const REFERENCE_DATE = '2026-05-02';
const REPORT_DIR = 'scripts/reports';
const JSON_REPORT = `${REPORT_DIR}/nutrition_onboarding_matrix_report.json`;
const MD_REPORT = `${REPORT_DIR}/nutrition_onboarding_matrix_report.md`;

const MEAL_CHOICES: MealChoice[] = ['2', '3', '4', '5_plus', 'no_preference'];

const GOAL_SCENARIOS: GoalScenario[] = [
  {
    id: 'cut_low_appetite',
    label: 'Cutting / lower appetite',
    goalType: 'lose_weight',
    input: {
      sex: 'female',
      dob: '1995-06-15',
      height_ft: 5,
      height_in: 5,
      current_weight_lb: 156,
      target_weight_lb: 142,
      goal_type: 'lose_weight',
      activity_level: 'moderately_active',
      training_days_per_week: 4,
      minutes_per_workout: '45',
      experience_level: 'intermediate',
      avg_steps: 8500,
      target_date: '2026-07-15',
      reference_date: REFERENCE_DATE,
    },
  },
  {
    id: 'cut_high_load',
    label: 'Cutting / high protein load',
    goalType: 'lose_weight',
    input: {
      sex: 'male',
      dob: '1990-03-10',
      height_ft: 6,
      height_in: 1,
      current_weight_lb: 212,
      target_weight_lb: 190,
      goal_type: 'lose_weight',
      activity_level: 'very_active',
      training_days_per_week: 6,
      minutes_per_workout: '90_plus',
      experience_level: 'advanced',
      avg_steps: 12000,
      target_date: '2026-08-15',
      reference_date: REFERENCE_DATE,
    },
  },
  {
    id: 'maintain_standard',
    label: 'Maintenance / standard schedule',
    goalType: 'maintain_weight',
    input: {
      sex: 'male',
      dob: '1988-09-22',
      height_ft: 5,
      height_in: 11,
      current_weight_lb: 182,
      target_weight_lb: 182,
      goal_type: 'maintain_weight',
      activity_level: 'moderately_active',
      training_days_per_week: 3,
      minutes_per_workout: '60',
      experience_level: 'intermediate',
      avg_steps: 8000,
      target_date: null,
      reference_date: REFERENCE_DATE,
    },
  },
  {
    id: 'recomp_strength',
    label: 'Recomp / strength leaning',
    goalType: 'recomp',
    input: {
      sex: 'female',
      dob: '1992-01-04',
      height_ft: 5,
      height_in: 7,
      current_weight_lb: 148,
      target_weight_lb: 140,
      goal_type: 'recomp',
      activity_level: 'very_active',
      training_days_per_week: 5,
      minutes_per_workout: '60',
      experience_level: 'advanced',
      avg_steps: 10000,
      target_date: '2026-10-01',
      reference_date: REFERENCE_DATE,
    },
  },
  {
    id: 'bulk_moderate',
    label: 'Bulking / moderate calorie load',
    goalType: 'build_muscle',
    input: {
      sex: 'male',
      dob: '1997-11-02',
      height_ft: 6,
      height_in: 0,
      current_weight_lb: 186,
      target_weight_lb: 202,
      goal_type: 'build_muscle',
      activity_level: 'very_active',
      training_days_per_week: 5,
      minutes_per_workout: '75',
      experience_level: 'advanced',
      avg_steps: 9500,
      target_date: null,
      reference_date: REFERENCE_DATE,
    },
  },
  {
    id: 'bulk_high',
    label: 'Bulking / high calorie load',
    goalType: 'gain_weight',
    input: {
      sex: 'male',
      dob: '1993-07-19',
      height_ft: 6,
      height_in: 3,
      current_weight_lb: 218,
      target_weight_lb: 240,
      goal_type: 'gain_weight',
      activity_level: 'very_active',
      training_days_per_week: 6,
      minutes_per_workout: '90_plus',
      experience_level: 'intermediate',
      avg_steps: 11000,
      target_date: '2026-12-01',
      reference_date: REFERENCE_DATE,
    },
  },
  {
    id: 'endurance_high_carb',
    label: 'Endurance / high-carb load',
    goalType: 'increase_endurance',
    input: {
      sex: 'female',
      dob: '1999-04-08',
      height_ft: 5,
      height_in: 8,
      current_weight_lb: 136,
      target_weight_lb: 136,
      goal_type: 'increase_endurance',
      activity_level: 'very_active',
      training_days_per_week: 6,
      minutes_per_workout: '90_plus',
      experience_level: 'intermediate',
      avg_steps: 13000,
      target_date: null,
      reference_date: REFERENCE_DATE,
    },
  },
  {
    id: 'general_fitness',
    label: 'General fitness / low friction',
    goalType: 'general_fitness',
    input: {
      sex: 'female',
      dob: '1986-12-11',
      height_ft: 5,
      height_in: 4,
      current_weight_lb: 141,
      target_weight_lb: 141,
      goal_type: 'general_fitness',
      activity_level: 'lightly_active',
      training_days_per_week: 3,
      minutes_per_workout: '45',
      experience_level: 'beginner',
      avg_steps: 6500,
      target_date: null,
      reference_date: REFERENCE_DATE,
    },
  },
];

const NUTRITION_BUNDLES: NutritionBundle[] = [
  {
    id: 'balanced_anything',
    label: 'Balanced omnivore',
    dietary_preference: 'anything',
    dietary_preference_other_text: null,
    allergies_exclusions: ['none'],
    allergies_other_text: null,
    refused_foods: [],
    refused_foods_other_text: null,
    preferred_proteins: ['chicken', 'turkey', 'eggs'],
    preferred_carbs: ['rice', 'oats', 'bread'],
    preferred_fats: ['olive_oil', 'avocado', 'almonds'],
    wake_time: '7_8am',
    first_meal_delay: '1_2hrs',
    last_meal_before_bed: '2hrs',
    training_time: 'evening',
    carb_tolerance: 'energized_satiated',
    cooking_level: 'basic',
    traditional_meals: true,
  },
  {
    id: 'vegetarian_cut',
    label: 'Vegetarian cut',
    dietary_preference: 'vegetarian',
    dietary_preference_other_text: null,
    allergies_exclusions: ['none'],
    allergies_other_text: null,
    refused_foods: ['beef', 'chicken', 'pork'],
    refused_foods_other_text: null,
    preferred_proteins: ['tofu_tempeh', 'eggs', 'dairy'],
    preferred_carbs: ['potato', 'quinoa', 'sweet_potato'],
    preferred_fats: ['almonds', 'olive_oil', 'avocado'],
    wake_time: '5_6am',
    first_meal_delay: 'immediate',
    last_meal_before_bed: '3_4hrs',
    training_time: 'early_morning',
    carb_tolerance: 'hungry_quickly',
    cooking_level: 'moderate',
    traditional_meals: true,
  },
  {
    id: 'vegan_endurance',
    label: 'Vegan endurance',
    dietary_preference: 'vegan',
    dietary_preference_other_text: null,
    allergies_exclusions: ['none'],
    allergies_other_text: null,
    refused_foods: ['seafood', 'beef', 'chicken'],
    refused_foods_other_text: null,
    preferred_proteins: ['tofu_tempeh', 'legumes', 'protein_powder'],
    preferred_carbs: ['rice', 'oats', 'fruit'],
    preferred_fats: ['avocado', 'chia_seeds', 'walnuts'],
    wake_time: '7_8am',
    first_meal_delay: '1_2hrs',
    last_meal_before_bed: '2hrs',
    training_time: 'midday',
    carb_tolerance: 'energized_satiated',
    cooking_level: 'full',
    traditional_meals: true,
  },
  {
    id: 'keto_low_carb',
    label: 'Keto-style cut',
    dietary_preference: 'keto',
    dietary_preference_other_text: null,
    allergies_exclusions: ['none'],
    allergies_other_text: null,
    refused_foods: ['rice', 'pasta', 'oats'],
    refused_foods_other_text: null,
    preferred_proteins: ['beef', 'fish', 'eggs'],
    preferred_carbs: ['potato', 'bread', 'fruit'],
    preferred_fats: ['olive_oil', 'avocado', 'cheese'],
    wake_time: '9_10am',
    first_meal_delay: '3hrs_plus',
    last_meal_before_bed: 'no_constraint',
    training_time: 'afternoon',
    carb_tolerance: 'bloated',
    cooking_level: 'basic',
    traditional_meals: true,
  },
  {
    id: 'pescatarian_volume',
    label: 'Pescatarian / high volume',
    dietary_preference: 'pescatarian',
    dietary_preference_other_text: null,
    allergies_exclusions: ['fish'],
    allergies_other_text: null,
    refused_foods: ['beef', 'pork', 'chicken'],
    refused_foods_other_text: null,
    preferred_proteins: ['fish', 'shellfish', 'dairy'],
    preferred_carbs: ['rice', 'pasta', 'quinoa'],
    preferred_fats: ['olive_oil', 'walnuts', 'cheese'],
    wake_time: '7_8am',
    first_meal_delay: '1_2hrs',
    last_meal_before_bed: '2hrs',
    training_time: 'evening',
    carb_tolerance: 'energized_satiated',
    cooking_level: 'moderate',
    traditional_meals: true,
  },
  {
    id: 'custom_other',
    label: 'Custom other / extra-text path',
    dietary_preference: 'other',
    dietary_preference_other_text: 'High-protein flexible',
    allergies_exclusions: ['other', 'gluten'],
    allergies_other_text: 'Cross-contact only',
    refused_foods: ['milk', 'yogurt'],
    refused_foods_other_text: null,
    preferred_proteins: ['chicken', 'protein_powder', 'eggs'],
    preferred_carbs: ['rice', 'sweet_potato', 'fruit'],
    preferred_fats: ['avocado', 'peanut_butter', 'coconut_oil'],
    wake_time: '5_6am',
    first_meal_delay: 'immediate',
    last_meal_before_bed: '3_4hrs',
    training_time: 'mid_morning',
    carb_tolerance: 'tired_sleepy',
    cooking_level: 'minimal',
    traditional_meals: false,
  },
];

type ControlCase = {
  id: string;
  label: string;
  mutate: (answers: NutritionOnboardingInput) => NutritionOnboardingInput;
  expectation: 'screen-fail' | 'service-fail' | 'both-fail';
};

const CONTROL_CASES: ControlCase[] = [
  {
    id: 'missing_proteins',
    label: 'Missing preferred proteins',
    mutate: (answers) => ({ ...answers, preferred_proteins: [] }),
    expectation: 'both-fail',
  },
  {
    id: 'missing_wake_time',
    label: 'Missing wake time',
    mutate: (answers) => ({ ...answers, wake_time: null }),
    expectation: 'both-fail',
  },
  {
    id: 'missing_last_meal',
    label: 'Missing last meal timing',
    mutate: (answers) => ({ ...answers, last_meal_before_bed: null }),
    expectation: 'both-fail',
  },
  {
    id: 'missing_meals_per_day',
    label: 'Missing meals per day',
    mutate: (answers) => ({ ...answers, meals_per_day: null }),
    expectation: 'both-fail',
  },
  {
    id: 'other_text_missing',
    label: 'Other selection without text',
    mutate: (answers) => ({
      ...answers,
      dietary_preference: 'other',
      dietary_preference_other_text: null,
      allergies_exclusions: ['other'],
      allergies_other_text: null,
    }),
    expectation: 'screen-fail',
  },
];

function parseArgs() {
  let maxCases = Infinity;
  let jsonPath = JSON_REPORT;
  let mdPath = MD_REPORT;

  for (let index = 0; index < Deno.args.length; index += 1) {
    const arg = Deno.args[index];
    if (arg === '--max-cases') {
      maxCases = Number(Deno.args[++index] ?? maxCases);
    } else if (arg.startsWith('--max-cases=')) {
      maxCases = Number(arg.split('=')[1]);
    } else if (arg === '--json') {
      jsonPath = Deno.args[++index] || jsonPath;
    } else if (arg.startsWith('--json=')) {
      jsonPath = arg.split('=')[1] || jsonPath;
    } else if (arg === '--md') {
      mdPath = Deno.args[++index] || mdPath;
    } else if (arg.startsWith('--md=')) {
      mdPath = arg.split('=')[1] || mdPath;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      Deno.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { maxCases, jsonPath, mdPath };
}

function printHelp() {
  console.log(`Nutrition onboarding matrix audit

Usage:
  deno run --allow-read --allow-write scripts/nutrition_onboarding_matrix_audit.ts [options]

Options:
  --max-cases N   Limit the number of positive matrix cases. Default: all.
  --json path     Write JSON report to path.
  --md path       Write markdown report to path.
  --help          Show this help.

The audit covers:
  - macro target outputs for representative nutrition profiles
  - meal-frequency recommendation and resolution for every meal choice
  - raw auto-fill states where meals/day is still unset
  - validation controls for required nutrition onboarding fields
  - normalization checks for allergies, refusal synonyms, and training days
`);
}

function macroCalories(target: { protein_g: number; carbs_g: number; fat_g: number }) {
  return target.protein_g * 4 + target.carbs_g * 4 + target.fat_g * 9;
}

function goalGroupFor(goalType: GoalType): SessionGoalGroup {
  switch (goalType) {
    case 'build_muscle':
    case 'gain_weight':
      return 'bulk';
    case 'lose_weight':
      return 'cut';
    case 'increase_endurance':
      return 'endurance';
    default:
      return 'maintain';
  }
}

function buildNutritionAnswers(
  scenario: GoalScenario,
  bundle: NutritionBundle,
  mealChoice: OptionalMealChoice,
): NutritionOnboardingInput {
  return {
    first_name: 'Test',
    last_name: 'User',
    dob: scenario.input.dob,
    sex: scenario.input.sex,
    height_ft: scenario.input.height_ft,
    height_in: scenario.input.height_in,
    current_weight_lb: scenario.input.current_weight_lb,
    target_weight_enabled: true,
    target_weight_lb: scenario.input.target_weight_lb,
    goal_timeline: null,
    target_date: scenario.input.target_date,
    goal_type: scenario.input.goal_type,
    activity_level: scenario.input.activity_level,
    step_tracking: true,
    avg_steps: scenario.input.avg_steps,
    sleep_hours: null,
    training_days_per_week: scenario.input.training_days_per_week,
    training_days: [],
    minutes_per_workout: scenario.input.minutes_per_workout,
    preferred_days_off: [],
    experience_level: scenario.input.experience_level,
    injuries: [],
    injuries_other_text: null,
    equipment_access: 'full_gym',
    equipment_other_text: null,
    preferred_split_family: null,
    technique_preferences: [],
    progression_preference: null,
    session_emphasis: null,
    prep_mode_enabled: false,
    prep_discipline: null,
    prep_phase: null,
    prep_auto_adjust_enabled: false,
    dietary_preference: bundle.dietary_preference,
    dietary_preference_other_text: bundle.dietary_preference_other_text,
    allergies_exclusions: [...bundle.allergies_exclusions],
    allergies_other_text: bundle.allergies_other_text,
    refused_foods: [...bundle.refused_foods],
    refused_foods_other_text: bundle.refused_foods_other_text,
    meals_per_day: mealChoice,
    preferred_proteins: [...bundle.preferred_proteins],
    preferred_carbs: [...bundle.preferred_carbs],
    preferred_fats: [...bundle.preferred_fats],
    traditional_meals: bundle.traditional_meals,
    wake_time: bundle.wake_time,
    first_meal_delay: bundle.first_meal_delay,
    last_meal_before_bed: bundle.last_meal_before_bed,
    training_time: bundle.training_time,
    carb_tolerance: bundle.carb_tolerance,
    cooking_level: bundle.cooking_level,
    userId: 'test-user',
  };
}

function validateScreenState(answers: NutritionOnboardingInput) {
  const missing: string[] = [];
  if (!answers.dietary_preference) missing.push('dietary_preference');
  if (!answers.allergies_exclusions.length) missing.push('allergies_exclusions');
  if (!answers.preferred_proteins.length) missing.push('preferred_proteins');
  if (!answers.wake_time) missing.push('wake_time');
  if (!answers.first_meal_delay) missing.push('first_meal_delay');
  if (!answers.last_meal_before_bed) missing.push('last_meal_before_bed');
  if (!answers.training_time) missing.push('training_time');
  if (!answers.meals_per_day) missing.push('meals_per_day');
  if (answers.dietary_preference === 'other' && !answers.dietary_preference_other_text) {
    missing.push('dietary_preference_other_text');
  }
  if (answers.allergies_exclusions.includes('other') && !answers.allergies_other_text) {
    missing.push('allergies_other_text');
  }
  return {
    valid: missing.length === 0,
    missing,
  };
}

function validateTargets(targets: TargetOutput, goalType: GoalType): string[] {
  const issues: string[] = [];
  for (const [label, target] of [
    ['daily', targets.daily],
    ['trainingDay', targets.trainingDay],
    ['restDay', targets.restDay],
  ] as const) {
    for (const [key, value] of Object.entries(target)) {
      if (!Number.isFinite(value) || value <= 0) {
        issues.push(`${label}.${key}_invalid`);
      }
    }
    const macroDiff = Math.abs(macroCalories(target) - target.calories);
    if (macroDiff > 75) issues.push(`${label}.macro_calories_mismatch_${Math.round(macroDiff)}`);
  }

  const estimatedTdee = targets.target_diagnostics.estimated_tdee;
  if (goalType === 'lose_weight' && targets.daily.calories >= estimatedTdee) {
    issues.push('lose_weight_daily_not_below_tdee');
  }
  if ((goalType === 'build_muscle' || goalType === 'gain_weight') && targets.daily.calories <= estimatedTdee) {
    issues.push(`${goalType}_daily_not_above_tdee`);
  }
  if (goalType === 'recomp' && targets.daily.calories > estimatedTdee + 200) {
    issues.push('recomp_daily_too_far_above_tdee');
  }
  if (goalType === 'increase_endurance' && targets.daily.calories < estimatedTdee - 150) {
    issues.push('endurance_daily_too_far_below_tdee');
  }
  if ((goalType === 'maintain_weight' || goalType === 'general_fitness') && Math.abs(targets.daily.calories - estimatedTdee) > 450) {
    issues.push(`${goalType}_daily_too_far_from_tdee`);
  }

  return issues;
}

function expectedWarningLevel(choice: OptionalMealChoice, recommendation: MealFrequencyRecommendation): MealFrequencyWarningLevel {
  if (!choice || choice === 'no_preference') return 'info';
  const resolved = mealFrequencyChoiceToCount(choice);
  if (resolved == null) return 'info';
  const delta = Math.abs(resolved - recommendation.recommendedMealCount);
  if (delta === 0) return 'none';
  if (delta === 1) return 'info';
  if (delta === 2) return 'moderate';
  return 'strong';
}

function evaluatePositiveCase(
  scenario: GoalScenario,
  bundle: NutritionBundle,
  mealChoice: MealChoice,
): MatrixResult {
  const answers = buildNutritionAnswers(scenario, bundle, mealChoice);
  const normalized = normalizeOnboardingAnswers(answers as Partial<NutritionOnboardingInput>);
  const serviceValidation = validateNutritionOnboarding(answers as never);
  const screenValidation = validateScreenState(answers);
  const targets = calculateTargets(scenario.input);
  const recommendation = recommendMealFrequency({
    goalType: normalized.goal_type ?? scenario.goalType,
    calories: targets.daily.calories,
    proteinGrams: targets.daily.protein_g,
  });
  const resolvedMealsPerDay = resolveMealFrequencyChoice(mealChoice, recommendation);
  const warningLevel = getMealFrequencyWarning(mealChoice, recommendation);
  const issues = [
    ...validateTargets(targets, scenario.goalType),
    ...(serviceValidation.valid ? [] : [`service_validation_failed:${serviceValidation.missing.join('|')}`]),
    ...(screenValidation.valid ? [] : [`screen_validation_failed:${screenValidation.missing.join('|')}`]),
  ];
  const notes: string[] = [];

  if (recommendation.goalGroup !== goalGroupFor(scenario.goalType)) {
    issues.push(`goal_group_mismatch:${recommendation.goalGroup}`);
  }

  if (mealChoice === 'no_preference') {
    if (resolvedMealsPerDay !== recommendation.recommendedMealsPerDay) {
      issues.push('no_preference_did_not_resolve_to_recommendation');
    } else {
      notes.push(`no_preference_resolved_to_${resolvedMealsPerDay}`);
    }
  } else if (resolvedMealsPerDay !== mealChoice) {
    issues.push('explicit_choice_not_preserved');
  }

  const expectedLevel = expectedWarningLevel(mealChoice, recommendation);
  if (warningLevel !== expectedLevel) {
    issues.push(`warning_level_mismatch:${warningLevel}_expected_${expectedLevel}`);
  }

  const label = formatMealFrequencyLabel(mealChoice, recommendation);
  if (mealChoice === recommendation.recommendedMealsPerDay && !label.includes('Recommended')) {
    issues.push('recommended_choice_missing_recommended_label');
  }
  if (mealChoice === 'no_preference' && !label.includes('Any · uses')) {
    issues.push('no_preference_label_missing_resolution');
  }

  const advisory = getMealFrequencyAdvisory(mealChoice, recommendation);
  if (!advisory || advisory.length < 10) {
    issues.push('advisory_too_short');
  }

  return {
    kind: 'positive',
    id: `${scenario.id}__${bundle.id}__${mealChoice}`,
    goalId: scenario.id,
    bundleId: bundle.id,
    mealChoice,
    goalLabel: scenario.label,
    bundleLabel: bundle.label,
    status: issues.length ? 'fail' : 'pass',
    issues,
    notes,
    answers,
    normalized,
    targets,
    recommendation,
    resolvedMealsPerDay,
    warningLevel,
    screenMissing: screenValidation.missing,
    serviceMissing: serviceValidation.missing,
  };
}

function evaluateAutofillCase(scenario: GoalScenario, bundle: NutritionBundle): MatrixResult {
  const answers = buildNutritionAnswers(scenario, bundle, null);
  const normalized = normalizeOnboardingAnswers(answers as Partial<NutritionOnboardingInput>);
  const targets = calculateTargets(scenario.input);
  const recommendation = recommendMealFrequency({
    goalType: normalized.goal_type ?? scenario.goalType,
    calories: targets.daily.calories,
    proteinGrams: targets.daily.protein_g,
  });
  const resolvedMealsPerDay = resolveMealFrequencyChoice(null, recommendation);
  const label = formatMealFrequencyLabel(null, recommendation);
  const advisory = getMealFrequencyAdvisory(null, recommendation);
  const screenValidation = validateScreenState(answers);

  const issues: string[] = [];
  if (resolvedMealsPerDay !== recommendation.recommendedMealsPerDay) {
    issues.push('null_meal_choice_did_not_resolve_to_recommendation');
  }
  if (!label.includes('Any · uses')) {
    issues.push('null_meal_choice_label_missing_resolution');
  }
  if (!advisory.includes('No preference selected')) {
    issues.push('null_meal_choice_advisory_missing_context');
  }

  return {
    kind: 'autofill',
    id: `${scenario.id}__${bundle.id}__unset_meals`,
    goalId: scenario.id,
    bundleId: bundle.id,
    mealChoice: null,
    goalLabel: scenario.label,
    bundleLabel: bundle.label,
    status: issues.length ? 'fail' : 'info',
    issues,
    notes: [
      screenValidation.missing.includes('meals_per_day')
        ? 'raw_state_requires_auto_fill'
        : 'raw_state_already_complete',
    ],
    answers,
    normalized,
    targets,
    recommendation,
    resolvedMealsPerDay,
    warningLevel: getMealFrequencyWarning(null, recommendation),
    screenMissing: screenValidation.missing,
  };
}

function evaluateControlCase(
  scenario: GoalScenario,
  bundle: NutritionBundle,
  control: (typeof CONTROL_CASES)[number],
): MatrixResult {
  const answers = control.mutate(buildNutritionAnswers(scenario, bundle, '3'));
  const normalized = normalizeOnboardingAnswers(answers as Partial<NutritionOnboardingInput>);
  const serviceValidation = validateNutritionOnboarding(answers as never);
  const screenValidation = validateScreenState(answers);
  const hasScreenFailure = !screenValidation.valid;
  const hasServiceFailure = !serviceValidation.valid;
  const issues: string[] = [];

  if (control.expectation === 'both-fail' && (!hasScreenFailure || !hasServiceFailure)) {
    if (!hasScreenFailure) issues.push('screen_validation_unexpectedly_passed');
    if (!hasServiceFailure) issues.push('service_validation_unexpectedly_passed');
  }

  if (control.expectation === 'screen-fail' && !hasScreenFailure) {
    issues.push('screen_validation_unexpectedly_passed');
  }

  if (control.expectation === 'service-fail' && !hasServiceFailure) {
    issues.push('service_validation_unexpectedly_passed');
  }

  return {
    kind: 'control',
    id: `${scenario.id}__${bundle.id}__${control.id}`,
    goalId: scenario.id,
    bundleId: bundle.id,
    mealChoice: answers.meals_per_day,
    goalLabel: scenario.label,
    bundleLabel: bundle.label,
    status: issues.length ? 'fail' : 'pass',
    issues,
    notes: [
      `screen_missing:${screenValidation.missing.join(',') || 'none'}`,
      `service_missing:${serviceValidation.missing.join(',') || 'none'}`,
    ],
    answers,
    normalized,
    screenMissing: screenValidation.missing,
    serviceMissing: serviceValidation.missing,
    expectedFailure: true,
  };
}

function evaluateNormalizationCase(
  id: string,
  input: Partial<NutritionOnboardingInput>,
  expected: Record<string, unknown>,
): MatrixResult {
  const normalized = normalizeOnboardingAnswers(input as never);
  const issues: string[] = [];
  for (const [key, value] of Object.entries(expected)) {
    const actual = (normalized as Record<string, unknown>)[key];
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(value);
    if (actualJson !== expectedJson) {
      issues.push(`${key}_mismatch:${actualJson}_expected_${expectedJson}`);
    }
  }

  return {
    kind: 'normalization',
    id,
    goalId: 'n/a',
    bundleId: 'n/a',
    mealChoice: null,
    goalLabel: 'Normalization',
    bundleLabel: id,
    status: issues.length ? 'fail' : 'pass',
    issues,
    notes: [],
    normalized,
  };
}

function buildPositiveMatrix(maxCases: number) {
  const results: MatrixResult[] = [];
  let count = 0;
  for (const scenario of GOAL_SCENARIOS) {
    for (const bundle of NUTRITION_BUNDLES) {
      for (const mealChoice of MEAL_CHOICES) {
        if (count >= maxCases) return results;
        results.push(evaluatePositiveCase(scenario, bundle, mealChoice));
        count += 1;
      }
    }
  }
  return results;
}

function buildAutofillCases() {
  return GOAL_SCENARIOS.flatMap((scenario) => NUTRITION_BUNDLES.map((bundle) => evaluateAutofillCase(scenario, bundle)));
}

function buildControlCases() {
  return GOAL_SCENARIOS.flatMap((scenario) => (
    NUTRITION_BUNDLES.map((bundle) => CONTROL_CASES.map((control) => evaluateControlCase(scenario, bundle, control))).flat()
  ));
}

function buildNormalizationCases() {
  const baseInput: Partial<NutritionOnboardingInput> = {
    training_days: ['mon', 'tue', 'wed'],
    training_days_per_week: 5,
    preferred_days_off: ['sat', 'sun'],
    allergies_exclusions: ['none', 'gluten', 'dairy'],
    refused_foods: ['shrimp', 'salmon', 'cod', 'peanut', 'nuts'],
    technique_preferences: ['none', 'tempo', 'cluster'],
  };

  const base2: Partial<NutritionOnboardingInput> = {
    training_days: [],
    training_days_per_week: 4,
    preferred_days_off: ['mon', 'tue'],
    allergies_exclusions: ['gluten', 'dairy'],
    refused_foods: ['none', 'pork', 'yogurt'],
    technique_preferences: ['none'],
  };

  return [
    evaluateNormalizationCase('explicit_training_days', baseInput, {
      training_days: ['mon', 'tue', 'wed'],
      training_days_per_week: 3,
      preferred_days_off: ['thu', 'fri', 'sat', 'sun'],
      allergies_exclusions: ['none'],
      refused_foods: ['seafood', 'peanuts', 'nuts'],
      technique_preferences: [],
    }),
    evaluateNormalizationCase('legacy_days_off', base2, {
      training_days: [],
      training_days_per_week: 4,
      preferred_days_off: ['mon', 'tue'],
      allergies_exclusions: ['gluten', 'dairy'],
      refused_foods: [],
      technique_preferences: [],
    }),
  ];
}

function summarize(results: MatrixResult[]) {
  const summary = {
    total: results.length,
    passed: 0,
    failed: 0,
    info: 0,
    byKind: {} as Record<IssueKind, number>,
    byStatus: {} as Record<string, number>,
    mealChoices: {} as Record<string, number>,
    recommendedMeals: {} as Record<string, number>,
    warningLevels: {} as Record<string, number>,
  };

  for (const result of results) {
    summary.byKind[result.kind] = (summary.byKind[result.kind] || 0) + 1;
    summary.byStatus[result.status] = (summary.byStatus[result.status] || 0) + 1;
    if (result.status === 'pass') summary.passed += 1;
    if (result.status === 'fail') summary.failed += 1;
    if (result.status === 'info') summary.info += 1;

    if (result.mealChoice) {
      summary.mealChoices[result.mealChoice] = (summary.mealChoices[result.mealChoice] || 0) + 1;
    }
    if (result.recommendation) {
      const key = result.recommendation.recommendedMealsPerDay;
      summary.recommendedMeals[key] = (summary.recommendedMeals[key] || 0) + 1;
    }
    if (result.warningLevel) {
      summary.warningLevels[result.warningLevel] = (summary.warningLevels[result.warningLevel] || 0) + 1;
    }
  }

  return summary;
}

function writeReportMarkdown(
  jsonPath: string,
  mdPath: string,
  summary: ReturnType<typeof summarize>,
  positiveCases: MatrixResult[],
  autofillCases: MatrixResult[],
  controlCases: MatrixResult[],
  normalizationCases: MatrixResult[],
) {
  const positiveFailures = positiveCases.filter((r) => r.status === 'fail');
  const controlFailures = controlCases.filter((r) => r.status === 'fail');
  const controlPasses = controlCases.filter((r) => r.status === 'pass');

  const lines = [
    '# Nutrition Onboarding Matrix Audit',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Reference date: ${REFERENCE_DATE}`,
    `Positive cases: ${positiveCases.length}`,
    `Auto-fill probes: ${autofillCases.length}`,
    `Validation controls: ${controlCases.length}`,
    `Normalization checks: ${normalizationCases.length}`,
    `Passed: ${summary.passed}`,
    `Failed: ${summary.failed}`,
    `Info: ${summary.info}`,
    '',
    '## Summary',
    '',
    `- Goal groups covered: ${GOAL_SCENARIOS.map((scenario) => scenario.goalType).join(', ')}`,
    `- Meal choices covered: ${MEAL_CHOICES.join(', ')}`,
    `- Recommendation distribution: ${Object.entries(summary.recommendedMeals).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`,
    `- Warning distribution: ${Object.entries(summary.warningLevels).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`,
    '',
    '## Positive Failures',
    '',
    ...(positiveFailures.length
      ? positiveFailures.slice(0, 20).flatMap((failure) => [
          `### ${failure.id}`,
          `- Goal: ${failure.goalLabel}`,
          `- Bundle: ${failure.bundleLabel}`,
          `- Meal choice: ${failure.mealChoice}`,
          `- Issues: ${failure.issues.join(', ')}`,
          `- Screen missing: ${(failure.screenMissing || []).join(', ') || 'none'}`,
          `- Service missing: ${(failure.serviceMissing || []).join(', ') || 'none'}`,
          '',
        ])
      : ['- None']),
    '## Auto-fill Probes',
    '',
    ...(autofillCases.slice(0, 20).flatMap((probe) => [
      `### ${probe.id}`,
      `- Resolved meals/day: ${probe.resolvedMealsPerDay}`,
      `- Recommended meals/day: ${probe.recommendation?.recommendedMealsPerDay || 'n/a'}`,
      `- Warning level: ${probe.warningLevel || 'n/a'}`,
      `- Notes: ${probe.notes.join(', ') || 'none'}`,
      `- Screen missing: ${(probe.screenMissing || []).join(', ') || 'none'}`,
      '',
    ])),
    '## Control Cases',
    '',
    `- Passing control cases: ${controlPasses.length}`,
    `- Control failures: ${controlFailures.length}`,
    '',
    ...(controlFailures.length
      ? controlFailures.slice(0, 20).flatMap((failure) => [
          `### FAIL ${failure.id}`,
          `- Goal: ${failure.goalLabel}`,
          `- Bundle: ${failure.bundleLabel}`,
          `- Issues: ${failure.issues.join(', ') || 'none'}`,
          `- Screen missing: ${(failure.screenMissing || []).join(', ') || 'none'}`,
          `- Service missing: ${(failure.serviceMissing || []).join(', ') || 'none'}`,
          '',
        ])
      : ['- No control failures']),
    ...(controlPasses.length
      ? controlPasses.slice(0, 12).flatMap((control) => [
          `### PASS ${control.id}`,
          `- Goal: ${control.goalLabel}`,
          `- Bundle: ${control.bundleLabel}`,
          `- Screen missing: ${(control.screenMissing || []).join(', ') || 'none'}`,
          `- Service missing: ${(control.serviceMissing || []).join(', ') || 'none'}`,
          '',
        ])
      : []),
    '## Normalization Checks',
    '',
    ...(normalizationCases.length
      ? normalizationCases.flatMap((check) => [
          `### ${check.id}`,
          `- Status: ${check.status}`,
          `- Issues: ${check.issues.join(', ') || 'none'}`,
          `- Normalized: ${JSON.stringify(check.normalized)}`,
          '',
        ])
      : ['- None']),
    '',
    '## Files',
    '',
    `- JSON: ${jsonPath}`,
    `- Markdown: ${mdPath}`,
  ];

  return `${lines.join('\n')}\n`;
}

async function main() {
  const { maxCases, jsonPath, mdPath } = parseArgs();
  const positiveCases = buildPositiveMatrix(maxCases);
  const autofillCases = buildAutofillCases();
  const controlCases = buildControlCases();
  const normalizationCases = buildNormalizationCases();
  const allResults = [...positiveCases, ...autofillCases, ...controlCases, ...normalizationCases];
  const summary = summarize(allResults);

  await Deno.mkdir(REPORT_DIR, { recursive: true });
  await Deno.writeTextFile(jsonPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    reference_date: REFERENCE_DATE,
    summary,
    positiveCases,
    autofillCases,
    controlCases,
    normalizationCases,
  }, null, 2));
  await Deno.writeTextFile(
    mdPath,
    writeReportMarkdown(jsonPath, mdPath, summary, positiveCases, autofillCases, controlCases, normalizationCases),
  );

  console.log(`[nutrition-onboarding] positive=${positiveCases.length} autofill=${autofillCases.length} controls=${controlCases.length} normalization=${normalizationCases.length}`);
  console.log(`[nutrition-onboarding] passed=${summary.passed} failed=${summary.failed} info=${summary.info}`);
  console.log(`[nutrition-onboarding] reports: ${jsonPath}, ${mdPath}`);

  if (summary.failed > 0) {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
