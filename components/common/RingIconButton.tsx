import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';

interface RingIconButtonProps {
    icon: string;
    label: string;
    onPress: () => void;
    size?: number;
    delay?: number;
    active?: boolean;
}

/**
 * Premium ring icon button matching reference design.
 * Features: 2px cyan ring border, centered icon, label below.
 */
export function RingIconButton({
    icon,
    label,
    onPress,
    size = 64,
    delay = 0,
    active = false,
}: RingIconButtonProps) {
    const { c, ty, s } = useTokens();

    return (
        <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                type: 'spring',
                damping: 15,
                stiffness: 150,
                delay,
            }}
            style={styles.container}
        >
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.pressable,
                    { minWidth: size + 12 },
                    { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
            >
                {({ pressed }) => (
                    <>
                        {/* The Ring */}
                        <View
                            style={[
                                styles.ring,
                                {
                                    width: size,
                                    height: size,
                                    borderRadius: size / 2,
                                    borderWidth: 2,
                                    borderColor: active || pressed ? c.primary : `${c.primary}60`,
                                    backgroundColor: active ? `${c.primary}15` : pressed ? `${c.primary}08` : 'transparent',
                                },
                                // Add glow effect when active
                                active && {
                                    shadowColor: c.primary,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.5,
                                    shadowRadius: 12,
                                },
                                active && Platform.OS === 'web' && {
                                    boxShadow: `0 0 20px ${c.primary}40, 0 0 40px ${c.primary}20`,
                                } as any,
                            ]}
                        >
                            <TabBarIcon
                                name={icon as any}
                                color={c.primary}
                                size={size * 0.375}
                            />
                        </View>

                        {/* Label */}
                        <Text
                            style={[
                                styles.label,
                                {
                                    color: active ? c.primary : c.textMuted,
                                    fontFamily: ty.body.familySemibold,
                                    fontSize: 10,
                                    lineHeight: 13,
                                    letterSpacing: 1.2,
                                    marginTop: s.sm,
                                    maxWidth: size + 16,
                                },
                            ]}
                        >
                            {label.toUpperCase()}
                        </Text>
                    </>
                )}
            </Pressable>
        </MotiView>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    pressable: {
        alignItems: 'center',
    },
    ring: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        textAlign: 'center',
    },
});
