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
            hasCompletedPaywall: false,
            lastOnboardingStep: null,
          });
        } finally {
          setCheckingOnboarding(false);
        }
      } else if (!authLoading) {
        setOnboardingStatus(null);
        setCheckingOnboarding(false);
      }
    }

    checkStatus();
  }, [user, authLoading]);

  // Show loading screen while checking auth or onboarding status.
  // Also block rendering when status is still null (effect hasn't resolved yet)
  // to prevent the fall-through-to-home race on the first render after auth.
  if (authLoading || (isAuthenticated && (checkingOnboarding || !onboardingStatus))) {
    return (
      <View className="flex-1 justify-center items-center bg-[#03060D]">
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

  // Mid-onboarding: resume to the last step the user reached.
  if (onboardingStatus && !onboardingStatus.hasCompletedOnboarding) {
    const step = onboardingStatus.lastOnboardingStep;
    const validSteps = ['about-you', 'height', 'weight', 'goals', 'training', 'nutrition'];
    if (step && validSteps.includes(step)) {
      return <Redirect href={`/(onboarding)/${step}` as any} />;
    }
    return <Redirect href="/(onboarding)/identity" />;
  }

  // Completed questionnaire but plans not yet generated.
  if (onboardingStatus && onboardingStatus.hasCompletedOnboarding && !onboardingStatus.hasPlans) {
    return <Redirect href="/(onboarding)/plan-generation" />;
  }

  // Plans exist but paywall not completed — resume at plan-review (its Continue routes to paywall).
  if (onboardingStatus && onboardingStatus.hasCompletedOnboarding && onboardingStatus.hasPlans && !onboardingStatus.hasCompletedPaywall) {
    return <Redirect href="/(onboarding)/plan-review" />;
  }

  // All complete — go to main app.
  return <Redirect href="/(tabs)/home" />;
}
