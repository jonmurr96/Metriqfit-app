/* eslint-disable import/no-unresolved */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  auditDayExerciseMappings,
  buildMappingRowsFromV1Day,
  buildMappingRowsFromV2Day,
  remediateDayExerciseMappings,
  summarizeDayAudits,
  type DayAuditResult,
  type DayRemediationResult,
  type MappingViolationType,
} from "../../../lib/workout/programMappingEngine.ts";
import { type ProgramExercise } from "../../../lib/workout/programMappingRules.ts";
import {
  auditPlanDaysForRepair,
  buildTemplateContextCatalog as buildSharedTemplateContextCatalog,
  copyPlanWithRemediation as copyPlanWithSharedRemediation,
  inferPlanTemplateContext as inferSharedPlanTemplateContext,
} from "../../../lib/workout/active-plan-coherence-repair.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Scope = "v1" | "v2" | "both";
type Operation = "audit_templates" | "remediate_templates" | "audit_active_plans" | "migrate_active_plans";

type RequestBody = {
  operation?: Operation;
  scope?: Scope;
  dryRun?: boolean;
  batchSize?: number;
  cursor?: string | null;
  jobId?: string | null;
  adminSecret?: string;
};

type OperationResult = {
  processed: number;
  changed: number;
  skipped: number;
  failed: number;
  cursor: string | null;
  summary: Record<string, unknown>;
  violations: any[];
};

type TemplateCursorState = {
  v1: string | null;
  v2: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function normalizeToken(value: string) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, " ");
}

function stableSortBy<T>(rows: T[], accessor: (row: T) => string | number) {
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

function parseTemplateCursor(cursor: string | null): TemplateCursorState {
  if (!cursor) {
    return { v1: null, v2: null };
  }

  try {
    const parsed = JSON.parse(cursor) as Partial<TemplateCursorState>;
    if (parsed && typeof parsed === "object") {
      return {
        v1: typeof parsed.v1 === "string" ? parsed.v1 : null,
        v2: typeof parsed.v2 === "string" ? parsed.v2 : null,
      };
    }
  } catch {
    // Backward-compatible cursor format: apply same cursor to both scopes.
  }

  return { v1: cursor, v2: cursor };
}

function serializeTemplateCursor(scope: Scope, state: TemplateCursorState): string | null {
  if (scope === "v1") return state.v1;
  if (scope === "v2") return state.v2;
  return JSON.stringify({ v1: state.v1, v2: state.v2 });
}

async function createJob(
  supabase: SupabaseClient,
  input: {
    operation: Operation;
    scope: Scope;
    dryRun: boolean;
    batchSize: number;
    cursor: string | null;
    jobId?: string | null;
  },
): Promise<string> {
  if (input.jobId) {
    await supabase
      .from("workout_mapping_remediation_jobs")
      .update({
        operation: input.operation,
        scope: input.scope,
        dry_run: input.dryRun,
        batch_size: input.batchSize,
        cursor: input.cursor,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("id", input.jobId);

    return input.jobId;
  }

  const { data, error } = await supabase
    .from("workout_mapping_remediation_jobs")
    .insert({
      operation: input.operation,
      scope: input.scope,
      dry_run: input.dryRun,
      batch_size: input.batchSize,
      cursor: input.cursor,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create remediation job");
  }

  return data.id;
}

async function completeJob(
  supabase: SupabaseClient,
  input: {
    jobId: string;
    status: "completed" | "failed";
    processed: number;
    changed: number;
    skipped: number;
    failed: number;
    cursor: string | null;
    summary: Record<string, unknown>;
    errorMessage?: string | null;
  },
) {
  await supabase
    .from("workout_mapping_remediation_jobs")
    .update({
      status: input.status,
      processed: input.processed,
      changed: input.changed,
      skipped: input.skipped,
      failed: input.failed,
      cursor: input.cursor,
      summary_json: input.summary,
      error_message: input.errorMessage || null,
      completed_at: input.status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.jobId);
}

async function insertAuditRows(
  supabase: SupabaseClient,
  rows: any[],
) {
  if (!rows.length) return;

  const chunkSize = 250;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("workout_mapping_remediation_audit")
      .insert(chunk);

    if (error) {
      console.error("[remediate-workout-mappings] failed to insert audit rows", error);
    }
  }
}

async function loadExercisePool(supabase: SupabaseClient): Promise<ProgramExercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, external_id, name, category, equipment_required, primary_muscle, pattern, difficulty")
    .limit(5000);

  if (error) {
    throw new Error(error.message || "Failed to load exercise pool");
  }

  return (data || []) as ProgramExercise[];
}

function summarizeViolations(violations: any[]) {
  const counts: Record<MappingViolationType, number> = {
    focus_mismatch: 0,
    equipment_mismatch: 0,
    duplicate_in_day: 0,
    blueprint_gap: 0,
  };

  for (const violation of violations) {
    for (const type of (violation.violationTypes || []) as MappingViolationType[]) {
      counts[type] += 1;
    }
  }

  return counts;
}

function buildTemplateViolationRows(input: {
  jobId: string;
  entityType: "template_v1" | "template_v2";
  templateId: string;
  dayId: string;
  dayName: string;
  violations: any[];
  operation: "audit" | "remediate";
  templateExternalId: string;
}) {
  return input.violations.map((violation) => ({
    job_id: input.jobId,
    entity_type: input.entityType,
    entity_id: input.templateId,
    day_id: input.dayId,
    day_name: input.dayName,
    row_id: violation.rowId,
    operation: input.operation,
    status: input.operation === "audit" ? "audit_only" : "changed",
    violation_types: violation.violationTypes || [],
    before_json: {
      templateExternalId: input.templateExternalId,
      exerciseId: violation.exerciseId,
      exerciseName: violation.exerciseName,
    },
    after_json: {
      recommendedExerciseId: violation.recommendedExerciseId,
      recommendedExerciseName: violation.recommendedExerciseName,
    },
  }));
}

function collectDayViolationsAsApiRecords(input: {
  templateExternalId?: string;
  templateName?: string;
  planId?: string;
  userId?: string;
  dayId: string;
  dayName: string;
  dayFocus: string | null;
  dayAudit: DayAuditResult;
}) {
  return input.dayAudit.violations.map((violation) => ({
    templateExternalId: input.templateExternalId,
    templateName: input.templateName,
    planId: input.planId,
    userId: input.userId,
    dayId: input.dayId,
    dayName: input.dayName,
    dayFocus: input.dayFocus,
    rowId: violation.rowId,
    exerciseId: violation.exerciseId,
    exerciseName: violation.exerciseName,
    violationTypes: violation.violationTypes,
    recommendedExerciseId: violation.recommendedExerciseId,
    recommendedExerciseName: violation.recommendedExerciseName,
  }));
}

async function loadV2Templates(
  supabase: SupabaseClient,
  scopeCursor: string | null,
  batchSize: number,
) {
  let query = supabase
    .from("workout_program_templates_v2")
    .select(
      `
      id,
      external_id,
      name,
      days_per_week,
      goal_tags,
      equipment_required,
      family:workout_program_families(external_key,display_name),
      days:workout_program_days_v2(
        id,
        sequence_index,
        day_type,
        name,
        focus,
        blocks:workout_program_day_blocks_v2(
          id,
          order_index,
          block_type,
          title,
          exercises:workout_program_block_exercises_v2(
            id,
            exercise_id,
            order_index,
            sets_target,
            reps_min,
            reps_max,
            rest_seconds,
            tempo,
            technique_type,
            technique_config_json,
            set_style,
            rir_target_min,
            rir_target_max,
            rpe_target_min,
            rpe_target_max,
            pause_seconds,
            notes,
            exercise:exercises(id,external_id,name,category,equipment_required,primary_muscle,pattern,difficulty)
          )
        )
      )
    `,
    )
    .eq("is_public", true)
    .order("id", { ascending: true })
    .limit(batchSize);

  if (scopeCursor) {
    query = query.gt("id", scopeCursor);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || "Failed to load v2 templates");

  return (data || []) as any[];
}

async function loadV1Templates(
  supabase: SupabaseClient,
  scopeCursor: string | null,
  batchSize: number,
) {
  let query = supabase
    .from("workout_templates")
    .select(
      `
      id,
      external_id,
      name,
      days_per_week,
      goal_tags,
      equipment_required,
      days:workout_template_days(
        id,
        day_number,
        name,
        focus,
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
          exercise:exercises(id,external_id,name,category,equipment_required,primary_muscle,pattern,difficulty)
        )
      )
    `,
    )
    .eq("is_public", true)
    .order("id", { ascending: true })
    .limit(batchSize);

  if (scopeCursor) {
    query = query.gt("id", scopeCursor);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || "Failed to load v1 templates");

  return (data || []) as any[];
}

function inferPlanTemplateContext(
  plan: { name: string; days_per_week: number },
  dayNames: string[],
  catalog: Array<{ name: string; familyKey: string | null; equipment: string[]; dayNames: string[] }>,
) {
  const planName = normalizeToken(plan.name || "");
  const normalizedDays = dayNames.map((name) => normalizeToken(name));

  let best: {
    score: number;
    familyKey: string | null;
    equipment: string[];
  } | null = null;

  for (const item of catalog) {
    let score = 0;

    if (planName && normalizeToken(item.name).length && planName.includes(normalizeToken(item.name))) {
      score += 6;
    }

    if (item.dayNames.length === normalizedDays.length) {
      score += 2;
    }

    const target = item.dayNames.slice(0, normalizedDays.length);
    for (let i = 0; i < Math.min(normalizedDays.length, target.length); i += 1) {
      if (normalizedDays[i] === normalizeToken(target[i])) {
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
      familyKey: null,
      equipment: [],
    };
  }

  return {
    familyKey: best.familyKey,
    equipment: best.equipment,
  };
}

async function buildTemplateContextCatalog(supabase: SupabaseClient) {
  const { data: v2Templates } = await supabase
    .from("workout_program_templates_v2")
    .select(
      `
      name,
      equipment_required,
      family:workout_program_families(external_key),
      days:workout_program_days_v2(sequence_index,name)
    `,
    )
    .eq("is_public", true)
    .limit(5000);

  const { data: v1Templates } = await supabase
    .from("workout_templates")
    .select(
      `
      name,
      equipment_required,
      days:workout_template_days(day_number,name)
    `,
    )
    .eq("is_public", true)
    .limit(5000);

  const catalog: Array<{ name: string; familyKey: string | null; equipment: string[]; dayNames: string[] }> = [];

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
      familyKey: null,
      equipment: template.equipment_required || [],
      dayNames,
    });
  }

  return catalog;
}

async function runTemplateOperation(
  supabase: SupabaseClient,
  input: {
    jobId: string;
    operation: Operation;
    scope: Scope;
    dryRun: boolean;
    batchSize: number;
    cursor: string | null;
    exercisePool: ProgramExercise[];
  },
): Promise<OperationResult> {
  const shouldProcessV2 = input.scope === "v2" || input.scope === "both";
  const shouldProcessV1 = input.scope === "v1" || input.scope === "both";
  const cursorState = parseTemplateCursor(input.cursor);

  const aggregateDayAudits: DayAuditResult[] = [];
  const apiViolations: any[] = [];
  const auditRows: any[] = [];

  let processed = 0;
  let changed = 0;
  let skipped = 0;
  let failed = 0;
  let nextCursor: string | null = input.cursor;

  if (shouldProcessV2) {
    const templates = await loadV2Templates(supabase, cursorState.v2, input.batchSize);
    for (const template of templates) {
      processed += 1;
      cursorState.v2 = template.id;

      const days = stableSortBy(template.days || [], (day: any) => day.sequence_index).filter((day: any) => day.day_type === "workout");
      for (const day of days) {
        const rows = buildMappingRowsFromV2Day(day);
        const dayAudit = auditDayExerciseMappings({
          dayId: day.id,
          dayName: day.name,
          dayFocus: day.focus,
          dayIndex: Number(day.sequence_index || 1),
          daysPerWeek: Number(template.days_per_week || 0),
          familyKey: template.family?.external_key || null,
          goalTags: template.goal_tags || [],
          templateEquipment: template.equipment_required || [],
          rows,
          exercisePool: input.exercisePool,
        });
        aggregateDayAudits.push(dayAudit);

        if (dayAudit.violations.length > 0) {
          apiViolations.push(
            ...collectDayViolationsAsApiRecords({
              templateExternalId: template.external_id,
              templateName: template.name,
              dayId: day.id,
              dayName: day.name,
              dayFocus: day.focus,
              dayAudit,
            }),
          );

          auditRows.push(
            ...buildTemplateViolationRows({
              jobId: input.jobId,
              entityType: "template_v2",
              templateId: template.id,
              dayId: day.id,
              dayName: day.name,
              violations: dayAudit.violations,
              operation: input.operation === "audit_templates" ? "audit" : "remediate",
              templateExternalId: template.external_id,
            }),
          );
        }

        if (input.operation !== "remediate_templates") {
          continue;
        }

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
          exercisePool: input.exercisePool,
        });

        if (remediation.unresolvedRows.length > 0) {
          failed += remediation.unresolvedRows.length;
          for (const unresolved of remediation.unresolvedRows) {
            auditRows.push({
              job_id: input.jobId,
              entity_type: "template_v2",
              entity_id: template.id,
              day_id: day.id,
              day_name: day.name,
              row_id: unresolved.rowId,
              operation: "remediate",
              status: "failed",
              violation_types: unresolved.violationTypes,
              before_json: {
                templateExternalId: template.external_id,
                exerciseId: unresolved.exerciseId,
              },
              after_json: {},
              error_message: unresolved.reason,
            });
          }
        }

        if (!remediation.changedRows.length) {
          skipped += 1;
          continue;
        }

        if (!input.dryRun) {
          for (const changeRow of remediation.changedRows) {
            const { error: updateError } = await supabase
              .from("workout_program_block_exercises_v2")
              .update({ exercise_id: changeRow.nextExerciseId })
              .eq("id", changeRow.rowId);

            if (updateError) {
              failed += 1;
              auditRows.push({
                job_id: input.jobId,
                entity_type: "template_v2",
                entity_id: template.id,
                day_id: day.id,
                day_name: day.name,
                row_id: changeRow.rowId,
                operation: "remediate",
                status: "failed",
                violation_types: changeRow.violationTypes,
                before_json: {
                  templateExternalId: template.external_id,
                  previousExerciseId: changeRow.previousExerciseId,
                  previousExerciseName: changeRow.previousExerciseName,
                },
                after_json: {
                  nextExerciseId: changeRow.nextExerciseId,
                  nextExerciseName: changeRow.nextExerciseName,
                },
                error_message: updateError.message,
              });
              continue;
            }
          }
        }

        changed += remediation.changedRows.length;
      }
    }
  }

  if (shouldProcessV1) {
    const templates = await loadV1Templates(supabase, cursorState.v1, input.batchSize);
    for (const template of templates) {
      processed += 1;
      cursorState.v1 = template.id;

      const days = stableSortBy(template.days || [], (day: any) => day.day_number);
      for (const day of days) {
        const rows = buildMappingRowsFromV1Day(day);
        const dayAudit = auditDayExerciseMappings({
          dayId: day.id,
          dayName: day.name,
          dayFocus: day.focus,
          dayIndex: Number(day.day_number || 1),
          daysPerWeek: Number(template.days_per_week || 0),
          familyKey: null,
          goalTags: template.goal_tags || [],
          templateEquipment: template.equipment_required || [],
          rows,
          exercisePool: input.exercisePool,
        });
        aggregateDayAudits.push(dayAudit);

        if (dayAudit.violations.length > 0) {
          apiViolations.push(
            ...collectDayViolationsAsApiRecords({
              templateExternalId: template.external_id,
              templateName: template.name,
              dayId: day.id,
              dayName: day.name,
              dayFocus: day.focus,
              dayAudit,
            }),
          );

          auditRows.push(
            ...buildTemplateViolationRows({
              jobId: input.jobId,
              entityType: "template_v1",
              templateId: template.id,
              dayId: day.id,
              dayName: day.name,
              violations: dayAudit.violations,
              operation: input.operation === "audit_templates" ? "audit" : "remediate",
              templateExternalId: template.external_id,
            }),
          );
        }

        if (input.operation !== "remediate_templates") {
          continue;
        }

        const remediation = remediateDayExerciseMappings({
          dayId: day.id,
          dayName: day.name,
          dayFocus: day.focus,
          dayIndex: Number(day.day_number || 1),
          daysPerWeek: Number(template.days_per_week || 0),
          familyKey: null,
          goalTags: template.goal_tags || [],
          templateEquipment: template.equipment_required || [],
          rows,
          exercisePool: input.exercisePool,
        });

        if (remediation.unresolvedRows.length > 0) {
          failed += remediation.unresolvedRows.length;
          for (const unresolved of remediation.unresolvedRows) {
            auditRows.push({
              job_id: input.jobId,
              entity_type: "template_v1",
              entity_id: template.id,
              day_id: day.id,
              day_name: day.name,
              row_id: unresolved.rowId,
              operation: "remediate",
              status: "failed",
              violation_types: unresolved.violationTypes,
              before_json: {
                templateExternalId: template.external_id,
                exerciseId: unresolved.exerciseId,
              },
              after_json: {},
              error_message: unresolved.reason,
            });
          }
        }

        if (!remediation.changedRows.length) {
          skipped += 1;
          continue;
        }

        if (!input.dryRun) {
          for (const changeRow of remediation.changedRows) {
            const { error: updateError } = await supabase
              .from("workout_template_exercises")
              .update({ exercise_id: changeRow.nextExerciseId })
              .eq("id", changeRow.rowId);

            if (updateError) {
              failed += 1;
              auditRows.push({
                job_id: input.jobId,
                entity_type: "template_v1",
                entity_id: template.id,
                day_id: day.id,
                day_name: day.name,
                row_id: changeRow.rowId,
                operation: "remediate",
                status: "failed",
                violation_types: changeRow.violationTypes,
                before_json: {
                  templateExternalId: template.external_id,
                  previousExerciseId: changeRow.previousExerciseId,
                  previousExerciseName: changeRow.previousExerciseName,
                },
                after_json: {
                  nextExerciseId: changeRow.nextExerciseId,
                  nextExerciseName: changeRow.nextExerciseName,
                },
                error_message: updateError.message,
              });
              continue;
            }
          }
        }

        changed += remediation.changedRows.length;
      }
    }
  }

  await insertAuditRows(supabase, auditRows);

  const summary = {
    ...summarizeDayAudits(aggregateDayAudits),
    violationCountByType: summarizeViolations(apiViolations),
    scope: input.scope,
    dryRun: input.dryRun,
  };

  nextCursor = serializeTemplateCursor(input.scope, cursorState);

  return {
    processed,
    changed,
    skipped,
    failed,
    cursor: nextCursor,
    summary,
    violations: apiViolations,
  };
}

async function loadActivePlans(
  supabase: SupabaseClient,
  cursor: string | null,
  batchSize: number,
) {
  let query = supabase
    .from("user_workout_plans")
    .select("id,user_id,name,description,start_date,end_date,days_per_week,total_weeks,current_week,template_id,generation_run_id,version,is_active,source_model,program_template_v2_id,program_family_key,progression_model,training_style_tags,goal_tags,weekly_layout_json,lifecycle_state,replaces_plan_id")
    .eq("is_active", true)
    .order("id", { ascending: true })
    .limit(batchSize);

  if (cursor) {
    query = query.gt("id", cursor);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "Failed to load active workout plans");
  }

  return (data || []) as any[];
}

async function loadPlanDaysAndExercises(supabase: SupabaseClient, planId: string) {
  const { data: days, error: dayError } = await supabase
    .from("user_workout_plan_days")
    .select(
      `
      id,
      plan_id,
      day_number,
      name,
      focus,
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
    .eq("plan_id", planId)
    .order("day_number", { ascending: true });

  if (dayError) {
    throw new Error(dayError.message || "Failed to load workout plan days");
  }

  const dayIds = (days || []).map((day: any) => day.id);

  const { data: blocks, error: blockError } = await supabase
    .from("user_workout_plan_blocks")
    .select("id, plan_day_id, order_index, block_type, title, config_json, is_user_modified")
    .in("plan_day_id", dayIds.length ? dayIds : ["00000000-0000-0000-0000-000000000000"]);

  if (blockError && dayIds.length) {
    throw new Error(blockError.message || "Failed to load workout plan blocks");
  }

  return {
    days: (days || []) as any[],
    blocks: (blocks || []) as any[],
  };
}

async function loadPlanSchedule(supabase: SupabaseClient, planId: string) {
  const { data, error } = await supabase
    .from("user_workout_plan_schedule")
    .select("id, plan_id, plan_day_id, scheduled_date, session_type, status, original_date, completed_session_id, notes")
    .eq("plan_id", planId)
    .order("scheduled_date", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to load plan schedule");
  }

  return (data || []) as any[];
}

function auditPlanDays(input: {
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
    const rows = (day.exercises || [])
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
      goalTags: [],
      templateEquipment: input.templateEquipment,
      rows,
      exercisePool: input.exercisePool,
    });

    dayAudits.push(dayAudit);

    if (dayAudit.violations.length > 0) {
      violations.push(
        ...collectDayViolationsAsApiRecords({
          planId: input.plan.id,
          userId: input.plan.user_id,
          dayId: day.id,
          dayName: day.name,
          dayFocus: day.focus,
          dayAudit,
        }),
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
        goalTags: [],
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

async function copyPlanWithRemediation(input: {
  supabase: SupabaseClient;
  plan: any;
  days: any[];
  blocks: any[];
  schedule: any[];
  remediationsByDayId: Map<string, DayRemediationResult>;
  dryRun: boolean;
  jobId: string;
}) {
  const supabase = input.supabase;

  const unresolved = Array.from(input.remediationsByDayId.values()).flatMap((item) => item.unresolvedRows);
  if (unresolved.length) {
    return {
      success: false,
      reason: `Plan has unresolved replacement rows (${unresolved.length}).`,
      newPlanId: null,
      auditRows: unresolved.map((row) => ({
        job_id: input.jobId,
        entity_type: "plan",
        entity_id: input.plan.id,
        user_id: input.plan.user_id,
        operation: "migrate",
        status: "failed",
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
    .from("user_workout_plans")
    .select("version")
    .eq("user_id", input.plan.user_id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = Number(maxVersionData?.version || input.plan.version || 0) + 1;

  const { data: newPlan, error: newPlanError } = await supabase
    .from("user_workout_plans")
    .insert({
      user_id: input.plan.user_id,
      template_id: input.plan.template_id,
      generation_run_id: input.plan.generation_run_id,
      version: nextVersion,
      is_active: false,
      name: input.plan.name,
      description: input.plan.description,
      start_date: input.plan.start_date,
      end_date: input.plan.end_date,
      days_per_week: input.plan.days_per_week,
      current_week: input.plan.current_week,
      total_weeks: input.plan.total_weeks,
    })
    .select("id")
    .single();

  if (newPlanError || !newPlan) {
    return {
      success: false,
      reason: newPlanError?.message || "Failed to create migrated plan version.",
      newPlanId: null,
      auditRows: [],
    };
  }

  const oldToNewDayId = new Map<string, string>();
  for (const day of stableSortBy(input.days, (row) => row.day_number)) {
    const { data: insertedDay, error: dayError } = await supabase
      .from("user_workout_plan_days")
      .insert({
        plan_id: newPlan.id,
        day_number: day.day_number,
        name: day.name,
        focus: day.focus,
        scheduled_date: day.scheduled_date,
        is_completed: day.is_completed,
        completed_at: day.completed_at,
        session_id: day.session_id,
      })
      .select("id")
      .single();

    if (dayError || !insertedDay) {
      return {
        success: false,
        reason: dayError?.message || "Failed to copy plan day.",
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
      .from("user_workout_plan_blocks")
      .insert({
        plan_day_id: mappedDayId,
        order_index: block.order_index,
        block_type: block.block_type,
        title: block.title,
        config_json: block.config_json || {},
        is_user_modified: block.is_user_modified,
      })
      .select("id")
      .single();

    if (blockError || !insertedBlock) {
      return {
        success: false,
        reason: blockError?.message || "Failed to copy plan block.",
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
        .from("user_workout_plan_exercises")
        .insert(payload);

      if (exError) {
        return {
          success: false,
          reason: exError.message || "Failed to copy plan exercise.",
          newPlanId: newPlan.id,
          auditRows: changedAuditRows,
        };
      }

      if (nextExerciseId !== exerciseRow.exercise_id) {
        changedAuditRows.push({
          job_id: input.jobId,
          entity_type: "plan",
          entity_id: input.plan.id,
          user_id: input.plan.user_id,
          day_id: day.id,
          day_name: day.name,
          row_id: exerciseRow.id,
          operation: "migrate",
          status: "changed",
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
      .from("user_workout_plan_schedule")
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
        reason: scheduleError.message || "Failed to copy plan schedule.",
        newPlanId: newPlan.id,
        auditRows: changedAuditRows,
      };
    }
  }

  await supabase
    .from("user_workout_plans")
    .update({ is_active: false })
    .eq("id", input.plan.id);

  await supabase
    .from("user_workout_plans")
    .update({ is_active: true })
    .eq("id", newPlan.id);

  return {
    success: true,
    reason: null,
    newPlanId: newPlan.id,
    auditRows: changedAuditRows,
  };
}

async function runActivePlanOperation(
  supabase: SupabaseClient,
  input: {
    jobId: string;
    operation: Operation;
    dryRun: boolean;
    batchSize: number;
    cursor: string | null;
    exercisePool: ProgramExercise[];
  },
): Promise<OperationResult> {
  const plans = await loadActivePlans(supabase, input.cursor, input.batchSize);
  const templateCatalog = await buildSharedTemplateContextCatalog(supabase);

  const apiViolations: any[] = [];
  const aggregateDayAudits: DayAuditResult[] = [];
  const auditRows: any[] = [];

  let processed = 0;
  let changed = 0;
  let skipped = 0;
  let failed = 0;
  let nextCursor: string | null = input.cursor;

  for (const plan of plans) {
    processed += 1;
    nextCursor = plan.id;

    if (!["generated", "v2_template", "legacy_template"].includes(String(plan.source_model || "generated"))) {
      skipped += 1;
      continue;
    }

    let dayPayload: { days: any[]; blocks: any[] };
    let schedule: any[];

    try {
      dayPayload = await loadPlanDaysAndExercises(supabase, plan.id);
      schedule = await loadPlanSchedule(supabase, plan.id);
    } catch (error) {
      failed += 1;
      auditRows.push({
        job_id: input.jobId,
        entity_type: "plan",
        entity_id: plan.id,
        user_id: plan.user_id,
        operation: input.operation === "audit_active_plans" ? "audit" : "migrate",
        status: "failed",
        violation_types: [],
        before_json: { planId: plan.id },
        after_json: {},
        error_message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const dayNames = stableSortBy(dayPayload.days, (day) => day.day_number).map((day) => day.name);
    const inferredContext = inferSharedPlanTemplateContext(plan, dayNames, templateCatalog);

    const audit = auditPlanDaysForRepair({
      plan,
      days: dayPayload.days,
      familyKey: plan.program_family_key || inferredContext.familyKey,
      templateEquipment: inferredContext.equipment,
      exercisePool: input.exercisePool,
    });

    aggregateDayAudits.push(...audit.dayAudits);
    apiViolations.push(...audit.violations);

    for (const dayAudit of audit.dayAudits) {
      if (!dayAudit.violations.length) continue;
      for (const violation of dayAudit.violations) {
        auditRows.push({
          job_id: input.jobId,
          entity_type: "plan",
          entity_id: plan.id,
          user_id: plan.user_id,
          day_id: dayAudit.dayId,
          day_name: dayAudit.dayName,
          row_id: violation.rowId,
          operation: input.operation === "audit_active_plans" ? "audit" : "migrate",
          status: input.operation === "audit_active_plans" ? "audit_only" : "changed",
          violation_types: violation.violationTypes,
          before_json: {
            planId: plan.id,
            exerciseId: violation.exerciseId,
            exerciseName: violation.exerciseName,
            familyKey: inferredContext.familyKey,
          },
          after_json: {
            recommendedExerciseId: violation.recommendedExerciseId,
            recommendedExerciseName: violation.recommendedExerciseName,
          },
        });
      }
    }

    const planHasHardViolations = audit.dayAudits.some((dayAudit) => dayAudit.hardViolationCount > 0);
    if (!planHasHardViolations) {
      skipped += 1;
      continue;
    }

    if (input.operation === "audit_active_plans") {
      continue;
    }

    const migration = await copyPlanWithSharedRemediation({
      supabase,
      plan,
      days: dayPayload.days,
      blocks: dayPayload.blocks,
      schedule,
      remediationsByDayId: audit.remediations,
      dryRun: input.dryRun,
      jobId: input.jobId,
      mode: "activate",
      programFamilyKey: plan.program_family_key || inferredContext.familyKey || null,
    });

    if (!migration.success) {
      failed += 1;
      auditRows.push({
        job_id: input.jobId,
        entity_type: "plan",
        entity_id: plan.id,
        user_id: plan.user_id,
        operation: "migrate",
        status: "failed",
        violation_types: [],
        before_json: {
          planId: plan.id,
        },
        after_json: {
          newPlanId: migration.newPlanId,
        },
        error_message: migration.reason,
      });
      if (migration.auditRows?.length) {
        auditRows.push(...migration.auditRows);
      }
      continue;
    }

    if (migration.auditRows?.length) {
      auditRows.push(...migration.auditRows);
      changed += migration.auditRows.length;
    } else {
      changed += 1;
    }
  }

  await insertAuditRows(supabase, auditRows);

  const summary = {
    ...summarizeDayAudits(aggregateDayAudits),
    violationCountByType: summarizeViolations(apiViolations),
    dryRun: input.dryRun,
  };

  return {
    processed,
    changed,
    skipped,
    failed,
    cursor: nextCursor,
    summary,
    violations: apiViolations,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const adminSecret = Deno.env.get("WORKOUT_MAPPING_ADMIN_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !adminSecret) {
    return jsonResponse({ success: false, error: "Missing Supabase config" }, 500);
  }

  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    body = {};
  }

  const operation = body.operation || "audit_templates";
  const scope = (body.scope || "both") as Scope;
  const dryRun = body.dryRun !== false;
  const batchSize = Math.max(1, Math.min(200, Number(body.batchSize || 50)));
  const cursor = body.cursor || null;

  if (body.adminSecret !== adminSecret) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let jobId: string;
  try {
    jobId = await createJob(supabase, {
      operation,
      scope,
      dryRun,
      batchSize,
      cursor,
      jobId: body.jobId || null,
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }

  try {
    const exercisePool = await loadExercisePool(supabase);

    const result =
      operation === "audit_templates" || operation === "remediate_templates"
        ? await runTemplateOperation(supabase, {
            jobId,
            operation,
            scope,
            dryRun,
            batchSize,
            cursor,
            exercisePool,
          })
        : await runActivePlanOperation(supabase, {
            jobId,
            operation,
            dryRun,
            batchSize,
            cursor,
            exercisePool,
          });

    const shouldComplete = (result.processed || 0) < batchSize;

    await completeJob(supabase, {
      jobId,
      status: shouldComplete ? "completed" : "running",
      processed: result.processed,
      changed: result.changed,
      skipped: result.skipped,
      failed: result.failed,
      cursor: result.cursor,
      summary: result.summary,
      errorMessage: null,
    });

    return jsonResponse({
      success: true,
      jobId,
      processed: result.processed,
      changed: result.changed,
      skipped: result.skipped,
      failed: result.failed,
      cursor: result.cursor,
      summary: result.summary,
      violations: result.violations,
      dryRun,
      operation,
      scope,
      completed: shouldComplete,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await completeJob(supabase, {
      jobId,
      status: "failed",
      processed: 0,
      changed: 0,
      skipped: 0,
      failed: 1,
      cursor,
      summary: {},
      errorMessage: message,
    });

    console.error("[remediate-workout-mappings]", error);
    return jsonResponse({ success: false, error: message, jobId }, 500);
  }
});
