import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../../lib/theme';
import { RingIconButton } from '../common/RingIconButton';
import { GlassCard } from '../premium/GlassCard';

type HomeHabitDockAction = {
  label: string;
  icon: string;
  onPress: () => void;
  active?: boolean;
};

type HomeHabitDockProps = {
  title?: string;
  actions: HomeHabitDockAction[];
  delay?: number;
};

export function HomeHabitDock({
  title = 'HABIT DOCK',
  actions,
  delay = 0,
}: HomeHabitDockProps) {
  const { c, s, ty } = useTokens();

  return (
    <GlassCard intensity="light" animated delay={delay}>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.familySemibold,
          fontSize: ty.sizes.xs,
          letterSpacing: 1.3,
        }}
      >
        {title}
      </Text>

      <View style={[styles.row, { gap: s.md, marginTop: s.lg }]}>
        {actions.map((action, index) => (
          <RingIconButton
            key={`${action.label}-${index}`}
            icon={action.icon}
            label={action.label}
            onPress={action.onPress}
            size={58}
            delay={delay + 80 + index * 40}
            active={action.active}
          />
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
