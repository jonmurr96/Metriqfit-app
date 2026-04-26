import { supabase } from "../lib/supabase";

const PROGRESS_PHOTO_BUCKET = "progress-photos";
const db = supabase as any;

export type ProgressPhotoAngle = "front" | "side" | "back" | "custom";

export interface ProgressPhoto {
  id: string;
  user_id: string;
  measurement_id: string | null;
  angle: ProgressPhotoAngle;
  storage_path: string;
  captured_at: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  signed_url: string | null;
}

export interface UploadProgressPhotoInput {
  userId: string;
  uri: string;
  angle: ProgressPhotoAngle;
  measurementId?: string | null;
  capturedAt?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

function extFromUri(uri: string) {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = (match?.[1] || "jpg").toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return ext;
  return "jpg";
}

function mimeFromExt(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

function mapRow(row: any, signedUrl: string | null): ProgressPhoto {
  return {
    id: row.id,
    user_id: row.user_id,
    measurement_id: row.measurement_id || null,
    angle: row.angle,
    storage_path: row.storage_path,
    captured_at: row.captured_at,
    notes: row.notes || null,
    metadata: row.metadata || {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    signed_url: signedUrl,
  };
}

async function toBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error("Could not read photo file from device.");
  }
  return await res.blob();
}

async function signedUrlForPath(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PROGRESS_PHOTO_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl || null;
}

export async function listProgressPhotos(userId: string, limit = 120): Promise<ProgressPhoto[]> {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  const { data, error } = await db
    .from("progress_photos")
    .select("*")
    .eq("user_id", userId)
    .order("captured_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw new Error(error.message || "Failed to load progress photos.");

  const rows = data || [];
  const signed = await Promise.all(rows.map((row: any) => signedUrlForPath(row.storage_path)));
  return rows.map((row: any, idx: number) => mapRow(row, signed[idx]));
}

export async function uploadProgressPhoto(input: UploadProgressPhotoInput): Promise<ProgressPhoto> {
  const ext = extFromUri(input.uri);
  const mimeType = mimeFromExt(ext);
  const stamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const storagePath = `${input.userId}/${new Date().toISOString().split("T")[0]}/${stamp}-${input.angle}-${random}.${ext}`;

  const fileBlob = await toBlob(input.uri);

  const { error: uploadError } = await supabase.storage
    .from(PROGRESS_PHOTO_BUCKET)
    .upload(storagePath, fileBlob, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload progress photo.");
  }

  const { data: row, error: insertError } = await db
    .from("progress_photos")
    .insert({
      user_id: input.userId,
      measurement_id: input.measurementId || null,
      angle: input.angle,
      storage_path: storagePath,
      captured_at: input.capturedAt || new Date().toISOString(),
      notes: input.notes || null,
      metadata: input.metadata || {},
    })
    .select("*")
    .single();

  if (insertError || !row) {
    await supabase.storage.from(PROGRESS_PHOTO_BUCKET).remove([storagePath]).catch(() => undefined);
    throw new Error(insertError?.message || "Failed to save photo metadata.");
  }

  const signedUrl = await signedUrlForPath(storagePath);
  return mapRow(row, signedUrl);
}

export async function deleteProgressPhoto(userId: string, photoId: string): Promise<void> {
  const { data: row, error: fetchError } = await db
    .from("progress_photos")
    .select("id, storage_path, user_id")
    .eq("id", photoId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError || !row) {
    throw new Error(fetchError?.message || "Photo not found.");
  }

  const { error: storageError } = await supabase.storage
    .from(PROGRESS_PHOTO_BUCKET)
    .remove([row.storage_path]);

  if (storageError) {
    throw new Error(storageError.message || "Failed to delete photo file.");
  }

  const { error: deleteError } = await db
    .from("progress_photos")
    .delete()
    .eq("id", photoId)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(deleteError.message || "Failed to delete photo metadata.");
  }
}

export async function getComparisonPhotos(
  userId: string,
  angle: ProgressPhotoAngle,
  fromDate?: string,
  toDate?: string,
): Promise<{ earliest: ProgressPhoto | null; latest: ProgressPhoto | null }> {
  let query = db
    .from("progress_photos")
    .select("*")
    .eq("user_id", userId)
    .eq("angle", angle)
    .order("captured_at", { ascending: true });

  if (fromDate) query = query.gte("captured_at", `${fromDate}T00:00:00`);
  if (toDate) query = query.lte("captured_at", `${toDate}T23:59:59`);

  const { data, error } = await query;
  if (error) throw new Error(error.message || "Failed to load comparison photos.");

  const rows = data || [];
  if (rows.length === 0) return { earliest: null, latest: null };

  const earliest = rows[0];
  const latest = rows.length > 1 ? rows[rows.length - 1] : null;

  const [earliestUrl, latestUrl] = await Promise.all([
    signedUrlForPath(earliest.storage_path),
    latest ? signedUrlForPath(latest.storage_path) : Promise.resolve(null),
  ]);

  return {
    earliest: mapRow(earliest, earliestUrl),
    latest: latest ? mapRow(latest, latestUrl) : null,
  };
}
