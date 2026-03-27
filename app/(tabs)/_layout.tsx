import { Redirect, Tabs, useSegments, usePathname } from 'expo-router';
import { StyleSheet, View, Pressable, Platform, ActivityIndicator, Text, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { QuickAddSheet } from '../../components/sheets/QuickAddSheet';
import { trackQuickAddOpen } from '../../lib/analytics';
import { useAuth, checkOnboardingStatus } from '../../lib/auth';

const tabBarHeight = 84;

export default function TabLayout() {
  const { c } = useTokens();
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const isAiCoachTab = pathname.includes('ai-coach') || (segments as any[]).includes('ai-coach');

  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  const handleQuickAddPress = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await trackQuickAddOpen();
    setIsQuickAddOpen(true);
  }, []);

  const handleQuickAddClose = useCallback(() => {
    setIsQuickAddOpen(false);
  }, []);

  // Onboarding guard: redirect users who haven't completed onboarding
  useEffect(() => {
    let cancelled = false;

    async function guardOnboarding() {
      if (authLoading) {
        return;
      }

      if (!isAuthenticated || !user) {
        if (!cancelled) {
          setRedirectTo('/(auth)/sign-in');
          setIsCheckingOnboarding(false);
        }
        return;
      }

      try {
        const status = await checkOnboardingStatus(user.id);
        if (!cancelled && !status.hasCompletedOnboarding) {
          setRedirectTo('/(onboarding)/identity');
          setIsCheckingOnboarding(false);
          return;
        }
        if (!cancelled && status.hasCompletedOnboarding && !status.hasPlans) {
          setRedirectTo('/(onboarding)/plan-generation');
          setIsCheckingOnboarding(false);
          return;
        }
      } catch (error) {
        console.error('Onboarding guard error:', error);
        // If we can't verify, let them through (fail open for UX)
      }

      if (!cancelled) {
        setRedirectTo(null);
        setIsCheckingOnboarding(false);
      }
    }

    guardOnboarding();
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, user]);

  const activeTabSegment = segments[1];
  const activeNestedSegment = segments[2];
  const hideBottomTabChrome =
    (activeTabSegment === 'workout' && !!activeNestedSegment) ||
    (activeTabSegment === 'nutrition' && !!activeNestedSegment);

  useEffect(() => {
    if (hideBottomTabChrome && isQuickAddOpen) {
      setIsQuickAddOpen(false);
    }
  }, [hideBottomTabChrome, isQuickAddOpen]);

  // Show loading while checking onboarding status
  if (isCheckingOnboarding) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  if (redirectTo) {
    return <Redirect href={redirectTo as any} />;
  }


  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Tabs
        initialRouteName="home"
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: c.bg },
          tabBarActiveTintColor: c.primary,
          tabBarInactiveTintColor: c.textMuted,
          tabBarShowLabel: true,
          tabBarLabelPosition: 'below-icon',
          tabBarStyle: hideBottomTabChrome
            ? {
                display: 'none',
              }
            : {
                backgroundColor: c.surface,
                borderTopColor: c.border,
                borderTopWidth: 1,
                height: tabBarHeight,
                paddingBottom: insets.bottom + 4,
                paddingTop: 12,
                paddingHorizontal: 0,
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                elevation: 0,
              },
          tabBarLabelStyle: {
            fontFamily: 'Sora_500Medium',
            fontSize: 10,
            marginTop: 4,
            marginBottom: 0,
          },
          tabBarIconStyle: {
            marginTop: 0,
          },
          tabBarItemStyle: {
            paddingVertical: 4,
            gap: 2,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: 'Workout',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'barbell' : 'barbell-outline'} color={color} />
            ),
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              // Behave like a fresh navigation to the tab's root
              e.preventDefault();
              navigation.navigate('workout', { screen: 'index' });
            },
          })}
        />
        <Tabs.Screen
          name="nutrition"
          options={{
            title: 'Nutrition',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'nutrition' : 'nutrition-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'stats-chart' : 'stats-chart-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ai-coach"
          options={{
            title: 'AI Coach',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'sparkles' : 'sparkles-outline'} color={color} />
            ),
          }}
        />
      </Tabs>

      {!hideBottomTabChrome && !isAiCoachTab && (
        <View
          style={[
            styles.fabWrapper,
            {
              bottom: tabBarHeight + 5,
            }
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            style={[
              styles.fab,
              {
                backgroundColor: c.primary,
                borderColor: c.bg,
                borderWidth: 4,
                shadowColor: c.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 16,
              },
              Platform.OS === 'web' && {
                boxShadow: `0 0 20px ${c.primary}99, 0 0 40px ${c.primary}40`,
              } as any,
            ]}
            onPress={handleQuickAddPress}
            accessibilityLabel="Quick Add"
            accessibilityHint="Opens quick add menu to log food, water, weight, or start a workout"
            accessibilityRole="button"
          >
            <TabBarIcon name="add" color={c.bg} size={32} />
          </Pressable>
        </View>
      )}

      {/* Quick Add Bottom Sheet */}
      <QuickAddSheet
        isVisible={isQuickAddOpen}
        onClose={handleQuickAddClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fabSpacerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  fabWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
});
