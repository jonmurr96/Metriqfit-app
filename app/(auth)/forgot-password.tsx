import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useSignIn } from '@clerk/expo';

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
  if (lowered.includes('invalid') || lowered.includes('not found')) {
    return 'No account found with that email address.';
  }
  if (lowered.includes('network')) {
    return 'Network issue detected. Check your connection and retry.';
  }
  return message;
};

export default function ForgotPasswordScreen() {
  const { c, ty } = useTokens();
  const { signIn, fetchStatus } = useSignIn();

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const isBusy = loading || fetchStatus === 'fetching';

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSendCode = async () => {
    if (!email) {
      setError('Please enter your account email.');
      setSuccessMessage('');
      return;
    }
    if (cooldownSeconds > 0) return;

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // Request a password-reset email code using the underlying SignIn resource.
      // The new SignInFuture API delegates to the classic resource for strategies
      // not yet exposed on the simplified surface.
      const resource = (signIn as any)._resource ?? signIn;
      await resource.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });

      setSuccessMessage('Reset code sent. Check your inbox.');
      setCooldownSeconds(30);
      setStep('reset');
    } catch (err: any) {
      setError(normalizeError(err?.message ?? err?.errors?.[0]?.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code) {
      setError('Please enter the verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const resource = (signIn as any)._resource ?? signIn;
      const result = await resource.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password: newPassword,
      });

      if (result.status === 'complete') {
        setSuccessMessage('Password reset successfully. Redirecting to sign in...');
        setTimeout(() => router.replace('/(auth)/sign-in'), 1500);
      }
    } catch (err: any) {
      setError(normalizeError(err?.message ?? err?.errors?.[0]?.message));
    } finally {
      setLoading(false);
    }
  };

  // — Reset step (enter code + new password) —
  if (step === 'reset') {
    return (
      <AuthScreenShell
        title="Reset your password"
        subtitle={`Enter the code sent to ${email} and choose a new password.`}
        footer={
          <AuthFooterLinks
            prompt="Remembered your password?"
            actionLabel="Back to sign in"
            href="/(auth)/sign-in"
            disabled={isBusy}
          />
        }
      >
        <AuthTextField
          label="Verification code"
          placeholder="Enter the code from your email"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          returnKeyType="next"
          editable={!isBusy}
          accessibilityLabel="Verification code"
          accessibilityHint="Enter the reset code from your email"
        />

        <AuthTextField
          label="New password"
          placeholder="Create a new password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={handleResetPassword}
          editable={!isBusy}
          accessibilityLabel="New password"
          accessibilityHint="Enter your new password"
        />

        {error ? (
          <Text style={[styles.messageText, { color: c.danger, fontFamily: ty.body.family }]}>{error}</Text>
        ) : null}
        {!error && successMessage ? (
          <Text style={[styles.messageText, { color: c.success, fontFamily: ty.body.family }]}>{successMessage}</Text>
        ) : null}

        <AuthPrimaryButton
          label="Set New Password"
          onPress={handleResetPassword}
          loading={isBusy}
          accessibilityHint="Sets your new password"
        />

        <Pressable
          onPress={() => { setStep('email'); setError(''); setSuccessMessage(''); }}
          disabled={isBusy}
          accessibilityRole="button"
          style={styles.secondaryAction}
        >
          <Text style={[styles.secondaryText, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>
            Use a different email
          </Text>
        </Pressable>

        <Pressable
          onPress={handleSendCode}
          disabled={isBusy || cooldownSeconds > 0}
          accessibilityRole="button"
          style={styles.secondaryAction}
        >
          <Text style={[styles.secondaryText, { color: c.primary, fontFamily: ty.body.familySemibold }]}>
            {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend code'}
          </Text>
        </Pressable>
      </AuthScreenShell>
    );
  }

  // — Email step —
  return (
    <AuthScreenShell
      title="Reset password"
      subtitle="We will send a secure reset code to your account email."
      footer={
        <AuthFooterLinks
          prompt="Remembered your password?"
          actionLabel="Back to sign in"
          href="/(auth)/sign-in"
          disabled={isBusy}
        />
      }
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
        onSubmitEditing={handleSendCode}
        editable={!isBusy}
        accessibilityLabel="Email"
        accessibilityHint="Enter the email for your password reset"
      />

      {error ? (
        <Text style={[styles.messageText, { color: c.danger, fontFamily: ty.body.family }]}>{error}</Text>
      ) : null}
      {!error && successMessage ? (
        <Text style={[styles.messageText, { color: c.success, fontFamily: ty.body.family }]}>{successMessage}</Text>
      ) : null}

      <AuthPrimaryButton
        label={cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Send Reset Code'}
        onPress={handleSendCode}
        loading={isBusy}
        disabled={cooldownSeconds > 0}
        accessibilityHint="Sends a password reset code to your email"
      />

      <Pressable
        onPress={() => router.replace('/(auth)/sign-in')}
        accessibilityRole="button"
        accessibilityLabel="Cancel reset"
        style={styles.secondaryAction}
      >
        <Text style={[styles.secondaryText, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>
          Cancel and return to sign in
        </Text>
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
  secondaryAction: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  secondaryText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
