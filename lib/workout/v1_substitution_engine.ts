import { 
  EquipmentCategory, 
  ExerciseTier,
  ReplacementGroup,
} from '../../types/v1_engine';
import { isExerciseAllowed, V1UserValidationProfile } from './v1_validator';
import { V1ExerciseData } from './v1_mechanic';

/**
 * Finds all legal alternatives for a given exercise based on the user's profile.
 */
export function getLegalAlternatives(
  currentExercise: V1ExerciseData,
  profile: V1UserValidationProfile,
  exercisePool: V1ExerciseData[]
): V1ExerciseData[] {
  // 1. Filter by architectural group (must be in the same replacement bucket)
  const candidates = exercisePool.filter(ex => 
    ex.architecturalGroup === currentExercise.architecturalGroup &&
    ex.id !== currentExercise.id
  );

  // 2. Filter by legality (environment, comfort, safety)
  const legalCandidates = candidates.filter(ex => isExerciseAllowed(ex, profile));

  // 3. Rank by "Distance" from original exercise
  return rankAlternatives(currentExercise, legalCandidates);
}

/**
 * Ranks alternatives to present the "best" choices first.
 */
function rankAlternatives(
  original: V1ExerciseData,
  candidates: V1ExerciseData[]
): V1ExerciseData[] {
  return candidates.sort((a, b) => {
    // Priority 1: Tier match
    const aTierWeight = a.tier === original.tier ? 10 : 0;
    const bTierWeight = b.tier === original.tier ? 10 : 0;
    
    if (aTierWeight !== bTierWeight) {
      return bTierWeight - aTierWeight;
    }

    // Priority 2: Equipment Similarity
    // If you are swapping a DB exercise, you likely want another DB exercise.
    const aEqMatch = a.equipmentCategory === original.equipmentCategory ? 5 : 0;
    const bEqMatch = b.equipmentCategory === original.equipmentCategory ? 5 : 0;
    
    if (aEqMatch !== bEqMatch) {
      return bEqMatch - aEqMatch;
    }

    // Priority 3: Common Sense Equipment Swaps
    // If switching from Barbell, prefer Dumbbells over Machines (usually).
    const eqRanks: Record<EquipmentCategory, number> = {
      [EquipmentCategory.Barbell]: 5,
      [EquipmentCategory.DB]: 4,
      [EquipmentCategory.Cable]: 3,
      [EquipmentCategory.Machine]: 2,
      [EquipmentCategory.BW]: 1,
      [EquipmentCategory.Misc]: 0,
    };

    const aEqRank = eqRanks[a.equipmentCategory] || 0;
    const bEqRank = eqRanks[b.equipmentCategory] || 0;

    if (aEqRank !== bEqRank) {
      return bEqRank - aEqRank;
    }

    // Stabilizer
    return a.id.localeCompare(b.id);
  });
}
