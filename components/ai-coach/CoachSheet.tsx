import React from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

interface CoachSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function CoachSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: CoachSheetProps) {
  const { c, s, r, ty } = useTokens();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <MotiView
          from={{ opacity: 0, translateY: 28 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 220 }}
          style={[
            styles.sheet,
            {
              backgroundColor: c.surface,
              borderTopLeftRadius: r.xl,
              borderTopRightRadius: r.xl,
              paddingBottom: insets.bottom + s.md,
              borderColor: `${c.primary}22`,
            },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: c.textSubtle }]} />
          </View>

          <View style={[styles.header, { paddingHorizontal: s.xl, paddingBottom: s.md }]}>
            <View style={styles.headerText}>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.xl,
                }}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.sm,
                    marginTop: s.xs,
                    lineHeight: 20,
                  }}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close sheet"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  backgroundColor: pressed ? c.surface2 : c.surface,
                  borderRadius: r.md,
                  borderWidth: 1,
                  borderColor: c.border,
                },
              ]}
            >
              <TabBarIcon name="close" color={c.textMuted} size={18} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: s.xl,
              paddingBottom: s.lg,
            }}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View
              style={[
                styles.footer,
                {
                  paddingHorizontal: s.xl,
                  paddingTop: s.md,
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                },
              ]}
            >
              {footer}
            </View>
          ) : null}
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.7)',
  },
  sheet: {
    maxHeight: '86%',
    borderTopWidth: 1,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(18px)',
        } as any)
      : null),
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {},
});
