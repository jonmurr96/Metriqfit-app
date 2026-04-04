import assert from 'node:assert/strict';
import test from 'node:test';

import { buildWeeklySchedule } from './schedule-builder.ts';

test('schedule builder preserves exact explicit weekdays for 3-day PPL', () => {
  const result = buildWeeklySchedule({
    familyKey: 'ppl_3',
    trainingDays: ['tue', 'thu', 'sat'],
  });

  const workoutDays = result.assignments
    .filter((assignment) => assignment.template.type === 'workout')
    .map((assignment) => assignment.weekday);

  assert.deepEqual(workoutDays, ['tue', 'thu', 'sat']);
  assert.equal(result.assignments.find((assignment) => assignment.weekday === 'mon')?.template.type, 'rest');
});

test('schedule builder maps 5-day hybrid split onto the selected weekdays only', () => {
  const result = buildWeeklySchedule({
    familyKey: 'ppl_ul_hybrid_5',
    trainingDays: ['mon', 'tue', 'thu', 'fri', 'sat'],
  });

  const workoutDays = result.assignments
    .filter((assignment) => assignment.template.type === 'workout')
    .map((assignment) => assignment.weekday);

  assert.deepEqual(workoutDays, ['mon', 'tue', 'thu', 'fri', 'sat']);
  assert.equal(result.assignments.find((assignment) => assignment.weekday === 'wed')?.template.type, 'rest');
  assert.equal(result.assignments.find((assignment) => assignment.weekday === 'sun')?.template.type, 'rest');
});
