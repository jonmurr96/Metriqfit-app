/**
 * StreakCounter Component
 * Displays user's highest current streak as a badge
 * Appears in Home header next to greeting
 */

import React from 'react';
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTokens } from '../../lib/theme';
import { useHighestStreak } from '../../hooks/useGamification';

export function StreakCounter() {
  const { c, s, ty } = useTokens();
  const router = useRouter();
  const { data: highestStreak, isLoading, isError } = useHighestStreak();

  const handlePress = () => {
    router.push('/streaks');
  };

  // Don't show anything if error or still loading
  if (isError || isLoading) {
    return null;
  }

  // Don't show if no data
  if (!highestStreak) {
    return null;
  }

  const { currentStreak } = highestStreak;

  // Don't show if no streak
  if (currentStreak === 0) {
    return null;
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? c.surfaceActive : c.surfaceSubtle,
          borderColor: c.primary,
          borderWidth: 1.5,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name="flame" size={18} color={c.primary} />
      <Text
        style={{
          color: c.text,
          fontFamily: ty.body.familyBold,
          fontSize: ty.sizes.sm,
          marginLeft: s.xs,
        }}
      >
        {currentStreak}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 56,
    justifyContent: 'center',
  },
});
