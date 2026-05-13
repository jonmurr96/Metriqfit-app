import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface PlateCalculatorProps {
    initialWeight?: number;
    onClose?: () => void;
}

type UnitSystem = 'lbs' | 'kg';

// ─── Plate data ───────────────────────────────────────────────────────────────

const LBS_PLATES = [45, 35, 25, 10, 5, 2.5];
const KG_PLATES  = [25, 20, 15, 10, 5, 2.5, 1.25];

const LBS_BARS = [45, 35];
const KG_BARS  = [20, 15];

// Olympic colour standards
const PLATE_COLORS: Record<UnitSystem, Record<string, string>> = {
    lbs: {
        '45':  '#0F52BA', // blue
        '35':  '#F9C901', // yellow
        '25':  '#228C22', // green
        '10':  '#FFFFFF', // white
        '5':   '#D22B2B', // red
        '2.5': '#111111', // black
    },
    kg: {
        '25':   '#D22B2B', // red
        '20':   '#0F52BA', // blue
        '15':   '#F9C901', // yellow
        '10':   '#228C22', // green
        '5':    '#FFFFFF', // white
        '2.5':  '#D22B2B', // red (smaller)
        '1.25': '#C0C0C0', // chrome
    },
};

// Plates whose background is dark enough for white text
const DARK_BG_COLORS = new Set(['#0F52BA', '#228C22', '#D22B2B', '#111111']);

function plateColor(plate: number, unit: UnitSystem): string {
    return PLATE_COLORS[unit][String(plate)] ?? '#888888';
}

function plateHeight(plate: number, unit: UnitSystem): number {
    if (unit === 'lbs') {
        if (plate >= 45) return 120;
        if (plate >= 35) return 100;
        if (plate >= 25) return 80;
        if (plate >= 10) return 60;
        if (plate >= 5)  return 40;
        return 28;
    }
    if (plate >= 25) return 120;
    if (plate >= 20) return 105;
    if (plate >= 15) return 88;
    if (plate >= 10) return 70;
    if (plate >= 5)  return 50;
    if (plate >= 2.5) return 34;
    return 24;
}

function plateWidth(plate: number, unit: UnitSystem): number {
    if (unit === 'lbs') return plate >= 45 ? 20 : 15;
    if (plate >= 20) return 22;
    if (plate >= 15) return 20;
    return 15;
}

function roundTo(value: number, step: number): number {
    return Math.round(value / step) * step;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlateCalculator({ initialWeight = 135, onClose }: PlateCalculatorProps) {
    const { c, ty, s } = useTokens();

    const [unit, setUnit]           = useState<UnitSystem>('lbs');
    const [weight, setWeight]       = useState(initialWeight.toString());
    const [barWeight, setBarWeight] = useState(45);

    const availablePlates = unit === 'lbs' ? LBS_PLATES : KG_PLATES;
    const availableBars   = unit === 'lbs' ? LBS_BARS   : KG_BARS;
    const weightStep      = unit === 'lbs' ? 5          : 2.5;

    // ── Unit toggle: convert weight + bar ───────────────────────────────────
    const handleToggleUnit = (next: UnitSystem) => {
        if (next === unit) return;
        Keyboard.dismiss();

        const current = parseFloat(weight) || 0;

        if (next === 'kg') {
            setWeight(String(roundTo(current / 2.2046, 2.5) || 60));
            setBarWeight(barWeight >= 45 ? 20 : 15);
        } else {
            setWeight(String(roundTo(current * 2.2046, 5) || 135));
            setBarWeight(barWeight >= 20 ? 45 : 35);
        }

        setUnit(next);
    };

    // ── Greedy plate algorithm ───────────────────────────────────────────────
    const calculatePlates = (target: number, bar: number, plates: number[]): number[] => {
        let remaining = (target - bar) / 2;
        const result: number[] = [];
        if (remaining <= 0) return [];

        for (const plate of plates) {
            while (remaining >= plate - 0.001) {
                result.push(plate);
                remaining = Math.round((remaining - plate) * 10000) / 10000;
            }
        }
        return result;
    };

    const plates = useMemo(() => {
        const w = parseFloat(weight);
        if (isNaN(w)) return [];
        return calculatePlates(w, barWeight, availablePlates);
    }, [weight, barWeight, availablePlates]);

    const adjustWeight = (delta: number) => {
        const current = parseFloat(weight) || 0;
        setWeight(String(current + delta));
    };

    // ── Breakdown label ──────────────────────────────────────────────────────
    const breakdownText = useMemo(() => {
        if (plates.length === 0) return 'Just the bar';
        const counts = plates.reduce<Record<number, number>>((acc, p) => {
            acc[p] = (acc[p] ?? 0) + 1;
            return acc;
        }, {});
        const parts = Object.entries(counts)
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([w, n]) => `${n}×${w} ${unit}`);
        return `Per side: ${parts.join(', ')}`;
    }, [plates, unit]);

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: c.surface,
                    borderColor: c.border,
                    borderRadius: 24,
                    borderWidth: 1,
                    overflow: 'hidden',
                    minHeight: 400,
                    width: '100%',
                },
            ]}
        >
            {/* ── Card header ─────────────────────────────────────────────── */}
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

                {/* ── Unit toggle ─────────────────────────────────────────── */}
                <View style={styles.unitToggleRow}>
                    <View style={[styles.unitToggleTrack, { backgroundColor: c.surface2, borderRadius: 8 }]}>
                        {(['lbs', 'kg'] as UnitSystem[]).map((u) => (
                            <Pressable
                                key={u}
                                onPress={() => handleToggleUnit(u)}
                                style={[
                                    styles.unitToggleBtn,
                                    {
                                        backgroundColor: unit === u ? c.primary : 'transparent',
                                        borderRadius: 6,
                                    },
                                ]}
                            >
                                <Text
                                    style={{
                                        color: unit === u ? c.bg : c.textMuted,
                                        fontFamily: ty.body.familySemibold,
                                        fontSize: 12,
                                        letterSpacing: 0.6,
                                    }}
                                >
                                    {u.toUpperCase()}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* ── Weight + Bar controls ────────────────────────────────── */}
                <View style={styles.controlsRow}>
                    {/* Target weight */}
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 4, letterSpacing: 0.4 }}>
                            TARGET WEIGHT ({unit.toUpperCase()})
                        </Text>
                        <View style={styles.weightControl}>
                            <Pressable
                                onPress={() => adjustWeight(-weightStep)}
                                style={[styles.adjustBtn, { backgroundColor: c.surface2 }]}
                            >
                                <Text style={{ color: c.text, fontSize: 12 }}>-{weightStep}</Text>
                            </Pressable>
                            <TextInput
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="numeric"
                                returnKeyType="done"
                                onSubmitEditing={Keyboard.dismiss}
                                blurOnSubmit
                                style={[
                                    styles.weightValue,
                                    { color: c.primary, fontFamily: ty.heading.familySemibold, padding: 0 },
                                ]}
                            />
                            <Pressable
                                onPress={() => adjustWeight(weightStep)}
                                style={[styles.adjustBtn, { backgroundColor: c.surface2 }]}
                            >
                                <Text style={{ color: c.text, fontSize: 12 }}>+{weightStep}</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Bar selector */}
                    <View>
                        <Text style={{ color: c.textMuted, fontSize: 12, marginBottom: 4, letterSpacing: 0.4 }}>
                            BAR ({unit.toUpperCase()})
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {availableBars.map((b) => (
                                <Pressable
                                    key={b}
                                    onPress={() => setBarWeight(b)}
                                    style={[
                                        styles.barBtn,
                                        {
                                            backgroundColor: barWeight === b ? c.primary : c.surface2,
                                            borderColor: barWeight === b ? c.primary : 'transparent',
                                        },
                                    ]}
                                >
                                    <Text
                                        style={{
                                            color: barWeight === b ? c.bg : c.text,
                                            fontFamily: ty.mono.family,
                                            fontSize: 12,
                                        }}
                                    >
                                        {b}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                </View>

                {/* ── Visual bar ──────────────────────────────────────────── */}
                <View style={[styles.barVisualContainer, { backgroundColor: '#1a1a1a' }]}>
                    <View style={[styles.barSleeve, { backgroundColor: '#888' }]} />
                    <View style={[styles.barCap,    { backgroundColor: '#888' }]} />
                    <View style={styles.platesStack}>
                        {plates.map((plate, idx) => {
                            const bgColor   = plateColor(plate, unit);
                            const h         = plateHeight(plate, unit);
                            const w         = plateWidth(plate, unit);
                            const textColor = DARK_BG_COLORS.has(bgColor) ? '#fff' : '#000';
                            const showLabel = plate >= (unit === 'lbs' ? 10 : 5);
                            return (
                                <View
                                    key={`${plate}-${idx}`}
                                    style={[
                                        styles.plate,
                                        {
                                            backgroundColor: bgColor,
                                            height: h,
                                            width: w,
                                            borderColor: '#000',
                                            borderWidth: 1,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.plateText,
                                            { color: textColor, fontSize: showLabel ? 9 : 0 },
                                        ]}
                                    >
                                        {plate}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* ── Text breakdown ──────────────────────────────────────── */}
                <View style={styles.breakdown}>
                    <Text style={{ color: c.text, fontFamily: ty.body.family }}>
                        {breakdownText}
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
    // ── Unit toggle ──────────────────────────────────────────────────────────
    unitToggleRow: {
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    unitToggleTrack: {
        flexDirection: 'row',
        padding: 3,
        gap: 2,
    },
    unitToggleBtn: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // ── Controls ─────────────────────────────────────────────────────────────
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
        width: 36,
        height: 36,
        borderRadius: 18,
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
    // ── Visual bar ───────────────────────────────────────────────────────────
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
        justifyContent: 'flex-end',
        gap: 2,
        height: '100%',
        width: '100%',
        paddingRight: 40,
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
    // ── Breakdown ────────────────────────────────────────────────────────────
    breakdown: {
        alignItems: 'center',
        padding: 12,
    },
});
