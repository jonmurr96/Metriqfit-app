import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, G } from 'react-native-svg';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';

interface AnimatedCalorieRingProps {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  showLabels?: boolean;
  animationDelay?: number;
}

export function AnimatedCalorieRing({
  consumed,
  target,
  size = 280,
  strokeWidth = 10,
  showLabels = true,
  animationDelay = 300,
}: AnimatedCalorieRingProps) {
  const { c, ty, gradients, glass } = useTokens();
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const remaining = Math.max(0, target - consumed);
  const percentage = Math.min(consumed / target, 1);

  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(percentage);
    }, animationDelay);
    return () => clearTimeout(timer);
  }, [percentage, animationDelay]);

  const strokeDashoffset = circumference * (1 - animatedProgress);

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 600, delay: 100 }}
      style={styles.container}
    >
      <View style={[styles.ringContainer, { width: size, height: size }]}>
        <View style={[styles.glowContainer, {
          width: size,
          height: size,
          shadowColor: c.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 30,
        }]} />

        <Svg width={size} height={size} style={[styles.svg, Platform.OS === 'web' && { filter: `drop-shadow(0 0 15px ${c.primary}66)` } as any]}>
          <Defs>
            <SvgGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={gradients.brand[0]} />
              <Stop offset="50%" stopColor={gradients.brand[1]} />
              <Stop offset="100%" stopColor={gradients.brand[0]} />
            </SvgGradient>
          </Defs>

          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={c.surface2}
            strokeWidth={strokeWidth - 2}
            fill="transparent"
            strokeLinecap="round"
            opacity={0.4}
          />

          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#ringGradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>

        {showLabels && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay: animationDelay + 200 }}
            style={styles.centerContent}
          >
            <Text style={[styles.label, { color: c.primary, fontFamily: ty.body.familySemibold }]}>
              CALORIES LEFT
            </Text>
            <Text style={[styles.value, { color: c.text, fontFamily: ty.mono.family }]}>
              {remaining.toLocaleString()}
            </Text>
            <View style={[styles.targetBadge, { backgroundColor: glass.backgroundLight }]}>
              <Text style={[styles.targetText, { color: c.textMuted, fontFamily: ty.body.familyMedium }]}>
                Target: {target.toLocaleString()}
              </Text>
            </View>
          </MotiView>
        )}
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
    borderRadius: 9999,
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 56,
    fontWeight: '300',
    letterSpacing: -2,
  },
  targetBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  targetText: {
    fontSize: 10,
  },
});
