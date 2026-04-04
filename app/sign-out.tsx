/**
 * Sign Out Helper Screen
 * Signs out the user and redirects to sign in
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth';
import { metriqfitTheme } from '../lib/theme';

export default function SignOutScreen() {
  const { signOut, isAuthenticated } = useAuth();

  useEffect(() => {
    // Sign out when component mounts
    signOut();
  }, [signOut]);

  // If not authenticated, redirect to sign in
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Show loading while signing out
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={metriqfitTheme.colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: metriqfitTheme.colors.bg,
  },
});
