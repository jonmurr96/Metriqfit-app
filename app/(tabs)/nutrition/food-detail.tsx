import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../../../lib/auth/AuthProvider';
import {
  nutritionKeys,
  useFavoriteFoodIds,
  useToggleFavoriteFood,
} from '../../../hooks/useNutrition';
import { getMealSlotLabel, normalizeDateKey, normalizeMealSlot } from '../../../lib/nutrition/meal-slots';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { getFoodById, calculateMacros, logFood } from '../../../services/nutritionService';
import { GlassCard } from '../../../components/premium/GlassCard';
import { MacroRow } from '../../../components/nutrition/MacroRow';
import { useProfile } from '../../../hooks/useUser';
import { formatMacroDisplay, detectFoodCategory, getDefaultFoodMeasurement } from '../../../lib/nutrition/displayUnits';

export default function FoodDetailScreen() {
  const { c, s, ty, r, shadow } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const {
    id,
    mealSlot: mealSlotParam,
    date: dateParam,
    externalProvider,
    externalId,
    externalName,
    externalBrand,
    externalImageUrl,
    externalCaloriesPer100g,
    externalProteinPer100g,
    externalCarbsPer100g,
    externalFatPer100g,
    externalServingSizeG,
    externalServingDescription,
  } = useLocalSearchParams<{
    id?: string;
    mealSlot?: string | string[];
    date?: string | string[];
    source?: string | string[];
    externalProvider?: string | string[];
    externalId?: string | string[];
    externalName?: string | string[];
    externalBrand?: string | string[];
    externalImageUrl?: string | string[];
    externalCaloriesPer100g?: string | string[];
    externalProteinPer100g?: string | string[];
    externalCarbsPer100g?: string | string[];
    externalFatPer100g?: string | string[];
    externalServingSizeG?: string | string[];
    externalServingDescription?: string | string[];
  }>();
  const normalizedMealSlot = normalizeMealSlot(mealSlotParam) || 'lunch';
  const targetDate = normalizeDateKey(dateParam);
  const getParam = (value?: string | string[]) => Array.isArray(value) ? value[0] : value;
  const isExternalPreview = !!getParam(externalName);
  const goToNutritionHome = () => {
    router.replace('/(tabs)/nutrition');
  };

  const { data: profile } = useProfile();
  const foodMeasurement = getDefaultFoodMeasurement(profile?.unit_system);
  const displayFoodMeasurement = (profile?.display_preferences?.food_measurement as any) ?? foodMeasurement;

  const [grams, setGrams] = useState('100');
  const [mealSlot, setMealSlot] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(normalizedMealSlot);
  const [favoriteFeedback, setFavoriteFeedback] = useState<string | null>(null);

  useEffect(() => {
    setMealSlot(normalizedMealSlot);
  }, [normalizedMealSlot]);

  useEffect(() => {
    if (!favoriteFeedback) return undefined;

    const timeout = setTimeout(() => setFavoriteFeedback(null), 1800);
    return () => clearTimeout(timeout);
  }, [favoriteFeedback]);

  const externalPreviewFood = useMemo(() => {
    if (!isExternalPreview) return null;

    const parseNumber = (value?: string | string[]) => {
      const parsed = Number(getParam(value));
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return {
      id: getParam(externalId) || `external:${getParam(externalProvider) || 'catalog'}:${getParam(externalName)}`,
      name: getParam(externalName) || 'External food',
      brand: getParam(externalBrand) || null,
      category: 'External catalog',
      caloriesPer100g: parseNumber(externalCaloriesPer100g),
      proteinPer100g: parseNumber(externalProteinPer100g),
      carbsPer100g: parseNumber(externalCarbsPer100g),
      fatPer100g: parseNumber(externalFatPer100g),
      fiberPer100g: null,
      sugarPer100g: null,
      sodiumPer100g: null,
      servingSizeG: Number(getParam(externalServingSizeG)) || null,
      servingDescription: getParam(externalServingDescription) || null,
      barcode: null,
      externalSourceId: getParam(externalId) || null,
      source: (getParam(externalProvider) === 'usda_fdc' ? 'usda_fdc' : 'openfoodfacts') as 'usda_fdc' | 'openfoodfacts',
      imageUrl: getParam(externalImageUrl) || null,
      isVerified: false,
    };
  }, [
    externalBrand,
    externalCaloriesPer100g,
    externalCarbsPer100g,
    externalFatPer100g,
    externalId,
    externalImageUrl,
    externalName,
    externalProteinPer100g,
    externalProvider,
    externalServingDescription,
    externalServingSizeG,
    isExternalPreview,
  ]);

  // Fetch food item
  const { data: queriedFood, isLoading } = useQuery({
    queryKey: ['food-item', id],
    queryFn: () => getFoodById(id!),
    enabled: !!id && !isExternalPreview,
  });
  const food = externalPreviewFood ?? queriedFood ?? null;
  const { data: favoriteFoodIds = [] } = useFavoriteFoodIds(
    !isExternalPreview && food?.id ? [food.id] : undefined,
    { enabled: !!food?.id && !isExternalPreview },
  );
  const toggleFavoriteMutation = useToggleFavoriteFood();
  const isFavorite = !isExternalPreview && !!food?.id && favoriteFoodIds.includes(food.id);

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
      if (isExternalPreview) {
        throw new Error('External preview items can’t be logged directly yet.');
      }
      return logFood(
        user.id,
        food.id,
        mealSlot,
        parseFloat(grams),
        new Date(`${targetDate}T12:00:00`),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.dailyTotals(user!.id, targetDate),
      });
      queryClient.invalidateQueries({
        queryKey: nutritionKeys.dailyMeals(user!.id, targetDate),
      });
      goToNutritionHome();
    },
    onError: (error) => {
      Alert.alert(
        'Unable to log food',
        isExternalPreview
          ? 'This USDA/OpenFoodFacts result is available as a macro preview only right now.'
          : 'Failed to log food. Please try again.',
      );
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
          onPress={goToNutritionHome}
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
        {!isExternalPreview ? (
          <Pressable
            onPress={() => {
              if (!food?.id) return;

              toggleFavoriteMutation.mutate(
                {
                  foodItemId: food.id,
                  isFavorite,
                },
                {
                  onSuccess: (nextFavoriteState) => {
                    setFavoriteFeedback(
                      nextFavoriteState ? 'Saved to Saved Foods' : 'Removed from Saved Foods',
                    );
                  },
                  onError: () => {
                    Alert.alert('Save failed', 'Could not update saved food right now.');
                  },
                },
              );
            }}
            style={[styles.backButton, { backgroundColor: c.surface }]}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from saved foods' : 'Save food'}
            disabled={toggleFavoriteMutation.isPending || !food?.id}
          >
            <TabBarIcon
              name={isFavorite ? 'star' : 'star-outline'}
              color={isFavorite ? c.primary : c.text}
              size={22}
            />
          </Pressable>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {isExternalPreview ? (
        <View style={{ paddingHorizontal: s.lg, marginBottom: s.sm }}>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.sm,
              textAlign: 'center',
            }}
          >
            Previewing USDA/OpenFoodFacts macros. Logging from this preview is not available yet.
          </Text>
        </View>
      ) : null}

      {favoriteFeedback ? (
        <View style={{ paddingHorizontal: s.lg, marginBottom: s.sm }}>
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
              textAlign: 'center',
            }}
          >
            {favoriteFeedback}
          </Text>
        </View>
      ) : null}

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 160 }}
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
          <MacroRow
            size="md"
            emphasis="soft"
            items={[
              { macro: 'calories', value: food.caloriesPer100g, unit: 'kcal' },
              { macro: 'protein', value: food.proteinPer100g, unit: 'g' },
              { macro: 'carbs', value: food.carbsPer100g, unit: 'g' },
              { macro: 'fat', value: food.fatPer100g, unit: 'g' },
            ]}
          />
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
            {displayFoodMeasurement === 'imperial_mixed' && detectFoodCategory(food?.name || '') === 'protein' && (
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: 4 }}>
                ≈ {((parseFloat(grams) || 0) * (1 / 28.3495)).toFixed(1)} oz
              </Text>
            )}
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
              {isExternalPreview ? 'PREVIEW AT THIS SERVING' : "YOU'LL LOG"}
            </Text>
            <MacroRow
              size="md"
              emphasis="soft"
              items={[
                { macro: 'calories', value: macros.calories, unit: 'kcal' },
                { macro: 'protein', value: parseFloat(formatMacroDisplay(macros.protein, 'protein', displayFoodMeasurement).value), unit: formatMacroDisplay(macros.protein, 'protein', displayFoodMeasurement).unit },
                { macro: 'carbs', value: parseFloat(formatMacroDisplay(macros.carbs, 'carbs', displayFoodMeasurement).value), unit: formatMacroDisplay(macros.carbs, 'carbs', displayFoodMeasurement).unit },
                { macro: 'fat', value: parseFloat(formatMacroDisplay(macros.fat, 'fat', displayFoodMeasurement).value), unit: formatMacroDisplay(macros.fat, 'fat', displayFoodMeasurement).unit },
              ]}
            />

            {!isExternalPreview ? (
              <>
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
              </>
            ) : null}
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
              backgroundColor: isExternalPreview
                ? c.surface2
                : logMealMutation.isPending
                  ? c.textMuted
                  : c.primary,
              borderRadius: r.md,
              opacity: pressed ? 0.9 : 1,
              ...shadow.premium,
            },
          ]}
          onPress={() => {
            if (isExternalPreview) {
              Alert.alert(
                'Preview only',
                'This USDA/OpenFoodFacts item is available as a macro preview only right now.',
              );
              return;
            }
            logMealMutation.mutate();
          }}
          disabled={logMealMutation.isPending || !macros}
        >
          {isExternalPreview ? (
            <>
              <TabBarIcon name="information-circle" color={c.text} size={20} />
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.lg,
                  marginLeft: s.sm,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                Preview only
              </Text>
            </>
          ) : logMealMutation.isPending ? (
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
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {(() => {
                  const category = detectFoodCategory(food?.name || '');
                  const isImperialProtein = displayFoodMeasurement === 'imperial_mixed' && category === 'protein';
                  const gramsNum = parseFloat(grams) || 0;
                  const displayValue = isImperialProtein ? (gramsNum / 28.3495).toFixed(1) : grams;
                  const unit = isImperialProtein ? 'oz' : 'g';
                  return `Log ${displayValue}${unit} to ${getMealSlotLabel(mealSlot)}`;
                })()}
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
