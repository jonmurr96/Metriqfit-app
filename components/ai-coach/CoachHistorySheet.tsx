import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AICoachConversationSummary } from '../../services/aiCoachService';
import { useTokens } from '../../lib/theme';
import { SubscriptionFeatureGate } from '../premium/SubscriptionFeatureGate';
import { CoachSheet } from './CoachSheet';

interface CoachHistorySheetProps {
  visible: boolean;
  items: AICoachConversationSummary[];
  activeConversationId?: string | null;
  locked?: boolean;
  upgradeTier?: 'premium' | 'elite';
  onClose: () => void;
  onSelect: (item: AICoachConversationSummary) => void;
  onClearHistory?: () => void;
}

function timestampLabel(input: string) {
  return new Date(input).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

export function CoachHistorySheet({
  visible,
  items,
  activeConversationId,
  locked = false,
  upgradeTier = 'premium',
  onClose,
  onSelect,
  onClearHistory,
}: CoachHistorySheetProps) {
  const { c, s, r, ty } = useTokens();

  return (
    <CoachSheet
      visible={visible}
      onClose={onClose}
      title="Conversation History"
      subtitle="Reopen prior coach chats and review what the coach already knows about your recent days."
      footer={onClearHistory ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear conversation history"
          onPress={onClearHistory}
          style={({ pressed }) => [
            styles.clearButton,
            {
              minHeight: 44,
              borderRadius: r.md,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: pressed ? c.surface2 : 'transparent',
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
            Clear all history
          </Text>
        </Pressable>
      ) : null}
    >
      {locked ? (
        <SubscriptionFeatureGate
          requiredTier={upgradeTier}
          title="Conversation history is a Premium feature"
          subtitle="Free keeps the coach focused on today. Upgrade to reopen prior conversations, revisit past guidance, and keep a longer coaching trail."
          ctaLabel={`Unlock with ${upgradeTier === 'elite' ? 'Elite' : 'Premium'}`}
        />
      ) : (
        <View style={{ gap: s.sm }}>
          {items.length ? items.map((item) => {
            const isActive = item.id === activeConversationId;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => onSelect(item)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    borderRadius: r.lg,
                    borderWidth: 1,
                    borderColor: isActive ? `${c.primary}42` : c.border,
                    backgroundColor: pressed || isActive ? c.surface2 : c.surface,
                    padding: s.md,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: ty.body.familySemibold,
                      fontSize: ty.sizes.sm,
                      flex: 1,
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      color: c.textSubtle,
                      fontFamily: ty.body.family,
                      fontSize: ty.sizes.xs,
                    }}
                  >
                    {timestampLabel(item.updatedAt)}
                  </Text>
                </View>

                <Text
                  numberOfLines={2}
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.sm,
                    lineHeight: 19,
                    marginTop: s.xs,
                  }}
                >
                  {item.lastMessagePreview}
                </Text>

                <Text
                  style={{
                    color: isActive ? c.primary : c.textSubtle,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.xs,
                    marginTop: s.sm,
                  }}
                >
                  {item.messageCount} messages
                </Text>
              </Pressable>
            );
          }) : (
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
              }}
            >
              No saved conversations yet.
            </Text>
          )}
        </View>
      )}
    </CoachSheet>
  );
}

const styles = StyleSheet.create({
  card: {},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
