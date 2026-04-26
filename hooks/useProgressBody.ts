import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth/AuthProvider";
import {
  getLatestBodyCheckInStatus,
  getProgressBodyTimeline,
  getProgressPhotoCompareSnapshot,
  type ProgressBodyCheckpoint,
  type ProgressBodyStatusSnapshot,
  type ProgressBodyTimelineSnapshot,
  type ProgressCheckpointStatSummary,
  type ProgressComparePair,
  type ProgressPhotoCompareSnapshot,
} from "../services/progressBodyService";
import type { ProgressPhotoAngle } from "../services/progressPhotoService";

export const progressBodyKeys = {
  all: ["progress-body"] as const,
  timeline: (userId: string, limit: number) => [...progressBodyKeys.all, "timeline", userId, limit] as const,
  compare: (
    userId: string,
    angle: ProgressPhotoAngle,
    beforeCheckpointId: string | null,
    afterCheckpointId: string | null,
  ) => [...progressBodyKeys.all, "compare", userId, angle, beforeCheckpointId || "auto", afterCheckpointId || "auto"] as const,
  latestStatus: (userId: string) => [...progressBodyKeys.all, "latest-status", userId] as const,
};

export function useProgressBodyTimeline(limit = 24) {
  const { user } = useAuth();

  return useQuery<ProgressBodyTimelineSnapshot>({
    queryKey: progressBodyKeys.timeline(user?.id || "", limit),
    queryFn: () => getProgressBodyTimeline(user!.id, limit),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function useProgressPhotoCompare(
  angle: ProgressPhotoAngle = "front",
  beforeCheckpointId?: string | null,
  afterCheckpointId?: string | null,
) {
  const { user } = useAuth();

  return useQuery<ProgressPhotoCompareSnapshot>({
    queryKey: progressBodyKeys.compare(user?.id || "", angle, beforeCheckpointId || null, afterCheckpointId || null),
    queryFn: () =>
      getProgressPhotoCompareSnapshot(user!.id, {
        angle,
        beforeCheckpointId,
        afterCheckpointId,
      }),
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

export function useLatestBodyCheckInStatus() {
  const { user } = useAuth();

  return useQuery<ProgressBodyStatusSnapshot>({
    queryKey: progressBodyKeys.latestStatus(user?.id || ""),
    queryFn: () => getLatestBodyCheckInStatus(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export type {
  ProgressPhotoAngle,
  ProgressBodyTimelineSnapshot,
  ProgressBodyCheckpoint,
  ProgressCheckpointStatSummary,
  ProgressPhotoCompareSnapshot,
  ProgressComparePair,
  ProgressBodyStatusSnapshot,
};
