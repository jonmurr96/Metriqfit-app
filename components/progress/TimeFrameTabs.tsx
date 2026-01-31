import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';

type TimeFrame = 'week' | 'month' | 'year';

interface TimeFrameTabsProps {
  selected: TimeFrame;
  onSelect: (frame: TimeFrame) => void;
}

const TABS: { key: TimeFrame; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

/**
 * Stadium pill-style tabs matching unified design system.
 * Active tab has cyan glow, inactive tabs have ring outline.
 */
export function TimeFrameTabs({ selected, onSelect }: TimeFrameTabsProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <MotiView
      from={{ opacity: 0, translateY: -10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.container}
    >
      {TABS.map((tab, index) => {
        const isActive = selected === tab.key;
        return (
          <MotiView
            key={tab.key}
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: 50 + index * 50 }}
          >
            <Pressable
              style={({ pressed }) => [
                styles.tab,
                {
                  backgroundColor: isActive ? c.primary : 'transparent',
                  borderRadius: r.pill,
                  borderWidth: 2,
                  borderColor: isActive ? c.primary : `${c.primary}40`,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
                isActive && {
                  shadowColor: c.primary,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 12,
                },
                isActive && Platform.OS === 'web' && {
                  boxShadow: `0 0 20px ${c.primary}60`,
                } as any,
              ]}
              onPress={() => onSelect(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? c.bg : c.textMuted,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.sm,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          </MotiView>
        );
      })}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  tab: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabText: {
    letterSpacing: 0.5,
  },
});
