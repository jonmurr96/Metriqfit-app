import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTokens } from '../../lib/theme';
import { getMacroTheme, type MacroKind } from './macro-theme';

interface MacroStatCardProps {
  macro: MacroKind;
  label?: string;
  primaryValue: string;
  secondaryValue?: string;
  statusText?: string;
  compact?: boolean;
}

export function MacroStatCard({
  macro,
  label,
  primaryValue,
  secondaryValue,
  statusText,
  compact = false,
}: MacroStatCardProps) {
  const { c, s, ty, r } = useTokens();
  const theme = getMacroTheme(c, macro);
  const isCalories = macro === 'calories';
  const resolvedLabel = label || (macro === 'fat' ? 'Fat' : macro.charAt(0).toUpperCase() + macro.slice(1));

  return (
    <LinearGradient
      colors={
        isCalories
          ? [c.bg, c.surface]
          : [theme.softBackgroundStrong, theme.softBackground]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: r.lg,
        borderWidth: 1,
        borderColor: isCalories ? c.border : theme.border,
        padding: compact ? s.sm : s.md,
        minHeight: compact ? 104 : 124,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ gap: 6 }}>
        <Text
          style={{
            color: isCalories ? c.textMuted : theme.text,
            fontFamily: ty.body.familySemibold,
            fontSize: compact ? ty.sizes.xs : ty.sizes.sm,
          }}
        >
          {resolvedLabel}
        </Text>
        <Text
          style={{
            color: isCalories ? c.text : theme.text,
            fontFamily: ty.heading.familySemibold,
            fontSize: compact ? ty.sizes.lg : ty.sizes.xl,
          }}
        >
          {primaryValue}
        </Text>
      </View>

      <View style={{ gap: 2 }}>
        {secondaryValue ? (
          <Text
            style={{
              color: isCalories ? c.textMuted : theme.text,
              opacity: isCalories ? 1 : 0.86,
              fontFamily: ty.body.familyMedium,
              fontSize: ty.sizes.xs,
            }}
          >
            {secondaryValue}
          </Text>
        ) : null}
        {statusText ? (
          <Text
            style={{
              color: isCalories ? c.textSubtle : theme.text,
              opacity: isCalories ? 1 : 0.72,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
            }}
          >
            {statusText}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  );
}
