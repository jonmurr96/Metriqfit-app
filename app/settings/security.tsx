import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { useAuth } from '../../lib/auth/AuthProvider';
import {
  deleteMyAccount,
  exportMyData,
  requestEmailChange,
  requestPasswordReset,
} from '../../services/accountService';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../../lib/appConfig';
import { clearNotificationState } from '../../services/notificationService';

export default function SecuritySettingsScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [nextEmail, setNextEmail] = useState(user?.email || '');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const linkedProviders = useMemo(() => {
    const providers = (user?.app_metadata?.providers || user?.identities?.map((identity) => identity.provider)) as
      | string[]
      | undefined;

    if (!providers?.length) return ['email'];
    return Array.from(new Set(providers));
  }, [user?.app_metadata?.providers, user?.identities]);

  const handlePasswordReset = async () => {
    if (!user?.email) {
      Alert.alert('No email found', 'Your account email is unavailable for password reset.');
      return;
    }

    try {
      setIsResettingPassword(true);
      await requestPasswordReset(user.email);
      Alert.alert('Reset email sent', 'Check your inbox for password reset instructions.');
    } catch (error: any) {
      Alert.alert('Request failed', error?.message || 'Could not send a password reset email.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleEmailChange = async () => {
    if (!nextEmail.trim()) {
      Alert.alert('Email required', 'Enter the new email address first.');
      return;
    }

    try {
      setIsSubmittingEmail(true);
      await requestEmailChange(nextEmail.trim());
      Alert.alert('Verification sent', 'Confirm the email change from the verification message we just sent.');
    } catch (error: any) {
      Alert.alert('Update failed', error?.message || 'Could not request the email change.');
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleExport = async () => {
    if (!user?.id) return;

    try {
      setIsExporting(true);
      await exportMyData(user.id);
    } catch (error: any) {
      Alert.alert('Export failed', error?.message || 'Could not export your account data.');
    } finally {
      setIsExporting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account data. If the backend requires a fresh sign-in, you may be asked to authenticate again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleDeleteAccount,
        },
      ],
    );
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await deleteMyAccount();
      if (user?.id) {
        await clearNotificationState(user.id);
      }
      await signOut();
      router.replace('/');
    } catch (error: any) {
      Alert.alert(
        'Delete failed',
        error?.message || 'Your account could not be deleted. Re-authenticate and try again.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openExternal = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Unavailable', 'Could not open the requested page.');
      return;
    }
    await Linking.openURL(url);
  };

  const ActionRow = ({
    icon,
    title,
    subtitle,
    onPress,
    destructive = false,
    loading = false,
  }: {
    icon: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    destructive?: boolean;
    loading?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: c.border,
          backgroundColor: pressed ? c.surface2 : c.surface,
          borderRadius: r.md,
          opacity: loading ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: destructive ? `${c.danger}18` : `${c.primary}18` }]}>
        <TabBarIcon name={icon as any} color={destructive ? c.danger : c.primary} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: destructive ? c.danger : c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>
          {title}
        </Text>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>{subtitle}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={destructive ? c.danger : c.primary} />
      ) : (
        <TabBarIcon name="chevron-forward" color={c.textSubtle} size={16} />
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top + s.md }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 18 }}>
          Account & Security
        </Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: s.lg, paddingTop: s.xl, paddingBottom: s.xl }}>
        <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>Account email</Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 6 }}>{user?.email || 'Unknown'}</Text>

          <Text style={{ color: c.textMuted, fontFamily: ty.body.familyMedium, marginTop: 16, marginBottom: 8 }}>
            Change email
          </Text>
          <TextInput
            value={nextEmail}
            onChangeText={setNextEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@example.com"
            placeholderTextColor={c.textSubtle}
            style={[
              styles.input,
              {
                borderColor: c.border,
                backgroundColor: c.surface2,
                color: c.text,
                fontFamily: ty.body.family,
              },
            ]}
          />
          <Pressable
            onPress={handleEmailChange}
            disabled={isSubmittingEmail}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: c.primary,
                opacity: pressed || isSubmittingEmail ? 0.8 : 1,
              },
            ]}
          >
            {isSubmittingEmail ? (
              <ActivityIndicator size="small" color={c.bg} />
            ) : (
              <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold }}>Request email change</Text>
            )}
          </Pressable>
        </View>

        <View style={{ marginTop: s.lg, gap: s.md }}>
          <ActionRow
            icon="key-outline"
            title="Reset password"
            subtitle="Send a secure password reset email."
            onPress={handlePasswordReset}
            loading={isResettingPassword}
          />
          <ActionRow
            icon="download-outline"
            title="Export my data"
            subtitle="Creates a JSON export with profile, preferences, and subscription data."
            onPress={handleExport}
            loading={isExporting}
          />
          <ActionRow
            icon="document-text-outline"
            title="Privacy policy"
            subtitle="Review how MetriqFit handles your data."
            onPress={() => openExternal(PRIVACY_POLICY_URL)}
          />
          <ActionRow
            icon="document-outline"
            title="Terms of service"
            subtitle="Read the current legal terms for app use."
            onPress={() => openExternal(TERMS_OF_SERVICE_URL)}
          />
          <ActionRow
            icon="trash-outline"
            title="Delete account"
            subtitle="Permanently remove your account and sign out of this device."
            onPress={confirmDelete}
            destructive
            loading={isDeleting}
          />
        </View>

        <View style={[styles.card, { borderColor: c.border, backgroundColor: c.surface, marginTop: s.lg }]}>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>
            Linked sign-in methods
          </Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            {linkedProviders.map((provider) => (
              <View key={provider} style={styles.providerRow}>
                <TabBarIcon name="checkmark-circle" color={c.primary} size={16} />
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
                  {provider === 'email' ? 'Email and password' : provider}
                </Text>
              </View>
            ))}
          </View>
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
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  primaryButton: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
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
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
