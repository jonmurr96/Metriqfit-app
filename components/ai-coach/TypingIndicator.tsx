import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';

interface TypingIndicatorProps {
  visible?: boolean;
}

export function TypingIndicator({ visible = true }: TypingIndicatorProps) {
  const { c, s, ty, r } = useTokens();

  if (!visible) return null;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: 10 }}
      transition={{ type: 'timing' as const, duration: 200 } as any}
      style={[styles.container, { paddingHorizontal: s.lg }]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: c.surface,
            borderRadius: r.lg,
            borderWidth: 1,
            borderColor: c.border,
          },
        ]}
      >
        <View
          style={[
            styles.avatarContainer,
            { backgroundColor: c.surface2 },
          ]}
        >
          <TabBarIcon name="sparkles" color={c.textMuted} size={15} />
        </View>
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <MotiView
              key={index}
              from={{ translateY: 0 }}
              animate={{ translateY: [-3, 0, -3] }}
              transition={{
                type: 'timing' as const,
                duration: 600,
                loop: true,
                delay: index * 150,
              } as any}
              style={[
                styles.dot,
                { backgroundColor: c.primary },
              ]}
            />
          ))}
        </View>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.xs,
            marginLeft: 8,
          }}
        >
          Coach is thinking...
        </Text>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '80%',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
