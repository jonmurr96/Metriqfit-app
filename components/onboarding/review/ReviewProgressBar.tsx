import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../../lib/theme';

interface ReviewProgressBarProps {
  acceptedCount: number;
  total: number;
}

export function ReviewProgressBar({ acceptedCount, total }: ReviewProgressBarProps) {
  const { c, ty, r } = useTokens();
  const ratio = total > 0 ? Math.min(1, acceptedCount / total) : 0;

  return (
    <View>
      <View style={styles.row}>
        <Text style={[styles.caption, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>Review progress</Text>
        <Text style={[styles.caption, { color: c.text, fontFamily: ty.body.familySemibold }]}>{acceptedCount}/{total}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: c.surface2, borderRadius: r.pill }]}> 
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: c.primary, borderRadius: r.pill }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  caption: {
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  track: {
    width: '100%',
    height: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
