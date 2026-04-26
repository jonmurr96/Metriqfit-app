import {
  ContraindicationTag,
  EquipmentCategory,
  ExperienceLevel,
  GoalBucket,
  LiftComfort,
  SessionEnvironment,
  SlotArchetype,
} from '../types/v1_engine.ts';
import { planFamilies } from '../loaders/seeds/families.ts';
import { coreTemplates } from '../loaders/seeds/templates.ts';
import { routeUserToPlan } from '../lib/workout/v1_librarian_router.ts';
import { hydrateTemplate } from '../lib/workout/v1_architect.ts';

type GoalType =
  | 'lose_weight'
  | 'build_muscle'
  | 'get_fitter'
  | 'gain_weight'
  | 'maintain_weight'
  | 'recomp'
  | 'increase_endurance'
  | 'general_fitness';

type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
type ExperienceAnswer = 'beginner' | 'intermediate' | 'advanced';
type EquipmentAnswer = 'full_gym' | 'dumbbells_only' | 'bodyweight_only';
type MinutesAnswer = '30' | '45' | '60' | '90_plus';
type SessionEmphasis = 'strength' | 'hypertrophy' | 'balanced' | 'conditioning' | 'no_preference';

type OnboardingWorkoutAnswers = {
  goal_type: GoalType;
  activity_level: ActivityLevel;
  experience_level: ExperienceAnswer;
  equipment_access: EquipmentAnswer;
  training_days_per_week: number;
  training_days: string[];
  minutes_per_workout: MinutesAnswer;
  injuries: string[];
  session_emphasis: SessionEmphasis;
};

type Issue = {
  code: string;
  message: string;
  answers: OnboardingWorkoutAnswers;
  route?: string;
  template?: string;
  details?: unknown;
};

const GOALS: GoalType[] = [
  'lose_weight',
  'build_muscle',
  'get_fitter',
  'gain_weight',
  'maintain_weight',
  'recomp',
  'increase_endurance',
  'general_fitness',
];

const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'lightly_active', 'moderately_active', 'very_active'];
const EXPERIENCES: ExperienceAnswer[] = ['beginner', 'intermediate', 'advanced'];
const EQUIPMENT: EquipmentAnswer[] = ['full_gym', 'dumbbells_only', 'bodyweight_only'];
const DAYS = [2, 3, 4, 5, 6];
const MINUTES: MinutesAnswer[] = ['30', '45', '60', '90_plus'];
const SESSION_EMPHASES: SessionEmphasis[] = ['strength', 'hypertrophy', 'balanced', 'conditioning', 'no_preference'];
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DB_ALLOWED_TECHNIQUE_TYPES = new Set([
  'straight_set',
  'tempo',
  'pause_reps',
  'superset',
  'giant_set',
  'drop_set',
  'rest_pause',
  'amrap',
  'warmup_protocol',
  'cluster',
  'cluster_set',
  'failure_set',
  'pyramid_set',
]);

const UI_INJURY_PROFILES: string[][] = [
  ['none'],
  ['shoulders'],
  ['knees', 'hips'],
  ['back'],
  ['wrists', 'elbows'],
  ['ankles'],
  ['neck'],
  ['other'],
  ['shoulders', 'wrists', 'elbows'],
  ['back', 'knees', 'hips'],
];

const INDIVIDUAL_INJURIES = ['shoulders', 'knees', 'hips', 'back', 'wrists', 'elbows', 'ankles', 'neck'];

function parseArgs(args: string[]) {
  const options = {
    exhaustive: false,
    allSessionEmphasis: false,
    allInjurySubsets: false,
    failFast: false,
    verbose: false,
    maxIssues: 50,
    json: '',
    sample: 0,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--exhaustive') {
      options.exhaustive = true;
      options.allSessionEmphasis = true;
      options.allInjurySubsets = true;
    } else if (arg === '--all-session-emphasis') {
      options.allSessionEmphasis = true;
    } else if (arg === '--all-injury-subsets') {
      options.allInjurySubsets = true;
    } else if (arg === '--fail-fast') {
      options.failFast = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--max-issues') {
      options.maxIssues = Number(args[++index] || options.maxIssues);
    } else if (arg === '--json') {
      options.json = args[++index] || '';
    } else if (arg === '--sample') {
      options.sample = Number(args[++index] || 0);
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      Deno.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Onboarding workout matrix audit

Usage:
  deno run scripts/onboarding-workout-matrix-audit.ts [options]

Options:
  --exhaustive              Test all injury subsets and all session emphasis values.
  --all-injury-subsets      Test every subset of supported injury selections.
  --all-session-emphasis    Test every session emphasis value.
  --sample N                Stop after N combinations. Useful while developing.
  --fail-fast               Exit on the first issue.
  --max-issues N            Number of example issues to print. Default: 50.
  --json path               Write full audit result JSON to path.
  --verbose                 Allow generator logs through.
  --help                    Show this help.

Default mode tests a broad practical matrix:
  goals x activity levels x experience x equipment x days x duration x common injury profiles.
`);
}

function injuryProfiles(allSubsets: boolean) {
  if (!allSubsets) return UI_INJURY_PROFILES;

  const profiles: string[][] = [['none']];
  const total = 1 << INDIVIDUAL_INJURIES.length;
  for (let mask = 1; mask < total; mask += 1) {
    const profile = INDIVIDUAL_INJURIES.filter((_, index) => (mask & (1 << index)) !== 0);
    profiles.push(profile);
  }
  return profiles;
}

function trainingDaysForCount(count: number) {
  return WEEKDAYS.slice(0, count);
}

function mapOnboardingToV1(onboarding: OnboardingWorkoutAnswers) {
  let environment = SessionEnvironment.Commercial;
  if (onboarding.equipment_access === 'bodyweight_only') environment = SessionEnvironment.Bodyweight;
  else if (onboarding.equipment_access === 'dumbbells_only') environment = SessionEnvironment.AptHotel;

  let experienceLevel = ExperienceLevel.Beginner;
  if (onboarding.experience_level === 'intermediate') experienceLevel = ExperienceLevel.Intermediate;
  else if (onboarding.experience_level === 'advanced') experienceLevel = ExperienceLevel.Advanced;

  let primaryGoal = GoalBucket.GenFitness;
  if (onboarding.goal_type === 'lose_weight') primaryGoal = GoalBucket.FatLoss;
  else if (onboarding.goal_type === 'gain_weight' || onboarding.goal_type === 'build_muscle') primaryGoal = GoalBucket.Hypertrophy;
  else if (onboarding.goal_type === 'recomp') primaryGoal = GoalBucket.Recomp;
  else if (onboarding.goal_type === 'increase_endurance') primaryGoal = GoalBucket.Athletic;
  if (onboarding.session_emphasis === 'strength') primaryGoal = GoalBucket.Strength;
  else if (onboarding.session_emphasis === 'conditioning') primaryGoal = GoalBucket.Athletic;

  const minutes = onboarding.minutes_per_workout === '90_plus'
    ? 90
    : Number(onboarding.minutes_per_workout || 60);

  let liftComfort = LiftComfort.BarbellBasic;
  if (environment === SessionEnvironment.Bodyweight) liftComfort = LiftComfort.NoBarbell;
  else if (environment === SessionEnvironment.AptHotel) liftComfort = LiftComfort.MachineDB;
  else if (experienceLevel === ExperienceLevel.Beginner) liftComfort = LiftComfort.MachineDB;
  else if (experienceLevel === ExperienceLevel.Advanced && primaryGoal === GoalBucket.Strength) liftComfort = LiftComfort.BarbellAdv;

  return {
    experienceLevel,
    primaryGoal,
    daysPerWeek: onboarding.training_days_per_week,
    liftComfort,
    environment,
    sessionDurationMin: Number.isFinite(minutes) ? minutes : 60,
    conditioningGoal: onboarding.goal_type === 'lose_weight'
      || onboarding.goal_type === 'increase_endurance'
      || onboarding.session_emphasis === 'conditioning',
  };
}

function normalizeInjuryTags(injuries: string[]) {
  const tags = new Set<ContraindicationTag>();
  for (const injury of injuries || []) {
    switch (String(injury).toLowerCase()) {
      case 'shoulders':
      case 'shoulder':
        tags.add(ContraindicationTag.Shoulder_Impingement);
        break;
      case 'back':
      case 'lower_back':
        tags.add(ContraindicationTag.Lower_Back_Shearing);
        break;
      case 'knees':
      case 'knee':
        tags.add(ContraindicationTag.Knee_Shear);
        break;
      case 'wrists':
      case 'wrist':
        tags.add(ContraindicationTag.Wrist_Extension);
        break;
    }
  }
  return Array.from(tags);
}

function allowedEquipmentFor(answer: EquipmentAnswer) {
  if (answer === 'bodyweight_only') return new Set([EquipmentCategory.BW]);
  if (answer === 'dumbbells_only') return new Set([EquipmentCategory.DB, EquipmentCategory.BW, EquipmentCategory.Misc]);
  return new Set([
    EquipmentCategory.Barbell,
    EquipmentCategory.DB,
    EquipmentCategory.Machine,
    EquipmentCategory.Cable,
    EquipmentCategory.BW,
    EquipmentCategory.Misc,
  ]);
}

function minutesFor(answer: MinutesAnswer) {
  return answer === '90_plus' ? 90 : Number(answer);
}

function isLowerGroup(group: string) {
  return group.includes('Squat')
    || group.includes('Hinge')
    || group.includes('Hamstring')
    || group.includes('Quad')
    || group.includes('Calf');
}

function isUpperPushGroup(group: string) {
  return group.includes('Press')
    || group.includes('Chest')
    || group.includes('Tricep')
    || group.includes('Lateral_Delt');
}

function isUpperPullGroup(group: string) {
  return group.includes('Pull')
    || group.includes('Bicep');
}

function isCoreGroup(group: string) {
  return group.includes('Trunk');
}

function isConditioningGroup(group: string) {
  return group.includes('Conditioning') || group.includes('Power_Dynamic');
}

function isCompoundExercise(exercise: ReturnType<typeof hydrateTemplate>['days'][number]['exercises'][number]) {
  return exercise.selection_metadata
    && (exercise.fatigue_cost !== 'Low' || !String(exercise.architectural_group).startsWith('Isolation_'));
}

function isStrengthRepRangeExercise(exercise: ReturnType<typeof hydrateTemplate>['days'][number]['exercises'][number]) {
  const group = String(exercise.architectural_group);
  return (
    group.startsWith('Primary_')
    || group.startsWith('Secondary_')
    || group.startsWith('Unilateral_')
  ) && !isCoreGroup(group) && !isConditioningGroup(group);
}

function dayComposition(day: ReturnType<typeof hydrateTemplate>['days'][number]) {
  const groups = day.exercises.map((exercise) => String(exercise.architectural_group));
  return {
    lower: groups.filter(isLowerGroup).length,
    upperPush: groups.filter(isUpperPushGroup).length,
    upperPull: groups.filter(isUpperPullGroup).length,
    core: groups.filter(isCoreGroup).length,
    conditioning: groups.filter(isConditioningGroup).length,
  };
}

function estimateSessionMinutes(day: ReturnType<typeof hydrateTemplate>['days'][number]) {
  return day.exercises.reduce((total, exercise) => {
    const sets = Number(exercise.sets || 1);
    const activeSeconds = Number(exercise.estimated_duration_seconds || 45);
    const restSeconds = Number(exercise.rest_seconds || 60);
    return total + (sets * activeSeconds + Math.max(0, sets - 1) * restSeconds) / 60;
  }, 0);
}

function hasCardioOrConditioning(plan: ReturnType<typeof hydrateTemplate>) {
  return plan.days.some((day) =>
    String(day.cardio_note || '').toLowerCase().includes('cardio')
    || String(day.cardio_note || '').toLowerCase().includes('interval')
    || String(day.day_type || '').toLowerCase().includes('conditioning')
    || day.exercises.some((exercise) =>
      isConditioningGroup(String(exercise.architectural_group))
      || String(exercise.technique_notes || '').toLowerCase().includes('cardio')
      || String(exercise.selection_metadata?.reason || '').toLowerCase().includes('cardio')
    )
  );
}

function validateHydratedPlan(
  answers: OnboardingWorkoutAnswers,
  route: string,
  templateId: string,
  plan: ReturnType<typeof hydrateTemplate>,
): Issue[] {
  const issues: Issue[] = [];
  const exercises = plan.days.flatMap((day) => day.exercises);
  const allowedEquipment = allowedEquipmentFor(answers.equipment_access);
  const injuryTags = normalizeInjuryTags(answers.injuries);
  const targetMinutes = minutesFor(answers.minutes_per_workout);

  if (plan.days.length !== answers.training_days_per_week) {
    issues.push({
      code: 'day_count_mismatch',
      message: `Expected ${answers.training_days_per_week} days, got ${plan.days.length}.`,
      answers,
      route,
      template: templateId,
    });
  }

  for (const day of plan.days) {
    if (day.exercises.length === 0) {
      issues.push({
        code: 'empty_day',
        message: `Day ${day.day_number} has no exercises.`,
        answers,
        route,
        template: templateId,
      });
    }

    const minimumExercises = targetMinutes <= 30 ? 2 : 3;
    if (day.exercises.length < minimumExercises) {
      issues.push({
        code: 'too_few_exercises_for_real_workout_day',
        message: `Day ${day.day_number} has ${day.exercises.length} exercise(s), below the ${minimumExercises}-exercise minimum for a real workout day.`,
        answers,
        route,
        template: templateId,
        details: { dayType: day.day_type, exercises: day.exercises.map((exercise) => exercise.name) },
      });
    }

    const estimatedMinutes = estimateSessionMinutes(day);
    const durationBuffer = targetMinutes <= 30 ? 10 : 15;
    if (estimatedMinutes > targetMinutes + durationBuffer) {
      issues.push({
        code: 'session_duration_over_target',
        message: `Day ${day.day_number} estimates ${estimatedMinutes.toFixed(1)} minutes for a ${targetMinutes}-minute user target.`,
        answers,
        route,
        template: templateId,
        details: { dayType: day.day_type, estimatedMinutes: Number(estimatedMinutes.toFixed(1)), targetMinutes },
      });
    }

    const comp = dayComposition(day);
    const dayType = String(day.day_type);
    if (dayType.includes('Upper') && comp.lower > comp.upperPush + comp.upperPull) {
      issues.push({
        code: 'day_focus_mismatch',
        message: `Upper day ${day.day_number} contains more lower-body work than upper-body work.`,
        answers,
        route,
        template: templateId,
        details: { dayType, composition: comp, exercises: day.exercises.map((exercise) => exercise.name) },
      });
    }
    if ((dayType.includes('Lower') || dayType === 'Legs') && comp.upperPush + comp.upperPull > comp.lower + comp.core) {
      issues.push({
        code: 'day_focus_mismatch',
        message: `Lower/legs day ${day.day_number} contains too much upper-body work.`,
        answers,
        route,
        template: templateId,
        details: { dayType, composition: comp, exercises: day.exercises.map((exercise) => exercise.name) },
      });
    }
    if (dayType === 'Push' && comp.upperPull > 0) {
      issues.push({
        code: 'day_focus_mismatch',
        message: `Push day ${day.day_number} includes pull movements.`,
        answers,
        route,
        template: templateId,
        details: { dayType, composition: comp, exercises: day.exercises.map((exercise) => exercise.name) },
      });
    }
    if (dayType === 'Pull' && comp.upperPush > 0) {
      issues.push({
        code: 'day_focus_mismatch',
        message: `Pull day ${day.day_number} includes push movements.`,
        answers,
        route,
        template: templateId,
        details: { dayType, composition: comp, exercises: day.exercises.map((exercise) => exercise.name) },
      });
    }
  }

  const weeklyComposition = plan.days.reduce((total, day) => {
    const comp = dayComposition(day);
    total.lower += comp.lower;
    total.upperPush += comp.upperPush;
    total.upperPull += comp.upperPull;
    total.core += comp.core;
    total.conditioning += comp.conditioning;
    return total;
  }, { lower: 0, upperPush: 0, upperPull: 0, core: 0, conditioning: 0 });

  if (weeklyComposition.lower === 0 || weeklyComposition.upperPush === 0 || weeklyComposition.upperPull === 0) {
    issues.push({
      code: 'weekly_movement_coverage_gap',
      message: 'Plan is missing at least one major movement category across the week.',
      answers,
      route,
      template: templateId,
      details: weeklyComposition,
    });
  }

  if (
    (answers.goal_type === 'lose_weight' || answers.goal_type === 'increase_endurance' || answers.session_emphasis === 'conditioning')
    && answers.training_days_per_week >= 3
    && !hasCardioOrConditioning(plan)
  ) {
    issues.push({
      code: 'goal_conditioning_missing',
      message: 'Fat-loss/endurance/conditioning plan has no conditioning movement or cardio note.',
      answers,
      route,
      template: templateId,
    });
  }

  if (
    answers.experience_level === 'advanced'
    && (answers.goal_type === 'build_muscle' || answers.goal_type === 'gain_weight')
    && answers.training_days_per_week >= 4
    && !exercises.some((exercise) => exercise.technique_type)
  ) {
    issues.push({
      code: 'advanced_hypertrophy_no_intensity_technique',
      message: 'Advanced hypertrophy plan has no controlled set technique assigned.',
      answers,
      route,
      template: templateId,
    });
  }

  for (const exercise of exercises) {
    if (!allowedEquipment.has(exercise.equipment_category)) {
      issues.push({
        code: 'equipment_mismatch',
        message: `${exercise.name} uses ${exercise.equipment_category}, not allowed for ${answers.equipment_access}.`,
        answers,
        route,
        template: templateId,
        details: { exercise: exercise.name, equipment: exercise.equipment_category },
      });
    }

    if (exercise.name === 'Pike Push-Up') {
      issues.push({
        code: 'pike_pushup_default',
        message: 'Pike Push-Up appeared as a generated default.',
        answers,
        route,
        template: templateId,
      });
    }

    const contraindications = exercise.contraindications || [];
    const matchedContra = contraindications.filter((tag) => injuryTags.includes(tag));
    if (matchedContra.length > 0) {
      issues.push({
        code: 'injury_contraindication',
        message: `${exercise.name} matched contraindications for selected injuries.`,
        answers,
        route,
        template: templateId,
        details: { exercise: exercise.name, contraindications: matchedContra },
      });
    }

    if (answers.experience_level === 'beginner' && exercise.technique_type) {
      issues.push({
        code: 'beginner_advanced_technique',
        message: `${exercise.name} has ${exercise.technique_type}; beginners should default to straight sets.`,
        answers,
        route,
        template: templateId,
      });
    }

    if (exercise.technique_type && !DB_ALLOWED_TECHNIQUE_TYPES.has(String(exercise.technique_type))) {
      issues.push({
        code: 'db_technique_type_constraint_mismatch',
        message: `${exercise.name} has technique_type ${exercise.technique_type}, which is not allowed by the DB constraint.`,
        answers,
        route,
        template: templateId,
        details: { exercise: exercise.name, technique_type: exercise.technique_type },
      });
    }

    if (
      answers.experience_level === 'beginner'
      && isCompoundExercise(exercise)
      && exercise.fatigue_cost === 'High'
      && exercise.equipment_category === EquipmentCategory.Barbell
    ) {
      issues.push({
        code: 'beginner_high_fatigue_barbell_default',
        message: `${exercise.name} is a high-fatigue barbell default for a beginner.`,
        answers,
        route,
        template: templateId,
        details: { exercise: exercise.name },
      });
    }

    if (answers.session_emphasis === 'strength' && isStrengthRepRangeExercise(exercise) && exercise.reps_max > 12) {
      issues.push({
        code: 'strength_rep_range_too_high',
        message: `${exercise.name} has reps ${exercise.reps_min}-${exercise.reps_max} in a strength-emphasis plan.`,
        answers,
        route,
        template: templateId,
        details: { exercise: exercise.name, reps: [exercise.reps_min, exercise.reps_max] },
      });
    }

    if (
      (answers.goal_type === 'build_muscle' || answers.goal_type === 'gain_weight')
      && exercise.reps_max < 6
      && String(exercise.architectural_group).startsWith('Isolation_')
    ) {
      issues.push({
        code: 'hypertrophy_isolation_reps_too_low',
        message: `${exercise.name} has low isolation reps for hypertrophy.`,
        answers,
        route,
        template: templateId,
        details: { exercise: exercise.name, reps: [exercise.reps_min, exercise.reps_max] },
      });
    }

    const highRiskCompound = exercise.fatigue_cost === 'High'
      || exercise.architectural_group === 'Primary_Bilateral_Squat'
      || exercise.architectural_group === 'Primary_Bilateral_Hinge';
    const highIntensityTechnique = exercise.technique_type === 'drop_set'
      || exercise.technique_type === 'failure_set'
      || exercise.technique_type === 'rest_pause';
    if (highRiskCompound && highIntensityTechnique) {
      issues.push({
        code: 'unsafe_technique_on_compound',
        message: `${exercise.technique_type} assigned to high-risk compound ${exercise.name}.`,
        answers,
        route,
        template: templateId,
      });
    }
  }

  return issues;
}

function* buildCases(options: ReturnType<typeof parseArgs>) {
  const emphases = options.allSessionEmphasis ? SESSION_EMPHASES : ['no_preference'] as SessionEmphasis[];
  const injuries = injuryProfiles(options.allInjurySubsets);

  for (const goal_type of GOALS) {
    for (const activity_level of ACTIVITY_LEVELS) {
      for (const experience_level of EXPERIENCES) {
        for (const equipment_access of EQUIPMENT) {
          for (const training_days_per_week of DAYS) {
            for (const minutes_per_workout of MINUTES) {
              for (const injuryProfile of injuries) {
                for (const session_emphasis of emphases) {
                  yield {
                    goal_type,
                    activity_level,
                    experience_level,
                    equipment_access,
                    training_days_per_week,
                    training_days: trainingDaysForCount(training_days_per_week),
                    minutes_per_workout,
                    injuries: injuryProfile,
                    session_emphasis,
                  };
                }
              }
            }
          }
        }
      }
    }
  }
}

function issueKey(issue: Issue) {
  return issue.code;
}

async function main() {
  const options = parseArgs(Deno.args);
  const startedAt = Date.now();
  const issues: Issue[] = [];
  const issueCounts: Record<string, number> = {};
  const routeCounts: Record<string, number> = {};
  let checked = 0;

  const originalLog = console.log;
  const originalWarn = console.warn;
  if (!options.verbose) {
    console.log = () => undefined;
    console.warn = () => undefined;
  }

  try {
    for (const answers of buildCases(options)) {
      checked += 1;

      const profile = mapOnboardingToV1(answers);
      const recommendation = routeUserToPlan(profile);
      routeCounts[recommendation.familyIdRef] = (routeCounts[recommendation.familyIdRef] || 0) + 1;

      const family = planFamilies.find((item) => item.external_id === recommendation.familyIdRef);
      if (!family) {
        const issue = {
          code: 'missing_family',
          message: `Router returned missing family ${recommendation.familyIdRef}.`,
          answers,
          route: recommendation.familyIdRef,
        };
        issues.push(issue);
        issueCounts[issueKey(issue)] = (issueCounts[issueKey(issue)] || 0) + 1;
        if (options.failFast) break;
        continue;
      }

      const template = coreTemplates.find((item) => item.external_id === family.template_id);
      if (!template) {
        const issue = {
          code: 'missing_template',
          message: `Family ${family.external_id} references missing template ${family.template_id}.`,
          answers,
          route: family.external_id,
          template: family.template_id,
        };
        issues.push(issue);
        issueCounts[issueKey(issue)] = (issueCounts[issueKey(issue)] || 0) + 1;
        if (options.failFast) break;
        continue;
      }

      if (family.experience_level !== profile.experienceLevel) {
        const issue = {
          code: 'experience_mismatch',
          message: `Family ${family.external_id} is ${family.experience_level}, expected ${profile.experienceLevel}.`,
          answers,
          route: family.external_id,
          template: template.external_id,
        };
        issues.push(issue);
        issueCounts[issueKey(issue)] = (issueCounts[issueKey(issue)] || 0) + 1;
        if (options.failFast) break;
      }

      try {
        const plan = hydrateTemplate(
          template,
          family.external_id,
          {
            goal: profile.primaryGoal,
            environment: profile.environment,
            comfort: profile.liftComfort,
            injuries: answers.injuries,
            experience_level: profile.experienceLevel,
            session_duration_min: profile.sessionDurationMin,
            conditioning_goal: profile.conditioningGoal,
          },
          profile.daysPerWeek,
        );

        for (const issue of validateHydratedPlan(answers, family.external_id, template.external_id, plan)) {
          issues.push(issue);
          issueCounts[issueKey(issue)] = (issueCounts[issueKey(issue)] || 0) + 1;
          if (options.failFast) break;
        }
      } catch (error) {
        const issue = {
          code: 'hydration_error',
          message: error instanceof Error ? error.message : String(error),
          answers,
          route: family.external_id,
          template: template.external_id,
        };
        issues.push(issue);
        issueCounts[issueKey(issue)] = (issueCounts[issueKey(issue)] || 0) + 1;
      }

      if (options.failFast && issues.length > 0) break;
      if (options.sample > 0 && checked >= options.sample) break;
    }
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }

  const durationMs = Date.now() - startedAt;
  const result = {
    checked,
    passed: issues.length === 0,
    issueCount: issues.length,
    issueCounts,
    routeCounts,
    durationMs,
    options,
    examples: issues.slice(0, options.maxIssues),
    issues,
  };

  if (options.json) {
    await Deno.writeTextFile(options.json, JSON.stringify(result, null, 2));
  }

  console.log('Onboarding workout matrix audit');
  console.log(`Checked: ${checked}`);
  console.log(`Issues: ${issues.length}`);
  console.log(`Duration: ${(durationMs / 1000).toFixed(2)}s`);
  console.log(`Routes covered: ${Object.keys(routeCounts).length}`);

  if (issues.length > 0) {
    console.log('\nIssue counts:');
    for (const [code, count] of Object.entries(issueCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${code}: ${count}`);
    }

    console.log(`\nFirst ${Math.min(options.maxIssues, issues.length)} issue example(s):`);
    for (const issue of issues.slice(0, options.maxIssues)) {
      console.log(JSON.stringify(issue, null, 2));
    }
    Deno.exit(1);
  }

  console.log('Result: PASS');
}

if (import.meta.main) {
  await main();
}
