import { supabase } from '../lib/supabase';
import { assertExerciseMatchesPlanDayFocus, assertPlanFocusCoherence } from './workoutCoherenceService';
import {
  buildMappingRowsFromV2Day,
  remediateDayExerciseMappings,
} from '../lib/workout/programMappingEngine';
import type { ProgramExercise } from '../lib/workout/programMappingRules';

const db = supabase as any;

export type WorkoutProgramFamily = {
  id: string;
  external_key: string;
  display_name: string;
  description: string | null;
  difficulty_bands: string[];
  goal_tags: string[];
  equipment_profile: string[];
  training_style_tags: string[];
  target_audience: string | null;
  is_active: boolean;
};

export type WorkoutProgramTemplateV2 = {
  id: string;
  family_id: string;
  external_id: string;
  name: string;
  description: string | null;
  progression_model: string;
  source_type: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  duration_weeks: number | null;
  days_per_week: number;
  goal_tags: string[];
  equipment_required: string[];
  training_style_tags: string[];
  volume_profile: string | null;
  is_public: boolean;
  family?: WorkoutProgramFamily;
};

export type TemplateExerciseV2 = {
  id: string;
  exercise_id: string;
  order_index: number;
  sets_target: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number | null;
  tempo: string | null;
  technique_type: string | null;
  technique_config_json: Record<string, any>;
  set_style: string | null;
  rir_target_min: number | null;
  rir_target_max: number | null;
  rpe_target_min: number | null;
  rpe_target_max: number | null;
  pause_seconds: number | null;
  notes: string | null;
  exercise: {
    id: string;
    external_id: string | null;
    name: string;
    category: string;
    equipment_required: string[] | null;
    primary_muscle: string | null;
    pattern: string | null;
    difficulty: string | null;
  };
};

export type TemplateBlockV2 = {
  id: string;
  order_index: number;
  block_type: string;
  title: string | null;
  config_json: Record<string, any>;
  exercises: TemplateExerciseV2[];
};

export type TemplateDayV2 = {
  id: string;
  sequence_index: number;
  day_type: 'workout' | 'rest' | 'conditioning' | 'recovery';
  name: string;
  focus: string | null;
  estimated_duration_min: number | null;
  blocks: TemplateBlockV2[];
};

export type WorkoutTemplateWithStructureV2 = WorkoutProgramTemplateV2 & {
  days: TemplateDayV2[];
};

export type UserPlanBlock = {
  id: string;
  plan_day_id: string;
  order_index: number;
  block_type: string;
  title: string | null;
  config_json: Record<string, any>;
  is_user_modified: boolean;
};

export type UserPlanBlockExercise = {
  id: string;
  plan_day_id: string;
  block_id: string | null;
  exercise_id: string;
  order_index: number;
  sets_target: number;
  reps_min: number;
  reps_max: number;
  rest_seconds: number | null;
  tempo: string | null;
  technique_type: string | null;
  technique_config_json: Record<string, any>;
  set_style: string | null;
  rir_target_min: number | null;
  rir_target_max: number | null;
  rpe_target_min: number | null;
  rpe_target_max: number | null;
  pause_seconds: number | null;
  user_notes: string | null;
  exercise: {
    id: string;
    name: string;
    category: string;
  };
};

function toDateString(date: Date) {
  return date.toISOString().split('T')[0];
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function workoutDaysForFrequency(freq: number) {
  const all = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const days = Math.max(1, Math.min(7, Number(freq || 3)));
  const step = all.length / days;
  const selected: string[] = [];
  for (let i = 0; i < days; i += 1) {
    const day = all[Math.floor(i * step)];
    if (!selected.includes(day)) selected.push(day);
  }
  while (selected.length < days) {
    const next = all.find((d) => !selected.includes(d));
    if (!next) break;
    selected.push(next);
  }
  return selected;
}

async function loadProgramExercisePool(): Promise<ProgramExercise[]> {
  const { data, error } = await db
    .from('exercises')
    .select('id, external_id, name, category, equipment_required, primary_muscle, pattern, difficulty')
    .limit(5000);

  if (error) {
    throw new Error(error.message || 'Failed to load workout exercise pool');
  }

  return (data || []) as ProgramExercise[];
}

function remediateTemplateForClone(
  template: WorkoutTemplateWithStructureV2,
  exercisePool: ProgramExercise[],
): { template: WorkoutTemplateWithStructureV2; changedRows: number } {
  const exerciseById = new Map<string, ProgramExercise>(
    exercisePool.filter((item) => !!item?.id).map((item) => [item.id, item]),
  );

  let changedRows = 0;

  const days = (template.days || []).map((day) => {
    if (day.day_type !== 'workout') return day;

    const rows = buildMappingRowsFromV2Day(day as any);
    if (!rows.length) return day;

    const remediation = remediateDayExerciseMappings({
      dayId: day.id,
      dayName: day.name,
      dayFocus: day.focus,
      dayIndex: Number(day.sequence_index || 1),
      daysPerWeek: Number(template.days_per_week || 0),
      familyKey: template.family?.external_key || null,
      goalTags: template.goal_tags || [],
      templateEquipment: template.equipment_required || [],
      rows,
      exercisePool,
    });

    if (remediation.unresolvedRows.length > 0) {
      throw new Error(
        `Template "${template.name}" day "${day.name}" has ${remediation.unresolvedRows.length} invalid exercise mappings with no valid replacement candidates.`,
      );
    }

    if (!remediation.changedRows.length) {
      return day;
    }

    changedRows += remediation.changedRows.length;
    const replacementByRowId = remediation.replacementByRowId;

    return {
      ...day,
      blocks: (day.blocks || []).map((block) => ({
        ...block,
        exercises: (block.exercises || []).map((exerciseRow) => {
          const nextExerciseId = replacementByRowId[exerciseRow.id] || exerciseRow.exercise_id;
          if (nextExerciseId === exerciseRow.exercise_id) {
            return exerciseRow;
          }

          const nextExercise = exerciseById.get(nextExerciseId);
          if (!nextExercise) {
            throw new Error(
              `Template "${template.name}" day "${day.name}" replacement exercise ${nextExerciseId} was not found in the loaded exercise pool.`,
            );
          }

          return {
            ...exerciseRow,
            exercise_id: nextExerciseId,
            exercise: {
              id: nextExercise.id,
              external_id: nextExercise.external_id || null,
              name: nextExercise.name || exerciseRow.exercise.name,
              category: nextExercise.category || exerciseRow.exercise.category,
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

  return {
    template: {
      ...template,
      days,
    },
    changedRows,
  };
}

async function seedScheduleForPlan(planId: string, daysPerWeek: number, planDayIds: string[]) {
  const { data: existing } = await db
    .from('user_workout_plan_schedule')
    .select('id')
    .eq('plan_id', planId)
    .limit(1);

  if ((existing || []).length > 0) return;

  const allowed = workoutDaysForFrequency(daysPerWeek);
  const weekStart = startOfWeek(new Date());
  let workoutIndex = 0;

  for (let offset = 0; offset < 28; offset += 1) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + offset);
    const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
    const isWorkout = allowed.includes(weekday);

    await db.from('user_workout_plan_schedule').insert({
      plan_id: planId,
      plan_day_id: isWorkout ? planDayIds[workoutIndex % planDayIds.length] : null,
      scheduled_date: toDateString(date),
      session_type: isWorkout ? 'workout' : 'rest',
      status: 'planned',
    });

    if (isWorkout) workoutIndex += 1;
  }
}

export async function getProgramFamilies(): Promise<WorkoutProgramFamily[]> {
  const { data, error } = await db
    .from('workout_program_families')
    .select('*')
    .eq('is_active', true)
    .order('display_name', { ascending: true });

  if (error) throw new Error(error.message || 'Failed to load workout program families');
  return (data || []) as WorkoutProgramFamily[];
}

export async function getProgramsByFamily(familyKey?: string): Promise<WorkoutProgramTemplateV2[]> {
  let query = db
    .from('workout_program_templates_v2')
    .select('*, family:workout_program_families(*)')
    .eq('is_public', true)
    .order('name', { ascending: true });

  if (familyKey) {
    query = query.eq('family.external_key', familyKey);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Failed to load workout templates');
  return (data || []) as WorkoutProgramTemplateV2[];
}

export async function getProgramTemplateV2(templateId: string): Promise<WorkoutTemplateWithStructureV2> {
  const { data, error } = await db
    .from('workout_program_templates_v2')
    .select(
      `
      *,
      family:workout_program_families(*),
      days:workout_program_days_v2(
        *,
        blocks:workout_program_day_blocks_v2(
          *,
          exercises:workout_program_block_exercises_v2(
            *,
            exercise:exercises(id,external_id,name,category,equipment_required,primary_muscle,pattern,difficulty)
          )
        )
      )
    `,
    )
    .eq('id', templateId)
    .single();

  if (error || !data) throw new Error(error?.message || 'Template not found');

  const sorted = {
    ...data,
    days: (data.days || [])
      .sort((a: any, b: any) => a.sequence_index - b.sequence_index)
      .map((day: any) => ({
        ...day,
        blocks: (day.blocks || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((block: any) => ({
            ...block,
            exercises: (block.exercises || []).sort((a: any, b: any) => a.order_index - b.order_index),
          })),
      })),
  };

  return sorted as WorkoutTemplateWithStructureV2;
}

export async function createPlanFromTemplateV2(
  userId: string,
  templateId: string,
  options?: {
    name?: string;
    description?: string;
    activate?: boolean;
  },
): Promise<{ planId: string }> {
  const templateRaw = await getProgramTemplateV2(templateId);
  const exercisePool = await loadProgramExercisePool();
  const { template, changedRows } = remediateTemplateForClone(templateRaw, exercisePool);

  if (changedRows > 0) {
    console.warn(
      `[workoutBuilderService] Auto-remapped ${changedRows} invalid template exercises before cloning plan from template ${template.id}.`,
    );
  }

  const { data: maxVersion } = await db
    .from('user_workout_plans')
    .select('version')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (options?.activate !== false) {
    await db
      .from('user_workout_plans')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);
  }

  const { data: plan, error: planError } = await db
    .from('user_workout_plans')
    .insert({
      user_id: userId,
      generation_run_id: null,
      version: Number(maxVersion?.version || 0) + 1,
      is_active: options?.activate !== false,
      name: options?.name || template.name,
      description: options?.description || template.description,
      start_date: toDateString(new Date()),
      total_weeks: template.duration_weeks,
      days_per_week: template.days_per_week,
    })
    .select('id')
    .single();

  if (planError || !plan) throw new Error(planError?.message || 'Failed to create plan from template');

  const dayMap = new Map<string, string>();
  const planDayIds: string[] = [];

  for (const day of template.days || []) {
    const { data: planDay, error: dayError } = await db
      .from('user_workout_plan_days')
      .insert({
        plan_id: plan.id,
        day_number: day.sequence_index,
        name: day.name,
        focus: day.focus,
      })
      .select('id')
      .single();

    if (dayError || !planDay) throw new Error(dayError?.message || 'Failed to create plan day');

    dayMap.set(day.id, planDay.id);
    planDayIds.push(planDay.id);

    const blockMap = new Map<string, string>();
    for (const block of day.blocks || []) {
      const { data: insertedBlock, error: blockError } = await db
        .from('user_workout_plan_blocks')
        .insert({
          plan_day_id: planDay.id,
          order_index: block.order_index,
          block_type: block.block_type,
          title: block.title,
          config_json: block.config_json || {},
          is_user_modified: true,
        })
        .select('id')
        .single();

      if (blockError || !insertedBlock) throw new Error(blockError?.message || 'Failed to create plan block');
      blockMap.set(block.id, insertedBlock.id);

      for (const ex of block.exercises || []) {
        const { error: exError } = await db
          .from('user_workout_plan_exercises')
          .insert({
            plan_day_id: planDay.id,
            block_id: insertedBlock.id,
            exercise_id: ex.exercise_id,
            order_index: ex.order_index,
            sets_target: ex.sets_target,
            reps_min: ex.reps_min,
            reps_max: ex.reps_max,
            rest_seconds: ex.rest_seconds,
            tempo: ex.tempo,
            technique_type: ex.technique_type,
            technique_config_json: ex.technique_config_json || {},
            set_style: ex.set_style,
            rir_target_min: ex.rir_target_min,
            rir_target_max: ex.rir_target_max,
            rpe_target_min: ex.rpe_target_min,
            rpe_target_max: ex.rpe_target_max,
            pause_seconds: ex.pause_seconds,
            user_notes: ex.notes,
            is_user_modified: true,
            original_exercise_id: ex.exercise_id,
          });

        if (exError) throw new Error(exError.message || 'Failed to create plan exercise');
      }
    }
  }

  await seedScheduleForPlan(plan.id, template.days_per_week, planDayIds);
  return { planId: plan.id };
}

export async function createCustomWorkoutProgram(
  userId: string,
  input: {
    name: string;
    description?: string;
    daysPerWeek: number;
    activate?: boolean;
  },
): Promise<{ planId: string }> {
  const { data: maxVersion } = await db
    .from('user_workout_plans')
    .select('version')
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (input.activate !== false) {
    await db
      .from('user_workout_plans')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);
  }

  const days = Math.max(2, Math.min(6, Number(input.daysPerWeek || 4)));

  const { data: plan, error: planError } = await db
    .from('user_workout_plans')
    .insert({
      user_id: userId,
      generation_run_id: null,
      version: Number(maxVersion?.version || 0) + 1,
      is_active: input.activate !== false,
      name: input.name,
      description: input.description || 'Custom workout plan',
      start_date: toDateString(new Date()),
      total_weeks: 8,
      days_per_week: days,
    })
    .select('id')
    .single();

  if (planError || !plan) throw new Error(planError?.message || 'Failed to create custom plan');

  const planDayIds: string[] = [];

  for (let i = 1; i <= days; i += 1) {
    const { data: day, error: dayError } = await db
      .from('user_workout_plan_days')
      .insert({
        plan_id: plan.id,
        day_number: i,
        name: `Day ${i}`,
        focus: 'Custom focus',
      })
      .select('id')
      .single();

    if (dayError || !day) throw new Error(dayError?.message || 'Failed to create custom day');
    planDayIds.push(day.id);

    await db.from('user_workout_plan_blocks').insert({
      plan_day_id: day.id,
      order_index: 1,
      block_type: 'normal',
      title: 'Primary Block',
      config_json: {},
      is_user_modified: true,
    });
  }

  await seedScheduleForPlan(plan.id, days, planDayIds);
  return { planId: plan.id };
}

export async function getPlanDayBlocks(planDayId: string): Promise<{
  blocks: UserPlanBlock[];
  exercises: UserPlanBlockExercise[];
}> {
  const { data: blocks, error: blocksError } = await db
    .from('user_workout_plan_blocks')
    .select('*')
    .eq('plan_day_id', planDayId)
    .order('order_index', { ascending: true });

  if (blocksError) throw new Error(blocksError.message || 'Failed to load plan day blocks');

  const { data: exercises, error: exercisesError } = await db
    .from('user_workout_plan_exercises')
    .select('*, exercise:exercises(id,name,category)')
    .eq('plan_day_id', planDayId)
    .order('order_index', { ascending: true });

  if (exercisesError) throw new Error(exercisesError.message || 'Failed to load block exercises');

  return {
    blocks: (blocks || []) as UserPlanBlock[],
    exercises: (exercises || []) as UserPlanBlockExercise[],
  };
}

export async function addPlanDayBlock(
  planDayId: string,
  input: {
    blockType: 'normal' | 'superset' | 'giant_set' | 'drop_set' | 'rest_pause' | 'amrap' | 'warmup_protocol';
    title?: string;
    config?: Record<string, any>;
  },
): Promise<{ id: string }> {
  const { data: lastBlock } = await db
    .from('user_workout_plan_blocks')
    .select('order_index')
    .eq('plan_day_id', planDayId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await db
    .from('user_workout_plan_blocks')
    .insert({
      plan_day_id: planDayId,
      order_index: Number(lastBlock?.order_index || 0) + 1,
      block_type: input.blockType,
      title: input.title || 'New Block',
      config_json: input.config || {},
      is_user_modified: true,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to add block');
  return { id: data.id };
}

export async function updatePlanDayBlock(
  blockId: string,
  input: {
    title?: string;
    blockType?: 'normal' | 'superset' | 'giant_set' | 'drop_set' | 'rest_pause' | 'amrap' | 'warmup_protocol';
    config?: Record<string, any>;
  },
): Promise<void> {
  const { error } = await db
    .from('user_workout_plan_blocks')
    .update({
      title: input.title,
      block_type: input.blockType,
      config_json: input.config,
      is_user_modified: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', blockId);

  if (error) throw new Error(error.message || 'Failed to update block');
}

export async function removePlanDayBlock(blockId: string): Promise<void> {
  const { data: block, error: blockError } = await db
    .from('user_workout_plan_blocks')
    .select('id, plan_day_id, order_index')
    .eq('id', blockId)
    .maybeSingle();

  if (blockError || !block) throw new Error(blockError?.message || 'Block not found');

  const { error: resetExercisesError } = await db
    .from('user_workout_plan_exercises')
    .update({ block_id: null, is_user_modified: true })
    .eq('block_id', blockId);

  if (resetExercisesError) throw new Error(resetExercisesError.message || 'Failed to detach block exercises');

  const { error } = await db.from('user_workout_plan_blocks').delete().eq('id', blockId);
  if (error) throw new Error(error.message || 'Failed to remove block');

  const { data: siblings } = await db
    .from('user_workout_plan_blocks')
    .select('id, order_index')
    .eq('plan_day_id', block.plan_day_id)
    .gt('order_index', block.order_index)
    .order('order_index', { ascending: true });

  for (const sibling of siblings || []) {
    await db
      .from('user_workout_plan_blocks')
      .update({ order_index: Number(sibling.order_index) - 1 })
      .eq('id', sibling.id);
  }
}

export async function addBlockExercise(
  planDayId: string,
  input: {
    blockId?: string | null;
    exerciseId: string;
    setsTarget?: number;
    repsMin?: number;
    repsMax?: number;
    restSeconds?: number;
    tempo?: string | null;
    techniqueType?: string | null;
    notes?: string | null;
  },
): Promise<void> {
  await assertExerciseMatchesPlanDayFocus(planDayId, input.exerciseId);

  const { data: last } = await db
    .from('user_workout_plan_exercises')
    .select('order_index')
    .eq('plan_day_id', planDayId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await db
    .from('user_workout_plan_exercises')
    .insert({
      plan_day_id: planDayId,
      block_id: input.blockId || null,
      exercise_id: input.exerciseId,
      order_index: Number(last?.order_index || 0) + 1,
      sets_target: input.setsTarget ?? 3,
      reps_min: input.repsMin ?? 8,
      reps_max: input.repsMax ?? 12,
      rest_seconds: input.restSeconds ?? 90,
      tempo: input.tempo || null,
      technique_type: input.techniqueType || null,
      technique_config_json: input.techniqueType ? { seededByBuilder: true } : {},
      set_style: input.techniqueType === 'drop_set' ? 'pyramid' : 'straight',
      pause_seconds: input.techniqueType === 'pause_reps' ? 2 : null,
      user_notes: input.notes || null,
      is_user_modified: true,
      original_exercise_id: input.exerciseId,
    });

  if (error) throw new Error(error.message || 'Failed to add exercise to block');
}

export async function updateBlockExercise(
  planExerciseId: string,
  updates: Partial<{
    block_id: string | null;
    sets_target: number;
    reps_min: number;
    reps_max: number;
    rest_seconds: number;
    tempo: string | null;
    technique_type: string | null;
    user_notes: string | null;
  }>,
): Promise<void> {
  const { error } = await db
    .from('user_workout_plan_exercises')
    .update({
      ...updates,
      is_user_modified: true,
      technique_config_json: updates.technique_type ? { updatedByBuilder: true } : undefined,
      set_style: updates.technique_type === 'drop_set' ? 'pyramid' : undefined,
      pause_seconds: updates.technique_type === 'pause_reps' ? 2 : undefined,
    })
    .eq('id', planExerciseId);

  if (error) throw new Error(error.message || 'Failed to update exercise in block');
}

export async function removeBlockExercise(planExerciseId: string): Promise<void> {
  const { error } = await db
    .from('user_workout_plan_exercises')
    .delete()
    .eq('id', planExerciseId);

  if (error) throw new Error(error.message || 'Failed to remove exercise');
}

export async function publishWorkoutProgram(userId: string, planId: string): Promise<void> {
  await assertPlanFocusCoherence(planId, 0.8);

  await db
    .from('user_workout_plans')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  const { error } = await db
    .from('user_workout_plans')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message || 'Failed to publish workout program');

  const { data: dayRows } = await db
    .from('user_workout_plan_days')
    .select('id')
    .eq('plan_id', planId)
    .order('day_number', { ascending: true });

  const { data: plan } = await db
    .from('user_workout_plans')
    .select('days_per_week')
    .eq('id', planId)
    .maybeSingle();

  await seedScheduleForPlan(planId, Number(plan?.days_per_week || 3), (dayRows || []).map((d: any) => d.id));
}
