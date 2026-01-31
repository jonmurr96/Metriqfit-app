import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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

/**
 * Message bubble with unified ring + glass design.
 * Coach bubbles use glass effect, user bubbles use ring border.
 */
export function MessageBubble({
  message,
  sender,
  timestamp,
  animated = true,
  delay = 0,
}: MessageBubbleProps) {
  const { c, s, ty, r, glass } = useTokens();
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
        // Ring avatar for coach
        <View
          style={[
            styles.avatar,
            {
              borderWidth: 2,
              borderColor: c.primary,
              backgroundColor: 'transparent',
            },
          ]}
        >
          <TabBarIcon name="sparkles" color={c.primary} size={14} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? {
              // Ring style for user bubble
              backgroundColor: 'transparent',
              borderRadius: r.lg,
              borderBottomRightRadius: 4,
              borderWidth: 2,
              borderColor: c.primary,
            }
            : {
              // Glass style for coach bubble
              backgroundColor: glass.background,
              borderRadius: r.lg,
              borderBottomLeftRadius: 4,
              borderWidth: 1,
              borderColor: `${c.primary}30`,
            },
          !isUser && Platform.OS === 'web' && {
            backdropFilter: 'blur(12px)',
          } as any,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            {
              color: isUser ? c.primary : c.text,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.md,
              lineHeight: 22,
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
                color: isUser ? `${c.primary}80` : c.textSubtle,
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
  },
  bubble: {
    maxWidth: '75%',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  messageText: {},
  timestamp: {
    textAlign: 'right',
  },
});
