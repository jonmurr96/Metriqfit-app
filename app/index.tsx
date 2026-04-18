import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { MotiView } from 'moti';
import { useAuth, checkOnboardingStatus, type OnboardingStatus } from '../lib/auth';
import { metriqfitTheme } from '../lib/theme';
import { BrandMark } from '../components/branding/BrandMark';

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
            hasSubscription: false,
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
        <MotiView
          from={{ opacity: 0.6, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500 }}
          style={{ marginBottom: 14 }}
        >
          <BrandMark size="sm" glow="soft" />
        </MotiView>
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

  // Authenticated and completed onboarding but no active plans yet.
  if (onboardingStatus && onboardingStatus.hasCompletedOnboarding && !onboardingStatus.hasPlans) {
    return <Redirect href="/(onboarding)/plan-generation" />;
  }

  // Plans generated but paywall not completed - must not skip to home.
  if (onboardingStatus && onboardingStatus.hasCompletedOnboarding && onboardingStatus.hasPlans && !onboardingStatus.hasSubscription) {
    return <Redirect href="/(onboarding)/paywall" />;
  }

  // Authenticated, onboarding complete, plans exist, paywall completed - go to main app.
  return <Redirect href="/(tabs)/home" />;
}
