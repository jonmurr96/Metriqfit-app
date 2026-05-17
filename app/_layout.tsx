import '../global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, Pressable, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { useFonts } from 'expo-font';
import {
  Unbounded_500Medium,
  Unbounded_600SemiBold,
  Unbounded_700Bold,
} from '@expo-google-fonts/unbounded';
import {
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
} from '@expo-google-fonts/sora';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary as GlobalErrorBoundary } from '@sentry/react-native';

import { ThemeProvider, createMetriqfitTheme } from '../lib/theme';
import { AuthProvider, useAuth } from '../lib/auth';
import { initAnalytics, setUserId, setUserProperties } from '../lib/analytics';
import { queryClient } from '../lib/queryClient';
import { GlobalGamificationToasts } from '../components/gamification/GlobalGamificationToasts';
import { IntroScreen } from '../components/intro/IntroScreen';
import { useNotifications } from '../hooks/useNotifications';
import { useOnboardingAnswers, useProfile } from '../hooks/useUser';
import { initSentry, setSentryUserContext } from '../lib/sentry';

initSentry();

const SUPPRESSED_DEV_WARNING_PREFIXES = [
  'SafeAreaView has been deprecated and will be removed in a future release.',
  '[expo-av]: Expo AV has been deprecated and will be removed in SDK 54.',
];

LogBox.ignoreLogs(SUPPRESSED_DEV_WARNING_PREFIXES);

if (__DEV__) {
  LogBox.ignoreAllLogs();

  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const firstArg = typeof args[0] === 'string' ? args[0] : '';
    if (SUPPRESSED_DEV_WARNING_PREFIXES.some((prefix) => firstArg.startsWith(prefix))) {
      return;
    }
    originalWarn(...args);
  };
}

// Inner component that can use auth context
function AppContent() {
  useNotifications();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const onboardingPayload = onboardingAnswers?.answers && typeof onboardingAnswers.answers === 'object'
    ? onboardingAnswers.answers as Record<string, unknown>
    : {};

  const runtimeTheme = createMetriqfitTheme({
    highContrast: profile?.display_preferences?.highContrast,
    reduceMotion: profile?.display_preferences?.reduceMotion,
  });

  useEffect(() => {
    setUserId(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    setUserProperties({
      email: user?.email ?? null,
      unit_system: profile?.unit_system ?? null,
      goal_type: typeof onboardingPayload.goal_type === 'string' ? onboardingPayload.goal_type : null,
    });
    setSentryUserContext({
      userId: user?.id ?? null,
      email: user?.email ?? null,
      unitSystem: profile?.unit_system ?? null,
      goalType: typeof onboardingPayload.goal_type === 'string' ? onboardingPayload.goal_type : null,
      appEnv: process.env.EXPO_PUBLIC_APP_ENV || 'local',
    });
  }, [onboardingPayload.goal_type, profile?.unit_system, user?.email, user?.id]);

  return (
    <GlobalErrorBoundary
      includeUnhandledRejections
      fallback={({ error, resetError }: any) => (
        <ThemeProvider value={runtimeTheme}>
          <View style={{ flex: 1, backgroundColor: runtimeTheme.colors.bg, justifyContent: 'center', padding: 24 }}>
            <Text style={{ color: runtimeTheme.colors.text, fontSize: 28, fontFamily: 'Sora_600SemiBold' }}>
              Something broke
            </Text>
            <Text style={{ color: runtimeTheme.colors.textMuted, marginTop: 12, lineHeight: 20 }}>
              {error instanceof Error ? error.message : 'MetriqFit hit an unexpected error.'}
            </Text>
            <Pressable
              onPress={resetError}
              style={{
                marginTop: 20,
                alignSelf: 'flex-start',
                backgroundColor: runtimeTheme.colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: runtimeTheme.colors.bg, fontFamily: 'Sora_600SemiBold' }}>
                Try again
              </Text>
            </Pressable>
          </View>
        </ThemeProvider>
      )}
    >
      <ThemeProvider value={runtimeTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: runtimeTheme.colors.bg },
            animation: profile?.display_preferences?.reduceMotion ? 'none' : 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="log-weight-sheet"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="log-water-sheet"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="log-steps-sheet"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="set-weight-goal-sheet"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
        <GlobalGamificationToasts />
      </ThemeProvider>
    </GlobalErrorBoundary>
  );
}

const INTRO_SEEN_KEY = 'metriqfit_intro_seen';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_500Medium,
    Unbounded_600SemiBold,
    Unbounded_700Bold,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
  });

  const [introChecked, setIntroChecked] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    // Initialize analytics
    initAnalytics();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(INTRO_SEEN_KEY).then((seen) => {
      setShowIntro(!seen);
      setIntroChecked(true);
    });
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && introChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, introChecked]);

  if ((!fontsLoaded && !fontError) || !introChecked) {
    return null;
  }

  if (showIntro) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <IntroScreen
          onComplete={() => {
            AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
            setShowIntro(false);
          }}
        />
      </GestureHandlerRootView>
    );
  }

  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ClerkProvider>
  );
}
