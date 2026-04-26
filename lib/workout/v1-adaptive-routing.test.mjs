import { execFileSync } from 'node:child_process';
import test from 'node:test';

const matrixCheck = String.raw`
import { assert, assertEquals } from 'jsr:@std/assert';
import { coreTemplates } from './loaders/seeds/templates.ts';
import { planFamilies } from './loaders/seeds/families.ts';
import { routeUserToPlan } from './lib/workout/v1_librarian_router.ts';
import { hydrateTemplate } from './lib/workout/v1_architect.ts';
import {
  EquipmentCategory,
  ExperienceLevel,
  GoalBucket,
  LiftComfort,
  SessionEnvironment,
} from './types/v1_engine.ts';

function resolvePlan(input) {
  const recommendation = routeUserToPlan(input);
  const family = planFamilies.find((item) => item.external_id === recommendation.familyIdRef);
  assert(family, 'Missing family ' + recommendation.familyIdRef);
  const template = coreTemplates.find((item) => item.external_id === family.template_id);
  assert(template, 'Missing template ' + family.template_id);

  return hydrateTemplate(
    template,
    family.external_id,
    {
      goal: input.primaryGoal,
      environment: input.environment,
      comfort: input.liftComfort,
      injuries: [],
      experience_level: input.experienceLevel,
      session_duration_min: input.sessionDurationMin ?? 60,
    },
    input.daysPerWeek,
  );
}

for (const [experienceLevel, key] of [
  [ExperienceLevel.Beginner, 'beginner'],
  [ExperienceLevel.Intermediate, 'intermediate'],
  [ExperienceLevel.Advanced, 'advanced'],
]) {
  for (const daysPerWeek of [2, 3, 4, 5, 6]) {
    const recommendation = routeUserToPlan({
      experienceLevel,
      primaryGoal: GoalBucket.Hypertrophy,
      daysPerWeek,
      liftComfort: LiftComfort.BarbellBasic,
      environment: SessionEnvironment.Commercial,
    });
    assertEquals(recommendation.familyIdRef, 'fam_adaptive_' + key + '_' + daysPerWeek + '_day');
  }
}

const beginnerFive = resolvePlan({
  experienceLevel: ExperienceLevel.Beginner,
  primaryGoal: GoalBucket.Hypertrophy,
  daysPerWeek: 5,
  liftComfort: LiftComfort.BarbellBasic,
  environment: SessionEnvironment.Commercial,
});
assertEquals(beginnerFive.family_id, 'fam_adaptive_beginner_5_day');
assertEquals(beginnerFive.days.length, 5);
assert(beginnerFive.days.every((day) => day.exercises.length > 0));
assert(beginnerFive.days.flatMap((day) => day.exercises).every((exercise) => !exercise.technique_type));

for (const experienceLevel of [ExperienceLevel.Beginner, ExperienceLevel.Intermediate, ExperienceLevel.Advanced]) {
  const plan = resolvePlan({
    experienceLevel,
    primaryGoal: GoalBucket.Hypertrophy,
    daysPerWeek: 5,
    liftComfort: LiftComfort.BarbellBasic,
    environment: SessionEnvironment.Commercial,
  });
  const names = plan.days.flatMap((day) => day.exercises.map((exercise) => exercise.name));
  assertEquals(names.some((name) => name === 'Pike Push-Up'), false);
}

const dumbbellPlan = resolvePlan({
  experienceLevel: ExperienceLevel.Intermediate,
  primaryGoal: GoalBucket.Hypertrophy,
  daysPerWeek: 5,
  liftComfort: LiftComfort.MachineDB,
  environment: SessionEnvironment.AptHotel,
});
const blocked = new Set([EquipmentCategory.Barbell, EquipmentCategory.Machine, EquipmentCategory.Cable]);
assert(dumbbellPlan.days.flatMap((day) => day.exercises).every((exercise) => !blocked.has(exercise.equipment_category)));

const bodyweightPlan = resolvePlan({
  experienceLevel: ExperienceLevel.Intermediate,
  primaryGoal: GoalBucket.GenFitness,
  daysPerWeek: 5,
  liftComfort: LiftComfort.NoBarbell,
  environment: SessionEnvironment.Bodyweight,
});
assert(bodyweightPlan.days.flatMap((day) => day.exercises).every((exercise) => exercise.equipment_category === EquipmentCategory.BW));
`;

test('V1 adaptive routing matrix', () => {
  execFileSync('deno', ['eval', matrixCheck], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });
});
