import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, TextInput } from 'react-native';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface PlateCalculatorProps {
    initialWeight?: number;
    onClose?: () => void;
}

const AVAILABLE_PLATES = [45, 35, 25, 10, 5, 2.5];
const PLATE_COLORS: Record<number, string> = {
    45: '#0F52BA', // Blue
    35: '#F9C901', // Yellow
    25: '#228C22', // Green
    10: '#FFFFFF', // White
    5: '#D22B2B',  // Red
    2.5: '#000000', // Black
};

export function PlateCalculator({ initialWeight = 135, onClose }: PlateCalculatorProps) {
    const { c, ty, s } = useTokens();
    const [weight, setWeight] = useState(initialWeight.toString());
    const [barWeight, setBarWeight] = useState(45);

    const calculatePlates = (targetWeight: number, bar: number) => {
        let remaining = (targetWeight - bar) / 2;
        const plates: number[] = [];

        if (remaining <= 0) return [];

        AVAILABLE_PLATES.forEach(plate => {
            while (remaining >= plate) {
                plates.push(plate);
                remaining -= plate;
            }
        });

        return plates;
    };

    const plates = useMemo(() => {
        const w = parseFloat(weight);
        if (isNaN(w)) return [];
        return calculatePlates(w, barWeight);
    }, [weight, barWeight]);

    const adjustWeight = (amount: number) => {
        const current = parseFloat(weight) || 0;
        setWeight((current + amount).toString());
    };

    return (
        <View style={[
            styles.card,
            {
                backgroundColor: c.surface,
                borderColor: c.border,
                borderRadius: 24,
                borderWidth: 1,
                overflow: 'hidden',
                minHeight: 400, // Force height to prevent collapse
                width: '100%',
            }
        ]}>
            <View style={[styles.header, { borderBottomColor: c.border }]}>
                <Text style={[styles.title, { color: c.text, fontFamily: ty.body.familySemibold }]}>
                    Plate Calculator
                </Text>
                {onClose && (
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <TabBarIcon name="close" color={c.textMuted} size={20} />
                    </Pressable>
                )}
            </View>

            <View style={{ padding: s.lg }}>
                {/* Controls */}
                <View style={styles.controlsRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 4 }}>TARGET WEIGHT (LBS)</Text>
                        <View style={styles.weightControl}>
                            <Pressable onPress={() => adjustWeight(-5)} style={[styles.adjustBtn, { backgroundColor: c.surface2 }]}>
                                <Text style={{ color: c.text }}>-5</Text>
                            </Pressable>
                            <TextInput
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="numeric"
                                style={[styles.weightValue, { color: c.primary, fontFamily: ty.heading.familySemibold, padding: 0 }]}
                            />
                            <Pressable onPress={() => adjustWeight(5)} style={[styles.adjustBtn, { backgroundColor: c.surface2 }]}>
                                <Text style={{ color: c.text }}>+5</Text>
                            </Pressable>
                        </View>
                    </View>

                    <View>
                        <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 4 }}>BAR</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {[45, 35].map(b => (
                                <Pressable
                                    key={b}
                                    onPress={() => setBarWeight(b)}
                                    style={[
                                        styles.barBtn,
                                        {
                                            backgroundColor: barWeight === b ? c.primary : c.surface2,
                                            borderColor: barWeight === b ? c.primary : 'transparent'
                                        }
                                    ]}
                                >
                                    <Text style={{
                                        color: barWeight === b ? c.bg : c.text,
                                        fontFamily: ty.mono.family,
                                        fontSize: 12
                                    }}>{b}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Visual Representation */}
                <View style={[styles.barVisualContainer, { backgroundColor: '#1a1a1a' }]}>
                    <View style={[styles.barSleeve, { backgroundColor: '#888' }]} />
                    <View style={[styles.barCap, { backgroundColor: '#888' }]} />
                    <View style={styles.platesStack}>
                        {plates.map((plate, idx) => (
                            <View
                                key={`${plate}-${idx}`}
                                style={[
                                    styles.plate,
                                    {
                                        backgroundColor: PLATE_COLORS[plate],
                                        height: plate >= 45 ? 120 : plate >= 25 ? 90 : plate >= 10 ? 60 : 40,
                                        width: plate >= 45 ? 20 : 15,
                                        borderColor: '#000',
                                        borderWidth: 1
                                    }
                                ]}
                            >
                                <Text style={[
                                    styles.plateText,
                                    {
                                        color: plate === 10 || plate === 45 ? '#fff' : '#000',
                                        fontSize: plate >= 25 ? 10 : 0
                                    }
                                ]}>
                                    {plate}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Text Breakdown */}
                <View style={styles.breakdown}>
                    <Text style={{ color: c.text, fontFamily: ty.body.family }}>
                        {plates.length > 0
                            ? `Per side: ${Object.entries(
                                plates.reduce((acc, plate) => {
                                    acc[plate] = (acc[plate] || 0) + 1;
                                    return acc;
                                }, {} as Record<number, number>)
                            )
                                .sort((a, b) => Number(b[0]) - Number(a[0])) // Sort by weight descending
                                .map(([weight, count]) => `${count}x${weight}`)
                                .join(', ')}`
                            : 'Just the bar'
                        }
                    </Text>
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
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 20,
        marginBottom: 24,
    },
    weightControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    adjustBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    weightValue: {
        fontSize: 24,
        minWidth: 60,
        textAlign: 'center',
    },
    barBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    barVisualContainer: {
        height: 160,
        borderRadius: 12,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        flexDirection: 'row',
        paddingHorizontal: 40,
    },
    barSleeve: {
        position: 'absolute',
        height: 12,
        width: '100%',
        borderRadius: 6,
    },
    barCap: {
        position: 'absolute',
        right: 10,
        height: 30,
        width: 10,
        borderRadius: 2,
    },
    platesStack: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end', // Stack from inside out? No, bar usually loads inside out.
        // Let's pretend right side is inner.
        gap: 2,
        height: '100%',
        width: '100%',
        paddingRight: 40, // Space for cap
    },
    plate: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 2,
    },
    plateText: {
        transform: [{ rotate: '-90deg' }],
        fontWeight: 'bold',
    },
    breakdown: {
        alignItems: 'center',
        padding: 12,
    }
});
