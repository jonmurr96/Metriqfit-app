import { StyleSheet, View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useWorkoutHistory } from '../../../hooks/useWorkout';
import { GlassCard } from '../../../components/premium/GlassCard';

export default function WorkoutHistoryScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: history, isLoading } = useWorkoutHistory();

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
          Workout History
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={[styles.content, { justifyContent: 'center' }]}>
            <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: s.lg }}>
            {!history || history.length === 0 ? (
                <View
                style={[
                    styles.emptyCard,
                    {
                    backgroundColor: c.surface,
                    borderRadius: r.lg,
                    padding: s.xl,
                    marginTop: s.xl,
                    borderWidth: 1,
                    borderColor: c.border,
                    },
                ]}
                >
                <View
                    style={[
                    styles.iconContainer,
                    { backgroundColor: c.surface2, borderRadius: r.lg },
                    ]}
                >
                    <TabBarIcon name="stats-chart" color={c.primary} size={48} />
                </View>
                <Text
                    style={{
                    color: c.text,
                    fontFamily: ty.heading.familySemibold,
                    fontSize: ty.sizes.lg,
                    textAlign: 'center',
                    marginTop: s.lg,
                    }}
                >
                    No Workouts Yet
                </Text>
                <Text
                    style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.md,
                    textAlign: 'center',
                    marginTop: s.sm,
                    }}
                >
                    Complete your first workout to start tracking your progress
                </Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    renderItem={({ item }) => (
                        <Pressable style={{ marginBottom: s.md }} >
                            <GlassCard>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View>
                                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                                            {item.name}
                                        </Text>
                                        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 4 }}>
                                            {new Date(item.started_at).toLocaleDateString()} • {Math.floor((item.duration_seconds || 0) / 60)} min
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.lg }}>
                                            {item.exercises.length}
                                        </Text>
                                        <Text style={{ color: c.textMuted, fontSize: 10 }}>EXERCISES</Text>
                                    </View>
                                </View>
                            </GlassCard>
                        </Pressable>
                    )}
                />
            )}
        </View>
      )}
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
    flex: 1,
  },
  emptyCard: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

