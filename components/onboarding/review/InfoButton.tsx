import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../navigation/TabBarIcon';

interface InfoButtonProps {
  label?: string;
  onPress: () => void;
}

export function InfoButton({ label = 'Info', onPress }: InfoButtonProps) {
  const { c, r, ty } = useTokens();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, { borderColor: c.border, backgroundColor: c.surface2, borderRadius: r.pill }]}
      accessibilityRole="button"
      accessibilityLabel={`${label} details`}
    >
      <TabBarIcon name="information-circle-outline" color={c.textMuted} size={15} />
      <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 30,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
  },
});
