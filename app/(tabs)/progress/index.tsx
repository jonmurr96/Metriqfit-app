import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { RingIconButton } from '../../../components/common/RingIconButton';
import {
  TimeFrameTabs,
  GoalForecastCard,
  WeeklyTrendChart,
} from '../../../components/progress';
import { useMeasurements, useProfile } from '../../../hooks/useUser';

type TimeFrame = 'week' | 'month' | 'year';

export default function ProgressHomeScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');

  // Fetch Data
  const { data: profile } = useProfile();
  const { data: measurements, isLoading } = useMeasurements(30);

  // Quick Access ring icons
  const quickLinks = [
    { label: 'History', icon: 'time-outline', onPress: () => router.push('/(tabs)/workout/workout-history') },
    { label: 'Log Weight', icon: 'scale-outline', onPress: () => router.push('/log-weight-sheet') },
    { label: 'Records', icon: 'trophy-outline', onPress: () => router.push('/(tabs)/progress/personal-records') },
    { label: 'Photos', icon: 'camera-outline', onPress: () => { } },
  ];

  // Process data for chart
  const weightData = (measurements || [])
    .slice(0, 7) // Last 7 entries
    .reverse()
    .map(m => ({
      day: new Date(m.logged_at).toLocaleDateString('en-US', { weekday: 'narrow' }),
      value: m.weight_kg * 2.20462, // Convert to lbs for display if imperial (assuming imperial for now based on context)
      isToday: new Date(m.logged_at).getDate() === new Date().getDate(),
    }));

  const currentWeightLb = (profile?.current_weight_kg || 0) * 2.20462;
  // Fallback if no goal weight in profile yet
  const goalWeightLb = currentWeightLb > 0 ? currentWeightLb - 10 : 180;

  const hasData = measurements && measurements.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        style={[
          styles.header,
          {
            paddingTop: insets.top + s.md,
            paddingHorizontal: s.lg,
            backgroundColor: c.bg,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            style={[
              styles.headerButton,
              {
                borderWidth: 2,
                borderColor: `${c.primary}40`,
                backgroundColor: 'transparent',
              },
            ]}
            onPress={() => router.back()}
          >
            <TabBarIcon name="chevron-back" color={c.primary} size={22} />
          </Pressable>
          <Pressable
            style={[
              styles.headerButton,
              {
                borderWidth: 2,
                borderColor: c.primary,
                backgroundColor: `${c.primary}15`,
                width: 'auto',
                paddingHorizontal: 16,
                flexDirection: 'row',
                gap: 6
              },
            ]}
            onPress={() => router.push('/check-in')}
          >
            <TabBarIcon name="scan-outline" color={c.primary} size={18} />
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 12 }}>Check In</Text>
          </Pressable>
        </View>
        <Text
          style={[
            styles.title,
            {
              color: c.text,
              fontFamily: ty.heading.family,
              fontSize: 28,
            },
          ]}
        >
          Progress & Insights
        </Text>
      </MotiView>

      <View style={{ paddingHorizontal: s.lg }}>
        <TimeFrameTabs selected={timeFrame} onSelect={setTimeFrame} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={{ padding: s.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : !hasData ? (
          <View style={{ padding: s.xl, alignItems: 'center' }}>
            <Text style={{ color: c.textMuted, textAlign: 'center' }}>No progress data yet. Log your weight to see trends!</Text>
            <Pressable
              onPress={() => router.push('/log-weight-sheet')}
              style={{ marginTop: s.md, padding: s.md, backgroundColor: c.surface, borderRadius: r.md }}
            >
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>Log First Weigh-in</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={{ paddingHorizontal: s.lg, gap: s.lg }}>
              <GoalForecastCard
                startWeight={measurements[measurements.length - 1].weight_kg * 2.20462}
                currentWeight={currentWeightLb}
                goalWeight={goalWeightLb} // TODO: Fetch real goal
                targetDate="Unknown"
                onViewProjection={() => { }}
              />
            </View>

            <View style={{ paddingHorizontal: s.lg, marginTop: s.xl }}>
              <WeeklyTrendChart
                title="Weight Trend (lbs)"
                data={weightData.length > 0 ? weightData : [{ day: 'Now', value: currentWeightLb, isToday: true }]}
                changePercent={0} // TODO: Calculate
              />
            </View>
          </>
        )}

        {/* Quick Access - Ring Icons */}
        <View style={[styles.quickAccess, { paddingHorizontal: s.lg, marginTop: s.xl }]}>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
              letterSpacing: 1.5,
              marginBottom: s.lg,
            }}
          >
            QUICK ACCESS
          </Text>
          <View style={styles.linkRow}>
            {quickLinks.map((link, index) => (
              <RingIconButton
                key={link.label}
                icon={link.icon}
                label={link.label}
                onPress={link.onPress}
                size={56}
                delay={100 + index * 60}
              />
            ))}
          </View>
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
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    letterSpacing: -0.5,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
  },
  quickAccess: {},
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
