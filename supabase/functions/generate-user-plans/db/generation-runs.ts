// Generation-run DB writer extracted from index.ts
// during Phase 0.5 monolith split (zero behavior change).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type GenerationOrchestrationStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "validation_failed"
  | "cancelled";

export async function updateGenerationRunStage(
  supabase: SupabaseClient,
  runId: string,
  params: {
    stage: string;
    orchestrationStatus?: GenerationOrchestrationStatus;
    details?: Record<string, unknown> | null;
  },
) {
  const { data: runRow, error: readError } = await supabase
    .from("plan_generation_runs")
    .select("stage_history_json")
    .eq("id", runId)
    .maybeSingle();

  if (readError) {
    console.warn("[generate-user-plans] Failed to read generation stage history:", {
      runId,
      error: readError.message,
    });
  }

  const history = Array.isArray(runRow?.stage_history_json)
    ? runRow.stage_history_json
    : [];
  const nextEvent = {
    stage: params.stage,
    orchestration_status: params.orchestrationStatus ?? "running",
    details: params.details ?? null,
    at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("plan_generation_runs")
    .update({
      orchestration_status: params.orchestrationStatus ?? "running",
      current_stage: params.stage,
      stage_updated_at: nextEvent.at,
      stage_history_json: [...history, nextEvent],
    })
    .eq("id", runId);

  if (error) {
    console.warn("[generate-user-plans] Failed to update generation stage:", {
      runId,
      stage: params.stage,
      error: error.message,
    });
  }
}

export async function updateGenerationRunFailure(
  supabase: SupabaseClient,
  runId: string,
  params: {
    status: "failed" | "validation_failed";
    validationErrors: string[];
    warnings: string[];
    errorStep?: string | null;
    errorCode?: string | null;
    errorContext?: Record<string, unknown> | null;
    aiResponse?: Record<string, unknown> | null;
  },
) {
  const payload: Record<string, unknown> = {
    status: params.status,
    completed_at: new Date().toISOString(),
    validation_errors: params.validationErrors,
    warnings_json: params.warnings,
    error_step: params.errorStep ?? null,
    error_code: params.errorCode ?? null,
    error_context: params.errorContext ?? null,
    orchestration_status: params.status,
    current_stage: params.errorStep ?? params.status,
    stage_updated_at: new Date().toISOString(),
  };

  if (params.aiResponse !== undefined) {
    payload.ai_response = params.aiResponse;
  }

  const { error } = await supabase
    .from("plan_generation_runs")
    .update(payload)
    .eq("id", runId);

  if (error) {
    console.error("[generate-user-plans] Failed to update generation run failure metadata:", {
      runId,
      error: error.message,
      params,
    });
  }
}

export async function updateGenerationRunV3(
  supabase: SupabaseClient,
  runId: string,
  params: {
    status: "success" | "validation_failed";
    diagnostics: Record<string, unknown>;
    specSeedHex: string;
    validationErrors?: string[];
    warnings?: string[];
  },
) {
  const payload: Record<string, unknown> = {
    status: params.status,
    completed_at: new Date().toISOString(),
    generation_version: 3,
    planner_mode: "deterministic_v3",
    orchestration_status: params.status,
    current_stage: params.status === "success" ? "complete" : "validation_failed",
    stage_updated_at: new Date().toISOString(),
    diagnostics_json: params.diagnostics,
    spec_seed_hex: params.specSeedHex,
    validation_errors: params.validationErrors ?? [],
    warnings_json: params.warnings ?? [],
  };

  const { error } = await supabase
    .from("plan_generation_runs")
    .update(payload)
    .eq("id", runId);

  if (error) {
    console.error("[generate-user-plans] Failed to update V3 generation run:", {
      runId,
      error: error.message,
    });
    throw new Error(`updateGenerationRunV3: ${error.message}`);
  }
}
