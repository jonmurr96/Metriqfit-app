import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { trackProgressCardRendered } from '../../lib/analytics';

export interface DayStatus {
    dayLabel: string;
    macroGoalMet: boolean;
    workoutCompleted: boolean;
    isToday: boolean;
}

interface WeeklyActivityBarProps {
    days: DayStatus[];
}

export function WeeklyActivityBar({ days }: WeeklyActivityBarProps) {
    const { c, ty, s } = useTokens();
    const trackedRef = useRef(false);

    useEffect(() => {
        if (!trackedRef.current) {
            trackProgressCardRendered({ card_id: 'weekly_activity_bar' });
            trackedRef.current = true;
        }
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: c.surface, borderColor: c.border }]}>
            {days.map((day, idx) => {
                const bothMet = day.macroGoalMet && day.workoutCompleted;
                const oneMet = day.macroGoalMet || day.workoutCompleted;

                return (
                    <View key={day.dayLabel + idx} style={styles.dayColumn}>
                        <Text style={[styles.dayLabel, { color: day.isToday ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold }]}>
                            {day.dayLabel}
                        </Text>
                        <MotiView
                            from={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'timing', duration: 400, delay: idx * 60 }}
                        >
                            <View
                                style={[
                                    styles.circle,
                                    bothMet && { backgroundColor: c.primary },
                                    !bothMet && oneMet && { backgroundColor: 'transparent', borderWidth: 2.5, borderColor: c.primary },
                                    !oneMet && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: `${c.textMuted}40` },
                                    day.isToday && styles.todayGlow,
                                    day.isToday && { shadowColor: c.primary },
                                ]}
                            >
                                {!bothMet && oneMet && (
                                    <View style={[styles.halfFill, { backgroundColor: c.primary }]} />
                                )}
                            </View>
                        </MotiView>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 12,
    },
    dayColumn: {
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    dayLabel: {
        fontSize: 11,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    circle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    halfFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
    },
    todayGlow: {
        shadowOpacity: 0.7,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
    },
});
