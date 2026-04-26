import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../lib/theme';
import type { SuggestedPrompt } from '../../services/aiCoachService';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface CoachPromptLauncherRowProps {
  prompts: SuggestedPrompt[];
  onSelect: (prompt: SuggestedPrompt) => void;
}

export function CoachPromptLauncherRow({ prompts, onSelect }: CoachPromptLauncherRowProps) {
  const { c, s, r, ty } = useTokens();

  if (!prompts.length) return null;

  return (
    <View style={{ marginTop: s.md }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: s.lg, paddingRight: s.xl, gap: s.sm }}
      >
        {prompts.map((prompt) => (
          <Pressable
            key={prompt.id}
            accessibilityRole="button"
            accessibilityLabel={prompt.label}
            onPress={() => onSelect(prompt)}
            style={({ pressed }) => [
              styles.chip,
              {
                minHeight: 44,
                maxWidth: 250,
                borderRadius: r.pill,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: pressed ? c.surface2 : c.surface,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,
                {
                  borderRadius: r.sm,
                  backgroundColor: c.opacity.primaryLight,
                },
              ]}
            >
              <TabBarIcon name={prompt.icon as any} color={c.primary} size={14} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                color: c.text,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
                flexShrink: 1,
              }}
            >
              {prompt.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
