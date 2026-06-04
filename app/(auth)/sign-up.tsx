import { useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { type Href, router } from 'expo-router';
import { MotiView } from 'moti';
import { useSignUp, useOAuth } from '@clerk/expo';

import { useTokens } from '../../lib/theme';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { FloatingLabelInput } from '../../components/auth/FloatingLabelInput';
import { ShimmerButton } from '../../components/auth/ShimmerButton';
import { AuthProviderButton } from '../../components/auth/AuthProviderButton';
import { AuthFooterLinks } from '../../components/auth/AuthFooterLinks';

const normalizeError = (message?: string): string => {
  if (!message) return 'Something went wrong. Please try again.';
  const lowered = message.toLowerCase();
  if (lowered.includes('already registered') || lowered.includes('already exists') || lowered.includes('taken')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (lowered.includes('password')) {
    return 'Password does not meet requirements. Use at least 8 characters.';
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
  const { signUp, fetchStatus } = useSignUp();
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleOAuth } = useOAuth({ strategy: 'oauth_apple' });

  const [step, setStep] = useState<'credentials' | 'verification'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const passwordRef = useRef<any>(null);
  const confirmRef = useRef<any>(null);

  const isBusy = loading || fetchStatus === 'fetching';

  const passwordHint = useMemo(() => {
    if (!password) return 'Use at least 8 characters.';
    if (password.length < 8) return 'Password is too short.';
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      setSuccessMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error: signUpError } = await signUp.password({
        emailAddress: email.trim(),
        password,
      });

      if (signUpError) {
        setError(normalizeError(signUpError.message));
        return;
      }

      const { error: emailError } = await signUp.verifications.sendEmailCode();
      if (emailError) {
        setError(normalizeError(emailError.message));
        return;
      }

      setSuccessMessage(`Verification code sent to ${email.trim()}`);
      setStep('verification');
    } catch (err: any) {
      setError(normalizeError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({
        code: verificationCode.trim(),
      });

      if (verifyError) {
        setError(normalizeError(verifyError.message));
        return;
      }

      if (signUp.status === 'complete') {
        await signUp.finalize({
          navigate: ({ decorateUrl }) => {
            const url = decorateUrl('/(onboarding)/identity');
            router.replace(url as Href);
          },
        });
      }
    } catch (err: any) {
      setError(normalizeError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const { error: resendError } = await signUp.verifications.sendEmailCode();
      if (resendError) {
        setError(normalizeError(resendError.message));
      } else {
        setSuccessMessage('New code sent. Check your inbox.');
      }
    } catch (err: any) {
      setError(normalizeError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
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

  const handleAppleSignUp = async () => {
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

  // — Verification step UI —
  if (step === 'verification') {
    return (
      <AuthScreenShell
        title="Check your email"
        subtitle={`We sent a 6-digit code to ${email}. Enter it below to confirm your account.`}
        footer={
          <AuthFooterLinks
            prompt="Already have an account?"
            actionLabel="Sign in"
            href="/(auth)/sign-in"
            disabled={isBusy}
          />
        }
      >
        <FloatingLabelInput
          label="Verification code"
          placeholder="Enter 6-digit code"
          value={verificationCode}
          onChangeText={setVerificationCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          returnKeyType="go"
          onSubmitEditing={handleVerify}
          editable={!isBusy}
          accessibilityLabel="Verification code"
          accessibilityHint="Enter the 6-digit code from your email"
        />

        {successMessage ? (
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

        <ShimmerButton
          label="Verify & Continue"
          onPress={handleVerify}
          loading={isBusy}
          accessibilityHint="Verifies your email and completes account creation"
        />

        <Pressable
          onPress={handleResendCode}
          disabled={isBusy}
          accessibilityRole="button"
          accessibilityLabel="Resend verification code"
          className="self-center py-2 px-1"
        >
          <Text
            className="text-[13px] text-center"
            style={{ color: c.primary, fontFamily: ty.body.familySemibold }}
          >
            Resend code
          </Text>
        </Pressable>

        <Pressable
          onPress={() => { setStep('credentials'); setError(''); setSuccessMessage(''); }}
          disabled={isBusy}
          accessibilityRole="button"
          className="self-center py-2 px-1"
        >
          <Text
            className="text-[13px] text-center"
            style={{ color: c.textMuted, fontFamily: ty.body.family }}
          >
            Use a different email
          </Text>
        </Pressable>
      </AuthScreenShell>
    );
  }

  // — Credentials step UI —
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
          disabled={isBusy}
        />
      }
    >
      {/* OAuth Buttons */}
      <View style={{ gap: s.sm }}>
        <AuthProviderButton
          provider="google"
          onPress={handleGoogleSignUp}
          disabled={isBusy}
        />
        <AuthProviderButton
          provider="apple"
          onPress={handleAppleSignUp}
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
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        onSubmitEditing={() => confirmRef.current?.focus()}
        editable={!isBusy}
        accessibilityLabel="Password"
        accessibilityHint="Create a password with at least eight characters"
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
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSignUp}
        editable={!isBusy}
        accessibilityLabel="Confirm password"
        accessibilityHint="Re-enter your password to confirm"
      />

      {/* Legal */}
      <Text
        className="text-[11px] leading-4 text-center"
        style={{ color: c.textMuted, fontFamily: ty.body.family }}
      >
        By signing up you agree to our{' '}
        <Text
          style={{ color: c.primary }}
          onPress={() => openLegalLink('https://metriqfit.com/terms')}
        >
          Terms
        </Text>
        {' '}and{' '}
        <Text
          style={{ color: c.primary }}
          onPress={() => openLegalLink('https://metriqfit.com/privacy')}
        >
          Privacy Policy
        </Text>
        .
      </Text>

      {/* Error / Success */}
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

      {/* Required for Clerk bot-protection */}
      <View nativeID="clerk-captcha" />

      <ShimmerButton
        label="Create Account"
        onPress={handleSignUp}
        loading={isBusy}
        accessibilityHint="Creates your MetriqFit account"
      />
    </AuthScreenShell>
  );
}
