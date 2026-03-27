import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { scanBarcode } from '../../../services/barcodeService';
import { useFeatureAccess } from '../../../hooks/useSubscription';

export default function BarcodeScannerScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mealSlot?: string; origin?: string; planMealId?: string }>();
  const { user } = useAuth();
  const barcodeAccess = useFeatureAccess('barcode_scan');
  const mealSlot = typeof params.mealSlot === 'string' ? params.mealSlot : undefined;
  const origin = typeof params.origin === 'string' ? params.origin : 'barcode';
  const planMealId = typeof params.planMealId === 'string' ? params.planMealId : undefined;

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  // Request permission on mount
  useEffect(() => {
    if (barcodeAccess.hasAccess && !permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [barcodeAccess.hasAccess, permission, requestPermission]);

  const handleBarcodScanned = async ({ data }: BarcodeScanningResult) => {
    // Prevent duplicate scans
    if (isScanning || scannedBarcode === data) return;

    setIsScanning(true);
    setScannedBarcode(data);

    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to scan barcodes');
        return;
      }

      // Lookup the barcode
      const result = await scanBarcode(data, user.id);

      if (result.matchedFoodItem) {
        // Food found! Navigate to food-search with pre-selected item
        router.push({
          pathname: '/(tabs)/nutrition/food-search',
          params: {
            preselectedFoodId: result.matchedFoodItem.id,
            ...(mealSlot ? { mealSlot } : {}),
            ...(origin ? { origin } : {}),
            ...(planMealId ? { planMealId } : {}),
          },
        });
      } else if (result.food) {
        // Food found but needs manual review
        Alert.alert(
          'Food Found',
          `${result.food.name || 'Unknown Food'}\n\nThis item needs manual review. Would you like to search for it manually?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Search',
              onPress: () => {
                router.push({
                  pathname: '/(tabs)/nutrition/food-search',
                  params: {
                    query: result.food?.name || '',
                    ...(mealSlot ? { mealSlot } : {}),
                    ...(origin ? { origin } : {}),
                    ...(planMealId ? { planMealId } : {}),
                  },
                });
              },
            },
          ]
        );
      } else {
        // No food found
        Alert.alert(
          'Not Found',
          `Barcode ${data} not found in our database. Would you like to search manually?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Search',
              onPress: () => {
                router.push({
                  pathname: '/(tabs)/nutrition/food-search',
                  params: {
                    ...(mealSlot ? { mealSlot } : {}),
                    ...(origin ? { origin } : {}),
                    ...(planMealId ? { planMealId } : {}),
                  },
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      if (error instanceof Error && (error.message === 'PREMIUM_REQUIRED' || error.message === 'ELITE_REQUIRED')) {
        const tierLabel = barcodeAccess.upgradeTier === 'elite' ? 'Elite' : 'Premium';
        Alert.alert(
          `MetriqFit ${tierLabel} Required`,
          `Barcode scanning is available on ${tierLabel} and above.`,
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/settings/subscription') },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to scan barcode. Please try again.');
      }
    } finally {
      // Allow scanning again after 2 seconds
      setTimeout(() => {
        setIsScanning(false);
        setScannedBarcode(null);
      }, 2000);
    }
  };

  if (barcodeAccess.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <View style={[styles.content, { padding: s.xl, justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </View>
    );
  }

  if (!barcodeAccess.hasAccess) {
    const tierLabel = barcodeAccess.upgradeTier === 'elite' ? 'Elite' : 'Premium';

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
            Scan Barcode
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
              MetriqFit {tierLabel}
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
              Barcode scanning is available on {tierLabel} and above.
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
            Scan Barcode
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
              MetriqFit needs access to your camera to scan barcodes on food packages.
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

  // Camera view
  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{
          barcodeTypes: [
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'code128',
            'code39',
            'qr',
          ],
        }}
        onBarcodeScanned={isScanning ? undefined : handleBarcodScanned}
      />

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
          Scan Barcode
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Scan Target Overlay */}
      <View style={styles.scanTargetContainer}>
        <View
          style={[
            styles.scanTarget,
            {
              borderColor: isScanning ? c.success : c.primary,
              borderWidth: 3,
              borderRadius: r.md,
            },
          ]}
        >
          <View style={[styles.corner, styles.topLeft, { borderColor: c.primary }]} />
          <View style={[styles.corner, styles.topRight, { borderColor: c.primary }]} />
          <View style={[styles.corner, styles.bottomLeft, { borderColor: c.primary }]} />
          <View style={[styles.corner, styles.bottomRight, { borderColor: c.primary }]} />
        </View>

        {isScanning && (
          <View style={[styles.scanningIndicator, { marginTop: s.lg }]}>
            <ActivityIndicator size="small" color={c.primary} />
            <Text
              style={{
                color: c.primary,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.md,
                marginLeft: s.sm,
              }}
            >
              Processing...
            </Text>
          </View>
        )}
      </View>

      {/* Instructions */}
      <View style={[styles.instructions, { paddingHorizontal: s.xl, paddingBottom: insets.bottom + s.xl }]}>
        <Text
          style={{
            color: c.text,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.md,
            textAlign: 'center',
          }}
        >
          Position barcode within the frame
        </Text>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
            textAlign: 'center',
            marginTop: s.xs,
          }}
        >
          Scanning will happen automatically
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
            ✨ Premium convenience
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
  scanTargetContainer: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanTarget: {
    width: 280,
    height: 140,
    position: 'relative',
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 20, 40, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderWidth: 4,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: -2,
    right: -2,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
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
});
