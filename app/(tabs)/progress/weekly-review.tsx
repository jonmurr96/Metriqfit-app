import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ProgressSectionShell, WeeklyReviewSummary } from '../../../components/progress';
import { GlassCard } from '../../../components/premium/GlassCard';
import { useProgressWeeklyReview } from '../../../hooks/useProgressReview';
import {
  trackProgressReviewCtaTapped,
  trackProgressWeeklyReviewViewed,
} from '../../../lib/analytics';
import { useTokens } from '../../../lib/theme';

function weightDirectionLabel(direction: 'up' | 'down' | 'flat' | 'unknown') {
  if (direction === 'up') return 'Moving up';
  if (direction === 'down') return 'Moving down';
  if (direction === 'flat') return 'Holding steady';
  return 'Not enough data';
}

export default function WeeklyReviewScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { data: snapshot, isLoading } = useProgressWeeklyReview();
  const useStackedMetricCards = width < 440;

  useEffect(() => {
    if (snapshot) {
      trackProgressWeeklyReviewViewed({ status: snapshot.status });
    }
  }, [snapshot]);

  if (isLoading && !snapshot) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!snapshot) return null;

  return (
    <ProgressSectionShell
      title="Weekly Review"
      primarySection="review"
      secondarySection="review"
      secondaryItem="weekly"
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 80, gap: s.lg }}
        showsVerticalScrollIndicator={false}
      >
        <WeeklyReviewSummary
          status={snapshot.status}
          headline={snapshot.headline}
          subheadline={snapshot.subheadline}
        />

        <View
          style={[
            styles.duoRow,
            {
              gap: s.md,
              flexDirection: useStackedMetricCards ? 'column' : 'row',
            },
          ]}
        >
          <GlassCard style={{ padding: 18, flex: 1 }}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              Best metric
            </Text>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.md }}>
              {snapshot.bestMetric.label}
            </Text>
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md, marginTop: s.xs }}>
              {snapshot.bestMetric.value}
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.sm }}>
              {snapshot.bestMetric.detail}
            </Text>
          </GlassCard>

          <GlassCard style={{ padding: 18, flex: 1 }}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              Weakest area
            </Text>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: s.md }}>
              {snapshot.weakestArea.label}
            </Text>
            <Text style={{ color: c.warning, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md, marginTop: s.xs }}>
              {snapshot.weakestArea.value}
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.sm }}>
              {snapshot.weakestArea.detail}
            </Text>
          </GlassCard>
        </View>

        <GlassCard style={{ padding: 18 }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Training block
          </Text>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.h3, marginTop: s.md }}>
            {snapshot.training.sessionsCompleted} sessions
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
            Volume {snapshot.training.volumeDirection}
            {snapshot.training.volumeChangePercent != null
              ? ` ${snapshot.training.volumeChangePercent > 0 ? '+' : ''}${snapshot.training.volumeChangePercent}%`
              : ' --'}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
            {snapshot.training.consistencySummary}
          </Text>
        </GlassCard>

        <GlassCard style={{ padding: 18 }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Body block
          </Text>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md, marginTop: s.md }}>
            {weightDirectionLabel(snapshot.body.weightDirection)}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
            Weight delta {snapshot.body.weightDeltaKg == null ? '--' : `${snapshot.body.weightDeltaKg > 0 ? '+' : ''}${snapshot.body.weightDeltaKg} kg`}
            {' · '}
            Body-fat delta {snapshot.body.bodyFatDelta == null ? 'limited confidence' : `${snapshot.body.bodyFatDelta > 0 ? '+' : ''}${snapshot.body.bodyFatDelta}%`}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
            {snapshot.body.circumferenceDelta
              ? `Waist ${snapshot.body.circumferenceDelta.waistCm == null ? '--' : `${snapshot.body.circumferenceDelta.waistCm > 0 ? '+' : ''}${snapshot.body.circumferenceDelta.waistCm} cm`} · Hips ${snapshot.body.circumferenceDelta.hipsCm == null ? '--' : `${snapshot.body.circumferenceDelta.hipsCm > 0 ? '+' : ''}${snapshot.body.circumferenceDelta.hipsCm} cm`}`
              : 'Circumference trends are limited this week.'}
          </Text>
          <View
            style={[
              styles.inlineBadge,
              {
                marginTop: s.md,
                borderRadius: r.pill,
                backgroundColor: snapshot.body.confidence === 'high' ? `${c.success}14` : `${c.warning}14`,
              },
            ]}
          >
            <Text
              style={{
                color: snapshot.body.confidence === 'high' ? c.success : c.warning,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
              }}
            >
              {snapshot.body.confidence === 'high' ? 'High confidence' : 'Limited confidence'}
            </Text>
          </View>
        </GlassCard>

        <GlassCard style={{ padding: 18 }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Check-in readiness
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.md }}>
            {snapshot.checkInStatus.state === 'fresh'
              ? 'You have a fresh body checkpoint this week.'
              : snapshot.checkInStatus.state === 'stale'
                ? 'Body checkpoints are getting stale. A new weekly check-in would sharpen this review.'
                : 'No photo checkpoints yet. A weekly check-in will unlock better body context.'}
          </Text>
          <Pressable
            onPress={() => {
              trackProgressReviewCtaTapped({ cta_id: 'weekly_open_checkin' });
              router.push('/check-in');
            }}
            style={[styles.primaryButton, { marginTop: s.md, borderRadius: r.md, backgroundColor: c.primary }]}
          >
            <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold }}>Open Weekly Check-in</Text>
          </Pressable>
        </GlassCard>

        <GlassCard style={{ padding: 18, marginBottom: s.lg }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Focus next week
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.md, lineHeight: 20 }}>
            {snapshot.nextWeekFocus}
          </Text>
        </GlassCard>
      </ScrollView>
    </ProgressSectionShell>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duoRow: {
    flexDirection: 'row',
  },
  inlineBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
