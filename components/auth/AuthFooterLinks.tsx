import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

import { useTokens } from '../../lib/theme';

interface AuthFooterLinksProps {
  prompt: string;
  actionLabel: string;
  href: string;
  disabled?: boolean;
}

export function AuthFooterLinks({ prompt, actionLabel, href, disabled = false }: AuthFooterLinksProps) {
  const { c, ty } = useTokens();
  const [isPressed, setIsPressed] = useState(false);

  return (
    <View className="flex-row justify-center items-center flex-wrap">
      <Text className="text-[13px]" style={{ color: c.textMuted, fontFamily: ty.body.family }}>
        {prompt}{' '}
      </Text>
      <Link href={href as any} asChild>
        <Pressable
          disabled={disabled}
          accessibilityRole="link"
          accessibilityLabel={actionLabel}
          onPressIn={() => setIsPressed(true)}
          onPressOut={() => setIsPressed(false)}
          className="flex-row items-center gap-[3px]"
        >
          <Text
            className="text-[13px]"
            style={{ color: c.primary, fontFamily: ty.body.familySemibold }}
          >
            {actionLabel}
          </Text>
          <MotiView
            animate={{ translateX: isPressed ? 4 : 0 }}
            transition={{ type: 'timing', duration: 150 }}
          >
            <Ionicons name="arrow-forward" size={13} color={c.primary} />
          </MotiView>
        </Pressable>
      </Link>
    </View>
  );
}
