import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTokens } from "../../../lib/theme";
import { TabBarIcon } from "../../../components/navigation/TabBarIcon";
import { GlassCard } from "../../../components/premium/GlassCard";
import { useDailyMeals, useDailyTotals } from "../../../hooks/useNutrition";
import { useUserDashboard } from "../../../hooks/useUser";
import { useActiveSession } from "../../../hooks/useWorkout";
import { useTodayWorkoutScheduleEntry } from "../../../hooks/usePlan";
import { useHomeSnapshot } from "../../../hooks/useProgressMetrics";
import { FEATURE_FLAGS } from "../../../constants/featureFlags";

export default function DailySummaryScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const today = new Date().toISOString().split("T")[0];

  const { data: nutrition } = useDailyTotals(today);
  const { data: meals } = useDailyMeals(today);
  const { calorieTarget, proteinTarget, carbsTarget, fatTarget } = useUserDashboard();
  const { data: activeSession } = useActiveSession();
  const { data: schedule } = useTodayWorkoutScheduleEntry();
  const { data: homeSnapshot } = useHomeSnapshot();

  const mealCount = meals?.reduce((acc, meal) => acc + (meal.items?.length || 0), 0) || 0;
  const workoutLabel = schedule?.session_type === "workout"
    ? (schedule.status === "completed" ? "Completed" : "Planned")
    : schedule?.session_type
      ? "Recovery"
      : "None";

  return (
    <View className="flex-1" style={{ backgroundColor: c.bg, paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between py-4" style={{ paddingHorizontal: s.lg }}>
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: c.surface }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <Text
          style={{
            letterSpacing: -0.3,
            color: c.text,
            fontFamily: ty.heading.familySemibold,
            fontSize: ty.sizes.xl,
          }}
        >
          Daily Summary
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, padding: s.lg }}>
        <GlassCard style={{ marginBottom: s.lg }}>
          <View className="flex-row justify-between mb-[10px] items-center">
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold }}>Nutrition</Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>{today}</Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Calories</Text>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
              {nutrition?.calories || 0} / {calorieTarget}
            </Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Protein</Text>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
              {Math.round(nutrition?.protein || 0)}g / {proteinTarget}g
            </Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Carbs</Text>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
              {Math.round(nutrition?.carbs || 0)}g / {carbsTarget}g
            </Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Fat</Text>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
              {Math.round(nutrition?.fat || 0)}g / {fatTarget}g
            </Text>
          </View>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: s.sm }}>
            Logged items today: {mealCount}
          </Text>
        </GlassCard>

        <GlassCard style={{ marginBottom: s.lg }}>
          <View className="flex-row justify-between mb-[10px] items-center">
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold }}>Workout</Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>{workoutLabel}</Text>
          </View>
          {activeSession ? (
            <View>
              <Text style={{ color: c.primary, fontSize: ty.sizes.md, fontFamily: ty.body.familySemibold }}>
                {activeSession.name}
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4 }}>
                Session is active now.
              </Text>
            </View>
          ) : (
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
              No active workout right now.
            </Text>
          )}
        </GlassCard>

        <GlassCard>
          <View className="flex-row justify-between mb-[10px] items-center">
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold }}>Coach Guidance</Text>
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>Today</Text>
          </View>
          {homeSnapshot?.nextBestActions?.map((action, index) => (
            <Pressable key={action.id} onPress={() => router.push(action.route as any)} style={{ marginBottom: index === 0 ? s.sm : 0 }}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
                {index + 1}. <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>{action.title}</Text> — {action.description}
              </Text>
            </Pressable>
          ))}
          {!homeSnapshot?.nextBestActions?.length ? (
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
              Keep your log cadence high to unlock tailored actions.
            </Text>
          ) : null}
        </GlassCard>

        {!FEATURE_FLAGS.ALLOW_PLACEHOLDER_ROUTES ? null : (
          <View style={{ marginTop: s.md, padding: s.md, borderRadius: r.md, borderWidth: 1, borderColor: c.border }}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
              Placeholder routes are enabled for development.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
