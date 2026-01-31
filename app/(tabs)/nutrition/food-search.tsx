import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient'; // Added LinearGradient

import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { searchFoods } from '../../../services/nutritionService';
import { GlassCard } from '../../../components/premium/GlassCard'; // Added GlassCard

import { useAuth } from '../../../lib/auth/AuthProvider';

export default function FoodSearchScreen() {
  const { c, s, ty, r, glass } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'foods' | 'recipes'>('foods');

  // Search foods from database (seeded + any user-added)
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['food-search', searchQuery],
    queryFn: () => searchFoods(searchQuery, 20),
    enabled: searchQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

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
          Search Food
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Bar (Glass Input) */}
      <View style={[styles.searchContainer, { paddingHorizontal: s.lg }]}>
        <GlassCard
          intensity="light"
          style={{ ...styles.searchBarCard, borderRadius: r.md, padding: 0 }}
          glowEffect
        >
          <View style={styles.searchBarContent}>
            <TabBarIcon name="search" color={c.primary} size={20} />
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: c.text,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.md,
                },
              ]}
              placeholder="Search foods..."
              placeholderTextColor={c.textSubtle}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </GlassCard>
      </View>

      {/* Quick Actions (Glass Buttons) */}
      <View style={[styles.quickActions, { paddingHorizontal: s.lg, marginBottom: s.lg }]}>
        <GlassCard
          intensity="light"
          style={{ borderRadius: r.sm, flex: 1, padding: 0 }}
        >
          <Pressable
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/nutrition/food-camera')}
          >
            <TabBarIcon name="camera" color={c.primary} size={20} />
            <Text
              style={{
                color: c.text,
                fontFamily: ty.body.familyMedium,
                fontSize: ty.sizes.sm,
                marginLeft: s.xs,
              }}
            >
              Scan Meal
            </Text>
          </Pressable>
        </GlassCard>

        <GlassCard
          intensity="light"
          style={{ borderRadius: r.sm, flex: 1, padding: 0 }}
        >
          <Pressable
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/nutrition/barcode-scanner')}
          >
            <TabBarIcon name="barcode" color={c.primary} size={20} />
            <Text
              style={{
                color: c.text,
                fontFamily: ty.body.familyMedium,
                fontSize: ty.sizes.sm,
                marginLeft: s.xs,
              }}
            >
              Scan Barcode
            </Text>
          </Pressable>
        </GlassCard>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {/* Tabs */}
        <View style={{ flexDirection: 'row', marginHorizontal: s.lg, marginBottom: s.md }}>
          <Pressable
            onPress={() => setViewMode('foods')}
            style={{ flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: viewMode === 'foods' ? c.primary : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ color: viewMode === 'foods' ? c.text : c.textMuted, fontFamily: ty.body.familySemibold }}>Foods</Text>
          </Pressable>
          <Pressable
            onPress={() => setViewMode('recipes')}
            style={{ flex: 1, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: viewMode === 'recipes' ? c.primary : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ color: viewMode === 'recipes' ? c.text : c.textMuted, fontFamily: ty.body.familySemibold }}>My Recipes</Text>
          </Pressable>
        </View>

        {viewMode === 'foods' ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 100 }}
          >
            {/* Existing Food Results Logic */}
            {searchQuery.length < 2 ? (
              <View style={{ alignItems: 'center', paddingTop: s.xxl }}>
                <View style={{
                  width: 80, height: 80, borderRadius: 40,
                  backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center',
                  marginBottom: s.md
                }}>
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
                  Start typing to search {'\n'}175+ foods in database
                </Text>
              </View>
            ) : isLoading ? (
              <View style={{ alignItems: 'center', paddingTop: s.xxl }}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={{ color: c.textMuted, marginTop: s.md }}>Searching...</Text>
              </View>
            ) : searchResults && searchResults.length > 0 ? (
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
                  {searchResults.length} RESULTS
                </Text>
                {searchResults.map((food) => (
                  <GlassCard
                    key={food.id}
                    intensity="light"
                    style={{ marginBottom: s.sm, padding: 0 }}
                  >
                    <Pressable
                      style={styles.foodCard}
                      onPress={() => router.push(`/(tabs)/nutrition/food-detail?id=${food.id}`)}
                    >
                      <View style={styles.foodInfo}>
                        <Text
                          style={{
                            color: c.text,
                            fontFamily: ty.body.familyMedium,
                            fontSize: ty.sizes.md,
                          }}
                        >
                          {food.name}
                        </Text>
                        <Text
                          style={{
                            color: c.textMuted,
                            fontFamily: ty.body.family,
                            fontSize: ty.sizes.sm,
                          }}
                        >
                          {food.caloriesPer100g} cal / 100g
                          {food.brand ? ` • ${food.brand}` : ''}
                        </Text>
                      </View>
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: c.surface2, alignItems: 'center', justifyContent: 'center'
                      }}>
                        <TabBarIcon name="add" color={c.primary} size={20} />
                      </View>
                    </Pressable>
                  </GlassCard>
                ))}
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
                  No foods found for "{searchQuery}"
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <RecipeList />
        )}
      </View>
    </View>
  );
}

function RecipeList() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const { user } = useAuth();

  // Inline fetch for simplicity (should move to hook)
  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes', user?.id],
    queryFn: async () => {
      const { getUserRecipes } = await import('../../../services/recipeService');
      if (!user) return [];
      return getUserRecipes(user.id);
    },
    enabled: !!user
  });

  return (
    <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: 100 }}>
      <Pressable
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          backgroundColor: c.primary, padding: 12, borderRadius: r.md, marginBottom: s.lg
        }}
        onPress={() => router.push('/(tabs)/nutrition/recipes/create')}
      >
        <TabBarIcon name="add" color={c.bg} size={20} />
        <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, marginLeft: 8 }}>Create New Recipe</Text>
      </Pressable>

      {isLoading ? <ActivityIndicator color={c.primary} /> : (
        recipes?.map(recipe => (
          <GlassCard key={recipe.id} style={{ marginBottom: s.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>{recipe.name}</Text>
                <Text style={{ color: c.textMuted, fontSize: 12 }}>{recipe.ingredients?.length || 0} ingredients</Text>
              </View>
              <Pressable
                onPress={() => { }} // TODO: View/Log recipe
                style={{ padding: 8, backgroundColor: c.surface2, borderRadius: 16 }}
              >
                <TabBarIcon name="add" color={c.primary} size={20} />
              </Pressable>
            </View>
          </GlassCard>
        ))
      )}

      {!isLoading && (!recipes || recipes.length === 0) && (
        <Text style={{ color: c.textMuted, textAlign: 'center' }}>No recipes created yet.</Text>
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
    marginBottom: 16,
  },
  searchBarCard: {
    overflow: 'hidden',
  },
  searchBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  scrollView: {
    flex: 1,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  foodInfo: {},
});
