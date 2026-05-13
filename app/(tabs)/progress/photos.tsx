import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BodyCheckpointCard,
  ProgressSectionShell,
} from '../../../components/progress';
import { GlassCard } from '../../../components/premium/GlassCard';
import {
  useLatestBodyCheckInStatus,
  useProgressBodyTimeline,
} from '../../../hooks/useProgressBody';
import { useDeleteProgressPhoto } from '../../../hooks/useProgressPhotos';
import { useProfile } from '../../../hooks/useUser';
import {
  trackProgressBodyCheckpointSelected,
  trackProgressBodyCtaTapped,
  trackProgressBodyTimelineViewed,
  trackProgressPhotoDeleted,
  trackProgressPhotoTimelineViewed,
} from '../../../lib/analytics';
import { useTokens } from '../../../lib/theme';
import { formatWeightKg } from '../../../lib/progress/weight-units';

function formatDate(iso: string | null) {
  if (!iso) return 'No check-in yet';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'No check-in yet';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProgressPhotosScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const { data: timeline, isLoading } = useProgressBodyTimeline(24);
  const { data: latestStatus } = useLatestBodyCheckInStatus();
  const { data: profile } = useProfile();
  const deletePhotoMutation = useDeleteProgressPhoto();

  useEffect(() => {
    trackProgressPhotoTimelineViewed({ source: 'progress_body' });
    trackProgressBodyTimelineViewed({ source: 'progress_body' });
  }, []);

  const handleDeletePhoto = (photoId: string) => {
    deletePhotoMutation.mutate(photoId, {
      onSuccess: () => {
        trackProgressPhotoDeleted({ source: 'progress_body' });
      },
      onError: (error: any) => {
        Alert.alert('Delete failed', error?.message || 'Could not delete this photo.');
      },
    });
  };

  const openCompare = (params?: { after?: string; before?: string }) => {
    trackProgressBodyCtaTapped({ cta_id: 'body_open_compare', ...params });
    router.push({
      pathname: '/(tabs)/progress/photo-compare',
      params,
    } as any);
  };

  return (
    <ProgressSectionShell
      title="Body"
      primarySection="body"
      secondarySection="body"
      secondaryItem="timeline"
      showPrimaryNav={false}
      showSecondaryNav={false}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 90, gap: s.lg }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={{ padding: 20 }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
            Check-in archive
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm, lineHeight: 20 }}>
            Each checkpoint is treated as a front, side, and back bundle so comparisons stay consistent over time.
          </Text>

          <View style={[styles.statusRow, { marginTop: s.lg }]}>
            <View style={styles.statusBlock}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>Latest check-in</Text>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: 4 }}>
                {formatDate(latestStatus?.latestCheckInAt || null)}
              </Text>
            </View>
            <View style={styles.statusBlock}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>Weight</Text>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: 4 }}>
                {formatWeightKg(latestStatus?.latestWeightKg, profile?.unit_system)}
              </Text>
            </View>
            <View style={styles.statusBlock}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>Body fat</Text>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: 4 }}>
                {latestStatus?.latestBodyFatPercentage == null ? '--' : `${latestStatus.latestBodyFatPercentage}%`}
              </Text>
            </View>
          </View>

          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.md }}>
                {latestStatus?.latestPhotoCheckpointCount || 0} photo checkpoints saved
          </Text>

          <View style={[styles.ctaRow, { marginTop: s.lg, gap: s.sm }]}>
            <Pressable
              onPress={() => {
                trackProgressBodyCtaTapped({ cta_id: 'body_open_checkin' });
                router.push('/check-in');
              }}
              style={[styles.primaryButton, { borderRadius: r.md, backgroundColor: c.primary }]}
            >
              <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold }}>Open Weekly Check-in</Text>
            </Pressable>
            <Pressable
              onPress={() => openCompare()}
              style={[styles.secondaryButton, { borderRadius: r.md, borderColor: c.border, backgroundColor: c.surface }]}
            >
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>Compare Latest Checkpoints</Text>
            </Pressable>
          </View>
        </GlassCard>

        <View>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
            Checkpoint timeline
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
              Complete checkpoints are best for comparisons. Missing angles are shown directly on each card.
          </Text>
        </View>

        {isLoading && !timeline ? (
          <View style={[styles.loadingWrap, { borderRadius: r.lg, backgroundColor: c.surface }]}>
            <ActivityIndicator size="small" color={c.primary} />
          </View>
        ) : !timeline || timeline.checkpoints.length === 0 ? (
          <GlassCard style={{ padding: 22 }}>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
              No checkpoints yet
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
              Your first weekly check-in will start this timeline and unlock compare mode.
            </Text>
            <Pressable
              onPress={() => {
                trackProgressBodyCtaTapped({ cta_id: 'body_empty_open_checkin' });
                router.push('/check-in');
              }}
              style={[styles.primaryButton, { marginTop: s.lg, borderRadius: r.md, backgroundColor: c.primary }]}
            >
              <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold }}>Open Weekly Check-in</Text>
            </Pressable>
          </GlassCard>
        ) : (
          <View style={{ gap: s.md }}>
            {timeline.checkpoints.map((checkpoint) => (
              <BodyCheckpointCard
                key={checkpoint.checkpointId}
                checkpoint={checkpoint}
                onCompareWithPrevious={(afterCheckpointId, beforeCheckpointId) => {
                  trackProgressBodyCheckpointSelected({
                    checkpoint_id: afterCheckpointId,
                    action: 'compare_previous',
                  });
                  openCompare({ after: afterCheckpointId, before: beforeCheckpointId });
                }}
                onOpenCompare={(afterCheckpointId) => {
                  trackProgressBodyCheckpointSelected({
                    checkpoint_id: afterCheckpointId,
                    action: 'open_compare',
                  });
                  openCompare({ after: afterCheckpointId });
                }}
                onOpenCheckIn={() => {
                  trackProgressBodyCtaTapped({ cta_id: 'body_checkpoint_open_checkin' });
                  router.push('/check-in');
                }}
                onDeletePhoto={handleDeletePhoto}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </ProgressSectionShell>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statusBlock: {
    flex: 1,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  loadingWrap: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
