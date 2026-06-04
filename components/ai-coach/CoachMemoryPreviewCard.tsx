import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from '@/components/common/PressableScale';
import { GlassCard } from '../premium/GlassCard';
import { useTokens } from '../../lib/theme';
import type { AICoachMemoryItem } from '../../services/aiCoachService';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface CoachMemoryPreviewCardProps {
  items: AICoachMemoryItem[];
  onOpen: () => void;
}

export function CoachMemoryPreviewCard({ items, onOpen }: CoachMemoryPreviewCardProps) {
  const { c, s, r, ty } = useTokens();

  return (
    <GlassCard animated delay={150}>
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
            MEMORY PREVIEW
          </Text>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.lg,
              marginTop: s.sm,
            }}
          >
            Coach continuity
          </Text>
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Open coach memory"
          onPress={onOpen}
          style={(pressed) => [
            styles.iconButton,
            {
              borderRadius: r.md,
              borderWidth: 1,
              borderColor: `${c.primary}28`,
              backgroundColor: pressed ? c.surface2 : 'transparent',
            },
          ]}
        >
          <TabBarIcon name="book-outline" color={c.primary} size={18} />
        </PressableScale>
      </View>

      <View style={{ marginTop: s.lg, gap: s.sm }}>
        {items.length ? items.map((item) => (
          <View
            key={item.id}
            style={[
              styles.item,
              {
                borderRadius: r.md,
                backgroundColor: c.surface2,
                borderWidth: 1,
                borderColor: c.border,
                padding: s.md,
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
              {item.title}
            </Text>
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
              {item.body}
            </Text>
          </View>
        )) : (
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.sm,
            }}
          >
            Coach memory is empty. Applied changes and saved commitments will land here.
          </Text>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {},
});
