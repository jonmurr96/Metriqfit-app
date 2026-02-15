import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';

export default function ProgressPhotosScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={{ paddingTop: insets.top + s.md, paddingBottom: 100, paddingHorizontal: s.lg }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 18 }}>Progress Photos</Text>
        <View style={styles.backButton} />
      </View>

      <View style={[styles.emptyCard, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg, marginTop: s.xl }]}> 
        <View style={[styles.iconBubble, { backgroundColor: `${c.primary}18` }]}>
          <TabBarIcon name="camera" color={c.primary} size={28} />
        </View>

        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 20, marginTop: s.md }}>
          Start your photo timeline
        </Text>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, textAlign: 'center', marginTop: s.sm, lineHeight: 20 }}>
          Capture front, side, and back photos each check-in to track visual progress over time.
        </Text>

        <Pressable
          onPress={() => router.push('/check-in')}
          style={[styles.primaryButton, { backgroundColor: c.primary, borderRadius: r.md, marginTop: s.lg }]}
        >
          <TabBarIcon name="scan-outline" color={c.bg} size={18} />
          <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, marginLeft: 8 }}>Open Weekly Check-in</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/settings/help' as any)}
          style={[styles.secondaryButton, { borderColor: c.border, borderRadius: r.md, marginTop: s.sm }]}
        >
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Photo guidance</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
