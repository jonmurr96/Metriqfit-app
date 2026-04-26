import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { FreshnessChip } from './FreshnessChip';

export interface ProgressKpiStripItem {
  id: string;
  label: string;
  value: string;
  subtitle: string;
  icon: React.ComponentProps<typeof TabBarIcon>['name'];
  lastUpdatedIso: string | null;
  onPress?: () => void;
}

export interface ProgressKpiStripProps {
  items: ProgressKpiStripItem[];
}

export function ProgressKpiStrip({ items }: ProgressKpiStripProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <View style={[styles.grid, { gap: s.sm }]}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={item.onPress}
          style={[
            styles.card,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              borderRadius: r.lg,
              padding: s.md,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: `${c.primary}12` }]}>
              <TabBarIcon name={item.icon} color={c.primary} size={18} />
            </View>
            <FreshnessChip lastUpdatedIso={item.lastUpdatedIso} />
          </View>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.sm }}>
            {item.value}
          </Text>
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginTop: 2 }}>
            {item.label}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.xs }}>
            {item.subtitle}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    width: '48%',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
