import {
  auditDayExerciseMappings,
  remediateDayExerciseMappings,
  type DayAuditResult,
  type DayRemediationResult,
  type MappingExerciseRow,
} from './programMappingEngine.ts';
import {
  inferProgramFamilyKeyFromPlanIdentity,
  type ProgramExercise,
} from './programMappingRules.ts';

type TemplateContextCatalogItem = {
  name: string;
  familyKey: string | null;
  equipment: string[];
  dayNames: string[];
};

type RepairCopyMode = 'activate' | 'preview';

export function normalizeRepairToken(value: string) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, ' ');
}

export function stableSortBy<T>(rows: T[], accessor: (row: T) => string | number) {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const left = accessor(a.row);
      const right = accessor(b.row);
      if (left === right) return a.index - b.index;
      return String(left).localeCompare(String(right));
    })
    .map((entry) => entry.row);
}

export async function loadRepairExercisePool(supabase: any): Promise<ProgramExercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, external_id, name, category, equipment_required, primary_muscle, pattern, difficulty')
    .limit(5000);

  if (error) {
    throw new Error(error.message || 'Failed to load exercise pool');
  }

  return (data || []) as ProgramExercise[];
}

export async function loadPlanDaysAndExercisesForRepair(supabase: any, planId: string) {
  const { data: days, error: dayError } = await supabase
    .from('user_workout_plan_days')
    .select(
      `
      id,
      plan_id,
      day_number,
      name,
      focus,
      day_type,
      estimated_duration_min,
      is_completed,
      completed_at,
      session_id,
      scheduled_date,
      exercises:user_workout_plan_exercises(
        id,
        exercise_id,
        order_index,
        block_id,
        sets_target,
        reps_min,
        reps_max,
        rest_seconds,
        tempo,
        user_notes,
        is_user_modified,
        original_exercise_id,
        technique_type,
        technique_config_json,
        set_style,
        rir_target_min,
        rir_target_max,
        rpe_target_min,
        rpe_target_max,
        pause_seconds,
        exercise:exercises!user_workout_plan_exercises_exercise_id_fkey(
          id,
          external_id,
          name,
          category,
          equipment_required,
          primary_muscle,
          pattern,
          difficulty
        )
      )
    `,
    )
    .eq('plan_id', planId)
    .order('day_number', { ascending: true });

  if (dayError) {
    throw new Error(dayError.message || 'Failed to load workout plan days');
  }

  const dayIds = (days || []).map((day: any) => day.id);
  const { data: blocks, error: blockError } = await supabase
    .from('user_workout_plan_blocks')
    .select('id, plan_day_id, order_index, block_type, title, config_json, is_user_modified')
    .in('plan_day_id', dayIds.length ? dayIds : ['00000000-0000-0000-0000-000000000000']);

  if (blockError && dayIds.length) {
    throw new Error(blockError.message || 'Failed to load workout plan blocks');
  }

  return {
    days: (days || []) as any[],
    blocks: (blocks || []) as any[],
  };
}

export async function loadPlanScheduleForRepair(supabase: any, planId: string) {
  const { data, error } = await supabase
    .from('user_workout_plan_schedule')
    .select('id, plan_id, plan_day_id, scheduled_date, session_type, status, original_date, completed_session_id, notes')
    .eq('plan_id', planId)
    .order('scheduled_date', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Failed to load workout plan schedule');
  }

  return (data || []) as any[];
}

export function inferPlanTemplateContext(
  plan: { name: string; days_per_week: number; program_family_key?: string | null },
  dayNames: string[],
  catalog: TemplateContextCatalogItem[],
) {
  const inferredFamilyKey = plan.program_family_key || inferProgramFamilyKeyFromPlanIdentity({
    planName: plan.name,
    dayNames,
    daysPerWeek: plan.days_per_week,
  });

  if (inferredFamilyKey) {
    const directMatch = catalog.find((item) => item.familyKey === inferredFamilyKey);
    if (directMatch) {
      return {
        familyKey: directMatch.familyKey,
        equipment: directMatch.equipment,
      };
    }
  }

  const planName = normalizeRepairToken(plan.name || '');
  const normalizedDays = dayNames.map((name) => normalizeRepairToken(name));

  let best: { score: number; familyKey: string | null; equipment: string[] } | null = null;

  for (const item of catalog) {
    let score = 0;

    if (planName && normalizeRepairToken(item.name).length && planName.includes(normalizeRepairToken(item.name))) {
      score += 6;
    }

    if (item.dayNames.length === normalizedDays.length) {
      score += 2;
    }

    const target = item.dayNames.slice(0, normalizedDays.length);
    for (let i = 0; i < Math.min(normalizedDays.length, target.length); i += 1) {
      if (normalizedDays[i] === normalizeRepairToken(target[i])) {
        score += 3;
      }
    }

    if (score <= 0) continue;

    if (!best || score > best.score) {
      best = {
        score,
        familyKey: item.familyKey,
        equipment: item.equipment,
      };
    }
  }

  if (!best) {
    return {
      familyKey: inferredFamilyKey || null,
      equipment: [] as string[],
    };
  }

  return {
    familyKey: best.familyKey || inferredFamilyKey || null,
    equipment: best.equipment,
  };
}

export async function buildTemplateContextCatalog(supabase: any): Promise<TemplateContextCatalogItem[]> {
  const { data: v2Templates } = await supabase
    .from('workout_program_templates_v2')
    .select(
      `
      name,
      equipment_required,
      family:workout_program_families(external_key),
      days:workout_program_days_v2(sequence_index,name)
    `,
    )
    .eq('is_public', true)
    .limit(5000);

  const { data: v1Templates } = await supabase
    .from('workout_templates')
    .select(
      `
      name,
      equipment_required,
      days:workout_template_days(day_number,name)
    `,
    )
    .eq('is_public', true)
    .limit(5000);

  const catalog: TemplateContextCatalogItem[] = [];

  for (const template of v2Templates || []) {
    const dayNames = stableSortBy(template.days || [], (day: any) => day.sequence_index).map((day: any) => day.name);
    catalog.push({
      name: template.name,
      familyKey: template.family?.external_key || null,
      equipment: template.equipment_required || [],
      dayNames,
    });
  }

  for (const template of v1Templates || []) {
    const dayNames = stableSortBy(template.days || [], (day: any) => day.day_number).map((day: any) => day.name);
    catalog.push({
      name: template.name,
      familyKey: inferProgramFamilyKeyFromPlanIdentity({
        planName: template.name,
        dayNames,
        daysPerWeek: dayNames.length,
      }),
      equipment: template.equipment_required || [],
      dayNames,
    });
  }

  return catalog;
}

export function auditPlanDaysForRepair(input: {
  plan: any;
  days: any[];
  familyKey: string | null;
  templateEquipment: string[];
  exercisePool: ProgramExercise[];
}) {
  const dayAudits: DayAuditResult[] = [];
  const remediations = new Map<string, DayRemediationResult>();
  const violations: any[] = [];

  for (const day of input.days) {
    const rows: MappingExerciseRow[] = (day.exercises || [])
      .filter((row: any) => !!row.exercise)
      .map((row: any) => ({
        rowId: row.id,
        exerciseId: row.exercise_id,
        orderIndex: Number(row.order_index || 0),
        blockId: row.block_id || null,
        exercise: row.exercise,
      }));

    const dayAudit = auditDayExerciseMappings({
      dayId: day.id,
      dayName: day.name,
      dayFocus: day.focus,
      dayIndex: Number(day.day_number || 1),
      daysPerWeek: Number(input.plan.days_per_week || 0),
      familyKey: input.familyKey,
      goalTags: input.plan.goal_tags || [],
      templateEquipment: input.templateEquipment,
      rows,
      exercisePool: input.exercisePool,
    });

    dayAudits.push(dayAudit);

    if (dayAudit.violations.length > 0) {
      violations.push(
        ...dayAudit.violations.map((violation) => ({
          planId: input.plan.id,
          userId: input.plan.user_id,
          dayId: day.id,
          dayName: day.name,
          dayFocus: day.focus,
          rowId: violation.rowId,
          exerciseId: violation.exerciseId,
          exerciseName: violation.exerciseName,
          violationTypes: violation.violationTypes,
          recommendedExerciseId: violation.recommendedExerciseId,
          recommendedExerciseName: violation.recommendedExerciseName,
        })),
      );
    }

    remediations.set(
      day.id,
      remediateDayExerciseMappings({
        dayId: day.id,
        dayName: day.name,
        dayFocus: day.focus,
        dayIndex: Number(day.day_number || 1),
        daysPerWeek: Number(input.plan.days_per_week || 0),
        familyKey: input.familyKey,
        goalTags: input.plan.goal_tags || [],
        templateEquipment: input.templateEquipment,
        rows,
        exercisePool: input.exercisePool,
      }),
    );
  }

  return {
    dayAudits,
    remediations,
    violations,
  };
}

function normalizePreviewPlanName(name: string | null | undefined, previewPrefix: string) {
  const raw = String(name || '');
  return raw.startsWith(previewPrefix) ? raw : `${previewPrefix}${raw}`;
}

export async function copyPlanWithRemediation(input: {
  supabase: any;
  plan: any;
  days: any[];
  blocks: any[];
  schedule: any[];
  remediationsByDayId: Map<string, DayRemediationResult>;
  dryRun: boolean;
  jobId?: string | null;
  mode: RepairCopyMode;
  previewPrefix?: string;
  programFamilyKey?: string | null;
}) {
  const supabase = input.supabase;
  const unresolved = Array.from(input.remediationsByDayId.values()).flatMap((item) => item.unresolvedRows);

  if (unresolved.length) {
    return {
      success: false,
      reason: `Plan has unresolved replacement rows (${unresolved.length}).`,
      newPlanId: null,
      auditRows: unresolved.map((row) => ({
        job_id: input.jobId || null,
        entity_type: 'plan',
        entity_id: input.plan.id,
        user_id: input.plan.user_id,
        operation: input.mode === 'preview' ? 'preview' : 'migrate',
        status: 'failed',
        row_id: row.rowId,
        violation_types: row.violationTypes,
        before_json: {
          planId: input.plan.id,
          exerciseId: row.exerciseId,
        },
        after_json: {},
        error_message: row.reason,
      })),
    };
  }

  if (input.dryRun) {
    return {
      success: true,
      reason: null,
      newPlanId: null,
      auditRows: [],
    };
  }

  const { data: maxVersionData } = await supabase
    .from('user_workout_plans')
    .select('version')
    .eq('user_id', input.plan.user_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = Number(maxVersionData?.version || input.plan.version || 0) + 1;
  const previewPrefix = input.previewPrefix || 'Preview · ';

  const { data: newPlan, error: newPlanError } = await supabase
    .from('user_workout_plans')
    .insert({
      user_id: input.plan.user_id,
      template_id: input.plan.template_id,
      generation_run_id: input.plan.generation_run_id,
      version: nextVersion,
      is_active: false,
      name: input.mode === 'preview'
        ? normalizePreviewPlanName(input.plan.name, previewPrefix)
        : input.plan.name,
      description: input.plan.description,
      start_date: input.plan.start_date,
      end_date: input.plan.end_date,
      days_per_week: input.plan.days_per_week,
      current_week: input.plan.current_week,
      total_weeks: input.plan.total_weeks,
      source_model: input.plan.source_model || 'generated',
      program_template_v2_id: input.plan.program_template_v2_id || null,
      program_family_key: input.programFamilyKey || input.plan.program_family_key || null,
      progression_model: input.plan.progression_model || null,
      training_style_tags: input.plan.training_style_tags || [],
      goal_tags: input.plan.goal_tags || [],
      weekly_layout_json: input.plan.weekly_layout_json || null,
      lifecycle_state: input.mode === 'preview' ? 'preview' : 'live',
      replaces_plan_id: input.mode === 'preview' ? input.plan.id : null,
    })
    .select('id')
    .single();

  if (newPlanError || !newPlan) {
    return {
      success: false,
      reason: newPlanError?.message || 'Failed to create repaired plan version.',
      newPlanId: null,
      auditRows: [],
    };
  }

  const oldToNewDayId = new Map<string, string>();
  for (const day of stableSortBy(input.days, (row) => row.day_number)) {
    const { data: insertedDay, error: dayError } = await supabase
      .from('user_workout_plan_days')
      .insert({
        plan_id: newPlan.id,
        day_number: day.day_number,
        name: day.name,
        focus: day.focus,
        day_type: day.day_type || 'workout',
        estimated_duration_min: day.estimated_duration_min ?? null,
        scheduled_date: day.scheduled_date,
        is_completed: day.is_completed,
        completed_at: day.completed_at,
        session_id: day.session_id,
      })
      .select('id')
      .single();

    if (dayError || !insertedDay) {
      return {
        success: false,
        reason: dayError?.message || 'Failed to copy plan day.',
        newPlanId: newPlan.id,
        auditRows: [],
      };
    }

    oldToNewDayId.set(day.id, insertedDay.id);
  }

  const oldToNewBlockId = new Map<string, string>();
  for (const block of stableSortBy(input.blocks, (row) => `${row.plan_day_id}:${row.order_index}`)) {
    const mappedDayId = oldToNewDayId.get(block.plan_day_id);
    if (!mappedDayId) continue;

    const { data: insertedBlock, error: blockError } = await supabase
      .from('user_workout_plan_blocks')
      .insert({
        plan_day_id: mappedDayId,
        order_index: block.order_index,
        block_type: block.block_type,
        title: block.title,
        config_json: block.config_json || {},
        is_user_modified: block.is_user_modified,
      })
      .select('id')
      .single();

    if (blockError || !insertedBlock) {
      return {
        success: false,
        reason: blockError?.message || 'Failed to copy plan block.',
        newPlanId: newPlan.id,
        auditRows: [],
      };
    }

    oldToNewBlockId.set(block.id, insertedBlock.id);
  }

  const changedAuditRows: any[] = [];

  for (const day of input.days) {
    const mappedDayId = oldToNewDayId.get(day.id);
    if (!mappedDayId) continue;

    const remediation = input.remediationsByDayId.get(day.id);
    const replacementByRowId = remediation?.replacementByRowId || {};
    const sortedExercises = stableSortBy(day.exercises || [], (row: any) => row.order_index);

    for (const exerciseRow of sortedExercises) {
      const nextExerciseId = replacementByRowId[exerciseRow.id] || exerciseRow.exercise_id;
      const mappedBlockId = exerciseRow.block_id ? (oldToNewBlockId.get(exerciseRow.block_id) || null) : null;

      const payload: Record<string, unknown> = {
        plan_day_id: mappedDayId,
        block_id: mappedBlockId,
        exercise_id: nextExerciseId,
        order_index: exerciseRow.order_index,
        sets_target: exerciseRow.sets_target,
        reps_min: exerciseRow.reps_min,
        reps_max: exerciseRow.reps_max,
        rest_seconds: exerciseRow.rest_seconds,
        tempo: exerciseRow.tempo,
        user_notes: exerciseRow.user_notes,
        is_user_modified: true,
        original_exercise_id: exerciseRow.original_exercise_id || exerciseRow.exercise_id,
      };

      if (exerciseRow.technique_type !== undefined) payload.technique_type = exerciseRow.technique_type;
      if (exerciseRow.technique_config_json !== undefined) payload.technique_config_json = exerciseRow.technique_config_json || {};
      if (exerciseRow.set_style !== undefined) payload.set_style = exerciseRow.set_style;
      if (exerciseRow.rir_target_min !== undefined) payload.rir_target_min = exerciseRow.rir_target_min;
      if (exerciseRow.rir_target_max !== undefined) payload.rir_target_max = exerciseRow.rir_target_max;
      if (exerciseRow.rpe_target_min !== undefined) payload.rpe_target_min = exerciseRow.rpe_target_min;
      if (exerciseRow.rpe_target_max !== undefined) payload.rpe_target_max = exerciseRow.rpe_target_max;
      if (exerciseRow.pause_seconds !== undefined) payload.pause_seconds = exerciseRow.pause_seconds;

      const { error: exError } = await supabase
        .from('user_workout_plan_exercises')
        .insert(payload);

      if (exError) {
        return {
          success: false,
          reason: exError.message || 'Failed to copy plan exercise.',
          newPlanId: newPlan.id,
          auditRows: changedAuditRows,
        };
      }

      if (nextExerciseId !== exerciseRow.exercise_id) {
        changedAuditRows.push({
          job_id: input.jobId || null,
          entity_type: 'plan',
          entity_id: input.plan.id,
          user_id: input.plan.user_id,
          day_id: day.id,
          day_name: day.name,
          row_id: exerciseRow.id,
          operation: input.mode === 'preview' ? 'preview' : 'migrate',
          status: 'changed',
          violation_types:
            remediation?.audit.violations.find((item) => item.rowId === exerciseRow.id)?.violationTypes || [],
          before_json: {
            planId: input.plan.id,
            previousExerciseId: exerciseRow.exercise_id,
            previousExerciseName: exerciseRow.exercise?.name,
          },
          after_json: {
            newPlanId: newPlan.id,
            nextExerciseId,
          },
        });
      }
    }
  }

  for (const scheduleRow of input.schedule) {
    const mappedPlanDayId = scheduleRow.plan_day_id ? (oldToNewDayId.get(scheduleRow.plan_day_id) || null) : null;
    const { error: scheduleError } = await supabase
      .from('user_workout_plan_schedule')
      .insert({
        plan_id: newPlan.id,
        plan_day_id: mappedPlanDayId,
        scheduled_date: scheduleRow.scheduled_date,
        session_type: scheduleRow.session_type,
        status: scheduleRow.status,
        original_date: scheduleRow.original_date,
        completed_session_id: scheduleRow.completed_session_id,
        notes: scheduleRow.notes,
      });

    if (scheduleError) {
      return {
        success: false,
        reason: scheduleError.message || 'Failed to copy plan schedule.',
        newPlanId: newPlan.id,
        auditRows: changedAuditRows,
      };
    }
  }

  if (input.mode === 'activate') {
    await supabase
      .from('user_workout_plans')
      .update({ is_active: false, lifecycle_state: 'archived' })
      .eq('id', input.plan.id);

    await supabase
      .from('user_workout_plans')
      .update({ is_active: true, lifecycle_state: 'live', replaces_plan_id: null })
      .eq('id', newPlan.id);
  }

  return {
    success: true,
    reason: null,
    newPlanId: newPlan.id,
    auditRows: changedAuditRows,
  };
}
