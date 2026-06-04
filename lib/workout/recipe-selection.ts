/**
 * recipe-selection.ts
 *
 * Recipe Selection Helper
 * Part of Phase 2: Recipe System Enhancement
 *
 * Integrates per-experience recipes with the existing split selection system.
 * Provides goal-aware slot priorities and minimum volume enforcement.
 */

import type { ExperienceLevel, PrimaryGoal, UserTrainingProfile } from './training-profile.ts';
import type { PatternSlot } from './exerciseClassification.ts';
import {
  getRecipeForSplit,
  getRecipesForSplit,
  getMinimumExercises,
  getMinimumSetsPerSession,
  getMaximumExercises,
  applyGoalModifications,
  type DayRecipe,
  type ExerciseSlot,
} from './exercise-recipes-by-experience.ts';

// ---------------------------------------------------------------------------
// Goal-Aware Slot Priorities
// ---------------------------------------------------------------------------

export type SlotPriority = {
  pattern: PatternSlot;
  priority: number; // 1 = highest
  reason: string;
};

/**
 * Prioritizes exercise patterns based on training goal
 */
export function getGoalSlotPriorities(goal: PrimaryGoal): SlotPriority[] {
  const basePriorities: SlotPriority[] = [
    { pattern: 'compound_squat', priority: 1, reason: 'Fundamental movement pattern' },
    { pattern: 'compound_hinge', priority: 1, reason: 'Fundamental movement pattern' },
    { pattern: 'horizontal_push', priority: 1, reason: 'Fundamental movement pattern' },
    { pattern: 'horizontal_pull', priority: 1, reason: 'Fundamental movement pattern' },
  ];

  switch (goal) {
    case 'lose_fat':
      return [
        ...basePriorities,
        { pattern: 'vertical_pull', priority: 2, reason: 'Large muscle groups for calorie burn' },
        { pattern: 'vertical_push', priority: 2, reason: 'Large muscle groups for calorie burn' },
        { pattern: 'single_leg', priority: 2, reason: 'Balance and stability' },
        { pattern: 'core', priority: 3, reason: 'Metabolic stress' },
        { pattern: 'conditioning', priority: 3, reason: 'Cardiovascular component' },
        { pattern: 'chest_fly', priority: 4, reason: 'Isolation work' },
        { pattern: 'bicep_curl', priority: 5, reason: 'Accessory' },
        { pattern: 'tricep_ext', priority: 5, reason: 'Accessory' },
      ];

    case 'get_stronger':
      return [
        { pattern: 'compound_squat', priority: 1, reason: 'Primary strength movement' },
        { pattern: 'compound_hinge', priority: 1, reason: 'Primary strength movement' },
        { pattern: 'horizontal_push', priority: 1, reason: 'Primary strength movement' },
        { pattern: 'vertical_push', priority: 2, reason: 'Secondary compound' },
        { pattern: 'horizontal_pull', priority: 2, reason: 'Secondary compound' },
        { pattern: 'vertical_pull', priority: 3, reason: 'Support work' },
        { pattern: 'single_leg', priority: 4, reason: 'Stability' },
        { pattern: 'core', priority: 4, reason: 'Stability' },
        { pattern: 'bicep_curl', priority: 5, reason: 'Minimal accessory' },
        { pattern: 'tricep_ext', priority: 5, reason: 'Minimal accessory' },
        { pattern: 'chest_fly', priority: 5, reason: 'Minimal accessory' },
      ];

    case 'build_muscle':
    default:
      return [
        ...basePriorities,
        { pattern: 'vertical_push', priority: 2, reason: 'Volume for delts' },
        { pattern: 'vertical_pull', priority: 2, reason: 'Volume for lats' },
        { pattern: 'single_leg', priority: 2, reason: 'Leg development' },
        { pattern: 'chest_fly', priority: 3, reason: 'Chest isolation' },
        { pattern: 'shoulder_raise', priority: 3, reason: 'Delt isolation' },
        { pattern: 'rear_delt', priority: 3, reason: 'Shoulder health' },
        { pattern: 'leg_curl', priority: 3, reason: 'Hamstring development' },
        { pattern: 'leg_extension', priority: 4, reason: 'Quad isolation' },
        { pattern: 'hip_thrust', priority: 3, reason: 'Glute development' },
        { pattern: 'bicep_curl', priority: 4, reason: 'Arm hypertrophy' },
        { pattern: 'tricep_ext', priority: 4, reason: 'Arm hypertrophy' },
        { pattern: 'calf', priority: 5, reason: 'Lower leg' },
      ];
  }
}

// ---------------------------------------------------------------------------
// Recipe Selection Context
// ---------------------------------------------------------------------------

export type RecipeSelectionContext = {
  splitKey: string;
  experienceLevel: ExperienceLevel;
  primaryGoal: PrimaryGoal;
  daysPerWeek: number;
  sessionDurationMin: number;
  equipmentAccess: string;
  recoveryBurden: 'low' | 'moderate' | 'high';
  injuries?: string[];
};

export type SelectedRecipe = {
  dayIndex: number;
  dayName: string;
  recipe: DayRecipe;
  slots: ExerciseSlot[];
  modifications: string[];
  warnings: string[];
};

export type RecipeSelectionResult = {
  recipes: SelectedRecipe[];
  summary: {
    totalExercises: number;
    totalSets: number;
    averageDuration: number;
    meetsMinimums: boolean;
    warnings: string[];
  };
};

// ---------------------------------------------------------------------------
// Main Recipe Selection Function
// ---------------------------------------------------------------------------

export function selectRecipesForPlan(context: RecipeSelectionContext): RecipeSelectionResult {
  const { splitKey, experienceLevel, primaryGoal, daysPerWeek, sessionDurationMin, recoveryBurden } = context;

  const warnings: string[] = [];
  const modifications: string[] = [];

  // Get base recipes for the split and experience
  const baseRecipes = getRecipesForSplit(splitKey, experienceLevel, daysPerWeek);

  if (baseRecipes.length === 0) {
    warnings.push(`No recipes found for split "${splitKey}" at ${experienceLevel} level`);
    return {
      recipes: [],
      summary: {
        totalExercises: 0,
        totalSets: 0,
        averageDuration: 0,
        meetsMinimums: false,
        warnings,
      },
    };
  }

  // Apply modifications based on context
  const modifiedRecipes: SelectedRecipe[] = baseRecipes.map((recipe, dayIndex) => {
    let finalRecipe = { ...recipe };
    const dayModifications: string[] = [];
    const dayWarnings: string[] = [];

    // Apply goal modifications
    if (primaryGoal !== 'build_muscle') {
      finalRecipe = applyGoalModifications(finalRecipe, primaryGoal);
      dayModifications.push(`Adjusted for ${primaryGoal} goal`);
    }

    // Adjust for recovery burden
    if (recoveryBurden === 'high') {
      // Reduce volume by 20% for high recovery burden
      finalRecipe.slots = finalRecipe.slots.map((slot) => ({
        ...slot,
        sets: Math.max(2, Math.round(slot.sets * 0.8)),
      }));
      finalRecipe.totalSets = finalRecipe.slots.reduce((sum, s) => sum + s.sets, 0);
      dayModifications.push('Reduced volume 20% for high recovery burden');
    } else if (recoveryBurden === 'moderate') {
      // Reduce volume by 10% for moderate recovery burden
      finalRecipe.slots = finalRecipe.slots.map((slot) => ({
        ...slot,
        sets: Math.max(2, Math.round(slot.sets * 0.9)),
      }));
      finalRecipe.totalSets = finalRecipe.slots.reduce((sum, s) => sum + s.sets, 0);
      dayModifications.push('Reduced volume 10% for moderate recovery burden');
    }

    // Check minimum volume requirements
    const minExercises = getMinimumExercises(experienceLevel);
    const minSets = getMinimumSetsPerSession(experienceLevel);

    if (finalRecipe.slots.length < minExercises) {
      dayWarnings.push(
        `Only ${finalRecipe.slots.length} exercises, minimum ${minExercises} recommended for ${experienceLevel}`
      );
    }

    if (finalRecipe.totalSets < minSets) {
      dayWarnings.push(
        `Only ${finalRecipe.totalSets} sets, minimum ${minSets} recommended for ${experienceLevel}`
      );
    }

    // Check maximum based on session duration
    const maxExercises = getMaximumExercises(experienceLevel, sessionDurationMin);
    if (finalRecipe.slots.length > maxExercises) {
      dayWarnings.push(
        `${finalRecipe.slots.length} exercises may exceed ${sessionDurationMin} minute session limit`
      );
    }

    // Re-sort slots by goal priorities
    const goalPriorities = getGoalSlotPriorities(primaryGoal);
    const priorityMap = new Map(goalPriorities.map((p) => [p.pattern, p.priority]));

    finalRecipe.slots = [...finalRecipe.slots].sort((a, b) => {
      const priorityA = priorityMap.get(a.pattern) || 99;
      const priorityB = priorityMap.get(b.pattern) || 99;
      return priorityA - priorityB;
    });

    return {
      dayIndex,
      dayName: finalRecipe.name,
      recipe: finalRecipe,
      slots: finalRecipe.slots,
      modifications: dayModifications,
      warnings: dayWarnings,
    };
  });

  // Calculate summary
  const totalExercises = modifiedRecipes.reduce((sum, r) => sum + r.slots.length, 0);
  const totalSets = modifiedRecipes.reduce((sum, r) => sum + r.recipe.totalSets, 0);
  const averageDuration =
    modifiedRecipes.reduce((sum, r) => sum + r.recipe.estimatedDurationMin, 0) / modifiedRecipes.length;

  const minTotalExercises = getMinimumExercises(experienceLevel) * daysPerWeek;
  const minTotalSets = getMinimumSetsPerSession(experienceLevel) * daysPerWeek;

  const meetsMinimums = totalExercises >= minTotalExercises && totalSets >= minTotalSets;

  if (!meetsMinimums) {
    warnings.push(
      `Plan totals (${totalExercises} exercises, ${totalSets} sets) below minimums for ${experienceLevel} (${minTotalExercises} exercises, ${minTotalSets} sets)`
    );
  }

  return {
    recipes: modifiedRecipes,
    summary: {
      totalExercises,
      totalSets,
      averageDuration,
      meetsMinimums,
      warnings: [...warnings, ...modifiedRecipes.flatMap((r) => r.warnings)],
    },
  };
}

// ---------------------------------------------------------------------------
// Slot Selection Helper
// ---------------------------------------------------------------------------

export function selectBestExerciseForSlot(
  slot: ExerciseSlot,
  availableExercises: string[],
  goal: PrimaryGoal,
  experienceLevel: ExperienceLevel
): { exercise: string; score: number; reason: string } | null {
  if (availableExercises.length === 0) return null;

  // Score each exercise
  const scored = availableExercises.map((exercise) => {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Higher score for compounds
    const isCompound = ['squat', 'deadlift', 'bench', 'press', 'row', 'pull'].some((kw) =>
      exercise.toLowerCase().includes(kw)
    );
    if (isCompound) {
      score += 20;
      reasons.push('compound movement');
    }

    // Goal-specific scoring
    if (goal === 'lose_fat') {
      if (isCompound) {
        score += 15;
        reasons.push('high calorie burn');
      }
    } else if (goal === 'get_stronger') {
      if (['barbell', 'heavy', 'deadlift', 'squat'].some((kw) => exercise.toLowerCase().includes(kw))) {
        score += 15;
        reasons.push('strength-focused');
      }
    }

    // Experience-level preferences
    if (experienceLevel === 'beginner') {
      if (['machine', 'smith'].some((kw) => exercise.toLowerCase().includes(kw))) {
        // Actually prefer free weights for beginners when available
        score -= 10;
      }
      if (['dumbbell', 'goblet', 'leg press'].some((kw) => exercise.toLowerCase().includes(kw))) {
        score += 10;
        reasons.push('beginner-friendly');
      }
    }

    return {
      exercise,
      score,
      reason: reasons.join(', ') || 'standard selection',
    };
  });

  // Return highest scored
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

// ---------------------------------------------------------------------------
// Volume Validation
// ---------------------------------------------------------------------------

export function validateWeeklyVolume(
  recipes: SelectedRecipe[],
  experienceLevel: ExperienceLevel,
  recoveryBurden: 'low' | 'moderate' | 'high'
): {
  valid: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Calculate weekly volume by pattern
  const patternVolumes: Record<string, number> = {};
  recipes.forEach((recipe) => {
    recipe.slots.forEach((slot) => {
      patternVolumes[slot.pattern] = (patternVolumes[slot.pattern] || 0) + slot.sets;
    });
  });

  // Check compound pattern minimums
  const requiredCompounds: Record<ExperienceLevel, Record<string, number>> = {
    beginner: {
      compound_squat: 6,
      compound_hinge: 6,
      horizontal_push: 6,
      horizontal_pull: 6,
    },
    intermediate: {
      compound_squat: 8,
      compound_hinge: 8,
      horizontal_push: 8,
      horizontal_pull: 8,
    },
    advanced: {
      compound_squat: 10,
      compound_hinge: 10,
      horizontal_push: 10,
      horizontal_pull: 10,
    },
  };

  const minimums = requiredCompounds[experienceLevel];
  const multiplier = recoveryBurden === 'high' ? 0.7 : recoveryBurden === 'moderate' ? 0.85 : 1.0;

  Object.entries(minimums).forEach(([pattern, minSets]) => {
    const actualSets = patternVolumes[pattern] || 0;
    const adjustedMin = Math.round(minSets * multiplier);

    if (actualSets < adjustedMin) {
      issues.push(
        `${pattern}: ${actualSets} sets/week, minimum ${adjustedMin} recommended for ${experienceLevel} (${recoveryBurden} recovery)`
      );
      recommendations.push(`Add ${adjustedMin - actualSets} sets of ${pattern} per week`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Quick Recipe Lookup
// ---------------------------------------------------------------------------

export function getQuickRecipe(
  splitKey: string,
  dayIndex: number,
  profile: Pick<UserTrainingProfile, 'experienceLevel' | 'primaryGoal' | 'sessionDurationMin'>
): DayRecipe | null {
  const experienceLevel = profile.experienceLevel || 'intermediate';
  const primaryGoal = profile.primaryGoal || 'build_muscle';
  const sessionDurationMin = profile.sessionDurationMin || 60;

  const context: RecipeSelectionContext = {
    splitKey,
    experienceLevel,
    primaryGoal,
    daysPerWeek: 1,
    sessionDurationMin,
    equipmentAccess: 'full_gym',
    recoveryBurden: 'moderate',
  };

  const result = selectRecipesForPlan(context);
  return result.recipes[dayIndex]?.recipe || null;
}
