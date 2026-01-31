import React from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useUserPRs } from '../../../hooks/useWorkout';
import { metriqfitTheme } from '../../../lib/theme';

const COLORS = metriqfitTheme.colors;

export default function PersonalRecordsScreen() {
    const router = useRouter();
    const { data: prs, isLoading } = useUserPRs();

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    // Format date helper
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Personal Records</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <LinearGradient
                    colors={[COLORS.primary + '20', 'transparent']}
                    style={styles.banner}
                >
                    <Ionicons name="trophy" size={32} color={COLORS.primary} />
                    <View style={styles.bannerTextContainer}>
                        <Text style={styles.bannerTitle}>Your Trophy Room</Text>
                        <Text style={styles.bannerSubtitle}>
                            Every rep is a step forward. Here are your best lifts.
                        </Text>
                    </View>
                </LinearGradient>

                {prs && prs.length > 0 ? (
                    prs.map((pr, index) => (
                        <MotiView
                            key={pr.id}
                            from={{ opacity: 0, translateY: 20 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ delay: index * 100 }}
                            style={styles.card}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.exerciseName}>{pr.exercise?.name}</Text>
                                <Text style={styles.date}>{formatDate(pr.achieved_at)}</Text>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.stat}>
                                    <Text style={styles.statValue}>{pr.weight_lb} lbs</Text>
                                    <Text style={styles.statLabel}>Weight</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.stat}>
                                    <Text style={styles.statValue}>{pr.reps}</Text>
                                    <Text style={styles.statLabel}>Reps</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.stat}>
                                    <Text style={styles.statValue}>{pr.estimated_1rm} lbs</Text>
                                    <Text style={styles.statLabel}>Est. 1RM</Text>
                                </View>
                            </View>
                        </MotiView>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="barbell-outline" size={48} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No records yet</Text>
                        <Text style={styles.emptySubtext}>
                            Start logging your workouts to track your personal bests!
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
    },
    content: {
        padding: 20,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.primary + '40',
        marginBottom: 24,
    },
    bannerTextContainer: {
        marginLeft: 16,
        flex: 1,
    },
    bannerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 4,
    },
    bannerSubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        flex: 1,
    },
    date: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: COLORS.bg,
        padding: 12,
        borderRadius: 12,
    },
    stat: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: COLORS.border,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        opacity: 0.7,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
});
