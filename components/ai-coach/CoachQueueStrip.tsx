import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import type { AICoachIntervention } from '../../services/aiCoachService';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface CoachQueueStripProps {
  items: AICoachIntervention[];
  onSelect: (item: AICoachIntervention) => void;
  onOpenAll: () => void;
}

export function CoachQueueStrip({ items, onSelect, onOpenAll }: CoachQueueStripProps) {
  const { c, s, ty, r } = useTokens();

  if (!items.length) return null;

  return (
    <View>
      <View style={[styles.header, { paddingHorizontal: s.lg, marginBottom: s.sm }]}>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.xs,
            letterSpacing: 1.4,
          }}
        >
          COACH QUEUE
        </Text>
        <Pressable onPress={onOpenAll} accessibilityRole="button" accessibilityLabel="Open all coach actions">
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              letterSpacing: 0.5,
            }}
          >
            REVIEW ALL
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: s.lg, gap: s.sm }}
      >
        {items.slice(0, 4).map((item, index) => (
          <MotiView
            key={item.id}
            from={{ opacity: 0, translateX: 18 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 220, delay: 80 + index * 40 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                styles.card,
                {
                  width: 220,
                  minHeight: 120,
                  borderRadius: r.lg,
                  padding: s.md,
                  backgroundColor: pressed ? c.surface2 : c.surface,
                  borderWidth: 1,
                  borderColor: `${c.primary}22`,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.iconWrap,
                    { borderRadius: r.md, backgroundColor: c.opacity.primaryLight },
                  ]}
                >
                  <TabBarIcon
                    name={(item.kind === 'workout' ? 'barbell' : item.kind === 'nutrition' ? 'nutrition' : 'sparkles') as any}
                    color={c.primary}
                    size={16}
                  />
                </View>
                <Text
                  style={{
                    color: c.primary,
                    fontFamily: ty.body.familySemibold,
                    fontSize: 11,
                    letterSpacing: 0.8,
                  }}
                >
                  {item.statusLabel.toUpperCase()}
                </Text>
              </View>

              <Text
                numberOfLines={2}
                style={{
                  color: c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.md,
                  marginTop: s.md,
                }}
              >
                {item.title}
              </Text>

              <Text
                numberOfLines={3}
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  lineHeight: 19,
                  marginTop: s.sm,
                }}
              >
                {item.summary}
              </Text>
            </Pressable>
          </MotiView>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
