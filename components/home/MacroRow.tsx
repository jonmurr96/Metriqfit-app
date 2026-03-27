import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { MacroBadge, type MacroKind } from './MacroBadge';

interface MacroRowItem {
  macro: MacroKind;
  value: number | string;
  unit?: string;
}

interface MacroRowProps {
  items: MacroRowItem[];
  size?: 'sm' | 'md';
  emphasis?: 'solid' | 'soft' | 'outlined';
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function MacroRow({
  items,
  size = 'sm',
  emphasis = 'soft',
  showLabel = true,
  style,
}: MacroRowProps) {
  return (
    <View style={[styles.row, style]}>
      {items.map((item) => (
        <MacroBadge
          key={`${item.macro}-${item.value}-${item.unit || ''}`}
          macro={item.macro}
          value={item.value}
          unit={item.unit}
          size={size}
          emphasis={emphasis}
          showLabel={showLabel}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
