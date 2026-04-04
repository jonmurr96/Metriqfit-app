/**
 * Workout Service - Production Implementation
 *
 * Handles:
 * - Exercise library (175 exercises)
 * - Workout programs/templates
 * - Active workout sessions (start, log sets, finish)
 * - Workout history
 * - Personal records (PR) detection
 * - Training statistics
 */

import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase/types';
import {
  buildMappingRowsFromV1Day,
  buildMappingRowsFromV2Day,
  remediateDayExerciseMappings,
} from '../lib/workout/programMappingEngine';
import {
  buildSessionExerciseSnapshotInsertAttempts,
  buildSessionExerciseSnapshots,
} from '../lib/workout/session-snapshot';
import type { ProgramExercise } from '../lib/workout/programMappingRules';
import {
  normalizeWorkoutDayType,
  type WorkoutProgramCatalogItem,
  type WorkoutProgramDayBlueprint,
  type UserWorkoutPlanProgramMeta,
  type WeeklyLayoutAssignment,
} from '../lib/workout/program-catalog';
import {
  getSessionStartLocalDateKey,
  isWorkoutSessionExpiredForLocalDay,
} from '../lib/workout/session-lifecycle';
import { awardXP, updateStreak } from './gamificationService';
const db = supabase as any;

async function insertSessionExercisesWithFallback(
  rows: ReturnType<typeof buildSessionExerciseSnapshots>,
) {
  let lastError: unknown = null;

  for (const attempt of buildSessionExerciseSnapshotInsertAttempts(rows)) {
    const { error } = await supabase
      .from('session_exercises')
      .insert(attempt);

    if (!error) {
      return;
    }

    lastError = error;
  }

  throw lastError;
}

async function loadSessionExerciseSnapshotRows(input: {
  sessionId: string;
  planDayId?: string | null;
  templateDayId?: string | null;
}) {
  if (input.planDayId) {
    const { data: planExercises, error: planError } = await supabase
      .from('user_workout_plan_exercises')
      .select('*')
      .eq('plan_day_id', input.planDayId)
      .order('order_index');

    if (planError) {
      throw planError;
    }

    return buildSessionExerciseSnapshots({
      sessionId: input.sessionId,
      source: 'plan',
      exercises: planExercises || [],
    });
  }

  if (input.templateDayId) {
    const { data: templateExercises, error: templateError } = await supabase
      .from('workout_template_exercises')
      .select('*')
      .eq('template_day_id', input.templateDayId)
      .order('order_index');

    if (templateError) {
      throw templateError;
    }

    return buildSessionExerciseSnapshots({
      sessionId: input.sessionId,
      source: 'template',
      exercises: templateExercises || [],
    });
  }

  return [];
}

// ============================================================================
// Types
// ============================================================================

export type Exercise = Database['public']['Tables']['exercises']['Row'];
export type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row'];
export type WorkoutTemplateDay = Database['public']['Tables']['workout_template_days']['Row'];
export type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row'];
export type SessionExercise = Database['public']['Tables']['session_exercises']['Row'];
export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row'];
export type UserPR = Database['public']['Tables']['user_prs']['Row'];

export interface ExerciseFilters {
  category?: string;
  equipment?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  search?: string;
  referenceOnly?: boolean;
  sourceProvider?: string;
  hasMedia?: boolean;
  sortBy?: 'name' | 'has_media';
  sortAscending?: boolean;
}

export type { WorkoutProgramCatalogItem, WeeklyLayoutAssignment, UserWorkoutPlanProgramMeta };

// Extended types with joins
export interface WorkoutTemplateWithDays extends WorkoutProgramCatalogItem {
  external_id: string | null;
  split_type: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  days: (WorkoutTemplateDay & {
    day_type: string | null;
    estimated_duration_min: number | null;
    exercises: {
      id: string;
      exercise_id: string;
      order_index: number;
      sets_target: number;
      reps_min: number;
      reps_max: number;
      rest_seconds: number | null;
      tempo: string | null;
      notes: string | null;
      exercise: Exercise;
    }[];
  })[];
}

export interface WorkoutSessionWithDetails extends WorkoutSession {
  plan_day?: {
    id: string;
    name: string;
    focus: string | null;
  } | null;
  exercises: (SessionExercise & {
    exercise: Exercise;
    sets: WorkoutSet[];
    plan_exercise?: {
      tempo: string | null;
    } | null;
    tempo: string | null;
    reps_target: string | null;
  })[];
}

export interface WorkoutStats {
  totalSessions: number;
  totalVolumeLb: number; // weight × reps across all sets
  totalSets: number;
  totalReps: number;
  avgDurationMinutes: number;
  sessionsPerWeek: number;
  mostFrequentExercises: {
    exerciseId: string;
    exerciseName: string;
    timesPerformed: number;
  }[];
}

export interface WorkoutNoteItem {
  id: string;
  type: 'session' | 'exercise';
  sessionId: string;
  sessionName: string;
  note: string;
  logDate: string;
  exerciseId?: string;
  exerciseName?: string;
}

async function expireAbandonedSessionAtDayBoundary(
  session: Pick<WorkoutSession, 'id' | 'plan_day_id' | 'started_at'>,
): Promise<void> {
  const scheduledDate = getSessionStartLocalDateKey(session.started_at);

  const { data: sessionExerciseRows, error: sessionExerciseError } = await supabase
    .from('session_exercises')
    .select('id')
    .eq('session_id', session.id);

  if (sessionExerciseError) {
    throw sessionExerciseError;
  }

  const sessionExerciseIds = (sessionExerciseRows || []).map((row) => row.id);

  if (sessionExerciseIds.length > 0) {
    const { error: deleteSetsError } = await supabase
      .from('workout_sets')
      .delete()
      .in('session_exercise_id', sessionExerciseIds);

    if (deleteSetsError) {
      throw deleteSetsError;
    }
  }

  const { error: deleteExercisesError } = await supabase
    .from('session_exercises')
    .delete()
    .eq('session_id', session.id);

  if (deleteExercisesError) {
    throw deleteExercisesError;
  }

  const { error: deleteSessionError } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', session.id);

  if (deleteSessionError) {
    throw deleteSessionError;
  }

  if (session.plan_day_id && scheduledDate) {
    const { error: scheduleUpdateError } = await db
      .from('user_workout_plan_schedule')
      .update({
        status: 'missed',
        completed_session_id: null,
      })
      .eq('plan_day_id', session.plan_day_id)
      .eq('scheduled_date', scheduledDate)
      .eq('session_type', 'workout')
      .neq('status', 'completed')
      .neq('status', 'rescheduled');

    if (scheduleUpdateError) {
      throw scheduleUpdateError;
    }
  }
}

function toBlueprintDay(input: any, sequenceIndex: number, exerciseCount: number): WorkoutProgramDayBlueprint {
  return {
    id: input.id,
    sequenceIndex,
    dayType: normalizeWorkoutDayType(input.day_type),
    name: input.name || `Day ${sequenceIndex}`,
    focus: input.focus || null,
    estimatedDurationMin: input.estimated_duration_min ?? null,
    exerciseCount,
  };
}

function mapV2CatalogItem(template: any): WorkoutProgramCatalogItem {
  const blueprint = (template.days || [])
    .sort((a: any, b: any) => (a.sequence_index || 0) - (b.sequence_index || 0))
    .map((day: any) =>
      toBlueprintDay(
        day,
        Number(day.sequence_index || 0),
        Number(day.exercise_count || day.blocks?.reduce((sum: number, block: any) => sum + ((block.exercises || []).length), 0) || 0),
      ),
    );

  return {
    id: template.id,
    name: template.name,
    description: template.description || null,
    difficulty: template.difficulty || null,
    daysPerWeek: template.days_per_week || 0,
    durationWeeks: template.duration_weeks || null,
    familyKey: template.family?.external_key || null,
    familyDisplayName: template.family?.display_name || null,
    progressionModel: template.progression_model || null,
    goalTags: template.goal_tags || [],
    trainingStyleTags: template.training_style_tags || [],
    equipmentRequired: template.equipment_required || [],
    targetAudience: template.target_audience || null,
    sourceModel: 'v2_template',
    dayBlueprint: blueprint,
  };
}

function mapLegacyCatalogItem(template: any): WorkoutProgramCatalogItem {
  const blueprint = (template.days || [])
    .sort((a: any, b: any) => (a.day_number || 0) - (b.day_number || 0))
    .map((day: any) =>
      toBlueprintDay(
        {
          ...day,
          day_type: day.is_rest_day ? 'rest' : 'workout',
        },
        Number(day.day_number || 0),
        Number(day.exercise_count || day.exercises?.length || 0),
      ),
    );

  return {
    id: template.id,
    name: template.name,
    description: template.description || null,
    difficulty: template.difficulty || null,
    daysPerWeek: template.days_per_week || 0,
    durationWeeks: template.duration_weeks || null,
    familyKey: template.split_type || null,
    familyDisplayName: template.split_type ? String(template.split_type).replaceAll('_', ' ') : 'Legacy Program',
    progressionModel: null,
    goalTags: template.goal_tags || [],
    trainingStyleTags: [],
    equipmentRequired: template.equipment_required || [],
    targetAudience: template.target_audience || null,
    sourceModel: 'legacy_template',
    dayBlueprint: blueprint,
  };
}

async function loadMappingExercisePool(): Promise<ProgramExercise[]> {
  const { data, error } = await db
    .from('exercises')
    .select('id, external_id, name, category, equipment_required, primary_muscle, pattern, difficulty')
    .limit(5000);

  if (error) throw error;
  return (data || []) as ProgramExercise[];
}

function remapV2TemplateDaysAtRuntime(input: {
  templateId: string;
  templateName: string;
  daysPerWeek: number;
  familyKey: string | null;
  templateEquipment: string[];
  days: any[];
  exercisePool: ProgramExercise[];
}) {
  const exerciseById = new Map<string, ProgramExercise>(
    input.exercisePool.filter((item) => !!item?.id).map((item) => [item.id, item]),
  );

  let changedRows = 0;

  const days = (input.days || []).map((day) => {
    if (day.day_type && day.day_type !== 'workout') return day;

    const rows = buildMappingRowsFromV2Day(day);
    if (!rows.length) return day;

    const remediation = remediateDayExerciseMappings({
      dayId: day.id,
      dayName: day.name,
      dayFocus: day.focus,
      dayIndex: Number(day.sequence_index || day.day_number || 1),
      daysPerWeek: Number(input.daysPerWeek || 0),
      familyKey: input.familyKey,
      goalTags: [],
      templateEquipment: input.templateEquipment || [],
      rows,
      exercisePool: input.exercisePool,
    });

    if (remediation.unresolvedRows.length > 0) {
      throw new Error(
        `Template ${input.templateId} (${input.templateName}) day "${day.name}" has invalid mappings and no runtime replacement candidates.`,
      );
    }

    if (!remediation.changedRows.length) return day;

    changedRows += remediation.changedRows.length;
    const replacementByRowId = remediation.replacementByRowId;

    return {
      ...day,
      blocks: (day.blocks || []).map((block: any) => ({
        ...block,
        exercises: (block.exercises || []).map((exerciseRow: any) => {
          const nextExerciseId = replacementByRowId[exerciseRow.id] || exerciseRow.exercise_id;
          if (nextExerciseId === exerciseRow.exercise_id) return exerciseRow;

          const nextExercise = exerciseById.get(nextExerciseId);
          if (!nextExercise) {
            throw new Error(
              `Template ${input.templateId} (${input.templateName}) produced replacement ${nextExerciseId} not found in exercise pool.`,
            );
          }

          return {
            ...exerciseRow,
            exercise_id: nextExerciseId,
            exercise: {
              ...(exerciseRow.exercise || {}),
              id: nextExercise.id,
              external_id: nextExercise.external_id || null,
              name: nextExercise.name || exerciseRow.exercise?.name || 'Unknown exercise',
              category: nextExercise.category || exerciseRow.exercise?.category || 'other',
              equipment_required: nextExercise.equipment_required || [],
              primary_muscle: nextExercise.primary_muscle || null,
              pattern: nextExercise.pattern || null,
              difficulty: nextExercise.difficulty || null,
            },
          };
        }),
      })),
    };
  });

  return { days, changedRows };
}

function remapV1TemplateDaysAtRuntime(input: {
  templateId: string;
  templateName: string;
  daysPerWeek: number;
  templateEquipment: string[];
  days: any[];
  exercisePool: ProgramExercise[];
}) {
  const exerciseById = new Map<string, ProgramExercise>(
    input.exercisePool.filter((item) => !!item?.id).map((item) => [item.id, item]),
  );

  let changedRows = 0;

  const days = (input.days || []).map((day) => {
    const rows = buildMappingRowsFromV1Day(day);
    if (!rows.length) return day;

    const remediation = remediateDayExerciseMappings({
      dayId: day.id,
      dayName: day.name,
      dayFocus: day.focus,
      dayIndex: Number(day.day_number || day.sequence_index || 1),
      daysPerWeek: Number(input.daysPerWeek || 0),
      familyKey: null,
      goalTags: [],
      templateEquipment: input.templateEquipment || [],
      rows,
      exercisePool: input.exercisePool,
    });

    if (remediation.unresolvedRows.length > 0) {
      throw new Error(
        `Template ${input.templateId} (${input.templateName}) day "${day.name}" has invalid mappings and no runtime replacement candidates.`,
      );
    }

    if (!remediation.changedRows.length) return day;

    changedRows += remediation.changedRows.length;
    const replacementByRowId = remediation.replacementByRowId;

    return {
      ...day,
      exercises: (day.exercises || []).map((exerciseRow: any) => {
        const nextExerciseId = replacementByRowId[exerciseRow.id] || exerciseRow.exercise_id;
        if (nextExerciseId === exerciseRow.exercise_id) return exerciseRow;

        const nextExercise = exerciseById.get(nextExerciseId);
        if (!nextExercise) {
          throw new Error(
            `Template ${input.templateId} (${input.templateName}) produced replacement ${nextExerciseId} not found in exercise pool.`,
          );
        }

        return {
          ...exerciseRow,
          exercise_id: nextExerciseId,
          exercise: {
            ...(exerciseRow.exercise || {}),
            id: nextExercise.id,
            external_id: nextExercise.external_id || null,
            name: nextExercise.name || exerciseRow.exercise?.name || 'Unknown exercise',
            category: nextExercise.category || exerciseRow.exercise?.category || 'other',
            equipment_required: nextExercise.equipment_required || [],
            primary_muscle: nextExercise.primary_muscle || null,
            pattern: nextExercise.pattern || null,
            difficulty: nextExercise.difficulty || null,
          },
        };
      }),
    };
  });

  return { days, changedRows };
}

// ============================================================================
// Programs / Templates
// ============================================================================

/**
 * Get all public workout programs/templates
 */
export async function getPrograms(): Promise<WorkoutProgramCatalogItem[]> {
  const { data: v2Templates, error: v2Error } = await db
    .from('workout_program_templates_v2')
    .select(
      `
      *,
      family:workout_program_families(external_key,display_name),
      days:workout_program_days_v2(
        id,
        sequence_index,
        day_type,
        name,
        focus,
        estimated_duration_min,
        blocks:workout_program_day_blocks_v2(
          id,
          exercises:workout_program_block_exercises_v2(id)
        )
      )
    `,
    )
    .eq('is_public', true)
    .order('name', { ascending: true });

  if (!v2Error && (v2Templates || []).length > 0) {
    return (v2Templates || []).map(mapV2CatalogItem);
  }

  const { data, error } = await supabase
    .from('workout_templates')
    .select(
      `
      *,
      days:workout_template_days(
        id,
        day_number,
        name,
        focus,
        is_rest_day,
        exercises:workout_template_exercises(id)
      )
    `,
    )
    .eq('is_public', true)
    .order('name');
  if (error) throw error;
  return (data || []).map(mapLegacyCatalogItem);
}

/**
 * Get a specific program with its days and exercises
 */
export async function getProgramWithDays(programId: string): Promise<WorkoutTemplateWithDays> {
  const { data: v2Program, error: v2Error } = await db
    .from('workout_program_templates_v2')
    .select(
      `
      *,
      family:workout_program_families(external_key,display_name),
      days:workout_program_days_v2(
        *,
        blocks:workout_program_day_blocks_v2(
          *,
          exercises:workout_program_block_exercises_v2(
            *,
            exercise:exercises(*)
          )
        )
      )
    `,
    )
    .eq('id', programId)
    .maybeSingle();

  if (!v2Error && v2Program) {
    const exercisePool = await loadMappingExercisePool();
    const remappedV2 = remapV2TemplateDaysAtRuntime({
      templateId: v2Program.id,
      templateName: v2Program.name,
      daysPerWeek: Number(v2Program.days_per_week || 0),
      familyKey: v2Program.family?.external_key || null,
      templateEquipment: v2Program.equipment_required || [],
      days: v2Program.days || [],
      exercisePool,
    });

    if (remappedV2.changedRows > 0) {
      console.warn(
        `[workoutService] Auto-remapped ${remappedV2.changedRows} template exercises while loading v2 template ${v2Program.id}.`,
      );
    }

    const baseProgram = mapV2CatalogItem({
      ...v2Program,
      days: remappedV2.days,
    });

    const mappedProgram: WorkoutTemplateWithDays = {
      ...baseProgram,
      external_id: v2Program.external_id || `v2_${v2Program.id}`,
      split_type: v2Program.family?.external_key || 'custom',
      is_public: v2Program.is_public,
      created_at: v2Program.created_at || new Date().toISOString(),
      updated_at: v2Program.updated_at || new Date().toISOString(),
      days: (remappedV2.days || [])
        .sort((a: any, b: any) => a.sequence_index - b.sequence_index)
        .map((day: any) => {
          const flattened = (day.blocks || [])
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .flatMap((block: any, blockIdx: number) =>
              (block.exercises || [])
                .sort((a: any, b: any) => a.order_index - b.order_index)
                .map((exercise: any, exIdx: number) => ({
                  id: exercise.id,
                  exercise_id: exercise.exercise_id,
                  order_index: blockIdx * 100 + exIdx + 1,
                  sets_target: exercise.sets_target,
                  reps_min: exercise.reps_min,
                  reps_max: exercise.reps_max,
                  rest_seconds: exercise.rest_seconds,
                  tempo: exercise.tempo,
                  notes: exercise.notes,
                  technique_type: exercise.technique_type,
                  technique_config_json: exercise.technique_config_json || {},
                  set_style: exercise.set_style,
                  pause_seconds: exercise.pause_seconds,
                  exercise: exercise.exercise,
                })),
            );

          return {
            id: day.id,
            template_id: v2Program.id,
            day_number: day.sequence_index,
            name: day.name,
            focus: day.focus,
            day_type: day.day_type || 'workout',
            estimated_duration_min: day.estimated_duration_min || null,
            is_rest_day: day.day_type !== 'workout',
            created_at: day.created_at || new Date().toISOString(),
            exercises: flattened,
          };
        }),
    } as unknown as WorkoutTemplateWithDays;

    return mappedProgram;
  }

  const { data, error } = await supabase
    .from('workout_templates')
    .select(
      `
      *,
      days:workout_template_days(
        *,
        exercises:workout_template_exercises(
          id,
          exercise_id,
          order_index,
          sets_target,
          reps_min,
          reps_max,
          rest_seconds,
          tempo,
          notes,
          exercise:exercises(*)
        )
      )
    `
    )
    .eq('id', programId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Program not found');

  const exercisePool = await loadMappingExercisePool();
  const remappedV1 = remapV1TemplateDaysAtRuntime({
    templateId: data.id,
    templateName: data.name,
    daysPerWeek: Number(data.days_per_week || 0),
    templateEquipment: data.equipment_required || [],
    days: data.days || [],
    exercisePool,
  });

  if (remappedV1.changedRows > 0) {
    console.warn(
      `[workoutService] Auto-remapped ${remappedV1.changedRows} template exercises while loading v1 template ${data.id}.`,
    );
  }

  const baseProgram = mapLegacyCatalogItem({
    ...data,
    days: remappedV1.days,
  });

  // Sort days by day_number and exercises by order_index
  const sortedData = {
    ...baseProgram,
    external_id: data.external_id || null,
    split_type: data.split_type || 'custom',
    is_public: data.is_public,
    created_at: data.created_at,
    updated_at: data.updated_at,
    days: remappedV1.days
      .sort((a: any, b: any) => a.day_number - b.day_number)
      .map((day: any) => ({
        ...day,
        day_type: day.is_rest_day ? 'rest' : 'workout',
        estimated_duration_min: day.estimated_duration_min || null,
        exercises: day.exercises.sort((a: any, b: any) => a.order_index - b.order_index),
      })),
  };

  return sortedData as WorkoutTemplateWithDays;
}

/**
 * Get a specific template day with exercises
 */
export async function getTemplateDay(dayId: string): Promise<WorkoutTemplateDay & { exercises: any[] }> {
  const { data: v2Day, error: v2Error } = await db
    .from('workout_program_days_v2')
    .select(
      `
      *,
      blocks:workout_program_day_blocks_v2(
        *,
        exercises:workout_program_block_exercises_v2(
          *,
          exercise:exercises(*)
        )
      )
      ,
      template:workout_program_templates_v2(
        id,
        name,
        days_per_week,
        equipment_required,
        family:workout_program_families(external_key)
      )
    `,
    )
    .eq('id', dayId)
    .maybeSingle();

  if (!v2Error && v2Day) {
    const exercisePool = await loadMappingExercisePool();
    const remappedDay = remapV2TemplateDaysAtRuntime({
      templateId: v2Day.template?.id || v2Day.template_id || 'unknown',
      templateName: v2Day.template?.name || v2Day.name || 'Unknown template',
      daysPerWeek: Number(v2Day.template?.days_per_week || 0),
      familyKey: v2Day.template?.family?.external_key || null,
      templateEquipment: v2Day.template?.equipment_required || [],
      days: [v2Day],
      exercisePool,
    }).days[0] || v2Day;

    const exercises = (remappedDay.blocks || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .flatMap((block: any, blockIdx: number) =>
        (block.exercises || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((exercise: any, exIdx: number) => ({
            id: exercise.id,
            template_day_id: v2Day.id,
            exercise_id: exercise.exercise_id,
            order_index: blockIdx * 100 + exIdx + 1,
            sets_target: exercise.sets_target,
            reps_min: exercise.reps_min,
            reps_max: exercise.reps_max,
            rest_seconds: exercise.rest_seconds,
            tempo: exercise.tempo,
            notes: exercise.notes,
            technique_type: exercise.technique_type,
            technique_config_json: exercise.technique_config_json || {},
            set_style: exercise.set_style,
            pause_seconds: exercise.pause_seconds,
            exercise: exercise.exercise,
          })),
      );

    return {
      id: v2Day.id,
      template_id: v2Day.template_id,
      day_number: v2Day.sequence_index,
      name: v2Day.name,
      focus: v2Day.focus,
      is_rest_day: v2Day.day_type !== 'workout',
      estimated_duration_min: v2Day.estimated_duration_min || null,
      created_at: v2Day.created_at || new Date().toISOString(),
      exercises,
    } as unknown as WorkoutTemplateDay & { exercises: any[] };
  }

  const { data, error } = await supabase
    .from('workout_template_days')
    .select(
      `
      *,
      exercises:workout_template_exercises(
        id,
        exercise_id,
        order_index,
        sets_target,
        reps_min,
        reps_max,
        rest_seconds,
        tempo,
        notes,
        exercise:exercises(*)
      )
      ,
      template:workout_templates(
        id,
        name,
        days_per_week,
        equipment_required
      )
    `
    )
    .eq('id', dayId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Template day not found');

  const exercisePool = await loadMappingExercisePool();
  const remappedV1Day = remapV1TemplateDaysAtRuntime({
    templateId: data.template?.id || data.template_id || 'unknown',
    templateName: data.template?.name || data.name || 'Unknown template',
    daysPerWeek: Number(data.template?.days_per_week || 0),
    templateEquipment: data.template?.equipment_required || [],
    days: [data],
    exercisePool,
  }).days[0] || data;

  return {
    ...data,
    exercises: remappedV1Day.exercises?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
  };
}

// ============================================================================
// Exercises
// ============================================================================

/**
 * Get exercises with optional filters
 */
export async function getExercises(filters?: ExerciseFilters): Promise<Exercise[]> {
  let query = supabase.from('exercises').select('*');

  // Filter by category
  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  // Filter by equipment (exercises that require ANY of the provided equipment)
  if (filters?.equipment && filters.equipment.length > 0) {
    query = query.overlaps('equipment_required', filters.equipment);
  }

  // Filter by difficulty
  if (filters?.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  // Search by name
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  // Filter to program/reference subsets
  if (typeof filters?.referenceOnly === 'boolean') {
    query = query.eq('is_reference_only', filters.referenceOnly);
  }

  // Filter by source provider
  if (filters?.sourceProvider) {
    query = query.eq('source_provider', filters.sourceProvider);
  }

  // Filter by media availability
  if (typeof filters?.hasMedia === 'boolean') {
    query = query.eq('has_media', filters.hasMedia);
  }

  // Default sort boosts rows with media, unless caller specifies explicit sort.
  if (filters?.sortBy) {
    query = query.order(filters.sortBy, { ascending: filters.sortAscending ?? true });
  } else {
    query = query.order('has_media', { ascending: false }).order('name', { ascending: true });
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get a single exercise by ID
 */
export async function getExerciseById(exerciseId: string): Promise<Exercise> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('id', exerciseId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Exercise not found');
  return data;
}

// ============================================================================
// Workout Sessions
// ============================================================================

/**
 * Start a new workout session
 *
 * @param userId - User ID
 * @param planDayId - Optional: Link to user's workout plan day
 * @param templateDayId - Optional: Link to template day
 * @param name - Optional: Custom session name (auto-generated if not provided)
 */
export async function startSession(
  userId: string,
  planDayId?: string,
  templateDayId?: string,
  name?: string
): Promise<WorkoutSessionWithDetails> {
  await getActiveSessionInternal(userId, true);

  // Auto-generate name if not provided
  const sessionName = name || `Workout ${new Date().toLocaleDateString()}`;

  // 1. Check if today's schedule entry is a deload week
  let scheduleEntryId: string | null = null;
  let volumeMultiplier: number | undefined;
  let isDeloadSession = false;

  if (planDayId) {
    const today = new Date().toISOString().split('T')[0];
    const { data: scheduleEntry } = await supabase
      .from('user_workout_plan_schedule')
      .select('id, is_deload_week, volume_multiplier')
      .eq('plan_day_id', planDayId)
      .eq('scheduled_date', today)
      .eq('status', 'planned')
      .maybeSingle();

    if (scheduleEntry) {
      scheduleEntryId = scheduleEntry.id;
      isDeloadSession = scheduleEntry.is_deload_week === true;
      if (isDeloadSession && scheduleEntry.volume_multiplier) {
        volumeMultiplier = Number(scheduleEntry.volume_multiplier);
      }
    }
  }

  // 2. Create the session
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      plan_day_id: planDayId || null,
      template_day_id: templateDayId || null,
      schedule_id: scheduleEntryId,
      name: sessionName,
      started_at: new Date().toISOString(),
      ...(isDeloadSession ? { notes: '🔄 Deload week — volume reduced for recovery.' } : {}),
    })
    .select()
    .single();

  if (sessionError) throw sessionError;
  if (!session) throw new Error('Failed to create session');

  // 3. Fetch exercises to copy
  const rawRows = await loadSessionExerciseSnapshotRows({
    sessionId: session.id,
    planDayId,
    templateDayId,
  });

  // 4. Re-snapshot with deload multiplier if applicable
  //    loadSessionExerciseSnapshotRows returns pre-built snapshots; we need to
  //    rebuild them with the multiplier applied using the raw plan exercises.
  let exercisesToCopy = rawRows;
  if (planDayId && isDeloadSession && volumeMultiplier && volumeMultiplier < 1) {
    const { data: planExercises } = await supabase
      .from('user_workout_plan_exercises')
      .select('*')
      .eq('plan_day_id', planDayId)
      .order('order_index');

    if (planExercises && planExercises.length > 0) {
      exercisesToCopy = buildSessionExerciseSnapshots({
        sessionId: session.id,
        source: 'plan',
        exercises: planExercises,
        volumeMultiplier,
      });
    }
  }

  // 5. Insert session exercises
  if (exercisesToCopy.length > 0) {
    try {
      await insertSessionExercisesWithFallback(exercisesToCopy);
    } catch (copyError) {
      console.error('Failed to copy exercises:', copyError);
      // We don't throw here so the session can still exist, but callers should treat it as degraded.
    }
  }

  // 6. Return complete session with exercises
  return getActiveSession(userId) as Promise<WorkoutSessionWithDetails>;
}

/**
 * Get active workout session (if any)
 */
async function getActiveSessionInternal(userId: string, allowRepair: boolean): Promise<WorkoutSessionWithDetails | null> {
  let expiredSessionsCleaned = 0;

  while (expiredSessionsCleaned < 10) {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select(
        `
        *,
        plan_day:user_workout_plan_days(
          id,
          name,
          focus
        ),
        exercises:session_exercises(
          *,
          plan_exercise:user_workout_plan_exercises(
            tempo
          ),
          exercise:exercises(*),
          sets:workout_sets(*)
        )
      `
      )
      .eq('user_id', userId)
      .is('finished_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    if (isWorkoutSessionExpiredForLocalDay(data.started_at)) {
      await expireAbandonedSessionAtDayBoundary(data as WorkoutSession);
      expiredSessionsCleaned += 1;
      continue;
    }

    if (allowRepair && (data.exercises || []).length === 0 && (data.plan_day_id || data.template_day_id)) {
      try {
        const snapshotRows = await loadSessionExerciseSnapshotRows({
          sessionId: data.id,
          planDayId: data.plan_day_id,
          templateDayId: data.template_day_id,
        });

        if (snapshotRows.length > 0) {
          await insertSessionExercisesWithFallback(snapshotRows);

          const repairedSession = await getActiveSessionInternal(userId, false);
          if (repairedSession) {
            return repairedSession;
          }
        }
      } catch (repairError) {
        console.warn('Failed to repair empty active session', repairError);
      }
    }

    const sortedData = {
      ...data,
      exercises: data.exercises
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((ex: any) => ({
          ...ex,
          tempo: ex.plan_exercise?.tempo ?? null,
          reps_target:
            ex.reps_min != null && ex.reps_max != null
              ? `${ex.reps_min}-${ex.reps_max}`
              : ex.reps_min != null
                ? String(ex.reps_min)
                : ex.reps_max != null
                  ? String(ex.reps_max)
                  : null,
          sets: ex.sets.sort((a: any, b: any) => a.set_number - b.set_number),
        })),
    };

    return sortedData as WorkoutSessionWithDetails;
  }

  return null;
}

export async function getActiveSession(userId: string): Promise<WorkoutSessionWithDetails | null> {
  return getActiveSessionInternal(userId, true);
}

/**
 * Get specific session details (active or finished)
 */
export async function getSessionDetails(sessionId: string): Promise<WorkoutSessionWithDetails | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      `
      *,
      plan_day:user_workout_plan_days(
        id,
        name,
        focus
      ),
      exercises:session_exercises(
        *,
        plan_exercise:user_workout_plan_exercises(
          tempo
        ),
        exercise:exercises(*),
        sets:workout_sets(*)
      )
    `
    )
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  if (!data) return null;

  // Sort exercises by order_index and sets by set_number
  const sortedData = {
    ...data,
    exercises: data.exercises
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((ex: any) => ({
        ...ex,
        tempo: ex.plan_exercise?.tempo ?? null,
        reps_target:
          ex.reps_min != null && ex.reps_max != null
            ? `${ex.reps_min}-${ex.reps_max}`
            : ex.reps_min != null
              ? String(ex.reps_min)
              : ex.reps_max != null
                ? String(ex.reps_max)
                : null,
        sets: ex.sets.sort((a: any, b: any) => a.set_number - b.set_number),
      })),
  };

  return sortedData as WorkoutSessionWithDetails;
}

/**
 * Add an exercise to an active session
 */
export async function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
  orderIndex: number
): Promise<SessionExercise> {
  const { data, error } = await supabase
    .from('session_exercises')
    .insert({
      session_id: sessionId,
      exercise_id: exerciseId,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to add exercise to session');
  return data;
}

/**
 * Log a set for an exercise in a session
 */
export async function logSet(
  sessionExerciseId: string,
  setNumber: number,
  reps: number,
  weightLb?: number,
  rpe?: number,
  isWarmup: boolean = false
): Promise<WorkoutSet> {
  const { data, error } = await supabase
    .from('workout_sets')
    .insert({
      session_exercise_id: sessionExerciseId,
      set_number: setNumber,
      reps,
      weight_lb: weightLb === undefined ? null : weightLb,
      rpe: rpe === undefined ? null : rpe,
      is_warmup: isWarmup,
      logged_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to log set');
  return data;
}

/**
 * Delete a logged set
 */
export async function deleteSet(setId: string): Promise<void> {
  const { error } = await supabase
    .from('workout_sets')
    .delete()
    .eq('id', setId);

  if (error) throw error;
}

/**
 * Update set target (add/remove sets) for an exercise in active session
 * Ideally this updates the schema or just adds a placeholder
 * For now let's just use it to manipulate the session_exercises logic if needed
 * Actually, our UI relies on `sets_target` or checking `sets` length.
 * Since Supabase reflects real DB rows, "Adding a set" is implicit if we just log it.
 * OR if we want to show empty rows, we might need to update a `sets_target` column on session_exercises?
 * Checking schema... session_exercises has `sets_target` in the join from template/plan but maybe not on the table itself?
 * Let's check the schema types via `SessionExercise`.
 * 
 * Update: Looking at `SessionExercise` definition on line 24:
 * It's `Database['public']['Tables']['session_exercises']['Row']`.
 * We should check if that table has a target count column. If not, we might need to assume dynamic or handle it locally.
 * 
 * Assuming we want to persist the "Add Set" action even before logging:
 * We might not have a column for this. 
 * HOWEVER, looking at `ActiveSessionScreen`, it renders `Math.max(sets_target || 3, sets.length)`.
 * `sets_target` comes from the `exercises` array details.
 * 
 * If `session_exercises` table doesn't have `sets_target` column, we can't persist it easily without schema change.
 * Let's assume for now we can't change schema easily and just rely on UI state OR
 * wait, `WorkoutTemplateWithDays` had `sets_target`. `SessionExercise` might not.
 * 
 * Let's double check `SessionExercise` type or actual table if possible.
 * But for now, I will implement a service function that TRIES to update it if it exists, or we might stick to local state if backend doesn't support it.
 * 
 * WAITING: The user prompt asked to make it work.
 * If I look at `ActiveSessionScreen` line 366:
 * `Array.from({ length: Math.max((currentExercise as any).sets_target || 3, currentExercise.sets.length) })`
 * `currentExercise` is from `session.exercises`.
 * 
 * If I want to "Add Set", I should probably update `sets_target` on the `session_exercises` row if that column exists.
 * If not, maybe I just insert a blank "planned" set? No, that's messy.
 * 
 * Let's assume `session_exercises` does NOT have `sets_target` based on typical normalization, usually it copies it from plan.
 * BUT if it DOES, we can update it.
 * 
 * Let's try adding `updateSetTarget` that updates `sets_target`. If it fails, we know why.
 */
export async function updateSetTarget(sessionExerciseId: string, target: number): Promise<void> {
  const { error } = await supabase
    .from('session_exercises')
    .update({ sets_target: target })
    .eq('id', sessionExerciseId);

  if (error) throw error;
}

/**
 * Finish a workout session
 * Calculates duration and updates status
 */
export async function finishSession(sessionId: string, notes?: string): Promise<WorkoutSession> {
  // Get session start time
  const { data: session, error: fetchError } = await supabase
    .from('workout_sessions')
    .select('id, user_id, plan_day_id, started_at, finished_at')
    .eq('id', sessionId)
    .single();

  if (fetchError) throw fetchError;
  if (!session) throw new Error('Session not found');

  if (!session.finished_at && isWorkoutSessionExpiredForLocalDay(session.started_at)) {
    await expireAbandonedSessionAtDayBoundary(session as WorkoutSession);
    throw new Error('This workout expired when the day rolled over and can no longer be finished.');
  }

  const now = new Date();
  const startedAt = new Date(session.started_at);
  const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

  const { data, error } = await supabase
    .from('workout_sessions')
    .update({
      finished_at: now.toISOString(),
      duration_seconds: durationSeconds,
      notes: notes || null,
    })
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Failed to finish session');

  // Award XP and update streaks (non-blocking, fail gracefully)
  try {
    const userId = session.user_id;
    const activityDate = new Date().toISOString().split('T')[0];

    // Award XP for workout completion
    await awardXP(userId, 'workout_completed', {
      sessionId,
      duration: durationSeconds,
    });

    // Update workout streak
    await updateStreak(userId, 'workout', activityDate);

    // Update fitness master streak
    await updateStreak(userId, 'fitness', activityDate);
  } catch (gamificationError) {
    // Log error but don't fail the workout
    console.error('[WorkoutService] Gamification error:', gamificationError);
  }

  return data;
}

/**
 * Get workout history for a user
 */
export async function getWorkoutHistory(
  userId: string,
  limit: number = 30
): Promise<WorkoutSessionWithDetails[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      `
      *,
      exercises:session_exercises(
        *,
        exercise:exercises(*),
        sets:workout_sets(*)
      )
    `
    )
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Sort exercises by order_index and sets by set_number
  const sortedData =
    data?.map((session: any) => ({
      ...session,
      exercises: session.exercises
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((ex: any) => ({
          ...ex,
          sets: ex.sets.sort((a: any, b: any) => a.set_number - b.set_number),
        })),
    })) || [];

  return sortedData as WorkoutSessionWithDetails[];
}

// ============================================================================
// Personal Records (PRs)
// ============================================================================

/**
 * Calculate estimated 1RM using Epley formula
 * 1RM = weight × (1 + reps / 30)
 */
function calculateEstimated1RM(weightLb: number, reps: number): number {
  if (reps === 1) return weightLb;
  return Math.round(weightLb * (1 + reps / 30) * 10) / 10;
}

/**
 * Check if a set is a PR and update user_prs table
 * Returns whether it was a PR and the PR record
 */
export async function checkAndUpdatePR(
  userId: string,
  exerciseId: string,
  weightLb: number,
  reps: number,
  setId: string
): Promise<{ isPR: boolean; pr: UserPR | null }> {
  const estimated1RM = calculateEstimated1RM(weightLb, reps);

  // Get user's current PR for this exercise
  const { data: currentPR, error: fetchError } = await supabase
    .from('user_prs')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .order('estimated_1rm', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;

  // Check if this is a new PR (higher estimated 1RM)
  const isPR = !currentPR || estimated1RM > (currentPR.estimated_1rm || 0);

  if (!isPR) {
    return { isPR: false, pr: null };
  }

  // Create new PR record
  const { data: newPR, error: insertError } = await supabase
    .from('user_prs')
    .insert({
      user_id: userId,
      exercise_id: exerciseId,
      weight_lb: weightLb,
      reps,
      estimated_1rm: estimated1RM,
      set_id: setId,
      achieved_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Mark the set as a PR
  await supabase.from('workout_sets').update({ is_pr: true }).eq('id', setId);

  return { isPR: true, pr: newPR };
}

/**
 * Get all PRs for a user
 */
export async function getUserPRs(userId: string): Promise<(UserPR & { exercise: Exercise })[]> {
  const { data, error } = await supabase
    .from('user_prs')
    .select(
      `
      *,
      exercise:exercises(*)
    `
    )
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false });

  if (error) throw error;
  return (data || []) as (UserPR & { exercise: Exercise })[];
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Get workout statistics for a date range
 */
export async function getWorkoutStats(
  userId: string,
  startDate: string,
  endDate: string
): Promise<WorkoutStats> {
  // Get all sessions in date range
  const { data: sessions, error: sessionsError } = await supabase
    .from('workout_sessions')
    .select(
      `
      id,
      started_at,
      finished_at,
      duration_seconds,
      exercises:session_exercises(
        exercise_id,
        exercise:exercises(name),
        sets:workout_sets(reps, weight_lb, is_warmup)
      )
    `
    )
    .eq('user_id', userId)
    .gte('started_at', startDate)
    .lte('started_at', endDate)
    .not('finished_at', 'is', null);

  if (sessionsError) throw sessionsError;

  if (!sessions || sessions.length === 0) {
    return {
      totalSessions: 0,
      totalVolumeLb: 0,
      totalSets: 0,
      totalReps: 0,
      avgDurationMinutes: 0,
      sessionsPerWeek: 0,
      mostFrequentExercises: [],
    };
  }

  // Calculate stats
  let totalVolumeLb = 0;
  let totalSets = 0;
  let totalReps = 0;
  let totalDurationSeconds = 0;
  const exerciseFrequency: Record<string, { name: string; count: number }> = {};

  sessions.forEach((session: any) => {
    if (session.duration_seconds) {
      totalDurationSeconds += session.duration_seconds;
    }

    session.exercises.forEach((ex: any) => {
      // Track exercise frequency
      if (!exerciseFrequency[ex.exercise_id]) {
        exerciseFrequency[ex.exercise_id] = {
          name: ex.exercise.name,
          count: 0,
        };
      }
      exerciseFrequency[ex.exercise_id].count += 1;

      // Calculate volume from sets
      ex.sets.forEach((set: any) => {
        if (!set.is_warmup) {
          totalSets += 1;
          totalReps += set.reps;
          if (set.weight_lb) {
            totalVolumeLb += set.weight_lb * set.reps;
          }
        }
      });
    });
  });

  // Calculate average duration
  const avgDurationMinutes =
    sessions.length > 0 ? Math.round(totalDurationSeconds / sessions.length / 60) : 0;

  // Calculate sessions per week
  const daysDiff =
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  const weeks = daysDiff / 7;
  const sessionsPerWeek = weeks > 0 ? Math.round((sessions.length / weeks) * 10) / 10 : 0;

  // Get top 5 most frequent exercises
  const mostFrequentExercises = Object.entries(exerciseFrequency)
    .map(([exerciseId, data]) => ({
      exerciseId,
      exerciseName: data.name,
      timesPerformed: data.count,
    }))
    .sort((a, b) => b.timesPerformed - a.timesPerformed)
    .slice(0, 5);

  return {
    totalSessions: sessions.length,
    totalVolumeLb: Math.round(totalVolumeLb),
    totalSets,
    totalReps,
    avgDurationMinutes,
    sessionsPerWeek,
    mostFrequentExercises,
  };
}

/**
 * Get history for a specific exercise
 */
export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
  limit: number = 10
): Promise<any[]> {
  // We rely on session_exercises -> workout_sets
  // This is a complex join. easiest way:
  const { data, error } = await supabase
    .from('workout_sessions') // Start from session to get date
    .select(`
      id,
      started_at,
      name,
      exercises:session_exercises!inner(
        id,
        exercise_id,
        order_index,
        sets:workout_sets(
          set_number,
          reps,
          weight_lb,
          rpe,
          is_warmup,
          is_pr
        )
      )
    `)
    .eq('user_id', userId)
    .eq('exercises.exercise_id', exerciseId) // specific exercise
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  // Transform to cleaner list
  return data.map((session: any) => {
    // There should be only one session_exercise matching the ID per session usually,
    // but filter to be safe if they did it twice in one workout (rare but possible)
    const exerciseData = session.exercises.find((e: any) => e.exercise_id === exerciseId);
    return {
      sessionId: session.id,
      date: session.started_at,
      sessionName: session.name,
      sets: exerciseData?.sets.sort((a: any, b: any) => a.set_number - b.set_number) || []
    };
  });
}

/**
 * Swap an exercise in an active session
 */
export async function swapExercise(sessionExerciseId: string, newExerciseId: string): Promise<void> {
  const { error } = await supabase
    .from('session_exercises')
    .update({ exercise_id: newExerciseId })
    .eq('id', sessionExerciseId);

  if (error) throw error;
}

export async function updateSessionExerciseNote(
  sessionExerciseId: string,
  notes: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('session_exercises')
    .update({ notes })
    .eq('id', sessionExerciseId);

  if (error) throw error;
}

export async function updateSessionNotes(sessionId: string, notes: string | null): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ notes })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function getWorkoutNotesFeed(
  userId: string,
  options?: { limit?: number; search?: string; from?: string; to?: string },
): Promise<WorkoutNoteItem[]> {
  const limit = options?.limit ?? 80;
  const search = options?.search?.trim().toLowerCase();

  let sessionsQuery = supabase
    .from('workout_sessions')
    .select('id, name, started_at, finished_at, notes')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(Math.max(limit, 40));

  if (options?.from) {
    sessionsQuery = sessionsQuery.gte('started_at', options.from);
  }
  if (options?.to) {
    sessionsQuery = sessionsQuery.lte('started_at', options.to);
  }

  const { data: sessions, error: sessionsError } = await sessionsQuery;
  if (sessionsError) throw sessionsError;

  const sessionRows = sessions || [];
  const sessionMap = new Map(sessionRows.map((s: any) => [s.id, s]));
  const sessionIds = sessionRows.map((s: any) => s.id);

  const sessionItems: WorkoutNoteItem[] = sessionRows
    .filter((session: any) => !!session.notes && String(session.notes).trim().length > 0)
    .map((session: any) => ({
      id: `session:${session.id}`,
      type: 'session',
      sessionId: session.id,
      sessionName: session.name || 'Workout Session',
      note: String(session.notes),
      logDate: session.finished_at || session.started_at || new Date().toISOString(),
    }));

  let exerciseItems: WorkoutNoteItem[] = [];
  if (sessionIds.length > 0) {
    const { data: exerciseNotes, error: exerciseError } = await supabase
      .from('session_exercises')
      .select('id, session_id, exercise_id, notes, created_at, exercise:exercises(name)')
      .in('session_id', sessionIds)
      .not('notes', 'is', null)
      .order('created_at', { ascending: false });

    if (exerciseError) throw exerciseError;

    exerciseItems = (exerciseNotes || [])
      .filter((row: any) => String(row.notes || '').trim().length > 0)
      .map((row: any) => {
        const session = sessionMap.get(row.session_id);
        return {
          id: `exercise:${row.id}`,
          type: 'exercise',
          sessionId: row.session_id,
          sessionName: session?.name || 'Workout Session',
          exerciseId: row.exercise_id,
          exerciseName: row.exercise?.name || 'Exercise',
          note: String(row.notes),
          logDate: session?.started_at || row.created_at || new Date().toISOString(),
        } satisfies WorkoutNoteItem;
      });
  }

  let combined = [...sessionItems, ...exerciseItems];

  if (search) {
    combined = combined.filter((item) => {
      const haystack = `${item.note} ${item.sessionName} ${item.exerciseName || ''}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  combined.sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime());
  return combined.slice(0, limit);
}
