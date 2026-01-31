import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Image, Modal, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { useExerciseHistory } from '../../../hooks/useWorkout';
import { useQuery } from '@tanstack/react-query';
import { getExerciseById } from '../../../services/workoutService';
import { Ionicons } from '@expo/vector-icons';
import { PlateCalculator } from '../../../components/tools/PlateCalculator';

export default function ExerciseDetailScreen() {
    const { c, s, ty, r } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams();
    const exerciseId = id as string;

    const [activeTab, setActiveTab] = useState<'about' | 'history'>('history');
    const [showCalculator, setShowCalculator] = useState(false);

    // Fetch exercise details
    const { data: exercise } = useQuery({
        queryKey: ['exercise', exerciseId],
        queryFn: () => getExerciseById(exerciseId),
        enabled: !!exerciseId
    });

    // Fetch history
    const { data: history } = useExerciseHistory(exerciseId, 20);

    if (!exercise) {
        // Loading state or error
        return <View style={[styles.container, { backgroundColor: c.bg }]} />;
    }

    return (
        <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: s.lg }]}>
                <Pressable
                    onPress={() => router.back()}
                    style={[styles.backButton, { backgroundColor: c.surface }]}
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
                    numberOfLines={1}
                >
                    {exercise.name}
                </Text>
                <Pressable
                    onPress={() => setShowCalculator(true)}
                    style={[styles.backButton, { backgroundColor: c.surface, width: 40 }]}
                >
                    <Ionicons name="calculator-outline" size={24} color={c.text} />
                </Pressable>
            </View>

            {/* Tabs */}
            <View style={[styles.tabBar, { borderBottomColor: c.border }]}>
                <Pressable
                    onPress={() => setActiveTab('about')}
                    style={[styles.tab, activeTab === 'about' && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
                >
                    <Text style={{ color: activeTab === 'about' ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold }}>
                        About
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => setActiveTab('history')}
                    style={[styles.tab, activeTab === 'history' && { borderBottomColor: c.primary, borderBottomWidth: 2 }]}
                >
                    <Text style={{ color: activeTab === 'history' ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold }}>
                        History
                    </Text>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: 100 }}>
                {activeTab === 'about' ? (
                    <View>
                        {/* About Content */}
                        <GlassCard style={{ marginBottom: s.lg }}>
                            <Text style={{ color: c.textMuted, marginBottom: 4 }}>Primary Muscle</Text>
                            <Text style={{ color: c.text, fontFamily: ty.heading.family, fontSize: 18, textTransform: 'capitalize' }}>
                                {exercise.primary_muscle || 'Unknown'}
                            </Text>
                        </GlassCard>

                        {exercise.instructions && (
                            <GlassCard>
                                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, marginBottom: 8 }}>
                                    Instructions
                                </Text>
                                <Text style={{ color: c.textMuted, lineHeight: 22 }}>
                                    {exercise.instructions}
                                </Text>
                            </GlassCard>
                        )}
                    </View>
                ) : (
                    <View>
                        {/* History Content */}
                        {history && history.length > 0 ? (
                            history.map((session, index) => (
                                <GlassCard key={session.sessionId} style={{ marginBottom: s.md }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
                                            {new Date(session.date).toLocaleDateString()}
                                        </Text>
                                        <Text style={{ color: c.textMuted, fontSize: 12 }}>
                                            {session.sessionName}
                                        </Text>
                                    </View>

                                    {/* Sets Table */}
                                    <View style={{ gap: 4 }}>
                                        {session.sets.map((set: any, i: number) => (
                                            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: c.surface2 }}>
                                                <Text style={{ color: c.textMuted, width: 20 }}>{set.set_number}</Text>
                                                <Text style={{ color: c.text }}>
                                                    {set.weight_lb} lbs x {set.reps}
                                                </Text>
                                                <Text style={{ color: c.textSubtle, fontSize: 10 }}>
                                                    {set.is_pr ? '🏆 PR' : ''}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </GlassCard>
                            ))
                        ) : (
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <Text style={{ color: c.textMuted }}>No history found for this exercise.</Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            <Modal
                visible={showCalculator}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCalculator(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: c.surface }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                            <Text style={{ color: c.text, fontSize: 18, fontWeight: 'bold' }}>Plate Calculator</Text>
                            <TouchableOpacity onPress={() => setShowCalculator(false)}>
                                <Ionicons name="close" size={24} color={c.text} />
                            </TouchableOpacity>
                        </View>
                        <PlateCalculator />
                    </View>
                </View>
            </Modal>
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
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16
    },
    placeholder: {
        width: 40,
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        borderRadius: 16,
        padding: 20,
        // elevation: 5,
    }
});
