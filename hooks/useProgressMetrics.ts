import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth/AuthProvider";
import {
  getHomeSnapshot,
  getProgressRecordSummary,
  getProgressSnapshot,
  getProgressTrends,
  getWeeklyActivityStatus,
  type DailyActivityStatus,
  type HomeSnapshot,
  type ProgressRangeOption,
  type ProgressRecordSummary,
  type ProgressSnapshot,
  type ProgressTrendSnapshot,
} from "../services/progressMetricsService";

export const progressMetricKeys = {
  all: ["progress-metrics"] as const,
  progress: (userId: string, range: ProgressRangeOption) =>
    [...progressMetricKeys.all, "progress", userId, range] as const,
  home: (userId: string) => [...progressMetricKeys.all, "home", userId] as const,
  weeklyActivity: (userId: string) => [...progressMetricKeys.all, "weekly-activity", userId] as const,
  trends: (userId: string, range: ProgressRangeOption) =>
    [...progressMetricKeys.all, "trends", userId, range] as const,
  records: (userId: string, range: "90d" | "all") =>
    [...progressMetricKeys.all, "records", userId, range] as const,
};

export function useProgressSnapshot(range: ProgressRangeOption) {
  const { user } = useAuth();

  return useQuery<ProgressSnapshot>({
    queryKey: progressMetricKeys.progress(user?.id || "", range),
    queryFn: () => getProgressSnapshot(user!.id, range),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function useHomeSnapshot() {
  const { user } = useAuth();

  return useQuery<HomeSnapshot>({
    queryKey: progressMetricKeys.home(user?.id || ""),
    queryFn: () => getHomeSnapshot(user!.id),
    enabled: !!user,
    staleTime: 45 * 1000,
  });
}

export function useWeeklyActivity() {
  const { user } = useAuth();

  return useQuery<DailyActivityStatus[]>({
    queryKey: progressMetricKeys.weeklyActivity(user?.id || ""),
    queryFn: () => getWeeklyActivityStatus(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function useProgressTrends(range: ProgressRangeOption) {
  const { user } = useAuth();

  return useQuery<ProgressTrendSnapshot>({
    queryKey: progressMetricKeys.trends(user?.id || "", range),
    queryFn: () => getProgressTrends(user!.id, range),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function useProgressRecordSummary(range: "90d" | "all" = "90d") {
  const { user } = useAuth();

  return useQuery<ProgressRecordSummary>({
    queryKey: progressMetricKeys.records(user?.id || "", range),
    queryFn: () => getProgressRecordSummary(user!.id, range),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export type {
  ProgressRangeOption,
  ProgressSnapshot,
  ProgressTrendSnapshot,
  ProgressRecordSummary,
  HomeSnapshot,
  DailyActivityStatus,
};
