/**
 * Recipe System Demo
 * Demonstrates Phase 2 Recipe System functionality
 */

import { selectRecipesForPlan, validateWeeklyVolume } from '../lib/workout/recipe-selection';
import { getRecipesForSplit, validateRecipe } from '../lib/workout/exercise-recipes-by-experience';

console.log('='.repeat(70));
console.log('PHASE 2: RECIPE SYSTEM DEMONSTRATION');
console.log('='.repeat(70));

// Demo 1: Beginner Upper/Lower Split
console.log('\n📋 DEMO 1: Beginner - Upper/Lower 4x/week (Build Muscle)');
console.log('-'.repeat(70));

const beginnerContext = {
  splitKey: 'upper_lower_4',
  experienceLevel: 'beginner' as const,
  primaryGoal: 'build_muscle' as const,
  daysPerWeek: 4,
  sessionDurationMin: 60,
  equipmentAccess: 'full_gym',
  recoveryBurden: 'moderate' as const,
};

const beginnerResult = selectRecipesForPlan(beginnerContext);

beginnerResult.recipes.forEach((day) => {
  console.log(`\n🗓️  Day ${day.dayIndex + 1}: ${day.dayName}`);
  console.log(`   Focus: ${day.recipe.focus.join(', ')}`);
  console.log(`   Exercises: ${day.slots.length} | Sets: ${day.recipe.totalSets} | Duration: ~${day.recipe.estimatedDurationMin}min`);
  console.log(`   Complexity: ${day.recipe.complexity}`);

  day.slots.slice(0, 4).forEach((slot, i) => {
    console.log(`   ${i + 1}. ${slot.pattern}: ${slot.sets}×${slot.reps} (${slot.restSeconds}s rest) RPE ${slot.rpe}`);
  });
  if (day.slots.length > 4) {
    console.log(`   ... and ${day.slots.length - 4} more exercises`);
  }

  if (day.modifications.length > 0) {
    console.log(`   ⚙️  Modifications: ${day.modifications.join(', ')}`);
  }
  if (day.warnings.length > 0) {
    console.log(`   ⚠️  Warnings: ${day.warnings.join(', ')}`);
  }
});

console.log(`\n📊 Weekly Summary:`);
console.log(`   Total Exercises: ${beginnerResult.summary.totalExercises}`);
console.log(`   Total Sets: ${beginnerResult.summary.totalSets}`);
console.log(`   Avg Duration: ${beginnerResult.summary.averageDuration.toFixed(0)}min/day`);
console.log(`   Meets Minimums: ${beginnerResult.summary.meetsMinimums ? '✅' : '❌'}`);

// Demo 2: Intermediate with Different Goals
console.log('\n\n📋 DEMO 2: Intermediate - Upper/Lower 4x/week (Lose Fat)');
console.log('-'.repeat(70));

const fatLossContext = {
  ...beginnerContext,
  experienceLevel: 'intermediate' as const,
  primaryGoal: 'lose_fat' as const,
};

const fatLossResult = selectRecipesForPlan(fatLossContext);

fatLossResult.recipes.slice(0, 2).forEach((day) => {
  console.log(`\n🗓️  Day ${day.dayIndex + 1}: ${day.dayName}`);
  console.log(`   Exercises: ${day.slots.length} | Sets: ${day.recipe.totalSets}`);
  console.log(`   ${day.modifications.length > 0 ? `Modifications: ${day.modifications.join(', ')}` : ''}`);
});

console.log(`\n📊 Weekly Summary: ${fatLossResult.summary.totalExercises} exercises, ${fatLossResult.summary.totalSets} sets`);

// Demo 3: Advanced with High Recovery Burden
console.log('\n\n📋 DEMO 3: Advanced - Upper/Lower 4x/week (High Recovery Burden)');
console.log('-'.repeat(70));

const advancedContext = {
  ...beginnerContext,
  experienceLevel: 'advanced' as const,
  recoveryBurden: 'high' as const,
};

const advancedResult = selectRecipesForPlan(advancedContext);

advancedResult.recipes.slice(0, 2).forEach((day) => {
  console.log(`\n🗓️  Day ${day.dayIndex + 1}: ${day.dayName}`);
  console.log(`   Exercises: ${day.slots.length} | Sets: ${day.recipe.totalSets} (20% reduction applied)`);
  console.log(`   ${day.modifications.length > 0 ? `Modifications: ${day.modifications.join(', ')}` : ''}`);
});

console.log(`\n📊 Weekly Summary: ${advancedResult.summary.totalExercises} exercises, ${advancedResult.summary.totalSets} sets`);

// Demo 4: Volume Validation
console.log('\n\n📋 DEMO 4: Volume Validation');
console.log('-'.repeat(70));

const volumeCheck = validateWeeklyVolume(
  beginnerResult.recipes,
  'beginner',
  'moderate'
);

console.log(`Validation for beginner, moderate recovery:`);
console.log(`   Valid: ${volumeCheck.valid ? '✅' : '❌'}`);
if (volumeCheck.issues.length > 0) {
  console.log(`   Issues:`);
  volumeCheck.issues.forEach((issue) => console.log(`      - ${issue}`));
}
if (volumeCheck.recommendations.length > 0) {
  console.log(`   Recommendations:`);
  volumeCheck.recommendations.forEach((rec) => console.log(`      - ${rec}`));
}

// Demo 5: Recipe Validation
console.log('\n\n📋 DEMO 5: Recipe Validation');
console.log('-'.repeat(70));

const recipes = getRecipesForSplit('upper_lower_4', 'beginner', 4);
recipes.forEach((recipe, i) => {
  const validation = validateRecipe(recipe, 'beginner');
  console.log(`\nRecipe ${i + 1}: ${recipe.name}`);
  console.log(`   Valid: ${validation.valid ? '✅' : '❌'}`);
  if (validation.issues.length > 0) {
    validation.issues.forEach((issue) => console.log(`   ⚠️  ${issue}`));
  }
});

// Demo 6: Full Body Comparison
console.log('\n\n📋 DEMO 6: Experience Comparison (Full Body)');
console.log('-'.repeat(70));

['beginner', 'intermediate', 'advanced'].forEach((level) => {
  const context = {
    splitKey: 'full_body_3',
    experienceLevel: level as any,
    primaryGoal: 'build_muscle' as const,
    daysPerWeek: 3,
    sessionDurationMin: 60,
    equipmentAccess: 'full_gym',
    recoveryBurden: 'moderate' as const,
  };

  const result = selectRecipesForPlan(context);
  console.log(`\n${level.toUpperCase()}:`);
  console.log(`   Exercises/day: ${(result.summary.totalExercises / 3).toFixed(1)}`);
  console.log(`   Sets/day: ${(result.summary.totalSets / 3).toFixed(1)}`);
  console.log(`   Duration: ${result.summary.averageDuration.toFixed(0)}min`);
});

console.log('\n' + '='.repeat(70));
console.log('DEMONSTRATION COMPLETE');
console.log('='.repeat(70));
