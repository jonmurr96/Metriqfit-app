import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { PRHighlightCard, ProgressSectionShell, RecordSummaryStrip } from '../../../components/progress';
import { GlassCard } from '../../../components/premium/GlassCard';
import { SubscriptionFeatureGate } from '../../../components/premium/SubscriptionFeatureGate';
import {
  trackEvent,
  trackProgressCardRendered,
  trackProgressPrHighlightOpened,
  trackProgressViewed,
} from '../../../lib/analytics';
import { useFeatureAccess } from '../../../hooks/useSubscription';
import { useTokens } from '../../../lib/theme';
import { useProgressRecordSummary } from '../../../hooks/useProgressMetrics';

function formatRelativeDate(iso: string) {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return 'Recent';
  const diffDays = Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function PersonalRecordsScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const [range, setRange] = useState<'90d' | 'all'>('90d');
  const analyticsAccess = useFeatureAccess('advanced_analytics');
  const { data: summary, isLoading } = useProgressRecordSummary(range);

  useEffect(() => {
    trackProgressViewed({ source: 'progress_personal_records', range });
  }, [range]);

  useEffect(() => {
    if (!summary) return;
    trackProgressCardRendered({ card_id: 'progress_pr_highlight', range });
    trackProgressCardRendered({ card_id: 'progress_pr_top_lifts', range });
    if (summary.highlight) {
      trackProgressPrHighlightOpened({ exercise: summary.highlight.exercise, range });
    }
  }, [range, summary]);

  useEffect(() => {
    if (!analyticsAccess.isLoading && !analyticsAccess.hasAccess) {
      trackEvent('feature_gate_viewed', {
        feature: 'advanced_analytics',
        source: 'progress_personal_records',
        required_tier: analyticsAccess.upgradeTier,
      });
    }
  }, [analyticsAccess.hasAccess, analyticsAccess.isLoading, analyticsAccess.upgradeTier]);

  const topLiftItems = useMemo(() => (
    (summary?.topEstimated1Rm || []).map((item) => ({
      id: `${item.exercise}-${item.achievedAt}`,
      label: item.exercise,
      value: `${item.estimated1Rm} lb`,
      meta: new Date(item.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }))
  ), [summary?.topEstimated1Rm]);

  const familyItems = useMemo(() => (
    (summary?.movementFamilies || []).slice(0, 4).map((item) => ({
      id: item.family,
      label: item.family,
      value: `${item.count} PR${item.count === 1 ? '' : 's'}`,
      meta: `Best ${item.maxEstimated1Rm} lb`,
    }))
  ), [summary?.movementFamilies]);

  if ((isLoading || analyticsAccess.isLoading) && !summary) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!analyticsAccess.hasAccess) {
    return (
      <ProgressSectionShell
        title="Personal Records"
        primarySection="performance"
        secondarySection="performance"
        secondaryItem="records"
      >
        <View style={{ paddingHorizontal: s.lg, paddingTop: s.lg }}>
          <SubscriptionFeatureGate
            requiredTier={analyticsAccess.upgradeTier}
            title="Personal record tracking is on Premium"
            subtitle="Upgrade to reopen your PR history, top lifts, and all-time strength milestones."
          />
        </View>
      </ProgressSectionShell>
    );
  }

  return (
    <ProgressSectionShell
      title="Personal Records"
      primarySection="performance"
      secondarySection="performance"
      secondaryItem="records"
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.filterRow, { gap: s.sm }]}>
          {[
            { id: '90d' as const, label: 'Last 90 Days' },
            { id: 'all' as const, label: 'All Time' },
          ].map((option) => {
            const isSelected = option.id === range;
            return (
              <Pressable
                key={option.id}
                onPress={() => setRange(option.id)}
                style={[
                  styles.filterPill,
                  {
                    borderRadius: r.pill,
                    borderColor: isSelected ? c.primary : c.border,
                    backgroundColor: isSelected ? `${c.primary}14` : c.surface,
                  },
                ]}
              >
                <Text
                  style={{
                    color: isSelected ? c.primary : c.textMuted,
                    fontFamily: isSelected ? ty.body.familySemibold : ty.body.family,
                    fontSize: ty.sizes.xs,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!summary || (!summary.highlight && summary.recentRecords.length === 0) ? (
          <GlassCard style={{ padding: 20, marginTop: s.xl }}>
            <View style={{ alignItems: 'center' }}>
              <TabBarIcon name="barbell-outline" color={c.textMuted} size={36} />
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.md }}>
                No records yet
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, textAlign: 'center', marginTop: s.sm }}>
                Log consistent strength sessions and this page will start surfacing your top lifts and PR pace.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/workout')}
                style={[styles.primaryButton, { backgroundColor: c.primary, borderRadius: r.md, marginTop: s.lg }]}
              >
                <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold }}>Open Workout</Text>
              </Pressable>
            </View>
          </GlassCard>
        ) : (
          <>
            {summary.highlight ? (
              <View style={{ marginTop: s.xl }}>
                <PRHighlightCard
                  exercise={summary.highlight.exercise}
                  value={summary.highlight.value}
                  unit={summary.highlight.unit}
                  previousBest={summary.highlight.previousBest ?? summary.highlight.value}
                  improvement={summary.highlight.improvementPercent ?? 0}
                  date={formatRelativeDate(summary.highlight.date)}
                  isNew={summary.highlight.isNew}
                />
              </View>
            ) : null}

            <View style={{ marginTop: s.xl }}>
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                Top Lifts
              </Text>
              <View style={{ marginTop: s.md }}>
                <RecordSummaryStrip items={topLiftItems} />
              </View>
            </View>

            <View style={{ marginTop: s.xl }}>
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                Movement Families
              </Text>
              <View style={{ marginTop: s.md }}>
                <RecordSummaryStrip items={familyItems} />
              </View>
            </View>

            <View style={{ marginTop: s.xl }}>
              <Text style={[styles.sectionTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                Recent Records
              </Text>
              <View style={{ marginTop: s.md, gap: s.sm }}>
                {summary.recentRecords.map((record) => (
                  <GlassCard key={record.id} style={{ padding: 16 }}>
                    <View style={styles.recordHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                          {record.exercise}
                        </Text>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                          {record.movementFamily || 'Strength'} · {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                      <View style={[styles.valueBadge, { borderRadius: r.pill, backgroundColor: `${c.primary}12` }]}>
                        <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                          {record.estimated1Rm} lb e1RM
                        </Text>
                      </View>
                    </View>
                    <View style={styles.recordMetaRow}>
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                        {record.weightLb} lb
                      </Text>
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                        {record.reps} reps
                      </Text>
                    </View>
                  </GlassCard>
                ))}
              </View>
            </View>
          </>
        )}
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
  filterRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  filterPill: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    letterSpacing: -0.3,
  },
  primaryButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  valueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recordMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
});
