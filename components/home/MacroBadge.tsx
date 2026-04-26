import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { hexToRgba } from '../../lib/theme';
import { useTokens } from '../../lib/theme';

export type MacroKind = 'calories' | 'protein' | 'carbs' | 'fat';

type MacroBadgeSize = 'sm' | 'md';
type MacroBadgeEmphasis = 'solid' | 'soft' | 'outlined';

interface MacroBadgeProps {
  macro: MacroKind;
  value: number | string;
  unit?: string;
  size?: MacroBadgeSize;
  emphasis?: MacroBadgeEmphasis;
  showLabel?: boolean;
}

function getMacroLabel(macro: MacroKind) {
  switch (macro) {
    case 'calories':
      return 'KCAL';
    case 'protein':
      return 'PRO';
    case 'carbs':
      return 'CARBS';
    case 'fat':
      return 'FAT';
    default:
      return '';
  }
}

export function MacroBadge({
  macro,
  value,
  unit,
  size = 'sm',
  emphasis = 'soft',
  showLabel = true,
}: MacroBadgeProps) {
  const { c, s, ty, r } = useTokens();
  const isSmall = size === 'sm';
  const label = getMacroLabel(macro);

  const macroTheme = React.useMemo(() => {
    switch (macro) {
      case 'protein':
        return {
          gradient: [c.macros.protein, c.macros.proteinDark] as [string, string],
          tint: c.macros.protein,
          border: hexToRgba(c.macros.protein, 0.42),
          text: c.macros.protein,
        };
      case 'carbs':
        return {
          gradient: [c.macros.carbs, c.macros.carbsDark] as [string, string],
          tint: c.macros.carbs,
          border: hexToRgba(c.macros.carbs, 0.42),
          text: c.macros.carbs,
        };
      case 'fat':
        return {
          gradient: [c.macros.fat, c.macros.fatDark] as [string, string],
          tint: c.macros.fat,
          border: hexToRgba(c.macros.fat, 0.42),
          text: c.macros.fat,
        };
      case 'calories':
      default:
        return {
          gradient: [c.surface2, c.surface] as [string, string],
          tint: c.textMuted,
          border: c.border,
          text: c.text,
        };
    }
  }, [c.border, c.macros.carbs, c.macros.carbsDark, c.macros.fat, c.macros.fatDark, c.macros.protein, c.macros.proteinDark, c.surface, c.surface2, c.text, c.textMuted, macro]);

  const paddingVertical = isSmall ? 6 : 8;
  const paddingHorizontal = isSmall ? 10 : 12;
  const borderRadius = isSmall ? r.pill : r.md;

  const content = (
    <View style={[styles.content, { paddingVertical, paddingHorizontal }]}>
      {showLabel ? (
        <Text
          style={{
            color: emphasis === 'solid' && macro !== 'calories' ? c.bg : macroTheme.text,
            fontFamily: ty.body.familySemibold,
            fontSize: isSmall ? 10 : 11,
            letterSpacing: 0.6,
            opacity: macro === 'calories' ? 0.8 : 1,
          }}
        >
          {label}
        </Text>
      ) : null}
      <Text
        style={{
          color: emphasis === 'solid' && macro !== 'calories' ? c.bg : macro === 'calories' ? c.text : macroTheme.text,
          fontFamily: ty.body.familySemibold,
          fontSize: isSmall ? ty.sizes.xs : ty.sizes.sm,
          marginLeft: showLabel ? s.xs : 0,
        }}
      >
        {value}
        {unit ? (
          <Text
            style={{
              color: emphasis === 'solid' && macro !== 'calories' ? c.bg : c.textMuted,
              fontFamily: ty.body.familyMedium,
              fontSize: isSmall ? 10 : 11,
            }}
          >
            {unit}
          </Text>
        ) : null}
      </Text>
    </View>
  );

  if (emphasis === 'solid') {
    return (
      <LinearGradient
        colors={macroTheme.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius }}
      >
        {content}
      </LinearGradient>
    );
  }

  if (emphasis === 'outlined') {
    return (
      <View
        style={[
          styles.container,
          {
            borderRadius,
            borderColor: macroTheme.border,
            borderWidth: 1,
            backgroundColor: macro === 'calories' ? c.surface2 : hexToRgba(macroTheme.tint, 0.08),
          },
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={
        macro === 'calories'
          ? [c.surface2, c.surface]
          : [hexToRgba(macroTheme.tint, 0.22), hexToRgba(macroTheme.tint, 0.1)]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius,
        borderWidth: 1,
        borderColor: macro === 'calories' ? c.border : macroTheme.border,
      }}
    >
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {},
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
