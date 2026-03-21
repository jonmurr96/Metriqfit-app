import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { trackProgressStatusHeroRendered } from '../../lib/analytics';
import { useTokens } from '../../lib/theme';
import type { ProgressSummaryStatus } from '../../services/progressMetricsService';
import { FreshnessChip } from './FreshnessChip';
import { GlassCard } from '../premium/GlassCard';

export interface ProgressStatusHeroProps {
  status: ProgressSummaryStatus;
  headline: string;
  subheadline: string;
  primaryDriver: 'weight' | 'consistency' | 'performance' | 'mixed';
  weightLastLoggedAt: string | null;
  consistencyLastLoggedAt: string | null;
  workoutLastSessionAt: string | null;
}

const STATUS_LABELS: Record<ProgressSummaryStatus, string> = {
  on_track: 'On Track',
  watch: 'Watch',
  stale: 'Stale',
  insufficient_data: 'Low Confidence',
};

export function ProgressStatusHero({
  status,
  headline,
  subheadline,
  primaryDriver,
  weightLastLoggedAt,
  consistencyLastLoggedAt,
  workoutLastSessionAt,
}: ProgressStatusHeroProps) {
  const { c, s, ty, r } = useTokens();

  useEffect(() => {
    trackProgressStatusHeroRendered({ status, primary_driver: primaryDriver });
  }, [primaryDriver, status]);

  const accentColor = status === 'on_track'
    ? c.success
    : status === 'watch'
      ? c.warning
      : status === 'stale'
        ? c.danger
        : c.textMuted;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.statusBadge,
            {
              borderRadius: r.pill,
              borderColor: accentColor,
              backgroundColor: `${accentColor}14`,
            },
          ]}
        >
          <Text
            style={{
              color: accentColor,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
            }}
          >
            {STATUS_LABELS[status]}
          </Text>
        </View>
        <View
          style={[
            styles.driverBadge,
            {
              borderRadius: r.pill,
              borderColor: c.border,
              backgroundColor: c.surface2,
            },
          ]}
        >
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
            {primaryDriver === 'mixed' ? 'Mixed signal' : `${primaryDriver} lead`}
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: ty.sizes.h3,
          marginTop: s.md,
        }}
      >
        {headline}
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.sm,
          lineHeight: 20,
          marginTop: s.sm,
        }}
      >
        {subheadline}
      </Text>

      <View style={[styles.freshnessRow, { marginTop: s.md, gap: s.sm }]}>
        <View style={styles.freshnessItem}>
          <Text style={[styles.freshnessLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>
            Body
          </Text>
          <FreshnessChip lastUpdatedIso={weightLastLoggedAt} />
        </View>
        <View style={styles.freshnessItem}>
          <Text style={[styles.freshnessLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>
            Consistency
          </Text>
          <FreshnessChip lastUpdatedIso={consistencyLastLoggedAt} />
        </View>
        <View style={styles.freshnessItem}>
          <Text style={[styles.freshnessLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>
            Training
          </Text>
          <FreshnessChip lastUpdatedIso={workoutLastSessionAt} />
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  driverBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  freshnessRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  freshnessItem: {
    gap: 6,
  },
  freshnessLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
