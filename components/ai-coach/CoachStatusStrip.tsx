import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../lib/theme';
import type { AICoachAction, AICoachStatusStripState } from '../../services/aiCoachService';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface CoachStatusStripProps {
  state: AICoachStatusStripState | null;
  onAction?: (action: AICoachAction) => void;
  onOpenContext?: () => void;
  onDismiss?: () => void;
}

function severityColor(severity: AICoachStatusStripState['severity'], primary: string, warning: string) {
  if (severity === 'behind' || severity === 'recovery') return warning;
  return primary;
}

export function CoachStatusStrip({ state, onAction, onOpenContext, onDismiss }: CoachStatusStripProps) {
  const { c, s, r, ty } = useTokens();

  if (!state) return null;

  const accent = severityColor(state.severity, c.primary, c.warning);

  return (
    <View
      style={[
        styles.root,
        {
          borderRadius: r.lg,
          borderWidth: 1,
          borderColor: `${accent}28`,
          backgroundColor: c.surface,
          paddingHorizontal: s.md,
          paddingVertical: s.md,
        },
      ]}
    >
      <View style={styles.summaryBlock}>
        <View style={styles.summaryHeader}>
          <View
            style={[
              styles.badge,
              {
                borderRadius: r.pill,
                borderWidth: 1,
                borderColor: `${accent}32`,
                backgroundColor: 'rgba(8, 14, 32, 0.42)',
              },
            ]}
          >
            <Text
              style={{
                color: accent,
                fontFamily: ty.body.familySemibold,
                fontSize: 11,
                letterSpacing: 0.8,
              }}
            >
              {state.label.toUpperCase()}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {onOpenContext ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open coach context"
                onPress={onOpenContext}
                style={({ pressed }) => [
                  styles.contextButton,
                  {
                    borderRadius: r.md,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: pressed ? c.surface2 : 'transparent',
                  },
                ]}
              >
                <TabBarIcon name="layers-outline" color={c.textMuted} size={16} />
              </Pressable>
            ) : null}

            {onDismiss ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss coach status"
                onPress={onDismiss}
                style={({ pressed }) => [
                  styles.contextButton,
                  {
                    borderRadius: r.md,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: pressed ? c.surface2 : 'transparent',
                  },
                ]}
              >
                <TabBarIcon name="close" color={c.textMuted} size={16} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text
          style={{
            color: c.text,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.sm,
            lineHeight: 20,
            marginTop: s.sm,
          }}
        >
          {state.summary}
        </Text>

        <Text
          style={{
            color: c.textSubtle,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.xs,
            marginTop: s.xs,
          }}
        >
          {state.source}
        </Text>
      </View>

      {state.cta && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={state.cta.label}
          onPress={() => onAction(state.cta!)}
          style={({ pressed }) => [
            styles.cta,
            {
              minHeight: 44,
              borderRadius: r.md,
              backgroundColor: pressed ? `${accent}CC` : accent,
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
            {state.cta.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryBlock: {
    flex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  contextButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
});
