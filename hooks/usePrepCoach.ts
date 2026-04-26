import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth";
import {
  getPrepAdjustmentHistory,
  getPrepCoachState,
  revertPrepAdjustment,
  runPrepCoachCheckInAdjustment,
  type PrepCoachAdjustmentResult,
} from "../services/prepCoachService";

export const prepCoachKeys = {
  all: ["prep-coach"] as const,
  state: (userId: string) => [...prepCoachKeys.all, "state", userId] as const,
  history: (userId: string, limit: number) => [...prepCoachKeys.all, "history", userId, limit] as const,
};

export function usePrepCoachState() {
  const { user } = useAuth();
  return useQuery({
    queryKey: prepCoachKeys.state(user?.id || ""),
    queryFn: () => user ? getPrepCoachState(user.id) : Promise.resolve(null),
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}

export function usePrepAdjustmentHistory(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: prepCoachKeys.history(user?.id || "", limit),
    queryFn: () => user ? getPrepAdjustmentHistory(user.id, limit) : Promise.resolve([]),
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

export function useRunPrepCheckInAdjustment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: { measurementId: string; dryRun?: boolean }) => runPrepCoachCheckInAdjustment(input),
    onSuccess: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: prepCoachKeys.state(user.id) });
      queryClient.invalidateQueries({ queryKey: prepCoachKeys.history(user.id, 20) });
      queryClient.invalidateQueries({ queryKey: ["nutrition"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      queryClient.invalidateQueries({ queryKey: ["ai-coach"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useRevertPrepAdjustment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (eventId: string) => {
      if (!user) throw new Error("User required");
      return revertPrepAdjustment(user.id, eventId);
    },
    onSuccess: () => {
      if (!user) return;
      queryClient.invalidateQueries({ queryKey: prepCoachKeys.all });
      queryClient.invalidateQueries({ queryKey: ["nutrition"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      queryClient.invalidateQueries({ queryKey: ["ai-coach"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export type { PrepCoachAdjustmentResult };
