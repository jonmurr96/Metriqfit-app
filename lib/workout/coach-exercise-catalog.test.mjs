import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COACH_EXERCISE_CATALOG_VERSION,
  resolveCoachExerciseCatalogEntry,
} from './coach-exercise-catalog.ts';

function makeExercise(id, name, primary_muscle = 'chest', category = 'Upper Body', pattern = null, equipment = ['barbell']) {
  return {
    id,
    name,
    category,
    equipment_required: equipment,
    primary_muscle,
    pattern,
    difficulty: 'intermediate',
  };
}

test('coach catalog marks staple exercises as approved defaults', () => {
  const entry = resolveCoachExerciseCatalogEntry(
    makeExercise('bench', 'Barbell Bench Press', 'chest', 'Upper Body', 'horizontal_push'),
  );

  assert.equal(entry.catalogVersion, COACH_EXERCISE_CATALOG_VERSION);
  assert.equal(entry.status, 'approved_default');
  assert.equal(entry.canonicalFamily, 'flat_press');
  assert.equal(entry.movementRole, 'horizontal_push');
});

test('coach catalog keeps assisted and weighted pull-up variants as progression-only entries', () => {
  const assisted = resolveCoachExerciseCatalogEntry(
    makeExercise('assist', 'Assisted Pull-Up', 'lats', 'Back / Pull', 'vertical_pull', ['machine']),
  );
  const weighted = resolveCoachExerciseCatalogEntry(
    makeExercise('weighted', 'Weighted Pull-Up', 'lats', 'Back / Pull', 'vertical_pull', ['bodyweight']),
  );

  assert.equal(assisted.status, 'approved_progression');
  assert.equal(weighted.status, 'approved_progression');
  assert.equal(assisted.canonicalFamily, 'vertical_pull_progression');
  assert.equal(weighted.canonicalFamily, 'vertical_pull_progression');
});

test('coach catalog disallows novelty, awkward substitutions, and technique-modifier defaults', () => {
  const blocked = [
    resolveCoachExerciseCatalogEntry(makeExercise('scap', 'Scapula Dips', 'back', 'Upper Body', 'vertical_pull', ['bodyweight'])),
    resolveCoachExerciseCatalogEntry(makeExercise('archer', 'Archer Pull Up', 'lats', 'Back / Pull', 'vertical_pull', ['bodyweight'])),
    resolveCoachExerciseCatalogEntry(makeExercise('band-step', 'Band Step-Up', 'quads', 'Lower Body', 'single_leg', ['band'])),
    resolveCoachExerciseCatalogEntry(makeExercise('odd-row', 'Bodyweight Standing One Arm Row', 'back', 'Back / Pull', 'horizontal_pull', ['bodyweight'])),
    resolveCoachExerciseCatalogEntry(makeExercise('paused', 'Back Squat Paused', 'quads', 'Lower Body', 'compound_squat', ['barbell'])),
  ];

  for (const entry of blocked) {
    assert.equal(entry.status, 'disallowed');
  }
});
