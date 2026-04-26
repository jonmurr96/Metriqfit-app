import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTokens } from '../../lib/theme';

interface FreshnessChipProps {
    lastUpdatedIso: string | null;
}

function computeFreshness(iso: string | null): { label: string; color: 'green' | 'yellow' | 'red' } {
    if (!iso) return { label: 'No data', color: 'red' };
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return { label: 'Unknown', color: 'red' };
    const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
    if (days <= 0) return { label: 'Updated today', color: 'green' };
    if (days === 1) return { label: '1d ago', color: 'green' };
    if (days <= 7) return { label: `${days}d ago`, color: 'yellow' };
    return { label: `${days}d ago`, color: 'red' };
}

const DOT_COLORS = {
    green: '#00D4AA',
    yellow: '#FFB946',
    red: '#FF5C5C',
};

export function FreshnessChip({ lastUpdatedIso }: FreshnessChipProps) {
    const { ty } = useTokens();
    const { label, color } = computeFreshness(lastUpdatedIso);

    return (
        <View style={styles.container}>
            <View style={[styles.dot, { backgroundColor: DOT_COLORS[color] }]} />
            <Text style={[styles.label, { fontFamily: ty.body.family }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    label: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: 0.3,
    },
});
