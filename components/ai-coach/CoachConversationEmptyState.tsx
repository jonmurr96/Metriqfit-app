import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../lib/theme';
import { GlassCard } from '../premium/GlassCard';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface CoachConversationEmptyStateProps {
  onPrompt: (prompt: string) => void;
}

const PROMPTS = [
  'What matters most for me today?',
  'Review my next best move',
  'Show pending changes',
];

export function CoachConversationEmptyState({ onPrompt }: CoachConversationEmptyStateProps) {
  const { c, s, r, ty } = useTokens();

  return (
    <GlassCard animated delay={220}>
      <View style={styles.iconWrap}>
        <View
          style={[
            styles.icon,
            {
              borderRadius: 26,
              backgroundColor: c.opacity.primaryLight,
            },
          ]}
        >
          <TabBarIcon name="sparkles" color={c.primary} size={24} />
        </View>
      </View>

      <Text
        style={{
          color: c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: ty.sizes.lg,
          textAlign: 'center',
          marginTop: s.md,
        }}
      >
        Start with a coach task
      </Text>

      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.sm,
          textAlign: 'center',
          lineHeight: 20,
          marginTop: s.xs,
        }}
      >
        AI Coach is already grounded in your day. Start with what matters now instead of a blank chat box.
      </Text>

      <View style={{ gap: s.sm, marginTop: s.lg }}>
        {PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            accessibilityRole="button"
            accessibilityLabel={prompt}
            onPress={() => onPrompt(prompt)}
            style={({ pressed }) => [
              styles.prompt,
              {
                minHeight: 44,
                borderRadius: r.md,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: pressed ? c.surface2 : c.surface,
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
              {prompt}
            </Text>
          </Pressable>
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
  },
  icon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
