import {
  EquipmentCategory,
  Exercise,
  ExerciseTier,
  GoalBucket,
  ReplacementGroup,
  SessionEnvironment,
  WorkoutDay,
  WorkoutExercise,
  WorkoutPlan,
  PlanTemplate,
  LiftComfort,
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
  }
): WorkoutPlan {
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

      // 5. Fatal Fail check
      if (!candidate) {
        throw new Error(`Fatally failed to hydrate slot ${slot.order_index} in day ${day.day_number}. No valid exercises found for group ${slot.architectural_group}.`);
      }

      return {
        ...candidate,
        sets: slot.sets,
        reps_min: slot.reps_min,
        reps_max: slot.reps_max,
        target_rpe: slot.target_rpe,
        rest_seconds: slot.rest_seconds,
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
const UnilateralGroupMapping: Record<string, { baseGroup: ReplacementGroup; requiresUnilateral: boolean }> = {
  [ReplacementGroup.Unilateral_Hinge]: { baseGroup: ReplacementGroup.Primary_Bilateral_Hinge, requiresUnilateral: true },
  [ReplacementGroup.Unilateral_Squat_Lunge]: { baseGroup: ReplacementGroup.Primary_Bilateral_Squat, requiresUnilateral: true },
};

function findExerciseInGroup(
  group: ReplacementGroup,
  tiers: ExerciseTier[],
  user: { goal: GoalBucket; environment: SessionEnvironment; comfort: LiftComfort; injuries: string[] },
  fallback_path: string = 'primary_match'
): WorkoutExercise | null {
  // Check if this is a unilateral group that needs special handling
  const unilateralMapping = UnilateralGroupMapping[group];
  const targetGroup = unilateralMapping?.baseGroup ?? group;
  const requireUnilateral = unilateralMapping?.requiresUnilateral ?? false;

  // Hard Filters
  const candidates = coreExercises.filter((ex) => {
    // Group & Tier Match
    // For unilateral groups, match the base group (e.g., Primary_Bilateral_Hinge) 
    // and check is_unilateral flag separately
    if (ex.architectural_group !== targetGroup) return false;
    
    // For unilateral groups, require is_unilateral = true
    if (requireUnilateral && !ex.is_unilateral) return false;
    
    if (!tiers.includes(ex.tier)) return false;

    // Environment Filter (Hard Whitelist)
    const allowedEquipment = EnvironmentEquipmentWhitelist[user.environment];
    if (!allowedEquipment.includes(ex.equipment_category)) return false;

    // Comfort Filter (Hard Exclusion)
    if (user.comfort === LiftComfort.NoBarbell || user.comfort === LiftComfort.MachineDB) {
      if (ex.equipment_category === EquipmentCategory.Barbell) return false;
    }

    // Injury Filter (Hard Contraindication Check)
    const contra = ex.contraindications || [];
    if (contra.some((tag) => user.injuries.includes(tag))) return false;

    return true;
  });

  if (candidates.length === 0) return null;

  // Ranking
  // 1. Tier (ASC: T1 > T2 > T3)
  // 2. Seeded Compatibility Score (DESC)
  // 3. Heuristic Score (DESC)
  // 4. Setup Complexity (ASC: Low > Mid > High)

  const ranked = candidates.map((ex) => {
    const tierScore = getTierWeight(ex.tier); // T1: 0, T2: 1, T3: 2 (for sorting ASC)
    const seededScore = getSeededScore(ex.external_id); // Default 0
    const heuristicScore = calculateHeuristicScore(ex, user.goal);
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
 * Heuristic scoring logic based on user goal.
 */
export function calculateHeuristicScore(ex: any, goal: GoalBucket): number {
  let score = 50; // Neutral base

  switch (goal) {
    case GoalBucket.Strength:
      // Strength prefers high fatigue cost (heavy) and specific patterns
      if (ex.fatigue_cost === 'High') score += 20;
      if (ex.equipment_category === EquipmentCategory.Barbell) score += 15;
      break;
    case GoalBucket.Hypertrophy:
      // Hypertrophy prefers medium/high fatigue and machine volume
      if (ex.fatigue_cost === 'Medium' || ex.fatigue_cost === 'High') score += 15;
      if (ex.equipment_category === EquipmentCategory.Machine) score += 10;
      break;
    case GoalBucket.GenFitness:
    case GoalBucket.FatLoss:
      // GenFit prefers low complexity and lower fatigue cost
      if (ex.setup_complexity === 'Low') score += 20;
      if (ex.fatigue_cost === 'Low' || ex.fatigue_cost === 'Medium') score += 15;
      break;
  }

  return score;
}
