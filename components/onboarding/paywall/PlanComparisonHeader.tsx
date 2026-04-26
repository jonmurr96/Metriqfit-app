import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

interface PlanComparisonHeaderProps {
  name: string;
  subtitle: string;
  onClose: () => void;
}

export function PlanComparisonHeader({ name, subtitle, onClose }: PlanComparisonHeaderProps) {
  const { c, ty, r } = useTokens();

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={[styles.avatar, { backgroundColor: c.surface2, borderColor: c.border, borderRadius: r.pill }]}>
          <TabBarIcon name="person-outline" color={c.textMuted} size={18} />
        </View>
        <View>
          <Text style={[styles.name, { color: c.text, fontFamily: ty.heading.familySemibold }]}>{name}</Text>
          <Text style={[styles.subtitle, { color: c.primary, fontFamily: ty.body.familySemibold }]}>{subtitle}</Text>
        </View>
      </View>
      <Pressable style={[styles.close, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.md }]} onPress={onClose}>
        <TabBarIcon name="close" color={c.text} size={20} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  close: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
