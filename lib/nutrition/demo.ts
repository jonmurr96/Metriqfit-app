/**
 * Demo of Intelligent Meal Generation System
 * 
 * Example usage showing how the system creates goal-based,
 * timing-optimized meal plans with exact portions.
 */

import {
  generateWeekMealPlan,
  formatMealSimple,
  getProteinDiversity,
  generateWeeklyMealPlan,
} from './index';
import type { OnboardingData } from '../onboarding';

// ============================================
// EXAMPLE 1: Cutting User
// ============================================

const cuttingUserOnboarding: Partial<OnboardingData> = {
  sex: 'male',
  dob: '1990-01-01',
  height_ft: 5,
  height_in: 10,
  current_weight_lb: 180,
  goal_type: 'lose_weight',
  activity_level: 'moderately_active',
  training_days_per_week: 4,
  minutes_per_workout: '60',
  experience_level: 'intermediate',
  
  // Nutrition preferences
  dietary_preference: 'anything',
  allergies_exclusions: [],
  preferred_proteins: ['chicken', 'fish', 'eggs'],
  wake_time: '5_6am',
  first_meal_delay: '1_2hrs',
  training_time: 'afternoon',
  carb_tolerance: 'energized_satiated',
  meals_per_day: '4',
  cooking_level: 'basic',
};

console.log('=== CUTTING USER EXAMPLE ===\n');

const cuttingPlan = generateWeeklyMealPlan(
  cuttingUserOnboarding as OnboardingData,
  undefined,
  ['monday', 'tuesday', 'thursday', 'friday']
);

console.log('Macro Targets:');
console.log(`  Training Day: ${cuttingPlan.targets.trainingDay.calories} cal | P:${cuttingPlan.targets.trainingDay.protein_g}g C:${cuttingPlan.targets.trainingDay.carbs_g}g F:${cuttingPlan.targets.trainingDay.fat_g}g`);
console.log(`  Rest Day: ${cuttingPlan.targets.restDay.calories} cal | P:${cuttingPlan.targets.restDay.protein_g}g C:${cuttingPlan.targets.restDay.carbs_g}g F:${cuttingPlan.targets.restDay.fat_g}g\n`);

console.log('Sample Training Day (Monday):');
const monday = cuttingPlan.weekPlan.find((d: any) => d.day === 'monday');
if (monday) {
  for (const meal of monday.meals) {
    console.log(`  ${meal.label} (${meal.time}):`);
    if (meal.foods.length > 0) {
      for (const food of meal.foods) {
        const formNote = food.form ? ` (${food.form})` : '';
        console.log(`    - ${food.displayPortion} ${food.food.displayName}${formNote}`);
      }
    } else {
      console.log(`    - [Legacy mode - no food details]`);
    }
    console.log(`    Macros: ${meal.actualMacros.calories} cal | P:${meal.actualMacros.protein}g C:${meal.actualMacros.carbs}g F:${meal.actualMacros.fat}g\n`);
  }
}

console.log('Plan Summary:');
console.log(`  Average Calories: ${cuttingPlan.summary.averageCalories}`);
console.log(`  Macro Split: ${cuttingPlan.summary.macroSplit}`);
console.log(`  Protein Diversity: ${cuttingPlan.summary.proteinDiversity.topProteinPercentage}% from top 3\n`);

// ============================================
// EXAMPLE 2: Bulking User
// ============================================

const bulkingUserOnboarding: Partial<OnboardingData> = {
  sex: 'male',
  dob: '1995-01-01',
  height_ft: 6,
  height_in: 0,
  current_weight_lb: 170,
  goal_type: 'build_muscle',
  activity_level: 'very_active',
  training_days_per_week: 5,
  minutes_per_workout: '60',
  experience_level: 'advanced',
  
  // Nutrition preferences
  dietary_preference: 'anything',
  allergies_exclusions: [],
  preferred_proteins: ['beef', 'chicken', 'eggs'],
  wake_time: '5_6am',
  first_meal_delay: 'immediate',
  training_time: 'evening',
  carb_tolerance: 'hungry_quickly',
  meals_per_day: '5_plus',
  cooking_level: 'moderate',
};

console.log('\n=== BULKING USER EXAMPLE ===\n');

const bulkingPlan = generateWeeklyMealPlan(
  bulkingUserOnboarding as OnboardingData,
  undefined,
  ['monday', 'tuesday', 'wednesday', 'friday', 'saturday']
);

console.log('Macro Targets:');
console.log(`  Training Day: ${bulkingPlan.targets.trainingDay.calories} cal | P:${bulkingPlan.targets.trainingDay.protein_g}g C:${bulkingPlan.targets.trainingDay.carbs_g}g F:${bulkingPlan.targets.trainingDay.fat_g}g`);
console.log(`  Rest Day: ${bulkingPlan.targets.restDay.calories} cal | P:${bulkingPlan.targets.restDay.protein_g}g C:${bulkingPlan.targets.restDay.carbs_g}g F:${bulkingPlan.targets.restDay.fat_g}g\n`);

console.log('Sample Training Day (Wednesday):');
const wednesday = bulkingPlan.weekPlan.find((d: any) => d.day === 'wednesday');
if (wednesday) {
  for (const meal of wednesday.meals) {
    console.log(`  ${meal.label} (${meal.time}):`);
    if (meal.foods.length > 0) {
      for (const food of meal.foods) {
        const formNote = food.form ? ` (${food.form})` : '';
        console.log(`    - ${food.displayPortion} ${food.food.displayName}${formNote}`);
      }
    } else {
      console.log(`    - [Legacy mode - no food details]`);
    }
    console.log(`    Macros: ${meal.actualMacros.calories} cal | P:${meal.actualMacros.protein}g C:${meal.actualMacros.carbs}g F:${meal.actualMacros.fat}g\n`);
  }
}

console.log('Plan Summary:');
console.log(`  Average Calories: ${bulkingPlan.summary.averageCalories}`);
console.log(`  Macro Split: ${bulkingPlan.summary.macroSplit}`);
console.log(`  Protein Diversity: ${bulkingPlan.summary.proteinDiversity.topProteinPercentage}% from top 3\n`);

// ============================================
// EXAMPLE 3: Early Morning Training
// ============================================

const earlyTrainerOnboarding: Partial<OnboardingData> = {
  sex: 'female',
  dob: '1992-01-01',
  height_ft: 5,
  height_in: 5,
  current_weight_lb: 140,
  goal_type: 'lose_weight',
  activity_level: 'moderately_active',
  training_days_per_week: 3,
  minutes_per_workout: '45',
  experience_level: 'beginner',
  
  // Nutrition preferences
  dietary_preference: 'anything',
  allergies_exclusions: [],
  preferred_proteins: ['chicken', 'dairy', 'fish'],
  wake_time: '5_6am',
  first_meal_delay: 'immediate',
  training_time: 'early_morning',
  carb_tolerance: 'tired_sleepy',
  meals_per_day: '3',
  cooking_level: 'minimal',
};

console.log('\n=== EARLY MORNING TRAINER EXAMPLE ===\n');

const earlyPlan = generateWeeklyMealPlan(
  earlyTrainerOnboarding as OnboardingData,
  undefined,
  ['monday', 'wednesday', 'friday']
);

console.log('Training Day Schedule (5:30 AM Workout):');
const earlyMonday = earlyPlan.weekPlan.find((d: any) => d.day === 'monday');
if (earlyMonday) {
  for (const meal of earlyMonday.meals) {
    const trainingIndicator = meal.isTrainingRelated ? ' [TRAINING]' : '';
    console.log(`  ${meal.time} - ${meal.label}${trainingIndicator}`);
    if (meal.foods.length > 0) {
      for (const food of meal.foods) {
        console.log(`    → ${food.displayPortion} ${food.food.displayName}`);
      }
    }
  }
}

console.log('\n\nKey Features Demonstrated:');
console.log('✓ 80/20 protein prioritization (top 3 proteins get 80% usage)');
console.log('✓ Goal-based food forms (ground for cutting, whole for bulking)');
console.log('✓ Carb timing (fast carbs around training, slow carbs otherwise)');
console.log('✓ Fat timing (minimal fats pre/post workout)');
console.log('✓ Exact portion calculations (grams for each food)');
console.log('✓ Schedule integration (wake time → meal times → training)');
console.log('✓ Macro distribution based on carb tolerance and goal');
