import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useTokens } from '../../../lib/theme';

export type WorkoutWeekDayItem = {
  dateText: string;
  label: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
  sessionType: 'workout' | 'rest' | 'active_recovery' | 'conditioning' | null;
  status: 'planned' | 'completed' | 'missed' | null;
  onPress: () => void;
};

type Props = {
  days: WorkoutWeekDayItem[];
};

export function WorkoutWeekStrip({ days }: Props) {
  const { c, s, ty } = useTokens();

  const getDotColor = (day: WorkoutWeekDayItem) => {
    if (day.sessionType !== 'workout') return c.border;
    if (day.status === 'completed') return c.success;
    if (day.status === 'missed') return c.error || '#ef4444';
    return c.primary;
  };

  return (
    <View style={{ paddingLeft: s.lg }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: s.lg, gap: 10 }}
      >
        {days.map((day) => {
          const dotColor = getDotColor(day);
          return (
            <Pressable
              key={day.dateText}
              onPress={day.onPress}
              style={{
                width: 56,
                height: 90,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: day.isSelected ? 0 : 1,
                borderColor: day.isSelected ? 'transparent' : dotColor,
                backgroundColor: day.isSelected ? c.primary : c.surface,
              }}
              accessibilityRole="button"
              accessibilityLabel={`${day.label} ${day.dayNumber}`}
              accessibilityHint="Open day preview for this date"
            >
              <Text
                style={{
                  color: day.isSelected ? c.bg : c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 10,
                  letterSpacing: 0.8,
                }}
              >
                {day.label.toUpperCase()}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  color: day.isSelected ? c.bg : c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: 22,
                }}
              >
                {day.dayNumber}
              </Text>
              {day.sessionType === 'workout' && !day.isSelected && (
                <View
                  style={{
                    marginTop: 6,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: dotColor,
                  }}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
