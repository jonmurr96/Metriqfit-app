import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth, checkOnboardingStatus, type OnboardingStatus } from '../lib/auth';
import { metriqfitTheme } from '../lib/theme';

export default function IndexPage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      if (user && !authLoading) {
        setCheckingOnboarding(true);
        try {
          const status = await checkOnboardingStatus(user.id);
          setOnboardingStatus(status);
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          // If there's an error, assume onboarding is not complete
          setOnboardingStatus({
            hasCompletedOnboarding: false,
            hasTargets: false,
            hasPlans: false,
          });
        } finally {
          setCheckingOnboarding(false);
        }
      }
    }

    checkStatus();
  }, [user, authLoading]);

  // Show loading screen while checking auth or onboarding status
  if (authLoading || (isAuthenticated && checkingOnboarding)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: metriqfitTheme.colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={metriqfitTheme.colors.accent} />
      </View>
    );
  }

  // Not authenticated - redirect to sign in
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Authenticated but haven't completed onboarding
  if (onboardingStatus && !onboardingStatus.hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/identity" />;
  }

  // Authenticated and completed onboarding - go to main app
  return <Redirect href="/(tabs)/home" />;
}
