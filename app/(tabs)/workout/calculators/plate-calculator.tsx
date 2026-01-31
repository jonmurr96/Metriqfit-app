import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlateCalculator } from '../../../../components/workout/PlateCalculator';
import { PremiumBackground } from '../../../../components/premium/PremiumBackground';
import { useTokens } from '../../../../lib/theme';
import { TabBarIcon } from '../../../../components/navigation/TabBarIcon';

export default function PlateCalculatorScreen() {
    const { c } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <PremiumBackground variant="subtle">
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    {/* Close Button Header */}
                    <View style={styles.header}>
                        <Pressable
                            onPress={() => router.back()}
                            style={styles.closeButton}
                            hitSlop={20}
                        >
                            <TabBarIcon name="close-circle" size={32} color={c.text} />
                        </Pressable>
                    </View>

                    <View style={styles.content}>
                        <PlateCalculator
                            initialWeight={135}
                            onClose={() => router.back()}
                            animated={false}
                        />
                    </View>
                </View>
            </PremiumBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingTop: 10,
        zIndex: 10,
    },
    closeButton: {
        opacity: 0.8,
    },
    content: {
        flex: 1,
        padding: 16,
        justifyContent: 'center', // Center vertically like a modal
    },
});
