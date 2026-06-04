import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  Platform,
  Alert,
  Easing,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { PROGRESS_QUICK_ADD_ACTIONS, QUICK_ADD_ACTIONS, type QuickAddAction } from '../../lib/navigation/routes';
import { useFeatureAccess } from '../../hooks/useSubscription';
import {
  trackQuickAddActionSelected,
  trackQuickAddDismissed,
  type QuickAddActionId,
} from '../../lib/analytics';
import { PressableScale } from '@/components/common/PressableScale';

interface QuickAddSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

// Tab bar height constant — must match _layout.tsx
const TAB_BAR_HEIGHT = 84;
const ICON_BTN_SIZE = 54;
const ITEM_GAP = 14;
const CLOSE_BTN_SIZE = 64;

export function QuickAddSheet({ isVisible, onClose }: QuickAddSheetProps) {
  const { c, ty } = useTokens();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const photoScanAccess = useFeatureAccess('food_photo_scan');
  const barcodeScanAccess = useFeatureAccess('barcode_scan');
  const actions = useMemo(
    () => (pathname?.includes('/progress') ? PROGRESS_QUICK_ADD_ACTIONS : QUICK_ADD_ACTIONS),
    [pathname],
  );

  // Animation values
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const closeBtnAnim = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(
    PROGRESS_QUICK_ADD_ACTIONS.map(() => new Animated.Value(0))
  ).current;

  const getActionAccess = useCallback(
    (actionId: string) => {
      if (actionId === 'scan_meal_photo') {
        return {
          hasAccess: photoScanAccess.hasAccess,
          isLoading: photoScanAccess.isLoading,
          upgradeTier: photoScanAccess.upgradeTier,
        };
      }
      if (actionId === 'scan_barcode') {
        return {
          hasAccess: barcodeScanAccess.hasAccess,
          isLoading: barcodeScanAccess.isLoading,
          upgradeTier: barcodeScanAccess.upgradeTier,
        };
      }
      return { hasAccess: true, isLoading: false, upgradeTier: null };
    },
    [
      barcodeScanAccess.hasAccess,
      barcodeScanAccess.isLoading,
      barcodeScanAccess.upgradeTier,
      photoScanAccess.hasAccess,
      photoScanAccess.isLoading,
      photoScanAccess.upgradeTier,
    ]
  );

  useEffect(() => {
    if (isVisible) {
      // Backdrop fades in
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();

      // Close button springs in
      Animated.spring(closeBtnAnim, {
        toValue: 1,
        damping: 14,
        stiffness: 220,
        useNativeDriver: true,
      }).start();

      // Items stagger in from bottom (last item = nearest close btn = first to appear)
      const activeItemAnims = itemAnims.slice(0, actions.length);
      const reversed = [...activeItemAnims].reverse();
      reversed.forEach((anim, i) => {
        Animated.spring(anim, {
          toValue: 1,
          delay: 40 + i * 55,
          damping: 14,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Everything fades out together, quickly
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(closeBtnAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        ...itemAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 0,
            duration: 140,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          })
        ),
      ]).start();
    }
  }, [actions.length, isVisible, backdropAnim, closeBtnAnim, itemAnims]);

  const handleDismiss = useCallback(async () => {
    await trackQuickAddDismissed();
    onClose();
  }, [onClose]);

  const handleActionPress = useCallback(
    async (action: QuickAddAction) => {
      try {
        const access = getActionAccess(action.id);
        const requiresPaidTier = action.requiredTier && action.requiredTier !== 'free';

        if (requiresPaidTier && access.isLoading) return;

        if (requiresPaidTier && !access.hasAccess) {
          const upgradeTier = access.upgradeTier || action.requiredTier;
          const tierLabel = upgradeTier === 'elite' ? 'Elite' : 'Premium';
          Alert.alert(
            `MetriqFit ${tierLabel} Required`,
            `${action.label} is available on ${tierLabel}. Upgrade to unlock this feature.`,
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

        setTimeout(() => {
          try {
            // Modals live at root level — push creates the overlay correctly.
            // Tab screens must use navigate so the screen is pushed onto that
            // tab's own stack (not the global stack), ensuring back returns to
            // the tab's index rather than wherever the user came from.
            const isModal = (action as any).isModal === true;
            if (isModal) {
              router.push(action.route as any);
            } else {
              router.navigate(action.route as any);
            }
          } catch (err) {
            console.error(`[QuickAdd] Failed to navigate to ${action.route}`, err);
          }
        }, 100);
      } catch (error) {
        console.error('[QuickAdd] Action failed:', error);
        onClose();
      }
    },
    [getActionAccess, onClose, router]
  );

  if (!isVisible) return null;

  // Base bottom position — sits just above the tab bar + safe area
  const closeBottom = insets.bottom + TAB_BAR_HEIGHT - 32;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="auto"
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleDismiss}
          accessibilityLabel="Close quick add menu"
          accessibilityRole="button"
        />
      </Animated.View>

      {/* Speed-dial items — absolutely positioned, center-aligned with FAB */}
      {actions.map((action, index) => {
        const access = getActionAccess(action.id);
        const requiresPaidTier = action.requiredTier && action.requiredTier !== 'free';
        const isDisabled = requiresPaidTier && access.isLoading;
        const badgeLabel =
          (action.requiredTier as string) === 'elite'
            ? 'ELITE'
            : (action.requiredTier as string) === 'premium'
              ? 'PREMIUM'
              : null;

        // Stack items upward from the close button
        // Item at the bottom of the list (highest index) is closest to the close button
        const stackIndex = actions.length - 1 - index;
        const itemBottom =
          closeBottom + CLOSE_BTN_SIZE + 16 + stackIndex * (ICON_BTN_SIZE + ITEM_GAP);

        const anim = itemAnims[index];

        return (
          <Animated.View
            key={action.id}
            style={[
              styles.itemRow,
              {
                bottom: itemBottom,
                left: 0,
                right: 0,
                alignItems: 'center',
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.75, 1],
                    }),
                  },
                ],
              },
            ]}
            pointerEvents={isVisible ? 'auto' : 'none'}
          >
            <PressableScale
              style={(pressed) => [
                styles.itemPressable,
                { opacity: isDisabled ? 0.45 : pressed ? 0.72 : 1 },
              ]}
              onPress={() => handleActionPress(action)}
              disabled={isDisabled}
              accessibilityLabel={action.label}
              accessibilityHint={action.description}
              accessibilityRole="button"
            >
              {/* Label pill */}
              <View style={styles.labelGroup}>
                {badgeLabel ? (
                  <View style={[styles.badge, { backgroundColor: `${c.primary}22`, borderColor: `${c.primary}55`, borderWidth: 1 }]}>
                    <Text
                      style={[
                        styles.badgeText,
                        { color: c.primary, fontFamily: ty.body.familySemibold },
                      ]}
                    >
                      {badgeLabel}
                    </Text>
                  </View>
                ) : null}
                <Text
                  style={[
                    styles.itemLabel,
                    { color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 },
                  ]}
                >
                  {action.label}
                </Text>
              </View>

              {/* Icon circle */}
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: c.surface2,
                    borderColor: `${c.primary}30`,
                    borderWidth: 1,
                    shadowColor: c.primary,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.18,
                    shadowRadius: 8,
                  },
                ]}
              >
                <TabBarIcon name={action.icon as any} color={c.primary} size={22} />
              </View>
            </PressableScale>
          </Animated.View>
        );
      })}

      {/* Close / X button — centered, aligned with FAB */}
      <Animated.View
        style={[
          styles.closeBtnWrap,
          {
            bottom: closeBottom,
            left: 0,
            right: 0,
            opacity: closeBtnAnim,
            transform: [
              {
                scale: closeBtnAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
              {
                rotate: closeBtnAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['45deg', '0deg'],
                }),
              },
            ],
          },
        ]}
        pointerEvents="auto"
      >
        <PressableScale
          style={(pressed) => [
            styles.closeBtn,
            {
              backgroundColor: c.primary,
              borderColor: c.bg,
              shadowColor: c.primary,
              opacity: pressed ? 0.82 : 1,
            },
          ]}
          onPress={handleDismiss}
          accessibilityLabel="Close quick add"
          accessibilityRole="button"
        >
          <TabBarIcon name="close" color={c.bg} size={26} />
        </PressableScale>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 6, 13, 0.82)',
  },
  // Each item row — full width, icon pinned to right column
  itemRow: {
    position: 'absolute',
  },
  // [label pill + icon] rendered as a natural-width row, centered by the parent
  itemPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10, 17, 40, 0.72)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  itemLabel: {
    letterSpacing: 0.1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    letterSpacing: 0.8,
  },
  iconCircle: {
    width: ICON_BTN_SIZE,
    height: ICON_BTN_SIZE,
    borderRadius: ICON_BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  closeBtnWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  closeBtn: {
    width: CLOSE_BTN_SIZE,
    height: CLOSE_BTN_SIZE,
    borderRadius: CLOSE_BTN_SIZE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
  },
});
