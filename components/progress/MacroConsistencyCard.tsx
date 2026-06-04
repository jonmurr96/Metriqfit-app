import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MotiView } from 'moti';
import Svg, { Circle } from 'react-native-svg';
import { useTokens } from '../../lib/theme';
import { GlassCard } from '../../components/premium/GlassCard';
import { PressableScale } from '@/components/common/PressableScale';

interface MacroConsistencyCardProps {
  overallScore?: number;
  proteinPercent?: number;
  carbsPercent?: number;
  fatPercent?: number;
  onViewAnalytics?: () => void;
}

/**
 * Macro consistency card with unified glass + ring design system.
 */
export function MacroConsistencyCard({
  overallScore = 85,
  proteinPercent = 92,
  carbsPercent = 78,
  fatPercent = 88,
  onViewAnalytics,
}: MacroConsistencyCardProps) {
  const { c, s, ty, r } = useTokens();

  const ringSize = 96;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  const macros = [
    { label: 'Protein', percent: proteinPercent, color: c.macros.protein },
    { label: 'Carbs', percent: carbsPercent, color: c.macros.carbs },
    { label: 'Fats', percent: fatPercent, color: c.macros.fat },
  ];

  return (
    <GlassCard glowEffect animated delay={300}>
      <View style={styles.header}>
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
          Macro Consistency
        </Text>
        {/* Ring-style button */}
        <PressableScale
          onPress={onViewAnalytics}
          style={(pressed) => [
            styles.viewButton,
            {
              borderWidth: 2,
              borderColor: pressed ? c.primary : `${c.primary}60`,
              borderRadius: r.pill,
              backgroundColor: pressed ? `${c.primary}15` : 'transparent',
            },
          ]}
        >
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
            }}
          >
            View Analytics
          </Text>
        </PressableScale>
      </View>

      <View style={styles.content}>
        <View style={styles.ringContainer}>
          <Svg width={ringSize} height={ringSize} style={styles.ring}>
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={`${c.primary}20`}
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={c.primary}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              rotation={-90}
              origin={`${ringSize / 2}, ${ringSize / 2}`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text
              style={[
                styles.scoreValue,
                {
                  color: c.text,
                  fontFamily: ty.mono.family,
                  fontSize: 28,
                },
              ]}
            >
              {overallScore}%
            </Text>
            <Text
              style={[
                styles.scoreLabel,
                {
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 10,
                },
              ]}
            >
              SCORE
            </Text>
          </View>
        </View>

        <View style={styles.macroList}>
          {macros.map((macro, index) => (
            <MotiView
              key={macro.label}
              from={{ opacity: 0, translateX: 10 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 300, delay: 400 + index * 80 }}
              style={styles.macroRow}
            >
              <View style={styles.macroLeft}>
                {/* Ring dot instead of filled dot */}
                <View
                  style={[
                    styles.macroDot,
                    {
                      borderWidth: 2,
                      borderColor: macro.color,
                      backgroundColor: 'transparent',
                    }
                  ]}
                />
                <Text
                  style={[
                    styles.macroLabel,
                    {
                      color: c.text,
                      fontFamily: ty.body.family,
                      fontSize: ty.sizes.sm,
                    },
                  ]}
                >
                  {macro.label}
                </Text>
              </View>
              <Text
                style={[
                  styles.macroPercent,
                  {
                    color: macro.color,
                    fontFamily: ty.mono.family,
                    fontSize: ty.sizes.sm,
                  },
                ]}
              >
                {macro.percent}%
              </Text>
            </MotiView>
          ))}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {},
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  ringContainer: {
    position: 'relative',
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    transform: [{ rotate: '-90deg' }],
  },
  ringCenter: {
    alignItems: 'center',
  },
  scoreValue: {
    letterSpacing: -1,
  },
  scoreLabel: {
    letterSpacing: 1,
    marginTop: -2,
  },
  macroList: {
    flex: 1,
    gap: 12,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  macroLabel: {},
  macroPercent: {},
});
