import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { metriqfitTheme } from '../../lib/theme';
import { OnboardingProvider } from '../../lib/onboarding';
import { useAuth } from '../../lib/auth';

const { colors: c } = metriqfitTheme;

/**
 * Onboarding Layout - Auth Guard
 * 
 * Ensures users must be authenticated to access any onboarding screen.
 * Prevents foreign key errors by ensuring only valid auth.users can proceed.
 */
export default function OnboardingLayout() {
  const { isAuthenticated, loading, user } = useAuth();

  useEffect(() => {
    // Redirect to sign-in if not authenticated
    if (!loading && !isAuthenticated) {
      console.log('[OnboardingLayout] User not authenticated, redirecting to sign-in');
      router.replace('/(auth)/sign-in');
    }
  }, [isAuthenticated, loading]);

  // Show loading while checking auth
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  // Don't render onboarding screens if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: metriqfitTheme.colors.bg },
          animation: 'slide_from_right',
        }}
      />
    </OnboardingProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
