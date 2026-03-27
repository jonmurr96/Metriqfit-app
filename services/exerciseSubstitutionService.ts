/**
 * Exercise Substitution Service
 *
 * Provides intelligent exercise swap recommendations based on:
 * - Equipment compatibility (user's available equipment)
 * - Biomechanical equivalence (movement pattern matching)
 * - Difficulty preservation
 * - Muscle group validation
 * - Program coherence (compound/isolation slot logic)
 */

import { supabase } from '../lib/supabase';
import {
  type ProgramExercise,
  isExerciseEquipmentCompatible,
  inferPrimaryExerciseFocus,
} from '../lib/workout/programMappingRules';
import { classifyExercise } from '../lib/workout/exerciseClassification';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Exercise {
  id: string;
  name: string;
  category: string | null;
  equipment_required: string[] | null;
  primary_muscle: string | null;
  pattern: string | null;
  difficulty: string | null;
  has_media: boolean;
  video_url: string | null;
  gif_url: string | null;
  image_url: string | null;
}

export type SubstitutionCategory = 'perfect_match' | 'good_alternative' | 'different_pattern';

export interface SubstitutionOption {
  exercise: Exercise;
  score: number;
  category: SubstitutionCategory;
  matchReasons: string[];
  warnings: string[];
  equipmentCompatible: boolean;
}

export interface SubstitutionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  preservesCompoundRatio: boolean;
  preservesMovementPattern: boolean;
  equipmentCompatible: boolean;
}

export interface SmartSubstitutionInput {
  originalExerciseId: string;
  userId: string;
  sessionExercises?: Exercise[]; // To avoid duplicates
  dayFocus?: string | null; // chest/back/legs
  slotIndex?: number; // 0-6 position in workout
}

// ============================================================================
// User Equipment Fetching
// ============================================================================

/**
 * Get user's available equipment from onboarding
 */
export async function getUserEquipment(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('onboarding_answers')
    .select('equipment')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[exerciseSubstitution] Failed to fetch user equipment:', error);
    return [];
  }

  // equipment field is JSON array
  if (!data?.equipment) {
    return [];
  }

  // Handle both JSON string and parsed array
  if (typeof data.equipment === 'string') {
    try {
      return JSON.parse(data.equipment);
    } catch {
      return [];
    }
  }

  return Array.isArray(data.equipment) ? data.equipment : [];
}

// ============================================================================
// Equipment Compatibility
// ============================================================================

/**
 * Check if an exercise is accessible with user's equipment
 */
export function isExerciseAccessible(
  exercise: Exercise | ProgramExercise,
  userEquipment: string[]
): boolean {
  const required = exercise.equipment_required || [];

  // Bodyweight exercises are always accessible
  if (required.length === 0 || required.includes('bodyweight')) {
    return true;
  }

  // If user has no equipment specified, assume they have access to all
  if (userEquipment.length === 0) {
    return true;
  }

  return isExerciseEquipmentCompatible(required, userEquipment);
}

/**
 * Get equipment warning message if incompatible
 */
export function getEquipmentWarning(
  exercise: Exercise,
  userEquipment: string[]
): string | null {
  if (isExerciseAccessible(exercise, userEquipment)) {
    return null;
  }

  const required = exercise.equipment_required || [];
  const missing = required.filter(eq => !userEquipment.includes(eq));

  if (missing.length === 0) {
    return null;
  }

  return `Requires ${missing.join(', ')} (not in your equipment)`;
}

// ============================================================================
// Substitution Scoring
// ============================================================================

/**
 * Score a substitution candidate
 * Extends the programMappingEngine scoring with substitution-specific logic
 */
export function scoreSubstitutionCandidate(input: {
  candidate: Exercise;
  original: Exercise;
  userEquipment: string[];
  sessionExercises: Exercise[];
  dayFocus: string | null;
  slotIndex: number;
}): {
  score: number;
  category: SubstitutionCategory;
  matchReasons: string[];
  warnings: string[];
} {
  let score = 0;
  const matchReasons: string[] = [];
  const warnings: string[] = [];

  const candidateClassification = classifyExercise(input.candidate as ProgramExercise);
  const originalClassification = classifyExercise(input.original as ProgramExercise);

  // HARD FILTER: Equipment Compatibility (blocks incompatible exercises)
  const equipmentCompatible = isExerciseAccessible(input.candidate, input.userEquipment);
  if (!equipmentCompatible) {
    score -= 1000; // Essentially blocks this exercise
    const warning = getEquipmentWarning(input.candidate, input.userEquipment);
    if (warning) warnings.push(warning);
  } else {
    matchReasons.push('Equipment compatible');
  }

  // HARD FILTER: Duplicate Prevention
  const isDuplicate = input.sessionExercises.some(ex => ex.id === input.candidate.id);
  if (isDuplicate) {
    score -= 1000; // Block duplicates
    warnings.push('Already in this workout');
  }

  // CORE SCORING: Movement Pattern Matching (+50 for exact match)
  const candidatePattern = candidateClassification.movementPatternGroup;
  const originalPattern = originalClassification.movementPatternGroup;

  if (candidatePattern === originalPattern) {
    score += 50;
    matchReasons.push(`Same movement pattern (${candidatePattern})`);
  } else if (candidatePattern && originalPattern) {
    // Related patterns get partial credit
    const relatedPatterns: Record<string, string[]> = {
      horizontal_push: ['vertical_push', 'chest_accessory'],
      vertical_push: ['horizontal_push', 'shoulder_accessory'],
      horizontal_pull: ['vertical_pull', 'back_accessory'],
      vertical_pull: ['horizontal_pull', 'back_accessory'],
      squat: ['lunge', 'leg_press'],
      hinge: ['glute_accessory', 'hamstring_accessory'],
    };

    if (relatedPatterns[originalPattern]?.includes(candidatePattern)) {
      score += 20;
      matchReasons.push(`Related pattern (${candidatePattern})`);
    } else {
      warnings.push(`Different movement pattern (${originalPattern} → ${candidatePattern})`);
    }
  }

  // PRIMARY MUSCLE MATCHING (+40 for exact match)
  if (input.candidate.primary_muscle === input.original.primary_muscle) {
    score += 40;
    matchReasons.push(`Same primary muscle (${input.candidate.primary_muscle})`);
  } else if (input.candidate.primary_muscle && input.original.primary_muscle) {
    warnings.push(
      `Different primary muscle (${input.original.primary_muscle} → ${input.candidate.primary_muscle})`
    );
  }

  // CATEGORY MATCHING (+20 for exact match)
  if (input.candidate.category === input.original.category) {
    score += 20;
    matchReasons.push(`Same category (${input.candidate.category})`);
  }

  // DIFFICULTY PRESERVATION (+15 for same difficulty)
  if (input.candidate.difficulty === input.original.difficulty) {
    score += 15;
    matchReasons.push(`Same difficulty (${input.candidate.difficulty})`);
  } else if (input.candidate.difficulty && input.original.difficulty) {
    const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
    const candidateDiffIdx = difficultyOrder.indexOf(input.candidate.difficulty);
    const originalDiffIdx = difficultyOrder.indexOf(input.original.difficulty);

    if (candidateDiffIdx > originalDiffIdx) {
      warnings.push(`Harder variation (${input.candidate.difficulty})`);
      score -= 10;
    } else if (candidateDiffIdx < originalDiffIdx) {
      matchReasons.push(`Easier variation (${input.candidate.difficulty})`);
      score += 5;
    }
  }

  // COMPOUND/ISOLATION PRESERVATION (+30)
  if (candidateClassification.isCompound === originalClassification.isCompound) {
    score += 30;
    matchReasons.push(
      candidateClassification.isCompound ? 'Both compound exercises' : 'Both isolation exercises'
    );
  } else {
    warnings.push(
      candidateClassification.isCompound
        ? 'Compound (original was isolation)'
        : 'Isolation (original was compound)'
    );
    score -= 20;
  }

  // SLOT-BASED SCORING (compounds early, isolation late)
  if (input.slotIndex !== undefined) {
    if (input.slotIndex <= 2 && candidateClassification.isCompound) {
      score += 25; // Compounds are great for early slots
      matchReasons.push('Well-suited for early workout slot');
    } else if (input.slotIndex > 4 && !candidateClassification.isCompound) {
      score += 15; // Isolation good for later slots
      matchReasons.push('Well-suited for late workout slot');
    }
  }

  // DAY FOCUS ALIGNMENT (+35 if matches day focus)
  if (input.dayFocus) {
    const candidateFocus = inferPrimaryExerciseFocus(input.candidate as ProgramExercise);
    const dayFocusNormalized = input.dayFocus.toLowerCase();

    if (candidateFocus && candidateFocus === dayFocusNormalized) {
      score += 35;
      matchReasons.push(`Matches ${input.dayFocus} day focus`);
    } else if (candidateFocus && candidateFocus !== dayFocusNormalized) {
      warnings.push(`Focus mismatch (${candidateFocus} on ${input.dayFocus} day)`);
      score -= 30;
    }
  }

  // COMMON EXERCISE BONUS (+25)
  if (candidateClassification.isCommon) {
    score += 25;
    matchReasons.push('Common, proven exercise');
  }

  // MEDIA AVAILABILITY (+10 if has video/gif)
  if (input.candidate.has_media) {
    score += 10;
  }

  // DETERMINE CATEGORY
  let category: SubstitutionCategory;
  if (score >= 100 && warnings.length === 0) {
    category = 'perfect_match';
  } else if (score >= 50 || (score >= 30 && warnings.length <= 1)) {
    category = 'good_alternative';
  } else {
    category = 'different_pattern';
  }

  return {
    score,
    category,
    matchReasons,
    warnings,
  };
}

// ============================================================================
// Main Substitution Function
// ============================================================================

/**
 * Get smart substitution options for an exercise
 */
export async function getSmartSubstitutions(
  input: SmartSubstitutionInput
): Promise<{
  perfectMatches: SubstitutionOption[];
  goodAlternatives: SubstitutionOption[];
  allExercises: SubstitutionOption[];
}> {
  // 1. Fetch user equipment
  const userEquipment = await getUserEquipment(input.userId);

  // 2. Get original exercise
  const { data: originalExercise, error: originalError } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', input.originalExerciseId)
    .single();

  if (originalError || !originalExercise) {
    throw new Error('Original exercise not found');
  }

  // 3. Get all exercises (excluding the original)
  const { data: allExercises, error: allError } = await supabase
    .from('exercises')
    .select('*')
    .neq('id', input.originalExerciseId)
    .order('name');

  if (allError || !allExercises) {
    throw new Error('Failed to fetch exercise pool');
  }

  // 4. Score and categorize all exercises
  const sessionExercises = input.sessionExercises || [];
  const slotIndex = input.slotIndex ?? 0;

  const scoredOptions: SubstitutionOption[] = allExercises.map(candidate => {
    const scoring = scoreSubstitutionCandidate({
      candidate,
      original: originalExercise,
      userEquipment,
      sessionExercises,
      dayFocus: input.dayFocus ?? null,
      slotIndex,
    });

    return {
      exercise: candidate,
      score: scoring.score,
      category: scoring.category,
      matchReasons: scoring.matchReasons,
      warnings: scoring.warnings,
      equipmentCompatible: isExerciseAccessible(candidate, userEquipment),
    };
  });

  // 5. Sort by score (highest first)
  scoredOptions.sort((a, b) => b.score - a.score);

  // 6. Categorize into tiers
  const perfectMatches = scoredOptions.filter(
    opt => opt.category === 'perfect_match' && opt.equipmentCompatible
  );

  const goodAlternatives = scoredOptions.filter(
    opt => opt.category === 'good_alternative' && opt.equipmentCompatible
  );

  // All exercises (including incompatible ones, for fallback search)
  const allExercisesFiltered = scoredOptions.filter(
    opt => !sessionExercises.some(ex => ex.id === opt.exercise.id)
  );

  return {
    perfectMatches: perfectMatches.slice(0, 10), // Top 10 perfect matches
    goodAlternatives: goodAlternatives.slice(0, 15), // Top 15 good alternatives
    allExercises: allExercisesFiltered.slice(0, 50), // Top 50 all exercises
  };
}

/**
 * Validate a substitution before applying
 */
export async function validateSubstitution(
  originalExerciseId: string,
  replacementExerciseId: string,
  userId: string
): Promise<SubstitutionValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Fetch both exercises
  const [originalRes, replacementRes, userEquipment] = await Promise.all([
    supabase.from('exercises').select('*').eq('id', originalExerciseId).single(),
    supabase.from('exercises').select('*').eq('id', replacementExerciseId).single(),
    getUserEquipment(userId),
  ]);

  if (originalRes.error || !originalRes.data) {
    errors.push('Original exercise not found');
    return {
      isValid: false,
      errors,
      warnings,
      preservesCompoundRatio: false,
      preservesMovementPattern: false,
      equipmentCompatible: false,
    };
  }

  if (replacementRes.error || !replacementRes.data) {
    errors.push('Replacement exercise not found');
    return {
      isValid: false,
      errors,
      warnings,
      preservesCompoundRatio: false,
      preservesMovementPattern: false,
      equipmentCompatible: false,
    };
  }

  const original = originalRes.data;
  const replacement = replacementRes.data;

  // Check equipment compatibility
  const equipmentCompatible = isExerciseAccessible(replacement, userEquipment);
  if (!equipmentCompatible) {
    warnings.push(getEquipmentWarning(replacement, userEquipment) || 'Equipment not available');
  }

  // Check compound/isolation preservation
  const originalClassification = classifyExercise(original as ProgramExercise);
  const replacementClassification = classifyExercise(replacement as ProgramExercise);

  const preservesCompoundRatio =
    originalClassification.isCompound === replacementClassification.isCompound;

  if (!preservesCompoundRatio) {
    warnings.push(
      replacementClassification.isCompound
        ? 'Switching to compound exercise'
        : 'Switching to isolation exercise'
    );
  }

  // Check movement pattern preservation
  const preservesMovementPattern =
    originalClassification.movementPatternGroup === replacementClassification.movementPatternGroup;

  if (!preservesMovementPattern) {
    warnings.push(
      `Movement pattern change: ${originalClassification.movementPatternGroup} → ${replacementClassification.movementPatternGroup}`
    );
  }

  // Check muscle group preservation
  if (original.primary_muscle !== replacement.primary_muscle) {
    warnings.push(`Primary muscle change: ${original.primary_muscle} → ${replacement.primary_muscle}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    preservesCompoundRatio,
    preservesMovementPattern,
    equipmentCompatible,
  };
}
