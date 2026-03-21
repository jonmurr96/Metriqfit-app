import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../premium/GlassCard';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { useTokens } from '../../lib/theme';
import type { AICoachAction, AICoachDashboardState } from '../../services/aiCoachService';

interface CoachBriefCardProps {
  state: AICoachDashboardState;
  onAction: (action: AICoachAction) => void;
}

export function CoachBriefCard({ state, onAction }: CoachBriefCardProps) {
  const { c, s, r, ty } = useTokens();

  return (
    <GlassCard glowEffect animated delay={60}>
      <View style={styles.header}>
        <View>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              letterSpacing: 1.4,
            }}
          >
            COACH BRIEF
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                borderRadius: r.pill,
                borderWidth: 1,
                borderColor: `${c.primary}32`,
                backgroundColor: 'rgba(8, 14, 32, 0.44)',
                marginTop: s.sm,
              },
            ]}
          >
            <Text
              style={{
                color: c.primary,
                fontFamily: ty.body.familySemibold,
                fontSize: 11,
                letterSpacing: 0.8,
              }}
            >
              {state.statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.iconWrap,
            {
              borderColor: `${c.primary}44`,
              backgroundColor: c.opacity.primaryLight,
            },
          ]}
        >
          <TabBarIcon name="sparkles" color={c.primary} size={20} />
        </View>
      </View>

      <Text
        style={{
          color: c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: ty.sizes.xl,
          marginTop: s.lg,
        }}
      >
        {state.headline}
      </Text>

      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.sm,
          lineHeight: 21,
          marginTop: s.sm,
        }}
      >
        {state.summary}
      </Text>

      <View style={[styles.metrics, { marginTop: s.lg, gap: s.sm }]}>
        <View style={[styles.metricCard, { backgroundColor: c.surface2, borderRadius: r.md }]}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 11, letterSpacing: 0.6 }}>
            PROTEIN LEFT
          </Text>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: 6 }}>
            {Math.round(state.context.proteinRemaining)}g
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: c.surface2, borderRadius: r.md }]}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 11, letterSpacing: 0.6 }}>
            NEXT MEAL
          </Text>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: 6 }}>
            {state.context.nextMealLabel || 'No meal queued'}
          </Text>
        </View>
      </View>

      <View style={[styles.actions, { gap: s.sm, marginTop: s.lg }]}>
        {state.primaryAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.primaryAction.label}
            onPress={() => onAction(state.primaryAction!)}
            style={({ pressed }) => [
              styles.primaryAction,
              {
                minHeight: 46,
                borderRadius: r.md,
                backgroundColor: pressed ? `${c.primary}CC` : c.primary,
              },
            ]}
          >
            <Text
              style={{
                color: c.bg,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
              }}
            >
              {state.primaryAction.label}
            </Text>
          </Pressable>
        ) : null}

        {state.secondaryAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={state.secondaryAction.label}
            onPress={() => onAction(state.secondaryAction!)}
            style={({ pressed }) => [
              styles.secondaryAction,
              {
                minHeight: 46,
                borderRadius: r.md,
                borderWidth: 1,
                borderColor: `${c.primary}28`,
                backgroundColor: pressed ? c.surface2 : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                color: c.text,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
              }}
            >
              {state.secondaryAction.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  metrics: {
    flexDirection: 'row',
  },
  metricCard: {
    flex: 1,
    padding: 14,
  },
  actions: {
    flexDirection: 'row',
  },
  primaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
