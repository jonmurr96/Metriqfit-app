import { supabase } from "../lib/supabase";
import {
  buildProgressBodyTimelineSnapshot,
  buildProgressPhotoCompareSnapshot,
  type ProgressBodyCheckpoint,
  type ProgressBodyTimelineSnapshot,
  type ProgressCheckpointStatSummary,
  type ProgressComparePair,
  type ProgressMeasurementLike,
  type ProgressPhotoCompareSnapshot,
} from "../lib/progress/body-insights";
import {
  listProgressPhotos,
  type ProgressPhoto,
  type ProgressPhotoAngle,
} from "./progressPhotoService";

export type {
  ProgressBodyTimelineSnapshot,
  ProgressBodyCheckpoint,
  ProgressCheckpointStatSummary,
  ProgressPhotoCompareSnapshot,
  ProgressComparePair,
};

export interface ProgressBodyStatusSnapshot {
  latestCheckInAt: string | null;
  latestWeightKg: number | null;
  latestBodyFatPercentage: number | null;
  latestPhotoCheckpointCount: number;
  latestCheckpointId: string | null;
}

type MeasurementRow = ProgressMeasurementLike;

async function getMeasurementsByIds(
  userId: string,
  measurementIds: string[],
): Promise<Record<string, MeasurementRow>> {
  const uniqueIds = [...new Set(measurementIds.filter(Boolean))];
  if (uniqueIds.length === 0) return {};

  const { data, error } = await supabase
    .from("user_measurements")
    .select("id, logged_at, weight_kg, body_fat_percentage, waist_cm, chest_cm, arms_cm, thighs_cm, hips_cm")
    .eq("user_id", userId)
    .in("id", uniqueIds);

  if (error) {
    throw new Error(error.message || "Failed to load linked measurements.");
  }

  return (data || []).reduce<Record<string, MeasurementRow>>((acc, row) => {
    acc[row.id] = row as MeasurementRow;
    return acc;
  }, {});
}

async function getLatestMeasurement(userId: string): Promise<MeasurementRow | null> {
  const { data, error } = await supabase
    .from("user_measurements")
    .select("id, logged_at, weight_kg, body_fat_percentage, waist_cm, chest_cm, arms_cm, thighs_cm, hips_cm")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load latest body measurement.");
  }

  return (data as MeasurementRow) || null;
}

function toMeasurementsMap(photos: ProgressPhoto[], rows: Record<string, MeasurementRow>) {
  const measurementIds = [...new Set(photos.map((photo) => photo.measurement_id).filter(Boolean))] as string[];
  return measurementIds.reduce<Record<string, MeasurementRow>>((acc, measurementId) => {
    const row = rows[measurementId];
    if (row) acc[measurementId] = row;
    return acc;
  }, {});
}

export async function getProgressBodyTimeline(
  userId: string,
  limit = 24,
): Promise<ProgressBodyTimelineSnapshot> {
  const photos = await listProgressPhotos(userId, 240);
  const measurementRows = await getMeasurementsByIds(
    userId,
    photos.map((photo) => photo.measurement_id).filter(Boolean) as string[],
  );

  const snapshot = buildProgressBodyTimelineSnapshot(photos, toMeasurementsMap(photos, measurementRows));

  return {
    ...snapshot,
    checkpoints: snapshot.checkpoints.slice(0, Math.max(1, limit)),
  };
}

export async function getProgressPhotoCompareSnapshot(
  userId: string,
  options?: {
    angle?: ProgressPhotoAngle;
    beforeCheckpointId?: string | null;
    afterCheckpointId?: string | null;
  },
): Promise<ProgressPhotoCompareSnapshot> {
  const photos = await listProgressPhotos(userId, 240);
  const measurementRows = await getMeasurementsByIds(
    userId,
    photos.map((photo) => photo.measurement_id).filter(Boolean) as string[],
  );
  const timeline = buildProgressBodyTimelineSnapshot(photos, toMeasurementsMap(photos, measurementRows));

  return buildProgressPhotoCompareSnapshot({
    checkpoints: timeline.checkpoints,
    angle: options?.angle,
    beforeCheckpointId: options?.beforeCheckpointId,
    afterCheckpointId: options?.afterCheckpointId,
  });
}

export async function getLatestBodyCheckInStatus(userId: string): Promise<ProgressBodyStatusSnapshot> {
  const [timeline, latestMeasurement] = await Promise.all([
    getProgressBodyTimeline(userId, 24),
    getLatestMeasurement(userId).catch(() => null),
  ]);

  const latestCheckpoint = timeline.checkpoints[0] || null;

  return {
    latestCheckInAt: latestCheckpoint?.capturedAt || latestMeasurement?.logged_at || null,
    latestWeightKg: latestCheckpoint?.weightKg ?? latestMeasurement?.weight_kg ?? null,
    latestBodyFatPercentage:
      latestCheckpoint?.bodyFatPercentage ?? latestMeasurement?.body_fat_percentage ?? null,
    latestPhotoCheckpointCount: timeline.totalCheckpoints,
    latestCheckpointId: latestCheckpoint?.checkpointId || null,
  };
}
