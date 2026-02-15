import { useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { QUICK_ADD_ACTIONS } from '../../lib/navigation/routes';
import { useFeatureAccess } from '../../hooks/useSubscription';
import {
  trackQuickAddActionSelected,
  trackQuickAddDismissed,
  type QuickAddActionId,
} from '../../lib/analytics';

interface QuickAddSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 480;

export function QuickAddSheet({ isVisible, onClose }: QuickAddSheetProps) {
  const { c, s, r, ty, state } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const photoScanAccess = useFeatureAccess('food_photo_scan');
  const barcodeScanAccess = useFeatureAccess('barcode_scan');

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const getEliteActionAccess = useCallback((actionId: string) => {
    if (actionId === 'scan_meal_photo') {
      return {
        hasAccess: photoScanAccess.hasAccess,
        isLoading: photoScanAccess.isLoading,
      };
    }
    if (actionId === 'scan_barcode') {
      return {
        hasAccess: barcodeScanAccess.hasAccess,
        isLoading: barcodeScanAccess.isLoading,
      };
    }
    return { hasAccess: true, isLoading: false };
  }, [photoScanAccess.hasAccess, photoScanAccess.isLoading, barcodeScanAccess.hasAccess, barcodeScanAccess.isLoading]);

  useEffect(() => {
    if (__DEV__) {
      // VALIDATION: Ensure unique IDs
      const ids = new Set<string>();
      QUICK_ADD_ACTIONS.forEach(action => {
        if (ids.has(action.id)) {
          console.error(`[QuickAdd] Duplicate action ID found: ${action.id}`);
        }
        ids.add(action.id);
      });
    }
  }, []); // Run once on mount for dev validation

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: SHEET_HEIGHT,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, translateY, backdropOpacity]);

  const handleDismiss = useCallback(async () => {
    await trackQuickAddDismissed();
    onClose();
  }, [onClose]);

  const handleActionPress = useCallback(async (action: typeof QUICK_ADD_ACTIONS[number]) => {
    try {
      const access = getEliteActionAccess(action.id);

      if (action.isElite && access.isLoading) {
        return;
      }

      if (action.isElite && !access.hasAccess) {
        Alert.alert(
          'MetriqFit Elite Required',
          `${action.label} is available for Elite members. Upgrade to unlock this feature.`,
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/settings/subscription') },
          ]
        );
        return;
      }

      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      await trackQuickAddActionSelected(action.id as QuickAddActionId);
      onClose();

      // Small delay to let sheet close animation start
      setTimeout(() => {
        try {
          router.push(action.route as any);
        } catch (err) {
          console.error(`[QuickAdd] Failed to navigate to ${action.route}`, err);
        }
      }, 100);
    } catch (error) {
      console.error('[QuickAdd] Action failed:', error);
      onClose(); // Ensure we close even if tracking fails
    }
  }, [getEliteActionAccess, onClose, router]);

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: backdropOpacity }
        ]}
      >
        <Pressable
          style={styles.backdropPressable}
          onPress={handleDismiss}
          accessibilityLabel="Close quick add menu"
          accessibilityRole="button"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: c.surface,
            borderTopLeftRadius: r.xl,
            borderTopRightRadius: r.xl,
            paddingBottom: insets.bottom + s.lg,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: c.textSubtle }]} />
        </View>

        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: s.xl }]}>
          <Text
            style={[
              styles.title,
              {
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.xl,
              }
            ]}
          >
            Quick Add
          </Text>
          <Pressable
            onPress={handleDismiss}
            style={[styles.closeButton, { backgroundColor: c.surface2 }]}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <TabBarIcon name="close" color={c.textMuted} size={20} />
          </Pressable>
        </View>

        {/* Actions List */}
        <View style={[styles.actionsList, { paddingHorizontal: s.lg }]}>
          {QUICK_ADD_ACTIONS.map((action, index) => (
            (() => {
              const access = getEliteActionAccess(action.id);
              const isDisabled = action.isElite && access.isLoading;

              return (
                <Pressable
                  key={action.id}
                  style={({ pressed }) => [
                    styles.actionItem,
                    {
                      opacity: isDisabled ? 0.55 : 1,
                      backgroundColor: pressed ? state.pressed : 'transparent',
                      borderRadius: r.md,
                      marginBottom: index === QUICK_ADD_ACTIONS.length - 1 ? 0 : s.xs,
                    },
                  ]}
                  disabled={isDisabled}
                  onPress={() => handleActionPress(action)}
                  accessibilityLabel={action.label}
                  accessibilityHint={action.description}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.actionIcon,
                      {
                        backgroundColor: c.surface2,
                        borderRadius: r.sm,
                      }
                    ]}
                  >
                    <TabBarIcon name={action.icon} color={c.primary} size={22} />
                  </View>
                  <View style={styles.actionText}>
                    <Text
                      style={[
                        styles.actionLabel,
                        {
                          color: c.text,
                          fontFamily: ty.body.familyMedium,
                          fontSize: ty.sizes.md,
                        }
                      ]}
                    >
                      {action.label}
                    </Text>
                    <Text
                      style={[
                        styles.actionDescription,
                        {
                          color: c.textMuted,
                          fontFamily: ty.body.family,
                          fontSize: ty.sizes.sm,
                        }
                      ]}
                    >
                      {action.description}
                    </Text>
                  </View>
                  {action.isElite && (
                    <View
                      style={[
                        styles.eliteBadge,
                        { backgroundColor: c.accent2 }
                      ]}
                    >
                      <Text
                        style={[
                          styles.eliteText,
                          {
                            color: c.text,
                            fontFamily: ty.body.familySemibold,
                            fontSize: ty.sizes.xs,
                          }
                        ]}
                      >
                        ELITE
                      </Text>
                    </View>
                  )}
                  <TabBarIcon name="chevron-forward" color={c.textSubtle} size={18} />
                </Pressable>
              );
            })()
          ))}
        </View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backdropPressable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: SHEET_HEIGHT,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },
  title: {
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsList: {
    flex: 1,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  actionIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionText: {
    flex: 1,
  },
  actionLabel: {
    marginBottom: 2,
  },
  actionDescription: {
    opacity: 0.85,
  },
  eliteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  eliteText: {
    letterSpacing: 0.5,
  },
});
