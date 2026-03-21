import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';
import { ComparePairSelector } from './ComparePairSelector';
import type { ProgressPhotoAngle } from '../../services/progressPhotoService';
import type { ProgressPhotoCompareSnapshot } from '../../services/progressBodyService';

export interface PhotoCompareViewProps {
  snapshot: ProgressPhotoCompareSnapshot;
  isLoading?: boolean;
  angle: ProgressPhotoAngle;
  onAngleChange: (angle: ProgressPhotoAngle) => void;
  onBeforeChange: (checkpointId: string) => void;
  onAfterChange: (checkpointId: string) => void;
}

const ANGLES: ProgressPhotoAngle[] = ['front', 'side', 'back', 'custom'];

function formatDate(iso: string | null) {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDelta(value: number | null, unit: string) {
  if (value == null) return `-- ${unit}`;
  return `${value > 0 ? '+' : ''}${value} ${unit}`;
}

function sparseMessage(snapshot: ProgressPhotoCompareSnapshot) {
  if (snapshot.sparseState === 'no_photos') return 'No body checkpoints yet. Take a weekly check-in to start comparing.';
  if (snapshot.sparseState === 'one_checkpoint') return 'Not enough checkpoints for this angle yet. Take another check-in to compare.';
  return 'Not enough checkpoints for this angle.';
}

export function PhotoCompareView({
  snapshot,
  isLoading,
  angle,
  onAngleChange,
  onBeforeChange,
  onAfterChange,
}: PhotoCompareViewProps) {
  const { c, ty, s, r } = useTokens();

  return (
    <View style={styles.container}>
      <View style={styles.angleRow}>
        {ANGLES.filter((candidate) => snapshot.availableAngles.includes(candidate) || candidate === angle).map((candidate) => {
          const isSelected = candidate === angle;
          const isDisabled = !snapshot.availableAngles.includes(candidate);
          return (
            <Pressable
              key={candidate}
              onPress={() => {
                if (isDisabled) return;
                onAngleChange(candidate);
              }}
              style={[
                styles.angleChip,
                {
                  borderRadius: r.pill,
                  backgroundColor: isSelected ? `${c.primary}14` : c.surface,
                  borderColor: isSelected ? c.primary : c.border,
                  opacity: isDisabled ? 0.45 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: isSelected ? c.primary : c.textMuted,
                  fontFamily: isSelected ? ty.body.familySemibold : ty.body.family,
                  fontSize: ty.sizes.xs,
                }}
              >
                {candidate.charAt(0).toUpperCase() + candidate.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {snapshot.checkpointOptions.length > 0 ? (
        <>
          <ComparePairSelector
            label="Before checkpoint"
            options={snapshot.checkpointOptions.map((option) => ({
              id: option.checkpointId,
              label: option.label,
              meta: formatDate(option.capturedAt),
            }))}
            selectedId={snapshot.beforeCheckpoint?.checkpointId || null}
            onSelect={onBeforeChange}
          />
          <ComparePairSelector
            label="After checkpoint"
            options={snapshot.checkpointOptions.map((option) => ({
              id: option.checkpointId,
              label: option.label,
              meta: formatDate(option.capturedAt),
            }))}
            selectedId={snapshot.afterCheckpoint?.checkpointId || null}
            onSelect={onAfterChange}
          />
        </>
      ) : null}

      <View
        style={[
          styles.summaryStrip,
          {
            borderRadius: r.lg,
            borderColor: c.border,
            backgroundColor: c.surface,
          },
        ]}
      >
        <View style={styles.summaryCell}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>Time delta</Text>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: 4 }}>
            {snapshot.daysBetween == null ? '--' : `${snapshot.daysBetween} days`}
          </Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>Weight delta</Text>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: 4 }}>
            {formatDelta(snapshot.weightDeltaKg, 'kg')}
          </Text>
        </View>
        <View style={styles.summaryCell}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>Body-fat delta</Text>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: 4 }}>
            {formatDelta(snapshot.bodyFatDelta, '%')}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Loading compare view...</Text>
        </View>
      ) : snapshot.sparseState ? (
        <View
          style={[
            styles.emptyContainer,
            { borderRadius: r.lg, borderColor: c.border, backgroundColor: c.surface },
          ]}
        >
          <TabBarIcon name="images-outline" color={c.textMuted} size={42} />
          <Text
            style={{
              color: c.text,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.md,
              textAlign: 'center',
              marginTop: s.md,
            }}
          >
            Not enough checkpoints
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.sm,
              textAlign: 'center',
              marginTop: s.sm,
              lineHeight: 20,
            }}
          >
            {sparseMessage(snapshot)}
          </Text>
        </View>
      ) : (
        <View style={styles.compareRow}>
          {[
            { key: 'before', label: 'Before', checkpoint: snapshot.beforeCheckpoint },
            { key: 'after', label: 'After', checkpoint: snapshot.afterCheckpoint },
          ].map((entry) => (
            <View
              key={entry.key}
              style={[
                styles.photoSlot,
                {
                  borderRadius: r.lg,
                  borderColor: c.border,
                  backgroundColor: c.surface,
                },
              ]}
            >
              <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                {entry.label.toUpperCase()}
              </Text>
              {entry.checkpoint?.photo?.signed_url ? (
                <Image source={{ uri: entry.checkpoint.photo.signed_url }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={[styles.photo, styles.photoFallback, { backgroundColor: c.surface2 }]}>
                  <TabBarIcon name="image-outline" color={c.textMuted} size={22} />
                </View>
              )}
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: s.md }}>
                {entry.checkpoint?.label || 'Checkpoint'}
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                {formatDate(entry.checkpoint?.capturedAt || null)}
              </Text>
            </View>
          ))}
        </View>
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
    flexWrap: 'wrap',
    gap: 8,
  },
  angleChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderWidth: 1,
    justifyContent: 'center',
  },
  summaryStrip: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  summaryCell: {
    flex: 1,
  },
  emptyContainer: {
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoSlot: {
    flex: 1,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    aspectRatio: 0.75,
    marginTop: 12,
  },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
