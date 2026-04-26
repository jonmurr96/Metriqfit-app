import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

export interface NutritionPreviewBannerProps {
  previewName: string;
  onReview: () => void;
}

export function NutritionPreviewBanner({ previewName, onReview }: NutritionPreviewBannerProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: `${c.accent}12`,
          borderColor: `${c.accent}45`,
          borderRadius: r.lg,
          padding: s.md,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.accent, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
          Preview Ready
        </Text>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginTop: s.xs }}>
          {previewName}
        </Text>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
          Review the pending nutrition plan before applying it.
        </Text>
      </View>

      <Pressable
        onPress={onReview}
        style={[
          styles.cta,
          {
            backgroundColor: c.surface,
            borderColor: `${c.accent}45`,
            borderRadius: r.pill,
            marginLeft: s.md,
          },
        ]}
      >
        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
          Review
        </Text>
        <TabBarIcon name="arrow-forward" color={c.text} size={16} style={{ marginLeft: 4 }} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cta: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
