import {
  EquipmentCategory,
  Exercise,
  ExerciseTier,
  GoalBucket,
  ProgressionModel,
  ReplacementGroup,
  SessionEnvironment,
  WorkoutDay,
  WorkoutExercise,
  WorkoutPlan,
  PlanTemplate,
  LiftComfort,
  SlotArchetype,
  ExperienceLevel,
  MovementPattern,
} from '../../types/v1_engine.ts';
import { coreExercises } from '../../loaders/seeds/exercises.ts';
import { coreSubstitutions, secondaryGroupFallbacks } from '../../loaders/seeds/substitutions.ts';

/**
 * Maps Environments to allowed Equipment Categories.
 * Refined per user requirements.
 */
export const EnvironmentEquipmentWhitelist: Record<SessionEnvironment, EquipmentCategory[]> = {
  [SessionEnvironment.Commercial]: [
    EquipmentCategory.Barbell,
    EquipmentCategory.DB,
    EquipmentCategory.Machine,
    EquipmentCategory.Cable,
    EquipmentCategory.BW,
    EquipmentCategory.Misc,
  ],
  [SessionEnvironment.AptHotel]: [
    EquipmentCategory.DB,
    EquipmentCategory.BW,
    EquipmentCategory.Machine,
    EquipmentCategory.Cable,
    EquipmentCategory.Misc,
  ],
  [SessionEnvironment.Home]: [
    EquipmentCategory.DB,
    EquipmentCategory.BW,
    EquipmentCategory.Misc,
  ],
  [SessionEnvironment.Bodyweight]: [
    EquipmentCategory.BW,
  ],
};

/**
 * Hydrates a template with concrete exercises for a specific user persona.
 */
export function hydrateTemplate(
  template: PlanTemplate,
  family_id: string,
  user_persona: {
    goal: GoalBucket;
    environment: SessionEnvironment;
    comfort: LiftComfort;
    injuries: string[];
    experience_level: ExperienceLevel;
  },
  expectedDaysPerWeek?: number
): WorkoutPlan {
  // Defensive check: Ensure the template day count matches the requested day count.
  if (expectedDaysPerWeek !== undefined && template.days_per_week !== expectedDaysPerWeek) {
    throw new Error(
      `Architect Day Count Mismatch: Template "${template.name}" (${template.external_id}) has ${template.days_per_week} days, but user requested ${expectedDaysPerWeek} days. Librarian routing failure.`
    );
  }

  const hydratedDays: WorkoutDay[] = template.days.map((day) => {
    const hydratedExercises: WorkoutExercise[] = day.slots.map((slot) => {
      // 1. Determine Primary Candidate (if defined by a 'preferred' ID - for now we search the group)
      // 2. Scan same group T1/T2
      let candidate = findExerciseInGroup(slot.architectural_group, [ExerciseTier.T1, ExerciseTier.T2], user_persona);

      // 3. Fallback: same group T3
      if (!candidate) {
        candidate = findExerciseInGroup(slot.architectural_group, [ExerciseTier.T3], user_persona, 'same_group_t3_fallback');
      }

      // 4. Fallback: secondary group
      if (!candidate) {
        const secondaryGroup = secondaryGroupFallbacks[slot.architectural_group];
        if (secondaryGroup) {
          candidate = findExerciseInGroup(secondaryGroup, [ExerciseTier.T1, ExerciseTier.T2, ExerciseTier.T3], user_persona, 'secondary_group_fallback');
        }
      }

      // 5. Fallback: chain through related groups
      if (!candidate) {
        const fallbackGroups = GroupFallbackChain[slot.architectural_group];
        if (fallbackGroups) {
          for (const fallbackGroup of fallbackGroups) {
            candidate = findExerciseInGroup(fallbackGroup, [ExerciseTier.T1, ExerciseTier.T2, ExerciseTier.T3], user_persona, 'chain_fallback');
            if (candidate) break;
          }
        }
      }

      // 6. Final fallback: Movement-pattern-safe fallback
      // Instead of picking ANY exercise (which could put a chest press in a squat slot),
      // we search for exercises that match the acceptable movement patterns for this group.
      if (!candidate) {
        console.warn(`[v1_architect] All group fallbacks failed for ${slot.architectural_group}. Attempting movement-safe fallback.`);
        candidate = findSafeFallbackExercise(slot.architectural_group, user_persona, 'movement_safe_fallback');
      }

      // 7. Fatal Fail check (with detailed diagnostics)
      if (!candidate) {
        const allowedEquipment = EnvironmentEquipmentWhitelist[user_persona.environment];
        throw new Error(
          `Fatally failed to hydrate slot ${slot.order_index} in day ${day.day_number}. ` +
          `No valid exercises found for group ${slot.architectural_group}. ` +
          `User environment: ${user_persona.environment}, ` +
          `allowed equipment: [${allowedEquipment.join(', ')}], ` +
          `comfort: ${user_persona.comfort}, ` +
          `injuries: [${user_persona.injuries.join(', ')}]. ` +
          `Exercise pool size: ${coreExercises.length}. ` +
          `This is a systemic issue - no exercises match the user's constraints.`
        );
      }

      const exerciseWithTweaks = applySlotTweaks(candidate, slot, user_persona.goal);

      return {
        ...candidate,
        sets: exerciseWithTweaks.sets,
        reps_min: exerciseWithTweaks.reps_min,
        reps_max: exerciseWithTweaks.reps_max,
        target_rpe: slot.target_rpe,
        rest_seconds: exerciseWithTweaks.rest_seconds,
        progression_model: slot.progression_model,
      };
    });

    return {
      day_number: day.day_number,
      day_type: day.day_type,
      exercises: hydratedExercises,
    };
  });

  return {
    family_id,
    template_id: template.external_id,
    user_persona: JSON.stringify(user_persona),
    days: hydratedDays,
  };
}

/**
 * Helper to find and rank an exercise within a group and tiers.
 */
/**
 * Maps unilateral groups to their base bilateral group for exercise lookup.
 */
// Unilateral_Hinge exercises are stored under Primary_Bilateral_Hinge with is_unilateral=true
// (single-leg bridge, 1-arm RDL, etc.), so we remap the slot to that base group.
//
// Unilateral_Squat_Lunge exercises (Bulgarian split squat, lunges, etc.) are stored
// directly under the Unilateral_Squat_Lunge group with their own group key, NOT under
// Primary_Bilateral_Squat. Keeping that entry in this map caused findExerciseInGroup to
// search for Primary_Bilateral_Squat + is_unilateral=true — a combination with zero
// matching exercises — resulting in fatal hydration failures for every template that
// includes a Unilateral_Squat_Lunge slot (tmp_hyp_ul_v1, tmp_hyp_ppl_v1).
const UnilateralGroupMapping: Record<string, { baseGroup: ReplacementGroup; requiresUnilateral: boolean }> = {
  [ReplacementGroup.Unilateral_Hinge]: { baseGroup: ReplacementGroup.Primary_Bilateral_Hinge, requiresUnilateral: true },
  // Unilateral_Squat_Lunge intentionally omitted: exercises live in their own group.
};

/**
 * Fallback chain for when a slot cannot be hydrated with its primary group.
 * Maps groups to alternative groups that can serve as fallback.
 */
const GroupFallbackChain: Record<string, ReplacementGroup[]> = {
  [ReplacementGroup.Unilateral_Hinge]: [
    ReplacementGroup.Primary_Bilateral_Hinge, // Try bilateral hinge exercises
    ReplacementGroup.Unilateral_Squat_Lunge,  // Try unilateral squat as last resort (both lower body)
  ],
  [ReplacementGroup.Unilateral_Squat_Lunge]: [
    ReplacementGroup.Primary_Bilateral_Squat, // Try bilateral squat (both squat pattern)
  ],
  [ReplacementGroup.Primary_Bilateral_Hinge]: [
    ReplacementGroup.Unilateral_Hinge,        // Try unilateral hinge (same pattern)
    ReplacementGroup.Primary_Bilateral_Squat, // Try squat as last resort (both lower body)
  ],
  [ReplacementGroup.Primary_Bilateral_Squat]: [
    ReplacementGroup.Unilateral_Squat_Lunge,  // Try unilateral squat (same pattern family)
  ],
  // Athletic/Power tracks: if a Power_Dynamic_Primer slot can't fill, try Conditioning
  [ReplacementGroup.Power_Dynamic_Primer]: [
    ReplacementGroup.Conditioning_Metabolic_Finisher,
  ],
  // Conditioning: if it can't fill, Power primers are acceptable
  [ReplacementGroup.Conditioning_Metabolic_Finisher]: [
    ReplacementGroup.Power_Dynamic_Primer,
  ],
  // Rotational/anti-rotation: fall back to general anti-extension core
  [ReplacementGroup.Trunk_Rotational_Anti_Rotation]: [
    ReplacementGroup.Trunk_Anti_Extension,
    ReplacementGroup.Trunk_Flexion,
  ],
};

/**
 * Movement pattern requirements for each architectural group.
 * Defines what movement patterns are acceptable when falling back to exercises
 * outside the primary architectural group.
 * 
 * CRITICAL: This prevents semantically broken workouts where a slot gets filled
 * with an exercise that violates the intended movement role (e.g., a chest press
 * in a squat slot, or a core exercise in a hinge slot).
 */
const GroupMovementPatternRequirements: Record<ReplacementGroup, {
  primary: MovementPattern;      // The intended movement pattern
  acceptable: MovementPattern[]; // Acceptable fallback patterns (same muscle group/family)
  bodyRegion: 'lower' | 'upper' | 'core' | 'full'; // For cross-group validation
}> = {
  [ReplacementGroup.Primary_Bilateral_Squat]: {
    primary: MovementPattern.Squat,
    acceptable: [MovementPattern.Squat, MovementPattern.Hinge], // Lower body compound
    bodyRegion: 'lower',
  },
  [ReplacementGroup.Primary_Bilateral_Hinge]: {
    primary: MovementPattern.Hinge,
    acceptable: [MovementPattern.Hinge, MovementPattern.Squat], // Lower body compound
    bodyRegion: 'lower',
  },
  [ReplacementGroup.Unilateral_Squat_Lunge]: {
    primary: MovementPattern.Squat,
    acceptable: [MovementPattern.Squat, MovementPattern.Hinge], // Lower body unilateral
    bodyRegion: 'lower',
  },
  [ReplacementGroup.Unilateral_Hinge]: {
    primary: MovementPattern.Hinge,
    acceptable: [MovementPattern.Hinge, MovementPattern.Squat], // Lower body unilateral
    bodyRegion: 'lower',
  },
  [ReplacementGroup.Primary_Horizontal_Press]: {
    primary: MovementPattern.HPress,
    acceptable: [MovementPattern.HPress, MovementPattern.VPress], // Pressing movements
    bodyRegion: 'upper',
  },
  [ReplacementGroup.Primary_Vertical_Press]: {
    primary: MovementPattern.VPress,
    acceptable: [MovementPattern.VPress, MovementPattern.HPress], // Pressing movements
    bodyRegion: 'upper',
  },
  [ReplacementGroup.Primary_Horizontal_Pull]: {
    primary: MovementPattern.HPull,
    acceptable: [MovementPattern.HPull, MovementPattern.VPull], // Pulling movements
    bodyRegion: 'upper',
  },
  [ReplacementGroup.Primary_Vertical_Pull]: {
    primary: MovementPattern.VPull,
    acceptable: [MovementPattern.VPull, MovementPattern.HPull], // Pulling movements
    bodyRegion: 'upper',
  },
  // Isolation groups - STRICT muscle-specific requirements
  // CRITICAL: Isolation slots must preserve local muscle intent, not just "isolation" archetype
  // Hamstring curl slot → hamstring/posterior chain only (NOT shoulder, NOT chest, NOT quad)
  [ReplacementGroup.Isolation_Hamstring_Curl]: {
    primary: MovementPattern.Iso,
    acceptable: [MovementPattern.Iso, MovementPattern.Hinge], // Hamstring isolation or hinge (posterior chain)
    bodyRegion: 'lower',
  },
  [ReplacementGroup.Isolation_Quad_Extension]: {
    primary: MovementPattern.Iso,
    acceptable: [MovementPattern.Iso, MovementPattern.Squat], // Quad isolation or squat (anterior chain)
    bodyRegion: 'lower',
  },
  [ReplacementGroup.Isolation_Calf_Raise]: {
    primary: MovementPattern.Core,
    acceptable: [MovementPattern.Core, MovementPattern.Iso, MovementPattern.Squat, MovementPattern.Hinge], // Calf or any lower
    bodyRegion: 'lower',
  },
  // Upper body isolation - strict muscle family matching
  [ReplacementGroup.Isolation_Chest_Fly]: {
    primary: MovementPattern.Iso,
    acceptable: [MovementPattern.Iso, MovementPattern.HPress], // Chest isolation or horizontal press
    bodyRegion: 'upper',
  },
  [ReplacementGroup.Isolation_Lateral_Delt]: {
    primary: MovementPattern.Iso,
    acceptable: [MovementPattern.Iso, MovementPattern.VPress], // Delt isolation or vertical press (delt involvement)
    bodyRegion: 'upper',
  },
  [ReplacementGroup.Isolation_Bicep_Flexion]: {
    primary: MovementPattern.Iso,
    acceptable: [MovementPattern.Iso, MovementPattern.HPull], // Bicep isolation or horizontal pull (elbow flexion)
    bodyRegion: 'upper',
  },
  [ReplacementGroup.Isolation_Tricep_Extension]: {
    primary: MovementPattern.Iso,
    acceptable: [MovementPattern.Iso, MovementPattern.HPress, MovementPattern.VPress], // Tricep isolation or press (elbow extension)
    bodyRegion: 'upper',
  },
  [ReplacementGroup.Trunk_Flexion]: {
    primary: MovementPattern.Core,
    acceptable: [MovementPattern.Core], // Core only
    bodyRegion: 'core',
  },
  [ReplacementGroup.Trunk_Anti_Extension]: {
    primary: MovementPattern.Core,
    acceptable: [MovementPattern.Core], // Core only
    bodyRegion: 'core',
  },
  [ReplacementGroup.Conditioning_Metabolic_Finisher]: {
    primary: MovementPattern.Cond,
    acceptable: [MovementPattern.Cond, MovementPattern.Core, MovementPattern.Squat, MovementPattern.Hinge], // Any conditioning
    bodyRegion: 'full',
  },
  [ReplacementGroup.Power_Dynamic_Primer]: {
    primary: MovementPattern.Cond,
    acceptable: [MovementPattern.Cond, MovementPattern.Squat, MovementPattern.Hinge], // Power/plyometric movements
    bodyRegion: 'full',
  },
  [ReplacementGroup.Trunk_Rotational_Anti_Rotation]: {
    primary: MovementPattern.Core,
    acceptable: [MovementPattern.Core], // Core rotational / anti-rotation
    bodyRegion: 'core',
  },
};

/**
 * Muscle family mapping for isolation groups.
 * Ensures isolation slots only fall back to exercises targeting the same muscle group,
 * not just any isolation exercise.
 */
const IsolationMuscleFamilies: Partial<Record<ReplacementGroup, ReplacementGroup[]>> = {
  // Hamstring isolation can only use hamstring/posterior chain exercises
  [ReplacementGroup.Isolation_Hamstring_Curl]: [
    ReplacementGroup.Isolation_Hamstring_Curl,
    ReplacementGroup.Primary_Bilateral_Hinge, // Hinges target posterior chain
  ],
  // Quad isolation can only use quad/anterior chain exercises
  [ReplacementGroup.Isolation_Quad_Extension]: [
    ReplacementGroup.Isolation_Quad_Extension,
    ReplacementGroup.Primary_Bilateral_Squat, // Squats target quads
  ],
  // Calf isolation - STRICT: calf family only
  // Calf raise targets ankle plantarflexion (gastrocnemius/soleus)
  // It must NOT fallback to squat/hinge compounds (different muscle, different function)
  [ReplacementGroup.Isolation_Calf_Raise]: [
    ReplacementGroup.Isolation_Calf_Raise, // Calf exercises only
    // Note: If no calf exercise exists for user's equipment, this will return null
    // and trigger a safe failure rather than creating a semantically broken slot
  ],
  // Shoulder isolation - delts only
  [ReplacementGroup.Isolation_Lateral_Delt]: [
    ReplacementGroup.Isolation_Lateral_Delt,
    ReplacementGroup.Primary_Vertical_Press, // Presses use delts
  ],
  // Chest isolation - chest only
  [ReplacementGroup.Isolation_Chest_Fly]: [
    ReplacementGroup.Isolation_Chest_Fly,
    ReplacementGroup.Primary_Horizontal_Press, // Bench uses chest
  ],
  // Bicep isolation - elbow flexion only
  [ReplacementGroup.Isolation_Bicep_Flexion]: [
    ReplacementGroup.Isolation_Bicep_Flexion,
    ReplacementGroup.Primary_Horizontal_Pull, // Rows use biceps
  ],
  // Tricep isolation - elbow extension only
  [ReplacementGroup.Isolation_Tricep_Extension]: [
    ReplacementGroup.Isolation_Tricep_Extension,
    ReplacementGroup.Primary_Horizontal_Press, // Presses use triceps
    ReplacementGroup.Primary_Vertical_Press,
  ],
};

/**
 * Check if a group is an isolation group that requires muscle-family matching.
 */
function isIsolationGroup(group: ReplacementGroup): boolean {
  return Object.keys(IsolationMuscleFamilies).includes(group);
}

/**
 * Find a safe fallback exercise that matches the movement pattern requirements
 * for the requested architectural group. This prevents semantically broken workouts
 * where a slot gets filled with an inappropriate exercise.
 * 
 * CRITICAL: For isolation groups, this function ensures muscle-family matching.
 * A hamstring curl slot cannot fall back to a delt raise just because both are isolation.
 */
function findSafeFallbackExercise(
  requestedGroup: ReplacementGroup,
  user: { goal: GoalBucket; environment: SessionEnvironment; comfort: LiftComfort; injuries: string[]; experience_level: ExperienceLevel },
  fallbackPath: string
): WorkoutExercise | null {
  const requirements = GroupMovementPatternRequirements[requestedGroup];
  if (!requirements) {
    console.warn(`[v1_architect] No movement pattern requirements defined for ${requestedGroup}. Cannot safely fallback.`);
    return null;
  }

  const allowedEquipment = EnvironmentEquipmentWhitelist[user.environment];
  
  // ISOLATION GROUPS: Enforce muscle-family matching
  // Hamstring slot → hamstring exercises only, NOT delt/chest/bicep
  if (isIsolationGroup(requestedGroup)) {
    const muscleFamily = IsolationMuscleFamilies[requestedGroup];
    if (muscleFamily) {
      // First try: exercises from the same muscle family
      const familyCandidates = coreExercises.filter((ex) => {
        // Must be from an acceptable muscle family group
        if (!muscleFamily.includes(ex.architectural_group as ReplacementGroup)) {
          return false;
        }

        // Must match acceptable movement patterns for the requested group
        if (!requirements.acceptable.includes(ex.movement_pattern)) {
          return false;
        }

        // Equipment filter
        if (!allowedEquipment.includes(ex.equipment_category)) {
          return false;
        }

        // Comfort filter
        if (user.comfort === LiftComfort.NoBarbell || user.comfort === LiftComfort.MachineDB) {
          if (ex.equipment_category === EquipmentCategory.Barbell) {
            return false;
          }
        }

        // Injury filter
        const contra = ex.contraindications || [];
        if (contra.some((tag) => user.injuries.includes(tag))) {
          return false;
        }

        return true;
      });

      if (familyCandidates.length > 0) {
        // Rank by: same group first, then primary pattern, then tier
        const ranked = familyCandidates.sort((a, b) => {
          const aSameGroup = a.architectural_group === requestedGroup ? 1 : 0;
          const bSameGroup = b.architectural_group === requestedGroup ? 1 : 0;
          if (aSameGroup !== bSameGroup) return bSameGroup - aSameGroup;
          
          const aIsPrimary = a.movement_pattern === requirements.primary ? 1 : 0;
          const bIsPrimary = b.movement_pattern === requirements.primary ? 1 : 0;
          if (aIsPrimary !== bIsPrimary) return bIsPrimary - aIsPrimary;
          
          const tierRank = { [ExerciseTier.T1]: 3, [ExerciseTier.T2]: 2, [ExerciseTier.T3]: 1, [ExerciseTier.T4A]: 0, [ExerciseTier.T4B]: 0 };
          return (tierRank[b.tier] || 0) - (tierRank[a.tier] || 0);
        });

        const selected = ranked[0];
        console.log(`[v1_architect] Muscle-family fallback for ${requestedGroup}: ${selected.name} (${selected.movement_pattern}, ${selected.architectural_group}) via ${fallbackPath}`);
        return {
          ...selected,
          sets: 3,
          reps_min: 8,
          reps_max: 12,
          target_rpe: 7,
          rest_seconds: 90,
          progression_model: selected.progression_types?.[0] ?? ProgressionModel.Double_Progression,
          selection_metadata: {
            reason: 'fallback',
            fallback_path: fallbackPath,
            score_breakdown: { tier: 0, seeded_score: 0, heuristic_score: 0, complexity_score: 0 },
          },
        };
      }
      
      console.warn(`[v1_architect] No muscle-family fallback found for ${requestedGroup}. Acceptable families: [${muscleFamily.join(', ')}]`);
      // Fall through to standard fallback (which will likely also fail for isolation)
    }
  }
  
  // STANDARD FALLBACK: Movement pattern matching for compound movements
  const candidates = coreExercises.filter((ex) => {
    // Must match acceptable movement patterns
    if (!requirements.acceptable.includes(ex.movement_pattern)) {
      return false;
    }

    // Equipment filter
    if (!allowedEquipment.includes(ex.equipment_category)) {
      return false;
    }

    // Comfort filter
    if (user.comfort === LiftComfort.NoBarbell || user.comfort === LiftComfort.MachineDB) {
      if (ex.equipment_category === EquipmentCategory.Barbell) {
        return false;
      }
    }

    // Injury filter
    const contra = ex.contraindications || [];
    if (contra.some((tag) => user.injuries.includes(tag))) {
      return false;
    }

    return true;
  });

  if (candidates.length === 0) {
    console.warn(`[v1_architect] No safe fallback found for ${requestedGroup}. Movement patterns: [${requirements.acceptable.join(', ')}]`);
    return null;
  }

  // Prefer exercises with the primary movement pattern, then by tier
  const ranked = candidates.sort((a, b) => {
    const aIsPrimary = a.movement_pattern === requirements.primary ? 1 : 0;
    const bIsPrimary = b.movement_pattern === requirements.primary ? 1 : 0;
    if (aIsPrimary !== bIsPrimary) return bIsPrimary - aIsPrimary;
    
    const tierRank = { [ExerciseTier.T1]: 3, [ExerciseTier.T2]: 2, [ExerciseTier.T3]: 1, [ExerciseTier.T4A]: 0, [ExerciseTier.T4B]: 0 };
    return (tierRank[b.tier] || 0) - (tierRank[a.tier] || 0);
  });

  const selected = ranked[0];
  console.log(`[v1_architect] Safe fallback found for ${requestedGroup}: ${selected.name} (${selected.movement_pattern}) via ${fallbackPath}`);
  return {
    ...selected,
    sets: 3,
    reps_min: 8,
    reps_max: 12,
    target_rpe: 7,
    rest_seconds: 90,
    progression_model: selected.progression_types?.[0] ?? ProgressionModel.Double_Progression,
    selection_metadata: {
      reason: 'fallback',
      fallback_path: fallbackPath,
      score_breakdown: { tier: 0, seeded_score: 0, heuristic_score: 0, complexity_score: 0 },
    },
  };
}

function findExerciseInGroup(
  group: ReplacementGroup,
  tiers: ExerciseTier[],
  user: { goal: GoalBucket; environment: SessionEnvironment; comfort: LiftComfort; injuries: string[]; experience_level: ExperienceLevel },
  fallback_path: string = 'primary_match'
): WorkoutExercise | null {
  // Check if this is a unilateral group that needs special handling
  const unilateralMapping = UnilateralGroupMapping[group];
  const targetGroup = unilateralMapping?.baseGroup ?? group;
  const requireUnilateral = unilateralMapping?.requiresUnilateral ?? false;

  // Hard Filters
  const candidates = coreExercises.filter((ex) => {
    // Group Match
    if (ex.architectural_group !== targetGroup) return false;
    
    // Tier Match (using stringified comparison to handle potential enum identity mismatches)
    const exTierStr = String(ex.tier);
    const requiredTiersStr = tiers.map(t => String(t));
    if (!requiredTiersStr.includes(exTierStr)) {
      return false;
    }

    // Unilateral requirement
    if (requireUnilateral && !ex.is_unilateral) {
      console.log(`[DEBUG]   REJECTED ${ex.name} (${ex.external_id}): Required unilateral, but it is bilateral`);
      return false;
    }

    // Environment Filter
    const allowedEquipment = EnvironmentEquipmentWhitelist[user.environment];
    if (!allowedEquipment.includes(ex.equipment_category)) {
      return false;
    }

    // Comfort Filter
    if (user.comfort === LiftComfort.NoBarbell || user.comfort === LiftComfort.MachineDB) {
      if (ex.equipment_category === EquipmentCategory.Barbell) {
        return false;
      }
    }

    // Injury Filter
    const contra = ex.contraindications || [];
    if (contra.some((tag) => user.injuries.includes(tag))) {
      return false;
    }

    return true;
  });

  if (candidates.length === 0) {
    return null;
  }

  // Ranking
  // 1. Tier (ASC: T1 > T2 > T3)
  // 2. Seeded Compatibility Score (DESC)
  // 3. Heuristic Score (DESC)
  // 4. Setup Complexity (ASC: Low > Mid > High)

  const ranked = candidates.map((ex) => {
    const tierScore = getTierWeight(ex.tier); // T1: 0, T2: 1, T3: 2 (for sorting ASC)
    const seededScore = getSeededScore(ex.external_id); // Default 0
    const heuristicScore = calculateHeuristicScore(ex, user);
    const complexityScore = getComplexityWeight(ex.setup_complexity); // Low: 0, Medium: 1, High: 2 (for sorting ASC)

    return {
      ex,
      score_breakdown: {
        tier: tierScore,
        seeded_score: seededScore,
        heuristic_score: heuristicScore,
        complexity_score: complexityScore,
      },
    };
  }).sort((a, b) => {
    // Tier (Primary Sort - ASC)
    if (a.score_breakdown.tier !== b.score_breakdown.tier) {
      return a.score_breakdown.tier - b.score_breakdown.tier;
    }
    // Seeded Compatibility (Secondary Sort - DESC)
    if (a.score_breakdown.seeded_score !== b.score_breakdown.seeded_score) {
      return b.score_breakdown.seeded_score - a.score_breakdown.seeded_score;
    }
    // Heuristic (Tertiary Sort - DESC)
    if (a.score_breakdown.heuristic_score !== b.score_breakdown.heuristic_score) {
      return b.score_breakdown.heuristic_score - a.score_breakdown.heuristic_score;
    }
    // Complexity (Final Tie-breaker - ASC)
    return a.score_breakdown.complexity_score - b.score_breakdown.complexity_score;
  });

  const best = ranked[0];

  // Map back to WorkoutExercise
  const selection_metadata = {
    reason: best.score_breakdown.seeded_score > 0 ? 'seeded_compatibility_match' : 'heuristic_match',
    fallback_path,
    score_breakdown: best.score_breakdown,
  };

  return {
    ...best.ex,
    selection_metadata,
  } as any;
}

/**
 * Applies conservative, slot-aware tweaks to exercise parameters.
 * Ensures templates don't drift too far while providing goal specialization.
 */
function applySlotTweaks(
  exercise: Exercise,
  slot: any,
  goal: GoalBucket
): { sets: number; reps_min: number; reps_max: number; rest_seconds: number } {
  let { sets, reps_min, reps_max, rest_seconds } = slot;

  switch (goal) {
    case GoalBucket.Strength:
      // Primary/Secondary lifts get significantly longer rest and tighter rep ranges
      if (slot.archetype === SlotArchetype.PrimeCompound || slot.archetype === SlotArchetype.SecondaryCompound) {
        rest_seconds = Math.min(240, rest_seconds + 30);
        reps_max = Math.min(reps_max, 6);
      }
      break;

    case GoalBucket.FatLoss:
      // Preserve performance on Prime, shorten rest/increase reps on accessories
      if (slot.archetype === SlotArchetype.Isolation || slot.archetype === SlotArchetype.Finisher) {
        rest_seconds = Math.max(45, rest_seconds - 30);
        reps_min += 2;
        reps_max += 2;
      } else if (slot.archetype === SlotArchetype.SecondaryCompound) {
        rest_seconds = Math.max(60, rest_seconds - 15);
        reps_min += 1;
      }
      break;

    case GoalBucket.Recomp:
      // Conservative: only increase volume on isolation/secondary if template is very low volume
      if (slot.archetype === SlotArchetype.Isolation || slot.archetype === SlotArchetype.SecondaryCompound) {
        if (sets < 3) sets += 1;
        reps_min += 1;
      }
      break;

    case GoalBucket.GenFitness:
      // Keep things easy to follow: cap sets on non-prime, moderate rests
      if (slot.archetype !== SlotArchetype.PrimeCompound) {
        sets = Math.min(3, sets);
        rest_seconds = Math.max(60, rest_seconds - 15);
      } else {
        // Even for prime, give a bit more rest to avoid crushing the user
        rest_seconds += 15;
      }
      break;
  }

  // Defensive: ensure reps_max never falls below reps_min after goal-based tweaks
  if (reps_max < reps_min) {
    reps_max = reps_min;
  }

  return { sets, reps_min, reps_max, rest_seconds };
}

export function getTierWeight(tier: ExerciseTier): number {
  switch (tier) {
    case ExerciseTier.T1: return 0;
    case ExerciseTier.T2: return 1;
    case ExerciseTier.T3: return 2;
    default: return 99; // T4 etc are excluded anyway
  }
}

export function getComplexityWeight(comp: string): number {
  switch (comp) {
    case 'Low': return 0;
    case 'Medium': return 1;
    case 'High': return 2;
    default: return 0;
  }
}

export function getSeededScore(id: string, original_id?: string): number {
  const sub = coreSubstitutions.find(s => 
    s.alternative_external_id === id && 
    (!original_id || s.original_external_id === original_id)
  );
  return sub ? sub.compatibility_score : 0;
}

/**
 * Heuristic scoring logic based on user goal and experience.
 */
export function calculateHeuristicScore(ex: Exercise, user: { goal: GoalBucket, experience_level: ExperienceLevel }): number {
  let score = 50; // Neutral base
  const goal = user.goal;

  switch (goal) {
    case GoalBucket.Strength:
      // Favors heavy compounds + stability
      if (ex.fatigue_cost === 'High' && ex.equipment_category === EquipmentCategory.Barbell) score += 25;
      if (ex.equipment_category === EquipmentCategory.Machine && ex.tier === ExerciseTier.T3) score += 10;
      break;

    case GoalBucket.Hypertrophy:
      // Favors High Stimulus-to-Fatigue Ratio (SFR)
      if (ex.equipment_category === EquipmentCategory.Machine || ex.equipment_category === EquipmentCategory.Cable) {
        if (ex.tier === ExerciseTier.T2 || ex.tier === ExerciseTier.T3) score += 20;
      }
      // Slightly deprioritize high-fatigue barbells for HYPERTOPHY specifically, 
      // but keep them viable to avoid "infantilizing" the plan.
      if (ex.equipment_category === EquipmentCategory.Barbell) {
        score -= 10;
      }
      if (ex.setup_complexity === 'High') score -= 15;
      break;

    case GoalBucket.GenFitness:
      // High priority on low complexity and predictable movements
      if (ex.setup_complexity === 'Low') score += 25;
      if (ex.fatigue_cost === 'Low' || ex.fatigue_cost === 'Medium') score += 15;
      
      // Complexity penalty is scaled by experience:
      // Beginners are strongly steered away, Advanced users are merely nudged.
      if (ex.setup_complexity === 'High') {
        const penalty = (user.experience_level === ExperienceLevel.Advanced) ? 20 : 50;
        score -= penalty;
      }
      break;

    case GoalBucket.Recomp:
      // Moderated variant: favors machines for stability/preservation
      if (ex.equipment_category === EquipmentCategory.Machine) score += 15;
      if (ex.fatigue_cost === 'Medium') score += 10; 
      if (ex.setup_complexity === 'High') score -= 20;
      break;

    case GoalBucket.FatLoss:
      // Prefers movements that are easy to jump into (Low Complexity)
      if (ex.setup_complexity === 'Low') score += 15;
      if (ex.fatigue_cost === 'Medium') score += 15;
      break;
  }

  return score;
}
