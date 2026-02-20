import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../lib/auth/AuthProvider";
import {
  getHomeSnapshot,
  getProgressSnapshot,
  getWeeklyActivityStatus,
  type DailyActivityStatus,
  type HomeSnapshot,
  type ProgressSnapshot,
  type ProgressTimeframe,
} from "../services/progressMetricsService";

export const progressMetricKeys = {
  all: ["progress-metrics"] as const,
  progress: (userId: string, timeframe: ProgressTimeframe) =>
    [...progressMetricKeys.all, "progress", userId, timeframe] as const,
  home: (userId: string) => [...progressMetricKeys.all, "home", userId] as const,
  weeklyActivity: (userId: string) => [...progressMetricKeys.all, "weekly-activity", userId] as const,
};

export function useProgressSnapshot(timeframe: ProgressTimeframe) {
  const { user } = useAuth();

  return useQuery<ProgressSnapshot>({
    queryKey: progressMetricKeys.progress(user?.id || "", timeframe),
    queryFn: () => getProgressSnapshot(user!.id, timeframe),
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

export type { ProgressTimeframe, ProgressSnapshot, HomeSnapshot, DailyActivityStatus };
