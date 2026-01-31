import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { metriqfitTheme } from '../../lib/theme';

const COLORS = metriqfitTheme.colors;

interface PlateCalculatorProps {
    initialWeight?: number;
}

export const PlateCalculator = ({ initialWeight = 135 }: PlateCalculatorProps) => {
    const [targetWeight, setTargetWeight] = useState(initialWeight.toString());
    const [barWeight, setBarWeight] = useState('45');
    const [plates, setPlates] = useState<number[]>([]);
    const [remainder, setRemainder] = useState(0);

    // Available plates (lbs)
    const availablePlates = [45, 35, 25, 10, 5, 2.5];

    useEffect(() => {
        calculatePlates();
    }, [targetWeight, barWeight]);

    const calculatePlates = () => {
        const target = parseFloat(targetWeight);
        const bar = parseFloat(barWeight);

        if (isNaN(target) || isNaN(bar) || target < bar) {
            setPlates([]);
            setRemainder(0);
            return;
        }

        let weightPerSide = (target - bar) / 2;
        const resultPlates: number[] = [];

        availablePlates.forEach(plate => {
            while (weightPerSide >= plate) {
                resultPlates.push(plate);
                weightPerSide -= plate;
            }
        });

        setPlates(resultPlates);
        setRemainder(weightPerSide * 2); // Total remainder
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Target Weight (lbs)</Text>
                    <TextInput
                        style={styles.input}
                        value={targetWeight}
                        onChangeText={setTargetWeight}
                        keyboardType="numeric"
                        maxLength={4}
                    />
                </View>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Bar Weight</Text>
                    <TouchableOpacity
                        style={styles.barSelector}
                        onPress={() => setBarWeight(barWeight === '45' ? '35' : '45')}
                    >
                        <Text style={styles.barText}>{barWeight} lbs</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.resultContainer}>
                <Text style={styles.sideLabel}>Per Side:</Text>
                <View style={styles.plateStack}>
                    {plates.length > 0 ? (
                        plates.map((plate, index) => (
                            <View key={index} style={[styles.plate, (styles as any)[`plate${plate}`]]}>
                                <Text style={styles.plateText}>{plate}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>Bar is empty</Text>
                    )}
                </View>
            </View>

            {remainder > 0 && (
                <Text style={styles.remainderText}>
                    Remainder: {remainder.toFixed(1)} lbs (cannot load perfect weight)
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
    },
    inputRow: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 16,
    },
    inputGroup: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
        padding: 12,
        borderRadius: 8,
        textAlign: 'center',
    },
    barSelector: {
        backgroundColor: COLORS.bg,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    barText: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: '600',
    },
    resultContainer: {
        alignItems: 'center',
    },
    sideLabel: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginBottom: 12,
    },
    plateStack: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 120, // max plate height
        gap: 2,
    },
    plate: {
        width: 24,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#000',
    },
    plateText: {
        color: '#000',
        fontSize: 10,
        fontWeight: 'bold',
        transform: [{ rotate: '-90deg' }],
        width: 40,
        textAlign: 'center',
    },
    // Plate specific styles for visual height/color
    plate45: { height: 120, backgroundColor: '#0D47A1' }, // Blue
    plate35: { height: 100, backgroundColor: '#F9A825' }, // Yellow
    plate25: { height: 80, backgroundColor: '#2E7D32' }, // Green
    plate10: { height: 60, backgroundColor: '#FFF' }, // White
    plate5: { height: 50, backgroundColor: '#424242', borderColor: '#FFF' }, // Black
    'plate2.5': { height: 40, backgroundColor: '#9E9E9E' }, // Grey

    emptyText: {
        color: COLORS.textMuted,
        fontStyle: 'italic',
    },
    remainderText: {
        color: COLORS.error, // or warning color
        fontSize: 12,
        textAlign: 'center',
        marginTop: 12,
    },
});
