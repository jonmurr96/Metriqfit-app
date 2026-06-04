import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { PressableScale } from '@/components/common/PressableScale';

interface NextWorkoutCardProps {
    workoutName?: string;
    workoutType?: string;
    duration?: number;
    calories?: number;
    onPress?: () => void;
    delay?: number;
}

/**
 * Premium workout preview card matching reference design.
 * Features: Large icon badge, workout details, play button.
 */
export function NextWorkoutCard({
    workoutName = 'No Workout Planned',
    workoutType = 'Complete onboarding',
    duration = 45,
    calories = 380,
    onPress,
    delay = 0,
}: NextWorkoutCardProps) {
    const { c, ty, s, r, glass } = useTokens();
    const router = useRouter();

    const handlePress = onPress || (() => router.navigate('/(tabs)/workout/day-preview'));

    const hasWorkout = workoutName !== 'No Workout Planned';

    return (
        <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 500, delay }}
        >
            <PressableScale
                onPress={handlePress}
                style={(pressed) => [
                    styles.container,
                    {
                        backgroundColor: glass.background,
                        borderRadius: r.lg,
                        borderWidth: 1,
                        borderColor: pressed ? c.primary : glass.border,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                    // Glow effect on border
                    Platform.OS !== 'web' && {
                        shadowColor: c.primary,
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.15,
                        shadowRadius: 20,
                    },
                    Platform.OS === 'web' && {
                        boxShadow: `0 0 30px ${c.primary}15, inset 0 1px 0 ${glass.border}`,
                    } as any,
                ]}
            >
                {/* Left: Icon Badge */}
                <View
                    style={[
                        styles.iconBadge,
                        {
                            backgroundColor: `${c.primary}20`,
                            borderRadius: r.md,
                        },
                    ]}
                >
                    <TabBarIcon name="barbell" color={c.primary} size={28} />
                </View>

                {/* Center: Content */}
                <View style={styles.content}>
                    <Text
                        style={[
                            styles.label,
                            {
                                color: c.primary,
                                fontFamily: ty.body.familySemibold,
                                fontSize: 11,
                                letterSpacing: 1.5,
                            },
                        ]}
                    >
                        {hasWorkout ? 'NEXT WORKOUT' : 'GET STARTED'}
                    </Text>
                    <Text
                        style={[
                            styles.title,
                            {
                                color: c.text,
                                fontFamily: ty.heading.familySemibold,
                                fontSize: ty.sizes.lg,
                                marginTop: 4,
                            },
                        ]}
                        numberOfLines={2}
                    >
                        {workoutName}
                    </Text>

                    {/* Metadata Row */}
                    {hasWorkout && (
                        <View style={[styles.metaRow, { marginTop: s.sm }]}>
                            <View style={styles.metaItem}>
                                <TabBarIcon name="time-outline" color={c.textMuted} size={14} />
                                <Text
                                    style={{
                                        color: c.textMuted,
                                        fontFamily: ty.body.familyMedium,
                                        fontSize: 12,
                                        marginLeft: 4,
                                    }}
                                >
                                    {duration} MIN
                                </Text>
                            </View>
                            <View style={[styles.metaItem, { marginLeft: s.md }]}>
                                <TabBarIcon name="flame-outline" color={c.textMuted} size={14} />
                                <Text
                                    style={{
                                        color: c.textMuted,
                                        fontFamily: ty.body.familyMedium,
                                        fontSize: 12,
                                        marginLeft: 4,
                                    }}
                                >
                                    {calories} KCAL
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Right: Play Button */}
                <View
                    style={[
                        styles.playButton,
                        {
                            backgroundColor: `${c.primary}15`,
                            borderRadius: 24,
                            borderWidth: 2,
                            borderColor: c.primary,
                        },
                    ]}
                >
                    <TabBarIcon name="play" color={c.primary} size={20} />
                </View>
            </PressableScale>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconBadge: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        marginLeft: 14,
    },
    label: {},
    title: {},
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
