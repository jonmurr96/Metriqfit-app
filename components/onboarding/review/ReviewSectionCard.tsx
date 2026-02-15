import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTokens } from '../../../lib/theme';

interface ReviewSectionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  headerAccessory?: React.ReactNode;
}

export function ReviewSectionCard({ title, subtitle, children, style, headerAccessory }: ReviewSectionCardProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg, padding: s.lg }, style]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold }]}>{title}</Text>
        {headerAccessory ? <View style={styles.headerAccessory}>{headerAccessory}</View> : null}
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>{subtitle}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerAccessory: {
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
});
