import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  PhotoCompareView,
  ProgressSectionShell,
} from '../../../components/progress';
import { GlassCard } from '../../../components/premium/GlassCard';
import { useProgressPhotoCompare } from '../../../hooks/useProgressBody';
import { useProfile } from '../../../hooks/useUser';
import {
  trackProgressBodyCtaTapped,
  trackProgressPhotoComparePairChanged,
  trackProgressPhotoCompareViewed,
} from '../../../lib/analytics';
import { useTokens } from '../../../lib/theme';
import type { ProgressPhotoAngle } from '../../../services/progressPhotoService';

function normalizeAngle(value: string | string[] | undefined): ProgressPhotoAngle {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'side' || raw === 'back' || raw === 'custom') return raw;
  return 'front';
}

export default function PhotoCompareScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const params = useLocalSearchParams<{ angle?: string; before?: string; after?: string }>();
  const [angle, setAngle] = useState<ProgressPhotoAngle>(() => normalizeAngle(params.angle));
  const [beforeCheckpointId, setBeforeCheckpointId] = useState<string | null>(
    typeof params.before === 'string' ? params.before : null,
  );
  const [afterCheckpointId, setAfterCheckpointId] = useState<string | null>(
    typeof params.after === 'string' ? params.after : null,
  );
  const { data: profile } = useProfile();

  const { data: snapshot, isLoading } = useProgressPhotoCompare(
    angle,
    beforeCheckpointId,
    afterCheckpointId,
  );

  useEffect(() => {
    trackProgressPhotoCompareViewed({ angle });
  }, [angle]);

  useEffect(() => {
    if (!snapshot?.beforeCheckpoint || !snapshot.afterCheckpoint) return;
    trackProgressPhotoComparePairChanged({
      angle,
      before_checkpoint_id: snapshot.beforeCheckpoint.checkpointId,
      after_checkpoint_id: snapshot.afterCheckpoint.checkpointId,
    });
  }, [angle, snapshot?.afterCheckpoint, snapshot?.beforeCheckpoint]);

  return (
    <ProgressSectionShell
      title="Compare"
      primarySection="body"
      secondarySection="body"
      secondaryItem="compare"
      showPrimaryNav={false}
      showSecondaryNav={false}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 90, gap: s.lg }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={{ padding: 18 }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Compare two check-in dates
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm, lineHeight: 20 }}>
            Pick the same angle across two checkpoints for a cleaner visual read on body composition changes.
          </Text>
        </GlassCard>

        {snapshot ? (
          <PhotoCompareView
            snapshot={snapshot}
            isLoading={isLoading}
            angle={angle}
            onAngleChange={(nextAngle) => {
              setAngle(nextAngle);
              setBeforeCheckpointId(null);
              setAfterCheckpointId(null);
            }}
            onBeforeChange={(checkpointId) => setBeforeCheckpointId(checkpointId)}
            onAfterChange={(checkpointId) => setAfterCheckpointId(checkpointId)}
            unitSystem={profile?.unit_system}
          />
        ) : null}

        {snapshot?.sparseState ? (
          <GlassCard style={{ padding: 18 }}>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
              Take another check-in to compare
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
              Compare mode works best once you have at least two checkpoints for the same angle.
            </Text>
            <Pressable
              onPress={() => {
                trackProgressBodyCtaTapped({ cta_id: 'compare_open_checkin', angle });
                router.push('/check-in');
              }}
              style={[styles.primaryButton, { marginTop: s.lg, borderRadius: r.md, backgroundColor: c.primary }]}
            >
              <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold }}>Open Weekly Check-in</Text>
            </Pressable>
          </GlassCard>
        ) : null}
      </ScrollView>
    </ProgressSectionShell>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
