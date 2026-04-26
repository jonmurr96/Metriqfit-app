import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../premium/GlassCard";
import { useTokens } from "../../lib/theme";
import type { ProgressReviewStatus } from "../../services/progressReviewService";

export interface WeeklyReviewSummaryProps {
  status: ProgressReviewStatus;
  headline: string;
  subheadline: string;
}

function statusTone(status: ProgressReviewStatus, colors: ReturnType<typeof useTokens>["c"]) {
  if (status === "on_pace") return colors.success;
  if (status === "watch") return colors.warning;
  return colors.textMuted;
}

export function WeeklyReviewSummary({
  status,
  headline,
  subheadline,
}: WeeklyReviewSummaryProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <GlassCard style={{ padding: 20 }}>
      <View
        style={[
          styles.badge,
          {
            borderRadius: r.pill,
            backgroundColor: `${statusTone(status, c)}18`,
          },
        ]}
      >
        <Text style={{ color: statusTone(status, c), fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
          {status.replace("_", " ").toUpperCase()}
        </Text>
      </View>
      <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl, marginTop: s.md }}>
        {headline}
      </Text>
      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm, lineHeight: 20 }}>
        {subheadline}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
