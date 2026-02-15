import { supabase } from '../lib/supabase';

export type WorkoutImportSourceType = 'text' | 'json' | 'csv';

export type WorkoutImportResult = {
  success: boolean;
  jobId: string;
  status: 'needs_mapping' | 'validated' | 'activated';
  validationSummary: {
    dayCount: number;
    exerciseCount: number;
    unresolvedCount: number;
    warnings: string[];
    strictValidation: {
      hasDays: boolean;
      hasExercises: boolean;
      unresolvedAllowedForActivation: boolean;
    };
  };
  unresolvedMappings: Array<{
    sourceExerciseName: string;
    suggestedExerciseName?: string;
    suggestedExerciseId?: string;
    confidence: number;
  }>;
  activatedPlanId?: string | null;
};

export async function importWorkoutPlan(input: {
  sourceType: WorkoutImportSourceType;
  payload: string | Record<string, any>;
  format?: string;
  activate?: boolean;
}): Promise<WorkoutImportResult> {
  const { data, error } = await supabase.functions.invoke('import-workout-plan', {
    body: {
      sourceType: input.sourceType,
      payload: input.payload,
      format: input.format,
      activate: input.activate === true,
    },
  });

  if (error) throw new Error(error.message || 'Failed to import workout plan');
  if (!data?.success) throw new Error(data?.error || 'Failed to import workout plan');

  return data as WorkoutImportResult;
}

export async function resolveWorkoutImportMappings(input: {
  jobId: string;
  mappings: Array<{ sourceExerciseName: string; mappedExerciseId: string }>;
  activate?: boolean;
}): Promise<WorkoutImportResult> {
  const { data, error } = await supabase.functions.invoke('import-workout-plan', {
    body: {
      jobId: input.jobId,
      mappings: input.mappings,
      activate: input.activate === true,
    },
  });

  if (error) throw new Error(error.message || 'Failed to resolve import mappings');
  if (!data?.success) throw new Error(data?.error || 'Failed to resolve import mappings');

  return {
    success: true,
    jobId: data.jobId,
    status: data.status,
    validationSummary: {
      dayCount: 0,
      exerciseCount: 0,
      unresolvedCount: (data.unresolvedMappings || []).length,
      warnings: [],
      strictValidation: {
        hasDays: true,
        hasExercises: true,
        unresolvedAllowedForActivation: false,
      },
    },
    unresolvedMappings: data.unresolvedMappings || [],
    activatedPlanId: data.activatedPlanId || null,
  };
}

export async function getWorkoutImportJob(jobId: string) {
  const { data, error } = await (supabase as any)
    .from('workout_import_jobs')
    .select(`
      *,
      staging_rows:workout_import_staging_rows(*),
      mapping_decisions:workout_import_mapping_decisions(*),
      import_errors:workout_import_errors(*)
    `)
    .eq('id', jobId)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Failed to fetch import job');
  return data;
}
