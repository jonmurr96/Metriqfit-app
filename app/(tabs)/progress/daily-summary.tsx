import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { useDailyTotals } from '../../../hooks/useNutrition';
import { useUserDashboard } from '../../../hooks/useUser';
import { useActiveSession } from '../../../hooks/useWorkout';

export default function DailySummaryScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const today = new Date().toISOString().split('T')[0];
  const { data: nutrition } = useDailyTotals(today);
  const { calorieTarget, proteinTarget } = useUserDashboard();
  const { data: activeSession } = useActiveSession();

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
          Daily Summary
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={[styles.content, { padding: s.lg }]}>

        {/* Nutrition Summary */}
        <GlassCard style={{ marginBottom: s.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: s.md }}>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold }}>Nutrition</Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>{today}</Text>
          </View>

          <View style={styles.statRow}>
            <View>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>Calories</Text>
              <Text style={{ color: c.text, fontSize: 24, fontFamily: ty.heading.family }}>
                {nutrition?.calories || 0}
                <Text style={{ fontSize: 14, color: c.textMuted }}> / {calorieTarget}</Text>
              </Text>
            </View>
            <View>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>Protein</Text>
              <Text style={{ color: c.text, fontSize: 24, fontFamily: ty.heading.family }}>
                {nutrition?.protein || 0}
                <Text style={{ fontSize: 14, color: c.textMuted }}> / {proteinTarget}g</Text>
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Workout Summary */}
        <GlassCard>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: s.md }}>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold }}>Workout</Text>
          </View>

          {activeSession ? (
            <View>
              <Text style={{ color: c.primary, fontSize: 18, fontFamily: ty.body.familySemibold, marginBottom: 4 }}>
                {activeSession.name}
              </Text>
              <Text style={{ color: c.success, fontSize: 12, fontFamily: ty.body.family }}>
                Active Now
              </Text>
            </View>
          ) : (
            <Text style={{ color: c.textMuted, fontStyle: 'italic' }}>
              No active workout today
            </Text>
          )}
        </GlassCard>

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
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  }
});
