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

export default function TrendsScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Fetch real data
  const { data: nutritionStats } = useNutritionStats(7);
  const { calorieTarget } = useUserDashboard();

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

        {/* Workout Volume (Future Implementation) */}
        {/* Hiding Volume Chart until service provides daily breakdown to avoid showing 0s */}
        <View style={[styles.infoCard, { backgroundColor: c.surface2, borderRadius: r.md, padding: s.md }]}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, textAlign: 'center' }}>
            Workout Volume Trends coming in next update.
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
    marginTop: 20
  }
});
