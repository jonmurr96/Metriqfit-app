import { StyleSheet, View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useProgramDetails } from '../../../hooks/useWorkout';
import { WorkoutTemplateDay } from '../../../services/workoutService';

export default function ProgramDetailScreen() {
    const { c, s, ty, r } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { programId } = useLocalSearchParams();

    const { data: program, isLoading } = useProgramDetails(programId as string);

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={c.primary} />
            </View>
        );
    }

    if (!program) {
        return (
            <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
                <View style={[styles.header, { paddingHorizontal: s.lg }]}>
                    <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: c.surface }]}>
                        <TabBarIcon name="chevron-back" color={c.text} size={24} />
                    </Pressable>
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: c.textMuted }}>Program not found</Text>
                </View>
            </View>
        );
    }

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
                <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}>
                    Program Details
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + s.xl }}
            >
                {/* Program Header Info */}
                <View style={{ marginBottom: s.xl }}>
                    <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.h2 }}>
                        {program.name}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: s.sm }}>
                        {(() => {
                            // Determine colors based on difficulty
                            let badgeColor = c.primary;
                            const diff = (program.difficulty || 'beginner').toLowerCase();

                            if (diff === 'intermediate') {
                                badgeColor = c.macros?.carbs || '#F5A623';
                            } else if (diff === 'advanced' || diff === 'expert') {
                                badgeColor = c.macros?.fat || '#BD10E0';
                            }

                            return (
                                <View style={[
                                    styles.badge,
                                    {
                                        backgroundColor: c.surface2,
                                        borderRadius: r.sm,
                                        marginRight: s.md,
                                        borderWidth: 1,
                                        borderColor: badgeColor + '40'
                                    }
                                ]}>
                                    <Text style={{ color: badgeColor, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                                        {program.difficulty ? program.difficulty.toUpperCase() : 'GENERAL'}
                                    </Text>
                                </View>
                            );
                        })()}
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                            {program.duration_weeks} weeks • {program.days_per_week} days/week
                        </Text>
                    </View>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.md, marginTop: s.md, lineHeight: 22 }}>
                        {program.description || 'No description available.'}
                    </Text>
                </View>

                {/* Days List */}
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginBottom: s.md }}>
                    Workout Schedule
                </Text>

                {program.days && program.days.length > 0 ? (
                    program.days.map((day) => (
                        <Pressable
                            key={day.id}
                            style={({ pressed }) => [
                                styles.dayCard,
                                {
                                    backgroundColor: c.surface,
                                    borderRadius: r.md,
                                    padding: s.lg,
                                    marginBottom: s.sm,
                                    borderWidth: 1,
                                    borderColor: c.border,
                                    opacity: pressed ? 0.7 : 1,
                                },
                            ]}
                            onPress={() => router.push({
                                pathname: '/(tabs)/workout/day-preview',
                                params: { templateDayId: day.id, dayName: day.name }
                            })}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <View style={[styles.dayNumber, { backgroundColor: c.surface2, borderRadius: r.sm, marginRight: s.md }]}>
                                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                                            {day.day_number}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                                            {day.name}
                                        </Text>
                                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: 2 }}>
                                            {day.focus || 'Workout'} • {day.exercises?.length || 0} exercises
                                        </Text>
                                    </View>
                                </View>
                                <TabBarIcon name="chevron-forward" color={c.textMuted} size={20} />
                            </View>
                        </Pressable>
                    ))
                ) : (
                    <Text style={{ color: c.textMuted }}>No days found for this program.</Text>
                )}
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
    scrollView: {
        flex: 1,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    dayCard: {},
    dayNumber: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
