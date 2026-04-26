import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

export type NutritionQuickLogActionId = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'search';

export interface NutritionQuickLogBarProps {
  onQuickLog: (action: NutritionQuickLogActionId) => void;
}

const ACTIONS: { id: NutritionQuickLogActionId; label: string; icon: string }[] = [
  { id: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { id: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { id: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { id: 'snack', label: 'Snack', icon: 'cafe-outline' },
  { id: 'search', label: 'Search', icon: 'search-outline' },
];

export function NutritionQuickLogBar({ onQuickLog }: NutritionQuickLogBarProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: s.sm, paddingRight: s.lg }}
    >
      {ACTIONS.map((action) => (
        <Pressable
          key={action.id}
          onPress={() => onQuickLog(action.id)}
          style={[
            styles.action,
            {
              backgroundColor: c.surface,
              borderRadius: r.pill,
              borderColor: c.border,
              paddingHorizontal: 14,
              paddingVertical: 10,
            },
          ]}
        >
          <TabBarIcon name={action.icon as any} color={c.primary} size={16} />
          <Text
            style={{
              color: c.text,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
              marginLeft: 6,
            }}
          >
            {action.label}
          </Text>
        </Pressable>
      ))}
      <View style={{ width: 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  action: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
