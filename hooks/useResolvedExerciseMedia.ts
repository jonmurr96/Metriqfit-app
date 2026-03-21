import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getExerciseById } from '../services/workoutService';
import {
  hasRenderableExerciseMedia,
  normalizeExerciseMedia,
  type ExerciseMediaSource,
} from '../lib/workout/exercise-media';

function mergeExerciseMedia(primary: ExerciseMediaSource, fallback?: ExerciseMediaSource | null): ExerciseMediaSource {
  if (!fallback) {
    return primary;
  }

  const merged = {
    exerciseId: primary.exerciseId ?? fallback.exerciseId,
    videoUrl: primary.videoUrl ?? fallback.videoUrl ?? null,
    gifUrl: primary.gifUrl ?? fallback.gifUrl ?? null,
    imageUrl: primary.imageUrl ?? fallback.imageUrl ?? null,
    posterUrl: primary.posterUrl ?? fallback.posterUrl ?? null,
    hasMedia: fallback.hasMedia ?? primary.hasMedia ?? null,
    sourceProvider: primary.sourceProvider ?? fallback.sourceProvider ?? null,
  };

  return {
    ...merged,
    hasMedia: hasRenderableExerciseMedia(merged) ? true : merged.hasMedia,
  };
}

export function useResolvedExerciseMedia({
  exerciseId,
  initialMedia,
  enabled = true,
}: {
  exerciseId?: string;
  initialMedia?: ExerciseMediaSource;
  enabled?: boolean;
}) {
  const normalizedInitial = useMemo(
    () => normalizeExerciseMedia({ ...initialMedia, exerciseId: initialMedia?.exerciseId ?? exerciseId }),
    [exerciseId, initialMedia],
  );

  const shouldFetchFallback =
    enabled
    && !!exerciseId
    && !hasRenderableExerciseMedia(normalizedInitial);

  const fallbackQuery = useQuery({
    queryKey: ['workout', 'exercise-media', exerciseId],
    queryFn: async () => {
      const exercise = await getExerciseById(exerciseId!);
      return normalizeExerciseMedia({
        exerciseId: exercise.id,
        videoUrl: exercise.video_url,
        gifUrl: exercise.gif_url,
        imageUrl: exercise.image_url,
        posterUrl: exercise.poster_url,
        hasMedia: exercise.has_media,
        sourceProvider: exercise.source_provider,
      });
    },
    enabled: shouldFetchFallback,
    staleTime: 24 * 60 * 60 * 1000,
  });

  return {
    media: mergeExerciseMedia(normalizedInitial, fallbackQuery.data),
    isLoading: fallbackQuery.isLoading,
  };
}
