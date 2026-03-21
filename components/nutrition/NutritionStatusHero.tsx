import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../lib/theme';

export type NutritionTodayStatus = 'on_track' | 'behind' | 'quiet' | 'plan_gap' | 'insufficient_data';

export interface NutritionStatusHeroProps {
  status: NutritionTodayStatus;
  headline: string;
  subheadline: string;
  caloriesRemaining: number;
  proteinRemaining: number;
  previewPending?: boolean;
}

const STATUS_LABELS: Record<NutritionTodayStatus, string> = {
  on_track: 'On Track',
  behind: 'Behind',
  quiet: 'Quiet Day',
  plan_gap: 'Plan Gap',
  insufficient_data: 'Need Data',
};

export function NutritionStatusHero({
  status,
  headline,
  subheadline,
  caloriesRemaining,
  proteinRemaining,
  previewPending = false,
}: NutritionStatusHeroProps) {
  const { c, s, ty, r } = useTokens();
  const accent = status === 'on_track' ? c.primary : status === 'behind' ? c.warning : c.textMuted;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.surface,
          borderRadius: r.xl,
          borderWidth: 1,
          borderColor: status === 'on_track' ? `${c.primary}55` : c.border,
          padding: s.lg,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.statusBadge,
            {
              borderRadius: r.pill,
              backgroundColor: `${accent}18`,
              borderColor: `${accent}55`,
            },
          ]}
        >
          <Text style={{ color: accent, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
            {STATUS_LABELS[status]}
          </Text>
        </View>
        {previewPending ? (
          <View
            style={[
              styles.previewBadge,
              {
                borderRadius: r.pill,
                backgroundColor: `${c.accent}14`,
                borderColor: `${c.accent}45`,
              },
            ]}
          >
            <Text style={{ color: c.accent, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              Preview Pending
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl, marginTop: s.md }}>
        {headline}
      </Text>
      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
        {subheadline}
      </Text>

      <View style={[styles.metricRow, { marginTop: s.lg }]}>
        <View style={[styles.metricCard, { backgroundColor: c.bg, borderRadius: r.lg }]}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
            Calories Left
          </Text>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.xs }}>
            {Math.max(0, Math.round(caloriesRemaining))}
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: c.bg, borderRadius: r.lg }]}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
            Protein Left
          </Text>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.xs }}>
            {Math.max(0, Math.round(proteinRemaining))}g
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewBadge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    padding: 14,
  },
});
