import { useEffect, useState, useCallback } from 'react';
import { Stack, router } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { metriqfitTheme } from '../../lib/theme';
import { OnboardingProvider, type OnboardingData } from '../../lib/onboarding';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

const { colors: c } = metriqfitTheme;

const STEP_NAMES = [
  'identity',
  'about-you',
  'height',
  'weight',
  'goals',
  'training',
  'nutrition',
];

/**
 * Onboarding Layout - Auth Guard
 * 
 * Ensures users must be authenticated to access any onboarding screen.
 * Prevents foreign key errors by ensuring only valid auth.users can proceed.
 */
export default function OnboardingLayout() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [initialAnswers, setInitialAnswers] = useState<OnboardingData | null>(null);
  const [initialStep, setInitialStep] = useState<number>(1);
  const [loadingAnswers, setLoadingAnswers] = useState(true);

  useEffect(() => {
    // Redirect to sign-in if not authenticated
    if (!authLoading && !isAuthenticated) {
      console.log('[OnboardingLayout] User not authenticated, redirecting to sign-in');
      router.replace('/(auth)/sign-in');
    }
  }, [isAuthenticated, authLoading]);

  // Load existing answers on mount if user exists
  useEffect(() => {
    let active = true;
    async function loadAnswers() {
      if (!user?.id) {
        setLoadingAnswers(false);
        return;
      }
      try {
        const { data: row, error } = await supabase
          .from('onboarding_answers')
          .select('answers')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[OnboardingLayout] Error fetching initial answers:', error);
        } else if (row?.answers && active) {
          const savedAnswers = row.answers as OnboardingData;
          setInitialAnswers(savedAnswers);

          const lastStep = (savedAnswers as any)?._last_step;
          if (lastStep) {
            const stepIndex = STEP_NAMES.indexOf(lastStep) + 1;
            if (stepIndex >= 1 && stepIndex <= 7) {
              setInitialStep(stepIndex);
            }
          }
        }
      } catch (err) {
        console.error('[OnboardingLayout] Unexpected error fetching initial answers:', err);
      } finally {
        if (active) {
          setLoadingAnswers(false);
        }
      }
    }

    if (isAuthenticated && user?.id) {
      loadAnswers();
    } else if (!authLoading && !isAuthenticated) {
      setLoadingAnswers(false);
    }
    return () => {
      active = false;
    };
  }, [user?.id, isAuthenticated, authLoading]);

  const handlePersistProgress = useCallback(async (data: OnboardingData, stepIndex: number) => {
    if (!user?.id) return;
    const nextStepName = STEP_NAMES[stepIndex - 1] || null;

    try {
      const { error } = await supabase
        .from('onboarding_answers')
        .upsert({
          user_id: user.id,
          answers: {
            ...data,
            _last_step: nextStepName,
          } as any,
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('[OnboardingLayout] Error persisting progress:', error);
      } else {
        console.log(`[OnboardingLayout] Progress persisted at step ${stepIndex} (${nextStepName})`);
      }
    } catch (err) {
      console.error('[OnboardingLayout] Unexpected error persisting progress:', err);
    }
  }, [user?.id]);

  // Show loading while checking auth or loading answers
  if (authLoading || (isAuthenticated && loadingAnswers)) {
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
    <OnboardingProvider
      initialAnswers={initialAnswers}
      initialStep={initialStep}
      onPersistProgress={handlePersistProgress}
    >
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
