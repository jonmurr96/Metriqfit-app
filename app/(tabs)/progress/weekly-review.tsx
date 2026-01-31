import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { useNutritionStats } from '../../../hooks/useNutrition';
import { useUserDashboard } from '../../../hooks/useUser';

export default function WeeklyReviewScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Real data
  const { data: stats } = useNutritionStats(7);
  const { calorieTarget } = useUserDashboard();

  // Calculate averages
  const days = stats ? Object.values(stats) : [];
  const avgCalories = days.length > 0
    ? Math.round(days.reduce((acc, curr) => acc + curr.calories, 0) / days.length)
    : 0;
  const avgProtein = days.length > 0
    ? Math.round(days.reduce((acc, curr) => acc + curr.protein, 0) / days.length)
    : 0;

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
          Weekly Review
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={[styles.content, { padding: s.lg }]}>
        <GlassCard>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, marginBottom: 8, textTransform: 'uppercase', fontSize: 10 }}>
            Last 7 Days Average
          </Text>

          <View style={styles.row}>
            <View>
              <Text style={{ color: c.text, fontSize: 32, fontFamily: ty.heading.family }}>
                {avgCalories}
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>Avg Calories</Text>
            </View>
            <View>
              <Text style={{ color: c.text, fontSize: 32, fontFamily: ty.heading.family }}>
                {avgProtein}g
              </Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>Avg Protein</Text>
            </View>
          </View>

          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 16 }}>
            <Text style={{ color: c.primary, textAlign: 'center' }}>
              {avgCalories < (calorieTarget || 2000) ? 'Below Target' : 'On/Over Target'} of {calorieTarget || 2000} kcal
            </Text>
          </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8
  }
});
