import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '../../lib/theme';

export interface RecordSummaryStripItem {
  id: string;
  label: string;
  value: string;
  meta?: string | null;
}

export interface RecordSummaryStripProps {
  title?: string;
  items: RecordSummaryStripItem[];
}

export function RecordSummaryStrip({ title, items }: RecordSummaryStripProps) {
  const { c, s, ty, r } = useTokens();

  if (!items.length) return null;

  return (
    <View style={styles.container}>
      {title ? (
        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginBottom: s.sm }}>
          {title}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: s.sm }}
      >
        {items.map((item) => (
          <View
            key={item.id}
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
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              {item.label}
            </Text>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginTop: 4 }}>
              {item.value}
            </Text>
            {item.meta ? (
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                {item.meta}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    minWidth: 126,
    borderWidth: 1,
  },
});
