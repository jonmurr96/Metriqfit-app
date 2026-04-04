import { 
  EquipmentCategory, 
  SessionEnvironment, 
  LiftComfort, 
  SetupComplexity,
  ContraindicationTag
} from '../../types/v1_engine';

/**
 * V1 Validator interface for exercises.
 * We pass raw data objects here to avoid WatermelonDB Model dependencies 
 * during the core logic execution (making it easier to test).
 */
export interface V1ExerciseValidationInput {
  equipmentCategory: EquipmentCategory;
  setupComplexity: SetupComplexity;
  contraindications: ContraindicationTag[];
}

export interface V1UserValidationProfile {
  environment: SessionEnvironment;
  liftComfort: LiftComfort;
  contraindications: ContraindicationTag[];
}

/**
 * Validates if an exercise is "legal" for a specific user profile.
 */
export function isExerciseAllowed(
  exercise: V1ExerciseValidationInput,
  profile: V1UserValidationProfile
): boolean {
  // 1. Equipment Check (Hardest Constraint)
  if (!validateEquipment(exercise.equipmentCategory, profile.environment)) {
    return false;
  }

  // 2. Lift Comfort Check (Technical Proficiency)
  if (!validateComfort(exercise.equipmentCategory, profile.liftComfort)) {
    return false;
  }

  // 3. Safety Check (Contraindications)
  if (!validateSafety(exercise.contraindications, profile.contraindications)) {
    return false;
  }

  return true;
}

/**
 * Maps environment to allowed equipment categories.
 */
function validateEquipment(
  category: EquipmentCategory,
  env: SessionEnvironment
): boolean {
  switch (env) {
    case SessionEnvironment.Commercial:
      return true; // All gear available
      
    case SessionEnvironment.AptHotel:
      // Typically no barbells or heavy machines, but has DBs and Cables
      return [
        EquipmentCategory.DB, 
        EquipmentCategory.Cable, 
        EquipmentCategory.BW, 
        EquipmentCategory.Misc
      ].includes(category);

    case SessionEnvironment.Home:
      // Typical home gym: DBs and Bodyweight
      return [
        EquipmentCategory.DB, 
        EquipmentCategory.BW, 
        EquipmentCategory.Misc
      ].includes(category);

    case SessionEnvironment.Bodyweight:
      return [
        EquipmentCategory.BW, 
        EquipmentCategory.Misc
      ].includes(category);

    default:
      return category === EquipmentCategory.BW;
  }
}

/**
 * Validates if the user's technical comfort allows the exercise's equipment.
 */
function validateComfort(
  category: EquipmentCategory,
  comfort: LiftComfort
): boolean {
  // If user explicitly avoids barbells or prefers machines/DBs
  if (comfort === LiftComfort.NoBarbell || comfort === LiftComfort.MachineDB) {
    if (category === EquipmentCategory.Barbell) {
      return false;
    }
  }

  return true;
}

/**
 * Ensures exercise doesn't conflict with user contraindications.
 */
function validateSafety(
  exerciseContra: ContraindicationTag[],
  userContra: ContraindicationTag[]
): boolean {
  if (!exerciseContra || exerciseContra.length === 0) return true;
  if (!userContra || userContra.length === 0) return true;

  // If any exercise contraindication is in the user's list, block it.
  return !exerciseContra.some(tag => userContra.includes(tag));
}
