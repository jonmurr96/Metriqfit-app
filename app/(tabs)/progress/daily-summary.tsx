import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DailyReviewHero, ProgressSectionShell } from '../../../components/progress';
import { GlassCard } from '../../../components/premium/GlassCard';
import { useProgressDailyReview } from '../../../hooks/useProgressReview';
import {
  trackProgressDailyReviewViewed,
  trackProgressReviewCtaTapped,
} from '../../../lib/analytics';
import { useTokens } from '../../../lib/theme';

function workoutLabel(status: 'completed' | 'planned' | 'active' | 'rest' | 'none') {
  if (status === 'active') return 'Active now';
  if (status === 'completed') return 'Completed';
  if (status === 'planned') return 'Planned';
  if (status === 'rest') return 'Rest day';
  return 'No workout scheduled';
}

export default function DailySummaryScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const { data: snapshot, isLoading } = useProgressDailyReview();

  useEffect(() => {
    if (snapshot) {
      trackProgressDailyReviewViewed({ status: snapshot.status });
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
      title="Daily Summary"
      primarySection="review"
      secondarySection="review"
      secondaryItem="daily"
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 80, gap: s.lg }}
        showsVerticalScrollIndicator={false}
      >
        <DailyReviewHero
          status={snapshot.status}
          headline={snapshot.headline}
          subheadline={snapshot.subheadline}
        />

        <GlassCard style={{ padding: 18 }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Nutrition accountability
          </Text>
          <View style={[styles.metricRow, { marginTop: s.md }]}>
            <View style={styles.metricBlock}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>Calories</Text>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.h3, marginTop: 4 }}>
                {snapshot.nutrition.calories}
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                of {snapshot.nutrition.calorieTarget || '--'} kcal
              </Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>Protein</Text>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.h3, marginTop: 4 }}>
                {snapshot.nutrition.protein}
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                of {snapshot.nutrition.proteinTarget || '--'} g
              </Text>
            </View>
          </View>
          <View style={[styles.chipRow, { marginTop: s.md, gap: s.sm }]}>
            {[
              {
                id: 'calories',
                label: snapshot.nutrition.caloriesHit ? 'Calories on target' : 'Calories behind',
                active: snapshot.nutrition.caloriesHit,
              },
              {
                id: 'protein',
                label: snapshot.nutrition.proteinHit ? 'Protein on target' : 'Protein behind',
                active: snapshot.nutrition.proteinHit,
              },
              {
                id: 'hydration',
                label: snapshot.hydration.readinessLabel,
                active: (snapshot.hydration.score || 0) >= 70,
              },
            ].map((chip) => (
              <View
                key={chip.id}
                style={[
                  styles.chip,
                  {
                    borderRadius: r.pill,
                    backgroundColor: chip.active ? `${c.success}14` : `${c.warning}14`,
                  },
                ]}
              >
                <Text
                  style={{
                    color: chip.active ? c.success : c.warning,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.xs,
                  }}
                >
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={{ padding: 18 }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Workout accountability
          </Text>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.lg, marginTop: s.md }}>
            {snapshot.workout.name || 'Today'}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
            {workoutLabel(snapshot.workout.status)}
          </Text>
          {snapshot.workout.status === 'active' || snapshot.workout.status === 'planned' ? (
            <Pressable
              onPress={() => {
                trackProgressReviewCtaTapped({ cta_id: 'daily_open_workout', status: snapshot.workout.status });
                router.push('/(tabs)/workout');
              }}
              style={[styles.primaryButton, { marginTop: s.md, borderRadius: r.md, backgroundColor: c.primary }]}
            >
              <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold }}>Open Workout</Text>
            </Pressable>
          ) : null}
        </GlassCard>

        <GlassCard style={{ padding: 18 }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Noteworthy misses
          </Text>
          {snapshot.misses.length === 0 ? (
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.md }}>
              No major misses right now. Today looks controlled.
            </Text>
          ) : (
            <View style={{ marginTop: s.md, gap: s.sm }}>
              {snapshot.misses.map((miss) => (
                <View
                  key={miss.id}
                  style={[
                    styles.missRow,
                    {
                      borderRadius: r.md,
                      borderColor: c.border,
                      backgroundColor: c.surface,
                    },
                  ]}
                >
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    {miss.label}
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                    {miss.detail}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </GlassCard>

        <GlassCard style={{ padding: 18, marginBottom: s.lg }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Next action
          </Text>
          <Pressable
            onPress={() => {
              trackProgressReviewCtaTapped({ cta_id: snapshot.primaryAction.id });
              router.push(snapshot.primaryAction.route as never);
            }}
            style={[styles.primaryButton, { marginTop: s.md, borderRadius: r.md, backgroundColor: c.primary }]}
          >
            <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold }}>{snapshot.primaryAction.label}</Text>
          </Pressable>
          {snapshot.secondaryAction ? (
            <Pressable
              onPress={() => {
                trackProgressReviewCtaTapped({ cta_id: snapshot.secondaryAction?.id });
                router.push(snapshot.secondaryAction?.route as never);
              }}
              style={[
                styles.secondaryButton,
                { marginTop: s.sm, borderRadius: r.md, backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold }}>
                {snapshot.secondaryAction.label}
              </Text>
            </Pressable>
          ) : null}
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
  metricRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metricBlock: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  missRow: {
    borderWidth: 1,
    padding: 14,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
  },
});
