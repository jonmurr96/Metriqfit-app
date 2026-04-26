import {
  EquipmentCategory,
  Exercise,
  ExerciseTier,
  GoalBucket,
  ReplacementGroup,
  SessionEnvironment,
  SwapAlternative,
  ContinuityMethod,
  LiftComfort,
  ExperienceLevel,
} from '../../types/v1_engine';
import { coreExercises } from '../../loaders/seeds/exercises';
import { secondaryGroupFallbacks } from '../../loaders/seeds/substitutions';
import {
  EnvironmentEquipmentWhitelist,
  getTierWeight,
  getComplexityWeight,
  calculateHeuristicScore,
  getSeededScore,
} from './v1_architect';

/**
 * V1 User Swap Engine
 * Responsible for generating 3-6 ranked alternatives for a user-initiated exercise swap.
 */
export function getSwapAlternatives(
  originalEx: Exercise,
  user: {
    goal: GoalBucket;
    environment: SessionEnvironment;
    comfort: LiftComfort;
    injuries: string[];
    experience_level: ExperienceLevel;
  }
): SwapAlternative[] {
  // 1. Determine Search Groups
  const primaryGroup = originalEx.architectural_group;
  const secondaryGroup = secondaryGroupFallbacks[primaryGroup];
  const searchGroups = [primaryGroup];
  if (secondaryGroup) searchGroups.push(secondaryGroup);

  // 2. Scan and Filter Candidates
  const candidates = coreExercises.filter((ex) => {
    // Basic Exclusions
    if (ex.external_id === originalEx.external_id) return false;
    if (!searchGroups.includes(ex.architectural_group)) return false;
    
    // Tier Guardrail (Block T4)
    if (ex.tier.startsWith('T4')) return false;

    // Environment Filter
    const allowedEquipment = EnvironmentEquipmentWhitelist[user.environment];
    if (!allowedEquipment.includes(ex.equipment_category)) return false;

    // Comfort Filter
    if (user.comfort === LiftComfort.NoBarbell || user.comfort === LiftComfort.MachineDB) {
      if (ex.equipment_category === EquipmentCategory.Barbell) return false;
    }

    // Injury Filter
    const contra = ex.contraindications || [];
    if (contra.some((tag) => user.injuries.includes(tag))) return false;

    return true;
  });

  // 3. Rank Candidates
  const ranked = candidates.map((ex) => {
    const tierScore = getTierWeight(ex.tier);
    const seededScore = getSeededScore(ex.external_id, originalEx.external_id);
    const heuristicScore = calculateHeuristicScore(ex, user);
    const complexityScore = getComplexityWeight(ex.setup_complexity);

    return {
      ex,
      tierScore,
      seededScore,
      heuristicScore,
      complexityScore,
    };
  }).sort((a, b) => {
    // Same priority as Architect but focus on Seeded Compatibility first for Swaps
    if (a.tierScore !== b.tierScore) return a.tierScore - b.tierScore;
    if (a.seededScore !== b.seededScore) return b.seededScore - a.seededScore;
    if (a.heuristicScore !== b.heuristicScore) return b.heuristicScore - a.heuristicScore;
    return a.complexityScore - b.complexityScore;
  });

  // 4. Transform to UI Payload (Top 6)
  return ranked.slice(0, 6).map((r) => {
    const reliability = calculateReliability(r.seededScore, r.heuristicScore);
    const continuity = evaluateContinuity(originalEx, r.ex as Exercise);

    return {
      exercise: r.ex as Exercise,
      benefit_tag: generateBenefitTag(r.ex as Exercise, originalEx),
      reliability_score: reliability,
      match_label: generateMatchLabel(reliability, continuity),
      continuity_recommendation: continuity,
    };
  });
}

export function evaluateContinuity(oldEx: Exercise, newEx: Exercise): ContinuityMethod {
  // 1. Direct Identity (Continue)
  if (oldEx.external_id === newEx.external_id) return ContinuityMethod.Continue;

  // 2. High Stability / Near Identity (Modified Progress)
  // Must be same movement pattern AND same bilateral/unilateral profile
  const samePattern = oldEx.movement_pattern === newEx.movement_pattern;
  const sameUnilateral = oldEx.is_unilateral === newEx.is_unilateral;
  const sameGroup = oldEx.architectural_group === newEx.architectural_group;
  
  if (samePattern && sameUnilateral) {
    // Same group + pattern + unilateral = Strong Modified Carryover
    // e.g. Back Squat -> Front Squat
    if (sameGroup) return ContinuityMethod.Modified;

    // Different group but same pattern/unilateral + similar equipment = Modified
    // e.g. Leg Press (Machine) -> Hack Squat (Machine)
    if (oldEx.equipment_category === newEx.equipment_category) return ContinuityMethod.Modified;

    // Barbell to DB/Cable = Reset (usually too much instability difference)
    if (oldEx.equipment_category === EquipmentCategory.Barbell && 
        newEx.equipment_category !== EquipmentCategory.Barbell) {
      return ContinuityMethod.Reset;
    }

    // Default to Modified for same pattern/unilateral if not a major equipment jump
    return ContinuityMethod.Modified;
  }

  // 3. Pattern Jump OR Functional Jump (e.g. Squat -> Lunge) = Reset
  return ContinuityMethod.Reset;
}

/**
 * Maps reliability score to user-facing trust labels.
 */
function generateMatchLabel(score: number, continuity: ContinuityMethod): string {
  if (score >= 90) return 'Coach Match';
  if (score >= 70 && continuity === ContinuityMethod.Modified) return 'Near Identical';
  if (continuity === ContinuityMethod.Modified) return 'Modified Progress';
  return 'Good Alternative';
}

/**
 * Generates human-readable "Benefits" based on exercise attributes.
 */
function generateBenefitTag(ex: Exercise, originalEx: Exercise): string {
  const reasons: string[] = [];

  // Equipment specific
  if (ex.equipment_category === EquipmentCategory.Machine) reasons.push('More stable');
  if (ex.equipment_category === EquipmentCategory.DB) reasons.push('Individual track');
  if (ex.equipment_category !== EquipmentCategory.Barbell && originalEx.equipment_category === EquipmentCategory.Barbell) {
      reasons.push('No barbell');
  }

  // Setup/Ease
  if (ex.setup_complexity === 'Low' && originalEx.setup_complexity !== 'Low') reasons.push('Easier setup');
  
  // Biomechanics
  const exPattern = ex.movement_pattern;
  const origPattern = originalEx.movement_pattern;
  if (exPattern === origPattern) {
      reasons.push('Same pattern');
  }

  const exContra = ex.contraindications || [];
  const origContra = originalEx.contraindications || [];

  if (!exContra.includes('lower_back_shearing' as any) && 
      origContra.includes('lower_back_shearing' as any)) {
    reasons.push('Lower back friendly');
  }
  
  if (!exContra.includes('shoulder_impingement' as any) && 
      origContra.includes('shoulder_impingement' as any)) {
    reasons.push('Shoulder friendly');
  }

  if (ex.is_unilateral && !originalEx.is_unilateral) reasons.push('Joint friendly');

  return reasons.length > 0 ? reasons[0] : 'Similar training effect';
}

function calculateReliability(seeded: number, heuristic: number): number {
  if (seeded > 0) return seeded;
  // If no seeded score, use heuristic scaled to 0-80 range (since it's not verified compatibility)
  return Math.min(80, (heuristic / 100) * 80);
}
