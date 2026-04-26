import { 
  GoalBucket, 
  SessionEnvironment, 
  LiftComfort, 
  Exercise, 
} from '../types/v1_engine';
import { getSwapAlternatives } from '../lib/workout/v1_swap_engine';
import { coreExercises } from '../loaders/seeds/exercises';

const mockBackSquat = coreExercises.find(e => e.external_id === 'ex_barbell_back_squat')!;
const mockBenchPress = coreExercises.find(e => e.external_id === 'ex_barbell_bench_press')!;

console.log('--- Week 1.3 Swap Engine Verification ---\n');

// SCENARIO 1: Commercial Gym, Advanced, Strength Goal
console.log('Scenario 1: Advanced lifter in Commercial Gym swapping Back Squat');
const persona1 = {
  goal: GoalBucket.Strength,
  environment: SessionEnvironment.Commercial,
  comfort: LiftComfort.BarbellAdv,
  injuries: []
};
const alts1 = getSwapAlternatives(mockBackSquat as Exercise, persona1);
console.log(`Found ${alts1.length} alternatives.`);
alts1.slice(0,3).forEach((a, i) => {
  console.log(`${i+1}. ${a.exercise.name} (${a.reason_tag}) - Reliability: ${a.reliability_score}% - Continuity: ${a.continuity_recommendation}`);
});
console.log('\n');

// SCENARIO 2: Home Gym, No Barbell, Fat Loss
console.log('Scenario 2: Beginner at Home swapping Goblet Squat (DB)');
const mockGoblet = coreExercises.find(e => e.external_id === 'ex_goblet_squat')!;
const persona2 = {
  goal: GoalBucket.FatLoss,
  environment: SessionEnvironment.Home,
  comfort: LiftComfort.NoBarbell,
  injuries: []
};
const alts2 = getSwapAlternatives(mockGoblet as Exercise, persona2);
console.log(`Found ${alts2.length} alternatives.`);
alts2.forEach((a, i) => {
  console.log(`${i+1}. ${a.exercise.name} (${a.reason_tag}) - Continuity: ${a.continuity_recommendation}`);
});
console.log('\n');

// SCENARIO 3: Injury Check (Shoulder Impingement)
console.log('Scenario 3: lifter with Shoulder Impingement swapping Bench Press');
const persona3 = {
  goal: GoalBucket.Hypertrophy,
  environment: SessionEnvironment.Commercial,
  comfort: LiftComfort.BarbellBasic,
  injuries: ['shoulder_impingement']
};
const alts3 = getSwapAlternatives(mockBenchPress as Exercise, persona3);
const hasBarbell = alts3.some(a => a.exercise.equipment_category === 'Barbell');
console.log(`Has valid alternatives: ${alts3.length}`);
console.log(`Are barbel exercises filtered out? ${!hasBarbell ? 'YES' : 'NO'}`);
alts3.slice(0,2).forEach(a => console.log(`- ${a.exercise.name} (${a.reason_tag})`));

console.log('\n--- Verification Finished ---');
