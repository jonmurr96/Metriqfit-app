import React from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { useTokens } from '../../lib/theme';
import { getMacroShortLabel, getMacroTheme, type MacroKind } from './macro-theme';

interface MacroInlineSummaryItem {
  macro: MacroKind;
  value: number | string;
  unit?: string;
}

interface MacroInlineSummaryProps {
  items: MacroInlineSummaryItem[];
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  showShortLabels?: boolean;
}

export function MacroInlineSummary({
  items,
  size = 'sm',
  style,
  textStyle,
  showShortLabels = true,
}: MacroInlineSummaryProps) {
  const { c, ty } = useTokens();
  const fontSize = size === 'sm' ? ty.sizes.xs : ty.sizes.sm;

  return (
    <View style={[styles.row, style]}>
      {items.map((item, index) => {
        const theme = getMacroTheme(c, item.macro);
        const shortLabel = getMacroShortLabel(item.macro);
        const isCalories = item.macro === 'calories';

        return (
          <React.Fragment key={`${item.macro}-${item.value}-${item.unit || ''}-${index}`}>
            {index > 0 ? (
              <Text
                style={[
                  {
                    color: c.textSubtle,
                    fontFamily: ty.body.family,
                    fontSize,
                  },
                  textStyle,
                ]}
              >
                {' '}•{' '}
              </Text>
            ) : null}
            <Text
              style={[
                {
                  color: isCalories ? c.text : theme.text,
                  fontFamily: ty.body.familyMedium,
                  fontSize,
                },
                textStyle,
              ]}
            >
              {!isCalories && showShortLabels ? `${shortLabel} ` : ''}
              {item.value}
              {item.unit ? (
                <Text
                  style={[
                    {
                      color: isCalories ? c.textMuted : theme.text,
                      fontFamily: ty.body.familyMedium,
                      fontSize,
                    },
                    textStyle,
                  ]}
                >
                  {item.unit}
                </Text>
              ) : null}
            </Text>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
});
