/**
 * recipe-system.ts
 *
 * Phase 2: Recipe System Enhancement - Main Export
 *
 * This module exports all recipe system components for easy integration
 * with the workout generation pipeline.
 */

// Core recipe definitions
export {
  // Types
  type ExerciseSlot,
  type DayRecipe,
  type ExperienceRecipeSet,
  // Recipe Registry
  EXPERIENCE_RECIPES,
  // Recipe getters
  getRecipeForSplit,
  getRecipesForSplit,
  // Experience-based limits
  getMinimumExercises,
  getMinimumSetsPerSession,
  getMaximumExercises,
  // Validation
  validateRecipe,
  // Modifications
  applyGoalModifications,
} from './exercise-recipes-by-experience';

// Recipe selection and integration
export {
  // Types
  type SlotPriority,
  type RecipeSelectionContext,
  type SelectedRecipe,
  type RecipeSelectionResult,
  // Priorities
  getGoalSlotPriorities,
  // Main selection
  selectRecipesForPlan,
  // Helpers
  selectBestExerciseForSlot,
  validateWeeklyVolume,
  getQuickRecipe,
} from './recipe-selection';

/**
 * Quick Recipe Selection
 *
 * Most common use case - get recipes for a training plan.
 *
 * @example
 * ```typescript
 * import { selectRecipesForPlan } from './lib/workout/recipe-system';
 *
 * const result = selectRecipesForPlan({
 *   splitKey: 'upper_lower_4',
 *   experienceLevel: 'intermediate',
 *   primaryGoal: 'build_muscle',
 *   daysPerWeek: 4,
 *   sessionDurationMin: 60,
 *   equipmentAccess: 'full_gym',
 *   recoveryBurden: 'moderate',
 * });
 *
 * result.recipes.forEach(day => {
 *   console.log(`${day.dayName}: ${day.slots.length} exercises`);
 * });
 * ```
 */

/**
 * Integration with Workout Generation
 *
 * The recipe system is designed to integrate with the existing
 * workout generation pipeline:
 *
 * 1. User completes onboarding → TrainingProfile
 * 2. Split selection determines splitKey and daysPerWeek
 * 3. Recipe selection creates day templates
 * 4. Exercise catalog fills slots with appropriate exercises
 * 5. Quality gates validate the complete plan
 * 6. WorkoutProgram is generated and saved
 *
 * @example
 * ```typescript
 * // In workout generation service
 * import { selectRecipesForPlan, validateWeeklyVolume } from './recipe-system';
 *
 * async function generateWorkoutPlan(profile: TrainingProfile): Promise<WorkoutProgram> {
 *   // 1. Get recipes
 *   const recipeResult = selectRecipesForPlan({
 *     splitKey: determineSplitKey(profile),
 *     experienceLevel: profile.experienceLevel,
 *     primaryGoal: profile.primaryGoal,
 *     daysPerWeek: profile.daysPerWeek,
 *     sessionDurationMin: profile.sessionDurationMin,
 *     equipmentAccess: profile.equipmentAccess,
 *     recoveryBurden: calculateRecoveryBurden(profile),
 *   });
 *
 *   // 2. Validate volume
 *   const volumeCheck = validateWeeklyVolume(
 *     recipeResult.recipes,
 *     profile.experienceLevel,
 *     'moderate'
 *   );
 *
 *   if (!volumeCheck.valid) {
 *     console.warn('Volume issues:', volumeCheck.issues);
 *   }
 *
 *   // 3. Fill slots with exercises from catalog
 *   const programDays = await Promise.all(
 *     recipeResult.recipes.map(async (dayRecipe) => {
 *       const exercises = await fillRecipeSlots(dayRecipe, profile);
 *       return createProgramDay(dayRecipe.dayName, exercises);
 *     })
 *   );
 *
 *   // 4. Run quality gates
 *   const qualityResult = runQualityGates(programDays, profile);
 *
 *   // 5. Return final program
 *   return createWorkoutProgram(programDays);
 * }
 * ```
 */
