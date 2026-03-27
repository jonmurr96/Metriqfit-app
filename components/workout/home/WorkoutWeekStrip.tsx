import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useTokens } from '../../../lib/theme';
import type {
  WorkoutCalendarScheduleStatus,
  WorkoutCalendarSessionType,
  WorkoutCalendarStatus,
} from '../../../lib/workout/calendar-status';

export type WorkoutWeekDayItem = {
  dateText: string;
  label: string;
  dayNumber: number;
  isToday: boolean;
  isSelected: boolean;
  sessionType: WorkoutCalendarSessionType | null;
  scheduleStatus: WorkoutCalendarScheduleStatus | null;
  calendarStatus: WorkoutCalendarStatus;
  isWorkoutExpected: boolean;
  onPress: () => void;
};

type Props = {
  days: WorkoutWeekDayItem[];
};

export function WorkoutWeekStrip({ days }: Props) {
  const { c, s, ty } = useTokens();

  const getStatusColor = (day: WorkoutWeekDayItem) => {
    if (day.calendarStatus === 'completed' || day.calendarStatus === 'rest') return c.success;
    if (day.calendarStatus === 'missed') return c.error || '#ef4444';
    if (day.calendarStatus === 'scheduled_future') return c.border;
    if (day.calendarStatus === 'rescheduled') return c.textMuted;
    return c.border;
  };

  const getInnerBackground = (day: WorkoutWeekDayItem) => {
    if (day.isSelected) return c.opacity.primaryMedium;
    if (day.calendarStatus === 'rest') return c.opacity.successLight;
    return c.surface;
  };

  return (
    <View style={{ paddingLeft: s.lg }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: s.lg, gap: 10 }}
      >
        {days.map((day) => {
          const statusColor = getStatusColor(day);
          const innerBackgroundColor = getInnerBackground(day);
          return (
            <Pressable
              key={day.dateText}
              onPress={day.onPress}
              style={{
                width: 58,
                height: 92,
                borderRadius: 29,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: statusColor,
                backgroundColor: 'transparent',
                padding: 2,
              }}
              accessibilityRole="button"
              accessibilityLabel={`${day.label} ${day.dayNumber}`}
              accessibilityHint="Open day preview for this date"
            >
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 26,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: innerBackgroundColor,
                  borderWidth: day.isToday ? 1 : 0,
                  borderColor: day.isToday ? c.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: day.isSelected ? c.text : c.textMuted,
                    fontFamily: ty.body.familySemibold,
                    fontSize: 10,
                    letterSpacing: 0.8,
                  }}
                >
                  {day.label.toUpperCase()}
                </Text>
                <View
                  style={{
                    marginTop: 4,
                    width: 40,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: day.isSelected ? c.opacity.primaryLight : 'transparent',
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: c.text,
                      fontFamily: ty.heading.familySemibold,
                      fontSize: 22,
                      lineHeight: 24,
                      textAlign: 'center',
                    }}
                  >
                    {day.dayNumber}
                  </Text>
                </View>
                {day.isWorkoutExpected && (
                  <View
                    style={{
                      marginTop: 6,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor:
                        day.calendarStatus === 'scheduled_future'
                          ? c.primary
                          : day.calendarStatus === 'missed'
                            ? c.error || '#ef4444'
                            : statusColor,
                    }}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
