import {
  type DayFocusPolicy,
  type ExerciseFocusTag,
  type ProgramExercise,
  type WorkoutFocusTag,
  inferPrimaryExerciseFocus,
  isExerciseAllowedForDayPolicy,
  isExerciseEquipmentCompatible,
  resolveDayFocusPolicy,
  stableHash,
} from './programMappingRules.ts';

export type MappingViolationType =
  | 'focus_mismatch'
  | 'equipment_mismatch'
  | 'duplicate_in_day'
  | 'blueprint_gap';

export type MappingExerciseRow = {
  rowId: string;
  exerciseId: string;
  orderIndex: number;
  blockId?: string | null;
  exercise: ProgramExercise;
};

export type DayAuditExerciseViolation = {
  rowId: string;
  blockId: string | null;
  orderIndex: number;
  exerciseId: string;
  exerciseName: string;
  exerciseFocus: ExerciseFocusTag | null;
  violationTypes: MappingViolationType[];
  recommendedExerciseId: string | null;
  recommendedExerciseName: string | null;
};

export type DayAuditResult = {
  dayId: string;
  dayName: string;
  dayFocus: string | null;
  policy: DayFocusPolicy;
  exerciseCount: number;
  hardViolationCount: number;
  violationCountByType: Record<MappingViolationType, number>;
  violations: DayAuditExerciseViolation[];
};

export type DayRemediationChange = {
  rowId: string;
  previousExerciseId: string;
  previousExerciseName: string;
  nextExerciseId: string;
  nextExerciseName: string;
  violationTypes: MappingViolationType[];
};

export type DayRemediationResult = {
  audit: DayAuditResult;
  changedRows: DayRemediationChange[];
  unresolvedRows: {
    rowId: string;
    exerciseId: string;
    reason: string;
    violationTypes: MappingViolationType[];
  }[];
  replacementByRowId: Record<string, string>;
};

export type DayAuditInput = {
  dayId: string;
  dayName: string;
  dayFocus: string | null;
  dayIndex: number;
  daysPerWeek?: number | null;
  familyKey?: string | null;
  goalTags?: string[] | null;
  templateEquipment?: string[] | null;
  rows: MappingExerciseRow[];
  exercisePool: ProgramExercise[];
};

export function countViolationTypes(violations: DayAuditExerciseViolation[]): Record<MappingViolationType, number> {
  const counts: Record<MappingViolationType, number> = {
    focus_mismatch: 0,
    equipment_mismatch: 0,
    duplicate_in_day: 0,
    blueprint_gap: 0,
  };

  for (const violation of violations) {
    for (const type of violation.violationTypes) {
      counts[type] += 1;
    }
  }

  return counts;
}

function scoreReplacementCandidate(input: {
  candidate: ProgramExercise;
  original: ProgramExercise;
  policy: DayFocusPolicy;
  dayId: string;
  rowId: string;
  dayFocusSeed: string;
}) {
  let score = 0;

  if ((input.candidate.category || '').toLowerCase() === (input.original.category || '').toLowerCase()) {
    score += 5;
  }

  if ((input.candidate.primary_muscle || '').toLowerCase() === (input.original.primary_muscle || '').toLowerCase()) {
    score += 4;
  }

  if ((input.candidate.pattern || '').toLowerCase() === (input.original.pattern || '').toLowerCase()) {
    score += 4;
  }

  const candidateFocus = inferPrimaryExerciseFocus(input.candidate);
  const originalFocus = inferPrimaryExerciseFocus(input.original);
  if (candidateFocus && originalFocus && candidateFocus === originalFocus) {
    score += 6;
  }

  if (candidateFocus && input.policy.primaryFocusTags.includes(candidateFocus as WorkoutFocusTag)) {
    score += 14;
  } else if (candidateFocus && input.policy.supportFocusTags.includes(candidateFocus as WorkoutFocusTag)) {
    score += 3;
  } else if (candidateFocus && input.policy.allowedPrimaryFocuses.includes(candidateFocus)) {
    score -= 4;
  }

  const seed = `${input.dayId}::${input.rowId}::${input.dayFocusSeed}::${input.candidate.id}`;
  score += (stableHash(seed) % 1000) / 1000;

  return score;
}

export function selectDeterministicReplacement(input: {
  policy: DayFocusPolicy;
  dayId: string;
  rowId: string;
  templateEquipment?: string[] | null;
  originalExercise: ProgramExercise;
  exercisePool: ProgramExercise[];
  avoidExerciseIds?: string[];
}): ProgramExercise | null {
  const avoid = new Set((input.avoidExerciseIds || []).filter(Boolean));

  const candidates = input.exercisePool.filter((candidate) => {
    if (!candidate?.id) return false;
    if (avoid.has(candidate.id)) return false;

    if (!isExerciseAllowedForDayPolicy(candidate, input.policy)) return false;

    if (!isExerciseEquipmentCompatible(candidate.equipment_required || [], input.templateEquipment || [])) {
      return false;
    }

    return true;
  });

  if (!candidates.length) return null;

  const focusSeed = input.policy.focusTags.join('_') || 'none';

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: scoreReplacementCandidate({
        candidate,
        original: input.originalExercise,
        policy: input.policy,
        dayId: input.dayId,
        rowId: input.rowId,
        dayFocusSeed: focusSeed,
      }),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.candidate || null;
}

export function auditDayExerciseMappings(input: DayAuditInput): DayAuditResult {
  const policy = resolveDayFocusPolicy({
    dayName: input.dayName,
    dayFocus: input.dayFocus,
    familyKey: input.familyKey,
    dayIndex: input.dayIndex,
    daysPerWeek: input.daysPerWeek,
    goalTags: input.goalTags,
  });

  const seenExerciseIds = new Set<string>();
  const violations: DayAuditExerciseViolation[] = [];

  const rows = (input.rows || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);

  for (const row of rows) {
    const violationTypes: MappingViolationType[] = [];

    if (policy.blueprintGap) {
      violationTypes.push('blueprint_gap');
    }

    if (seenExerciseIds.has(row.exerciseId)) {
      violationTypes.push('duplicate_in_day');
    }

    if (!isExerciseAllowedForDayPolicy(row.exercise, policy)) {
      violationTypes.push('focus_mismatch');
    }

    if (!isExerciseEquipmentCompatible(row.exercise.equipment_required || [], input.templateEquipment || [])) {
      violationTypes.push('equipment_mismatch');
    }

    const hardViolations = violationTypes.filter((type) => type !== 'blueprint_gap');

    if (hardViolations.length > 0 || violationTypes.includes('blueprint_gap')) {
      const replacement = selectDeterministicReplacement({
        policy,
        dayId: input.dayId,
        rowId: row.rowId,
        templateEquipment: input.templateEquipment,
        originalExercise: row.exercise,
        exercisePool: input.exercisePool,
        avoidExerciseIds: [...seenExerciseIds],
      });

      violations.push({
        rowId: row.rowId,
        blockId: row.blockId || null,
        orderIndex: row.orderIndex,
        exerciseId: row.exerciseId,
        exerciseName: row.exercise.name || 'Unknown exercise',
        exerciseFocus: inferPrimaryExerciseFocus(row.exercise),
        violationTypes: Array.from(new Set(violationTypes)),
        recommendedExerciseId: replacement?.id || null,
        recommendedExerciseName: replacement?.name || null,
      });
    }

    seenExerciseIds.add(row.exerciseId);
  }

  const violationCountByType = countViolationTypes(violations);

  return {
    dayId: input.dayId,
    dayName: input.dayName,
    dayFocus: input.dayFocus,
    policy,
    exerciseCount: rows.length,
    hardViolationCount: violations.reduce(
      (count, violation) => count + violation.violationTypes.filter((type) => type !== 'blueprint_gap').length,
      0,
    ),
    violationCountByType,
    violations,
  };
}

export function remediateDayExerciseMappings(input: DayAuditInput): DayRemediationResult {
  const audit = auditDayExerciseMappings(input);
  const rowsById = new Map(input.rows.map((row) => [row.rowId, row]));
  const usedExerciseIds = new Set<string>();
  const replacementByRowId: Record<string, string> = {};
  const changedRows: DayRemediationChange[] = [];
  const unresolvedRows: {
    rowId: string;
    exerciseId: string;
    reason: string;
    violationTypes: MappingViolationType[];
  }[] = [];

  const sortedRows = (input.rows || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const violationsByRowId = new Map(audit.violations.map((violation) => [violation.rowId, violation]));

  for (const row of sortedRows) {
    const violation = violationsByRowId.get(row.rowId);

    if (!violation) {
      if (!usedExerciseIds.has(row.exerciseId)) {
        usedExerciseIds.add(row.exerciseId);
        replacementByRowId[row.rowId] = row.exerciseId;
      } else {
        unresolvedRows.push({
          rowId: row.rowId,
          exerciseId: row.exerciseId,
          reason: 'Duplicate found in clean-pass stage.',
          violationTypes: ['duplicate_in_day'],
        });
      }
      continue;
    }

    const hardViolations = violation.violationTypes.filter((type) => type !== 'blueprint_gap');
    const shouldReplace = hardViolations.length > 0;

    if (!shouldReplace && !usedExerciseIds.has(row.exerciseId)) {
      usedExerciseIds.add(row.exerciseId);
      replacementByRowId[row.rowId] = row.exerciseId;
      continue;
    }

    const replacement = selectDeterministicReplacement({
      policy: audit.policy,
      dayId: input.dayId,
      rowId: row.rowId,
      templateEquipment: input.templateEquipment,
      originalExercise: row.exercise,
      exercisePool: input.exercisePool,
      avoidExerciseIds: [...usedExerciseIds],
    });

    if (!replacement) {
      unresolvedRows.push({
        rowId: row.rowId,
        exerciseId: row.exerciseId,
        reason: 'No compatible replacement candidate was available.',
        violationTypes: violation.violationTypes,
      });
      continue;
    }

    replacementByRowId[row.rowId] = replacement.id;
    usedExerciseIds.add(replacement.id);

    if (replacement.id !== row.exerciseId) {
      const previous = rowsById.get(row.rowId);
      changedRows.push({
        rowId: row.rowId,
        previousExerciseId: previous?.exerciseId || row.exerciseId,
        previousExerciseName: previous?.exercise.name || row.exercise.name || 'Unknown exercise',
        nextExerciseId: replacement.id,
        nextExerciseName: replacement.name || 'Unknown exercise',
        violationTypes: violation.violationTypes,
      });
    }
  }

  return {
    audit,
    changedRows,
    unresolvedRows,
    replacementByRowId,
  };
}

export function summarizeDayAudits(dayAudits: DayAuditResult[]) {
  const summary = {
    checkedDays: dayAudits.length,
    exerciseCount: 0,
    hardViolationCount: 0,
    violationCountByType: {
      focus_mismatch: 0,
      equipment_mismatch: 0,
      duplicate_in_day: 0,
      blueprint_gap: 0,
    } as Record<MappingViolationType, number>,
    violatedDays: 0,
  };

  for (const day of dayAudits) {
    summary.exerciseCount += day.exerciseCount;
    summary.hardViolationCount += day.hardViolationCount;

    if (day.hardViolationCount > 0) {
      summary.violatedDays += 1;
    }

    for (const [type, count] of Object.entries(day.violationCountByType)) {
      summary.violationCountByType[type as MappingViolationType] += Number(count || 0);
    }
  }

  return summary;
}

export function buildMappingRowsFromV2Day(day: {
  blocks?: {
    id: string;
    order_index: number;
    exercises?: {
      id: string;
      exercise_id: string;
      order_index: number;
      exercise?: ProgramExercise | null;
    }[];
  }[];
}): MappingExerciseRow[] {
  const rows: MappingExerciseRow[] = [];
  const sortedBlocks = (day.blocks || []).slice().sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));

  for (const block of sortedBlocks) {
    const sortedExercises = (block.exercises || []).slice().sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0));
    for (const row of sortedExercises) {
      if (!row.exercise) continue;
      rows.push({
        rowId: row.id,
        exerciseId: row.exercise_id,
        orderIndex: Number(block.order_index || 0) * 1000 + Number(row.order_index || 0),
        blockId: block.id,
        exercise: row.exercise,
      });
    }
  }

  return rows.sort((a, b) => a.orderIndex - b.orderIndex);
}

export function buildMappingRowsFromV1Day(day: {
  exercises?: {
    id: string;
    exercise_id: string;
    order_index: number;
    exercise?: ProgramExercise | null;
  }[];
}): MappingExerciseRow[] {
  return (day.exercises || [])
    .filter((row) => !!row.exercise)
    .map((row) => ({
      rowId: row.id,
      exerciseId: row.exercise_id,
      orderIndex: Number(row.order_index || 0),
      blockId: null,
      exercise: row.exercise as ProgramExercise,
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}

export function applyReplacementToRows(
  rows: MappingExerciseRow[],
  replacementByRowId: Record<string, string>,
): (MappingExerciseRow & { replacementExerciseId: string })[] {
  return rows.map((row) => ({
    ...row,
    replacementExerciseId: replacementByRowId[row.rowId] || row.exerciseId,
  }));
}

export function aggregateTagFrequency(rows: MappingExerciseRow[]) {
  const counts: Partial<Record<ExerciseFocusTag, number>> = {};

  for (const row of rows) {
    const tag = inferPrimaryExerciseFocus(row.exercise);
    if (!tag) continue;
    counts[tag] = Number(counts[tag] || 0) + 1;
  }

  return counts;
}

export function parseFocusTagsForExternalUse(dayName: string, dayFocus: string | null): WorkoutFocusTag[] {
  return resolveDayFocusPolicy({
    dayName,
    dayFocus,
    dayIndex: 1,
    daysPerWeek: 1,
    familyKey: null,
    goalTags: [],
  }).focusTags;
}
