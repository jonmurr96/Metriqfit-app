import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useTokens } from "../../lib/theme";
import { TabBarIcon } from "../navigation/TabBarIcon";

export interface GoalProgressHeroProps {
  startWeight: number | null;
  currentWeight: number | null;
  goalWeight: number | null;
  unit: "lb" | "kg";
  targetDateLabel?: string | null;
  trendLabel?: string | null;
  onLogWeight?: () => void;
  onEditGoal?: () => void;
}

function formatWeight(value: number | null, unit: "lb" | "kg") {
  if (value == null || !Number.isFinite(value)) return "--";
  return `${Math.round(value * 10) / 10} ${unit}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function GoalProgressHero({
  startWeight,
  currentWeight,
  goalWeight,
  unit,
  targetDateLabel,
  trendLabel,
  onLogWeight,
  onEditGoal,
}: GoalProgressHeroProps) {
  const { c, s, ty, r } = useTokens();

  const model = useMemo(() => {
    const hasGoal = goalWeight != null && Number.isFinite(goalWeight);
    const hasCurrent = currentWeight != null && Number.isFinite(currentWeight);
    const hasStart = startWeight != null && Number.isFinite(startWeight);
    if (!hasGoal || !hasCurrent || !hasStart || goalWeight === startWeight) {
      return {
        ready: false,
        progress: 0,
        direction: "set",
        remainingLabel: hasGoal ? "Log current weight" : "Set goal weight",
        headline: hasGoal ? "Log a current weight" : "Set your goal weight",
      };
    }

    const totalDistance = Math.abs(goalWeight - startWeight);
    const completedDistance = goalWeight > startWeight
      ? currentWeight - startWeight
      : startWeight - currentWeight;
    const remaining = Math.abs(goalWeight - currentWeight);
    const progress = totalDistance > 0 ? clamp((completedDistance / totalDistance) * 100, 0, 100) : 0;
    const isGain = goalWeight > startWeight;
    const atGoal = remaining < (unit === "lb" ? 0.5 : 0.25);

    return {
      ready: true,
      progress,
      direction: isGain ? "gain" : "lose",
      remainingLabel: atGoal
        ? "At goal"
        : `${Math.round(remaining * 10) / 10} ${unit} to ${isGain ? "gain" : "lose"}`,
      headline: `${Math.round(progress)}% of goal path`,
    };
  }, [currentWeight, goalWeight, startWeight, unit]);

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: r.xl,
          borderColor: `${c.primary}35`,
          backgroundColor: c.surface,
          shadowColor: c.primary,
        },
      ]}
    >
      <LinearGradient
        colors={[`${c.primary}1F`, "rgba(255,255,255,0.02)", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${c.primary}16` }]}>
          <TabBarIcon name="analytics-outline" color={c.primary} size={21} />
        </View>
        <View style={[styles.statusPill, { borderRadius: r.pill, borderColor: `${c.primary}45` }]}>
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
            LIFETIME GOAL
          </Text>
        </View>
      </View>

      <Text
        style={{
          color: c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: 34,
          lineHeight: 40,
          marginTop: s.lg,
        }}
      >
        {model.remainingLabel}
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.sm,
          lineHeight: 20,
          marginTop: s.sm,
        }}
      >
        {model.ready
          ? `${model.headline}${targetDateLabel ? ` - Target ${targetDateLabel}` : ""}${trendLabel ? ` - ${trendLabel}` : ""}`
          : "Progress needs a starting weight, current weight, and goal weight."}
      </Text>

      <View style={[styles.meterTrack, { backgroundColor: c.surface2, marginTop: s.lg }]}>
        <View
          style={[
            styles.meterFill,
            {
              width: `${model.progress}%`,
              backgroundColor: c.primary,
            },
          ]}
        />
      </View>

      <View style={[styles.weightRow, { marginTop: s.md }]}>
        <View>
          <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>Start</Text>
          <Text style={[styles.value, { color: c.text, fontFamily: ty.body.familySemibold }]}>
            {formatWeight(startWeight, unit)}
          </Text>
        </View>
        <View style={styles.centerWeight}>
          <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>Current</Text>
          <Text style={[styles.value, { color: c.primary, fontFamily: ty.body.familySemibold }]}>
            {formatWeight(currentWeight, unit)}
          </Text>
        </View>
        <View style={styles.rightWeight}>
          <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>Goal</Text>
          <Text style={[styles.value, { color: c.text, fontFamily: ty.body.familySemibold }]}>
            {formatWeight(goalWeight, unit)}
          </Text>
        </View>
      </View>

      <View style={[styles.actions, { gap: s.sm, marginTop: s.lg }]}>
        {onLogWeight ? (
          <Pressable
            onPress={onLogWeight}
            style={[styles.primaryButton, { borderRadius: r.md, backgroundColor: c.primary }]}
          >
            <TabBarIcon name="scale-outline" color={c.bg} size={17} />
            <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
              Log Weight
            </Text>
          </Pressable>
        ) : null}
        {onEditGoal ? (
          <Pressable
            onPress={onEditGoal}
            style={[
              styles.secondaryButton,
              { borderRadius: r.md, borderColor: c.border, backgroundColor: `${c.surface2}CC` },
            ]}
          >
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
              Edit Goal
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderWidth: 1,
    padding: 20,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  meterTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    borderRadius: 999,
  },
  weightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  centerWeight: {
    alignItems: "center",
  },
  rightWeight: {
    alignItems: "flex-end",
  },
  label: {
    fontSize: 11,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 15,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
