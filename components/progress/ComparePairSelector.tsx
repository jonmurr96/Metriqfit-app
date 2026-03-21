import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTokens } from "../../lib/theme";

export interface ComparePairSelectorProps {
  label: string;
  options: {
    id: string;
    label: string;
    meta?: string;
  }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ComparePairSelector({
  label,
  options,
  selectedId,
  onSelect,
}: ComparePairSelectorProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <View>
      <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: s.sm, paddingTop: s.sm }}
      >
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <Pressable
              key={option.id}
              onPress={() => onSelect(option.id)}
              style={[
                styles.option,
                {
                  borderRadius: r.lg,
                  borderColor: isSelected ? c.primary : c.border,
                  backgroundColor: isSelected ? `${c.primary}14` : c.surface,
                },
              ]}
            >
              <Text style={{ color: isSelected ? c.primary : c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                {option.label}
              </Text>
              {option.meta ? (
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                  {option.meta}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    minWidth: 118,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
});
