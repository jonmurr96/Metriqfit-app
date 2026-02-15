import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useActiveWorkoutPlan } from '../../../hooks/usePlan';
import {
  useApplyWorkoutAdaptationRecommendation,
  useGenerateWorkoutAdaptationRecommendations,
  useSetWorkoutAdaptationRecommendationStatus,
  useWorkoutAdaptationRecommendations,
} from '../../../hooks/useWorkoutAdaptation';

export default function WorkoutAdaptationScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: activePlan } = useActiveWorkoutPlan();

  const { data: recommendations = [] } = useWorkoutAdaptationRecommendations(activePlan?.id);
  const generateMutation = useGenerateWorkoutAdaptationRecommendations();
  const applyMutation = useApplyWorkoutAdaptationRecommendation();
  const statusMutation = useSetWorkoutAdaptationRecommendationStatus();

  const pending = recommendations.filter((item) => item.status === 'pending');

  const generate = async () => {
    try {
      await generateMutation.mutateAsync({ planId: activePlan?.id, contextWindowDays: 14 });
    } catch (error: any) {
      Alert.alert('Unable to generate recommendations', error.message || 'Try again.');
    }
  };

  const apply = async (recommendationId: string) => {
    try {
      await applyMutation.mutateAsync({ recommendationId });
    } catch (error: any) {
      Alert.alert('Unable to apply recommendation', error.message || 'Try again.');
    }
  };

  const reject = async (recommendationId: string) => {
    try {
      await statusMutation.mutateAsync({ recommendationId, status: 'rejected' });
    } catch (error: any) {
      Alert.alert('Unable to reject recommendation', error.message || 'Try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { borderRadius: r.pill, backgroundColor: c.surface }]}>
          <TabBarIcon name="chevron-back" color={c.text} size={20} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>Adaptive Coach</Text>
        <Pressable onPress={generate} style={[styles.iconBtn, { borderRadius: r.pill, backgroundColor: c.surface2 }]}>
          <TabBarIcon name="refresh" color={c.primary} size={18} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 110 }}>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
          Recommendations are generated from missed sessions, RPE trends, and readiness signals.
        </Text>

        <View style={{ marginTop: s.md, backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.md }}>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
            Pending recommendations: {pending.length}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.xs }}>
            Use refresh to compute a fresh recommendation set for the current plan.
          </Text>
        </View>

        <View style={{ marginTop: s.lg, gap: s.sm }}>
          {recommendations.map((item) => (
            <View key={item.id} style={{ backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.lg }}>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                {item.recommendation_type.replaceAll('_', ' ')}
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                {item.rationale || 'No rationale available.'}
              </Text>
              {item.status === 'pending' ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: s.md }}>
                  <Pressable
                    onPress={() => apply(item.id)}
                    style={{ flex: 1, backgroundColor: c.primary, borderRadius: r.md, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>Accept</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => reject(item.id)}
                    style={{ flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: r.md, paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>Keep Current</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: ty.sizes.xs, marginTop: s.sm }}>
                  Status: {item.status}
                </Text>
              )}
            </View>
          ))}
          {recommendations.length === 0 && (
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
              No recommendations yet. Generate one from current training signals.
            </Text>
          )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
