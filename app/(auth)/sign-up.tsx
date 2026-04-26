import { useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MotiView } from 'moti';

import { useAuth } from '../../lib/auth';
import { useTokens } from '../../lib/theme';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { FloatingLabelInput } from '../../components/auth/FloatingLabelInput';
import { ShimmerButton } from '../../components/auth/ShimmerButton';
import { AuthProviderButton } from '../../components/auth/AuthProviderButton';
import { AuthFooterLinks } from '../../components/auth/AuthFooterLinks';

const normalizeError = (message?: string): string => {
  if (!message) return 'Something went wrong. Please try again.';
  const lowered = message.toLowerCase();
  if (lowered.includes('already registered') || lowered.includes('user already exists')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (lowered.includes('password')) {
    return 'Password does not meet requirements. Use at least 6 characters.';
  }
  if (lowered.includes('network')) {
    return 'Network issue detected. Check your connection and retry.';
  }
  if (lowered.includes('database error saving new user') || lowered.includes('temporarily unavailable')) {
    return 'We hit an account setup issue. Please try again.';
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

  const passwordRef = useRef<any>(null);
  const confirmRef = useRef<any>(null);

  const passwordHint = useMemo(() => {
    if (!password) return 'Use at least 6 characters.';
    if (password.length < 6) return 'Password is too short.';
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
      titleMode="brandAnimated"
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
      {/* OAuth Buttons */}
      <View style={{ gap: s.sm }}>
        <AuthProviderButton
          provider="google"
          onPress={() => handleOAuthSignUp('google')}
          disabled={loading || !oauthAvailability.google}
          helperText={!oauthAvailability.google ? 'Google sign up is disabled in this environment.' : undefined}
        />
        <AuthProviderButton provider="apple" disabled />
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: `${c.primary}${theme.auth.dividerOpacity}` }]} />
        <Text style={[styles.dividerText, { color: c.textMuted, fontFamily: ty.body.family }]}>
          or continue with email
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: `${c.primary}${theme.auth.dividerOpacity}` }]} />
      </View>

      {/* Email */}
      <FloatingLabelInput
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        editable={!loading}
        accessibilityLabel="Email"
        accessibilityHint="Enter the email for your new account"
      />

      {/* Password */}
      <FloatingLabelInput
        ref={passwordRef}
        label="Password"
        placeholder="Create a strong password"
        value={password}
        onChangeText={setPassword}
        isPassword
        hint={passwordHint}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="nickname"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        editable={!loading}
        accessibilityLabel="Password"
        accessibilityHint="Create a password with at least six characters"
      />

      {/* Confirm Password */}
      <FloatingLabelInput
        ref={confirmRef}
        label="Confirm password"
        placeholder="Re-enter your password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        isPassword
        error={confirmError}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        textContentType="nickname"
        returnKeyType="done"
        onSubmitEditing={handleSignUp}
        editable={!loading}
        accessibilityLabel="Confirm password"
        accessibilityHint="Re-enter your password to confirm"
      />

      {/* Error / Success Messages */}
      {error ? (
        <MotiView
          from={{ opacity: 0, translateX: -8 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'spring', damping: 14 }}
          style={[styles.messageBox, { borderLeftColor: c.danger, backgroundColor: `${c.danger}12` }]}
        >
          <Text style={[styles.messageText, { color: c.danger, fontFamily: ty.body.family }]}>{error}</Text>
        </MotiView>
      ) : null}

      {!error && successMessage ? (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={[styles.messageBox, { borderLeftColor: c.success, backgroundColor: `${c.success}12` }]}
        >
          <Text style={[styles.messageText, { color: c.success, fontFamily: ty.body.family }]}>{successMessage}</Text>
        </MotiView>
      ) : null}

      {/* Primary CTA */}
      <ShimmerButton
        label="Create Account"
        onPress={handleSignUp}
        loading={loading}
        accessibilityHint="Creates your account and starts onboarding"
      />

      {/* Legal */}
      <View style={styles.legalRow}>
        <Text style={[styles.legalText, { color: c.textMuted, fontFamily: ty.body.family }]}>
          By continuing you agree to our{' '}
        </Text>
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
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  messageBox: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  legalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  legalText: {
    fontSize: 11,
    lineHeight: 18,
    opacity: 0.7,
  },
  legalLink: {
    fontSize: 11,
    lineHeight: 18,
  },
});
