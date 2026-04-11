import * as assert from 'node:assert';
import { test } from 'node:test';
import { routeUserToPlan } from './v1_librarian_router';
import { GoalBucket, LiftComfort, ExperienceLevel, SessionEnvironment } from '../../types/v1_engine';

test('Librarian Router V1', async (t) => {
  await t.test('Routes 3-day at-home Bodyweight users to the BW template', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Intermediate,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 3,
      liftComfort: LiftComfort.NoBarbell,
      environment: SessionEnvironment.Bodyweight,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_at_home_bw');
    assert.strictEqual(result.confidence, 'HIGH');
  });

  await t.test('Routes 3-day beginners to the Beginner Full Body template', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Beginner,
      primaryGoal: GoalBucket.GenFitness,
      daysPerWeek: 3,
      liftComfort: LiftComfort.BarbellAdv,
      environment: SessionEnvironment.Commercial,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_beginner_fb');
  });

  await t.test('Routes 3-day beginners with Machine/DB comfort to Machine/DB Full Body template', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Beginner,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 3,
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

  await t.test('Routes constrained environment (Apt/Hotel) 2-day to Minimalist 2-Day', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Intermediate,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 2,
      liftComfort: LiftComfort.BarbellAdv,
      environment: SessionEnvironment.AptHotel,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_minimalist_2_day');
    assert.strictEqual(result.confidence, 'HIGH');
  });

  await t.test('Routes low-friction (Machine/DB only) 2-day to Minimalist 2-Day', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Advanced,
      primaryGoal: GoalBucket.Strength,
      daysPerWeek: 2,
      liftComfort: LiftComfort.MachineDB,
      environment: SessionEnvironment.Commercial,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_minimalist_2_day');
    assert.strictEqual(result.confidence, 'HIGH');
  });


  await t.test('Falls through to goal/day routing when Bodyweight constraint does not support requested days', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Intermediate,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 4,
      liftComfort: LiftComfort.NoBarbell,
      environment: SessionEnvironment.Bodyweight,
    });

    assert.strictEqual(result.familyIdRef, 'fam_hyp_ul');
  });

  await t.test('Falls through to goal/day routing when No Barbell override does not support requested days', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Advanced,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 5,
      liftComfort: LiftComfort.NoBarbell,
      environment: SessionEnvironment.Commercial,
    });

    assert.strictEqual(result.familyIdRef, 'fam_hyp_5_day');
  });

  await t.test('Falls through to goal/day routing when beginner template does not support requested days', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Beginner,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 4,
      liftComfort: LiftComfort.MachineDB,
      environment: SessionEnvironment.Commercial,
    });

    assert.strictEqual(result.familyIdRef, 'fam_hyp_ul');
  });

  await t.test('REGRESSION: 5-Day Hypertrophy routes to PPL-UL (fam_hyp_5_day)', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Advanced,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 5,
      liftComfort: LiftComfort.BarbellAdv,
      environment: SessionEnvironment.Commercial,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_hyp_5_day');
  });

  await t.test('REGRESSION: 6-Day Hypertrophy routes to PPL (fam_hyp_ppl)', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Advanced,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 6,
      liftComfort: LiftComfort.BarbellAdv,
      environment: SessionEnvironment.Commercial,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_hyp_ppl');
  });

  await t.test('REGRESSION: 2-Day Hypertrophy routes to Specialized 2-Day (fam_hyp_2_day)', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Intermediate,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek: 2,
      liftComfort: LiftComfort.BarbellAdv,
      environment: SessionEnvironment.Commercial,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_hyp_2_day');
  });

  await t.test('REGRESSION: 5-Day General Fitness routes to 5-Day Hypertrophy (fam_hyp_5_day)', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Intermediate,
      primaryGoal: GoalBucket.GenFitness,
      daysPerWeek: 5,
      liftComfort: LiftComfort.BarbellAdv,
      environment: SessionEnvironment.Commercial,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_hyp_5_day');
    assert.strictEqual(result.notes?.includes('Hypertrophy PPL-UL'), true);
  });

  await t.test('REGRESSION: 6-Day Athletic routes to 6-Day PPL (fam_hyp_ppl)', () => {
    const result = routeUserToPlan({
      experienceLevel: ExperienceLevel.Advanced,
      primaryGoal: GoalBucket.Athletic,
      daysPerWeek: 6,
      liftComfort: LiftComfort.BarbellAdv,
      environment: SessionEnvironment.Commercial,
    });
    
    assert.strictEqual(result.familyIdRef, 'fam_hyp_ppl');
  });
});
