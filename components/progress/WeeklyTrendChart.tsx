import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';

interface DayData {
  day: string;
  value: number;
  isOverTarget?: boolean;
  isToday?: boolean;
}

interface WeeklyTrendChartProps {
  title?: string;
  subtitle?: string;
  data?: DayData[];
  targetValue?: number;
  changePercent?: number;
  changeDirection?: 'up' | 'down';
  yDomainMin?: number;
  yDomainMax?: number;
  emptyBehavior?: 'zero' | 'min-bar';
}

const DEFAULT_DATA: DayData[] = [
  { day: 'M', value: 60 },
  { day: 'T', value: 85 },
  { day: 'W', value: 70 },
  { day: 'T', value: 90, isToday: true },
  { day: 'F', value: 100, isOverTarget: true },
  { day: 'S', value: 75 },
  { day: 'S', value: 50 },
];

/**
 * Weekly trend chart with unified glass + ring design.
 */
export function WeeklyTrendChart({
  title = 'Daily Calorie vs Target',
  subtitle,
  data = DEFAULT_DATA,
  targetValue = 2400,
  changePercent = 5,
  changeDirection = 'up',
  yDomainMin = 0,
  yDomainMax,
  emptyBehavior = 'zero',
}: WeeklyTrendChartProps) {
  const { c, ty } = useTokens();
  const fallbackMax = yDomainMax ?? Math.max(targetValue, ...data.map((d) => d.value), 1);
  const maxValue = Math.max(fallbackMax, yDomainMin + 1);
  const targetTopPct = clamp(((maxValue - targetValue) / Math.max(1, maxValue - yDomainMin)) * 100, 0, 100);

  return (
    <GlassCard glowEffect animated delay={350}>
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            {
              color: c.text,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
            },
          ]}
        >
          {title.toUpperCase()}
        </Text>
        {/* Ring badge */}
        <View
          style={[
            styles.changeBadge,
            {
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderColor: changeDirection === 'up' ? c.success : c.danger,
            },
          ]}
        >
          <TabBarIcon
            name={changeDirection === 'up' ? 'trending-up' : 'trending-down'}
            color={changeDirection === 'up' ? c.success : c.danger}
            size={12}
          />
          <Text
            style={[
              styles.changeText,
              {
                color: changeDirection === 'up' ? c.success : c.danger,
                fontFamily: ty.body.familySemibold,
                fontSize: 10,
              },
            ]}
          >
            {changeDirection === 'up' ? '+' : '-'}{changePercent}%
          </Text>
        </View>
      </View>

      <View style={styles.chartContainer}>
        <View
          style={[
            styles.targetLine,
            {
              backgroundColor: c.primary,
              top: `${targetTopPct}%`,
            },
          ]}
        />
        <View style={styles.bars}>
          {data.map((item, index) => {
            const normalized = ((item.value - yDomainMin) / Math.max(1, maxValue - yDomainMin)) * 100;
            const minBarPct = emptyBehavior === 'min-bar' ? 3 : 0;
            const heightPercent = clamp(Number.isFinite(normalized) ? normalized : 0, minBarPct, 100);
            const barColor = item.isOverTarget
              ? c.macros.carbs
              : item.isToday
                ? c.success
                : c.primary;

            return (
              <MotiView
                key={`${item.day}-${index}`}
                style={styles.barWrapper}
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 300, delay: 400 + index * 50 }}
              >
                <View style={styles.barContainer}>
                  <MotiView
                    from={{ height: '0%' }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ type: 'timing', duration: 500, delay: 500 + index * 50 }}
                    style={[
                      styles.bar,
                      {
                        backgroundColor: barColor,
                        shadowColor: barColor,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: item.isToday ? 0.6 : 0.3,
                        shadowRadius: 6,
                      },
                      Platform.OS === 'web' && item.isToday && {
                        boxShadow: `0 0 10px ${barColor}80`,
                      } as any,
                    ]}
                  />
                </View>
                {/* Ring day indicator for today */}
                <View
                  style={[
                    styles.dayIndicator,
                    {
                      backgroundColor: item.isToday ? c.primary : 'transparent',
                      borderWidth: item.isToday ? 0 : 1,
                      borderColor: `${c.primary}40`,
                      borderRadius: 12,
                    },
                    item.isToday && {
                      shadowColor: c.primary,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 6,
                    },
                    item.isToday && Platform.OS === 'web' && {
                      boxShadow: `0 0 8px ${c.primary}60`,
                    } as any,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      {
                        color: item.isToday ? c.bg : c.textMuted,
                        fontFamily: ty.body.familySemibold,
                        fontSize: 10,
                      },
                    ]}
                  >
                    {item.day}
                  </Text>
                </View>
              </MotiView>
            );
          })}
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
    marginBottom: 16,
  },
  title: {
    letterSpacing: 0.5,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  changeText: {},
  chartContainer: {
    height: 100,
    position: 'relative',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barContainer: {
    width: '100%',
    height: 80,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  dayIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dayLabel: {},
});

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
