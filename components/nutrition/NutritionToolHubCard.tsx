import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

export type NutritionToolAccessState = 'available' | 'elite_required';

export interface NutritionToolHubCardProps {
  title: string;
  subtitle: string;
  icon: string;
  accessState: NutritionToolAccessState;
  meta?: string | null;
  onPress: () => void;
}

export function NutritionToolHubCard({
  title,
  subtitle,
  icon,
  accessState,
  meta,
  onPress,
}: NutritionToolHubCardProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderRadius: r.xl,
          borderWidth: 1,
          borderColor: c.border,
          padding: s.md,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: `${c.primary}14`,
              borderRadius: r.md,
            },
          ]}
        >
          <TabBarIcon name={icon as any} color={c.primary} size={18} />
        </View>
        <View
          style={[
            styles.badge,
            {
              borderRadius: r.pill,
              backgroundColor: accessState === 'elite_required' ? `${c.warning}16` : `${c.primary}14`,
            },
          ]}
        >
          <Text
            style={{
              color: accessState === 'elite_required' ? c.warning : c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
            }}
          >
            {accessState === 'elite_required' ? 'Elite' : 'Ready'}
          </Text>
        </View>
      </View>

      <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginTop: s.md }}>
        {title}
      </Text>
      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
        {subtitle}
      </Text>
      {meta ? (
        <Text style={{ color: c.textSubtle, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.md }}>
          {meta}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 132,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
