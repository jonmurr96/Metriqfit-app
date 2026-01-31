import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTokens } from '../../lib/theme';

interface PlanChange {
    type: 'SWAP' | 'ADD' | 'REMOVE' | 'MODIFY';
    target: string;
    replacement?: string;
    detail?: string;
}

interface PlanUpdateCardProps {
    dayName: string;
    changes: PlanChange[];
    onApprove: () => void;
    onReject: () => void;
    isApproved?: boolean;
    isRejected?: boolean;
}

export const PlanUpdateCard = ({
    dayName,
    changes,
    onApprove,
    onReject,
    isApproved,
    isRejected
}: PlanUpdateCardProps) => {
    const { c, s, ty, r } = useTokens();

    if (isRejected) {
        return (
            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                style={[styles.container, { borderColor: c.danger, borderWidth: 1 }]}
            >
                <Text style={{ color: c.textMuted, fontSize: ty.sizes.sm }}>Plan updates rejected.</Text>
            </MotiView>
        );
    }

    if (isApproved) {
        return (
            <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={[styles.container, { borderColor: c.success, borderWidth: 1, backgroundColor: c.surface2 }]}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={20} color={c.success} />
                    <Text style={{ color: c.text, fontSize: ty.sizes.sm, fontFamily: ty.body.familySemibold }}>
                        Plan updated successfully!
                    </Text>
                </View>
            </MotiView>
        );
    }

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={[
                styles.container,
                {
                    backgroundColor: c.surface2,
                    borderRadius: r.lg,
                    borderWidth: 1,
                    borderColor: c.primary + '40',
                },
            ]}
        >
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="construct" size={18} color={c.primary} />
                    <Text style={[styles.title, { color: c.text, fontFamily: ty.body.familySemibold }]}>
                        Plan Adjustment
                    </Text>
                </View>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>{dayName}</Text>
            </View>

            <View style={{ marginVertical: s.md }}>
                {changes.map((change, index) => (
                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Ionicons name="arrow-forward" size={14} color={c.textMuted} style={{ marginRight: 8 }} />
                        <Text style={{ color: c.text, fontSize: 14, flex: 1 }}>
                            {change.type === 'SWAP' ? (
                                <>
                                    Swap <Text style={{ color: c.textMuted }}>{change.target}</Text> for <Text style={{ color: c.primary, fontWeight: 'bold' }}>{change.replacement}</Text>
                                </>
                            ) : change.type === 'MODIFY' ? (
                                <>
                                    Update <Text style={{ color: c.primary }}>{change.target}</Text>: {change.detail}
                                </>
                            ) : (
                                change.detail
                            )}
                        </Text>
                    </View>
                ))}
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    onPress={onReject}
                    style={[styles.button, { borderColor: c.border, borderWidth: 1 }]}
                >
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold }}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onApprove}
                    style={[styles.button, { backgroundColor: c.primary }]}
                >
                    <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold }}>Approve Changes</Text>
                </TouchableOpacity>
            </View>
        </MotiView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 16, // align with bubbles
        alignSelf: 'flex-start', // like bot message
        width: '85%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    title: {
        fontSize: 14,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    button: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
