import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { RingIconButton } from '../../../components/common/RingIconButton';
import { NextWorkoutCard } from '../../../components/workout/NextWorkoutCard';
import { useTodaysWorkout, useActiveWorkoutPlan } from '../../../hooks/usePlan';

export default function WorkoutHomeScreen() {
  const { c, s, ty, r, glass, shadow, animation } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Fetch active plan to get status for all days
  const { data: activePlan } = useActiveWorkoutPlan();
  const { data: todaysWorkout } = useTodaysWorkout();

  // State for selected day in calendar
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Derive selected workout from the plan based on selectedDate
  const selectedDayIndex = selectedDate.getDay(); // 0-6 (Sun-Sat)
  // Convert JS Date (0=Sun, 1=Mon...) to Plan Day Number (1=Mon, 7=Sun) needed for lookup
  const planDayNumber = selectedDayIndex === 0 ? 7 : selectedDayIndex;
  
  const selectedPlanDay = activePlan?.days?.find(d => d.day_number === planDayNumber);

  // Quick Access with ring icons
  const shortcuts = [
    { label: 'My Plan', icon: 'calendar', route: '/(tabs)/workout/my-plan' },
    { label: 'Programs', icon: 'barbell', route: '/(tabs)/workout/program-browser' },
    { label: 'Exercises', icon: 'fitness', route: '/(tabs)/workout/exercise-library' },
    { label: 'History', icon: 'stats-chart', route: '/(tabs)/workout/workout-history' },
  ];

  const today = new Date();
  // Reset time for accurate date comparison
  today.setHours(0, 0, 0, 0);
  
  const currentDayIndex = today.getDay();
  const mondayOffset = currentDayIndex === 0 ? -6 : 1 - currentDayIndex;

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + mondayOffset + i);
    date.setHours(0, 0, 0, 0);

    const isToday = date.getTime() === today.getTime();
    const isSelected = selectedDate.getDate() === date.getDate() && selectedDate.getMonth() === date.getMonth();
    const isPast = date.getTime() < today.getTime();
    
    // Find matching plan day (1=Mon ... 7=Sun)
    const dayNum = i + 1;
    const planDay = activePlan?.days?.find(d => d.day_number === dayNum);
    
    // Determine status
    const isCompleted = planDay?.is_completed;
    const isMissed = isPast && planDay && !isCompleted && !planDay.is_rest_day; // Assuming we want to track missed workouts (optional logic tweak depending on 'is_rest_day' field existence, inferred from context)
    
    // Correct 'isMissed' logic: if it was a workout day, it's in the past, and not completed.
    // Note: The types check later might show if 'is_rest_day' exists. Use 'name' check if needed.
    // For now, simple check: if it has exercises and is past and not completed.
    const hasExercises = planDay?.exercises && planDay.exercises.length > 0;
    const markedMissed = isPast && hasExercises && !isCompleted;

    return {
      day,
      date: date.getDate(),
      fullDate: date,
      isToday,
      isSelected,
      isCompleted,
      isMissed: markedMissed,
      hasDot: hasExercises && !isCompleted && !markedMissed, // Show dot for future/today scheduled
    };
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + s.lg, paddingBottom: 100 },
      ]}
    >
      {/* Header */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: animation.duration.normal }}
        style={[styles.header, { paddingHorizontal: s.xl }]}
      >
        <Text
          style={[
            styles.headerLabel,
            {
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              letterSpacing: 1.5,
              marginBottom: s.xs,
            },
          ]}
        >
          YOUR TRAINING
        </Text>
        <Text
          style={[
            styles.title,
            {
              color: c.text,
              fontFamily: ty.heading.family,
              fontSize: ty.sizes.h2,
            },
          ]}
        >
          Workout
        </Text>
      </MotiView>

      {/* Tall Vertical Day Pills - Stadium Shape */}
      <MotiView
        from={{ opacity: 0, translateX: -20 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: animation.duration.normal, delay: 100 }}
        style={[styles.dayPillsSection, { marginTop: s.lg, paddingLeft: s.lg }]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: s.lg, gap: 10 }}
        >
          {weekDays.map((item, i) => {
            // Priority of styles: Selected > Today > Completed/Missed > Default
            let borderColor = `${c.border}60`;
            let borderWidth = 1;

            if (item.isSelected) {
               borderColor = c.primary; 
               // Selected overrides others with a fill usually, but let's stick to the pill design
            } else if (item.isCompleted) {
              borderColor = c.primary; // Blue ring for completed
            } else if (item.isMissed) {
              borderColor = c.error || '#FF4444'; // Red ring for missed
            } else if (item.isToday) {
               borderColor = c.primary;
            }

            return (
              <MotiView
                key={`${item.day}-${i}`}
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 15, delay: 150 + i * 50 }}
              >
                <Pressable
                  onPress={() => setSelectedDate(item.fullDate)}
                  style={({ pressed }) => [
                    styles.dayPill,
                    {
                      // Fill logic: Today = Filled. Selected = Filled (Stronger). Others = Surface/Transparent
                      backgroundColor: item.isSelected 
                        ? c.primary 
                        : item.isToday 
                          ? `${c.primary}40` // Light blue fill for today
                          : c.surface,
                      
                      borderRadius: 28,
                      borderWidth: item.isSelected ? 0 : borderWidth,
                      borderColor: borderColor,
                      transform: [{ scale: pressed ? 0.95 : 1 }],
                    },
                    // Shadow for selected
                    item.isSelected && {
                      shadowColor: c.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.dayLabel,
                      {
                        color: item.isSelected ? c.bg : c.textMuted,
                        fontFamily: ty.body.familySemibold,
                        fontSize: 10,
                        letterSpacing: 0.8,
                      },
                    ]}
                  >
                    {item.day.toUpperCase()}
                  </Text>
                  <Text
                    style={[
                      styles.dayDate,
                      {
                        color: item.isSelected ? c.bg : c.text,
                        fontFamily: ty.heading.familySemibold,
                        fontSize: 22,
                        marginTop: 4,
                      },
                    ]}
                  >
                    {item.date}
                  </Text>
                  
                  {/* Status Indicator Dot (if not selected/today and has functionality) */}
                  {!item.isSelected && !item.isToday && (
                    <View style={{ marginTop: 6, opacity: 0.8 }}>
                       {item.isCompleted && (
                         <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.primary }} />
                       )}
                       {item.isMissed && (
                         <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.error || '#FF4444' }} />
                       )}
                       {item.hasDot && (
                         <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.textMuted }} />
                       )}
                    </View>
                  )}
                </Pressable>
              </MotiView>
            );
          })}
        </ScrollView>
      </MotiView>

      {/* Quick Access - Ring Icon Buttons */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: animation.duration.normal, delay: 200 }}
        style={[styles.section, { marginTop: s.xl, paddingHorizontal: s.lg }]}
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
              letterSpacing: 1.5,
              marginBottom: s.lg,
            },
          ]}
        >
          QUICK ACCESS
        </Text>
        <View style={styles.shortcuts}>
          {shortcuts.map((item, index) => (
            <RingIconButton
              key={item.label}
              icon={item.icon}
              label={item.label}
              onPress={() => router.push(item.route as any)}
              size={60}
              delay={300 + index * 80}
            />
          ))}
        </View>
      </MotiView>

      {/* Tools Section */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: animation.duration.normal, delay: 300 }}
        style={[styles.section, { marginTop: s.xl, paddingHorizontal: s.lg }]}
      >
        <Text
          style={[
            styles.sectionTitle,
            {
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.lg,
              letterSpacing: 0.5,
              marginBottom: s.md,
            },
          ]}
        >
          Tools
        </Text>
        <View style={{ flexDirection: 'row', gap: s.md }}>
          {/* 1RM Calculator */}
          <View style={{ flex: 1 }}>
            <Pressable
              onPress={() => router.push('/(tabs)/workout/calculators/one-rep-max')}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <GlassCard
                glowEffect
                intensity="medium"
                style={{
                  height: 100,
                  borderWidth: 1,
                  borderColor: c.primary + '40'
                }}
              >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <TabBarIcon name="barbell-outline" color={c.primary} size={32} />
                  <Text style={{
                    color: c.text,
                    marginTop: s.sm,
                    fontFamily: ty.body.familyMedium,
                    fontSize: ty.sizes.md,
                    textAlign: 'center'
                  }}>
                    1RM
                  </Text>
                </View>
              </GlassCard>
            </Pressable>
          </View>

          {/* Plate Calculator */}
          <View style={{ flex: 1 }}>
            <Pressable
              onPress={() => router.push('/(tabs)/workout/calculators/plate-calculator')}
              style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            >
              <GlassCard
                glowEffect
                intensity="medium"
                style={{
                  height: 100,
                  borderWidth: 1,
                  borderColor: c.primary + '40'
                }}
              >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <TabBarIcon name="calculator-outline" color={c.primary} size={32} />
                  <Text style={{
                    color: c.text,
                    marginTop: s.sm,
                    fontFamily: ty.body.familyMedium,
                    fontSize: ty.sizes.md,
                    textAlign: 'center'
                  }}>
                    Plate Calculator
                  </Text>
                </View>
              </GlassCard>
            </Pressable>
          </View>
        </View>
      </MotiView>

      {/* Selected Day's Workout Card */}
      <View style={{ paddingHorizontal: s.lg, marginTop: s.xl }}>
        <NextWorkoutCard
          delay={400}
          workoutName={selectedPlanDay?.name || 'Rest Day'}
          workoutType={selectedPlanDay 
            ? `Scheduled for ${selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}` 
            : 'No workout scheduled'}
          duration={(selectedPlanDay as any)?.duration_minutes || 0}
          onPress={() => {
            if (selectedPlanDay?.id) {
              router.push({
                pathname: '/(tabs)/workout/day-preview',
                params: { dayId: selectedPlanDay.id }
              });
            }
          }}
        />
      </View>
    </ScrollView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    marginBottom: 8,
  },
  headerLabel: {},
  title: {
    letterSpacing: -0.5,
  },
  dayPillsSection: {},
  dayPill: {
    width: 52,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: {},
  dayDate: {},
  section: {},
  sectionTitle: {},
  shortcuts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});
