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
    const heuristicScore = calculateHeuristicScore(ex, user.goal);
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

/**
 * Logic to decide if progression should carry over.
 */
export function evaluateContinuity(oldEx: Exercise, newEx: Exercise): ContinuityMethod {
  // 1. High Confidence Match (Same Pattern + Same Equipment Group)
  // For V1.1, we use 'Modified' even for direct matches to be 'honest' about 
  // not yet merging full history, while still prepopulating set weights.
  if (oldEx.architectural_group === newEx.architectural_group && 
      oldEx.movement_pattern === newEx.movement_pattern &&
      oldEx.equipment_category === newEx.equipment_category) {
    return ContinuityMethod.Modified;
  }

  // 2. Same Pattern, but major equipment switch (e.g. Barbell -> DB/Cable) = Modified
  if (oldEx.movement_pattern === newEx.movement_pattern) {
    // If it's still in the same broad architectural group (e.g. BB Bench -> DB Bench), we can carry over with adjustments.
    if (oldEx.architectural_group === newEx.architectural_group) {
        return ContinuityMethod.Modified;
    }
  }

  // 3. Different Pattern OR major functional skip (e.g. Bilateral -> Unilateral) = Reset
  return ContinuityMethod.Reset;
}

/**
 * Maps reliability score to user-facing trust labels.
 */
function generateMatchLabel(score: number, continuity: ContinuityMethod): string {
  if (score >= 90 && continuity === ContinuityMethod.Modified) return 'Coach Match';
  if (score >= 75) return 'Strong Fit';
  if (score >= 60) return 'Good Alternative';
  return 'Alternate';
}

/**
 * Generates human-readable "Benefits" based on exercise attributes.
 */
function generateBenefitTag(ex: Exercise, originalEx: Exercise): string {
  const reasons: string[] = [];

  if (ex.equipment_category === EquipmentCategory.Machine) reasons.push('More stable');
  if (ex.setup_complexity === 'Low' && originalEx.setup_complexity !== 'Low') reasons.push('Easier setup');
  
  const exContra = ex.contraindications || [];
  const origContra = originalEx.contraindications || [];

  if (!exContra.includes('lower_back_shearing' as any) && 
      origContra.includes('lower_back_shearing' as any)) {
    reasons.push('Lower back friendly');
  }
  if (ex.is_unilateral && !originalEx.is_unilateral) reasons.push('Focus on imbalances');

  return reasons.length > 0 ? reasons[0] : 'Solid alternative';
}

function calculateReliability(seeded: number, heuristic: number): number {
  if (seeded > 0) return seeded;
  // If no seeded score, use heuristic scaled to 0-80 range (since it's not verified compatibility)
  return Math.min(80, (heuristic / 100) * 80);
}
