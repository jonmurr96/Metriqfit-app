import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';
import {
  NutritionPrimaryNav,
  type NutritionPrimaryNavProps,
} from './NutritionPrimaryNav';

export interface NutritionSectionShellProps {
  title: string;
  primarySection: NutritionPrimaryNavProps['activeSection'];
  showBackButton?: boolean;
  children: ReactNode;
}

export function NutritionSectionShell({
  title,
  primarySection,
  showBackButton = true,
  children,
}: NutritionSectionShellProps) {
  const { c, s, ty } = useTokens();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg, paddingVertical: s.md }]}>
        {showBackButton ? (
          <Pressable
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/(tabs)/nutrition' as any);
              }
            }}
            style={[styles.backButton, { backgroundColor: c.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <TabBarIcon name="chevron-back" color={c.text} size={22} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <Text
          style={{
            color: c.text,
            fontFamily: ty.heading.familySemibold,
            fontSize: ty.sizes.xl,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
        <View style={styles.backButton} />
      </View>

      <NutritionPrimaryNav activeSection={primarySection} />
      <View style={styles.content}>{children}</View>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});
