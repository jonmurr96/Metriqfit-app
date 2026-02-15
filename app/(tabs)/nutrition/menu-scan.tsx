import { useMemo, useRef, useState } from 'react';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { NutritionEliteGate } from '../../../components/nutrition/NutritionEliteGate';
import { useFeatureAccess } from '../../../hooks/useSubscription';
import { useMenuScan } from '../../../hooks/useMenuScan';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { useActiveNutritionPlan, useNutritionPlanDay } from '../../../hooks/usePlan';
import { upsertImportedRecipe } from '../../../services/recipeService';
import { searchFoods } from '../../../services/nutritionService';
import type { MenuGoal, MenuCandidate } from '../../../services/menuScanService';

const GOAL_OPTIONS: Array<{ id: MenuGoal; label: string }> = [
  { id: 'cut', label: 'Cut' },
  { id: 'bulk', label: 'Bulk' },
  { id: 'high_protein', label: 'High Protein' },
  { id: 'low_sodium', label: 'Low Sodium' },
  { id: 'balanced', label: 'Balanced' },
];

export default function MenuScanScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const access = useFeatureAccess('menu_scan');
  const scanMutation = useMenuScan();
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<'text' | 'photo'>('text');
  const [menuText, setMenuText] = useState('');
  const [photoBase64, setPhotoBase64] = useState<string | undefined>(undefined);
  const [goals, setGoals] = useState<MenuGoal[]>(['balanced', 'high_protein']);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [savingRecipe, setSavingRecipe] = useState(false);

  const { data: activePlan } = useActiveNutritionPlan();
  const today = new Date().getDay();
  const { data: dayPlan } = useNutritionPlanDay(today, { enabled: !!activePlan, planId: activePlan?.id });

  const nextPlanMealId = useMemo(() => {
    const meals = dayPlan?.meals || [];
    if (!meals.length) return null;
    const order: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
    return [...meals].sort((a, b) => (order[a.meal_slot] ?? 10) - (order[b.meal_slot] ?? 10))[0]?.id || null;
  }, [dayPlan]);

  const selectedCandidate = useMemo<MenuCandidate | null>(() => {
    if (!scanMutation.data) return null;
    if (!selectedName) return scanMutation.data.bestChoice;
    const all = [scanMutation.data.bestChoice, ...(scanMutation.data.runnerUps || [])];
    return all.find((cnd) => cnd.name === selectedName) || scanMutation.data.bestChoice;
  }, [scanMutation.data, selectedName]);

  const toggleGoal = (goal: MenuGoal) => {
    setGoals((prev) => {
      if (prev.includes(goal)) {
        const next = prev.filter((g) => g !== goal);
        return next.length ? next : ['balanced'];
      }
      return [...prev, goal];
    });
  };

  const runScan = async () => {
    if (mode === 'text' && !menuText.trim()) {
      Alert.alert('Missing menu', 'Paste menu text to analyze.');
      return;
    }
    if (mode === 'photo' && !photoBase64) {
      Alert.alert('Missing photo', 'Capture a menu photo first.');
      return;
    }

    try {
      const result = await scanMutation.mutateAsync({
        menuText: mode === 'text' ? menuText : undefined,
        imageBase64: mode === 'photo' ? photoBase64 : undefined,
        goals,
      });
      setSelectedName(result.bestChoice.name);
    } catch (error: any) {
      Alert.alert('Scan failed', error?.message || 'Could not analyze menu.');
    }
  };

  const applyToNextMeal = async () => {
    if (!selectedCandidate) return;
    if (!nextPlanMealId) {
      Alert.alert('No meal slot', 'No active nutrition plan slot found for today.');
      return;
    }

    try {
      await scanMutation.mutateAsync({
        menuText: mode === 'text' ? menuText : undefined,
        imageBase64: mode === 'photo' ? photoBase64 : undefined,
        goals,
        applyToMealId: nextPlanMealId,
        selectedItemName: selectedCandidate.name,
      });

      Alert.alert('Applied', 'Menu recommendation applied to your next meal slot.', [
        { text: 'Open Plan', onPress: () => router.push('/(tabs)/nutrition/my-plan') },
      ]);
    } catch (error: any) {
      Alert.alert('Apply failed', error?.message || 'Could not apply menu choice.');
    }
  };

  const saveAsRecipe = async () => {
    if (!user || !selectedCandidate) return;
    setSavingRecipe(true);

    try {
      const topFood = await searchFoods(selectedCandidate.name, 1);
      const mapped = topFood[0];
      if (!mapped) {
        Alert.alert('No food match', 'Could not map this menu item to a known food yet.');
        return;
      }

      await upsertImportedRecipe(user.id, {
        name: selectedCandidate.name,
        description: 'Saved from Menu Scan helper',
        instructions: selectedCandidate.modifications.join('\n'),
        ingredients: [
          {
            foodItemId: mapped.id,
            grams: 100,
          },
        ],
        sourceType: 'menu_import',
        sourceUrl: null,
        sourceDomain: null,
        importStatus: 'needs_review',
        importConfidence: 60,
      });

      Alert.alert('Saved', 'Menu choice saved to My Recipes.');
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Could not save menu recipe.');
    } finally {
      setSavingRecipe(false);
    }
  };

  const captureMenuPhoto = async (camera: CameraView | null) => {
    if (!camera) return;
    try {
      const snap = await camera.takePictureAsync({
        quality: 0.6,
        base64: true,
      });
      if (!snap?.base64) {
        throw new Error('Capture failed');
      }
      setPhotoBase64(snap.base64);
      Alert.alert('Captured', 'Menu photo captured. Tap Analyze Menu.');
    } catch (error: any) {
      Alert.alert('Capture failed', error?.message || 'Could not capture menu photo.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderRadius: r.pill }]}> 
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
          Menu Scan Helper
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + s.xl }}>
        {!access.isLoading && !access.hasAccess ? (
          <NutritionEliteGate
            title="Elite Menu Intelligence"
            subtitle="Scan restaurant menus and get ranked best choices with modification guidance."
          />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: s.sm, marginBottom: s.md }}>
              <Pressable
                onPress={() => setMode('text')}
                style={{
                  flex: 1,
                  borderRadius: r.md,
                  borderWidth: 1,
                  borderColor: mode === 'text' ? c.primary : c.border,
                  backgroundColor: mode === 'text' ? `${c.primary}15` : c.surface,
                  paddingVertical: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: mode === 'text' ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold }}>
                  Paste Text
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('photo')}
                style={{
                  flex: 1,
                  borderRadius: r.md,
                  borderWidth: 1,
                  borderColor: mode === 'photo' ? c.primary : c.border,
                  backgroundColor: mode === 'photo' ? `${c.primary}15` : c.surface,
                  paddingVertical: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: mode === 'photo' ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold }}>
                  Menu Photo
                </Text>
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, padding: s.md }]}> 
              <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.mono.family }]}>Goals</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.xs, marginTop: s.sm }}>
                {GOAL_OPTIONS.map((goal) => {
                  const selected = goals.includes(goal.id);
                  return (
                    <Pressable
                      key={goal.id}
                      onPress={() => toggleGoal(goal.id)}
                      style={{
                        borderRadius: r.pill,
                        borderWidth: 1,
                        borderColor: selected ? c.primary : c.border,
                        backgroundColor: selected ? `${c.primary}15` : c.surface2,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: selected ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                        {goal.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {mode === 'text' ? (
                <TextInput
                  value={menuText}
                  onChangeText={setMenuText}
                  onChange={(event) => {
                    const nextValue = event.nativeEvent?.text;
                    if (typeof nextValue === 'string') setMenuText(nextValue);
                  }}
                  multiline
                  placeholder="Paste menu text here..."
                  placeholderTextColor={c.textMuted}
                  style={[styles.input, { marginTop: s.md, minHeight: 140, color: c.text, borderColor: c.border, fontFamily: ty.body.family }]}
                />
              ) : (
                <View style={{ marginTop: s.md }}>
                  {!permission?.granted ? (
                    <Pressable
                      onPress={requestPermission}
                      style={[styles.primaryBtn, { backgroundColor: c.primary, borderRadius: r.md }]}
                    >
                      <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold }}>Grant Camera Access</Text>
                    </Pressable>
                  ) : (
                    <CameraCapture onCapture={captureMenuPhoto} borderColor={c.border} />
                  )}
                  {!!photoBase64 && (
                    <Text style={{ marginTop: s.sm, color: c.success, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                      Photo captured and ready for analysis.
                    </Text>
                  )}
                </View>
              )}

              <Pressable
                onPress={runScan}
                disabled={scanMutation.isPending}
                style={[styles.primaryBtn, { backgroundColor: c.primary, borderRadius: r.md, marginTop: s.md }]}
              >
                {scanMutation.isPending ? (
                  <ActivityIndicator color={c.bg} size="small" />
                ) : (
                  <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                    Analyze Menu
                  </Text>
                )}
              </Pressable>
            </View>

            {!!scanMutation.data && (
              <View style={{ marginTop: s.lg, gap: s.md }}>
                {[scanMutation.data.bestChoice, ...scanMutation.data.runnerUps].map((item, index) => {
                  const active = selectedCandidate?.name === item.name;
                  return (
                    <Pressable
                      key={`${item.name}-${index}`}
                      onPress={() => setSelectedName(item.name)}
                      style={{
                        borderRadius: r.md,
                        borderWidth: 1,
                        borderColor: active ? c.primary : c.border,
                        backgroundColor: c.surface,
                        padding: s.md,
                      }}
                    >
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                        {index === 0 ? 'Best Choice' : `Runner-up ${index}`} • {item.name}
                      </Text>
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 6 }}>
                        {item.macros.calories} kcal • {item.macros.protein}P / {item.macros.carbs}C / {item.macros.fat}F • Sodium {item.macros.sodiumMg}mg
                      </Text>
                      {!!item.modifications?.length && (
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 6 }}>
                          {item.modifications[0]}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}

                <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.md, padding: s.md }]}> 
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Why this choice
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 6 }}>
                    {scanMutation.data.rationale.summary}
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                    {scanMutation.data.rationale.note}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: s.sm }}>
                  <Pressable
                    onPress={saveAsRecipe}
                    disabled={savingRecipe}
                    style={[styles.secondaryBtn, { flex: 1, borderRadius: r.md, borderColor: c.border }]}
                  >
                    {savingRecipe ? (
                      <ActivityIndicator color={c.text} size="small" />
                    ) : (
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                        Save as Recipe
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={applyToNextMeal}
                    style={[styles.primaryBtn, { flex: 1, borderRadius: r.md, backgroundColor: c.primary }]}
                  >
                    <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                      Apply to Next Meal
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => router.push('/(tabs)/nutrition/my-plan')}
                  style={[styles.secondaryBtn, { borderRadius: r.md, borderColor: c.border }]}
                >
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Open Plan Editor
                  </Text>
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CameraCapture({
  onCapture,
  borderColor,
}: {
  onCapture: (camera: CameraView | null) => Promise<void>;
  borderColor: string;
}) {
  const cameraRef = useRef<CameraView | null>(null);

  return (
    <View>
      <View style={{ height: 220, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor }}>
        <CameraView
          ref={(ref) => {
            cameraRef.current = ref;
          }}
          style={{ flex: 1 }}
          facing="back"
        />
      </View>
      <Pressable
        onPress={() => onCapture(cameraRef.current)}
        style={{
          marginTop: 10,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          borderWidth: 1,
          borderColor,
          paddingVertical: 10,
        }}
      >
        <Text>Capture Menu</Text>
      </Pressable>
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
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
});
