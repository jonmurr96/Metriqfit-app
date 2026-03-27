import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { MacroInlineSummary } from '../../../components/nutrition/MacroInlineSummary';
import { MacroRow } from '../../../components/nutrition/MacroRow';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { useFeatureAccess } from '../../../hooks/useSubscription';
import {
  analyzeFoodPhoto,
  getPhotoScanUsage,
  FoodPhotoAnalysis,
  PhotoScanUsage,
} from '../../../services/foodPhotoService';
import { createUserFood, searchFoods } from '../../../services/nutritionService';
import { getTierLabel } from '../../../lib/subscription/plans';

export default function FoodCameraScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mealSlot?: string; origin?: string; planMealId?: string }>();
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const foodPhotoAccess = useFeatureAccess('food_photo_scan');

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FoodPhotoAnalysis | null>(null);
  const [scanUsage, setScanUsage] = useState<PhotoScanUsage | null>(null);
  const [selectedFoodIndex, setSelectedFoodIndex] = useState(0);
  const mealSlot = typeof params.mealSlot === 'string' ? params.mealSlot : undefined;
  const origin = typeof params.origin === 'string' ? params.origin : 'food_camera';
  const planMealId = typeof params.planMealId === 'string' ? params.planMealId : undefined;

  const loadScanUsage = useCallback(async () => {
    if (!user) return;
    try {
      const usage = await getPhotoScanUsage(user.id);
      setScanUsage(usage);
    } catch (error) {
      console.error('Failed to load scan usage:', error);
    }
  }, [user]);

  // Load scan usage on mount
  useEffect(() => {
    if (user) {
      loadScanUsage();
    }
  }, [loadScanUsage, user]);

  // Request permission on mount
  useEffect(() => {
    if (foodPhotoAccess.hasAccess && !permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [foodPhotoAccess.hasAccess, permission, requestPermission]);

  if (foodPhotoAccess.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <View style={[styles.content, { padding: s.xl, justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </View>
    );
  }

  if (!foodPhotoAccess.hasAccess) {
    const upgradeTierLabel = foodPhotoAccess.upgradeTier === 'elite' ? 'Elite' : 'Premium';

    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
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
            Scan Meal Photo
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={[styles.content, { padding: s.xl }]}>
          <View
            style={[
              styles.permissionDenied,
              {
                backgroundColor: c.surface,
                borderRadius: r.lg,
                padding: s.xl,
              },
            ]}
          >
            <TabBarIcon name="diamond-outline" color={c.primary} size={64} />
            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
                textAlign: 'center',
                marginTop: s.lg,
              }}
            >
              MetriqFit {upgradeTierLabel}
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.md,
                textAlign: 'center',
                marginTop: s.sm,
              }}
            >
              Scan Meal Photo is available on {upgradeTierLabel}. Upgrade for higher daily scan limits and faster nutrition logging.
            </Text>
            <Pressable
              style={[
                styles.ctaButton,
                {
                  backgroundColor: c.primary,
                  borderRadius: r.md,
                  marginTop: s.xl,
                },
              ]}
              onPress={() => router.push('/settings/subscription')}
            >
              <Text
                style={{
                  color: c.bg,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.md,
                }}
              >
                View Plans
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || !user) return;

    // Check rate limit before capturing
    if (scanUsage && !scanUsage.isUnlimited && scanUsage.remainingScans <= 0) {
      const upgradeTierLabel = scanUsage.tier === 'premium' ? 'Elite' : 'Premium';
      Alert.alert(
        'Daily Limit Reached',
        `${getTierLabel(scanUsage.tier)} includes ${scanUsage.scansLimit} photo scans per day. Upgrade to ${upgradeTierLabel}${upgradeTierLabel === 'Elite' ? ' for unlimited scans.' : ' for more daily scans.'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/settings/subscription') },
        ]
      );
      return;
    }

    try {
      setIsAnalyzing(true);

      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      if (!photo) {
        throw new Error('Failed to capture photo');
      }

      setCapturedPhoto(photo.uri);

      // Analyze with AI
      const result = await analyzeFoodPhoto(photo.uri, user.id);
      setAnalysis(result);

      // Reload usage stats
      await loadScanUsage();
    } catch (error: any) {
      console.error('Photo capture/analysis error:', error);
      Alert.alert('Error', error.message || 'Failed to analyze photo. Please try again.');
      setCapturedPhoto(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setAnalysis(null);
    setSelectedFoodIndex(0);
  };

  const handleConfirm = async () => {
    if (!analysis || !user) return;

    const selectedFood = analysis.foods[selectedFoodIndex] || analysis.foods[0];
    if (!selectedFood) return;

    if (!selectedFood.estimatedGrams || selectedFood.estimatedGrams <= 0) {
      Alert.alert(
        'Scan needs review',
        'We couldn’t create a reusable food from this scan. Search manually instead.',
      );
      router.replace({
        pathname: '/(tabs)/nutrition/food-search',
        params: {
          query: selectedFood.name,
          ...(mealSlot ? { mealSlot } : {}),
        },
      });
      return;
    }

    try {
      setIsAnalyzing(true);

      const normalizedSelected = selectedFood.name.trim().toLowerCase();
      const existingMatches = await searchFoods(selectedFood.name, 10);
      const exactMatch = existingMatches.find((food) => food.name.trim().toLowerCase() === normalizedSelected);

      const targetFood = exactMatch || await createUserFood(user.id, {
        name: selectedFood.name,
        category: 'photo scan',
        caloriesPer100g: (selectedFood.calories / selectedFood.estimatedGrams) * 100,
        proteinPer100g: (selectedFood.protein / selectedFood.estimatedGrams) * 100,
        carbsPer100g: (selectedFood.carbs / selectedFood.estimatedGrams) * 100,
        fatPer100g: (selectedFood.fat / selectedFood.estimatedGrams) * 100,
        servingSizeG: selectedFood.estimatedGrams,
        servingDescription: `${Math.round(selectedFood.estimatedGrams)}g serving`,
      });

      router.replace({
        pathname: '/(tabs)/nutrition/food-detail',
        params: {
          id: targetFood.id,
          ...(mealSlot ? { mealSlot } : {}),
        },
      });
    } catch (error: any) {
      Alert.alert(
        'Scan needs review',
        error?.message || 'We couldn’t create a reusable food from this scan. Search manually instead.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  // Permission denied
  if (permission?.granted === false) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
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
            Scan Meal Photo
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={[styles.content, { padding: s.xl }]}>
          <View
            style={[
              styles.permissionDenied,
              {
                backgroundColor: c.surface,
                borderRadius: r.lg,
                padding: s.xl,
              },
            ]}
          >
            <TabBarIcon name="camera-outline" color={c.textMuted} size={64} />
            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
                textAlign: 'center',
                marginTop: s.lg,
              }}
            >
              Camera Permission Required
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.md,
                textAlign: 'center',
                marginTop: s.sm,
              }}
            >
              MetriqFit needs access to your camera to analyze meal photos with AI.
            </Text>
            <Pressable
              style={[
                styles.ctaButton,
                {
                  backgroundColor: c.primary,
                  borderRadius: r.md,
                  marginTop: s.xl,
                },
              ]}
              onPress={requestPermission}
            >
              <Text
                style={{
                  color: c.bg,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.md,
                }}
              >
                Grant Permission
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // Permission pending
  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <View style={[styles.content, { padding: s.xl, justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </View>
    );
  }

  // Show analysis results
  if (capturedPhoto && analysis) {
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
            AI Analysis
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: s.lg }}>
          {/* Photo Preview */}
          <Image
            source={{ uri: capturedPhoto }}
            style={[styles.photoPreview, { borderRadius: r.lg }]}
            resizeMode="cover"
          />

          {/* Analysis Results */}
          <View style={[styles.analysisCard, { backgroundColor: c.surface, borderRadius: r.lg, padding: s.lg, marginTop: s.lg }]}>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
              Detected Foods
            </Text>

            {analysis.foods.map((food, index) => (
              <Pressable
                key={index}
                onPress={() => setSelectedFoodIndex(index)}
                style={[
                  styles.foodItem,
                  {
                    backgroundColor: c.surface2,
                    borderRadius: r.md,
                    padding: s.md,
                    marginTop: s.sm,
                    borderWidth: 1.5,
                    borderColor: selectedFoodIndex === index ? c.primary : 'transparent',
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                      {food.name}
                    </Text>
                    <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.sm, marginTop: 2 }}>
                      ~{food.estimatedGrams}g
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: c.primary, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                      {food.calories} cal
                    </Text>
                    <MacroInlineSummary
                      size="sm"
                      style={{ marginTop: 2, justifyContent: 'flex-end' }}
                      textStyle={{ fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}
                      items={[
                        { macro: 'protein', value: food.protein, unit: 'g' },
                        { macro: 'carbs', value: food.carbs, unit: 'g' },
                        { macro: 'fat', value: food.fat, unit: 'g' },
                      ]}
                    />
                  </View>
                </View>

                {/* Confidence Badge */}
                <View
                  style={[
                    styles.confidenceBadge,
                    {
                      backgroundColor: food.confidence === 'high' ? c.success : food.confidence === 'medium' ? c.warning : c.error,
                      borderRadius: r.sm,
                      marginTop: s.sm,
                      alignSelf: 'flex-start',
                    },
                  ]}
                >
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                    {food.confidence} confidence
                  </Text>
                </View>
              </Pressable>
            ))}

            {/* Totals */}
            <View style={[styles.totalsCard, { backgroundColor: c.bg, borderRadius: r.md, padding: s.md, marginTop: s.lg }]}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginBottom: s.sm }}>
                Total Estimated
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ color: c.primary, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>
                    {analysis.totalCalories}
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                    calories
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: s.md }}>
                  <MacroRow
                    size="sm"
                    emphasis="outlined"
                    style={{ justifyContent: 'flex-end' }}
                    items={[
                      { macro: 'protein', value: analysis.totalProtein, unit: 'g' },
                      { macro: 'carbs', value: analysis.totalCarbs, unit: 'g' },
                      { macro: 'fat', value: analysis.totalFat, unit: 'g' },
                    ]}
                  />
                </View>
              </View>
            </View>

            {analysis.warnings.length > 0 && (
              <View style={[styles.warningCard, { backgroundColor: c.error, borderRadius: r.md, padding: s.md, marginTop: s.lg }]}>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  ⚠️ {analysis.warnings[0]}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: s.md, marginTop: s.lg }}>
            <Pressable
              style={[
                styles.actionButton,
                {
                  backgroundColor: c.surface,
                  borderRadius: r.md,
                  flex: 1,
                },
              ]}
              onPress={handleRetake}
            >
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.md,
                }}
              >
                Retake
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.actionButton,
                {
                  backgroundColor: isAnalyzing ? c.textMuted : c.primary,
                  borderRadius: r.md,
                  flex: 1,
                },
              ]}
              onPress={() => {
                void handleConfirm();
              }}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="small" color={c.bg} />
              ) : (
                <Text
                  style={{
                    color: c.bg,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.md,
                  }}
                >
                  Continue with Selected
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Camera view
  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      {/* Header Overlay */}
      <View
        style={[
          styles.headerOverlay,
          { paddingTop: insets.top + s.md, paddingHorizontal: s.lg },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: 'rgba(11, 20, 40, 0.8)' }]}
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
          Scan Meal
        </Text>
        <Pressable
          onPress={toggleCameraFacing}
          style={[styles.backButton, { backgroundColor: 'rgba(11, 20, 40, 0.8)' }]}
          accessibilityLabel="Flip camera"
          accessibilityRole="button"
        >
          <TabBarIcon name="camera-reverse-outline" color={c.text} size={24} />
        </Pressable>
      </View>

      {/* Usage Badge */}
      {scanUsage && !scanUsage.isUnlimited && (
        <View
          style={[
            styles.usageBadge,
            {
              backgroundColor: 'rgba(11, 20, 40, 0.9)',
              borderRadius: r.sm,
              position: 'absolute',
              top: insets.top + 70,
              alignSelf: 'center',
            },
          ]}
        >
          <Text
            style={{
              color: scanUsage.remainingScans > 0 ? c.primary : c.error,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
            }}
          >
            {scanUsage.remainingScans} scans left today
          </Text>
        </View>
      )}

      {/* Capture Button */}
      <View style={[styles.captureContainer, { paddingBottom: insets.bottom + s.xl }]}>
        {isAnalyzing ? (
          <View style={[styles.captureButton, { backgroundColor: c.surface2 }]}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : (
          <Pressable
            style={[styles.captureButton, { backgroundColor: c.primary }]}
            onPress={handleCapture}
          >
            <TabBarIcon name="camera" color={c.bg} size={40} />
          </Pressable>
        )}

        <Text
          style={{
            color: c.text,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.sm,
            textAlign: 'center',
            marginTop: s.md,
          }}
        >
          {isAnalyzing ? 'Analyzing with AI...' : 'Tap to capture'}
        </Text>

        {/* Elite Badge */}
        <View
          style={[
            styles.eliteBadge,
            {
              backgroundColor: 'rgba(11, 20, 40, 0.9)',
              borderRadius: r.sm,
              marginTop: s.lg,
            },
          ]}
        >
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
            }}
          >
            ✨ AI-powered logging
          </Text>
        </View>
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
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
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
    flex: 1,
    justifyContent: 'center',
  },
  permissionDenied: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  captureContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  eliteBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'center',
  },
  ctaButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  analysisCard: {},
  foodItem: {},
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  totalsCard: {},
  warningCard: {},
  actionButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
