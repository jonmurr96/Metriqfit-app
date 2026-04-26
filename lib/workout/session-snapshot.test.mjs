import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSessionExerciseSnapshotInsertAttempts,
  buildSessionExerciseSnapshots,
} from './session-snapshot.ts';

test('plan exercise snapshots preserve target metadata and plan linkage', () => {
  const rows = buildSessionExerciseSnapshots({
    sessionId: 'session-1',
    source: 'plan',
    exercises: [
      {
        id: 'plan-ex-1',
        exercise_id: 'exercise-1',
        order_index: 1,
        sets_target: 4,
        reps_min: 6,
        reps_max: 8,
        rest_seconds: 120,
        user_notes: 'Drive knees out.',
      },
    ],
  });

  assert.deepEqual(rows, [
    {
      session_id: 'session-1',
      exercise_id: 'exercise-1',
      order_index: 1,
      notes: 'Drive knees out.',
      sets_target: 4,
      reps_min: 6,
      reps_max: 8,
      rest_seconds: 120,
      plan_exercise_id: 'plan-ex-1',
    },
  ]);
});

test('template exercise snapshots preserve target metadata without plan linkage', () => {
  const rows = buildSessionExerciseSnapshots({
    sessionId: 'session-2',
    source: 'template',
    exercises: [
      {
        id: 'template-ex-9',
        exercise_id: 'exercise-9',
        order_index: 2,
        sets_target: 3,
        reps_min: 10,
        reps_max: 12,
        rest_seconds: 75,
        notes: 'Control the eccentric.',
      },
    ],
  });

  assert.deepEqual(rows, [
    {
      session_id: 'session-2',
      exercise_id: 'exercise-9',
      order_index: 2,
      notes: 'Control the eccentric.',
      sets_target: 3,
      reps_min: 10,
      reps_max: 12,
      rest_seconds: 75,
      plan_exercise_id: null,
    },
  ]);
});

test('snapshot insert attempts degrade cleanly down to legacy-compatible payloads', () => {
  const attempts = buildSessionExerciseSnapshotInsertAttempts([
    {
      session_id: 'session-3',
      exercise_id: 'exercise-3',
      order_index: 1,
      notes: 'Stay tall.',
      sets_target: 4,
      reps_min: 8,
      reps_max: 10,
      rest_seconds: 90,
      plan_exercise_id: 'plan-ex-3',
    },
  ]);

  assert.deepEqual(attempts[0][0], {
    session_id: 'session-3',
    exercise_id: 'exercise-3',
    order_index: 1,
    notes: 'Stay tall.',
    sets_target: 4,
    reps_min: 8,
    reps_max: 10,
    rest_seconds: 90,
    plan_exercise_id: 'plan-ex-3',
  });
  assert.deepEqual(attempts.at(-1)?.[0], {
    session_id: 'session-3',
    exercise_id: 'exercise-3',
    order_index: 1,
    notes: 'Stay tall.',
  });
});
