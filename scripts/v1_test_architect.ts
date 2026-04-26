import { hydrateTemplate } from '../lib/workout/v1_architect';
import { coreTemplates } from '../loaders/seeds/templates';
import { GoalBucket, SessionEnvironment, LiftComfort } from '../types/v1_engine';

const testTemplate = coreTemplates[0]; // Beginner Full Body

const personas = [
  {
    name: 'Commercial Max (Barbell Strength)',
    goal: GoalBucket.Strength,
    environment: SessionEnvironment.Commercial,
    comfort: LiftComfort.BarbellAdv,
    injuries: [],
  },
  {
    name: 'Apt/Hotel GenFit (No Barbell)',
    goal: GoalBucket.GenFitness,
    environment: SessionEnvironment.AptHotel,
    comfort: LiftComfort.MachineDB,
    injuries: [],
  },
  {
    name: 'Home Gym (DB focus)',
    goal: GoalBucket.Hypertrophy,
    environment: SessionEnvironment.Home,
    comfort: LiftComfort.MachineDB,
    injuries: [],
  },
  {
    name: 'Bodyweight Only (Strict BW)',
    goal: GoalBucket.GenFitness,
    environment: SessionEnvironment.Bodyweight,
    comfort: LiftComfort.NoBarbell,
    injuries: [],
  },
];

console.log('🚀 Starting V1 Architect Validation...\n');

personas.forEach((p) => {
  console.log(`--- Testing Persona: ${p.name} ---`);
  try {
    const plan = hydrateTemplate(testTemplate as any, 'fam_test', p);
    
    plan.days[0].exercises.forEach((ex, i) => {
      console.log(`Slot ${i}: ${ex.name} (${ex.equipment_category})`);
      console.log(`  > Reason: ${ex.selection_metadata.reason}`);
      console.log(`  > Fallback Path: ${ex.selection_metadata.fallback_path}`);
      console.log(`  > Tier: ${ex.tier}`);
    });
    console.log('\n✅ Hydration Successful\n');
  } catch (err: any) {
    console.error(`❌ Hydration Failed: ${err.message}\n`);
  }
});
