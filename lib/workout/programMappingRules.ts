export type WorkoutFocusTag =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'hamstrings'
  | 'glutes'
  | 'core';

export type ExerciseFocusTag =
  | WorkoutFocusTag
  | 'conditioning';

export type ProgramExercise = {
  id: string;
  external_id?: string | null;
  name?: string | null;
  category?: string | null;
  equipment_required?: string[] | null;
  primary_muscle?: string | null;
  pattern?: string | null;
  difficulty?: string | null;
};

export type DayFocusPolicy = {
  focusTags: WorkoutFocusTag[];
  allowedPrimaryFocuses: ExerciseFocusTag[];
  accessoryFocuses: ExerciseFocusTag[];
  mixed: boolean;
  source: 'label' | 'blueprint' | 'auto_derived';
  blueprintGap: boolean;
  rationale: string;
};

export const STRICT_WORKOUT_FOCUS_TAGS = new Set<WorkoutFocusTag>([
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'hamstrings',
  'glutes',
  'core',
]);

const TOKEN_PATTERNS: { tag: WorkoutFocusTag; patterns: string[] }[] = [
  { tag: 'chest', patterns: ['chest', 'pec', 'pecs', 'bench', 'push'] },
  { tag: 'back', patterns: ['back', 'lat', 'lats', 'pull', 'row', 'posterior'] },
  { tag: 'shoulders', patterns: ['shoulder', 'deltoid', 'delts', 'overhead', 'vertical press'] },
  { tag: 'arms', patterns: ['arm', 'arms', 'bicep', 'biceps', 'tricep', 'triceps', 'curl', 'extension'] },
  { tag: 'legs', patterns: ['leg', 'legs', 'quad', 'quads', 'lower body', 'squat'] },
  { tag: 'hamstrings', patterns: ['hamstring', 'hamstrings', 'hinge', 'rdl', 'deadlift'] },
  { tag: 'glutes', patterns: ['glute', 'glutes', 'hip thrust'] },
  { tag: 'core', patterns: ['core', 'ab', 'abs', 'trunk', 'midline'] },
];

const MIXED_FOCUS_DELIMITERS = [' + ', ' & ', '/', ' and ', ' plus ', ','];

const EXERCISE_FOCUS_RULES: Record<
  WorkoutFocusTag,
  {
    primaryTokens: string[];
    includeKeywords: string[];
    excludeKeywords: string[];
  }
> = {
  chest: {
    primaryTokens: ['chest', 'pec'],
    includeKeywords: ['bench', 'chest', 'pec', 'push up', 'pushup', 'dip', 'flye', 'incline press'],
    excludeKeywords: ['leg press', 'shoulder press', 'overhead press', 'row', 'pulldown', 'squat', 'lunge'],
  },
  back: {
    primaryTokens: ['back', 'lat', 'lats', 'trap', 'trapezi', 'rhomboid', 'erector', 'rear_delt'],
    includeKeywords: ['row', 'pulldown', 'pull up', 'pullup', 'chin up', 'chinup', 'face pull', 'seal row', 'back extension'],
    excludeKeywords: ['squat', 'lunge', 'leg press', 'leg extension', 'leg curl', 'nordic', 'bench'],
  },
  shoulders: {
    primaryTokens: ['shoulder', 'delt', 'deltoid'],
    includeKeywords: ['shoulder', 'overhead press', 'lateral raise', 'rear delt', 'arnold press', 'upright row', 'landmine press', 'y raise'],
    excludeKeywords: ['leg', 'squat', 'lunge', 'leg press'],
  },
  arms: {
    primaryTokens: ['bicep', 'tricep', 'forearm', 'arm', 'grip'],
    includeKeywords: ['bicep', 'tricep', 'hammer curl', 'preacher curl', 'concentration curl', 'pushdown', 'skullcrusher', 'triceps extension', 'curl'],
    excludeKeywords: ['leg', 'hamstring', 'nordic', 'squat', 'lunge', 'leg extension', 'leg curl'],
  },
  legs: {
    primaryTokens: ['leg', 'quad', 'quadricep', 'hamstring', 'glute', 'calf', 'adductor', 'abductor'],
    includeKeywords: ['squat', 'lunge', 'split squat', 'leg press', 'hack squat', 'rdl', 'deadlift', 'leg curl', 'leg extension', 'hip thrust', 'calf raise'],
    excludeKeywords: ['bench', 'row', 'pulldown', 'pushdown', 'skullcrusher'],
  },
  hamstrings: {
    primaryTokens: ['hamstring', 'posterior'],
    includeKeywords: ['rdl', 'deadlift', 'good morning', 'hip hinge', 'leg curl', 'nordic'],
    excludeKeywords: ['bench', 'row', 'pulldown', 'shoulder press'],
  },
  glutes: {
    primaryTokens: ['glute'],
    includeKeywords: ['hip thrust', 'bridge', 'kickback', 'abduction', 'split squat', 'lunge'],
    excludeKeywords: ['bench', 'row', 'pulldown', 'curl'],
  },
  core: {
    primaryTokens: ['core', 'ab', 'oblique', 'trunk', 'midline'],
    includeKeywords: ['plank', 'crunch', 'hollow', 'pallof', 'carry', 'dead bug', 'leg raise'],
    excludeKeywords: [],
  },
};

const DAY_LABEL_FALLBACK_BLUEPRINTS: Record<string, WorkoutFocusTag[][]> = {
  bro_split_5: [['chest'], ['back'], ['shoulders'], ['legs'], ['arms']],
  arnold_split_6: [['chest', 'back'], ['shoulders', 'arms'], ['legs'], ['chest', 'back'], ['shoulders', 'arms'], ['legs']],
  ppl_3: [['chest', 'shoulders', 'arms'], ['back', 'arms'], ['legs', 'hamstrings', 'glutes']],
  ppl_6: [
    ['chest', 'shoulders', 'arms'],
    ['back', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
    ['chest', 'shoulders', 'arms'],
    ['back', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
  ],
  ppl_ul_hybrid_5: [
    ['chest', 'shoulders', 'arms'],
    ['back', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
    ['chest', 'back', 'shoulders', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
  ],
  upper_lower_4: [
    ['chest', 'back', 'shoulders', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
    ['chest', 'back', 'shoulders', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
  ],
  upper_lower_5: [
    ['chest', 'back', 'shoulders', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
    ['chest', 'back', 'shoulders', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
    ['arms', 'shoulders', 'core'],
  ],
  phul_4: [
    ['chest', 'back', 'shoulders', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
    ['chest', 'back', 'shoulders', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
  ],
  phat_5: [
    ['chest', 'back', 'shoulders'],
    ['legs', 'hamstrings', 'glutes'],
    ['back', 'shoulders'],
    ['legs', 'hamstrings', 'glutes'],
    ['chest', 'arms'],
  ],
  full_body_beginner_3: [
    ['legs', 'chest', 'back', 'core'],
    ['legs', 'chest', 'back', 'core'],
    ['legs', 'chest', 'back', 'core'],
  ],
  full_body_strength_3: [
    ['legs', 'chest', 'back', 'core'],
    ['legs', 'chest', 'back', 'core'],
    ['legs', 'chest', 'back', 'core'],
  ],
  novice_linear_strength_3: [
    ['legs', 'chest', 'back', 'core'],
    ['legs', 'chest', 'back', 'core'],
    ['legs', 'chest', 'back', 'core'],
  ],
  five_three_one_variant_4: [
    ['legs', 'hamstrings', 'glutes', 'core'],
    ['chest', 'shoulders', 'arms'],
    ['back', 'hamstrings', 'glutes'],
    ['chest', 'back', 'shoulders', 'arms'],
  ],
  conjugate_4: [
    ['chest', 'shoulders', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
    ['chest', 'back', 'shoulders', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
  ],
  athletic_performance_5: [
    ['legs', 'glutes', 'core'],
    ['chest', 'back', 'shoulders'],
    ['core'],
    ['chest', 'back', 'shoulders', 'arms'],
    ['legs', 'hamstrings', 'glutes', 'core'],
  ],
  conditioning_hybrid_4: [
    ['legs', 'chest', 'back'],
    ['core'],
    ['back', 'hamstrings', 'glutes'],
    ['core'],
  ],
  calisthenics_foundation_4: [
    ['chest', 'shoulders', 'arms', 'core'],
    ['back', 'arms', 'core'],
    ['legs', 'glutes', 'core'],
    ['core', 'shoulders', 'back'],
  ],
  rehab_resilience_3: [
    ['legs', 'glutes', 'core'],
    ['shoulders', 'back', 'core'],
    ['legs', 'glutes', 'core'],
  ],
  minimalist_full_body_2: [
    ['legs', 'chest', 'back', 'core'],
    ['legs', 'chest', 'back', 'core'],
  ],
  home_dumbbell_4: [
    ['chest', 'shoulders', 'arms'],
    ['back', 'arms'],
    ['legs', 'hamstrings', 'glutes'],
    ['chest', 'back', 'core'],
  ],
  bodyweight_only_3: [
    ['legs', 'chest', 'back', 'core'],
    ['legs', 'chest', 'back', 'core'],
    ['legs', 'chest', 'back', 'core'],
  ],
  glute_focus_4: [
    ['legs', 'glutes', 'hamstrings'],
    ['chest', 'back', 'shoulders'],
    ['legs', 'glutes', 'hamstrings'],
    ['glutes', 'core'],
  ],
  general_fitness_beginner_3: [
    ['legs', 'chest', 'back', 'core'],
    ['legs', 'chest', 'back', 'core'],
    ['legs', 'chest', 'back', 'core'],
  ],
  powerbuilding_5: [
    ['legs', 'hamstrings', 'glutes'],
    ['chest', 'back', 'shoulders', 'arms'],
    ['back', 'hamstrings', 'glutes'],
    ['chest', 'back', 'shoulders', 'arms'],
    ['legs', 'hamstrings', 'glutes', 'core'],
  ],
};

const DEFAULT_DERIVED_BLUEPRINT: WorkoutFocusTag[][] = [
  ['legs', 'chest', 'back', 'core'],
  ['back', 'arms', 'core'],
  ['legs', 'hamstrings', 'glutes', 'core'],
  ['chest', 'shoulders', 'arms'],
  ['legs', 'chest', 'back', 'core'],
  ['back', 'arms', 'core'],
  ['legs', 'hamstrings', 'glutes', 'core'],
];

const EQUIPMENT_ALIAS_MAP: Record<string, string[]> = {
  full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band', 'smith_machine', 'bench', 'kettlebell', 'cardio_machine', 'freeweight_or_machine'],
  none: ['bodyweight'],
  freeweight_or_machine: ['barbell', 'dumbbell', 'machine', 'smith_machine', 'freeweight_or_machine'],
  bodyweight: ['none', 'bodyweight'],
  bands: ['band', 'resistance_band', 'bands'],
  resistance_band: ['band', 'resistance_band', 'bands'],
  dumbbells_only: ['dumbbell', 'bodyweight', 'none'],
  dumbbells_plus_bench: ['dumbbell', 'bench', 'bodyweight', 'none'],
  bodyweight_only: ['bodyweight', 'none'],
  bands_only: ['band', 'bands', 'resistance_band', 'bodyweight', 'none'],
};

export function normalizeWorkoutToken(value: string) {
  return (value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ');
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function normalizeEquipmentTag(tag: string) {
  return normalizeWorkoutToken(String(tag || '')).replace(/\s+/g, '_');
}

export function expandEquipmentTags(tags: string[] | null | undefined): string[] {
  const normalized = (tags || []).map((tag) => normalizeEquipmentTag(tag)).filter(Boolean);
  const expanded = new Set<string>();

  for (const tag of normalized) {
    expanded.add(tag);
    const aliases = EQUIPMENT_ALIAS_MAP[tag] || [];
    for (const alias of aliases) {
      expanded.add(normalizeEquipmentTag(alias));
    }
  }

  if (expanded.has('none')) expanded.add('bodyweight');
  if (expanded.has('bodyweight')) expanded.add('none');

  return Array.from(expanded);
}

export function isExerciseEquipmentCompatible(
  exerciseEquipment: string[] | null | undefined,
  allowedEquipment: string[] | null | undefined,
) {
  if (!allowedEquipment || !allowedEquipment.length) return true;
  if (!exerciseEquipment || !exerciseEquipment.length) return true;

  const allowed = new Set(expandEquipmentTags(allowedEquipment));
  const required = expandEquipmentTags(exerciseEquipment);

  return required.every((tag) => allowed.has(tag));
}

function matchesPattern(text: string, pattern: string) {
  const normalizedPattern = normalizeWorkoutToken(pattern);
  if (!normalizedPattern) return false;
  if (normalizedPattern.includes(' ')) return text.includes(normalizedPattern);
  const tokens = new Set(text.split(' ').filter(Boolean));
  return tokens.has(normalizedPattern);
}

function inferTagsFromText(dayName: string, dayFocus: string | null): WorkoutFocusTag[] {
  const text = normalizeWorkoutToken(`${dayName || ''} ${dayFocus || ''}`);
  const inferred: WorkoutFocusTag[] = [];

  for (const rule of TOKEN_PATTERNS) {
    if (rule.patterns.some((pattern) => matchesPattern(text, pattern))) {
      inferred.push(rule.tag);
    }
  }

  if (!inferred.length && ['full body', 'balanced', 'mixed'].some((pattern) => text.includes(pattern))) {
    return [];
  }

  return unique(inferred.filter((tag) => STRICT_WORKOUT_FOCUS_TAGS.has(tag)));
}

export function inferWorkoutFocusTags(dayName: string, dayFocus: string | null): WorkoutFocusTag[] {
  return inferTagsFromText(dayName, dayFocus);
}

function isMixedFocusLabel(dayName: string, dayFocus: string | null) {
  const text = normalizeWorkoutToken(`${dayName || ''} ${dayFocus || ''}`);
  return MIXED_FOCUS_DELIMITERS.some((token) => text.includes(token.trim()));
}

function cycleBlueprint(blueprint: WorkoutFocusTag[][], dayIndex: number): WorkoutFocusTag[] {
  if (!blueprint.length) return [];
  const index = Math.max(0, dayIndex - 1) % blueprint.length;
  return blueprint[index] || [];
}

function autoDeriveBlueprint(
  familyKey: string | null | undefined,
  daysPerWeek: number,
  goalTags: string[] | null | undefined,
): WorkoutFocusTag[][] {
  const normalizedFamily = normalizeEquipmentTag(String(familyKey || ''));
  if (normalizedFamily && DAY_LABEL_FALLBACK_BLUEPRINTS[normalizedFamily]) {
    return DAY_LABEL_FALLBACK_BLUEPRINTS[normalizedFamily];
  }

  const normalizedGoals = (goalTags || []).map((goal) => normalizeWorkoutToken(String(goal))).filter(Boolean);
  const wantsConditioning = normalizedGoals.some((goal) => goal.includes('conditioning') || goal.includes('endurance') || goal.includes('fat loss'));

  if (wantsConditioning && daysPerWeek <= 4) {
    return [
      ['legs', 'chest', 'back'],
      ['core'],
      ['legs', 'hamstrings', 'glutes'],
      ['core'],
    ];
  }

  return DEFAULT_DERIVED_BLUEPRINT;
}

function expandAllowedPrimaryFocuses(focusTags: WorkoutFocusTag[]): ExerciseFocusTag[] {
  const allowed = new Set<ExerciseFocusTag>();

  for (const tag of focusTags) {
    if (tag === 'chest') {
      allowed.add('chest');
      allowed.add('shoulders');
      allowed.add('arms');
      continue;
    }

    if (tag === 'back') {
      allowed.add('back');
      allowed.add('arms');
      continue;
    }

    if (tag === 'shoulders') {
      allowed.add('shoulders');
      allowed.add('arms');
      continue;
    }

    if (tag === 'arms') {
      allowed.add('arms');
      continue;
    }

    if (tag === 'legs') {
      allowed.add('legs');
      allowed.add('hamstrings');
      allowed.add('glutes');
      continue;
    }

    if (tag === 'hamstrings') {
      allowed.add('hamstrings');
      allowed.add('legs');
      allowed.add('glutes');
      continue;
    }

    if (tag === 'glutes') {
      allowed.add('glutes');
      allowed.add('legs');
      allowed.add('hamstrings');
      continue;
    }

    if (tag === 'core') {
      allowed.add('core');
      continue;
    }
  }

  return Array.from(allowed);
}

export function resolveDayFocusPolicy(input: {
  dayName: string;
  dayFocus: string | null;
  familyKey?: string | null;
  dayIndex: number;
  daysPerWeek?: number | null;
  goalTags?: string[] | null;
}): DayFocusPolicy {
  const focusFromLabel = inferTagsFromText(input.dayName, input.dayFocus);
  if (focusFromLabel.length > 0) {
    return {
      focusTags: focusFromLabel,
      allowedPrimaryFocuses: expandAllowedPrimaryFocuses(focusFromLabel),
      accessoryFocuses: ['core'],
      mixed: isMixedFocusLabel(input.dayName, input.dayFocus) || focusFromLabel.length > 1,
      source: 'label',
      blueprintGap: false,
      rationale: 'Parsed focus directly from day label/focus copy.',
    };
  }

  const normalizedFamily = normalizeEquipmentTag(String(input.familyKey || ''));
  const explicitBlueprint = normalizedFamily ? DAY_LABEL_FALLBACK_BLUEPRINTS[normalizedFamily] : null;
  if (explicitBlueprint && explicitBlueprint.length) {
    const tags = cycleBlueprint(explicitBlueprint, input.dayIndex);
    return {
      focusTags: tags,
      allowedPrimaryFocuses: expandAllowedPrimaryFocuses(tags),
      accessoryFocuses: ['core'],
      mixed: tags.length > 1,
      source: 'blueprint',
      blueprintGap: false,
      rationale: 'Used explicit family blueprint for generic day labeling.',
    };
  }

  const derivedBlueprint = autoDeriveBlueprint(normalizedFamily, Number(input.daysPerWeek || 0), input.goalTags || []);
  const derivedTags = cycleBlueprint(derivedBlueprint, input.dayIndex);

  return {
    focusTags: derivedTags,
    allowedPrimaryFocuses: expandAllowedPrimaryFocuses(derivedTags),
    accessoryFocuses: ['core'],
    mixed: derivedTags.length > 1,
    source: 'auto_derived',
    blueprintGap: true,
    rationale: 'Auto-derived blueprint because explicit family/day mapping was unavailable.',
  };
}

function inferFocusFromDescriptorTokens(descriptor: string, primary: string, pattern: string): ExerciseFocusTag | null {
  const normalizedPattern = normalizeWorkoutToken(pattern || '');

  if (
    normalizedPattern.includes('cardio')
    || normalizedPattern.includes('conditioning')
    || descriptor.includes('cardio')
    || descriptor.includes('conditioning')
  ) {
    return 'conditioning';
  }

  if (
    normalizedPattern.includes('anti extension')
    || normalizedPattern.includes('anti rotation')
    || normalizedPattern.includes('spinal flexion')
    || normalizedPattern.includes('core')
    || descriptor.includes('plank')
    || descriptor.includes('crunch')
    || descriptor.includes('pallof')
    || descriptor.includes('dead bug')
    || descriptor.includes('leg raise')
    || descriptor.includes('ab wheel')
  ) {
    return 'core';
  }

  if (
    normalizedPattern.includes('biceps')
    || normalizedPattern.includes('triceps')
    || normalizedPattern.includes('grip')
    || primary.includes('bicep')
    || primary.includes('tricep')
    || primary.includes('forearm')
    || descriptor.includes('curl')
    || descriptor.includes('pushdown')
    || descriptor.includes('skull crusher')
  ) {
    return 'arms';
  }

  if (
    normalizedPattern.includes('vertical push')
    || normalizedPattern.includes('lateral raise')
    || normalizedPattern.includes('front raise')
    || normalizedPattern.includes('shoulder accessory')
    || primary.includes('shoulder')
    || primary.includes('delt')
  ) {
    return 'shoulders';
  }

  if (
    normalizedPattern.includes('horizontal push')
    || normalizedPattern.includes('chest isolation')
    || primary.includes('chest')
    || primary.includes('pec')
    || descriptor.includes('bench press')
    || descriptor.includes('push up')
    || descriptor.includes('pec deck')
  ) {
    return 'chest';
  }

  if (
    normalizedPattern.includes('horizontal pull')
    || normalizedPattern.includes('vertical pull')
    || normalizedPattern.includes('rear delt isolation')
    || normalizedPattern.includes('shrug')
    || primary.includes('lat')
    || primary.includes('back')
    || primary.includes('trap')
    || descriptor.includes('row')
    || descriptor.includes('pulldown')
    || descriptor.includes('pull up')
    || descriptor.includes('chin up')
  ) {
    return 'back';
  }

  if (
    normalizedPattern.includes('ham isolation')
    || normalizedPattern.includes('hinge')
    || primary.includes('hamstring')
  ) {
    return 'hamstrings';
  }

  if (
    normalizedPattern.includes('glute isolation')
    || primary.includes('glute')
    || descriptor.includes('hip thrust')
    || descriptor.includes('glute bridge')
  ) {
    return 'glutes';
  }

  if (
    normalizedPattern.includes('squat')
    || normalizedPattern.includes('unilateral lower')
    || normalizedPattern.includes('knee isolation')
    || normalizedPattern.includes('calves')
    || primary.includes('quad')
    || primary.includes('calf')
    || primary.includes('adductor')
    || primary.includes('abductor')
    || descriptor.includes('leg press')
    || descriptor.includes('lunge')
  ) {
    return 'legs';
  }

  return null;
}

export function inferPrimaryExerciseFocus(exercise: ProgramExercise): ExerciseFocusTag | null {
  const descriptor = normalizeWorkoutToken(
    `${exercise.name || ''} ${exercise.category || ''} ${exercise.primary_muscle || ''} ${exercise.pattern || ''}`,
  );
  const primary = normalizeWorkoutToken(exercise.primary_muscle || '');
  const pattern = normalizeWorkoutToken(exercise.pattern || '');

  return inferFocusFromDescriptorTokens(descriptor, primary, pattern);
}

export function exerciseMatchesWorkoutFocus(
  exercise: { name?: string | null; category?: string | null; primary_muscle?: string | null; pattern?: string | null },
  focusTags: WorkoutFocusTag[],
) {
  if (!focusTags.length) return true;

  const descriptor = normalizeWorkoutToken(
    `${exercise.name || ''} ${exercise.category || ''} ${exercise.primary_muscle || ''} ${exercise.pattern || ''}`,
  );
  const primary = normalizeWorkoutToken(exercise.primary_muscle || '');

  return focusTags.some((focusTag) => {
    const matcher = EXERCISE_FOCUS_RULES[focusTag];
    if (!matcher) return false;

    if (matcher.excludeKeywords.some((pattern) => descriptor.includes(pattern))) return false;
    if (matcher.primaryTokens.some((token) => primary.includes(token))) return true;
    if (primary.length > 0) return false;
    return matcher.includeKeywords.some((pattern) => descriptor.includes(pattern));
  });
}

export function isExerciseAllowedForDayPolicy(exercise: ProgramExercise, policy: DayFocusPolicy): boolean {
  if (!policy.focusTags.length) return true;

  const primaryFocus = inferPrimaryExerciseFocus(exercise);
  if (!primaryFocus) {
    return exerciseMatchesWorkoutFocus(exercise, policy.focusTags);
  }

  if (policy.allowedPrimaryFocuses.includes(primaryFocus)) return true;
  if (policy.accessoryFocuses.includes(primaryFocus)) return true;

  return false;
}

export function stableHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}
