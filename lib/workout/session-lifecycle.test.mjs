import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSessionStartLocalDateKey,
  isWorkoutSessionExpiredForLocalDay,
} from './session-lifecycle.ts';

test('session start local date key resolves for valid timestamps', () => {
  assert.equal(
    getSessionStartLocalDateKey('2026-03-21T23:30:00-05:00'),
    '2026-03-21',
  );
});

test('same local day session is not expired', () => {
  assert.equal(
    isWorkoutSessionExpiredForLocalDay(
      '2026-03-21T20:00:00-05:00',
      new Date('2026-03-21T22:15:00-05:00'),
    ),
    false,
  );
});

test('next local day session is expired', () => {
  assert.equal(
    isWorkoutSessionExpiredForLocalDay(
      '2026-03-21T23:30:00-05:00',
      new Date('2026-03-22T00:05:00-05:00'),
    ),
    true,
  );
});

test('local-day expiration does not depend on UTC calendar date splits', () => {
  assert.equal(
    isWorkoutSessionExpiredForLocalDay(
      '2026-03-21T23:50:00-05:00',
      new Date('2026-03-21T23:59:00-05:00'),
    ),
    false,
  );
});
