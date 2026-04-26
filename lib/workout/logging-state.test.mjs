import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildExerciseSetRows,
  buildFinishWorkoutViewModel,
} from './logging-state.ts';

test('saved draft wins over session and previous-session autofill sources', () => {
  const rows = buildExerciseSetRows({
    exercise: {
      id: 'session-ex-1',
      exerciseName: 'Back Squat',
      sets_target: 4,
      reps_min: 5,
      reps_max: 7,
      rest_seconds: 150,
      sets: [
        {
          id: 'set-1',
          set_number: 1,
          reps: 6,
          weight_lb: 225,
          rpe: 8,
          is_warmup: false,
        },
      ],
    },
    draftsBySet: {
      2: {
        weight: '235',
        reps: '5',
        rpe: '9',
        isWarmup: false,
      },
    },
    previousSession: {
      sessionId: 'prev-1',
      sets: [
        {
          set_number: 2,
          reps: 6,
          weight_lb: 230,
          rpe: 8,
          is_warmup: false,
        },
      ],
    },
  });

  const activeRow = rows.rows.find((row) => row.state === 'active');

  assert.equal(activeRow?.setNumber, 2);
  assert.deepEqual(activeRow?.draft, {
    weight: '235',
    reps: '5',
    rpe: '9',
    isWarmup: false,
  });
});

test('current-session working set autofill drives repeat-last and repeat-plus-five actions', () => {
  const rows = buildExerciseSetRows({
    exercise: {
      id: 'session-ex-2',
      exerciseName: 'Incline Press',
      sets_target: 4,
      reps_min: 8,
      reps_max: 10,
      rest_seconds: 90,
      sets: [
        {
          id: 'set-1',
          set_number: 1,
          reps: 8,
          weight_lb: 185,
          rpe: 8,
          is_warmup: false,
        },
      ],
    },
    previousSession: {
      sessionId: 'prev-2',
      sets: [
        {
          set_number: 2,
          reps: 7,
          weight_lb: 180,
          rpe: 8,
          is_warmup: false,
        },
      ],
    },
  });

  const activeRow = rows.rows.find((row) => row.state === 'active');

  assert.equal(activeRow?.setNumber, 2);
  assert.deepEqual(activeRow?.draft, {
    weight: '185',
    reps: '8',
    rpe: '8',
    isWarmup: false,
  });
  assert.equal(activeRow?.previousLabel, '180 x 7');
  assert.equal(activeRow?.canRepeatLast, true);
  assert.equal(activeRow?.canRepeatPlusFive, true);
  assert.deepEqual(activeRow?.repeatPlusFiveDraft, {
    weight: '190',
    reps: '8',
    rpe: '8',
    isWarmup: false,
  });
});

test('previous-session same-set values seed the active row when no current-session work exists', () => {
  const rows = buildExerciseSetRows({
    exercise: {
      id: 'session-ex-3',
      exerciseName: 'Romanian Deadlift',
      sets_target: 3,
      reps_min: 6,
      reps_max: 8,
      rest_seconds: 120,
      sets: [],
    },
    activeSetNumber: 2,
    previousSession: {
      sessionId: 'prev-3',
      sets: [
        {
          set_number: 2,
          reps: 8,
          weight_lb: 225,
          rpe: 8.5,
          is_warmup: false,
        },
      ],
    },
  });

  const activeRow = rows.rows.find((row) => row.state === 'active');

  assert.equal(activeRow?.setNumber, 2);
  assert.deepEqual(activeRow?.draft, {
    weight: '225',
    reps: '8',
    rpe: '8.5',
    isWarmup: false,
  });
});

test('finish view model summarizes incomplete work for early finish', () => {
  const viewModel = buildFinishWorkoutViewModel({
    sessionNote: '',
    elapsedSeconds: 3120,
    exercises: [
      {
        id: 'ex-1',
        exerciseName: 'Back Squat',
        sets_target: 4,
        sets: [
          { set_number: 1, reps: 5, weight_lb: 225, rpe: 8, is_warmup: false },
          { set_number: 2, reps: 5, weight_lb: 225, rpe: 8, is_warmup: false },
        ],
      },
      {
        id: 'ex-2',
        exerciseName: 'Leg Curl',
        sets_target: 3,
        sets: [
          { set_number: 1, reps: 12, weight_lb: 90, rpe: 8, is_warmup: false },
          { set_number: 2, reps: 12, weight_lb: 90, rpe: 8, is_warmup: false },
          { set_number: 3, reps: 12, weight_lb: 90, rpe: 8, is_warmup: false },
        ],
      },
    ],
  });

  assert.equal(viewModel.title, 'Finish Early?');
  assert.equal(viewModel.ctaLabel, 'Finish Anyway');
  assert.equal(viewModel.isEarlyFinish, true);
  assert.equal(viewModel.incompleteItems.length, 1);
  assert.deepEqual(viewModel.incompleteItems[0], {
    exerciseId: 'ex-1',
    exerciseName: 'Back Squat',
    remainingSets: 2,
  });
});

test('finish view model promotes a clean finish when all planned work is logged', () => {
  const viewModel = buildFinishWorkoutViewModel({
    sessionNote: 'Felt sharp.',
    elapsedSeconds: 4200,
    exercises: [
      {
        id: 'ex-1',
        exerciseName: 'Bench Press',
        sets_target: 3,
        sets: [
          { set_number: 1, reps: 8, weight_lb: 185, rpe: 8, is_warmup: false },
          { set_number: 2, reps: 8, weight_lb: 185, rpe: 8, is_warmup: false },
          { set_number: 3, reps: 8, weight_lb: 185, rpe: 8.5, is_warmup: false },
        ],
      },
    ],
  });

  assert.equal(viewModel.title, 'Finish Workout');
  assert.equal(viewModel.ctaLabel, 'Finish Workout');
  assert.equal(viewModel.isEarlyFinish, false);
  assert.equal(viewModel.noteStatus, 'Session note ready');
  assert.equal(viewModel.totalSets, 3);
});
