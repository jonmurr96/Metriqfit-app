import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useDeleteProgressPhoto, useProgressPhotos } from '../../../hooks/useProgressPhotos';
import { trackProgressCtaTapped, trackProgressPhotoDeleted, trackProgressPhotoTimelineViewed } from '../../../lib/analytics';

function groupDateLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown Date';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProgressPhotosScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: photos, isLoading } = useProgressPhotos(120);
  const deletePhotoMutation = useDeleteProgressPhoto();

  useEffect(() => {
    trackProgressPhotoTimelineViewed({ source: 'progress_tab' });
  }, []);

  const grouped = useMemo(() => {
    const rows = photos || [];
    const map = new Map<string, typeof rows>();
    rows.forEach((row) => {
      const key = row.measurement_id || row.captured_at.split('T')[0];
      const bucket = map.get(key) || [];
      bucket.push(row);
      map.set(key, bucket);
    });
    return Array.from(map.values()).map((bucket) =>
      [...bucket].sort((a, b) => Date.parse(b.captured_at) - Date.parse(a.captured_at)),
    );
  }, [photos]);

  const handleDeletePhoto = (photoId: string) => {
    Alert.alert(
      'Delete photo?',
      'This removes the photo from your timeline permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePhotoMutation.mutate(photoId, {
              onSuccess: () => {
                trackProgressPhotoDeleted({ source: 'progress_tab' });
              },
              onError: (error: any) => {
                Alert.alert('Delete failed', error?.message || 'Could not delete this photo.');
              },
            });
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bg }]}
      contentContainerStyle={{ paddingTop: insets.top + s.md, paddingBottom: 100, paddingHorizontal: s.lg }}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 18 }}>Progress Photos</Text>
        <View style={styles.backButton} />
      </View>

      <View style={[styles.heroCard, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg, marginTop: s.xl }]}>
        <View style={[styles.iconBubble, { backgroundColor: `${c.primary}18` }]}>
          <TabBarIcon name="camera" color={c.primary} size={28} />
        </View>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 20, marginTop: s.md }}>
          Visual Progress Timeline
        </Text>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, textAlign: 'center', marginTop: s.sm, lineHeight: 20 }}>
          Capture front, side, and back shots during weekly check-in. Photos are private and tied to your progress history.
        </Text>
        <Pressable
          onPress={() => {
            trackProgressCtaTapped({ cta_id: 'progress_photos_open_checkin' });
            router.push('/check-in');
          }}
          style={[styles.primaryButton, { backgroundColor: c.primary, borderRadius: r.md, marginTop: s.lg }]}
        >
          <TabBarIcon name="scan-outline" color={c.bg} size={18} />
          <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, marginLeft: 8 }}>Open Weekly Check-in</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            trackProgressCtaTapped({ cta_id: 'progress_photos_compare' });
            router.push('/(tabs)/progress/photo-compare');
          }}
          style={[styles.primaryButton, { backgroundColor: c.surface, borderRadius: r.md, marginTop: s.sm, borderWidth: 1, borderColor: c.primary }]}
        >
          <TabBarIcon name="images-outline" color={c.primary} size={18} />
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, marginLeft: 8 }}>Compare Photos</Text>
        </Pressable>
      </View>

      <View style={[styles.timelineCard, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg, marginTop: s.lg }]}>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 16 }}>Timeline</Text>

        {isLoading ? (
          <View style={{ marginTop: s.lg, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={c.primary} />
          </View>
        ) : grouped.length === 0 ? (
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: s.sm }}>
            No photos yet. Add your first set in Weekly Check-in.
          </Text>
        ) : (
          grouped.map((bucket) => (
            <View key={bucket[0].id} style={{ marginTop: s.md }}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 12, marginBottom: 8 }}>
                {groupDateLabel(bucket[0].captured_at)}
              </Text>
              <View style={styles.photoRow}>
                {bucket.map((photo) => (
                  <View key={photo.id} style={[styles.photoTile, { borderRadius: r.md, borderColor: c.border }]}>
                    {photo.signed_url ? (
                      <Image source={{ uri: photo.signed_url }} style={styles.photoImage} />
                    ) : (
                      <View style={[styles.photoImage, { alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface2 }]}>
                        <TabBarIcon name="image-outline" color={c.textMuted} size={18} />
                      </View>
                    )}
                    <View style={styles.photoMetaRow}>
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                        {photo.angle.toUpperCase()}
                      </Text>
                      <Pressable onPress={() => handleDeletePhoto(photo.id)}>
                        <TabBarIcon name="trash-outline" color={c.warning} size={14} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCard: {
    borderWidth: 1,
    padding: 16,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoTile: {
    width: 100,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    aspectRatio: 0.75,
  },
  photoMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});

