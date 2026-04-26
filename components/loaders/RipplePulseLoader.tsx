import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { MotiView } from 'moti';

const BOX_SIZE = 180;
const CONTAINER_SIZE = BOX_SIZE * 1.4;
const OFFSET = (CONTAINER_SIZE - BOX_SIZE) / 2;

export function RipplePulseLoader() {
  return (
    <View style={styles.loader}>
      {/* Box 1 — contains logo */}
      <MotiView
        animate={{
          scale: [1, 1.3, 1],
          shadowRadius: [10, 30, 10],
        }}
        transition={{
          duration: 2000,
          delay: 0,
          loop: true,
        }}
        style={styles.box}
      >
        <View style={styles.logo}>
          <Image
            source={require('../../assets/brand/mf-logo.png')}
            style={styles.svg}
            resizeMode="contain"
          />
        </View>
      </MotiView>

      {/* Box 2 */}
      <MotiView
        animate={{
          scale: [1, 1.3, 1],
          shadowRadius: [10, 30, 10],
        }}
        transition={{
          duration: 2000,
          delay: 300,
          loop: true,
        }}
        style={styles.box}
      />

      {/* Box 3 */}
      <MotiView
        animate={{
          scale: [1, 1.3, 1],
          shadowRadius: [10, 30, 10],
        }}
        transition={{
          duration: 2000,
          delay: 600,
          loop: true,
        }}
        style={styles.box}
      />

      {/* Box 4 */}
      <MotiView
        animate={{
          scale: [1, 1.3, 1],
          shadowRadius: [10, 30, 10],
        }}
        transition={{
          duration: 2000,
          delay: 900,
          loop: true,
        }}
        style={styles.box}
      />

      {/* Box 5 */}
      <MotiView
        animate={{
          scale: [1, 1.3, 1],
          shadowRadius: [10, 30, 10],
        }}
        transition={{
          duration: 2000,
          delay: 1200,
          loop: true,
        }}
        style={styles.box}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
  },
  box: {
    position: 'absolute',
    top: OFFSET,
    left: OFFSET,
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.15)',
    shadowColor: 'rgba(34, 211, 238, 0.35)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
  },
  logo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    width: 56,
    height: 56,
  },
});
