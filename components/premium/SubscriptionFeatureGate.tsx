import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface SubscriptionFeatureGateProps {
  requiredTier: 'premium' | 'elite';
  title: string;
  subtitle: string;
  ctaLabel?: string;
}

export function SubscriptionFeatureGate({
  requiredTier,
  title,
  subtitle,
  ctaLabel,
}: SubscriptionFeatureGateProps) {
  const router = useRouter();
  const { c, s, ty, r } = useTokens();

  const tierLabel = requiredTier === 'elite' ? 'Elite' : 'Premium';
  const iconName = requiredTier === 'elite' ? 'diamond-outline' : 'flash-outline';

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg, padding: s.xl }]}>
      <TabBarIcon name={iconName as any} color={c.primary} size={56} />
      <Text
        style={{
          marginTop: s.lg,
          color: c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: ty.sizes.lg,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          marginTop: s.sm,
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.md,
          textAlign: 'center',
          lineHeight: 22,
        }}
      >
        {subtitle}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Upgrade to ${tierLabel}`}
        onPress={() => router.push('/settings/subscription')}
        style={{
          marginTop: s.xl,
          minHeight: 48,
          backgroundColor: c.primary,
          borderRadius: r.md,
          paddingHorizontal: 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
          {ctaLabel || `Upgrade to ${tierLabel}`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderWidth: 1,
    alignItems: 'center',
  },
});
