import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { metriqfitTheme } from '../../../lib/theme';

const { colors: c, spacing: s, radius: r, glass } = metriqfitTheme;

type IconColor = keyof typeof metriqfitTheme.onboarding.iconColors;

interface PremiumOptionCardProps {
  label: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: IconColor | 'primary';
  selected: boolean;
  onPress: () => void;
  type?: 'radio' | 'checkbox';
}

export function PremiumOptionCard({
  label,
  description,
  icon,
  iconColor = 'primary',
  selected,
  onPress,
  type = 'radio',
}: PremiumOptionCardProps) {
  // Map 'cyan', 'teal' etc to c.primary for unified look
  const color = c.primary;

  return (
    <Pressable onPress={onPress}>
      <MotiView
        animate={{
          borderColor: selected ? c.primary : c.border,
          backgroundColor: selected ? `${c.primary}10` : glass.background,
        }}
        transition={{ type: 'timing', duration: 200 } as any}
        style={styles.container}
      >
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: selected ? c.primary : `${c.primary}15` }]}>
            <Ionicons name={icon} size={22} color={selected ? c.bg : c.primary} />
          </View>
        )}

        <View style={styles.content}>
          <Text style={[styles.label, selected && styles.labelSelected]}>
            {label}
          </Text>
          {description && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>

        <View
          style={[
            styles.indicator,
            type === 'checkbox' ? styles.indicatorCheckbox : styles.indicatorRadio,
            selected && styles.indicatorSelected,
          ]}
        >
          {selected && type === 'checkbox' && (
            <Ionicons name="checkmark" size={14} color={c.bg} />
          )}
          {selected && type === 'radio' && (
            <View style={styles.radioDot} />
          )}
        </View>
      </MotiView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: r.md,
    borderWidth: 1,
    marginBottom: s.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: r.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s.md,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: c.text,
  },
  labelSelected: {
    color: c.primary,
  },
  description: {
    fontSize: 12,
    fontFamily: 'Sora_400Regular',
    color: c.textSubtle,
    marginTop: 2,
  },
  indicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: c.textSubtle,
    marginLeft: s.sm,
  },
  indicatorRadio: {
    borderRadius: 12,
  },
  indicatorCheckbox: {
    borderRadius: 6,
  },
  indicatorSelected: {
    backgroundColor: c.primary,
    borderColor: c.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.bg,
  },
});
