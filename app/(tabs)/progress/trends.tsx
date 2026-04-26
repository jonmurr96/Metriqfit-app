import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  ProgressSectionShell,
  ProgressRangeSelector,
  RecordSummaryStrip,
  WeeklyTrendChart,
} from '../../../components/progress';
import { GlassCard } from '../../../components/premium/GlassCard';
import { SubscriptionFeatureGate } from '../../../components/premium/SubscriptionFeatureGate';
import {
  trackEvent,
  trackProgressCardRendered,
  trackProgressTrendsRangeChanged,
  trackProgressViewed,
} from '../../../lib/analytics';
import { useFeatureAccess } from '../../../hooks/useSubscription';
import { useTokens } from '../../../lib/theme';
import { useProgressTrends } from '../../../hooks/useProgressMetrics';
import type { ProgressRangeOption } from '../../../services/progressMetricsService';

const RANGE_OPTIONS: ProgressRangeOption[] = ['7D', '14D', '1M', '3M', '6M', '12M'];

function formatDirection(value: number | null) {
  if (value == null) return 'No change';
  if (Math.abs(value) < 0.1) return 'Flat';
  return `${value > 0 ? '+' : ''}${value}%`;
}

export default function TrendsScreen() {
  const { c, s, ty } = useTokens();
  const [range, setRange] = useState<ProgressRangeOption>('1M');
  const analyticsAccess = useFeatureAccess('advanced_analytics');

  const { data: snapshot, isLoading } = useProgressTrends(range);

  useEffect(() => {
    trackProgressViewed({ source: 'progress_trends', range });
  }, [range]);

  useEffect(() => {
    if (!snapshot) return;
    ['training_trends', 'adherence_trends', 'body_trends'].forEach((cardId) => {
      trackProgressCardRendered({ card_id: cardId, range });
    });
  }, [range, snapshot]);

  useEffect(() => {
    if (!analyticsAccess.isLoading && !analyticsAccess.hasAccess) {
      trackEvent('feature_gate_viewed', {
        feature: 'advanced_analytics',
        source: 'progress_trends',
        required_tier: analyticsAccess.upgradeTier,
      });
    }
  }, [analyticsAccess.hasAccess, analyticsAccess.isLoading, analyticsAccess.upgradeTier]);

  const handleRangeChange = (next: ProgressRangeOption) => {
    setRange(next);
    trackProgressTrendsRangeChanged({ range: next });
  };

  const prEventItems = useMemo(() => (
    (snapshot?.prEvents || []).map((event) => ({
      id: event.id,
      label: event.exercise,
      value: `${event.estimated1Rm} lb`,
      meta: new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  ), [snapshot?.prEvents]);

  if ((isLoading || analyticsAccess.isLoading) && !snapshot) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!analyticsAccess.hasAccess) {
    return (
      <ProgressSectionShell
        title="Trends"
        primarySection="performance"
        secondarySection="performance"
        secondaryItem="trends"
      >
        <View style={{ paddingHorizontal: s.lg, paddingTop: s.lg }}>
          <SubscriptionFeatureGate
            requiredTier={analyticsAccess.upgradeTier}
            title="Trend analysis is on Premium"
            subtitle="Upgrade to unlock longer-range performance, adherence, and body trend views."
          />
        </View>
      </ProgressSectionShell>
    );
  }

  return (
    <ProgressSectionShell
      title="Trends"
      primarySection="performance"
      secondarySection="performance"
      secondaryItem="trends"
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <ProgressRangeSelector
          options={RANGE_OPTIONS}
          selected={range}
          onChange={handleRangeChange}
        />

        {snapshot ? (
          <>
            <View style={{ marginTop: s.xl }}>
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                Training Trends
              </Text>
              <View style={{ marginTop: s.md }}>
                <WeeklyTrendChart
                  title="Workout Volume"
                  data={snapshot.volumeSeries}
                  targetValue={Math.max(1, Math.round(snapshot.volumeSeries.reduce((sum, point) => sum + point.value, 0) / Math.max(1, snapshot.volumeSeries.length)))}
                  changePercent={Math.abs(snapshot.trainingSummary.volumeChangePercent || 0)}
                  changeDirection={(snapshot.trainingSummary.volumeChangePercent || 0) >= 0 ? 'up' : 'down'}
                  emptyBehavior="min-bar"
                />
              </View>
              <GlassCard style={{ padding: 16, marginTop: s.md }}>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  Sessions
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                  {snapshot.trainingSummary.sessionsThisRange} sessions in {range} · {snapshot.trainingSummary.sessionsPerWeek.toFixed(1)} per week · Avg {snapshot.trainingSummary.avgDurationMinutes} min
                </Text>
              </GlassCard>
              <View style={{ marginTop: s.md }}>
                <RecordSummaryStrip title="Recent PR Events" items={prEventItems} />
              </View>
            </View>

            <View style={{ marginTop: s.xl }}>
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                Adherence Trends
              </Text>
              <View style={{ marginTop: s.md }}>
                <WeeklyTrendChart
                  title="Consistency"
                  data={snapshot.consistencySeries}
                  targetValue={80}
                  changePercent={Math.round(Math.abs(snapshot.adherenceSummary.consistencyAverage - 80))}
                  changeDirection={snapshot.adherenceSummary.consistencyAverage >= 80 ? 'up' : 'down'}
                  emptyBehavior="zero"
                />
              </View>
              <View style={{ marginTop: s.md }}>
                <WeeklyTrendChart
                  title="Calories"
                  data={snapshot.calorieSeries}
                  targetValue={snapshot.adherenceSummary.calorieTarget}
                  changePercent={Math.round(Math.abs(snapshot.adherenceSummary.nutritionHitRate - 100))}
                  changeDirection={snapshot.adherenceSummary.nutritionHitRate >= 70 ? 'up' : 'down'}
                  emptyBehavior="zero"
                />
              </View>
              <GlassCard style={{ padding: 16, marginTop: s.md }}>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, textAlign: 'center' }}>
                  Nutrition hit rate {snapshot.adherenceSummary.nutritionHitRate}% · Consistency average {snapshot.adherenceSummary.consistencyAverage}%
                </Text>
              </GlassCard>
            </View>

            <View style={{ marginTop: s.xl }}>
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                Body Trends
              </Text>
              <View style={{ marginTop: s.md }}>
                <WeeklyTrendChart
                  title="Body Weight"
                  data={snapshot.weightSeries}
                  targetValue={Math.max(1, Math.round(snapshot.weightSeries.reduce((sum, point) => sum + point.value, 0) / Math.max(1, snapshot.weightSeries.length)))}
                  changePercent={Math.abs(snapshot.bodySummary.weightChangePercent)}
                  changeDirection={snapshot.bodySummary.weightChangePercent >= 0 ? 'up' : 'down'}
                  emptyBehavior="zero"
                />
              </View>
              <GlassCard style={{ padding: 16, marginTop: s.md }}>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  Body summary
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                  Weight {snapshot.bodySummary.weightDeltaKg > 0 ? '+' : ''}{snapshot.bodySummary.weightDeltaKg} kg · Body-fat {snapshot.bodySummary.bodyFatChange == null ? 'not enough data' : formatDirection(snapshot.bodySummary.bodyFatChange)}
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                  Waist {snapshot.bodySummary.circumferenceDelta.waistCm == null ? '—' : `${snapshot.bodySummary.circumferenceDelta.waistCm > 0 ? '+' : ''}${snapshot.bodySummary.circumferenceDelta.waistCm} cm`} · Hips {snapshot.bodySummary.circumferenceDelta.hipsCm == null ? '—' : `${snapshot.bodySummary.circumferenceDelta.hipsCm > 0 ? '+' : ''}${snapshot.bodySummary.circumferenceDelta.hipsCm} cm`}
                </Text>
              </GlassCard>
            </View>

            <View style={{ marginTop: s.xl }}>
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                Freshness & confidence
              </Text>
              <GlassCard style={{ padding: 16, marginTop: s.md }}>
                {snapshot.qualityFlags.map((flag) => (
                  <View key={flag.key} style={[styles.qualityRow, { borderBottomColor: c.border }]}>
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                      {flag.key.replace('_', ' ')}
                    </Text>
                    <Text
                      style={{
                        color: flag.status === 'good' ? c.success : flag.status === 'warn' ? c.warning : c.danger,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.xs,
                      }}
                    >
                      {flag.status.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </GlassCard>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ProgressSectionShell>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
