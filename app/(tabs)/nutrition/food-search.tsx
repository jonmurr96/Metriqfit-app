import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import { MacroRow } from '../../../components/nutrition/MacroRow';
import { getMealSlotLabel, normalizeDateKey, normalizeMealSlot } from '../../../lib/nutrition/meal-slots';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { useProfile } from '../../../hooks/useUser';
import { formatFoodQuantity, detectFoodCategory, getDefaultFoodMeasurement } from '../../../lib/nutrition/displayUnits';
import {
  useAddFavoriteFood,
  useFavoriteFoodIds,
  useFavoriteFoods,
  useLogFood,
  useRemoveFavoriteFood,
  useSearchExternalFoods,
  useSearchFoods,
} from '../../../hooks/useNutrition';
import type {
  ExternalFoodSearchResult,
  FavoriteFood,
  FoodItem,
  MealSlot,
} from '../../../services/nutritionService';

type ViewMode = 'foods' | 'recipes' | 'saved';

export default function FoodSearchScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const params = useLocalSearchParams<{
    mealSlot?: string | string[];
    date?: string | string[];
    source?: string | string[];
    query?: string | string[];
    preselectedFoodId?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('foods');
  const handledPreselectedFood = useRef(false);

  const mealSlot = normalizeMealSlot(params.mealSlot);
  const date = normalizeDateKey(params.date);
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const queryParam = Array.isArray(params.query) ? params.query[0] : params.query;
  const preselectedFoodId = Array.isArray(params.preselectedFoodId)
    ? params.preselectedFoodId[0]
    : params.preselectedFoodId;
  const mealSlotLabel = mealSlot ? getMealSlotLabel(mealSlot) : null;
  const headerTitle = mealSlotLabel ? `Add Food to ${mealSlotLabel}` : 'Search Food';

  const { data: searchResults = [], isLoading: isLoadingLocal } = useSearchFoods(debouncedSearchQuery, {
    enabled: viewMode === 'foods',
  });
  const { data: externalResults = [], isLoading: isLoadingExternal } = useSearchExternalFoods(
    debouncedSearchQuery,
    {
      enabled: viewMode === 'foods',
    },
  );
  const searchResultIds = useMemo(() => searchResults.map((food) => food.id), [searchResults]);
  const { data: favoriteResultIds = [] } = useFavoriteFoodIds(searchResultIds, {
    enabled: viewMode === 'foods' && searchResultIds.length > 0,
  });
  const favoriteResultIdSet = useMemo(
    () => new Set(favoriteResultIds),
    [favoriteResultIds],
  );

  const { data: favoriteFoods = [], isLoading: isLoadingFavorites } = useFavoriteFoods(searchQuery, {
    enabled: viewMode === 'saved',
  });

  const addFavoriteMutation = useAddFavoriteFood();
  const removeFavoriteMutation = useRemoveFavoriteFood();
  const logFoodMutation = useLogFood();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (queryParam) {
      setSearchQuery(queryParam);
    }
  }, [queryParam]);

  useEffect(() => {
    if (!preselectedFoodId || handledPreselectedFood.current) return;

    handledPreselectedFood.current = true;
    openFoodDetail(preselectedFoodId, true);
  }, [preselectedFoodId]);

  const openFoodDetail = (foodId: string, replace = false) => {
    const nextRoute = {
      pathname: '/(tabs)/nutrition/food-detail' as const,
      params: {
        id: foodId,
        ...(mealSlot ? { mealSlot } : {}),
        ...(date ? { date } : {}),
        ...(source ? { source } : {}),
      },
    };

    if (replace || source === 'home-slider') {
      router.replace(nextRoute);
      return;
    }

    router.push(nextRoute);
  };

  const openCamera = () => {
    router.push({
      pathname: '/(tabs)/nutrition/food-camera',
      params: {
        ...(mealSlot ? { mealSlot } : {}),
        ...(date ? { date } : {}),
        ...(source ? { source } : {}),
      },
    });
  };

  const openExternalFoodPreview = (food: ExternalFoodSearchResult) => {
    router.push({
      pathname: '/(tabs)/nutrition/food-detail',
      params: {
        externalProvider: food.provider,
        externalId: food.externalId,
        externalName: food.name,
        ...(food.brand ? { externalBrand: food.brand } : {}),
        ...(food.imageUrl ? { externalImageUrl: food.imageUrl } : {}),
        externalCaloriesPer100g: String(food.caloriesPer100g),
        externalProteinPer100g: String(food.proteinPer100g),
        externalCarbsPer100g: String(food.carbsPer100g),
        externalFatPer100g: String(food.fatPer100g),
        ...(food.servingSizeG ? { externalServingSizeG: String(food.servingSizeG) } : {}),
        ...(food.servingDescription ? { externalServingDescription: food.servingDescription } : {}),
        ...(mealSlot ? { mealSlot } : {}),
        ...(date ? { date } : {}),
        ...(source ? { source } : {}),
      },
    });
  };

  const toggleFavorite = async (foodId: string, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        await removeFavoriteMutation.mutateAsync(foodId);
      } else {
        await addFavoriteMutation.mutateAsync(foodId);
      }
    } catch (error: any) {
      Alert.alert(
        isFavorite ? 'Remove failed' : 'Save failed',
        error?.message || 'Try again in a moment.',
      );
    }
  };

  const dedupedExternalResults = useMemo(() => {
    const localExternalKeys = new Set(
      searchResults
        .filter((food) => food.externalSourceId)
        .map((food) => `${food.source}:${food.externalSourceId}`),
    );
    const localBarcodes = new Set(
      searchResults
        .map((food) => food.barcode?.trim())
        .filter((barcode): barcode is string => Boolean(barcode)),
    );

    return externalResults.filter((food) => {
      const externalKey = `${food.provider}:${food.externalId}`;
      const barcode = food.barcode?.trim();

      if (localExternalKeys.has(externalKey)) {
        return false;
      }

      if (barcode && localBarcodes.has(barcode)) {
        return false;
      }

      return true;
    });
  }, [externalResults, searchResults]);

  const quickLogFavorite = (food: FoodItem) => {
    if (!mealSlot) return;

    const grams = food.servingSizeG && food.servingSizeG > 0 ? food.servingSizeG : 100;
    logFoodMutation.mutate(
      {
        foodItemId: food.id,
        mealSlot,
        grams,
        ...(date ? { date } : {}),
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (error: any) => {
          Alert.alert('Log failed', error?.message || 'Could not log this food right now.');
        },
      },
    );
  };

  const getFoodSourceLabel = (food: FoodItem) => {
    if (food.source === 'usda_fdc') return 'USDA';
    if (food.source === 'openfoodfacts') return 'OpenFoodFacts';
    if (food.source === 'manual') return 'Custom';
    return 'MetriqFit';
  };

  const renderFoodsTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 100 }}
    >
      {debouncedSearchQuery.length < 2 && searchQuery.length < 2 ? (
        <View style={{ alignItems: 'center', paddingTop: s.xxl }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: c.surface2,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: s.md,
            }}
          >
            <TabBarIcon name="search" color={c.textSubtle} size={40} />
          </View>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.md,
              textAlign: 'center',
            }}
          >
            {mealSlotLabel
              ? `Search foods to add to ${mealSlotLabel.toLowerCase()} from MetriqFit, USDA, and OpenFoodFacts.`
              : 'Search foods across MetriqFit, USDA, and OpenFoodFacts.'}
          </Text>
        </View>
      ) : searchResults.length || dedupedExternalResults.length || isLoadingLocal || isLoadingExternal ? (
        <>
          {searchResults.length ? (
            <>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                  letterSpacing: 1,
                  marginBottom: s.sm,
                }}
              >
                YOUR FOODS & DATABASE FOODS
              </Text>
              {searchResults.map((food) => {
                const isFavorite = favoriteResultIdSet.has(food.id);

                return (
                  <GlassCard
                    key={food.id}
                    intensity="light"
                    style={{ marginBottom: s.sm, padding: 0 }}
                  >
                    <View style={[styles.resultCard, { padding: s.md }]}>
                      <Pressable
                        style={styles.resultTextArea}
                        onPress={() => openFoodDetail(food.id)}
                      >
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.resultTitle,
                            {
                              color: c.text,
                              fontFamily: ty.body.familyMedium,
                              fontSize: ty.sizes.md,
                            },
                          ]}
                        >
                          {food.name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.resultSubtitle,
                            {
                              color: c.textMuted,
                              fontFamily: ty.body.family,
                              fontSize: ty.sizes.sm,
                            },
                          ]}
                        >
                          {food.caloriesPer100g} cal / 100g
                          {food.brand ? ` • ${food.brand}` : ''}
                        </Text>

                        <MacroRow
                          size="sm"
                          emphasis="outlined"
                          items={[
                            { macro: 'protein', value: Math.round(food.proteinPer100g), unit: 'g' },
                            { macro: 'carbs', value: Math.round(food.carbsPer100g), unit: 'g' },
                            { macro: 'fat', value: Math.round(food.fatPer100g), unit: 'g' },
                          ]}
                        />
                      </Pressable>

                      <View style={styles.resultFooter}>
                        <View style={styles.resultTags}>
                          <View
                            style={[
                              styles.providerBadge,
                              {
                                borderRadius: r.pill,
                                borderColor: `${c.primary}28`,
                                backgroundColor: `${c.primary}10`,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: c.primary,
                                fontFamily: ty.body.familySemibold,
                                fontSize: ty.sizes.xs,
                              }}
                            >
                              {getFoodSourceLabel(food)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.resultFooterActions}>
                          <Pressable
                            onPress={() => toggleFavorite(food.id, isFavorite)}
                            accessibilityRole="button"
                            accessibilityLabel={isFavorite ? 'Remove from saved foods' : 'Save food'}
                            style={styles.iconAction}
                          >
                            <TabBarIcon
                              name={isFavorite ? 'star' : 'star-outline'}
                              color={isFavorite ? c.primary : c.textMuted}
                              size={20}
                            />
                          </Pressable>
                          <Pressable
                            onPress={() => openFoodDetail(food.id)}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${food.name}`}
                            style={[styles.iconAction, { backgroundColor: c.surface2 }]}
                          >
                            <TabBarIcon name="add" color={c.primary} size={18} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </>
          ) : null}

          {dedupedExternalResults.length ? (
            <>
              <View style={styles.sectionHeader}>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.sm,
                    letterSpacing: 1,
                    marginBottom: s.sm,
                    marginTop: searchResults.length ? s.md : 0,
                  }}
                >
                  MORE FROM USDA & OPENFOODFACTS
                </Text>
              </View>

              {dedupedExternalResults.map((food) => (
                <ExternalFoodRow
                  key={`${food.provider}:${food.externalId}`}
                  food={food}
                  onOpen={() => openExternalFoodPreview(food)}
                />
              ))}
            </>
          ) : null}

          {!searchResults.length && !dedupedExternalResults.length && (isLoadingLocal || isLoadingExternal) ? (
            <View style={{ alignItems: 'center', paddingTop: s.xxl }}>
              <ActivityIndicator size="large" color={c.primary} />
              <Text style={{ color: c.textMuted, marginTop: s.md }}>Searching...</Text>
            </View>
          ) : null}
        </>
      ) : (
        <View style={{ alignItems: 'center', paddingTop: s.xxl }}>
          <TabBarIcon name="close-circle" color={c.textSubtle} size={48} />
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familyMedium,
              fontSize: ty.sizes.md,
              marginTop: s.md,
            }}
          >
            {`No foods found for "${searchQuery}"`}
          </Text>
          <Text
            style={{
              color: c.textSubtle,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.sm,
              marginTop: s.xs,
              textAlign: 'center',
            }}
          >
            Search the food database or use Camera above if you do not see your item.
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderSavedFoodsTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 100 }}
    >
      {isLoadingFavorites ? (
        <View style={{ alignItems: 'center', paddingTop: s.xxl }}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={{ color: c.textMuted, marginTop: s.md }}>Loading saved foods...</Text>
        </View>
      ) : !favoriteFoods.length ? (
        <View style={{ alignItems: 'center', paddingTop: s.xxl }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: c.surface2,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: s.md,
            }}
          >
            <TabBarIcon name="star-outline" color={c.textSubtle} size={40} />
          </View>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.md,
              marginBottom: s.xs,
            }}
          >
            No saved foods yet
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.md,
              textAlign: 'center',
            }}
          >
            Tap the star on foods you eat often so you can log them faster later.
          </Text>
        </View>
      ) : (
        favoriteFoods.map((favorite) => (
          <SavedFoodRow
            key={favorite.favoriteId}
            favorite={favorite}
            canQuickLog={!!mealSlot}
            isLogging={logFoodMutation.isPending && logFoodMutation.variables?.foodItemId === favorite.food.id}
            onOpen={() => openFoodDetail(favorite.food.id)}
            onUnsave={() => toggleFavorite(favorite.food.id, true)}
            onLog={() => quickLogFavorite(favorite.food)}
          />
        ))
      )}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <LinearGradient colors={[c.bg, '#0a101f']} style={StyleSheet.absoluteFill} />
      <View style={{ height: insets.top }} />

      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable
          onPress={() => router.push('/(tabs)/nutrition')}
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
          {headerTitle}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <View style={[styles.searchContainer, { paddingHorizontal: s.lg }]}>
        <Text
          style={{
            color: c.text,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.md,
            marginBottom: s.sm,
          }}
        >
          Search foods
        </Text>

        <View
          style={{
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: r.xl,
            borderWidth: 1.5,
            borderColor: `${c.primary}90`,
            backgroundColor: c.surface,
            paddingHorizontal: 16,
          }}
        >
          <TabBarIcon name="search" color={c.primary} size={22} />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: c.text,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.md,
              },
            ]}
            placeholder={mealSlotLabel ? `Search foods for ${mealSlotLabel.toLowerCase()}` : 'Search foods'}
            placeholderTextColor={c.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            selectionColor={c.primary}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={{ marginLeft: 8, padding: 4 }}
            >
              <TabBarIcon name="close-circle" color={c.textMuted} size={22} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {viewMode === 'foods' ? (
        <View style={{ paddingHorizontal: s.lg, marginTop: s.sm, marginBottom: s.md }}>
          <Pressable
            onPress={openCamera}
            accessibilityRole="button"
            accessibilityLabel="Open camera to add food from a photo"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: s.sm,
              paddingHorizontal: s.md,
              paddingVertical: s.sm,
              borderRadius: r.md,
              borderWidth: 1,
              borderColor: `${c.primary}35`,
              backgroundColor: `${c.surface}CC`,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <TabBarIcon name="camera" color={c.primary} size={18} />
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  lineHeight: 20,
                  marginLeft: s.sm,
                  flex: 1,
                }}
              >
                Can&apos;t find your food? Use Camera to snap a photo and add it that way.
              </Text>
            </View>
            <Text
              style={{
                color: c.primary,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
              }}
            >
              Open Camera
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.quickActions, { paddingHorizontal: s.lg, marginBottom: s.lg }]}>
        <GlassCard intensity="light" style={{ borderRadius: r.sm, flex: 1, padding: 0 }}>
          <Pressable style={styles.quickAction} onPress={openCamera}>
            <TabBarIcon name="camera" color={c.primary} size={20} />
            <Text
              style={{
                color: c.text,
                fontFamily: ty.body.familyMedium,
                fontSize: ty.sizes.sm,
                marginLeft: s.xs,
              }}
            >
              Camera
            </Text>
          </Pressable>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', marginHorizontal: s.lg, marginBottom: s.md }}>
          <SearchTab
            label="Foods"
            active={viewMode === 'foods'}
            onPress={() => setViewMode('foods')}
          />
          <SearchTab
            label="My Recipes"
            active={viewMode === 'recipes'}
            onPress={() => setViewMode('recipes')}
          />
          <SearchTab
            label="Saved Foods"
            active={viewMode === 'saved'}
            onPress={() => setViewMode('saved')}
          />
        </View>

        {viewMode === 'foods' ? renderFoodsTab() : null}
        {viewMode === 'recipes' ? <RecipeList /> : null}
        {viewMode === 'saved' ? renderSavedFoodsTab() : null}
      </View>
    </View>
  );
}

function SearchTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { c, ty } = useTokens();

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderBottomColor: active ? c.primary : 'transparent',
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: active ? c.text : c.textMuted,
          fontFamily: ty.body.familySemibold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SavedFoodRow({
  favorite,
  canQuickLog,
  isLogging,
  onOpen,
  onUnsave,
  onLog,
}: {
  favorite: FavoriteFood;
  canQuickLog: boolean;
  isLogging: boolean;
  onOpen: () => void;
  onUnsave: () => void;
  onLog: () => void;
}) {
  const { c, s, ty, r } = useTokens();
  const { data: profile } = useProfile();
  const foodMeasurement = getDefaultFoodMeasurement(profile?.unit_system);
  const displayFoodMeasurement = (profile?.display_preferences?.food_measurement as any) ?? foodMeasurement;
  const category = detectFoodCategory(favorite.food.name);
  const servingLabel = (() => {
    if (favorite.food.servingSizeG && favorite.food.servingSizeG > 0) {
      if (favorite.food.servingDescription) return favorite.food.servingDescription;
      const fmt = formatFoodQuantity(favorite.food.servingSizeG, category, displayFoodMeasurement);
      return `${fmt.value}${fmt.unit} serving`;
    }
    const fmt = formatFoodQuantity(100, category, displayFoodMeasurement);
    return `${fmt.value}${fmt.unit} default`;
  })();

  return (
    <GlassCard intensity="light" style={{ marginBottom: s.sm, padding: 0 }}>
      <View style={styles.savedRow}>
        <Pressable style={[styles.foodOpenArea, { padding: s.md }]} onPress={onOpen}>
          <View style={styles.foodInfo}>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.body.familyMedium,
                fontSize: ty.sizes.md,
              }}
            >
              {favorite.food.name}
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
              }}
            >
              {favorite.food.brand ? `${favorite.food.brand} • ` : ''}
              {favorite.food.caloriesPer100g} cal / 100g • {servingLabel}
            </Text>

            <MacroRow
              style={{ marginTop: 8 }}
              size="sm"
              emphasis="outlined"
              items={[
                { macro: 'protein', value: Math.round(favorite.food.proteinPer100g), unit: 'g' },
                { macro: 'carbs', value: Math.round(favorite.food.carbsPer100g), unit: 'g' },
                { macro: 'fat', value: Math.round(favorite.food.fatPer100g), unit: 'g' },
              ]}
            />
          </View>
        </Pressable>

        <View style={[styles.savedActions, { paddingRight: s.md }]}>
          {canQuickLog ? (
            <Pressable
              onPress={onLog}
              disabled={isLogging}
              style={[
                styles.savedLogButton,
                {
                  backgroundColor: isLogging ? c.textMuted : c.primary,
                  borderRadius: r.pill,
                },
              ]}
            >
              {isLogging ? (
                <ActivityIndicator size="small" color={c.bg} />
              ) : (
                <Text
                  style={{
                    color: c.bg,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.xs,
                  }}
                >
                  Log
                </Text>
              )}
            </Pressable>
          ) : null}

          <Pressable
            onPress={onUnsave}
            accessibilityRole="button"
            accessibilityLabel="Remove from saved foods"
            style={styles.iconAction}
          >
            <TabBarIcon name="star" color={c.primary} size={20} />
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

function ExternalFoodRow({
  food,
  onOpen,
}: {
  food: ExternalFoodSearchResult;
  onOpen: () => void;
}) {
  const { c, s, ty, r } = useTokens();
  const providerLabel = food.provider === 'usda_fdc' ? 'USDA' : 'OpenFoodFacts';

  return (
    <GlassCard intensity="light" style={{ marginBottom: s.sm, padding: 0 }}>
      <View style={[styles.resultCard, { padding: s.md }]}>
        <Pressable
          style={styles.resultTextArea}
          onPress={onOpen}
        >
          <Text
            numberOfLines={2}
            style={[
              styles.resultTitle,
              {
                color: c.text,
                fontFamily: ty.body.familyMedium,
                fontSize: ty.sizes.md,
              },
            ]}
          >
            {food.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.resultSubtitle,
              {
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
              },
            ]}
          >
            {food.caloriesPer100g} cal / 100g
            {food.brand ? ` • ${food.brand}` : ''}
          </Text>

          <MacroRow
            size="sm"
            emphasis="outlined"
            items={[
              { macro: 'protein', value: Math.round(food.proteinPer100g), unit: 'g' },
              { macro: 'carbs', value: Math.round(food.carbsPer100g), unit: 'g' },
              { macro: 'fat', value: Math.round(food.fatPer100g), unit: 'g' },
            ]}
          />
        </Pressable>

        <View style={styles.resultFooter}>
          <View style={styles.resultTags}>
            <View
              style={[
                styles.providerBadge,
                {
                  borderRadius: r.pill,
                  borderColor: `${c.primary}40`,
                  backgroundColor: `${c.primary}12`,
                },
              ]}
            >
              <Text
                style={{
                  color: c.primary,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                }}
              >
                {providerLabel}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={`Preview ${food.name}`}
            style={[styles.iconAction, { backgroundColor: c.surface2 }]}
          >
            <TabBarIcon name="add" color={c.primary} size={18} />
          </Pressable>
        </View>
      </View>
    </GlassCard>
  );
}

function RecipeList() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes', user?.id],
    queryFn: async () => {
      const { getUserRecipes } = await import('../../../services/recipeService');
      if (!user) return [];
      return getUserRecipes(user.id);
    },
    enabled: !!user,
  });

  const logRecipeMutation = useMutation({
    mutationFn: async ({
      recipe,
      mealSlot,
    }: {
      recipe: any;
      mealSlot: MealSlot;
    }) => {
      const { logRecipeAsMeal } = await import('../../../services/recipeService');
      if (!user) throw new Error('Please sign in again.');
      return logRecipeAsMeal(user.id, recipe, mealSlot, 1.0);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition'] });
      Alert.alert('Recipe logged', 'Recipe added to your meal log for today.');
      router.push('/(tabs)/nutrition');
    },
    onError: (error: any) => {
      Alert.alert('Log failed', error?.message || 'Could not log recipe right now.');
    },
  });

  const handleLogRecipe = (recipe: any) => {
    Alert.alert('Log Recipe', `Add "${recipe.name}" to which meal?`, [
      { text: 'Breakfast', onPress: () => logRecipeMutation.mutate({ recipe, mealSlot: 'breakfast' }) },
      { text: 'Lunch', onPress: () => logRecipeMutation.mutate({ recipe, mealSlot: 'lunch' }) },
      { text: 'Dinner', onPress: () => logRecipeMutation.mutate({ recipe, mealSlot: 'dinner' }) },
      { text: 'Snack', onPress: () => logRecipeMutation.mutate({ recipe, mealSlot: 'snack' }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: 100 }}>
      <Pressable
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.primary,
          padding: 12,
          borderRadius: r.md,
          marginBottom: s.lg,
        }}
        onPress={() => router.push('/(tabs)/nutrition/recipes/create')}
      >
        <TabBarIcon name="add" color={c.bg} size={20} />
        <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, marginLeft: 8 }}>
          Create New Recipe
        </Text>
      </Pressable>

      <Pressable
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: c.border,
          padding: 12,
          borderRadius: r.md,
          marginBottom: s.lg,
        }}
        onPress={() => router.push('/(tabs)/nutrition/recipe-import')}
      >
        <TabBarIcon name="link-outline" color={c.text} size={18} />
        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, marginLeft: 8 }}>
          Import URL
        </Text>
      </Pressable>

      {isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : (
        recipes?.map((recipe) => (
          <GlassCard key={recipe.id} style={{ marginBottom: s.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>{recipe.name}</Text>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <Text style={{ color: c.textMuted, fontSize: 10, textTransform: 'capitalize' }}>
                      {recipe.source_type === 'manual' ? 'Manual' : recipe.source_type?.replace('_', ' ') || 'Imported'}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>
                  {recipe.ingredients?.length || 0} ingredients
                </Text>
              </View>
              <Pressable onPress={() => handleLogRecipe(recipe)} disabled={logRecipeMutation.isPending}>
                <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>Log</Text>
              </Pressable>
            </View>
          </GlassCard>
        ))
      )}
    </ScrollView>
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
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    minHeight: 48,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  scrollView: {
    flex: 1,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodOpenArea: {
    flex: 1,
  },
  foodInfo: {
    flex: 1,
  },
  resultCard: {
    gap: 12,
  },
  resultTextArea: {
    gap: 6,
  },
  resultTitle: {
    lineHeight: 28,
  },
  resultSubtitle: {
    lineHeight: 20,
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  resultFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedLogButton: {
    minWidth: 58,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
