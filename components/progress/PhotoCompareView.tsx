import React, { useMemo, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';
import type { ProgressPhoto, ProgressPhotoAngle } from '../../services/progressPhotoService';

interface PhotoCompareViewProps {
    photos: ProgressPhoto[];
    isLoading?: boolean;
}

const ANGLES: ProgressPhotoAngle[] = ['front', 'side', 'back'];

function formatDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

export function PhotoCompareView({ photos, isLoading }: PhotoCompareViewProps) {
    const { c, ty, s, r } = useTokens();
    const [selectedAngle, setSelectedAngle] = useState<ProgressPhotoAngle>('front');

    const anglePhotos = useMemo(() => {
        const filtered = photos.filter((p) => p.angle === selectedAngle);
        return filtered.sort((a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at));
    }, [photos, selectedAngle]);

    const earliest = anglePhotos.length > 0 ? anglePhotos[0] : null;
    const latest = anglePhotos.length > 1 ? anglePhotos[anglePhotos.length - 1] : null;

    return (
        <View style={styles.container}>
            {/* Angle selector */}
            <View style={styles.angleRow}>
                {ANGLES.map((angle) => (
                    <Pressable
                        key={angle}
                        style={[
                            styles.angleChip,
                            {
                                backgroundColor: selectedAngle === angle ? c.primary : c.surface,
                                borderColor: selectedAngle === angle ? c.primary : c.border,
                            },
                        ]}
                        onPress={() => setSelectedAngle(angle)}
                    >
                        <Text
                            style={[
                                styles.angleText,
                                {
                                    color: selectedAngle === angle ? c.bg : c.text,
                                    fontFamily: ty.body.familySemibold,
                                },
                            ]}
                        >
                            {angle.charAt(0).toUpperCase() + angle.slice(1)}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={c.primary} size="large" />
                </View>
            ) : !earliest ? (
                <View style={styles.emptyContainer}>
                    <TabBarIcon name="images-outline" color={c.textMuted} size={48} />
                    <Text style={[styles.emptyText, { color: c.textMuted, fontFamily: ty.body.family }]}>
                        No {selectedAngle} photos yet.{'\n'}Add photos during your weekly check-in.
                    </Text>
                </View>
            ) : (
                <View style={styles.compareRow}>
                    {/* Before */}
                    <View style={[styles.photoSlot, { borderColor: c.border, borderRadius: r.lg }]}>
                        <Text style={[styles.slotLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>
                            BEFORE
                        </Text>
                        {earliest.signed_url ? (
                            <Image source={{ uri: earliest.signed_url }} style={styles.photo} resizeMode="cover" />
                        ) : (
                            <View style={[styles.photo, { backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                                <TabBarIcon name="image-outline" color={c.textMuted} size={24} />
                            </View>
                        )}
                        <Text style={[styles.dateLabel, { color: c.text, fontFamily: ty.body.family }]}>
                            {formatDate(earliest.captured_at)}
                        </Text>
                    </View>

                    {/* Arrow */}
                    <View style={styles.arrowContainer}>
                        <TabBarIcon name="arrow-forward" color={c.primary} size={20} />
                    </View>

                    {/* After */}
                    <View style={[styles.photoSlot, { borderColor: c.border, borderRadius: r.lg }]}>
                        <Text style={[styles.slotLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>
                            AFTER
                        </Text>
                        {latest ? (
                            latest.signed_url ? (
                                <Image source={{ uri: latest.signed_url }} style={styles.photo} resizeMode="cover" />
                            ) : (
                                <View style={[styles.photo, { backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                                    <TabBarIcon name="image-outline" color={c.textMuted} size={24} />
                                </View>
                            )
                        ) : (
                            <View style={[styles.photo, { backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 11, textAlign: 'center', padding: 8 }}>
                                    Take another photo to compare
                                </Text>
                            </View>
                        )}
                        {latest && (
                            <Text style={[styles.dateLabel, { color: c.text, fontFamily: ty.body.family }]}>
                                {formatDate(latest.captured_at)}
                            </Text>
                        )}
                    </View>
                </View>
            )}

            {anglePhotos.length > 2 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.thumbnailRow}
                >
                    {anglePhotos.map((photo) => (
                        <View key={photo.id} style={[styles.thumbnail, { borderColor: c.border }]}>
                            {photo.signed_url ? (
                                <Image source={{ uri: photo.signed_url }} style={styles.thumbnailImage} resizeMode="cover" />
                            ) : (
                                <View style={[styles.thumbnailImage, { backgroundColor: c.surface2 }]} />
                            )}
                            <Text style={{ color: c.textMuted, fontSize: 9, fontFamily: ty.body.family, textAlign: 'center', marginTop: 2 }}>
                                {formatDate(photo.captured_at)}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    angleRow: {
        flexDirection: 'row',
        gap: 8,
    },
    angleChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    angleText: {
        fontSize: 13,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        textAlign: 'center',
        lineHeight: 20,
    },
    compareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    photoSlot: {
        flex: 1,
        borderWidth: 1,
        overflow: 'hidden',
        alignItems: 'center',
    },
    slotLabel: {
        fontSize: 10,
        letterSpacing: 1.5,
        paddingVertical: 6,
    },
    photo: {
        width: '100%',
        aspectRatio: 0.75,
    },
    dateLabel: {
        fontSize: 11,
        paddingVertical: 6,
    },
    arrowContainer: {
        width: 28,
        alignItems: 'center',
    },
    thumbnailRow: {
        gap: 8,
        paddingVertical: 4,
    },
    thumbnail: {
        width: 60,
        borderWidth: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },
    thumbnailImage: {
        width: '100%',
        aspectRatio: 1,
    },
});
