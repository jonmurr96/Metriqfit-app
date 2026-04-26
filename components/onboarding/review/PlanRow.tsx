import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../navigation/TabBarIcon';

interface PlanRowProps {
  icon: string;
  iconColor: string;
  title: string;
  metadata: string;
  subtitle?: string;
  accepted: boolean;
  onAccept: () => void;
  onEdit: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  children?: React.ReactNode;
}

export function PlanRow({
  icon,
  iconColor,
  title,
  metadata,
  subtitle,
  accepted,
  onAccept,
  onEdit,
  expanded,
  onToggleExpand,
  children,
}: PlanRowProps) {
  const { c, ty, r } = useTokens();
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withTiming(expanded ? 180 : 0, { duration: 250 });
  }, [expanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.surface,
          borderColor: expanded ? `${c.primary}50` : c.border,
          borderRadius: r.lg,
        },
      ]}
    >
      {/* Collapsed Row */}
      <Pressable
        style={styles.row}
        onPress={onToggleExpand}
      >
        <View style={styles.left}>
          <View style={[styles.iconWrap, { backgroundColor: `${iconColor}15` }]}>
            <TabBarIcon name={icon as any} color={iconColor} size={18} />
          </View>
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: c.text, fontFamily: ty.body.familySemibold }]}>
              {title}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.metaPill, { backgroundColor: c.bg }]}>
                <Text style={[styles.metaText, { color: c.textMuted, fontFamily: ty.body.familyMedium }]}>
                  {metadata}
                </Text>
              </View>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.right}>
          <Animated.View style={chevronStyle}>
            <TabBarIcon name="chevron-down" color={c.textMuted} size={16} />
          </Animated.View>

          <Pressable
            style={styles.checkButton}
            onPress={(e) => {
              e.stopPropagation();
              onAccept();
            }}
          >
            <View
              style={[
                styles.checkCircle,
                {
                  backgroundColor: accepted ? c.primary : 'transparent',
                  borderColor: accepted ? c.primary : c.textMuted,
                },
              ]}
            >
              {accepted && <Text style={styles.checkMark}>✓</Text>}
            </View>
          </Pressable>
        </View>
      </Pressable>

      {/* Expanded Preview */}
      {expanded && children ? (
        <View style={styles.preview}>
          <View style={[styles.previewDivider, { backgroundColor: c.border }]} />
          <View style={styles.previewContent}>{children}</View>
          <Pressable
            style={[styles.editLink, { borderColor: c.border, borderRadius: r.md }]}
            onPress={onEdit}
          >
            <Text style={[styles.editLinkText, { color: c.primary, fontFamily: ty.body.familySemibold }]}>
              Edit {title}
            </Text>
            <TabBarIcon name="chevron-forward" color={c.primary} size={14} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    gap: 3,
    flex: 1,
  },
  title: {
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkButton: {
    padding: 4,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 11,
    fontWeight: '700',
    color: '#050510',
    lineHeight: 12,
  },
  preview: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  previewDivider: {
    height: 1,
    marginBottom: 12,
  },
  previewContent: {
    gap: 8,
  },
  editLink: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(34, 211, 238, 0.06)',
  },
  editLinkText: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
