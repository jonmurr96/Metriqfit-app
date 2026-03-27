import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

import { ThemeProvider, createMetriqfitTheme } from '../lib/theme';
import { AuthProvider, useAuth } from '../lib/auth';
import { initAnalytics, setUserId, setUserProperties } from '../lib/analytics';
import { queryClient } from '../lib/queryClient';
import { GlobalGamificationToasts } from '../components/gamification/GlobalGamificationToasts';
import { useNotifications } from '../hooks/useNotifications';
import { useProfile } from '../hooks/useUser';

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
      goal_type: profile?.goal_type ?? null,
    });
  }, [profile?.goal_type, profile?.unit_system, user?.email]);

  return (
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
      </Stack>
      <GlobalGamificationToasts />
    </ThemeProvider>
  );
}

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

  useEffect(() => {
    // Initialize analytics
    initAnalytics();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
