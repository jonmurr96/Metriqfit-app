import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../lib/auth/AuthProvider";
import {
  deleteProgressPhoto,
  listProgressPhotos,
  uploadProgressPhoto,
  type ProgressPhoto,
  type UploadProgressPhotoInput,
} from "../services/progressPhotoService";
import { progressBodyKeys } from "./useProgressBody";

export const progressPhotoKeys = {
  all: ["progress-photos"] as const,
  list: (userId: string, limit: number) => [...progressPhotoKeys.all, userId, limit] as const,
};

export function useProgressPhotos(limit = 120) {
  const { user } = useAuth();

  return useQuery<ProgressPhoto[]>({
    queryKey: progressPhotoKeys.list(user?.id || "", limit),
    queryFn: () => listProgressPhotos(user!.id, limit),
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

export function useUploadProgressPhoto() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<UploadProgressPhotoInput, "userId"> & { userId?: string }) => {
      const userId = input.userId || user?.id;
      if (!userId) throw new Error("User required");
      return uploadProgressPhoto({
        ...input,
        userId,
      });
    },
    onSuccess: () => {
      if (!user?.id) return;
      queryClient.invalidateQueries({
        queryKey: progressPhotoKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: progressBodyKeys.all,
      });
    },
  });
}

export function useDeleteProgressPhoto() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (photoId: string) => {
      if (!user?.id) throw new Error("User required");
      return deleteProgressPhoto(user.id, photoId);
    },
    onSuccess: () => {
      if (!user?.id) return;
      queryClient.invalidateQueries({
        queryKey: progressPhotoKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: progressBodyKeys.all,
      });
    },
  });
}
