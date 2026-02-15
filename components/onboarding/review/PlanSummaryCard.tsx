import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../../lib/theme';

interface PlanSummaryCardProps {
  name: string;
  description?: string | null;
  metadata: string;
}

export function PlanSummaryCard({ name, description, metadata }: PlanSummaryCardProps) {
  const { c, ty, r } = useTokens();

  return (
    <View style={[styles.container, { backgroundColor: c.bg, borderColor: c.border, borderRadius: r.md }]}>
      <Text style={[styles.name, { color: c.text, fontFamily: ty.heading.familySemibold }]}>{name}</Text>
      <Text style={[styles.meta, { color: c.primary, fontFamily: ty.body.familySemibold }]}>{metadata}</Text>
      <Text style={[styles.description, { color: c.textMuted, fontFamily: ty.body.family }]} numberOfLines={3}>
        {description || 'Personalized from your onboarding goals and constraints.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  name: {
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
});
