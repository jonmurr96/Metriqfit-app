import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import {
  getAppVersionInfo,
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  TERMS_OF_SERVICE_URL,
} from '../../lib/appConfig';

export default function HelpSettingsScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const versionInfo = getAppVersionInfo();

  const openUrl = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Unavailable', 'Could not open the requested page.');
      return;
    }

    await Linking.openURL(url);
  };

  const openSupportEmail = async () => {
    await openUrl(`mailto:${SUPPORT_EMAIL}?subject=MetriqFit%20Support`);
  };

  const Row = ({
    icon,
    title,
    subtitle,
    onPress,
  }: {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: c.border,
          backgroundColor: pressed ? c.surface2 : c.surface,
          borderRadius: r.md,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${c.primary}18` }]}>
        <TabBarIcon name={icon as any} color={c.primary} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>{title}</Text>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>{subtitle}</Text>
      </View>
      <TabBarIcon name="chevron-forward" color={c.textSubtle} size={16} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + s.md }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 18 }}>Help & Legal</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: s.lg, paddingTop: s.xl, paddingBottom: s.xl }}>
        <View style={{ gap: s.md }}>
          <Row
            icon="mail-outline"
            title="Contact support"
            subtitle={SUPPORT_EMAIL}
            onPress={openSupportEmail}
          />
          <Row
            icon="bug-outline"
            title="Report a problem"
            subtitle="Send a support email with what happened and what you expected."
            onPress={openSupportEmail}
          />
          <Row
            icon="refresh-outline"
            title="Restore purchases"
            subtitle="Use the Subscription screen to restore App Store purchases."
            onPress={() => router.push('/settings/subscription' as any)}
          />
          <Row
            icon="document-text-outline"
            title="Privacy policy"
            subtitle="View the current privacy policy."
            onPress={() => openUrl(PRIVACY_POLICY_URL)}
          />
          <Row
            icon="document-outline"
            title="Terms of service"
            subtitle="View the current terms of service."
            onPress={() => openUrl(TERMS_OF_SERVICE_URL)}
          />
        </View>

        <View style={[styles.versionCard, { borderColor: c.border, backgroundColor: c.surface, marginTop: s.lg }]}>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>App version</Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, marginTop: 8 }}>{versionInfo.display}</Text>
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
  row: {
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
});
