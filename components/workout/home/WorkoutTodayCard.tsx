import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { useTokens } from '../../../lib/theme';
import { NextWorkoutCard } from '../NextWorkoutCard';
import { RestDayCard } from '../RestDayCard';

type TodayEntry = {
  plan_day_id: string | null;
  session_type: 'workout' | 'rest' | 'active_recovery' | 'conditioning';
  plan_day?: {
    name?: string | null;
    focus?: string | null;
    exercises?: { id: string }[];
  } | null;
} | null;

type Props = {
  loading: boolean;
  entry: TodayEntry;
  onOpenWorkoutDay: (dayId: string) => void;
  onOpenWeek: () => void;
};

export function WorkoutTodayCard({ loading, entry, onOpenWorkoutDay, onOpenWeek }: Props) {
  const { c, ty, s } = useTokens();

  if (loading) {
    return (
      <View style={{ paddingVertical: s.lg, alignItems: 'center' }}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (!entry) {
    return (
      <RestDayCard
        title="No Session Scheduled"
        subtitle="Open your workout week to review or adjust your schedule."
        onPress={onOpenWeek}
      />
    );
  }

  if (entry.session_type === 'workout') {
    const exerciseCount = entry.plan_day?.exercises?.length || 0;
    const durationMinutes = exerciseCount > 0 ? Math.max(35, exerciseCount * 7) : 45;
    const calories = Math.round(durationMinutes * 6.2);

    return (
      <View>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.sm,
            letterSpacing: 1.3,
            marginBottom: s.sm,
          }}
        >
          TODAY
        </Text>
        <NextWorkoutCard
          workoutName={entry.plan_day?.name || 'Workout'}
          workoutType={entry.plan_day?.focus || 'Scheduled session'}
          duration={durationMinutes}
          calories={calories}
          onPress={() => {
            if (entry.plan_day_id) {
              onOpenWorkoutDay(entry.plan_day_id);
              return;
            }
            onOpenWeek();
          }}
        />
      </View>
    );
  }

  const subtitle =
    entry.session_type === 'active_recovery'
      ? 'Mobility and low-intensity movement today.'
      : entry.session_type === 'conditioning'
        ? 'Conditioning focus today. Keep intensity controlled.'
        : 'Recovery, mobility, and hydration today.';

  return (
    <View>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.familySemibold,
          fontSize: ty.sizes.sm,
          letterSpacing: 1.3,
          marginBottom: s.sm,
        }}
      >
        TODAY
      </Text>
      <RestDayCard
        title={entry.session_type === 'conditioning' ? 'Conditioning Day' : entry.session_type === 'active_recovery' ? 'Active Recovery' : 'Rest Day'}
        subtitle={subtitle}
        onPress={onOpenWeek}
      />
    </View>
  );
}
