import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';

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
  if (lowered.includes('invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (lowered.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }
  if (lowered.includes('network')) {
    return 'Network issue detected. Check your connection and retry.';
  }
  return message;
};

export default function SignInScreen() {
  const { c, ty, s, theme } = useTokens();
  const { signIn, signInWithOAuth, oauthAvailability } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const passwordRef = useRef<TextInput>(null);

  const handleEmailPasswordSignIn = async () => {
    if (!email || !password) {
      setError('Please enter your email and password.');
      setSuccessMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error: signInError } = await signIn(email.trim(), password);
      if (signInError) {
        setError(normalizeError(signInError.message));
        return;
      }

      setSuccessMessage('Signed in successfully. Redirecting...');
      router.replace('/');
    } catch (err: any) {
      setError(normalizeError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
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
      setSuccessMessage('Redirecting to Google sign in...');
    }
    setLoading(false);
  };

  return (
    <AuthScreenShell
      title="Metriqfit"
      titleMode="brandAnimated"
      subtitle="Designed for you. Powered by AI."
      footer={
        <AuthFooterLinks
          prompt="New to MetriqFit?"
          actionLabel="Create account"
          href="/(auth)/sign-up"
          disabled={loading}
        />
      }
    >
      <View style={{ gap: s.sm }}>
        <AuthProviderButton
          provider="google"
          onPress={() => handleOAuthSignIn('google')}
          disabled={loading || !oauthAvailability.google}
          helperText={!oauthAvailability.google ? 'Google sign in is disabled in this environment.' : undefined}
        />

        <AuthProviderButton
          provider="apple"
          disabled
          helperText="Apple sign in is coming soon."
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
        accessibilityHint="Enter the email linked to your account"
      />

      <AuthPasswordField
        ref={passwordRef}
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={handleEmailPasswordSignIn}
        editable={!loading}
        accessibilityLabel="Password"
        accessibilityHint="Enter your account password"
      />

      <View style={styles.forgotRow}>
        <Link href={'/(auth)/forgot-password' as any} asChild>
          <Pressable disabled={loading} accessibilityRole="link" accessibilityLabel="Forgot password">
            <Text style={[styles.forgotText, { color: c.primary, fontFamily: ty.body.familySemibold }]}>Forgot password?</Text>
          </Pressable>
        </Link>
      </View>

      {error ? (
        <Text style={[styles.messageText, { color: c.danger, fontFamily: ty.body.family }]}>{error}</Text>
      ) : null}

      {!error && successMessage ? (
        <Text style={[styles.messageText, { color: c.success, fontFamily: ty.body.family }]}>{successMessage}</Text>
      ) : null}

      <AuthPrimaryButton
        label="Sign In"
        onPress={handleEmailPasswordSignIn}
        loading={loading}
        accessibilityHint="Signs in with your email and password"
      />
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
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontSize: 12,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
