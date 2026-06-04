import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { MotiView } from 'moti';
import { PressableScale } from '@/components/common/PressableScale';
import { metriqfitTheme } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';

const { colors: c, radius: r, spacing: s, type: ty } = metriqfitTheme;

interface OnboardingOptionProps {
  title: string;
  subtitle?: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
  index?: number;
}

export function OnboardingOption({
  title,
  subtitle,
  icon,
  selected,
  onPress,
  index = 0,
}: OnboardingOptionProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing' as const, duration: 300, delay: 100 + index * 50 } as any}
    >
      <PressableScale
        style={(pressed) => [
          styles.option,
          {
            backgroundColor: selected ? c.opacity.primaryLight : c.surface,
            borderColor: selected ? c.primary : c.border,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
        onPress={onPress}
      >
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: selected ? c.primary : c.surface }]}>
            <TabBarIcon name={icon as any} size={20} color={selected ? c.bg : c.textMuted} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              { color: selected ? c.primary : c.text, fontFamily: ty.body.familyMedium },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>
              {subtitle}
            </Text>
          )}
        </View>
        <View
          style={[
            styles.radio,
            {
              borderColor: selected ? c.primary : c.border,
              backgroundColor: selected ? c.primary : 'transparent',
            },
          ]}
        >
          {selected && <View style={[styles.radioInner, { backgroundColor: c.bg }]} />}
        </View>
      </PressableScale>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: s.md,
    borderRadius: r.lg,
    borderWidth: 1,
    marginBottom: s.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: r.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
