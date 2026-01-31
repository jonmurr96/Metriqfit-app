import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../../lib/auth/AuthProvider';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { getFoodById, calculateMacros, logFood } from '../../../services/nutritionService';
import { GlassCard } from '../../../components/premium/GlassCard';

export default function FoodDetailScreen() {
  const { c, s, ty, r, shadow } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [grams, setGrams] = useState('100');
  const [mealSlot, setMealSlot] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');

  // Fetch food item
  const { data: food, isLoading } = useQuery({
    queryKey: ['food-item', id],
    queryFn: () => getFoodById(id!),
    enabled: !!id,
  });

  // Calculate macros based on grams
  const macros = useMemo(() => {
    if (!food) return null;
    const gramsNum = parseFloat(grams) || 0;
    return calculateMacros(food, gramsNum);
  }, [food, grams]);

  // Log meal mutation
  const logMealMutation = useMutation({
    mutationFn: () => {
      if (!user || !food) throw new Error('Missing data');
      return logFood(user.id, food.id, mealSlot, parseFloat(grams));
    },
    onSuccess: () => {
      // Invalidate nutrition queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ['nutrition-daily-total'] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-meals'] });
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to log food. Please try again.');
      console.error(error);
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ color: c.textMuted, marginTop: s.md }}>Loading food details...</Text>
      </View>
    );
  }

  if (!food) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <Text style={{ color: c.error, textAlign: 'center', marginTop: s.xxl }}>Food not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <LinearGradient
        colors={[c.bg, '#0a101f']}
        style={StyleSheet.absoluteFill}
      />

      {/* Safe Area Spacer */}
      <View style={{ height: insets.top }} />

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
          Food Detail
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: s.lg, paddingBottom: 120 }}
      >
        {/* Food Name */}
        <GlassCard intensity="medium" style={{ marginBottom: s.lg }}>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.h3,
            }}
          >
            {food.name}
          </Text>
          {food.brand && (
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.md,
                marginTop: s.xs,
              }}
            >
              {food.brand}
            </Text>
          )}
        </GlassCard>

        {/* Nutrition Info */}
        <GlassCard intensity="strong" style={{ marginBottom: s.lg }} glowEffect>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
              letterSpacing: 1,
              marginBottom: s.md,
            }}
          >
            NUTRITION PER 100G
          </Text>
          <View style={styles.nutritionGrid}>
            {[
              { label: 'Calories', value: food.caloriesPer100g.toString(), unit: 'kcal', color: c.chart.c1 },
              { label: 'Protein', value: food.proteinPer100g.toString(), unit: 'g', color: c.chart.c2 },
              { label: 'Carbs', value: food.carbsPer100g.toString(), unit: 'g', color: c.chart.c3 },
              { label: 'Fat', value: food.fatPer100g.toString(), unit: 'g', color: c.chart.c4 },
            ].map((item) => (
              <View key={item.label} style={styles.nutritionItem}>
                <View
                  style={[
                    styles.nutritionDot,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.mono.family,
                    fontSize: ty.sizes.xl,
                  }}
                >
                  {item.value}
                  <Text style={{ fontSize: ty.sizes.sm, color: c.textMuted }}>
                    {item.unit}
                  </Text>
                </Text>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.sm,
                    marginTop: 2,
                  }}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Serving Size */}
        <GlassCard intensity="light" style={{ marginBottom: s.lg }}>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
              letterSpacing: 1,
              marginBottom: s.md,
            }}
          >
            SERVING SIZE
          </Text>
          <View style={styles.servingSelector}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <TextInput
                style={{
                  color: c.text,
                  fontFamily: ty.mono.family,
                  fontSize: 48,
                  minWidth: 100,
                  textAlign: 'center',
                  borderBottomWidth: 1,
                  borderBottomColor: c.primary,
                }}
                value={grams}
                onChangeText={setGrams}
                keyboardType="numeric"
                maxLength={4}
              />
              <Text style={{ color: c.textMuted, fontSize: ty.sizes.lg, marginLeft: 8 }}>g</Text>
            </View>
          </View>
        </GlassCard>

        {/* Calculated Macros for Selected Serving */}
        {macros && (
          <GlassCard intensity="medium" glowEffect>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
                letterSpacing: 1,
                marginBottom: s.md,
              }}
            >
              YOU'LL LOG
            </Text>
            <View style={styles.nutritionGrid}>
              {[
                { label: 'Calories', value: macros.calories.toString(), unit: 'kcal', color: c.chart.c1 },
                { label: 'Protein', value: macros.protein.toString(), unit: 'g', color: c.chart.c2 },
                { label: 'Carbs', value: macros.carbs.toString(), unit: 'g', color: c.chart.c3 },
                { label: 'Fat', value: macros.fat.toString(), unit: 'g', color: c.chart.c4 },
              ].map((item) => (
                <View key={item.label} style={styles.nutritionItem}>
                  <View
                    style={[
                      styles.nutritionDot,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: ty.mono.family,
                      fontSize: ty.sizes.xl,
                    }}
                  >
                    {item.value}
                    <Text style={{ fontSize: ty.sizes.sm, color: c.textMuted }}>
                      {item.unit}
                    </Text>
                  </Text>
                  <Text
                    style={{
                      color: c.textMuted,
                      fontFamily: ty.body.family,
                      fontSize: ty.sizes.sm,
                      marginTop: 2,
                    }}
                  >
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Meal Slot Selector */}
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
                letterSpacing: 1,
                marginTop: s.lg,
                marginBottom: s.sm,
              }}
            >
              MEAL
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((slot) => (
                <Pressable
                  key={slot}
                  style={[
                    {
                      flex: 1,
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: r.sm,
                      backgroundColor: mealSlot === slot ? c.primary : c.surface2,
                      borderWidth: 1,
                      borderColor: mealSlot === slot ? c.primary : c.border,
                      alignItems: 'center',
                    },
                  ]}
                  onPress={() => setMealSlot(slot)}
                >
                  <Text
                    style={{
                      color: mealSlot === slot ? c.bg : c.text,
                      fontFamily: ty.body.familySemibold,
                      fontSize: ty.sizes.xs,
                      textTransform: 'capitalize',
                    }}
                  >
                    {slot}
                  </Text>
                </Pressable>
              ))}
            </View>
          </GlassCard>
        )}
      </ScrollView>

      {/* Add Button Gradient Wrapper */}
      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: s.lg,
            paddingBottom: insets.bottom + s.lg,
            paddingTop: s.lg,
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(5, 5, 16, 0.9)', 'rgba(5, 5, 16, 1)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            {
              backgroundColor: logMealMutation.isPending ? c.textMuted : c.primary,
              borderRadius: r.md,
              opacity: pressed ? 0.9 : 1,
              ...shadow.premium,
            },
          ]}
          onPress={() => logMealMutation.mutate()}
          disabled={logMealMutation.isPending || !macros}
        >
          {logMealMutation.isPending ? (
            <>
              <ActivityIndicator size="small" color={c.bg} />
              <Text
                style={{
                  color: c.bg,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.lg,
                  marginLeft: s.sm,
                }}
              >
                Adding...
              </Text>
            </>
          ) : (
            <>
              <TabBarIcon name="checkmark-circle" color={c.bg} size={20} />
              <Text
                style={{
                  color: c.bg,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.lg,
                  marginLeft: s.sm,
                }}
              >
                Add {grams}g to {mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)}
              </Text>
            </>
          )}
        </Pressable>
      </View>
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
  scrollView: {
    flex: 1,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  nutritionItem: {
    width: '45%',
    alignItems: 'flex-start',
  },
  nutritionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  servingSelector: {
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  addButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

