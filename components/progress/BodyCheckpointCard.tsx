import React from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../premium/GlassCard";
import { useTokens } from "../../lib/theme";
import { TabBarIcon } from "../navigation/TabBarIcon";
import type { ProgressBodyCheckpoint } from "../../services/progressBodyService";

const REQUIRED_ANGLES = ["front", "side", "back"] as const;

export interface BodyCheckpointCardProps {
  checkpoint: ProgressBodyCheckpoint;
  onCompareWithPrevious?: (checkpointId: string, previousCheckpointId: string) => void;
  onOpenCompare?: (checkpointId: string) => void;
  onOpenCheckIn?: () => void;
  onDeletePhoto?: (photoId: string) => void;
}

function statText(label: string, value: number | null, unit = "") {
  if (value == null) return `${label}: --`;
  return `${label}: ${value}${unit}`;
}

export function BodyCheckpointCard({
  checkpoint,
  onCompareWithPrevious,
  onOpenCompare,
  onOpenCheckIn,
  onDeletePhoto,
}: BodyCheckpointCardProps) {
  const { c, s, ty, r } = useTokens();
  const photosByAngle = new Map(checkpoint.photos.map((photo) => [photo.angle, photo]));
  const missingAngles = REQUIRED_ANGLES.filter((angle) => !photosByAngle.has(angle));
  const isComplete = missingAngles.length === 0;
  const customPhotos = checkpoint.photos.filter((photo) => photo.angle === "custom");

  return (
    <GlassCard style={{ padding: 16 }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            {checkpoint.label}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
            {isComplete
              ? "Front · Side · Back complete"
              : `Missing ${missingAngles.map((angle) => angle.toUpperCase()).join(" · ")}`}
          </Text>
        </View>
        <View
          style={[
            styles.flag,
            {
              borderRadius: r.pill,
              backgroundColor: isComplete ? `${c.success}14` : `${c.warning}14`,
            },
          ]}
        >
            <Text style={{ color: isComplete ? c.success : c.warning, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              {isComplete ? "Complete" : "Incomplete"}
            </Text>
        </View>
      </View>

      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.md }}>
        {[
          statText("Weight", checkpoint.weightKg, " kg"),
          statText("Body fat", checkpoint.bodyFatPercentage, "%"),
          statText("Waist", checkpoint.circumferenceSummary.waistCm, " cm"),
        ].join("  ·  ")}
      </Text>

      <View style={[styles.photoRow, { marginTop: s.md }]}>
        {[...REQUIRED_ANGLES, ...customPhotos.map((photo) => photo.angle)].map((angle, index) => {
          const photo = angle === "custom" ? customPhotos[index - REQUIRED_ANGLES.length] : photosByAngle.get(angle);
          const label = angle.toUpperCase();
          return (
          <View
            key={photo?.id || `${checkpoint.checkpointId}-${angle}-${index}`}
            style={[
              styles.photoTile,
              {
                borderRadius: r.md,
                borderColor: photo ? c.border : `${c.warning}55`,
              },
            ]}
          >
            {photo?.signed_url ? (
              <Image source={{ uri: photo.signed_url }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={[styles.photo, styles.photoFallback, { backgroundColor: c.surface2 }]}>
                <TabBarIcon name={photo ? "image-outline" : "add-circle-outline"} color={photo ? c.textMuted : c.warning} size={18} />
                {!photo ? (
                  <Text style={{ color: c.warning, fontFamily: ty.body.familySemibold, fontSize: 10, marginTop: 6 }}>
                    Needed
                  </Text>
                ) : null}
              </View>
            )}
            <View style={styles.photoFooter}>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 11 }}>
                {label}
              </Text>
              {photo && onDeletePhoto ? (
                <Pressable
                  onPress={() =>
                    Alert.alert("Delete photo?", "This photo will be removed from your timeline.", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => onDeletePhoto(photo.id),
                      },
                    ])
                  }
                >
                  <TabBarIcon name="trash-outline" color={c.warning} size={14} />
                </Pressable>
              ) : null}
            </View>
          </View>
          );
        })}
      </View>

      <View style={[styles.actions, { marginTop: s.md, gap: s.sm }]}>
        {isComplete && checkpoint.compareEligible && checkpoint.previousComparableCheckpointId && onCompareWithPrevious ? (
          <Pressable
            onPress={() =>
              onCompareWithPrevious(checkpoint.checkpointId, checkpoint.previousComparableCheckpointId as string)
            }
            style={[styles.actionButton, { borderRadius: r.md, borderColor: c.primary, backgroundColor: `${c.primary}10` }]}
          >
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
              Compare with previous
            </Text>
          </Pressable>
        ) : null}

        {onOpenCompare ? (
          <Pressable
            onPress={() => onOpenCompare(checkpoint.checkpointId)}
            style={[styles.actionButton, { borderRadius: r.md, borderColor: c.border, backgroundColor: c.surface }]}
          >
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
              Open full compare
            </Text>
          </Pressable>
        ) : null}

        {onOpenCheckIn ? (
          <Pressable
            onPress={onOpenCheckIn}
            style={[styles.actionButton, { borderRadius: r.md, borderColor: c.border, backgroundColor: c.surface }]}
          >
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
              Open weekly check-in
            </Text>
          </Pressable>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  flag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoTile: {
    width: 96,
    borderWidth: 1,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    aspectRatio: 0.75,
  },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  actionButton: {
    borderWidth: 1,
    minHeight: 40,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
});
