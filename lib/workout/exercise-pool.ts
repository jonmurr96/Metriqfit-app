/**
 * exercise-pool.ts
 *
 * Fetches the system exercise library from Supabase using v2 schema columns
 * and maps them to the ProgramExercise format expected by the generation engine.
 *
 * Bridges v2 schema (primary_muscles[], movement_pattern, equipment_options[])
 * to the legacy ProgramExercise interface (primary_muscle, pattern, equipment_required)
 * so all existing engine files continue to work without changes.
 */

import type { ProgramExercise } from './programMappingRules';
import {
  buildExerciseMetadata,
  isExerciseTierAllowedForPolicy,
  isStandardWorkoutExercise,
  type ExerciseTier,
} from './exercise-priority.ts';
import type { PrimaryGoal, TrainingStylePreference } from './training-profile.ts';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type EquipmentAccess =
  | 'full_gym'
  | 'dumbbells_plus_bench'
  | 'dumbbells_only'
  | 'bodyweight_only'
  | 'other';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type ExercisePoolFilter = {
  equipmentAccess: EquipmentAccess;
  experienceLevel: ExperienceLevel;
  injuries?: string[];
  popularityFloor?: number; // default: 65 beginner, 55 intermediate, 45 advanced
  splitTags?: string[];     // optional: filter to specific split tags (e.g. ['push', 'upper'])
  includeSpecialty?: boolean;
  primaryGoal?: PrimaryGoal;
  trainingStylePreference?: TrainingStylePreference | null;
  sessionDurationMin?: number | null;
};

// ---------------------------------------------------------------------------
// Raw DB row shape (v2 schema)
// ---------------------------------------------------------------------------

export type RawExerciseRow = {
  id: string;
  name: string;
  category: string;
  movement_pattern: string | null;
  equipment: string | null;
  is_compound: boolean;
  muscle_groups: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
  split_tags: string[];
  equipment_options: string[];
  experience_min: string | null;
  difficulty: number | null;
  popularity_score: number;
  force_type: string | null;
  is_unilateral: boolean;
  requires_spotter: boolean;
  joint_stress_level: number;
  is_system_exercise: boolean;
  technique_compatibility: string[];
  cues: string | null;
};

// Extended ProgramExercise with v2 fields attached
export type PoolExercise = ProgramExercise & {
  primary_muscles: string[];
  split_tags: string[];
  equipment_options: string[];
  popularity_score: number;
  experience_min: string | null;
  is_compound: boolean;
  technique_compatibility: string[];
  joint_stress_level: number;
  cues: string | null;
  exercise_tier: ExerciseTier;
};

// ---------------------------------------------------------------------------
// Supabase SELECT string for v2 exercise schema
// ---------------------------------------------------------------------------

export const EXERCISE_SELECT_V2 = [
  'id', 'name', 'category', 'movement_pattern', 'equipment',
  'is_compound', 'muscle_groups', 'primary_muscles', 'secondary_muscles',
  'split_tags', 'equipment_options', 'experience_min', 'difficulty',
  'popularity_score', 'force_type', 'is_unilateral', 'requires_spotter',
  'joint_stress_level', 'is_system_exercise', 'technique_compatibility', 'cues',
].join(', ');

// ---------------------------------------------------------------------------
// Equipment access → allowed equipment tags
// ---------------------------------------------------------------------------

const EQUIPMENT_ACCESS_MAP: Record<EquipmentAccess, string[]> = {
  full_gym: [
    'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight',
    'kettlebell', 'pull_up_bar', 'dip_bar', 'bench', 'ez_bar',
  ],
  dumbbells_plus_bench: ['dumbbell', 'bodyweight', 'bench', 'pull_up_bar', 'dip_bar'],
  dumbbells_only:       ['dumbbell', 'bodyweight', 'pull_up_bar'],
  bodyweight_only:      ['bodyweight', 'pull_up_bar', 'dip_bar'],
  other:                ['bodyweight'],
};

// ---------------------------------------------------------------------------
// Injury → exercise keywords to exclude
// ---------------------------------------------------------------------------

const INJURY_EXCLUSION_KEYWORDS: Record<string, string[]> = {
  shoulders: ['overhead press', 'barbell overhead', 'upright row', 'behind neck', 'skull crusher', 'arnold press'],
  knees:     ['sissy squat', 'nordic hamstring', 'plyometric', 'box jump'],
  back:      ['good morning', 'stiff leg deadlift'],
  wrists:    ['barbell curl', 'skull crusher', 'close grip bench'],
  ankles:    ['box jump', 'calf raise single'],
  hips:      ['deep squat'],
  elbows:    ['skull crusher', 'close grip bench', 'preacher curl'],
  neck:      ['upright row', 'behind neck'],
};

// ---------------------------------------------------------------------------
// Popularity floors by experience level
// ---------------------------------------------------------------------------

const POPULARITY_FLOOR: Record<ExperienceLevel, number> = {
  beginner:     65,
  intermediate: 55,
  advanced:     45,
};

const EXPERIENCE_ORDER: Record<string, number> = {
  beginner: 0, intermediate: 1, advanced: 2,
};

// ---------------------------------------------------------------------------
// Map raw DB row → PoolExercise (legacy fields + v2 extensions)
// ---------------------------------------------------------------------------

export function mapRawToProgramExercise(raw: RawExerciseRow): PoolExercise {
  const mapped: PoolExercise = {
    // Legacy ProgramExercise fields — used by existing engine without changes
    id:                 raw.id,
    name:               raw.name,
    category:           raw.category,
    difficulty:         raw.difficulty != null ? String(raw.difficulty) : null,
    primary_muscle:     raw.primary_muscles?.[0] ?? raw.muscle_groups?.[0] ?? null,
    pattern:            raw.movement_pattern,
    equipment_required: raw.equipment_options?.length
      ? raw.equipment_options
      : raw.equipment
      ? [raw.equipment]
      : [],
    // Extended v2 fields
    primary_muscles:         raw.primary_muscles ?? [],
    split_tags:              raw.split_tags ?? [],
    equipment_options:       raw.equipment_options ?? [],
    popularity_score:        raw.popularity_score ?? 50,
    experience_min:          raw.experience_min ?? 'beginner',
    is_compound:             raw.is_compound ?? false,
    technique_compatibility: raw.technique_compatibility ?? [],
    joint_stress_level:      raw.joint_stress_level ?? 2,
    cues:                    raw.cues ?? null,
    exercise_tier:           'common',
  };

  return {
    ...mapped,
    exercise_tier: 'common',
  };
}

// ---------------------------------------------------------------------------
// Filter functions
// ---------------------------------------------------------------------------

function filterByEquipment(rows: RawExerciseRow[], access: EquipmentAccess): RawExerciseRow[] {
  const allowed = new Set(EQUIPMENT_ACCESS_MAP[access] ?? EQUIPMENT_ACCESS_MAP.bodyweight_only);
  return rows.filter((ex) => {
    const opts = ex.equipment_options?.length ? ex.equipment_options : (ex.equipment ? [ex.equipment] : ['bodyweight']);
    return opts.some((o) => allowed.has(o));
  });
}

function filterByExperience(rows: RawExerciseRow[], level: ExperienceLevel): RawExerciseRow[] {
  const userLevel = EXPERIENCE_ORDER[level] ?? 0;
  return rows.filter((ex) => (EXPERIENCE_ORDER[ex.experience_min ?? 'beginner'] ?? 0) <= userLevel);
}

function filterByPopularity(rows: RawExerciseRow[], floor: number): RawExerciseRow[] {
  return rows.filter((ex) => (ex.popularity_score ?? 50) >= floor);
}

function filterByInjuries(rows: RawExerciseRow[], injuries: string[]): RawExerciseRow[] {
  if (!injuries.length || injuries.includes('none')) return rows;
  const blocked = new Set<string>();
  for (const injury of injuries) {
    (INJURY_EXCLUSION_KEYWORDS[injury] ?? []).forEach((k) => blocked.add(k.toLowerCase()));
  }
  if (!blocked.size) return rows;
  return rows.filter((ex) => {
    const name = (ex.name ?? '').toLowerCase();
    return !Array.from(blocked).some((kw) => name.includes(kw));
  });
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Apply all filters to raw exercise rows and return typed PoolExercise objects
 * ready for consumption by selectExercisesForGeneratedSplitDay().
 */
export function buildExercisePool(
  rawExercises: RawExerciseRow[],
  filter: ExercisePoolFilter,
): PoolExercise[] {
  const floor = filter.popularityFloor ?? POPULARITY_FLOOR[filter.experienceLevel];

  let pool = rawExercises.filter((ex) => ex.is_system_exercise);
  pool = filterByEquipment(pool, filter.equipmentAccess);
  pool = filterByExperience(pool, filter.experienceLevel);

  const popularityValues = pool
    .map((exercise) => exercise.popularity_score ?? 50)
    .filter((value) => Number.isFinite(value));
  const hasPopularitySignal = new Set(popularityValues).size > 1 || popularityValues.some((value) => value > floor);

  if (hasPopularitySignal) {
    pool = filterByPopularity(pool, floor);
  }

  pool = filterByInjuries(pool, filter.injuries ?? []);

  if (filter.splitTags?.length) {
    const tags = new Set(filter.splitTags);
    pool = pool.filter((ex) => ex.split_tags?.some((t) => tags.has(t)));
  }

  const mappedPool = pool.map(mapRawToProgramExercise);
  const context = {
    equipmentAccess: filter.equipmentAccess,
    experienceLevel: filter.experienceLevel,
    injuries: filter.injuries,
    primaryGoal: filter.primaryGoal,
    trainingStylePreference: filter.trainingStylePreference,
    sessionDurationMin: filter.sessionDurationMin,
  };
  const enrichedPool = mappedPool.map((exercise) => {
    const metadata = buildExerciseMetadata(exercise, context);
    return {
      ...exercise,
      exercise_tier: metadata.tier,
    };
  });

  if (filter.includeSpecialty) {
    return enrichedPool;
  }

  return enrichedPool.filter((exercise) => (
    isStandardWorkoutExercise(exercise, context)
    && isExerciseTierAllowedForPolicy(exercise.exercise_tier, context)
  ));
}

/**
 * Warn if the pool is dangerously small after filtering.
 */
export function auditPoolSize(
  pool: PoolExercise[],
  targetExercisesPerDay: number,
  daysPerWeek: number,
): string[] {
  const warnings: string[] = [];
  const minimumRequired = targetExercisesPerDay * daysPerWeek * 1.5; // 50% buffer
  if (pool.length < minimumRequired) {
    warnings.push(
      `Exercise pool has only ${pool.length} exercises after filtering (need ${Math.ceil(minimumRequired)} for adequate variety). ` +
      `Consider broadening equipment access or experience level filters.`,
    );
  }
  return warnings;
}
