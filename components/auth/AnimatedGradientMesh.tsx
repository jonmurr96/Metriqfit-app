import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { MotiView } from 'moti';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface BlobConfig {
  color: string;
  size: number;
  initialX: number;
  initialY: number;
  translateX: number;
  translateY: number;
  duration: number;
  delay: number;
}

const BLOBS: BlobConfig[] = [
  {
    color: 'rgba(34, 211, 238, 0.07)',
    size: 380,
    initialX: SCREEN_W * 0.15,
    initialY: SCREEN_H * 0.1,
    translateX: SCREEN_W * 0.5,
    translateY: SCREEN_H * 0.35,
    duration: 14000,
    delay: 0,
  },
  {
    color: 'rgba(59, 130, 246, 0.05)',
    size: 440,
    initialX: SCREEN_W * 0.55,
    initialY: SCREEN_H * 0.55,
    translateX: -SCREEN_W * 0.4,
    translateY: -SCREEN_H * 0.25,
    duration: 18000,
    delay: 2000,
  },
  {
    color: 'rgba(6, 182, 212, 0.06)',
    size: 320,
    initialX: SCREEN_W * 0.65,
    initialY: SCREEN_H * 0.25,
    translateX: -SCREEN_W * 0.55,
    translateY: SCREEN_H * 0.4,
    duration: 16000,
    delay: 4000,
  },
];

function AnimatedBlob({ config }: { config: BlobConfig }) {
  const { color, size, initialX, initialY, translateX, translateY, duration, delay } = config;

  return (
    <MotiView
      from={{
        opacity: 0.6,
        translateX: initialX,
        translateY: initialY,
        scale: 1,
      }}
      animate={{
        opacity: [0.6, 0.9, 0.6],
        translateX: [initialX, initialX + translateX, initialX],
        translateY: [initialY, initialY + translateY, initialY],
        scale: [1, 1.15, 1],
      }}
      transition={{
        type: 'timing',
        duration,
        delay,
        loop: true,
        repeatReverse: false,
      }}
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

export function AnimatedGradientMesh() {
  return (
    <View style={styles.container} pointerEvents="none">
      {BLOBS.map((blob, index) => (
        <AnimatedBlob key={index} config={blob} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
  },
});
