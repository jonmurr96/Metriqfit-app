import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../lib/theme';
import type { AICoachIntervention } from '../../services/aiCoachService';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface CoachInterventionCardProps {
  intervention: AICoachIntervention;
  compact?: boolean;
  onPress?: () => void;
  onApply?: () => void;
  onReject?: () => void;
  isApplying?: boolean;
  isRejecting?: boolean;
}

function iconForKind(kind: AICoachIntervention['kind']) {
  switch (kind) {
    case 'workout':
      return 'barbell';
    case 'nutrition':
      return 'nutrition';
    case 'prep':
      return 'trending-up';
    case 'navigate':
      return 'arrow-forward-circle';
    default:
      return 'sparkles';
  }
}

export function CoachInterventionCard({
  intervention,
  compact = false,
  onPress,
  onApply,
  onReject,
  isApplying = false,
  isRejecting = false,
}: CoachInterventionCardProps) {
  const { c, s, r, ty } = useTokens();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderRadius: r.lg,
          padding: compact ? s.md : s.lg,
          backgroundColor: pressed && onPress ? c.surface2 : c.surface,
          borderWidth: 1,
          borderColor: `${c.primary}28`,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconWrap,
              {
                width: compact ? 36 : 42,
                height: compact ? 36 : 42,
                borderRadius: compact ? 18 : 21,
                backgroundColor: c.opacity.primaryLight,
              },
            ]}
          >
            <TabBarIcon name={iconForKind(intervention.kind) as any} color={c.primary} size={compact ? 18 : 20} />
          </View>
          <View style={styles.headerText}>
            <View
              style={[
                styles.badge,
                {
                  borderRadius: r.pill,
                  borderWidth: 1,
                  borderColor: `${c.primary}30`,
                  backgroundColor: 'rgba(8,14,32,0.45)',
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
                {intervention.statusLabel.toUpperCase()}
              </Text>
            </View>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: compact ? ty.sizes.md : ty.sizes.lg,
                marginTop: s.sm,
              }}
            >
              {intervention.title}
            </Text>
          </View>
        </View>

        {onPress ? <TabBarIcon name="chevron-forward" color={c.textMuted} size={18} /> : null}
      </View>

      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.sm,
          lineHeight: 20,
          marginTop: s.md,
        }}
      >
        {intervention.summary}
      </Text>

      {(onApply || onReject) ? (
        <View style={[styles.actions, { marginTop: s.lg, gap: s.sm }]}>
          {onReject ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={intervention.rejectLabel || 'Dismiss'}
              onPress={onReject}
              style={({ pressed }) => [
                styles.secondaryAction,
                {
                  minHeight: 44,
                  borderRadius: r.md,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: pressed ? c.surface2 : 'transparent',
                  opacity: isRejecting ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                }}
              >
                {isRejecting ? 'Working...' : intervention.rejectLabel || 'Dismiss'}
              </Text>
            </Pressable>
          ) : null}

          {onApply ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={intervention.applyLabel || 'Apply'}
              onPress={onApply}
              style={({ pressed }) => [
                styles.primaryAction,
                {
                  minHeight: 44,
                  borderRadius: r.md,
                  backgroundColor: pressed ? `${c.primary}CC` : c.primary,
                  opacity: isApplying ? 0.7 : 1,
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
                {isApplying ? 'Applying...' : intervention.applyLabel || 'Apply'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actions: {
    flexDirection: 'row',
  },
  primaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
});
