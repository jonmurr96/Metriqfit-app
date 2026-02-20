import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { WeeklyTrendChart } from '../../../components/progress/WeeklyTrendChart';
import { useNutritionStats } from '../../../hooks/useNutrition';
import { useUserDashboard } from '../../../hooks/useUser';
import { useWorkoutHistory, useWorkoutStats } from '../../../hooks/useWorkout';
import { trackProgressCardRendered, trackProgressViewed } from '../../../lib/analytics';

export default function TrendsScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Fetch real data
  const { data: nutritionStats } = useNutritionStats(7);
  const { calorieTarget } = useUserDashboard();
  const { data: workoutHistory } = useWorkoutHistory(60);
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date().toISOString();
  const { data: workoutStats } = useWorkoutStats(startDate, endDate);

  React.useEffect(() => {
    trackProgressViewed({ source: 'progress_trends' });
    trackProgressCardRendered({ card_id: 'trends_calorie' });
    trackProgressCardRendered({ card_id: 'trends_volume' });
  }, []);

  // Transform data for charts
  const today = new Date();
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const calendarDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Nutrition Data
  const calorieData = last7Days.map(date => {
    const dayDate = new Date(date);
    const dayLabel = calendarDays[dayDate.getDay()];
    const value = nutritionStats?.[date]?.calories || 0;
    const isToday = date === today.toISOString().split('T')[0];
    const target = calorieTarget || 2000;

    return {
      day: dayLabel,
      value,
      isOverTarget: value > target,
      isToday
    };
  });

  const workoutVolumeData = last7Days.map((date) => {
    const dayDate = new Date(date);
    const dayLabel = calendarDays[dayDate.getDay()];
    const sessionsForDay = (workoutHistory || []).filter((session: any) => {
      if (!session?.started_at) return false;
      return session.started_at.split('T')[0] === date;
    });
    const value = sessionsForDay.reduce((total: number, session: any) => {
      const volume = (session.exercises || []).reduce((sessionVolume: number, ex: any) => {
        const exVolume = (ex.sets || []).reduce((setVolume: number, set: any) => {
          if (set?.is_warmup) return setVolume;
          const reps = Number(set?.reps || 0);
          const weight = Number(set?.weight_lb || 0);
          return setVolume + (reps * weight);
        }, 0);
        return sessionVolume + exVolume;
      }, 0);
      return total + volume;
    }, 0);

    return {
      day: dayLabel,
      value: Math.round(value),
      isToday: date === today.toISOString().split('T')[0],
      isOverTarget: false,
    };
  });

  const workoutVolumeChange = (() => {
    const values = workoutVolumeData.map((d) => d.value).filter((v) => v > 0);
    if (values.length < 2) return 0;
    const first = values[0];
    const last = values[values.length - 1];
    if (first === 0) return 0;
    return Math.round(((last - first) / first) * 100);
  })();

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: c.surface }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <Text
          style={[
            styles.title,
            {
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.xl,
            },
          ]}
        >
          Trends
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={[styles.content, { padding: s.lg }]}>

        {/* Calorie Trend */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          style={{ marginBottom: s.xl }}
        >
          <WeeklyTrendChart
            title="Daily Calories"
            data={calorieData}
            targetValue={calorieTarget || 2000}
            changePercent={(() => {
              // Calculate real change: compare recent 3 days avg to prior 4 days avg
              const values = calorieData.map(d => d.value).filter(v => v > 0);
              if (values.length < 2) return 0;
              const mid = Math.floor(values.length / 2);
              const recent = values.slice(mid);
              const prior = values.slice(0, mid);
              const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
              const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
              if (priorAvg === 0) return 0;
              return Math.round(((recentAvg - priorAvg) / priorAvg) * 100);
            })()}
            changeDirection={(() => {
              const values = calorieData.map(d => d.value).filter(v => v > 0);
              if (values.length < 2) return 'up' as const;
              return values[values.length - 1] >= values[0] ? 'up' as const : 'down' as const;
            })()}
          />
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 120 }}
          style={{ marginBottom: s.lg }}
        >
          <WeeklyTrendChart
            title="Workout Volume (lb)"
            data={workoutVolumeData}
            targetValue={Math.max(1, Math.round((workoutStats?.totalVolumeLb || 0) / 7))}
            changePercent={Math.abs(workoutVolumeChange)}
            changeDirection={workoutVolumeChange >= 0 ? 'up' : 'down'}
            emptyBehavior="min-bar"
          />
        </MotiView>

        <View style={[styles.infoCard, { backgroundColor: c.surface2, borderRadius: r.md, padding: s.md }]}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, textAlign: 'center' }}>
            Sessions: {workoutStats?.totalSessions || 0} · Avg duration: {workoutStats?.avgDurationMinutes || 0} min · PR pace: {workoutStats?.sessionsPerWeek || 0}/week
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  content: {
    paddingBottom: 40,
  },
  infoCard: {
    marginTop: 8
  },
});
