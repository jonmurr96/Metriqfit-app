export type ProgressPhotoAngle = "front" | "side" | "back" | "custom";

export interface ProgressBodyPhotoLike {
  id: string;
  measurement_id: string | null;
  angle: ProgressPhotoAngle;
  captured_at: string;
  signed_url: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ProgressMeasurementLike {
  id: string;
  logged_at: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  arms_cm: number | null;
  thighs_cm: number | null;
  hips_cm: number | null;
}

export interface ProgressCheckpointStatSummary {
  waistCm: number | null;
  hipsCm: number | null;
  chestCm: number | null;
  armsCm: number | null;
  thighsCm: number | null;
}

export interface ProgressBodyCheckpoint {
  checkpointId: string;
  measurementId: string | null;
  capturedAt: string;
  label: string;
  angles: ProgressPhotoAngle[];
  photos: ProgressBodyPhotoLike[];
  weightKg: number | null;
  bodyFatPercentage: number | null;
  circumferenceSummary: ProgressCheckpointStatSummary;
  compareEligible: boolean;
  previousComparableCheckpointId: string | null;
  noteCount: number;
  metadataCount: number;
}

export interface ProgressBodyTimelineSnapshot {
  checkpoints: ProgressBodyCheckpoint[];
  totalCheckpoints: number;
  totalPhotos: number;
  latestCheckpointId: string | null;
  latestCapturedAt: string | null;
}

export interface ProgressComparePair {
  checkpointId: string;
  label: string;
  capturedAt: string;
  photo: ProgressBodyPhotoLike | null;
  weightKg: number | null;
  bodyFatPercentage: number | null;
}

export interface ProgressCompareCheckpointOption {
  checkpointId: string;
  label: string;
  capturedAt: string;
}

export interface ProgressPhotoCompareSnapshot {
  angle: ProgressPhotoAngle;
  availableAngles: ProgressPhotoAngle[];
  beforeCheckpoint: ProgressComparePair | null;
  afterCheckpoint: ProgressComparePair | null;
  weightDeltaKg: number | null;
  bodyFatDelta: number | null;
  daysBetween: number | null;
  sparseState: "no_photos" | "one_checkpoint" | "missing_angle_pair" | null;
  checkpointOptions: ProgressCompareCheckpointOption[];
}

const ANGLE_ORDER: ProgressPhotoAngle[] = ["front", "side", "back", "custom"];

function toTimestamp(iso: string) {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function toDateBucket(iso: string) {
  return iso.split("T")[0] || iso;
}

function formatCheckpointLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function uniqueAngles(photos: ProgressBodyPhotoLike[]) {
  const angleSet = new Set<ProgressPhotoAngle>();
  photos.forEach((photo) => {
    angleSet.add(photo.angle);
  });
  return ANGLE_ORDER.filter((angle) => angleSet.has(angle));
}

function sortPhotos(photos: ProgressBodyPhotoLike[]) {
  return [...photos].sort((a, b) => {
    const angleDelta = ANGLE_ORDER.indexOf(a.angle) - ANGLE_ORDER.indexOf(b.angle);
    if (angleDelta !== 0) return angleDelta;
    return toTimestamp(b.captured_at) - toTimestamp(a.captured_at);
  });
}

function sortCheckpoints(checkpoints: ProgressBodyCheckpoint[]) {
  return [...checkpoints].sort((a, b) => toTimestamp(b.capturedAt) - toTimestamp(a.capturedAt));
}

function toCircumferenceSummary(measurement?: ProgressMeasurementLike | null): ProgressCheckpointStatSummary {
  return {
    waistCm: measurement?.waist_cm ?? null,
    hipsCm: measurement?.hips_cm ?? null,
    chestCm: measurement?.chest_cm ?? null,
    armsCm: measurement?.arms_cm ?? null,
    thighsCm: measurement?.thighs_cm ?? null,
  };
}

function hasAnglePhoto(checkpoint: ProgressBodyCheckpoint, angle: ProgressPhotoAngle) {
  return checkpoint.photos.some((photo) => photo.angle === angle);
}

function checkpointPhotoForAngle(
  checkpoint: ProgressBodyCheckpoint,
  angle: ProgressPhotoAngle,
): ProgressBodyPhotoLike | null {
  return checkpoint.photos.find((photo) => photo.angle === angle) || null;
}

function toComparePair(
  checkpoint: ProgressBodyCheckpoint,
  angle: ProgressPhotoAngle,
): ProgressComparePair {
  return {
    checkpointId: checkpoint.checkpointId,
    label: checkpoint.label,
    capturedAt: checkpoint.capturedAt,
    photo: checkpointPhotoForAngle(checkpoint, angle),
    weightKg: checkpoint.weightKg,
    bodyFatPercentage: checkpoint.bodyFatPercentage,
  };
}

export function buildProgressBodyTimelineSnapshot(
  photos: ProgressBodyPhotoLike[],
  measurementsById: Record<string, ProgressMeasurementLike> = {},
): ProgressBodyTimelineSnapshot {
  const groups = new Map<string, ProgressBodyPhotoLike[]>();

  photos.forEach((photo) => {
    const groupKey = photo.measurement_id ? `measurement:${photo.measurement_id}` : `date:${toDateBucket(photo.captured_at)}`;
    const bucket = groups.get(groupKey) || [];
    bucket.push(photo);
    groups.set(groupKey, bucket);
  });

  const checkpoints = sortCheckpoints(
    Array.from(groups.entries()).map(([groupKey, groupedPhotos]) => {
      const sortedPhotos = sortPhotos(groupedPhotos);
      const latestCapturedAt = sortedPhotos.reduce((latest, photo) => {
        return toTimestamp(photo.captured_at) > toTimestamp(latest) ? photo.captured_at : latest;
      }, sortedPhotos[0]?.captured_at || new Date(0).toISOString());
      const measurementId = sortedPhotos[0]?.measurement_id || null;
      const measurement = measurementId ? measurementsById[measurementId] || null : null;

      return {
        checkpointId: groupKey,
        measurementId,
        capturedAt: latestCapturedAt,
        label: formatCheckpointLabel(latestCapturedAt),
        angles: uniqueAngles(sortedPhotos),
        photos: sortedPhotos,
        weightKg: measurement?.weight_kg ?? null,
        bodyFatPercentage: measurement?.body_fat_percentage ?? null,
        circumferenceSummary: toCircumferenceSummary(measurement),
        compareEligible: false,
        previousComparableCheckpointId: null,
        noteCount: sortedPhotos.filter((photo) => Boolean(photo.notes)).length,
        metadataCount: sortedPhotos.filter((photo) => Object.keys(photo.metadata || {}).length > 0).length,
      };
    }),
  );

  const decorated = checkpoints.map((checkpoint, index) => {
    const previousComparable = checkpoints
      .slice(index + 1)
      .find((candidate) => candidate.angles.some((angle) => checkpoint.angles.includes(angle))) || null;

    return {
      ...checkpoint,
      compareEligible: Boolean(previousComparable),
      previousComparableCheckpointId: previousComparable?.checkpointId || null,
    };
  });

  return {
    checkpoints: decorated,
    totalCheckpoints: decorated.length,
    totalPhotos: photos.length,
    latestCheckpointId: decorated[0]?.checkpointId || null,
    latestCapturedAt: decorated[0]?.capturedAt || null,
  };
}

export function buildProgressPhotoCompareSnapshot(input: {
  checkpoints: ProgressBodyCheckpoint[];
  angle?: ProgressPhotoAngle;
  beforeCheckpointId?: string | null;
  afterCheckpointId?: string | null;
}): ProgressPhotoCompareSnapshot {
  const angle = input.angle || "front";
  const sortedCheckpoints = sortCheckpoints(input.checkpoints);
  const availableAngles = ANGLE_ORDER.filter((candidate) =>
    sortedCheckpoints.some((checkpoint) => hasAnglePhoto(checkpoint, candidate)),
  );

  if (sortedCheckpoints.length === 0 || availableAngles.length === 0) {
    return {
      angle,
      availableAngles,
      beforeCheckpoint: null,
      afterCheckpoint: null,
      weightDeltaKg: null,
      bodyFatDelta: null,
      daysBetween: null,
      sparseState: "no_photos",
      checkpointOptions: [],
    };
  }

  const eligible = sortedCheckpoints.filter((checkpoint) => hasAnglePhoto(checkpoint, angle));
  const checkpointOptions = eligible.map((checkpoint) => ({
    checkpointId: checkpoint.checkpointId,
    label: checkpoint.label,
    capturedAt: checkpoint.capturedAt,
  }));

  if (eligible.length < 2) {
    const loneCheckpoint = eligible[0] || null;
    return {
      angle,
      availableAngles,
      beforeCheckpoint: loneCheckpoint ? toComparePair(loneCheckpoint, angle) : null,
      afterCheckpoint: loneCheckpoint ? toComparePair(loneCheckpoint, angle) : null,
      weightDeltaKg: null,
      bodyFatDelta: null,
      daysBetween: null,
      sparseState: eligible.length === 0 ? "missing_angle_pair" : "one_checkpoint",
      checkpointOptions,
    };
  }

  const requestedBefore = input.beforeCheckpointId
    ? eligible.find((checkpoint) => checkpoint.checkpointId === input.beforeCheckpointId) || null
    : null;
  const requestedAfter = input.afterCheckpointId
    ? eligible.find((checkpoint) => checkpoint.checkpointId === input.afterCheckpointId) || null
    : null;

  let before = requestedBefore;
  let after = requestedAfter;

  if (!before || !after || before.checkpointId === after.checkpointId) {
    after = eligible[0];
    before = eligible[1];
  }

  if (toTimestamp(before.capturedAt) > toTimestamp(after.capturedAt)) {
    const swap = before;
    before = after;
    after = swap;
  }

  const daysBetween = Math.max(
    0,
    Math.round((toTimestamp(after.capturedAt) - toTimestamp(before.capturedAt)) / (1000 * 60 * 60 * 24)),
  );

  return {
    angle,
    availableAngles,
    beforeCheckpoint: toComparePair(before, angle),
    afterCheckpoint: toComparePair(after, angle),
    weightDeltaKg:
      before.weightKg != null && after.weightKg != null
        ? round1(after.weightKg - before.weightKg)
        : null,
    bodyFatDelta:
      before.bodyFatPercentage != null && after.bodyFatPercentage != null
        ? round1(after.bodyFatPercentage - before.bodyFatPercentage)
        : null,
    daysBetween,
    sparseState: null,
    checkpointOptions,
  };
}
