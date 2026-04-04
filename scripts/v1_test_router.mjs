// Self-contained V1 Librarian Router Test (.mjs)
// Includes logic from lib/workout/v1_librarian_router.ts and types/v1_engine.ts

const ExperienceLevel = { Beginner: 'Beginner', Intermediate: 'Intermediate', Advanced: 'Advanced' };
const GoalBucket = { Hypertrophy: 'Hypertrophy', FatLoss: 'FatLoss', Strength: 'Strength', GenFitness: 'GenFitness', Recomp: 'Recomp', Athletic: 'Athletic' };
const TrainingStyle = { FullBody: 'FullBody', UpperLower: 'UpperLower', PPL: 'PPL', BroSplit: 'BroSplit', Auto: 'Auto' };
const LiftComfort = { BarbellAdv: 'BarbellAdv', BarbellBasic: 'BarbellBasic', MachineDB: 'MachineDB', NoBarbell: 'NoBarbell' };
const SessionEnvironment = { Commercial: 'Commercial', AptHotel: 'AptHotel', Home: 'Home', Bodyweight: 'Bodyweight' };

const routeUserToPlan = (profile) => {
  const { experienceLevel, primaryGoal, daysPerWeek, liftComfort, environment } = profile;

  // 1. Environment Hard Overrides
  // Bodyweight is the absolute constraint
  if (environment === SessionEnvironment.Bodyweight) {
    return {
      familyIdRef: 'fam_at_home_bw',
      confidence: 'HIGH',
      notes: 'Strict Bodyweight routing mandated by environment.',
    };
  }

  // Home or Apt/Hotel with limited comfort forces Minimal Equipment DB path
  if (environment === SessionEnvironment.Home || environment === SessionEnvironment.AptHotel) {
    if (liftComfort === LiftComfort.NoBarbell || liftComfort === LiftComfort.MachineDB) {
      return {
        familyIdRef: 'fam_min_equip_db',
        confidence: 'HIGH',
        notes: 'Limited environment with No Barbell/Machine preference forces DB routing.',
      };
    }
  }

  if (experienceLevel === ExperienceLevel.Beginner) {
    if (liftComfort === LiftComfort.MachineDB || liftComfort === LiftComfort.NoBarbell) {
      return { familyIdRef: 'fam_beginner_machine_fb', confidence: 'HIGH', notes: 'Beginner explicitly avoids Barbells.' };
    }
    return { familyIdRef: 'fam_beginner_fb', confidence: 'HIGH', notes: 'Standard beginner routing.' };
  }

  if (primaryGoal === GoalBucket.Hypertrophy) {
    if (daysPerWeek <= 3) {
      return { familyIdRef: 'fam_hyp_fb', confidence: 'HIGH', notes: 'Hypertrophy 3-day max forces Full Body structure.' };
    }
    if (daysPerWeek >= 5) {
      return { familyIdRef: 'fam_hyp_ppl', confidence: 'HIGH', notes: 'Hypertrophy 5+ days routes to Push-Pull-Legs.' };
    }
    return { familyIdRef: 'fam_hyp_ul', confidence: 'HIGH', notes: 'Hypertrophy 4-day sweet spot maps to Upper/Lower.' };
  }

  if (primaryGoal === GoalBucket.FatLoss) {
    return { familyIdRef: 'fam_fatloss_fb', confidence: 'MODERATE', notes: 'Fat Loss defaults to Heavy/Low-Volume Full Body.' };
  }

  if (primaryGoal === GoalBucket.Strength) {
    if (daysPerWeek >= 4) {
      return { familyIdRef: 'fam_str_ul', confidence: 'HIGH', notes: 'Strength 4-day maps to Upper/Lower.' };
    }
    return { familyIdRef: 'fam_str_fb', confidence: 'HIGH', notes: 'Strength 3-day maps to Full Body.' };
  }

  if (primaryGoal === GoalBucket.GenFitness || primaryGoal === GoalBucket.Recomp || primaryGoal === GoalBucket.Athletic) {
    if (daysPerWeek >= 4) {
      return { familyIdRef: 'fam_genfit_ul', confidence: 'HIGH', notes: '4+ Days General Fitness uses Longevity Upper/Lower.' };
    }
  }

  return { familyIdRef: 'fam_beginner_fb', confidence: 'FALLBACK', notes: 'Edge case triggered fallback to universal beginner baseline.' };
};

// Test Matrix
const testCases = [
  {
    name: 'Standard Beginner (Barbell OK)',
    profile: { experienceLevel: ExperienceLevel.Beginner, primaryGoal: GoalBucket.Hypertrophy, daysPerWeek: 3, liftComfort: LiftComfort.BarbellBasic, environment: SessionEnvironment.Commercial },
    expectedFamilyId: 'fam_beginner_fb'
  },
  {
    name: 'Beginner Machine Preference',
    profile: { experienceLevel: ExperienceLevel.Beginner, primaryGoal: GoalBucket.Hypertrophy, daysPerWeek: 3, liftComfort: LiftComfort.MachineDB, environment: SessionEnvironment.Commercial },
    expectedFamilyId: 'fam_beginner_machine_fb'
  },
  {
    name: 'Advanced Hypertrophy 4-Day',
    profile: { experienceLevel: ExperienceLevel.Advanced, primaryGoal: GoalBucket.Hypertrophy, daysPerWeek: 4, liftComfort: LiftComfort.BarbellAdv, environment: SessionEnvironment.Commercial },
    expectedFamilyId: 'fam_hyp_ul'
  },
  {
    name: 'Advanced 5-Day PPL',
    profile: { experienceLevel: ExperienceLevel.Advanced, primaryGoal: GoalBucket.Hypertrophy, daysPerWeek: 5, liftComfort: LiftComfort.BarbellAdv, environment: SessionEnvironment.Commercial },
    expectedFamilyId: 'fam_hyp_ppl'
  },
  {
    name: 'Apt/Hotel Constraint Over Goal',
    profile: { experienceLevel: ExperienceLevel.Advanced, primaryGoal: GoalBucket.Hypertrophy, daysPerWeek: 4, liftComfort: LiftComfort.MachineDB, environment: SessionEnvironment.AptHotel },
    expectedFamilyId: 'fam_min_equip_db'
  },
  {
    name: 'Strict Bodyweight Override',
    profile: { experienceLevel: ExperienceLevel.Intermediate, primaryGoal: GoalBucket.GenFitness, daysPerWeek: 3, liftComfort: LiftComfort.NoBarbell, environment: SessionEnvironment.Bodyweight },
    expectedFamilyId: 'fam_at_home_bw'
  },
  {
    name: 'Home Gym DB setup',
    profile: { experienceLevel: ExperienceLevel.Intermediate, primaryGoal: GoalBucket.Hypertrophy, daysPerWeek: 3, liftComfort: LiftComfort.MachineDB, environment: SessionEnvironment.Home },
    expectedFamilyId: 'fam_min_equip_db'
  },
  {
    name: 'Strength 3-Day Full Body',
    profile: { experienceLevel: ExperienceLevel.Intermediate, primaryGoal: GoalBucket.Strength, daysPerWeek: 3, liftComfort: LiftComfort.BarbellAdv, environment: SessionEnvironment.Commercial },
    expectedFamilyId: 'fam_str_fb'
  },
  {
    name: 'Strength 4-Day Upper/Lower',
    profile: { experienceLevel: ExperienceLevel.Advanced, primaryGoal: GoalBucket.Strength, daysPerWeek: 4, liftComfort: LiftComfort.BarbellAdv, environment: SessionEnvironment.Commercial },
    expectedFamilyId: 'fam_str_ul'
  }
];

console.log('--- STARTING ROUTER TEST MATRIX ---');
let passCount = 0;
testCases.forEach((t, i) => {
  const result = routeUserToPlan(t.profile);
  const pass = result.familyIdRef === t.expectedFamilyId;
  if (pass) {
    console.log(`✅ [PASS] Case ${i+1}: ${t.name}`);
    passCount++;
  } else {
    console.log(`❌ [FAIL] Case ${i+1}: ${t.name}`);
    console.log(`   Expected: ${t.expectedFamilyId}, Got: ${result.familyIdRef}`);
    console.log(`   Notes: ${result.notes}`);
  }
});
console.log(`\nResults: ${passCount}/${testCases.length} Passed.`);
if (passCount !== testCases.length) process.exit(1);
