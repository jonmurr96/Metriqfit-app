import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

import { useTokens } from '../../../lib/theme';
import { useMediaPlaybackGate } from '../../../hooks/useMediaPlaybackGate';
import { useResolvedExerciseMedia } from '../../../hooks/useResolvedExerciseMedia';
import { trackExerciseMediaPreviewVisible } from '../../../lib/analytics';
import { pickPrimaryExerciseMedia } from '../../../lib/workout/exercise-media';

type ExerciseMediaPreviewProps = {
  exerciseId?: string;
  videoUrl?: string | null;
  gifUrl?: string | null;
  imageUrl?: string | null;
  posterUrl?: string | null;
  hasMedia?: boolean | null;
  fit?: 'contain' | 'cover';
  autoplay?: boolean;
  showControls?: boolean;
  loop?: boolean;
  muted?: boolean;
  height?: number;
  borderRadius?: number;
  onPress?: () => void;
  label?: string | null;
  analyticsSource?: string;
  analyticsExerciseId?: string;
};

export function ExerciseMediaPreview({
  exerciseId,
  videoUrl,
  gifUrl,
  imageUrl,
  posterUrl,
  hasMedia,
  fit = 'contain',
  autoplay = true,
  showControls = false,
  loop = true,
  muted = true,
  height = 112,
  borderRadius,
  onPress,
  label,
  analyticsSource,
  analyticsExerciseId,
}: ExerciseMediaPreviewProps) {
  const { c, s, ty, r } = useTokens();
  const isPreviewVisible = useMediaPlaybackGate(autoplay);
  const { media: resolvedMedia } = useResolvedExerciseMedia({
    exerciseId,
    initialMedia: {
      exerciseId,
      videoUrl,
      gifUrl,
      imageUrl,
      posterUrl,
      hasMedia,
    },
  });
  const [videoFailed, setVideoFailed] = useState(false);
  const effectiveMedia = useMemo(
    () => (videoFailed ? { ...resolvedMedia, videoUrl: null } : resolvedMedia),
    [resolvedMedia, videoFailed],
  );
  const primaryMedia = useMemo(() => pickPrimaryExerciseMedia(effectiveMedia), [effectiveMedia]);
  const gatedShouldPlay = isPreviewVisible && primaryMedia.kind === 'video';
  const radius = borderRadius ?? r.lg;
  const trackedVisibilityKey = useRef<string | null>(null);

  useEffect(() => {
    setVideoFailed(false);
  }, [resolvedMedia.videoUrl]);

  useEffect(() => {
    if (!isPreviewVisible || !analyticsSource || !analyticsExerciseId) {
      return;
    }

    const nextKey = `${analyticsSource}:${analyticsExerciseId}`;
    if (trackedVisibilityKey.current === nextKey) {
      return;
    }

    trackedVisibilityKey.current = nextKey;
    trackExerciseMediaPreviewVisible({
      source: analyticsSource,
      exercise_id: analyticsExerciseId,
      media_type: primaryMedia.kind,
    });
  }, [analyticsExerciseId, analyticsSource, isPreviewVisible, primaryMedia.kind]);

  const stageRadius = Math.max(radius - 2, 0);
  const stagePadding = fit === 'contain' ? s.sm : 0;

  const content = useMemo(() => {
    if (primaryMedia.kind === 'video' && primaryMedia.uri && !videoFailed) {
      return (
        <View
          style={{
            flex: 1,
            borderRadius: stageRadius,
            backgroundColor: '#09101b',
            alignItems: 'center',
            justifyContent: 'center',
            padding: stagePadding,
            overflow: 'hidden',
          }}
        >
          <Video
            source={{ uri: primaryMedia.uri }}
            style={styles.mediaFill}
            shouldPlay={gatedShouldPlay}
            isLooping={loop}
            isMuted={muted}
            useNativeControls={showControls}
            resizeMode={fit === 'contain' ? ResizeMode.CONTAIN : ResizeMode.COVER}
            onError={() => setVideoFailed(true)}
          />
        </View>
      );
    }

    if (primaryMedia.uri) {
      return (
        <View
          style={{
            flex: 1,
            borderRadius: stageRadius,
            backgroundColor: '#09101b',
            alignItems: 'center',
            justifyContent: 'center',
            padding: stagePadding,
            overflow: 'hidden',
          }}
        >
          <Image
            source={{ uri: primaryMedia.uri }}
            style={styles.mediaFill}
            resizeMode={fit}
          />
        </View>
      );
    }

    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.placeholder,
          {
            borderRadius: radius,
            backgroundColor: c.surface2,
            borderColor: c.border,
            padding: s.md,
          },
        ]}
      >
        <Ionicons name="play-circle-outline" size={28} color={c.textMuted} />
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.xs,
            marginTop: s.xs,
            textAlign: 'center',
          }}
        >
          No reference available
        </Text>
      </View>
    );
  }, [
    c.border,
    c.surface2,
    c.textMuted,
    fit,
    gatedShouldPlay,
    loop,
    muted,
    radius,
    s.md,
    s.sm,
    s.xs,
    showControls,
    stagePadding,
    stageRadius,
    ty.body.familySemibold,
    ty.sizes.xs,
    primaryMedia.kind,
    primaryMedia.uri,
  ]);

  const containerStyle = {
    height,
    overflow: 'hidden' as const,
    borderRadius: radius,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.border,
  };

  const overlayLabel = label ? (
    <View
      style={{
        position: 'absolute',
        left: s.sm,
        right: s.sm,
        bottom: s.sm,
        backgroundColor: 'rgba(8,12,22,0.74)',
        borderRadius: r.md,
        paddingHorizontal: s.sm,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          color: c.text,
          fontFamily: ty.body.familySemibold,
          fontSize: ty.sizes.xs,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  ) : null;

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={containerStyle}>
        {content}
        {overlayLabel}
      </Pressable>
    );
  }

  return (
    <View style={containerStyle}>
      {content}
      {overlayLabel}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaFill: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
});
