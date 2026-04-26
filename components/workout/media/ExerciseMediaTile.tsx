import { Pressable, Text, View } from 'react-native';

import { useTokens } from '../../../lib/theme';
import { ExerciseMediaPreview } from './ExerciseMediaPreview';

type ExerciseMediaTileProps = {
  exerciseId?: string;
  title: string;
  subtitle?: string | null;
  videoUrl?: string | null;
  gifUrl?: string | null;
  imageUrl?: string | null;
  posterUrl?: string | null;
  hasMedia?: boolean | null;
  shouldPlay?: boolean;
  size?: number;
  onPress?: () => void;
};

export function ExerciseMediaTile({
  exerciseId,
  title,
  subtitle,
  videoUrl,
  gifUrl,
  imageUrl,
  posterUrl,
  hasMedia,
  shouldPlay = false,
  size = 88,
  onPress,
}: ExerciseMediaTileProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: size,
        gap: s.xs,
      }}
    >
      <ExerciseMediaPreview
        exerciseId={exerciseId}
        videoUrl={videoUrl}
        gifUrl={gifUrl}
        imageUrl={imageUrl}
        posterUrl={posterUrl}
        hasMedia={hasMedia}
        autoplay={shouldPlay}
        height={size}
        borderRadius={r.md}
        fit="contain"
      />
      <View>
        <Text
          style={{
            color: c.text,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.xs,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
