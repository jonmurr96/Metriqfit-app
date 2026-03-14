export const DEFAULT_SESSION_SETS_TARGET = 3;

export interface SessionSnapshotSourceExercise {
  id: string;
  exercise_id: string;
  order_index: number;
  sets_target?: number | null;
  reps_min?: number | null;
  reps_max?: number | null;
  rest_seconds?: number | null;
  notes?: string | null;
  user_notes?: string | null;
}

export interface SessionExerciseSnapshotInsert {
  session_id: string;
  exercise_id: string;
  order_index: number;
  notes: string | null;
  sets_target: number;
  reps_min: number | null;
  reps_max: number | null;
  rest_seconds: number | null;
  plan_exercise_id: string | null;
}

export function buildSessionExerciseSnapshots(input: {
  sessionId: string;
  source: 'plan' | 'template';
  exercises: SessionSnapshotSourceExercise[];
}): SessionExerciseSnapshotInsert[] {
  return input.exercises.map((exercise) => ({
    session_id: input.sessionId,
    exercise_id: exercise.exercise_id,
    order_index: exercise.order_index,
    notes:
      input.source === 'plan'
        ? exercise.user_notes ?? exercise.notes ?? null
        : exercise.notes ?? null,
    sets_target: exercise.sets_target ?? DEFAULT_SESSION_SETS_TARGET,
    reps_min: exercise.reps_min ?? null,
    reps_max: exercise.reps_max ?? null,
    rest_seconds: exercise.rest_seconds ?? null,
    plan_exercise_id: input.source === 'plan' ? exercise.id : null,
  }));
}

export function buildSessionExerciseSnapshotInsertAttempts(
  rows: SessionExerciseSnapshotInsert[],
): Record<string, string | number | null>[][] {
  const attempts: Record<string, string | number | null>[][] = [];
  const seen = new Set<string>();

  const pushAttempt = (nextRows: Record<string, string | number | null>[]) => {
    const signature = JSON.stringify(nextRows);
    if (!seen.has(signature)) {
      seen.add(signature);
      attempts.push(nextRows);
    }
  };

  pushAttempt(rows.map((row) => ({ ...row })));
  pushAttempt(
    rows.map(({ reps_min, reps_max, rest_seconds, ...row }) => ({ ...row })),
  );
  pushAttempt(
    rows.map(({ plan_exercise_id, ...row }) => ({ ...row })),
  );
  pushAttempt(
    rows.map(({ reps_min, reps_max, rest_seconds, plan_exercise_id, ...row }) => ({ ...row })),
  );
  pushAttempt(
    rows.map(({ sets_target, reps_min, reps_max, rest_seconds, plan_exercise_id, ...row }) => ({
      ...row,
    })),
  );

  return attempts;
}
