import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../../lib/theme';

type BrandMarkSize = 'xs' | 'sm' | 'md' | 'lg';
type BrandMarkGlow = 'none' | 'soft' | 'hero';

interface BrandMarkProps {
  size?: BrandMarkSize;
  glow?: BrandMarkGlow;
  showLabel?: boolean;
  label?: string;
}

const SIZE_MAP: Record<BrandMarkSize, number> = {
  xs: 32,
  sm: 44,
  md: 72,
  lg: 112,
};

export function BrandMark({
  size = 'md',
  glow = 'soft',
  showLabel = false,
  label = 'MetriqFit Elite',
}: BrandMarkProps) {
  const { c, ty } = useTokens();
  const iconSize = SIZE_MAP[size];
  const glowScale = glow === 'hero' ? 1.04 : glow === 'soft' ? 1.02 : 1;

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/brand/mf-logo.png')}
        style={[
          styles.image,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: iconSize * 0.22,
            transform: [{ scale: glowScale }],
          },
        ]}
        resizeMode="contain"
        accessible
        accessibilityLabel="MetriqFit logo"
      />

      {showLabel ? (
        <Text
          style={[
            styles.label,
            {
              color: c.text,
              fontFamily: ty.heading.familySemibold,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 10,
  },
  image: {
    borderRadius: 0,
  },
  label: {
    fontSize: 16,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
