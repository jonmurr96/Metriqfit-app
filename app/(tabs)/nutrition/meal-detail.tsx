import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { useDeleteMealLogItem } from '../../../hooks/useNutrition';

export default function MealDetailScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // In a real app we'd fetch the meal by ID, but for now we receive data via params or query cache
  // Simplification: We'll assume the params passed contain the meal info or we show a generic "Meal Items" list
  // If params are empty, we handle gracefully.
  // In `useDailyMeals`, we return meals with items. The timeline navigates here.
  // Let's assume we pass the meal content or ID to fetch.
  // Since `useDailyMeals` caches, we could find the meal from the query cache if we had the ID.
  // For this fix, let's make it a functional list of items if passed, or a generic "Edit Meal" view.

  const mealTitle = params.title || 'Meal Detail';
  const foodItems = params.items ? JSON.parse(params.items as string) : [];

  const deleteMutation = useDeleteMealLogItem();

  const handleDeleteItem = (itemId: string, name: string) => {
    Alert.alert(
      "Remove Item",
      `Are you sure you want to remove ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(itemId);
            router.back();
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: c.surface }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <Text
          style={[
            styles.title,
            {
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.xl,
            },
          ]}
        >
          {mealTitle}
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/nutrition/food-search')}
          style={[styles.backButton, { backgroundColor: c.surface }]}
        >
          <TabBarIcon name="add" color={c.primary} size={24} />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={[styles.content, { padding: s.lg }]}>
        {foodItems.length > 0 ? (
          foodItems.map((item: any, index: number) => (
            <GlassCard key={index} style={{ marginBottom: s.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
                    {item.portion} • {item.calories} kcal
                  </Text>
                </View>

                {/* If we have an ID (real data), show delete option. If structure data (plan view), no delete. */}
                {item.id && (
                  <Pressable
                    onPress={() => handleDeleteItem(item.id, item.name)}
                    style={{ padding: 8 }}
                  >
                    <TabBarIcon name="trash-outline" color={c.danger} size={20} />
                  </Pressable>
                )}
              </View>
            </GlassCard>
          ))
        ) : (
          <View style={{ alignItems: 'center', marginTop: s.xl }}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
              No items in this meal yet.
            </Text>
            <Pressable
              style={{ marginTop: s.lg, flexDirection: 'row', alignItems: 'center' }}
              onPress={() => router.push('/(tabs)/nutrition/food-search')}
            >
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>
                Search for food
              </Text>
              <TabBarIcon name="arrow-forward" color={c.primary} size={16} style={{ marginLeft: 4 }} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  content: {
    paddingBottom: 40,
  },
  card: {},
});
