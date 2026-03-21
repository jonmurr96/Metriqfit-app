import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTokens } from "../../lib/theme";
import { trackProgressPrimarySectionChanged } from "../../lib/analytics";

export type ProgressPrimarySection = "overview" | "performance" | "body" | "review";

export interface ProgressPrimaryNavProps {
  activeSection: ProgressPrimarySection;
}

const PRIMARY_ITEMS: {
  id: ProgressPrimarySection;
  label: string;
  route: string;
}[] = [
  { id: "overview", label: "Overview", route: "/(tabs)/progress" },
  { id: "performance", label: "Performance", route: "/(tabs)/progress/trends" },
  { id: "body", label: "Body", route: "/(tabs)/progress/photos" },
  { id: "review", label: "Review", route: "/(tabs)/progress/weekly-review" },
];

export function ProgressPrimaryNav({ activeSection }: ProgressPrimaryNavProps) {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ maxHeight: 52 }}
      contentContainerStyle={{ paddingHorizontal: s.lg, paddingTop: s.sm, gap: s.sm, alignItems: 'center' }}
    >
      {PRIMARY_ITEMS.map((item) => {
        const isActive = item.id === activeSection;

        return (
          <Pressable
            key={item.id}
            onPress={() => {
              if (isActive) return;
              trackProgressPrimarySectionChanged({ section: item.id });
              router.push(item.route as any);
            }}
            style={[
              styles.chip,
              {
                borderRadius: r.pill,
                backgroundColor: isActive ? `${c.primary}18` : c.surface,
                borderColor: isActive ? c.primary : c.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={{
                color: isActive ? c.primary : c.textMuted,
                fontFamily: isActive ? ty.body.familySemibold : ty.body.family,
                fontSize: ty.sizes.sm,
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
    minHeight: 40,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
