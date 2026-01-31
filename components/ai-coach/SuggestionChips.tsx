import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';

interface Suggestion {
  id: string;
  label: string;
  icon: string;
}

interface SuggestionChipsProps {
  suggestions?: Suggestion[];
  onSelect?: (suggestion: Suggestion) => void;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { id: '1', label: 'What should I eat?', icon: 'nutrition' },
  { id: '2', label: 'Analyze my week', icon: 'stats-chart' },
  { id: '3', label: 'Meal swap ideas', icon: 'search' },
  { id: '4', label: 'Next workout', icon: 'barbell' },
  { id: '5', label: 'Protein tips', icon: 'flash' },
  { id: '6', label: 'Water reminder', icon: 'water' },
];

export function SuggestionChips({
  suggestions = DEFAULT_SUGGESTIONS,
  onSelect,
}: SuggestionChipsProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing' as const, duration: 300, delay: 200 } as any}
    >
      <Text
        style={[
          styles.sectionLabel,
          {
            color: c.textMuted,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.xs,
            letterSpacing: 1.5,
            paddingHorizontal: s.lg,
            marginBottom: s.sm,
          },
        ]}
      >
        QUICK PROMPTS
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: s.lg }]}
        decelerationRate="fast"
      >
        {suggestions.map((suggestion, index) => (
          <MotiView
            key={suggestion.id}
            from={{ opacity: 0, scale: 0.9, translateX: 20 }}
            animate={{ opacity: 1, scale: 1, translateX: 0 }}
            transition={{
              type: 'spring' as const,
              damping: 15,
              stiffness: 150,
              delay: 300 + index * 60,
            } as any}
          >
            <Pressable
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: pressed ? c.surface2 : c.surface,
                  borderRadius: r.pill,
                  borderWidth: 1,
                  borderColor: pressed ? c.borderStrong : c.border,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              onPress={() => onSelect?.(suggestion)}
            >
              <View
                style={[
                  styles.chipIcon,
                  {
                    backgroundColor: c.opacity.primaryLight,
                    borderRadius: r.sm,
                    shadowColor: c.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  },
                ]}
              >
                <TabBarIcon
                  name={suggestion.icon as any}
                  color={c.primary}
                  size={14}
                />
              </View>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familyMedium,
                  fontSize: ty.sizes.sm,
                }}
              >
                {suggestion.label}
              </Text>
            </Pressable>
          </MotiView>
        ))}
      </ScrollView>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {},
  scrollContent: {
    gap: 10,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  chipIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
