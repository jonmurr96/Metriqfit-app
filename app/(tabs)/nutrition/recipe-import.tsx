import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useFeatureAccess } from '../../../hooks/useSubscription';
import { useImportRecipe } from '../../../hooks/useRecipeImport';
import { searchFoods } from '../../../services/nutritionService';
import { upsertImportedRecipe } from '../../../services/recipeService';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { NutritionEliteGate } from '../../../components/nutrition/NutritionEliteGate';

type EditableIngredient = {
  original: string;
  name: string;
  grams_estimate: number;
  matched_food_item_id: string | null;
  matched_food_name: string | null;
  mapQuery: string;
};

export default function RecipeImportScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const access = useFeatureAccess('recipe_url_import');
  const importMutation = useImportRecipe();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<EditableIngredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const mappedCount = useMemo(
    () => ingredients.filter((ing) => ing.matched_food_item_id).length,
    [ingredients],
  );

  const onParse = async () => {
    const sourceUrl = url.trim();
    if (!sourceUrl) {
      Alert.alert('Missing URL', 'Paste a recipe URL to continue.');
      return;
    }

    try {
      const result = await importMutation.mutateAsync({
        url: sourceUrl,
        saveDraft: false,
      });

      setTitle(result.draft.name || 'Imported Recipe');
      setDescription(result.draft.description || '');
      setInstructions((result.draft.instructions || []).join('\n'));
      setWarnings(result.warnings || []);
      setConfidence(Number(result.confidence || 0));
      setIngredients(
        (result.draft.ingredients || []).map((ing) => ({
          original: ing.original,
          name: ing.name,
          grams_estimate: Number(ing.grams_estimate || 100),
          matched_food_item_id: ing.matched_food_item_id,
          matched_food_name: ing.matched_food_name,
          mapQuery: '',
        })),
      );
    } catch (error: any) {
      Alert.alert('Import failed', error?.message || 'Could not parse this URL right now.');
    }
  };

  const onAutoMatchIngredient = async (index: number) => {
    const ing = ingredients[index];
    const query = (ing.mapQuery || ing.name).trim();
    if (!query) return;

    try {
      const foods = await searchFoods(query, 1);
      const top = foods[0];
      if (!top) {
        Alert.alert('No match', `No food match found for "${query}".`);
        return;
      }

      setIngredients((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          matched_food_item_id: top.id,
          matched_food_name: top.name,
          mapQuery: top.name,
        };
        return next;
      });
    } catch (error: any) {
      Alert.alert('Mapping failed', error?.message || 'Could not map ingredient right now.');
    }
  };

  const onSaveRecipe = async () => {
    if (!user) return;

    const validIngredients = ingredients
      .filter((ing) => ing.matched_food_item_id)
      .map((ing) => ({
        foodItemId: ing.matched_food_item_id as string,
        grams: Number(ing.grams_estimate || 100),
      }));

    if (!title.trim()) {
      Alert.alert('Missing name', 'Set a recipe name before saving.');
      return;
    }

    if (!validIngredients.length) {
      Alert.alert('No mapped ingredients', 'Map at least one ingredient before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const sourceDomain = (() => {
        try {
          return new URL(url.trim()).hostname;
        } catch {
          return null;
        }
      })();

      await upsertImportedRecipe(user.id, {
        name: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim(),
        ingredients: validIngredients,
        sourceType: 'url_import',
        sourceUrl: url.trim() || null,
        sourceDomain,
        importStatus: mappedCount === ingredients.length ? 'parsed' : 'needs_review',
        importConfidence: confidence ?? null,
      });

      Alert.alert('Saved', 'Recipe imported and saved to My Recipes.', [
        {
          text: 'Open Recipes',
          onPress: () => router.replace('/(tabs)/nutrition/food-search'),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Could not save imported recipe.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderRadius: r.pill }]}> 
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
          Import Recipe URL
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + s.xl }}>
        {!access.isLoading && !access.hasAccess ? (
          <NutritionEliteGate
            title="Elite Recipe Import"
            subtitle="Import recipes from any URL, auto-map ingredients, and save reusable meal templates."
          />
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, padding: s.md }]}> 
              <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.mono.family }]}>Recipe URL</Text>
              <TextInput
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="https://example.com/recipe"
                placeholderTextColor={c.textMuted}
                style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
              />

              <Pressable
                onPress={onParse}
                disabled={importMutation.isPending}
                style={[styles.primaryBtn, { backgroundColor: c.primary, borderRadius: r.md, marginTop: s.md }]}
              >
                {importMutation.isPending ? (
                  <ActivityIndicator color={c.bg} size="small" />
                ) : (
                  <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                    Parse Recipe
                  </Text>
                )}
              </Pressable>
            </View>

            {ingredients.length > 0 && (
              <>
                <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, padding: s.md, marginTop: s.lg }]}> 
                  <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.mono.family }]}>Recipe Name</Text>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                  />

                  <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.mono.family, marginTop: s.sm }]}>Description</Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                    placeholder="Optional description"
                    placeholderTextColor={c.textMuted}
                  />

                  <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.mono.family, marginTop: s.sm }]}>Instructions</Text>
                  <TextInput
                    value={instructions}
                    onChangeText={setInstructions}
                    multiline
                    style={[styles.input, { minHeight: 100, color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                  />

                  <View style={{ marginTop: s.sm }}>
                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                      Mapped ingredients: {mappedCount}/{ingredients.length}
                      {confidence != null ? ` • Confidence ${confidence}%` : ''}
                    </Text>
                  </View>

                  {!!warnings.length && (
                    <View style={{ marginTop: s.sm }}>
                      {warnings.map((warning) => (
                        <Text key={warning} style={{ color: c.warning || '#f59e0b', fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                          • {warning}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>

                <View style={{ marginTop: s.lg, gap: s.md }}>
                  {ingredients.map((ing, index) => (
                    <View key={`${ing.original}-${index}`} style={[styles.card, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md }]}> 
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                        {ing.original}
                      </Text>

                      <TextInput
                        value={ing.name}
                        onChangeText={(value) => {
                          setIngredients((prev) => {
                            const next = [...prev];
                            next[index] = { ...next[index], name: value };
                            return next;
                          });
                        }}
                        placeholder="Ingredient name"
                        placeholderTextColor={c.textMuted}
                        style={[styles.input, { color: c.text, borderColor: c.border, fontFamily: ty.body.family, marginTop: s.sm }]}
                      />

                      <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.sm }}>
                        <TextInput
                          value={String(ing.grams_estimate)}
                          onChangeText={(value) => {
                            const grams = Number(value || 0);
                            setIngredients((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], grams_estimate: Number.isFinite(grams) ? grams : 0 };
                              return next;
                            });
                          }}
                          keyboardType="decimal-pad"
                          placeholder="grams"
                          placeholderTextColor={c.textMuted}
                          style={[styles.input, { flex: 1, color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                        />
                        <TextInput
                          value={ing.mapQuery}
                          onChangeText={(value) => {
                            setIngredients((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], mapQuery: value };
                              return next;
                            });
                          }}
                          placeholder={ing.matched_food_name || 'Search food mapping'}
                          placeholderTextColor={c.textMuted}
                          style={[styles.input, { flex: 2, color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                        />
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: s.sm }}>
                        <Text style={{ color: ing.matched_food_item_id ? c.success : c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                          {ing.matched_food_name ? `Mapped: ${ing.matched_food_name}` : 'Not mapped'}
                        </Text>
                        <Pressable onPress={() => onAutoMatchIngredient(index)} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: r.sm, borderWidth: 1, borderColor: c.primary }}>
                          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                            Find Match
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>

                <Pressable
                  onPress={onSaveRecipe}
                  disabled={isSaving}
                  style={[styles.primaryBtn, { backgroundColor: c.primary, borderRadius: r.md, marginTop: s.xl }]}
                >
                  {isSaving ? (
                    <ActivityIndicator color={c.bg} size="small" />
                  ) : (
                    <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                      Save Imported Recipe
                    </Text>
                  )}
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {},
  label: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
