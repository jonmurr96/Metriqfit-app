import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

export function FreePlanSummary() {
  const { c, ty, r } = useTokens();

  const features = [
    'Macro targets and tracking',
    'Workout and nutrition plans',
    'Progress logging and trends',
    '5 AI Coach messages per day',
  ];

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg }]}>
      <Text style={[styles.title, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>Free Plan</Text>
      <View style={styles.list}>
        {features.map((feature) => (
          <View key={feature} style={styles.row}>
            <TabBarIcon name="checkmark-outline" color={c.textMuted} size={16} />
            <Text style={[styles.feature, { color: c.textMuted, fontFamily: ty.body.family }]}>{feature}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.badge, { backgroundColor: c.opacity.primaryLight, borderColor: c.border, borderRadius: r.pill }]}> 
        <Text style={[styles.badgeLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>Active when selected</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 14,
  },
  title: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 12,
    marginBottom: 10,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feature: {
    fontSize: 13,
    flex: 1,
  },
  badge: {
    marginTop: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeLabel: {
    fontSize: 11,
  },
});
