import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '@/components/common/PressableScale';
import type { AICoachMemoryItem } from '../../services/aiCoachService';
import { useTokens } from '../../lib/theme';
import { CoachSheet } from './CoachSheet';

interface CoachMemorySheetProps {
  visible: boolean;
  items: AICoachMemoryItem[];
  onClose: () => void;
  onResolve: (item: AICoachMemoryItem) => void;
  onDismiss: (item: AICoachMemoryItem) => void;
}

export function CoachMemorySheet({
  visible,
  items,
  onClose,
  onResolve,
  onDismiss,
}: CoachMemorySheetProps) {
  const { c, s, r, ty } = useTokens();
  const typeLabel: Record<AICoachMemoryItem['memoryType'], string> = {
    goal: 'Goal',
    preference: 'Preference',
    constraint: 'Constraint',
    commitment: 'Commitment',
    intervention: 'Applied change',
    summary: 'Coach summary',
  };
  const orderedItems = [...items].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return (b.priority || 0) - (a.priority || 0);
  });

  return (
    <CoachSheet
      visible={visible}
      onClose={onClose}
      title="Coach Memory"
      subtitle="What the coach remembers about your goals, constraints, commitments, and applied changes."
    >
      <View style={{ gap: s.lg }}>
        {orderedItems.length ? orderedItems.map((item) => (
          <View
            key={item.id}
            style={[
              styles.card,
              {
                borderRadius: r.lg,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                padding: s.md,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, flex: 1 }}>
                {item.title}
              </Text>
              <Text
                style={{
                  color: item.isDerived ? c.textSubtle : c.primary,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 11,
                  letterSpacing: 0.7,
                }}
              >
                {item.isDerived ? 'DERIVED' : typeLabel[item.memoryType].toUpperCase()}
              </Text>
            </View>

            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
                lineHeight: 20,
                marginTop: s.xs,
              }}
            >
              {item.body}
            </Text>

            <View style={[styles.metaRow, { marginTop: s.sm }]}>
              <Text style={{ color: c.textSubtle, fontFamily: ty.body.familySemibold, fontSize: 11, letterSpacing: 0.7 }}>
                {item.status.toUpperCase()}
              </Text>
              {item.updatedAt ? (
                <Text style={{ color: c.textSubtle, fontFamily: ty.body.family, fontSize: 11 }}>
                  Updated {new Date(item.updatedAt).toLocaleDateString()}
                </Text>
              ) : null}
            </View>

            {!item.isDerived && item.status === 'active' ? (
              <View style={[styles.actions, { gap: s.sm, marginTop: s.md }]}>
                <PressableScale
                  accessibilityRole="button"
                  onPress={() => onDismiss(item)}
                  style={(pressed) => [
                    styles.action,
                    {
                      minHeight: 44,
                      borderRadius: r.md,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: pressed ? c.surface2 : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Dismiss
                  </Text>
                </PressableScale>
                <PressableScale
                  accessibilityRole="button"
                  onPress={() => onResolve(item)}
                  style={(pressed) => [
                    styles.action,
                    {
                      minHeight: 44,
                      borderRadius: r.md,
                      backgroundColor: pressed ? `${c.primary}CC` : c.primary,
                    },
                  ]}
                >
                  <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Resolve
                  </Text>
                </PressableScale>
              </View>
            ) : null}
          </View>
        )) : (
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
            No coach memory items yet.
          </Text>
        )}
      </View>
    </CoachSheet>
  );
}

const styles = StyleSheet.create({
  card: {},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
});
