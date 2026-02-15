import React from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { useAuth } from '../../lib/auth';

export default function SecuritySettingsScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, resetPassword } = useAuth();

  const handlePasswordReset = async () => {
    if (!user?.email) {
      Alert.alert('No email found', 'Your account email is unavailable for password reset.');
      return;
    }

    const { error } = await resetPassword(user.email);
    if (error) {
      Alert.alert('Request failed', error.message);
      return;
    }

    Alert.alert('Reset email sent', 'Check your inbox for password reset instructions.');
  };

  const openPolicy = async () => {
    const url = 'https://metriqfit.com/privacy';
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Unavailable', 'Could not open privacy policy.');
      return;
    }
    await Linking.openURL(url);
  };

  const ActionRow = ({ icon, title, subtitle, onPress }: { icon: string; title: string; subtitle: string; onPress: () => void }) => (
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
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 18 }}>Security & Privacy</Text>
        <View style={styles.backButton} />
      </View>

      <View style={{ paddingHorizontal: s.lg, marginTop: s.xl, gap: s.md }}>
        <ActionRow
          icon="mail-outline"
          title="Reset password"
          subtitle="Send a secure reset link to your email"
          onPress={handlePasswordReset}
        />
        <ActionRow
          icon="shield-checkmark-outline"
          title="Privacy policy"
          subtitle="View how your data is collected and used"
          onPress={openPolicy}
        />

        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: s.sm, lineHeight: 20 }}>
          Signed in as {user?.email || 'Unknown account'}
        </Text>
      </View>
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
});
