import React, { useState } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, Keyboard } from 'react-native';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';

interface ChatInputBarProps {
  onSend?: (message: string) => void;
  onQuickActionsPress?: () => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  quickActionLabel?: string;
  bottomOffset?: number;
}

export function ChatInputBar({
  onSend,
  onQuickActionsPress,
  placeholder = 'Ask your AI coach...',
  maxLength = 500,
  disabled = false,
  quickActionLabel = 'Open coach actions',
  bottomOffset = 0,
}: ChatInputBarProps) {
  const { c, s, ty, r } = useTokens();
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
          backgroundColor: c.bg,
          borderTopWidth: 1,
          borderTopColor: c.border,
          paddingHorizontal: s.lg,
          paddingTop: s.sm,
          paddingBottom: (insets.bottom > 0 ? insets.bottom : s.md) + bottomOffset,
        },
      ]}
    >
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: c.surface,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: hasMessage ? `${c.primary}55` : c.border,
          },
        ]}
      >
        {onQuickActionsPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={quickActionLabel}
            onPress={onQuickActionsPress}
            style={({ pressed }) => [
              styles.quickActionButton,
              {
                borderRadius: r.pill,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: pressed ? c.surface2 : c.bg,
              },
            ]}
          >
            <TabBarIcon
              name="add"
              color={c.textMuted}
              size={18}
            />
          </Pressable>
        ) : null}
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hasMessage ? 'Send message to coach' : 'Enter a message to enable send'}
            style={({ pressed }) => [
              styles.sendButton,
              {
                backgroundColor: hasMessage ? c.primary : c.surface2,
                borderRadius: r.pill,
                transform: [{ scale: pressed && hasMessage ? 0.9 : 1 }],
              },
            ]}
            onPress={handleSend}
            disabled={!hasMessage || disabled}
          >
            <TabBarIcon
              name="arrow-up"
              color={hasMessage ? c.bg : c.textSubtle}
              size={18}
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
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
  },
  quickActionButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 112,
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
    marginTop: 7,
    paddingHorizontal: 4,
  },
});
