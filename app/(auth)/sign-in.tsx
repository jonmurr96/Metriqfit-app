import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, type Href, router } from 'expo-router';
import { MotiView } from 'moti';
import { useSignIn, useOAuth } from '@clerk/expo';

import { useTokens } from '../../lib/theme';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { FloatingLabelInput } from '../../components/auth/FloatingLabelInput';
import { ShimmerButton } from '../../components/auth/ShimmerButton';
import { AuthProviderButton } from '../../components/auth/AuthProviderButton';
import { AuthFooterLinks } from '../../components/auth/AuthFooterLinks';

const normalizeError = (message?: string): string => {
  if (!message) return 'Something went wrong. Please try again.';
  const lowered = message.toLowerCase();
  if (lowered.includes('invalid') || lowered.includes('credentials') || lowered.includes('password')) {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (lowered.includes('not found') || lowered.includes('no account')) {
    return 'No account found with this email. Please sign up.';
  }
  if (lowered.includes('network')) {
    return 'Network issue detected. Check your connection and retry.';
  }
  return message;
};

export default function SignInScreen() {
  const { c, ty, s, theme } = useTokens();
  const { signIn, fetchStatus } = useSignIn();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const passwordRef = useRef<any>(null);

  const isBusy = loading || fetchStatus === 'fetching';

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
      const { error: signInError } = await signIn.password({
        emailAddress: email.trim(),
        password,
      });

      if (signInError) {
        setError(normalizeError(signInError.message));
        return;
      }

      setSuccessMessage('Signed in successfully. Redirecting...');

      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl('/');
          router.replace(url as Href);
        },
      });
    } catch (err: any) {
      setError(normalizeError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { createdSessionId, setActive } = await startGoogleOAuth();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/');
      }
    } catch (err: any) {
      setError(normalizeError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { createdSessionId, setActive } = await startAppleOAuth();
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/');
      }
    } catch (err: any) {
      setError(normalizeError(err?.message));
    } finally {
      setLoading(false);
    }
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
          disabled={isBusy}
        />
      }
    >
      {/* OAuth Buttons */}
      <View style={{ gap: s.sm }}>
        <AuthProviderButton
          provider="google"
          onPress={handleGoogleSignIn}
          disabled={isBusy}
        />
        <AuthProviderButton
          provider="apple"
          onPress={handleAppleSignIn}
          disabled={isBusy}
        />
      </View>

      {/* Divider */}
      <View className="flex-row items-center gap-3 my-1">
        <View
          className="flex-1"
          style={{ height: StyleSheet.hairlineWidth, backgroundColor: `${c.primary}${theme.auth.dividerOpacity}` }}
        />
        <Text
          className="text-[11px] text-center uppercase"
          style={{ letterSpacing: 0.5, color: c.textMuted, fontFamily: ty.body.family }}
        >
          or continue with email
        </Text>
        <View
          className="flex-1"
          style={{ height: StyleSheet.hairlineWidth, backgroundColor: `${c.primary}${theme.auth.dividerOpacity}` }}
        />
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
        editable={!isBusy}
        accessibilityLabel="Email"
        accessibilityHint="Enter the email linked to your account"
      />

      {/* Password with inline Forgot link */}
      <View>
        <FloatingLabelInput
          ref={passwordRef}
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          isPassword
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleEmailPasswordSignIn}
          editable={!isBusy}
          accessibilityLabel="Password"
          accessibilityHint="Enter your account password"
        />
        <Link href={'/(auth)/forgot-password' as any} asChild>
          <Pressable
            disabled={isBusy}
            accessibilityRole="link"
            accessibilityLabel="Forgot password"
            className="self-end mt-2 px-1"
          >
            <Text
              className="text-[13px]"
              style={{ color: c.primary, fontFamily: ty.body.familySemibold }}
            >
              Forgot password?
            </Text>
          </Pressable>
        </Link>
      </View>

      {/* Error / Success Messages */}
      {error ? (
        <MotiView
          from={{ opacity: 0, translateX: -8 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'spring', damping: 14 }}
          style={{
            borderLeftWidth: 3,
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderLeftColor: c.danger,
            backgroundColor: `${c.danger}12`,
          }}
        >
          <Text
            className="text-[13px] leading-[18px]"
            style={{ color: c.danger, fontFamily: ty.body.family }}
          >
            {error}
          </Text>
        </MotiView>
      ) : null}

      {!error && successMessage ? (
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            borderLeftWidth: 3,
            borderRadius: 8,
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderLeftColor: c.success,
            backgroundColor: `${c.success}12`,
          }}
        >
          <Text
            className="text-[13px] leading-[18px]"
            style={{ color: c.success, fontFamily: ty.body.family }}
          >
            {successMessage}
          </Text>
        </MotiView>
      ) : null}

      {/* Primary CTA */}
      <ShimmerButton
        label="Sign In"
        onPress={handleEmailPasswordSignIn}
        loading={isBusy}
        accessibilityHint="Signs in with your email and password"
      />
    </AuthScreenShell>
  );
}
