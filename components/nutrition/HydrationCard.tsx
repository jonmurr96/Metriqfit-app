import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Circle } from 'react-native-svg';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { PressableScale } from '@/components/common/PressableScale';

interface HydrationCardProps {
  current?: number;
  goal?: number;
  onAdd?: () => void;
}

export function HydrationCard({
  current = 1850,
  goal = 3000,
  onAdd,
}: HydrationCardProps) {
  const { c, s, ty, r } = useTokens();
  const [unit, setUnit] = useState<'ml' | 'oz'>('ml');

  const percent = Math.min((current / goal) * 100, 100);

  const displayCurrent = unit === 'ml' ? current : Math.round(current * 0.033814);
  const displayGoal = unit === 'ml' ? goal : Math.round(goal * 0.033814);
  const unitLabel = unit === 'ml' ? 'ml' : 'oz';

  const formatNumber = (num: number) => num.toLocaleString();

  const ringSize = 96;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const waterColor = c.macros.protein;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400, delay: 100 }}
      style={[
        styles.container,
        {
          backgroundColor: c.surface,
          borderRadius: r.xl,
          borderWidth: 1,
          borderColor: c.border,
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: `${waterColor}20`,
                borderRadius: r.md,
              },
            ]}
          >
            <TabBarIcon name="water" color={waterColor} size={22} />
          </View>
          <Text
            style={[
              styles.title,
              {
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
              },
            ]}
          >
            Hydration
          </Text>
        </View>

        {/* ML/OZ Toggle */}
        <View
          style={[
            styles.toggle,
            {
              backgroundColor: c.bg,
              borderRadius: r.xl,
              borderWidth: 1,
              borderColor: c.border,
            },
          ]}
        >
          <Pressable
            style={[
              styles.toggleButton,
              unit === 'ml' && {
                backgroundColor: c.surface2,
                borderRadius: r.lg,
                ...(Platform.OS === 'web' ? { boxShadow: '0 2px 4px rgba(0,0,0,0.2)' } : {}),
              },
            ]}
            onPress={() => setUnit('ml')}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color: unit === 'ml' ? waterColor : c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 10,
                },
              ]}
            >
              ML
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              unit === 'oz' && {
                backgroundColor: c.surface2,
                borderRadius: r.lg,
              },
            ]}
            onPress={() => setUnit('oz')}
          >
            <Text
              style={[
                styles.toggleText,
                {
                  color: unit === 'oz' ? waterColor : c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 10,
                },
              ]}
            >
              OZ
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content row */}
      <View style={styles.content}>
        {/* Ring button */}
        <View style={styles.ringContainer}>
          <Svg width={ringSize} height={ringSize} style={styles.ring}>
            {/* Background circle */}
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={c.surface2}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress circle */}
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={waterColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              rotation="-90"
              origin={`${ringSize / 2}, ${ringSize / 2}`}
            />
          </Svg>
          <PressableScale
            style={(pressed) => [
              styles.addButton,
              {
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: pressed ? waterColor : `${waterColor}60`,
                shadowColor: waterColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              },
              Platform.OS === 'web' && {
                boxShadow: `0 0 12px ${waterColor}40`,
              } as any,
            ]}
            onPress={onAdd}
          >
            <Text style={[styles.addIcon, { color: waterColor, fontSize: 24, fontWeight: '300' }]}>+</Text>
            <Text
              style={[
                styles.addLabel,
                {
                  color: waterColor,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 9,
                  letterSpacing: 1,
                },
              ]}
            >
              ADD
            </Text>
          </PressableScale>
        </View>

        {/* Numbers + progress */}
        <View style={styles.stats}>
          <View style={styles.valueRow}>
            <Text
              style={[
                styles.valueNumber,
                {
                  color: c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: 36,
                },
              ]}
            >
              {formatNumber(displayCurrent)}
            </Text>
            <Text
              style={[
                styles.valueUnit,
                {
                  color: c.textMuted,
                  fontFamily: ty.body.familyMedium,
                  fontSize: ty.sizes.sm,
                  marginLeft: 4,
                },
              ]}
            >
              {unitLabel}
            </Text>
          </View>

          <View style={[styles.progressBar, { backgroundColor: c.surface2, borderRadius: r.sm }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percent}%`,
                  backgroundColor: waterColor,
                  borderRadius: r.sm,
                },
              ]}
            />
          </View>

          <Text
            style={[
              styles.goalText,
              {
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
                marginTop: s.xs,
              },
            ]}
          >
            Goal: {formatNumber(displayGoal)}{unitLabel} • <Text style={{ color: c.textSubtle }}>{Math.round(percent)}% achieved</Text>
          </Text>
        </View>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {},
  toggle: {
    flexDirection: 'row',
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleText: {},
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  ringContainer: {
    width: 96,
    height: 96,
    position: 'relative',
  },
  ring: {
    transform: [{ rotate: '-90deg' }],
  },
  addButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {},
  addLabel: {},
  stats: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  valueNumber: {},
  valueUnit: {},
  progressBar: {
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  goalText: {},
});
