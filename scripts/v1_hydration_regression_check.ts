import { assert } from 'jsr:@std/assert';
import { coreExercises } from '../loaders/seeds/exercises.ts';
import { planFamilies } from '../loaders/seeds/families.ts';
import { coreTemplates } from '../loaders/seeds/templates.ts';
import { hydrateTemplate } from '../lib/workout/v1_architect.ts';
import {
  ExperienceLevel,
  GoalBucket,
  LiftComfort,
  ReplacementGroup,
  SessionEnvironment,
} from '../types/v1_engine.ts';

const environments = [
  SessionEnvironment.Commercial,
  SessionEnvironment.Home,
  SessionEnvironment.AptHotel,
  SessionEnvironment.Bodyweight,
];

const allowedEquipmentByEnvironment: Record<SessionEnvironment, string[]> = {
  [SessionEnvironment.Commercial]: ['Barbell', 'DB', 'Machine', 'Cable', 'BW', 'Misc'],
  [SessionEnvironment.AptHotel]: ['DB', 'BW', 'Machine', 'Cable', 'Misc'],
  [SessionEnvironment.Home]: ['DB', 'BW', 'Misc'],
  [SessionEnvironment.Bodyweight]: ['BW'],
};

function personaFor(environment: SessionEnvironment, overrides = {}) {
  return {
    goal: GoalBucket.Hypertrophy,
    environment,
    comfort: environment === SessionEnvironment.Bodyweight
      ? LiftComfort.NoBarbell
      : LiftComfort.BarbellBasic,
    injuries: [],
    experience_level: ExperienceLevel.Intermediate,
    ...overrides,
  };
}

const unilateralHingeExercises = coreExercises.filter((exercise) =>
  exercise.architectural_group === ReplacementGroup.Primary_Bilateral_Hinge &&
  exercise.is_unilateral === true
);
const unilateralSquatExercises = coreExercises.filter((exercise) =>
  exercise.architectural_group === ReplacementGroup.Unilateral_Squat_Lunge
);

assert(unilateralHingeExercises.length > 0, 'No unilateral hinge exercises found');
assert(unilateralSquatExercises.length > 0, 'No unilateral squat/lunge exercises found');

const sixDayTemplate = coreTemplates.find((template) => template.days_per_week === 6);
assert(sixDayTemplate, 'No 6-day template found');

for (const environment of environments) {
  const hydrated = hydrateTemplate(
    sixDayTemplate,
    'fam_test',
    personaFor(environment),
    6,
  );
  const totalExercises = hydrated.days.reduce((sum, day) => sum + day.exercises.length, 0);
  const requiredExercises = sixDayTemplate.days.reduce(
    (sum, day) => sum + day.slots.filter((slot) => slot.is_required).length,
    0,
  );
  assert(
    totalExercises >= requiredExercises,
    `Hydration missed required slots for ${environment}: ${totalExercises}/${requiredExercises}`,
  );
}

for (const environment of environments) {
  const allowedEquipment = allowedEquipmentByEnvironment[environment];
  const unilateralHingeCandidates = coreExercises.filter((exercise) =>
    exercise.architectural_group === ReplacementGroup.Primary_Bilateral_Hinge &&
    exercise.is_unilateral === true &&
    allowedEquipment.includes(exercise.equipment_category)
  );
  const unilateralSquatCandidates = coreExercises.filter((exercise) =>
    exercise.architectural_group === ReplacementGroup.Unilateral_Squat_Lunge &&
    allowedEquipment.includes(exercise.equipment_category)
  );

  assert(
    unilateralHingeCandidates.length > 0,
    `No unilateral hinge candidates found for ${environment}`,
  );
  assert(
    unilateralSquatCandidates.length > 0,
    `No unilateral squat/lunge candidates found for ${environment}`,
  );
}

for (const family of planFamilies.slice(0, 3)) {
  const template = coreTemplates.find((item) => item.external_id === family.template_id);
  assert(template, `Template not found for family ${family.external_id}`);

  for (const environment of [SessionEnvironment.Commercial, SessionEnvironment.Bodyweight]) {
    const hydrated = hydrateTemplate(
      template,
      family.external_id,
      personaFor(environment),
      template.days_per_week,
    );
    assert(hydrated.days.length > 0, `No hydrated days for ${family.external_id} in ${environment}`);
  }
}

for (
  const edgeCase of [
    {
      desc: 'Bodyweight + 6 days + Hypertrophy',
      days: 6,
      persona: personaFor(SessionEnvironment.Bodyweight),
    },
    {
      desc: 'Dumbbells Only + 6 days',
      days: 6,
      persona: personaFor(SessionEnvironment.AptHotel, { comfort: LiftComfort.MachineDB }),
    },
    {
      desc: 'Knee injury + Lower body focus',
      days: 4,
      persona: personaFor(SessionEnvironment.Commercial, {
        goal: GoalBucket.FatLoss,
        injuries: ['knees'],
        experience_level: ExperienceLevel.Beginner,
      }),
    },
  ]
) {
  const template = coreTemplates.find((item) => item.days_per_week === edgeCase.days);
  assert(template, `No template found for edge case ${edgeCase.desc}`);
  const hydrated = hydrateTemplate(template, 'fam_test', edgeCase.persona, edgeCase.days);
  assert(hydrated.days.length > 0, `No hydrated days for edge case ${edgeCase.desc}`);
}

console.log('V1 hydration regression check passed');
