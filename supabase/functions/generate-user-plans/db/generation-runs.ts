// Generation-run DB writer extracted from index.ts
// during Phase 0.5 monolith split (zero behavior change).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
