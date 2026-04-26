import { View } from 'react-native';

import { ExerciseMediaPreview } from './ExerciseMediaPreview';

type ExerciseMediaHeroProps = {
  exerciseId?: string;
  videoUrl?: string | null;
  gifUrl?: string | null;
  imageUrl?: string | null;
  posterUrl?: string | null;
  hasMedia?: boolean | null;
  height?: number;
  autoplay?: boolean;
  showControls?: boolean;
  fit?: 'contain' | 'cover';
  onPress?: () => void;
  label?: string | null;
};

export function ExerciseMediaHero({
  exerciseId,
  videoUrl,
  gifUrl,
  imageUrl,
  posterUrl,
  hasMedia,
  height = 220,
  autoplay = true,
  showControls = false,
  fit = 'contain',
  onPress,
  label,
}: ExerciseMediaHeroProps) {
  return (
    <View>
      <ExerciseMediaPreview
        exerciseId={exerciseId}
        videoUrl={videoUrl}
        gifUrl={gifUrl}
        imageUrl={imageUrl}
        posterUrl={posterUrl}
        hasMedia={hasMedia}
        autoplay={autoplay}
        showControls={showControls}
        height={height}
        fit={fit}
        onPress={onPress}
        label={label}
      />
    </View>
  );
}
