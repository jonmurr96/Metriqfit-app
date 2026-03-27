import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { GlassCard } from '../../premium/GlassCard';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

export type WorkoutToolTile = {
  label: string;
  icon: string;
  onPress: () => void;
};

type Props = {
  items: WorkoutToolTile[];
  title?: string;
};

export function WorkoutToolsGrid({ items, title = 'TOOLS' }: Props) {
  const { c, s, ty, r } = useTokens();

  return (
    <View>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.familySemibold,
          fontSize: ty.sizes.sm,
          letterSpacing: 1.3,
          marginBottom: s.sm,
        }}
      >
        {title}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -s.xs }}>
        {items.map((item) => (
          <View key={item.label} style={{ width: '50%', paddingHorizontal: s.xs, marginBottom: s.sm }}>
            <Pressable onPress={item.onPress}>
              {({ pressed }) => (
                <GlassCard
                  intensity="medium"
                  animated
                  style={{
                    minHeight: 88,
                    borderRadius: r.lg,
                    borderColor: pressed ? `${c.primary}88` : undefined,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm, minHeight: 48 }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: r.md,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: `${c.primary}14`,
                        borderWidth: 1,
                        borderColor: `${c.primary}55`,
                      }}
                    >
                      <TabBarIcon name={item.icon as any} color={c.primary} size={16} />
                    </View>
                    <Text
                      style={{
                        flex: 1,
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.sm,
                        lineHeight: 18,
                      }}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>
                  </View>
                </GlassCard>
              )}
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
