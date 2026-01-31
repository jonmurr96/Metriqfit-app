import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../../lib/theme';
import { TabBarIcon } from '../../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../../components/premium/GlassCard';
import { useAuth } from '../../../../lib/auth/AuthProvider';
import { createRecipe } from '../../../../services/recipeService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { searchFoods } from '../../../../services/nutritionService';

export default function CreateRecipeScreen() {
    const { c, s, ty, r } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Form State
    const [name, setName] = useState('');
    const [instructions, setInstructions] = useState('');
    const [ingredients, setIngredients] = useState<any[]>([]);

    // Search State
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        try {
            const foods = await searchFoods(query, 10);
            setResults(foods);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const addIngredient = (food: any) => {
        setIngredients([...ingredients, { ...food, grams: 100 }]); // Default 100g
        setQuery('');
        setResults([]);
    };

    const removeIngredient = (index: number) => {
        const newIngs = [...ingredients];
        newIngs.splice(index, 1);
        setIngredients(newIngs);
    };

    const updateAmount = (index: number, grams: string) => {
        const newIngs = [...ingredients];
        newIngs[index].grams = parseFloat(grams) || 0;
        setIngredients(newIngs);
    };

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('Not logged in');
            const finalIngredients = ingredients.map(ing => ({
                foodItemId: ing.id,
                grams: ing.grams
            }));
            return createRecipe(user.id, name, instructions, finalIngredients);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recipes'] });
            Alert.alert("Success", "Recipe created!", [
                { text: "OK", onPress: () => router.back() }
            ]);
        },
        onError: (err) => {
            Alert.alert("Error", err.message);
        }
    });

    return (
        <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, { paddingHorizontal: s.lg }]}>
                <Pressable
                    onPress={() => router.back()}
                    style={[styles.backButton, { backgroundColor: c.surface }]}
                >
                    <TabBarIcon name="chevron-back" color={c.text} size={24} />
                </Pressable>
                <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }]}>
                    Create Recipe
                </Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: 100 }}>
                {/* Name */}
                <GlassCard style={{ marginBottom: s.lg }}>
                    <Text style={{ color: c.textMuted, marginBottom: 8 }}>Recipe Name</Text>
                    <TextInput
                        style={{ color: c.text, fontSize: 18, borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 8 }}
                        placeholder="e.g. High Protein Breakfast"
                        placeholderTextColor={c.textSubtle}
                        value={name}
                        onChangeText={setName}
                    />
                </GlassCard>

                {/* Ingredients List */}
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, marginBottom: s.md }}>Ingredients</Text>

                {ingredients.map((item, idx) => (
                    <GlassCard key={idx} style={{ marginBottom: s.sm, padding: s.md }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>{item.name}</Text>
                                <Text style={{ color: c.textMuted, fontSize: 12 }}>{item.calories} kcal / 100g</Text>
                            </View>
                            <Pressable onPress={() => removeIngredient(idx)}>
                                <TabBarIcon name="trash-outline" color={c.error} size={20} />
                            </Pressable>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                            <TextInput
                                style={{ backgroundColor: c.surface2, color: c.text, padding: 8, borderRadius: 8, width: 80, textAlign: 'center' }}
                                value={item.grams.toString()}
                                onChangeText={(t) => updateAmount(idx, t)}
                                keyboardType="numeric"
                            />
                            <Text style={{ color: c.textMuted, marginLeft: 8 }}>grams</Text>
                        </View>
                    </GlassCard>
                ))}

                {/* Add Ingredient Search */}
                <View style={{ marginTop: s.md, marginBottom: s.lg }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                            style={{ flex: 1, backgroundColor: c.surface, color: c.text, borderRadius: 8, padding: 12 }}
                            placeholder="Search ingredient..."
                            placeholderTextColor={c.textSubtle}
                            value={query}
                            onChangeText={setQuery}
                        />
                        <Pressable
                            onPress={handleSearch}
                            style={{ backgroundColor: c.primary, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 8 }}
                        >
                            {isSearching ? <ActivityIndicator color={c.bg} /> : <TabBarIcon name="search" color={c.bg} size={20} />}
                        </Pressable>
                    </View>

                    {/* Results Dropdown */}
                    {results.length > 0 && (
                        <View style={{ backgroundColor: c.surface, marginTop: 4, borderRadius: 8, padding: 8 }}>
                            {results.map((food) => (
                                <Pressable
                                    key={food.id}
                                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: c.surface2 }}
                                    onPress={() => addIngredient(food)}
                                >
                                    <Text style={{ color: c.text }}>{food.name}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                {/* Instructions */}
                <GlassCard style={{ marginBottom: s.lg }}>
                    <Text style={{ color: c.textMuted, marginBottom: 8 }}>Instructions (Optional)</Text>
                    <TextInput
                        style={{ color: c.text, fontSize: 16, minHeight: 80, textAlignVertical: 'top' }}
                        placeholder="Step 1..."
                        placeholderTextColor={c.textSubtle}
                        multiline
                        value={instructions}
                        onChangeText={setInstructions}
                    />
                </GlassCard>

                {/* Save Button */}
                <Pressable
                    style={{
                        backgroundColor: ingredients.length > 0 && name ? c.primary : c.surface2,
                        padding: 16,
                        borderRadius: r.md,
                        alignItems: 'center',
                        marginTop: s.lg
                    }}
                    onPress={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !name || ingredients.length === 0}
                >
                    {createMutation.isPending ? (
                        <ActivityIndicator color={c.bg} />
                    ) : (
                        <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold }}>Save Recipe</Text>
                    )}
                </Pressable>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
    backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    title: { letterSpacing: -0.3 },
    placeholder: { width: 40 },
});
