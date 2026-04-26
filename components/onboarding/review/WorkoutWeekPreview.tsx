import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../../lib/theme';
import type { WorkoutScheduleEntry } from '../../../services/planService';

interface WorkoutWeekPreviewProps {
  schedule: WorkoutScheduleEntry[];
  exercisesByPlanDayId: Map<string, any[]>;
}

function formatDateLabel(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function repsLabel(exercise: any) {
  const min = Number(exercise?.reps_min || 0);
  const max = Number(exercise?.reps_max || 0);
  if (min && max && min !== max) return `${min}-${max}`;
  if (min) return String(min);
  if (max) return String(max);
  return '8-12';
}

export function WorkoutWeekPreview({ schedule, exercisesByPlanDayId }: WorkoutWeekPreviewProps) {
  const { c, ty, r } = useTokens();

  const ordered = useMemo(
    () => [...schedule].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [schedule],
  );

  if (!ordered.length) {
    return (
      <View style={[styles.emptyCard, { borderColor: c.border, backgroundColor: c.bg, borderRadius: r.md }]}> 
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>No weekly schedule available yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {ordered.map((entry) => {
        const exercises = entry.plan_day_id ? exercisesByPlanDayId.get(entry.plan_day_id) || [] : [];
        const isWorkout = entry.session_type === 'workout';
        return (
          <View key={entry.id} style={[styles.dayCard, { borderColor: c.border, backgroundColor: c.bg, borderRadius: r.md }]}> 
            <View style={styles.dayHeader}>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>{formatDateLabel(entry.scheduled_date)}</Text>
              <Text style={{ color: isWorkout ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 12 }}>
                {isWorkout ? 'Workout' : 'Rest'}
              </Text>
            </View>

            {isWorkout ? (
              <>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 12, marginBottom: 6 }}>
                  {entry.plan_day?.name || 'Training Day'}{entry.plan_day?.focus ? ` • ${entry.plan_day.focus}` : ''}
                </Text>
                {exercises.slice(0, 6).map((exercise, idx) => (
                  <Text key={`${exercise.id || idx}`} style={{ color: c.text, fontFamily: ty.body.family, fontSize: 12, lineHeight: 17 }}>
                    • {exercise.exercise?.name || 'Exercise'} · {exercise.sets_target || 3} x {repsLabel(exercise)}
                  </Text>
                ))}
                {exercises.length > 6 ? (
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 12, marginTop: 4 }}>
                    +{exercises.length - 6} more exercises
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 12 }}>
                Recovery, mobility, hydration, and light activity.
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  dayCard: {
    borderWidth: 1,
    padding: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  emptyCard: {
    borderWidth: 1,
    padding: 12,
  },
});
