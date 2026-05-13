import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

interface IntroScreenProps {
  onComplete: () => void;
}

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const videoRef = useRef<Video>(null);
  const [completed, setCompleted] = useState(false);

  const handleComplete = useCallback(() => {
    if (completed) return;
    setCompleted(true);
    onComplete();
  }, [completed, onComplete]);

  const handlePlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        handleComplete();
      }
    },
    [handleComplete]
  );

  return (
    <Pressable style={styles.container} onPress={handleComplete}>
      <Video
        ref={videoRef}
        source={require('../../assets/videos/intro.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        useNativeControls={false}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  video: {
    flex: 1,
  },
});
