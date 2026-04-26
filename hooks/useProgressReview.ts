import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth/AuthProvider";
import {
  getProgressDailyReview,
  getProgressWeeklyReview,
  type ProgressDailyReviewSnapshot,
  type ProgressReviewAction,
  type ProgressReviewMiss,
  type ProgressReviewStatus,
  type ProgressWeeklyReviewSnapshot,
} from "../services/progressReviewService";

export const progressReviewKeys = {
  all: ["progress-review"] as const,
  daily: (userId: string, date: string) => [...progressReviewKeys.all, "daily", userId, date] as const,
  weekly: (userId: string, range: number) => [...progressReviewKeys.all, "weekly", userId, range] as const,
};

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

export function useProgressDailyReview(date?: string) {
  const { user } = useAuth();
  const targetDate = date || todayIso();

  return useQuery<ProgressDailyReviewSnapshot>({
    queryKey: progressReviewKeys.daily(user?.id || "", targetDate),
    queryFn: () => getProgressDailyReview(user!.id, targetDate),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function useProgressWeeklyReview(range = 7) {
  const { user } = useAuth();

  return useQuery<ProgressWeeklyReviewSnapshot>({
    queryKey: progressReviewKeys.weekly(user?.id || "", range),
    queryFn: () => getProgressWeeklyReview(user!.id, range),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export type {
  ProgressDailyReviewSnapshot,
  ProgressWeeklyReviewSnapshot,
  ProgressReviewStatus,
  ProgressReviewMiss,
  ProgressReviewAction,
};
