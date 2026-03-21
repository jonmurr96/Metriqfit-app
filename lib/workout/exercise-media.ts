export type ExerciseMediaSource = {
  exerciseId?: string;
  videoUrl?: string | null;
  gifUrl?: string | null;
  imageUrl?: string | null;
  posterUrl?: string | null;
  hasMedia?: boolean | null;
  sourceProvider?: string | null;
};

export type ExerciseMediaKind = 'video' | 'gif' | 'image' | 'poster' | 'placeholder';

export type ExercisePrimaryMedia = {
  kind: ExerciseMediaKind;
  uri: string | null;
};

export function normalizeExerciseMedia(input?: ExerciseMediaSource | null): ExerciseMediaSource {
  if (!input) {
    return {};
  }

  return {
    exerciseId: input.exerciseId,
    videoUrl: input.videoUrl ?? null,
    gifUrl: input.gifUrl ?? null,
    imageUrl: input.imageUrl ?? null,
    posterUrl: input.posterUrl ?? null,
    hasMedia: input.hasMedia ?? null,
    sourceProvider: input.sourceProvider ?? null,
  };
}

export function pickPrimaryExerciseMedia(media?: ExerciseMediaSource | null): ExercisePrimaryMedia {
  const normalized = normalizeExerciseMedia(media);

  if (normalized.videoUrl) {
    return { kind: 'video', uri: normalized.videoUrl };
  }

  if (normalized.gifUrl) {
    return { kind: 'gif', uri: normalized.gifUrl };
  }

  if (normalized.imageUrl) {
    return { kind: 'image', uri: normalized.imageUrl };
  }

  if (normalized.posterUrl) {
    return { kind: 'poster', uri: normalized.posterUrl };
  }

  return { kind: 'placeholder', uri: null };
}

export function hasRenderableExerciseMedia(media?: ExerciseMediaSource | null): boolean {
  return pickPrimaryExerciseMedia(media).kind !== 'placeholder';
}
