import { useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '../../lib/auth';
import { useTokens } from '../../lib/theme';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { AuthTextField } from '../../components/auth/AuthTextField';
import { AuthPasswordField } from '../../components/auth/AuthPasswordField';
import { AuthPrimaryButton } from '../../components/auth/AuthPrimaryButton';
import { AuthProviderButton } from '../../components/auth/AuthProviderButton';
import { AuthFooterLinks } from '../../components/auth/AuthFooterLinks';

const normalizeError = (message?: string): string => {
  if (!message) {
    return 'Something went wrong. Please try again.';
  }

  const lowered = message.toLowerCase();
  if (lowered.includes('already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (lowered.includes('password')) {
    return 'Password does not meet requirements. Use at least 6 characters.';
  }
  if (lowered.includes('network')) {
    return 'Network issue detected. Check your connection and retry.';
  }
  return message;
};

const openLegalLink = async (url: string) => {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert('Unavailable', 'Unable to open this link right now.');
    return;
  }
  await Linking.openURL(url);
};

export default function SignUpScreen() {
  const { c, ty, s, theme } = useTokens();
  const { signUp, signInWithOAuth, oauthAvailability } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const passwordHint = useMemo(() => {
    if (!password) {
      return 'Use at least 6 characters.';
    }
    if (password.length < 6) {
      return 'Password is too short.';
    }
    return 'Looks good.';
  }, [password]);

  const confirmError = confirmPassword && password !== confirmPassword ? 'Passwords do not match.' : '';

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      setSuccessMessage('');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setSuccessMessage('');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setSuccessMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data, error: signUpError } = await signUp(email.trim(), password);
      if (signUpError) {
        setError(normalizeError(signUpError.message));
        return;
      }

      if (data?.user) {
        setSuccessMessage('Account created. Redirecting to onboarding...');
        router.replace('/(onboarding)/identity');
      }
    } catch (err: any) {
      setError(normalizeError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignUp = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    const { error: oauthError } = await signInWithOAuth(provider);
    if (oauthError) {
      setError(normalizeError(oauthError.message));
      setLoading(false);
      return;
    }

    if (provider === 'google') {
      setSuccessMessage('Redirecting to Google...');
    }
    setLoading(false);
  };

  return (
    <AuthScreenShell
      title="Create your account"
      subtitle="Build your personalized training and nutrition system."
      footer={
        <AuthFooterLinks
          prompt="Already have an account?"
          actionLabel="Sign in"
          href="/(auth)/sign-in"
          disabled={loading}
        />
      }
    >
      <View style={{ gap: s.sm }}>
        <AuthProviderButton
          provider="google"
          onPress={() => handleOAuthSignUp('google')}
          disabled={loading || !oauthAvailability.google}
          helperText={!oauthAvailability.google ? 'Google sign up is disabled in this environment.' : undefined}
        />

        <AuthProviderButton
          provider="apple"
          disabled
          helperText="Apple sign up is coming soon."
        />
      </View>

      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: `${c.primary}${theme.auth.dividerOpacity}` }]} />
        <Text style={[styles.dividerText, { color: c.textMuted, fontFamily: ty.body.family }]}>or continue with email</Text>
        <View style={[styles.dividerLine, { backgroundColor: `${c.primary}${theme.auth.dividerOpacity}` }]} />
      </View>

      <AuthTextField
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!loading}
        accessibilityLabel="Email"
        accessibilityHint="Enter the email for your new account"
      />

      <AuthPasswordField
        ref={passwordRef}
        label="Password"
        placeholder="Create a strong password"
        value={password}
        onChangeText={setPassword}
        hint={passwordHint}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="password-new"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        editable={!loading}
        accessibilityLabel="Password"
        accessibilityHint="Create a password with at least six characters"
      />

      <AuthPasswordField
        ref={confirmRef}
        label="Confirm password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={confirmError}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="newPassword"
        autoComplete="password-new"
        returnKeyType="done"
        onSubmitEditing={handleSignUp}
        editable={!loading}
        accessibilityLabel="Confirm password"
        accessibilityHint="Re-enter your password to confirm"
      />

      {error ? (
        <Text style={[styles.messageText, { color: c.danger, fontFamily: ty.body.family }]}>{error}</Text>
      ) : null}

      {!error && successMessage ? (
        <Text style={[styles.messageText, { color: c.success, fontFamily: ty.body.family }]}>{successMessage}</Text>
      ) : null}

      <AuthPrimaryButton
        label="Create Account"
        onPress={handleSignUp}
        loading={loading}
        accessibilityHint="Creates your account and starts onboarding"
      />

      <View style={styles.legalRow}>
        <Text style={[styles.legalText, { color: c.textMuted, fontFamily: ty.body.family }]}>By continuing you agree to our </Text>
        <Pressable onPress={() => openLegalLink('https://metriqfit.com/terms')}>
          <Text style={[styles.legalLink, { color: c.primary, fontFamily: ty.body.familySemibold }]}>Terms</Text>
        </Pressable>
        <Text style={[styles.legalText, { color: c.textMuted, fontFamily: ty.body.family }]}> and </Text>
        <Pressable onPress={() => openLegalLink('https://metriqfit.com/privacy')}>
          <Text style={[styles.legalLink, { color: c.primary, fontFamily: ty.body.familySemibold }]}>Privacy Policy</Text>
        </Pressable>
        <Text style={[styles.legalText, { color: c.textMuted, fontFamily: ty.body.family }]}>.</Text>
      </View>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  legalText: {
    fontSize: 12,
    lineHeight: 18,
  },
  legalLink: {
    fontSize: 12,
    lineHeight: 18,
  },
});
