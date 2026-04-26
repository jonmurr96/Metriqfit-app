import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTokens } from "../../lib/theme";
import { trackProgressSecondarySectionChanged } from "../../lib/analytics";

export type ProgressSecondarySection = "performance" | "body" | "review";
export type ProgressSecondaryItem =
  | "trends"
  | "records"
  | "timeline"
  | "compare"
  | "daily"
  | "weekly";

export interface ProgressSecondaryNavProps {
  section: ProgressSecondarySection;
  activeItem: ProgressSecondaryItem;
}

const SECONDARY_ITEMS: Record<
  ProgressSecondarySection,
  { id: ProgressSecondaryItem; label: string; route: string }[]
> = {
  performance: [
    { id: "trends", label: "Trends", route: "/(tabs)/progress/trends" },
    { id: "records", label: "Records", route: "/(tabs)/progress/personal-records" },
  ],
  body: [
    { id: "timeline", label: "Timeline", route: "/(tabs)/progress/photos" },
    { id: "compare", label: "Compare", route: "/(tabs)/progress/photo-compare" },
  ],
  review: [
    { id: "daily", label: "Daily", route: "/(tabs)/progress/daily-summary" },
    { id: "weekly", label: "Weekly", route: "/(tabs)/progress/weekly-review" },
  ],
};

export function ProgressSecondaryNav({ section, activeItem }: ProgressSecondaryNavProps) {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ maxHeight: 48 }}
      contentContainerStyle={{ paddingHorizontal: s.lg, paddingTop: s.sm, gap: s.sm, alignItems: 'center' }}
    >
      {SECONDARY_ITEMS[section].map((item) => {
        const isActive = item.id === activeItem;

        return (
          <Pressable
            key={item.id}
            onPress={() => {
              if (isActive) return;
              trackProgressSecondarySectionChanged({ section, item: item.id });
              router.push(item.route as any);
            }}
            style={[
              styles.chip,
              {
                borderRadius: r.pill,
                backgroundColor: isActive ? c.surface2 : c.surface,
                borderColor: isActive ? `${c.primary}66` : c.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={{
                color: isActive ? c.text : c.textMuted,
                fontFamily: isActive ? ty.body.familySemibold : ty.body.family,
                fontSize: ty.sizes.xs,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
      <View style={{ width: 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
