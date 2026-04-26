import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../../lib/theme';

interface SectionStatus {
  key: 'macros' | 'targets' | 'workout' | 'nutrition';
  label: string;
  accepted: boolean;
}

interface SegmentedStatusBarProps {
  sections: SectionStatus[];
  onSectionPress?: (key: string) => void;
}

export function SegmentedStatusBar({ sections, onSectionPress }: SegmentedStatusBarProps) {
  const { c, ty, r } = useTokens();

  return (
    <View style={styles.container}>
      {sections.map((section) => {
        const isAccepted = section.accepted;
        return (
          <Pressable
            key={section.key}
            style={[
              styles.pill,
              {
                backgroundColor: isAccepted ? `${c.primary}18` : c.surface2,
                borderColor: isAccepted ? `${c.primary}40` : c.border,
                borderRadius: r.pill,
              },
            ]}
            onPress={() => onSectionPress?.(section.key)}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: isAccepted ? c.primary : 'transparent',
                  borderColor: isAccepted ? c.primary : c.textMuted,
                },
              ]}
            >
              {isAccepted && <Text style={styles.check}>✓</Text>}
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isAccepted ? c.primary : c.textMuted,
                  fontFamily: ty.body.familySemibold,
                },
              ]}
            >
              {section.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    fontSize: 9,
    fontWeight: '700',
    color: '#050510',
    lineHeight: 10,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
