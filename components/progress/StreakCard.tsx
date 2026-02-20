import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface StreakCardProps {
    title: string;
    currentStreak: number;
    longestStreak: number;
    variant: 'workout' | 'nutrition';
}

export function StreakCard({ title, currentStreak, longestStreak, variant }: StreakCardProps) {
    const { c, ty, s, r } = useTokens();
    const icon = variant === 'workout' ? 'barbell-outline' : 'nutrition-outline';
    const accentColor = variant === 'workout' ? c.primary : '#FFB946';

    return (
        <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 450 }}
        >
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={styles.headerRow}>
                    <View style={[styles.iconBubble, { backgroundColor: `${accentColor}18` }]}>
                        <TabBarIcon name={icon} color={accentColor} size={16} />
                    </View>
                    <Text style={[styles.title, { color: c.text, fontFamily: ty.body.familySemibold }]}>{title}</Text>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: c.text, fontFamily: ty.heading.family }]}>{currentStreak}d</Text>
                        <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: ty.body.family }]}>Current</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: c.border }]} />
                    <View style={styles.stat}>
                        <Text style={[styles.statValue, { color: c.text, fontFamily: ty.heading.family }]}>{longestStreak}d</Text>
                        <Text style={[styles.statLabel, { color: c.textMuted, fontFamily: ty.body.family }]}>Longest</Text>
                    </View>
                </View>
            </View>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    iconBubble: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 13,
        letterSpacing: 0.2,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 22,
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 11,
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 30,
    },
});
