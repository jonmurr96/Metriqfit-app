import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { useTokens } from '../../lib/theme';

interface AuthFooterLinksProps {
  prompt: string;
  actionLabel: string;
  href: string;
  disabled?: boolean;
}

export function AuthFooterLinks({ prompt, actionLabel, href, disabled = false }: AuthFooterLinksProps) {
  const { c, ty } = useTokens();

  return (
    <View style={styles.row}>
      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 13 }}>{prompt} </Text>
      <Link href={href as any} asChild>
        <Pressable disabled={disabled} accessibilityRole="link" accessibilityLabel={actionLabel}>
          <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 13 }}>{actionLabel}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
