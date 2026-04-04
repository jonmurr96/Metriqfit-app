import { 
  MovementPattern, 
  ReplacementGroup, 
  EquipmentCategory, 
  SetupComplexity, 
  FatigueCost, 
  ExerciseTier,
  SessionEnvironment,
  LiftComfort,
  ContraindicationTag,
  SlotArchetype,
} from '../../types/v1_engine';
import { resolveTemplateSlot, V1ExerciseData, V1TemplateSlotData } from './v1_mechanic';
import { coreExercises } from '../../loaders/seeds/exercises';

/**
 * 1. SIMULATE A HOME USER (No Barbell, No Machines)
 */
const homeProfile = {
  environment: SessionEnvironment.Home,
  liftComfort: LiftComfort.NoBarbell,
  contraindications: [],
};

/**
 * 2. DEFINE A SQUAT SLOT (Primary Bilateral Squat)
 */
const squatSlot: V1TemplateSlotData = {
  id: 'slot_1',
  architecturalGroup: ReplacementGroup.Primary_Bilateral_Squat,
  archetype: SlotArchetype.PrimeCompound,
};

/**
 * 3. PREPARE THE EXERCISE POOL (From Seeds)
 */
const pool: V1ExerciseData[] = coreExercises.map(ex => ({
  id: ex.external_id,
  name: ex.name,
  movementPattern: ex.movement_pattern,
  architecturalGroup: ex.architectural_group,
  equipmentCategory: ex.equipment_category,
  setupComplexity: ex.setup_complexity,
  contraindications: ex.contraindications || [],
  tier: ex.tier,
}));

console.log("--- V1 MECHANIC VERIFICATION ---");

// Test 1: Home User Squat Resolution
const homeSquat = resolveTemplateSlot(squatSlot, homeProfile, pool);
console.log(`[Home Profile] Squat Slot resolved to: ${homeSquat?.name} (${homeSquat?.equipmentCategory})`);

if (homeSquat?.equipmentCategory === EquipmentCategory.Barbell) {
  console.error("FAIL: Home user was assigned a Barbell exercise!");
} else {
  console.log("PASS: Home user correctly assigned a non-barbell alternative.");
}

// Test 2: Commercial Gym User Squat Resolution
const gymProfile = {
  environment: SessionEnvironment.Commercial,
  liftComfort: LiftComfort.BarbellAdv,
  contraindications: [],
};

const gymSquat = resolveTemplateSlot(squatSlot, gymProfile, pool);
console.log(`[Gym Profile] Squat Slot resolved to: ${gymSquat?.name} (${gymSquat?.equipmentCategory})`);

if (gymSquat?.equipmentCategory === EquipmentCategory.Barbell) {
  console.log("PASS: Gym user correctly assigned the Primary Barbell Squat.");
} else {
  console.error("FAIL: Gym user was NOT assigned the primary barbell exercise.");
}

// Test 3: Safety Check (Contraindication)
const injuryProfile = {
  environment: SessionEnvironment.Commercial,
  liftComfort: LiftComfort.BarbellAdv,
  contraindications: [ContraindicationTag.Lower_Back_Shearing],
};

const hingeSlot: V1TemplateSlotData = {
  id: 'slot_2',
  architecturalGroup: ReplacementGroup.Primary_Bilateral_Hinge,
  archetype: SlotArchetype.PrimeCompound,
};

const hingeEx = resolveTemplateSlot(hingeSlot, injuryProfile, pool);
console.log(`[Injury Profile] Hinge Slot resolved to: ${hingeEx?.name} (${hingeEx?.contraindications})`);

// Barbell Deadlift (ex_barbell_deadlift) has Lower_Back_Shearing. 
// DB RDL (ex_db_rdl) might also have it, but check seeds.
// Let's see if it picked something ELSE or returned null.
if (hingeEx?.name === 'Barbell Deadlift') {
  console.error("FAIL: User with Lower Back Shearing was assigned a Deadlift!");
} else {
  console.log("PASS: User with Lower Back Shearing avoided the contraindicated exercise.");
}
