import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { PressableScale } from '@/components/common/PressableScale';

interface RestDayCardProps {
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  delay?: number;
}

export function RestDayCard({
  title = 'Rest Day',
  subtitle = 'Recovery, mobility, and hydration.',
  onPress,
  delay = 0,
}: RestDayCardProps) {
  const { c, ty, s, r, glass } = useTokens();
  const router = useRouter();

  const handlePress = onPress || (() => router.push('/(tabs)/workout'));

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 450, delay }}
    >
      <PressableScale
        onPress={handlePress}
        style={(pressed) => [
          styles.container,
          {
            backgroundColor: glass.background,
            borderRadius: r.lg,
            borderWidth: 1,
            borderColor: pressed ? c.primary : glass.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          Platform.OS === 'web'
            ? ({ boxShadow: `0 0 24px ${c.primary}18` } as any)
            : {
                shadowColor: c.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
              },
        ]}
      >
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: `${c.primary}16`,
              borderRadius: r.md,
            },
          ]}
        >
          <TabBarIcon name="leaf-outline" color={c.primary} size={26} />
        </View>

        <View style={styles.content}>
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: 11,
              letterSpacing: 1.3,
            }}
          >
            TODAY
          </Text>
          <Text
            style={{
              marginTop: 4,
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.lg,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              marginTop: s.xs,
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.sm,
            }}
          >
            {subtitle}
          </Text>
        </View>

        <View
          style={[
            styles.actionBadge,
            {
              borderColor: c.primary,
              borderRadius: r.pill,
            },
          ]}
        >
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: 11,
              letterSpacing: 0.3,
            }}
          >
            Open Week
          </Text>
        </View>
      </PressableScale>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconBadge: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  actionBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
