import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { PhotoCompareView } from '../../../components/progress/PhotoCompareView';
import { useProgressPhotos } from '../../../hooks/useProgressPhotos';
import { trackProgressPhotoCompareViewed } from '../../../lib/analytics';

export default function PhotoCompareScreen() {
    const { c, ty, s } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { data: photos, isLoading } = useProgressPhotos();

    useEffect(() => {
        trackProgressPhotoCompareViewed();
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: s.lg }]}>
                <Pressable
                    onPress={() => router.back()}
                    style={[styles.backButton, { backgroundColor: c.surface }]}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <TabBarIcon name="chevron-back" color={c.text} size={24} />
                </Pressable>
                <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}>
                    Compare Photos
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={[styles.content, { padding: s.lg }]}>
                <PhotoCompareView photos={photos || []} isLoading={isLoading} />
            </ScrollView>
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
    },
    placeholder: {
        width: 40,
    },
    content: {
        paddingBottom: 40,
    },
});
