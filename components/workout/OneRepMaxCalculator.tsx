import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface OneRepMaxCalculatorProps {
    onClose?: () => void;
    animated?: boolean;
}

export function OneRepMaxCalculator({ onClose, animated = true }: OneRepMaxCalculatorProps) {
    const { c, ty, s } = useTokens();
    const [weight, setWeight] = useState('135');
    const [reps, setReps] = useState('5');

    const calculateOneRepMax = (w: number, r: number) => {
        if (r === 1) return w;
        // Epley Formula
        const epley = w * (1 + r / 30);
        // Brzycki Formula
        const brzycki = w * (36 / (37 - r));

        // Average
        return Math.round((epley + brzycki) / 2);
    };

    const oneRepMax = useMemo(() => {
        const w = parseFloat(weight);
        const r = parseFloat(reps);
        if (isNaN(w) || isNaN(r) || r <= 0) return 0;
        return calculateOneRepMax(w, r);
    }, [weight, reps]);

    const percentages = [95, 90, 85, 80, 75, 70, 65, 60, 50];

    return (
        <View style={[
            styles.card,
            {
                backgroundColor: c.surface,
                borderColor: c.border,
                borderRadius: 24, // Matches r.lg usually
                borderWidth: 1,
                overflow: 'hidden'
            }
        ]}>
            <View style={[styles.header, { borderBottomColor: c.border }]}>
                <Text style={[styles.title, { color: c.text, fontFamily: ty.body.familySemibold }]}>
                    1RM Calculator
                </Text>
                {onClose && (
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <TabBarIcon name="close" color={c.textMuted} size={20} />
                    </Pressable>
                )}
            </View>

            <View style={{ padding: s.lg }}>
                <View style={styles.inputsRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 8 }}>WEIGHT</Text>
                        <TextInput
                            value={weight}
                            onChangeText={setWeight}
                            keyboardType="numeric"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                            blurOnSubmit
                            style={[styles.input, {
                                color: c.text,
                                backgroundColor: c.surface2,
                                fontFamily: ty.heading.familySemibold
                            }]}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 8 }}>REPS</Text>
                        <TextInput
                            value={reps}
                            onChangeText={setReps}
                            keyboardType="numeric"
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                            blurOnSubmit
                            style={[styles.input, {
                                color: c.text,
                                backgroundColor: c.surface2,
                                fontFamily: ty.heading.familySemibold
                            }]}
                        />
                    </View>
                </View>

                <View style={{ alignItems: 'center', marginVertical: 24 }}>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 14 }}>ESTIMATED 1RM</Text>
                    <Text style={{ color: c.primary, fontFamily: ty.heading.familySemibold, fontSize: 48 }}>
                        {oneRepMax}
                        <Text style={{ fontSize: 20, color: c.textMuted }}> lbs</Text>
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {percentages.map(pct => (
                        <View key={pct} style={[styles.pctBadge, { backgroundColor: c.surface2 }]}>
                            <Text style={{ color: c.textMuted, fontSize: 10, fontFamily: ty.mono.family }}>{pct}%</Text>
                            <Text style={{ color: c.text, fontSize: 14, fontFamily: ty.body.familySemibold }}>
                                {Math.round(oneRepMax * (pct / 100))}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
    },
    closeBtn: {
        padding: 4,
    },
    inputsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    input: {
        height: 50,
        borderRadius: 12,
        textAlign: 'center',
        fontSize: 24,
    },
    pctBadge: {
        width: '30%',
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
    }
});
