import * as assert from 'node:assert';
import { test } from 'node:test';
import { routeUserToPlan } from './v1_librarian_router';
import { GoalBucket, LiftComfort, ExperienceLevel, SessionEnvironment, TrainingStyle } from '../../types/v1_engine';

test('Librarian Router V1', async (t) => {
  await t.test('Routes at-home Bodyweight users to the BW template', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Intermediate,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 4,
      liftComfort: LiftComfort.NoBarbell,
      environment: SessionEnvironment.Home,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_at_home_bw');
    assert.strictEqual(result.confidence, 'HIGH');
  });

  await t.test('Routes all beginners to the Beginner Full Body template', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Beginner,
      primaryGoal: GoalBucket.GenFitness,
      daysPerWeek: 3,
      liftComfort: LiftComfort.BarbellAdv,
      environment: SessionEnvironment.Commercial,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_beginner_fb');
  });

  await t.test('Routes beginners with Machine/DB comfort to Machine/DB Full Body template', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Beginner,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 4,
      liftComfort: LiftComfort.MachineDB,
      environment: SessionEnvironment.Commercial,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_beginner_machine_fb');
  });

  await t.test('Routes intermediate hypertrophy (4 days) to Upper/Lower template', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Intermediate,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 4,
      liftComfort: LiftComfort.BarbellAdv,
      environment: SessionEnvironment.Commercial,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_hyp_ul');
  });

  await t.test('Routes Fat Loss directly to Strength Maintenance template', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Intermediate,
      primaryGoal: GoalBucket.FatLoss,
      daysPerWeek: 3,
      liftComfort: LiftComfort.BarbellAdv,
      environment: SessionEnvironment.Commercial,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_fatloss_fb');
    assert.strictEqual(result.confidence, 'MODERATE');
  });
});
