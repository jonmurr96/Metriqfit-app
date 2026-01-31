import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Keyboard, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';

interface ChatInputBarProps {
  onSend?: (message: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * Chat input bar with unified ring + glow design.
 */
export function ChatInputBar({
  onSend,
  placeholder = 'Ask your AI coach...',
  maxLength = 500,
  disabled = false,
}: ChatInputBarProps) {
  const { c, s, ty, r, glass } = useTokens();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const hasMessage = message.trim().length > 0;

  const handleSend = () => {
    if (hasMessage && !disabled) {
      onSend?.(message.trim());
      setMessage('');
      Keyboard.dismiss();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: glass.background,
          borderTopWidth: 1,
          borderTopColor: `${c.primary}30`,
          paddingHorizontal: s.lg,
          paddingTop: s.md,
          paddingBottom: insets.bottom > 0 ? insets.bottom : s.md,
        },
        Platform.OS === 'web' && {
          backdropFilter: 'blur(12px)',
        } as any,
      ]}
    >
      {/* Ring input wrapper */}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: 'transparent',
            borderRadius: r.lg,
            borderWidth: 2,
            borderColor: hasMessage ? c.primary : `${c.primary}40`,
          },
          hasMessage && {
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          },
          hasMessage && Platform.OS === 'web' && {
            boxShadow: `0 0 12px ${c.primary}40`,
          } as any,
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: c.text,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.md,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={c.textSubtle}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={maxLength}
          editable={!disabled}
        />
        <MotiView
          animate={{
            scale: hasMessage ? 1 : 0.9,
            opacity: hasMessage ? 1 : 0.5,
          }}
          transition={{ type: 'spring' as const, damping: 15, stiffness: 200 } as any}
        >
          {/* Ring send button with glow */}
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: hasMessage ? c.primary : 'transparent',
                borderWidth: hasMessage ? 0 : 2,
                borderColor: `${c.primary}40`,
                borderRadius: r.md,
                transform: [{ scale: pressed && hasMessage ? 0.9 : 1 }],
              },
              hasMessage && {
                shadowColor: c.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
              },
              hasMessage && Platform.OS === 'web' && {
                boxShadow: `0 0 16px ${c.primary}60`,
              } as any,
            ]}
            onPress={handleSend}
            disabled={!hasMessage || disabled}
          >
            <TabBarIcon
              name="chevron-forward"
              color={hasMessage ? c.bg : c.textSubtle}
              size={20}
            />
          </Pressable>
        </MotiView>
      </View>

      <View style={styles.footer}>
        <Text
          style={{
            color: c.textSubtle,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.xs,
          }}
        >
          {message.length}/{maxLength}
        </Text>
        <Text
          style={{
            color: c.textSubtle,
            fontFamily: ty.body.family,
            fontSize: 10,
          }}
        >
          Not medical advice
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
});
