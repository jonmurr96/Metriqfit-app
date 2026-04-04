import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '../../lib/auth';
import { useTokens } from '../../lib/theme';
import { AuthScreenShell } from '../../components/auth/AuthScreenShell';
import { AuthTextField } from '../../components/auth/AuthTextField';
import { AuthPrimaryButton } from '../../components/auth/AuthPrimaryButton';
import { AuthFooterLinks } from '../../components/auth/AuthFooterLinks';

const normalizeError = (message?: string): string => {
  if (!message) {
    return 'Unable to send reset email right now. Please try again.';
  }

  const lowered = message.toLowerCase();
  if (lowered.includes('invalid')) {
    return 'Please enter a valid email address.';
  }
  if (lowered.includes('network')) {
    return 'Network issue detected. Check your connection and retry.';
  }
  return message;
};

export default function ForgotPasswordScreen() {
  const { c, ty } = useTokens();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldownSeconds((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSendReset = async () => {
    if (!email) {
      setError('Please enter your account email.');
      setSuccessMessage('');
      return;
    }

    if (cooldownSeconds > 0) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error: resetError } = await resetPassword(email.trim());
      if (resetError) {
        setError(normalizeError(resetError.message));
        return;
      }

      setSuccessMessage('Reset instructions sent. Check your email inbox.');
      setCooldownSeconds(30);
    } catch (err: any) {
      setError(normalizeError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenShell
      title="Reset password"
      subtitle="We will send a secure reset link to your account email."
      footer={<AuthFooterLinks prompt="Remembered your password?" actionLabel="Back to sign in" href="/(auth)/sign-in" disabled={loading} />}
    >
      <AuthTextField
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="oneTimeCode"
        autoComplete="email"
        returnKeyType="send"
        onSubmitEditing={handleSendReset}
        editable={!loading}
        accessibilityLabel="Email"
        accessibilityHint="Enter the email for your password reset"
      />

      {error ? <Text style={[styles.messageText, { color: c.danger, fontFamily: ty.body.family }]}>{error}</Text> : null}
      {!error && successMessage ? <Text style={[styles.messageText, { color: c.success, fontFamily: ty.body.family }]}>{successMessage}</Text> : null}

      <AuthPrimaryButton
        label={cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Send Reset Link'}
        onPress={handleSendReset}
        loading={loading}
        disabled={cooldownSeconds > 0}
        accessibilityHint="Sends a password reset email"
      />

      <Pressable onPress={() => router.replace('/(auth)/sign-in')} accessibilityRole="button" accessibilityLabel="Cancel reset">
        <Text style={[styles.cancelText, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>Cancel and return to sign in</Text>
      </Pressable>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  cancelText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
});
