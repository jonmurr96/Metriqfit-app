import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { useSessionDetails } from '../../../hooks/useWorkout';

const { width } = Dimensions.get('window');

export default function WorkoutSummaryScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;
  const hasSessionId = typeof sessionId === 'string' && sessionId.length > 0;

  const { data: session, isLoading } = useSessionDetails(sessionId);

  // Calculate stats
  const duration = session?.duration_seconds ? Math.floor(session.duration_seconds / 60) : 0;
  // Estimate: ~6 kcal/min for vigorous lifting
  const calories = duration * 6;
  
  const totalVolume = session?.exercises?.reduce((acc, ex) => {
    return acc + (ex.sets?.reduce((setAcc, set) => setAcc + ((set.weight_lb || 0) * (set.reps || 0)), 0) || 0);
  }, 0) || 0;

  const totalExactSets = session?.exercises?.reduce((acc, ex) => {
    return acc + (ex.sets?.filter(s => !s.is_warmup).length || 0);
  }, 0) || 0;

  const prCount = session?.exercises?.reduce((acc, ex) => {
      return acc + (ex.sets?.filter(s => s.is_pr).length || 0);
  }, 0) || 0;

  useEffect(() => {
    // Attempt Haptics heavily on mount
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  if (!hasSessionId) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: s.xl }]}>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, textAlign: 'center' }}>
          No workout summary available
        </Text>
        <Text style={{ color: c.textMuted, marginTop: s.sm, textAlign: 'center' }}>
          Finish a workout session to view your summary.
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)/workout')}
          style={{ marginTop: s.lg, paddingHorizontal: s.lg, paddingVertical: s.sm, borderRadius: r.md, backgroundColor: c.surface }}
        >
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>Go to Workout</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: c.textMuted }}>Loading summary...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: s.xl }]}>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, textAlign: 'center' }}>
          Summary not found
        </Text>
        <Text style={{ color: c.textMuted, marginTop: s.sm, textAlign: 'center' }}>
          This workout session may have been removed or is still processing.
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)/workout')}
          style={{ marginTop: s.lg, paddingHorizontal: s.lg, paddingVertical: s.sm, borderRadius: r.md, backgroundColor: c.surface }}
        >
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>Back to Workout</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
        <LinearGradient
            colors={[c.bg, '#0a101f']}
            style={StyleSheet.absoluteFill}
        />
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: s.xl }}>
            {/* Header / Success Animation Area */}
            <View style={{ height: 300, justifyContent: 'center', alignItems: 'center' }}>
                 <MotiView
                    from={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', damping: 12 }}
                    style={{ 
                        width: 120, 
                        height: 120, 
                        borderRadius: 60, 
                        backgroundColor: c.primary + '20', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        marginBottom: s.lg,
                        borderWidth: 2,
                        borderColor: c.primary
                    }}
                 >
                     <TabBarIcon name="checkmark" color={c.primary} size={64} />
                 </MotiView>
                 
                 <MotiView
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    delay={300}
                 >
                     <Text style={{ color: c.text, fontFamily: ty.heading.family, fontSize: ty.sizes.h1, textAlign: 'center' }}>
                         WORKOUT COMPLETE
                     </Text>
                     <Text style={{ color: c.textMuted, fontFamily: ty.body.family, textAlign: 'center', marginTop: s.xs }}>
                         {session.name}
                     </Text>
                 </MotiView>
            </View>

            {/* Stats Grid */}
            <View style={{ paddingHorizontal: s.lg, flexDirection: 'row', flexWrap: 'wrap', gap: s.md }}>
                {/* Duration */}
                <MotiView 
                    style={{ width: (width - s.lg * 2 - s.md) / 2 }}
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    delay={400}
                >
                    <GlassCard style={{ alignItems: 'center', padding: s.md }}>
                        <TabBarIcon name="time" color={c.primary} size={24} />
                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl, marginTop: s.sm }}>
                            {duration}
                        </Text>
                        <Text style={{ color: c.textMuted, fontSize: 12, textTransform: 'uppercase' }}>Minutes</Text>
                    </GlassCard>
                </MotiView>

                {/* Calories */}
                <MotiView 
                    style={{ width: (width - s.lg * 2 - s.md) / 2 }}
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    delay={500}
                >
                    <GlassCard style={{ alignItems: 'center', padding: s.md }}>
                        <TabBarIcon name="flame" color={c.error} size={24} />
                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl, marginTop: s.sm }}>
                            {calories}
                        </Text>
                        <Text style={{ color: c.textMuted, fontSize: 12, textTransform: 'uppercase' }}>Kcal Est.</Text>
                    </GlassCard>
                </MotiView>

                {/* Volume */}
                <MotiView 
                    style={{ width: '100%' }}
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    delay={600}
                >
                    <GlassCard style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: s.lg }}>
                        <View>
                            <Text style={{ color: c.textMuted, fontSize: 12, textTransform: 'uppercase' }}>Total Volume</Text>
                            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>
                                {totalVolume.toLocaleString()} <Text style={{ fontSize: 14, color: c.textMuted }}>lbs</Text>
                            </Text>
                        </View>
                        <TabBarIcon name="barbell" color={c.textMuted} size={32} />
                    </GlassCard>
                </MotiView>
                
                 {/* Sets & PRs Row */}
                 <MotiView 
                    style={{ width: '100%', flexDirection: 'row', gap: s.md }}
                    from={{ opacity: 0, translateY: 20 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    delay={700}
                >
                    <GlassCard style={{ flex: 1, padding: s.md, alignItems: 'center' }}>
                         <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>{totalExactSets}</Text>
                         <Text style={{ color: c.textMuted, fontSize: 10 }}>SETS COMPLETED</Text>
                    </GlassCard>
                    
                    <GlassCard style={{ flex: 1, padding: s.md, alignItems: 'center' }}>
                         <Text style={{ color: prCount > 0 ? c.warning : c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>{prCount}</Text>
                         <Text style={{ color: c.textMuted, fontSize: 10 }}>NEW RECORDS</Text>
                    </GlassCard>
                </MotiView>

            </View>

            {/* Exercises List Summary */}
            <View style={{ padding: s.lg, marginTop: s.md }}>
                <Text style={{ color: c.textMuted, marginBottom: s.md, fontFamily: ty.body.familySemibold }}>EXERCISES COMPLETED</Text>
                {session.exercises.map((ex, i) => (
                    <MotiView 
                        key={ex.id}
                        from={{ opacity: 0, translateX: -10 }}
                        animate={{ opacity: 1, translateX: 0 }}
                        delay={800 + (i * 100)}
                        style={{ 
                            flexDirection: 'row', 
                            justifyContent: 'space-between', 
                            paddingVertical: 12, 
                            borderBottomWidth: 1, 
                            borderBottomColor: c.surface2 
                        }}
                    >
                        <Text style={{ color: c.text, fontFamily: ty.body.family }}>{ex.exercise.name}</Text>
                        <Text style={{ color: c.textMuted }}>
                            {ex.sets.filter(s => !s.is_warmup).length} Sets
                        </Text>
                    </MotiView>
                ))}
            </View>

        </ScrollView>

        <View style={{ 
            paddingHorizontal: s.lg, 
            paddingTop: s.md,
            paddingBottom: insets.bottom + s.md,
            backgroundColor: c.bg
        }}>
            <Pressable
                onPress={() => router.replace('/(tabs)/workout/workout-history')}
                style={({pressed}) => ({
                    backgroundColor: c.primary,
                    padding: 16,
                    borderRadius: r.lg,
                    alignItems: 'center',
                    opacity: pressed ? 0.9 : 1,
                    shadowColor: c.primary,
                    shadowOpacity: 0.5,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 4}
                })}
            >
                <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                    Done
                </Text>
            </Pressable>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
