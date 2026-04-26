import { 
  ReplacementGroup, 
  ExerciseTier, 
  SlotArchetype,
  EquipmentCategory,
  SetupComplexity,
  ContraindicationTag,
} from '../../types/v1_engine';
import { isExerciseAllowed, V1UserValidationProfile } from './v1_validator';

/**
 * Exercise data structure for the Mechanic.
 */
export interface V1ExerciseData {
  id: string;
  name: string;
  movementPattern: any;
  architecturalGroup: ReplacementGroup;
  equipmentCategory: EquipmentCategory;
  setupComplexity: SetupComplexity;
  contraindications: ContraindicationTag[];
  tier: ExerciseTier;
}

/**
 * Slot data structure from a Template.
 */
export interface V1TemplateSlotData {
  id: string;
  architecturalGroup: ReplacementGroup;
  archetype: SlotArchetype;
}

/**
 * Maps SlotArchetype to a preferred ExerciseTier.
 * PrimeCompound -> T1
 * SecondaryCompound -> T2
 * Isolation -> T3
 * Finisher -> T3
 */
const ARCHETYPE_TIER_MAP: Record<SlotArchetype, ExerciseTier> = {
  [SlotArchetype.PrimeCompound]: ExerciseTier.T1,
  [SlotArchetype.SecondaryCompound]: ExerciseTier.T2,
  [SlotArchetype.Isolation]: ExerciseTier.T3,
  [SlotArchetype.Finisher]: ExerciseTier.T3,
};

/**
 * Resolves a TemplateSlot into a specific Exercise from the pool.
 */
export function resolveTemplateSlot(
  slot: V1TemplateSlotData,
  profile: V1UserValidationProfile,
  exercisePool: V1ExerciseData[]
): V1ExerciseData | null {
  // 1. Initial Filtering (Group Match)
  const candidates = exercisePool.filter(ex => ex.architecturalGroup === slot.architecturalGroup);
  
  if (candidates.length === 0) {
    return null;
  }

  // 2. Structural Filtering (Legal Validation)
  const legalCandidates = candidates.filter(ex => isExerciseAllowed(ex, profile));

  if (legalCandidates.length === 0) {
    return null;
  }

  // 3. Ranking and Selection (Best Fit)
  const targetTier = ARCHETYPE_TIER_MAP[slot.archetype] || ExerciseTier.T2;

  const ranked = legalCandidates.sort((a, b) => {
    // Priority 1: Exact Tier match
    const aTierWeight = a.tier === targetTier ? 10 : 0;
    const bTierWeight = b.tier === targetTier ? 10 : 0;
    
    if (aTierWeight !== bTierWeight) {
      return bTierWeight - aTierWeight;
    }

    // Priority 2: Closest Tier (if exact match not found)
    const tierRanks: Record<string, number> = {
      [ExerciseTier.T1]: 5,
      [ExerciseTier.T2]: 4,
      [ExerciseTier.T3]: 3,
      [ExerciseTier.T4A]: 2,
      [ExerciseTier.T4B]: 1,
    };
    
    const aTierRank = tierRanks[a.tier] || 0;
    const bTierRank = tierRanks[b.tier] || 0;
    
    if (aTierRank !== bTierRank) {
      return bTierRank - aTierRank;
    }

    // Priority 3: Deterministic Stability (Sort by ID)
    return a.id.localeCompare(b.id);
  });

  return ranked[0];
}

