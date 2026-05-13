import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';

interface MessageBubbleProps {
  message: string;
  sender: 'user' | 'coach';
  timestamp?: string;
  animated?: boolean;
  delay?: number;
}

export function MessageBubble({
  message,
  sender,
  timestamp,
  animated = true,
  delay = 0,
}: MessageBubbleProps) {
  const { c, s, ty, r } = useTokens();
  const isUser = sender === 'user';

  const Wrapper = animated ? MotiView : View;
  const animationProps = animated
    ? {
      from: { opacity: 0, translateY: 10, scale: 0.95 },
      animate: { opacity: 1, translateY: 0, scale: 1 },
      transition: { type: 'spring' as const, damping: 15, stiffness: 150, delay } as any,
    }
    : {};

  return (
    <Wrapper
      {...animationProps}
      style={[
        styles.container,
        { paddingHorizontal: s.lg },
        isUser ? styles.userContainer : styles.coachContainer,
      ]}
    >
      {!isUser && (
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: c.surface2,
              borderColor: c.border,
            },
          ]}
        >
          <TabBarIcon name="sparkles" color={c.textMuted} size={14} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? {
              backgroundColor: `${c.primary}22`,
              borderRadius: r.lg,
              borderBottomRightRadius: 6,
              borderWidth: 1,
              borderColor: `${c.primary}30`,
            }
            : {
              backgroundColor: c.surface,
              borderRadius: r.lg,
              borderBottomLeftRadius: 6,
              borderWidth: 1,
              borderColor: c.border,
            },
        ]}
      >
        <Text
          style={[
            styles.messageText,
            {
              color: c.text,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.md,
              lineHeight: 23,
            },
          ]}
        >
          {message}
        </Text>
        {timestamp && (
          <Text
            style={[
              styles.timestamp,
              {
                color: c.textSubtle,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
                marginTop: s.xs,
              },
            ]}
          >
            {timestamp}
          </Text>
        )}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  coachContainer: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
  },
  bubble: {
    maxWidth: '86%',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  messageText: {},
  timestamp: {
    textAlign: 'right',
  },
});
