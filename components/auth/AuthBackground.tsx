import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedGradientMesh } from './AnimatedGradientMesh';

export function AuthBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base deep ink layer */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050510' }]} />

      {/* Subtle top-to-bottom gradient for depth */}
      <LinearGradient
        colors={['rgba(34, 211, 238, 0.03)', 'transparent', 'rgba(6, 182, 212, 0.02)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated mesh blobs */}
      <AnimatedGradientMesh />

      {/* Bottom vignette for focus */}
      <LinearGradient
        colors={['transparent', 'rgba(5, 5, 16, 0.6)', 'rgba(5, 5, 16, 0.95)']}
        locations={[0.3, 0.75, 1]}
        style={[StyleSheet.absoluteFill, { top: undefined, height: '50%' }]}
      />
    </View>
  );
}
