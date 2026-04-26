import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Modal, TouchableOpacity } from 'react-native';
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
import { ExerciseMediaHero } from '../../../components/workout/media/ExerciseMediaHero';

function normalizeInstructionSteps(raw: unknown, legacyInstructions?: string | null): string[] {
    if (Array.isArray(raw)) {
        return raw.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (legacyInstructions) {
        return legacyInstructions
            .split(/\n+/)
            .map((line) => line.trim().replace(/^[-*]\s*/, ''))
            .filter(Boolean);
    }
    return [];
}

function MetaRow({
    label,
    value,
    muted,
    c,
    ty,
}: {
    label: string;
    value: string;
    muted?: boolean;
    c: { textMuted: string; text: string };
    ty: { body: { family: string; familySemibold: string } };
}) {
    return (
        <View>
            <Text style={{ color: c.textMuted, marginBottom: 4, fontFamily: ty.body.family }}>
                {label}
            </Text>
            <Text
                style={{
                    color: muted ? c.textMuted : c.text,
                    fontFamily: ty.body.familySemibold,
                    lineHeight: 24,
                    flexWrap: 'wrap',
                }}
            >
                {value}
            </Text>
        </View>
    );
}

export default function ExerciseDetailScreen() {
    const { c, s, ty } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { id } = useLocalSearchParams<{ id?: string; source?: string }>();
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

    const instructionSteps = normalizeInstructionSteps(exercise.instruction_steps, exercise.instructions);

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
                        <GlassCard style={{ marginBottom: s.lg, overflow: 'hidden' }}>
                            <ExerciseMediaHero
                                exerciseId={exercise.id}
                                videoUrl={exercise.video_url}
                                gifUrl={exercise.gif_url}
                                imageUrl={exercise.image_url}
                                posterUrl={exercise.poster_url}
                                hasMedia={exercise.has_media}
                                height={240}
                                autoplay
                                fit="contain"
                            />
                        </GlassCard>

                        <GlassCard style={{ marginBottom: s.lg }}>
                            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, marginBottom: 10 }}>
                                Quick Reference
                            </Text>
                            <View style={{ gap: 12 }}>
                                <MetaRow label="Category" value={exercise.category || 'Unknown'} c={c} ty={ty} />
                                <MetaRow label="Primary Muscle" value={exercise.primary_muscle || 'Unknown'} c={c} ty={ty} />
                                <MetaRow
                                    label="Equipment"
                                    value={(exercise.equipment_required || []).join(', ') || 'None listed'}
                                    muted={!exercise.equipment_required?.length}
                                    c={c}
                                    ty={ty}
                                />
                                <MetaRow label="Source" value={exercise.source_provider || 'Internal'} muted={!exercise.source_provider} c={c} ty={ty} />
                                <MetaRow
                                    label="Library Status"
                                    value={exercise.is_reference_only ? 'Reference only' : 'Program exercise'}
                                    c={c}
                                    ty={ty}
                                />
                            </View>
                        </GlassCard>

                        <GlassCard>
                            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, marginBottom: 8 }}>
                                Instructions
                            </Text>
                            {instructionSteps.length > 0 ? (
                                <View style={{ gap: 8 }}>
                                    {instructionSteps.map((step, idx) => (
                                        <View key={`${idx}-${step.slice(0, 20)}`} style={{ flexDirection: 'row', gap: 10 }}>
                                            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>{idx + 1}.</Text>
                                            <Text style={{ color: c.textMuted, lineHeight: 22, flex: 1 }}>{step}</Text>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                <Text style={{ color: c.textMuted, lineHeight: 22 }}>
                                    No instructions available.
                                </Text>
                            )}
                        </GlassCard>
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
