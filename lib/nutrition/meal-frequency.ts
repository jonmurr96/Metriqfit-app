import type { GoalType, MealsPerDay } from '../onboarding/OnboardingContext';

export type MealFrequencyWarningLevel = 'none' | 'info' | 'moderate' | 'strong';

export interface MealFrequencyInput {
  goalType: GoalType | string | null | undefined;
  calories: number;
  proteinGrams: number;
}

export interface MealFrequencyRecommendation {
  goalGroup: 'cut' | 'bulk' | 'maintain' | 'endurance';
  recommendedMealsPerDay: Exclude<MealsPerDay, 'no_preference'>;
  recommendedMealCount: number;
  caloriesPerMeal: number;
  proteinPerMeal: number;
  rationale: string;
  advisory: string;
  warningLevel: MealFrequencyWarningLevel;
}

const MEAL_COUNT_ORDER: Exclude<MealsPerDay, 'no_preference'>[] = ['2', '3', '4', '5_plus'];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function goalGroupFor(goalType: MealFrequencyInput['goalType']): MealFrequencyRecommendation['goalGroup'] {
  switch (goalType) {
    case 'build_muscle':
    case 'gain_weight':
      return 'bulk';
    case 'lose_weight':
      return 'cut';
    case 'increase_endurance':
      return 'endurance';
    case 'maintain_weight':
    case 'recomp':
    case 'get_fitter':
    case 'general_fitness':
    default:
      return 'maintain';
  }
}

function mealCountFromChoice(choice: Exclude<MealsPerDay, 'no_preference'>): number {
  if (choice === '5_plus') return 5;
  return Number(choice);
}

function choiceFromMealCount(count: number): Exclude<MealsPerDay, 'no_preference'> {
  if (count <= 2) return '2';
  if (count === 3) return '3';
  if (count === 4) return '4';
  return '5_plus';
}

function mealCountLabel(choice: Exclude<MealsPerDay, 'no_preference'>): string {
  return choice === '5_plus' ? '5+ meals/day' : `${choice} meals/day`;
}

function buildRationale(
  goalGroup: MealFrequencyRecommendation['goalGroup'],
  calories: number,
  proteinGrams: number,
  recommendedMealCount: number,
): string {
  const caloriesPerMeal = Math.round(calories / recommendedMealCount);
  const proteinPerMeal = Math.round(proteinGrams / recommendedMealCount);

  switch (goalGroup) {
    case 'bulk':
      return `Bulking targets usually work best with ${mealCountLabel(choiceFromMealCount(recommendedMealCount))}. This keeps portions practical at about ${caloriesPerMeal} kcal and ${proteinPerMeal}g protein per meal.`;
    case 'cut':
      return `Cutting targets are easiest to execute with ${mealCountLabel(choiceFromMealCount(recommendedMealCount))}. That keeps protein spread out without forcing oversized meals.`;
    case 'endurance':
      return `Endurance-focused targets are usually easier to sustain with ${mealCountLabel(choiceFromMealCount(recommendedMealCount))}, so energy stays steadier through the day.`;
    case 'maintain':
    default:
      return `${mealCountLabel(choiceFromMealCount(recommendedMealCount))} is the cleanest default for these targets, with enough structure to hit calories and protein without overcomplicating the day.`;
  }
}

function buildAdvisory(
  goalGroup: MealFrequencyRecommendation['goalGroup'],
  selectedCount: number,
  recommendedCount: number,
): string {
  if (selectedCount === recommendedCount) {
    return 'This is the coached recommendation for your goal.';
  }

  if (selectedCount < recommendedCount) {
    const extraMeals = recommendedCount - selectedCount;
    return extraMeals > 1
      ? `Your targets will be harder to hit in ${selectedCount} meal${selectedCount === 1 ? '' : 's'}; the plan is recommending ${mealCountLabel(choiceFromMealCount(recommendedCount))}.`
      : `Your targets are a little easier to hit with one more meal.`;
  }

  const fewerMeals = selectedCount - recommendedCount;
  if (goalGroup === 'bulk' || goalGroup === 'endurance') {
    return fewerMeals > 1
      ? `You can still do this, but the meal sizes will need to be noticeably smaller and more frequent to stay comfortable.`
      : `You can still do this, but one fewer meal may make the portions denser than necessary.`;
  }

  return fewerMeals > 1
    ? `You can still do this, but the day will lean on larger meals than the recommendation.`
    : `You can still do this, but the plan may be slightly less efficient for adherence.`;
}

export function recommendMealFrequency(input: MealFrequencyInput): MealFrequencyRecommendation {
  const goalGroup = goalGroupFor(input.goalType);
  const calories = Math.max(0, Number(input.calories || 0));
  const proteinGrams = Math.max(0, Number(input.proteinGrams || 0));

  let recommendedMealCount = 3;

  if (goalGroup === 'bulk') {
    recommendedMealCount = 4;
  } else if (goalGroup === 'endurance') {
    recommendedMealCount = 4;
  }

  if (goalGroup === 'cut') {
    if (calories <= 1800 && proteinGrams <= 130) {
      recommendedMealCount = 2;
    } else if (calories >= 2600 || proteinGrams >= 175) {
      recommendedMealCount = 4;
    }
  } else if (goalGroup === 'bulk') {
    if (calories >= 3600 || proteinGrams >= 230) {
      recommendedMealCount = 5;
    } else if (calories >= 2900 || proteinGrams >= 180) {
      recommendedMealCount = 4;
    } else if (calories <= 2200 && proteinGrams <= 150) {
      recommendedMealCount = 3;
    }
  } else if (goalGroup === 'endurance') {
    if (calories >= 3400 || proteinGrams >= 220) {
      recommendedMealCount = 5;
    } else if (calories >= 2500 || proteinGrams >= 170) {
      recommendedMealCount = 4;
    } else if (calories <= 1900 && proteinGrams <= 130) {
      recommendedMealCount = 3;
    }
  } else {
    if (calories >= 3600 || proteinGrams >= 230) {
      recommendedMealCount = 5;
    } else if (calories >= 2800 || proteinGrams >= 180) {
      recommendedMealCount = 4;
    } else if (calories <= 1900 && proteinGrams <= 125) {
      recommendedMealCount = 2;
    }
  }

  if (recommendedMealCount === 2 && ((calories / recommendedMealCount) > 950 || (proteinGrams / recommendedMealCount) > 70)) {
    recommendedMealCount = 3;
  }

  if (recommendedMealCount === 3 && (goalGroup === 'bulk' || goalGroup === 'endurance') && (calories >= 2800 || proteinGrams >= 180)) {
    recommendedMealCount = 4;
  }

  if (recommendedMealCount === 4 && (calories >= 3800 || proteinGrams >= 240)) {
    recommendedMealCount = 5;
  }

  recommendedMealCount = clamp(recommendedMealCount, 2, 5);
  const recommendedMealsPerDay = choiceFromMealCount(recommendedMealCount);
  const caloriesPerMeal = recommendedMealCount > 0 ? calories / recommendedMealCount : calories;
  const proteinPerMeal = recommendedMealCount > 0 ? proteinGrams / recommendedMealCount : proteinGrams;

  return {
    goalGroup,
    recommendedMealsPerDay,
    recommendedMealCount,
    caloriesPerMeal,
    proteinPerMeal,
    rationale: buildRationale(goalGroup, calories, proteinGrams, recommendedMealCount),
    advisory: buildAdvisory(goalGroup, recommendedMealCount, recommendedMealCount),
    warningLevel: 'none',
  };
}

export function resolveMealFrequencyChoice(
  choice: MealsPerDay | null | undefined,
  recommendation: MealFrequencyRecommendation,
): Exclude<MealsPerDay, 'no_preference'> {
  if (!choice || choice === 'no_preference') {
    return recommendation.recommendedMealsPerDay;
  }
  return choice;
}

export function getMealFrequencyWarning(
  choice: MealsPerDay | null | undefined,
  recommendation: MealFrequencyRecommendation,
): MealFrequencyWarningLevel {
  if (!choice || choice === 'no_preference') {
    return 'info';
  }

  const selectedCount = mealCountFromChoice(choice);
  const recommendedCount = recommendation.recommendedMealCount;
  const delta = Math.abs(selectedCount - recommendedCount);

  if (delta === 0) return 'none';
  if (delta === 1) return 'info';
  if (delta === 2) return 'moderate';
  return 'strong';
}

export function getMealFrequencyAdvisory(
  choice: MealsPerDay | null | undefined,
  recommendation: MealFrequencyRecommendation,
): string {
  if (!choice || choice === 'no_preference') {
    return `No preference selected. We'll use ${mealCountLabel(recommendation.recommendedMealsPerDay)} automatically.`;
  }

  const selectedCount = mealCountFromChoice(choice);
  return buildAdvisory(recommendation.goalGroup, selectedCount, recommendation.recommendedMealCount);
}

export function formatMealFrequencyLabel(
  choice: MealsPerDay | null | undefined,
  recommendation?: MealFrequencyRecommendation | null,
): string {
  if (!choice || choice === 'no_preference') {
    if (!recommendation) return 'Flexible meals/day';
    return `Any · uses ${mealCountLabel(recommendation.recommendedMealsPerDay)}`;
  }

  const baseLabel = mealCountLabel(choice);
  if (!recommendation) return baseLabel;

  if (choice === recommendation.recommendedMealsPerDay) {
    return `${baseLabel} · Recommended`;
  }

  return `${baseLabel} · Recommend ${mealCountLabel(recommendation.recommendedMealsPerDay)}`;
}

export function mealFrequencyChoiceToCount(choice: MealsPerDay | null | undefined): number | null {
  if (!choice || choice === 'no_preference') return null;
  return mealCountFromChoice(choice);
}

export function mealFrequencyChoiceList(): Exclude<MealsPerDay, 'no_preference'>[] {
  return [...MEAL_COUNT_ORDER];
}
