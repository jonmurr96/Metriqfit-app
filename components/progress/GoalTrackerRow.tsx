import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { FreshnessChip } from './FreshnessChip';
import { trackProgressCardRendered, trackProgressCtaTapped } from '../../lib/analytics';

export interface GoalTrackerItem {
    id: string;
    label: string;
    value: string;
    subtitle: string;
    progress: number; // 0-100
    lastUpdatedIso: string | null;
    onPress?: () => void;
}

interface GoalTrackerRowProps {
    items: GoalTrackerItem[];
}

export function GoalTrackerRow({ items }: GoalTrackerRowProps) {
    const { c, ty, r } = useTokens();
    const trackedRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
        items.forEach((item) => {
            if (!trackedRef.current[item.id]) {
                trackProgressCardRendered({ card_id: `goal_tracker_${item.id}` });
                trackedRef.current[item.id] = true;
            }
        });
    }, [items]);

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
        >
            {items.map((item, idx) => (
                <MotiView
                    key={item.id}
                    from={{ opacity: 0, translateX: 20 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'timing', duration: 400, delay: idx * 80 }}
                >
                    <Pressable
                        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
                        onPress={() => {
                            trackProgressCtaTapped({ cta_id: `goal_tracker_${item.id}` });
                            item.onPress?.();
                        }}
                    >
                        <View style={styles.chipRow}>
                            <FreshnessChip lastUpdatedIso={item.lastUpdatedIso} />
                        </View>
                        <Text style={[styles.value, { color: c.text, fontFamily: ty.heading.family }]}>
                            {item.value}
                        </Text>
                        <Text style={[styles.label, { color: c.primary, fontFamily: ty.body.familySemibold }]}>
                            {item.label}
                        </Text>
                        <Text style={[styles.subtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>
                            {item.subtitle}
                        </Text>

                        {/* Mini progress arc */}
                        <View style={[styles.progressBg, { backgroundColor: `${c.primary}15` }]}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        backgroundColor: c.primary,
                                        width: `${Math.min(100, Math.max(0, item.progress))}%`,
                                    },
                                ]}
                            />
                        </View>
                    </Pressable>
                </MotiView>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    row: {
        paddingHorizontal: 16,
        gap: 10,
        paddingVertical: 4,
    },
    card: {
        width: 140,
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        gap: 4,
    },
    chipRow: {
        alignItems: 'flex-end',
        marginBottom: 4,
    },
    value: {
        fontSize: 24,
        letterSpacing: -0.5,
    },
    label: {
        fontSize: 12,
        letterSpacing: 0.3,
    },
    subtitle: {
        fontSize: 10,
        marginTop: 2,
    },
    progressBg: {
        height: 4,
        borderRadius: 2,
        marginTop: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
});
