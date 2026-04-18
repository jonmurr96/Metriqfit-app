/**
 * V1 Hydration Regression Test Suite
 * 
 * This test validates that the V1 hydration system can handle all
 * equipment/environment combinations without fatal failures.
 */

import { 
  SessionEnvironment, 
  LiftComfort, 
  GoalBucket, 
  ExperienceLevel,
  ReplacementGroup,
  ExerciseTier
} from '../types/v1_engine.ts';
import { hydrateTemplate } from './v1_architect.ts';
import { coreExercises } from '../loaders/seeds/exercises.ts';
import { coreTemplates } from '../loaders/seeds/templates.ts';
import { planFamilies } from '../loaders/seeds/families.ts';

// Test configuration
const TEST_CONFIG = {
  verbose: true,
  stopOnFirstFailure: false,
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  failures: [],
};

function log(message, type = 'info') {
  if (!TEST_CONFIG.verbose && type === 'info') return;
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warn' ? '⚠️' : 'ℹ️';
  console.log(`${prefix} ${message}`);
}

/**
 * Test 1: Verify unilateral exercises exist in the pool
 */
function testUnilateralExercisesExist() {
  log('\n--- Test: Unilateral Exercises Exist ---');
  
  const unilateralHingeExercises = coreExercises.filter(ex => 
    ex.architectural_group === ReplacementGroup.Primary_Bilateral_Hinge &&
    ex.is_unilateral === true
  );
  
  const unilateralSquatExercises = coreExercises.filter(ex =>
    ex.architectural_group === ReplacementGroup.Unilateral_Squat_Lunge
  );
  
  log(`Unilateral Hinge exercises (in Primary_Bilateral_Hinge + is_unilateral): ${unilateralHingeExercises.length}`);
  unilateralHingeExercises.forEach(ex => log(`  - ${ex.name} (${ex.equipment_category})`));
  
  log(`Unilateral Squat exercises (in Unilateral_Squat_Lunge): ${unilateralSquatExercises.length}`);
  unilateralSquatExercises.forEach(ex => log(`  - ${ex.name} (${ex.equipment_category})`));
  
  if (unilateralHingeExercises.length === 0) {
    results.failed++;
    results.failures.push('No unilateral hinge exercises found');
    return false;
  }
  
  if (unilateralSquatExercises.length === 0) {
    results.failed++;
    results.failures.push('No unilateral squat exercises found');
    return false;
  }
  
  // Verify we have exercises for each equipment type
  const requiredEquipment = ['BW', 'DB', 'Barbell'];
  for (const equip of requiredEquipment) {
    const hasHinge = unilateralHingeExercises.some(ex => ex.equipment_category === equip);
    const hasSquat = unilateralSquatExercises.some(ex => ex.equipment_category === equip);
    
    if (!hasHinge && equip !== 'Barbell') { // Barbell unilateral hinge is rare
      log(`Warning: No unilateral hinge exercises for ${equip}`, 'warn');
    }
    if (!hasSquat) {
      log(`Warning: No unilateral squat exercises for ${equip}`, 'warn');
    }
  }
  
  results.passed++;
  return true;
}

/**
 * Test 2: Hydrate template with each environment
 */
function testHydrationByEnvironment() {
  log('\n--- Test: Hydration by Environment ---');
  
  const environments = [
    { env: SessionEnvironment.Commercial, desc: 'Full Gym', shouldWork: true },
    { env: SessionEnvironment.Home, desc: 'Dumbbells + Bench', shouldWork: true },
    { env: SessionEnvironment.AptHotel, desc: 'Apt/Hotel', shouldWork: true },
    { env: SessionEnvironment.Bodyweight, desc: 'Bodyweight Only', shouldWork: true },
  ];
  
  // Find a 6-day template (most likely to have unilateral slots)
  const sixDayTemplate = coreTemplates.find(t => t.days_per_week === 6);
  if (!sixDayTemplate) {
    log('No 6-day template found for testing', 'error');
    results.failed++;
    results.failures.push('No 6-day template found');
    return false;
  }
  
  log(`Using template: ${sixDayTemplate.name} (${sixDayTemplate.external_id})`);
  log(`Template has ${sixDayTemplate.days.length} days`);
  
  for (const { env, desc, shouldWork } of environments) {
    try {
      const persona = {
        goal: GoalBucket.Hypertrophy,
        environment: env,
        comfort: env === SessionEnvironment.Bodyweight ? LiftComfort.NoBarbell : LiftComfort.BarbellBasic,
        injuries: [],
        experience_level: ExperienceLevel.Intermediate,
      };
      
      const result = hydrateTemplate(sixDayTemplate, 'fam_test', persona, 6);
      
      // Validate result
      const totalExercises = result.days.reduce((sum, day) => sum + day.exercises.length, 0);
      const expectedExercises = sixDayTemplate.days.reduce((sum, day) => sum + day.slots.length, 0);
      
      if (totalExercises !== expectedExercises) {
        throw new Error(`Expected ${expectedExercises} exercises, got ${totalExercises}`);
      }
      
      log(`${desc}: ✅ SUCCESS (${totalExercises} exercises hydrated)`);
      results.passed++;
      
    } catch (error) {
      log(`${desc}: ❌ FAILED - ${error.message}`, 'error');
      results.failed++;
      results.failures.push(`${desc}: ${error.message}`);
      
      if (TEST_CONFIG.stopOnFirstFailure) {
        throw error;
      }
    }
  }
  
  return results.failures.length === 0;
}

/**
 * Test 3: Hydrate with specific unilateral slot groups
 */
function testUnilateralSlotHydration() {
  log('\n--- Test: Unilateral Slot Hydration ---');
  
  const testCases = [
    { group: ReplacementGroup.Unilateral_Hinge, desc: 'Unilateral Hinge', tiers: [ExerciseTier.T1, ExerciseTier.T2] },
    { group: ReplacementGroup.Unilateral_Squat_Lunge, desc: 'Unilateral Squat/Lunge', tiers: [ExerciseTier.T1, ExerciseTier.T2] },
  ];
  
  const environments = [
    SessionEnvironment.Commercial,
    SessionEnvironment.Home,
    SessionEnvironment.AptHotel,
    SessionEnvironment.Bodyweight,
  ];
  
  for (const env of environments) {
    for (const { group, desc, tiers } of testCases) {
      try {
        // We can't directly test findExerciseInGroup since it's internal,
        // but we can verify the exercise pool has matching exercises
        const persona = {
          goal: GoalBucket.Hypertrophy,
          environment: env,
          comfort: env === SessionEnvironment.Bodyweight ? LiftComfort.NoBarbell : LiftComfort.BarbellBasic,
          injuries: [],
          experience_level: ExperienceLevel.Intermediate,
        };
        
        // Simulate the filtering logic from findExerciseInGroup
        const allowedEquipment = {
          [SessionEnvironment.Commercial]: ['Barbell', 'DB', 'Machine', 'Cable', 'BW', 'Misc'],
          [SessionEnvironment.AptHotel]: ['DB', 'BW', 'Machine', 'Cable', 'Misc'],
          [SessionEnvironment.Home]: ['DB', 'BW', 'Misc'],
          [SessionEnvironment.Bodyweight]: ['BW'],
        }[env];
        
        let candidates;
        if (group === ReplacementGroup.Unilateral_Hinge) {
          // Should find exercises in Primary_Bilateral_Hinge with is_unilateral=true
          candidates = coreExercises.filter(ex => 
            ex.architectural_group === ReplacementGroup.Primary_Bilateral_Hinge &&
            ex.is_unilateral === true &&
            allowedEquipment.includes(ex.equipment_category)
          );
        } else {
          // Direct match for Unilateral_Squat_Lunge
          candidates = coreExercises.filter(ex =>
            ex.architectural_group === group &&
            allowedEquipment.includes(ex.equipment_category)
          );
        }
        
        if (candidates.length === 0) {
          throw new Error(`No candidates found for ${desc} in ${env}`);
        }
        
        log(`${desc} in ${env}: ✅ Found ${candidates.length} candidates`);
        results.passed++;
        
      } catch (error) {
        log(`${desc} in ${env}: ❌ FAILED - ${error.message}`, 'error');
        results.failed++;
        results.failures.push(`${desc} in ${env}: ${error.message}`);
      }
    }
  }
  
  return results.failures.length === 0;
}

/**
 * Test 4: Full integration test with plan families
 */
function testFullPlanFamilyHydration() {
  log('\n--- Test: Full Plan Family Hydration ---');
  
  // Test with each plan family
  for (const family of planFamilies.slice(0, 3)) { // Test first 3 families
    const template = coreTemplates.find(t => t.external_id === family.template_id);
    if (!template) {
      log(`Template not found for family ${family.external_id}`, 'warn');
      continue;
    }
    
    const environments = [
      SessionEnvironment.Commercial,
      SessionEnvironment.Bodyweight,
    ];
    
    for (const env of environments) {
      try {
        const persona = {
          goal: GoalBucket.Hypertrophy,
          environment: env,
          comfort: env === SessionEnvironment.Bodyweight ? LiftComfort.NoBarbell : LiftComfort.BarbellBasic,
          injuries: [],
          experience_level: ExperienceLevel.Intermediate,
        };
        
        const result = hydrateTemplate(template, family.external_id, persona, template.days_per_week);
        
        log(`${family.name} (${env}): ✅ SUCCESS`);
        results.passed++;
        
      } catch (error) {
        log(`${family.name} (${env}): ❌ FAILED - ${error.message}`, 'error');
        results.failed++;
        results.failures.push(`${family.name} (${env}): ${error.message}`);
      }
    }
  }
  
  return results.failures.length === 0;
}

/**
 * Test 5: Equipment constraint edge cases
 */
function testEquipmentEdgeCases() {
  log('\n--- Test: Equipment Edge Cases ---');
  
  const edgeCases = [
    {
      desc: 'Bodyweight + 6 days + Hypertrophy',
      persona: {
        goal: GoalBucket.Hypertrophy,
        environment: SessionEnvironment.Bodyweight,
        comfort: LiftComfort.NoBarbell,
        injuries: [],
        experience_level: ExperienceLevel.Intermediate,
      },
      days: 6,
    },
    {
      desc: 'Dumbbells Only + 6 days',
      persona: {
        goal: GoalBucket.Hypertrophy,
        environment: SessionEnvironment.AptHotel,
        comfort: LiftComfort.MachineDB,
        injuries: [],
        experience_level: ExperienceLevel.Intermediate,
      },
      days: 6,
    },
    {
      desc: 'Knee injury + Lower body focus',
      persona: {
        goal: GoalBucket.FatLoss,
        environment: SessionEnvironment.Commercial,
        comfort: LiftComfort.BarbellBasic,
        injuries: ['knees'],
        experience_level: ExperienceLevel.Beginner,
      },
      days: 4,
    },
  ];
  
  for (const { desc, persona, days } of edgeCases) {
    try {
      const template = coreTemplates.find(t => t.days_per_week === days) || coreTemplates[0];
      const result = hydrateTemplate(template, 'fam_test', persona, days);
      
      log(`${desc}: ✅ SUCCESS`);
      results.passed++;
      
    } catch (error) {
      log(`${desc}: ❌ FAILED - ${error.message}`, 'error');
      results.failed++;
      results.failures.push(`${desc}: ${error.message}`);
    }
  }
  
  return results.failures.length === 0;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  V1 Hydration Regression Test Suite                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  
  try {
    testUnilateralExercisesExist();
    testHydrationByEnvironment();
    testUnilateralSlotHydration();
    testFullPlanFamilyHydration();
    testEquipmentEdgeCases();
    
  } catch (error) {
    log(`Test suite crashed: ${error.message}`, 'error');
    console.error(error.stack);
  }
  
  const duration = Date.now() - startTime;
  
  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                              ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Tests: ${String(results.passed + results.failed).padEnd(46)} ║`);
  console.log(`║  Passed: ${String(results.passed).padEnd(51)} ║`);
  console.log(`║  Failed: ${String(results.failed).padEnd(51)} ║`);
  console.log(`║  Duration: ${String(duration + 'ms').padEnd(49)} ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  if (results.failures.length > 0) {
    console.log('\n❌ Failures:');
    results.failures.forEach((failure, i) => {
      console.log(`  ${i + 1}. ${failure}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

runTests();
