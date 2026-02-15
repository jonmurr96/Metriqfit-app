import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';

const FAQ_ITEMS = [
  {
    q: 'How do I edit my meal schedule?',
    a: 'Open Settings > Meal Schedule and set your preferred breakfast, lunch, dinner, and snack times.',
  },
  {
    q: 'Why are my macros not updating?',
    a: 'Macros update after you log food items. Check Nutrition > Meal Timeline and make sure entries were saved.',
  },
  {
    q: 'How do I restore purchases?',
    a: 'Open Settings > Subscription > Restore Purchases to sync your entitlement status.',
  },
];

export default function HelpSettingsScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleContactSupport = async () => {
    const email = 'support@metriqfit.com';
    const url = `mailto:${email}?subject=MetriqFit%20Support`;
    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      Alert.alert('Unable to open mail app', `Please contact ${email}`);
      return;
    }

    await Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + s.md }]}> 
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 18 }}>Help Center</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: s.lg, paddingTop: s.xl, paddingBottom: s.xl }}>
        <Pressable
          onPress={handleContactSupport}
          style={({ pressed }) => [
            styles.contactButton,
            {
              borderColor: c.primary,
              backgroundColor: pressed ? `${c.primary}20` : `${c.primary}14`,
              borderRadius: r.md,
            },
          ]}
        >
          <TabBarIcon name="mail-outline" color={c.primary} size={18} />
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, marginLeft: 8 }}>Contact Support</Text>
        </Pressable>

        <View style={{ marginTop: s.lg, gap: s.md }}>
          {FAQ_ITEMS.map((item) => (
            <View key={item.q} style={[styles.faqCard, { borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md }]}> 
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>{item.q}</Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 8, lineHeight: 20 }}>{item.a}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButton: {
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqCard: {
    borderWidth: 1,
    padding: 14,
  },
});
