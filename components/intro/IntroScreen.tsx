import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface IntroScreenProps {
  onComplete: () => void;
}

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const videoRef = useRef<Video>(null);
  const [hasFinished, setHasFinished] = useState(false);

  React.useEffect(() => {
    console.log('🎬 IntroScreen MOUNTED');
  }, []);

  const handleComplete = useCallback(() => {
    if (hasFinished) return;
    console.log('🎬 IntroScreen COMPLETE');
    setHasFinished(true);
    onComplete();
  }, [hasFinished, onComplete]);

  const handlePlaybackStatusUpdate = useCallback(
    (status: any) => {
      console.log('🎬 Video status:', JSON.stringify({
        isLoaded: status?.isLoaded,
        didJustFinish: status?.didJustFinish,
        positionMillis: status?.positionMillis,
        durationMillis: status?.durationMillis,
        isPlaying: status?.isPlaying,
      }));
      if (status?.didJustFinish || status?.positionMillis >= status?.durationMillis - 200) {
        handleComplete();
      }
    },
    [handleComplete]
  );

  const handleError = useCallback((error: any) => {
    console.log('🎬 Video ERROR:', error);
    handleComplete();
  }, [handleComplete]);

  return (
    <Pressable
      style={styles.container}
      onPress={handleComplete}
    >
      <Video
        ref={videoRef}
        source={require('../../assets/videos/intro.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onError={handleError}
        useNativeControls={false}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
