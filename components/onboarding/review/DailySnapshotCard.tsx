import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useAnimatedReaction,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../navigation/TabBarIcon';

// ─── Animated Macro Bar ───

interface MacroBarProps {
  label: string;
  value: number;
  color: string;
  maxValue: number;
  index: number;
  hasAnimated: boolean;
  onAnimationComplete?: () => void;
}

function MacroBar({ label, value, color, maxValue, index, hasAnimated, onAnimationComplete }: MacroBarProps) {
  const { c, ty, r } = useTokens();
  const reducedMotion = useReducedMotion();

  const targetRatio = maxValue > 0 ? Math.min(1, value / maxValue) : 0;
  const progress = useSharedValue(hasAnimated || reducedMotion ? targetRatio : 0);
  const glowOpacity = useSharedValue(hasAnimated || reducedMotion ? 0.5 : 0);

  useEffect(() => {
    if (hasAnimated || reducedMotion) {
      progress.value = targetRatio;
      glowOpacity.value = 0.5;
      return;
    }

    const delay = index * 180;

    progress.value = withDelay(
      delay,
      withTiming(targetRatio, {
        duration: 850,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      }, (finished) => {
        if (finished && onAnimationComplete) {
          runOnJS(onAnimationComplete)();
        }
      })
    );

    glowOpacity.value = withDelay(
      delay,
      withTiming(0.5, { duration: 850, easing: Easing.bezier(0.22, 1, 0.36, 1) })
    );
  }, [hasAnimated, reducedMotion, targetRatio, index]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  const animatedValue = useDerivedValue(() => {
    const current = interpolate(progress.value, [0, targetRatio], [0, value]);
    return Math.round(current);
  });

  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: c.textMuted, fontFamily: ty.body.familyMedium }]}>
        {label}
      </Text>
      <View style={[styles.barTrack, { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: r.pill }]}>
        <Animated.View
          style={[
            styles.barFill,
            fillStyle,
            glowStyle,
            {
              backgroundColor: color,
              borderRadius: r.pill,
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 8,
            },
          ]}
        />
      </View>
      <AnimatedNumber
        value={animatedValue}
        color={color}
        suffix="g"
      />
    </View>
  );
}

// ─── Animated Number Display ───

function AnimatedNumber({
  value,
  color,
  suffix,
}: {
  value: SharedValue<number>;
  color: string;
  suffix: string;
}) {
  const { ty } = useTokens();
  const [display, setDisplay] = React.useState(0);

  useAnimatedReaction(
    () => value.value,
    (current, prev) => {
      if (current !== prev) {
        runOnJS(setDisplay)(current);
      }
    },
    [value],
  );

  return (
    <Text
      style={[
        styles.barValue,
        { color, fontFamily: ty.heading.familySemibold },
      ]}
      numberOfLines={1}
    >
      {display}{suffix}
    </Text>
  );
}

// ─── Inline Targets Row ───

interface InlineTargetsRowProps {
  calories: number;
  waterLiters: string;
  steps: string;
}

function InlineTargetsRow({ calories, waterLiters, steps }: InlineTargetsRowProps) {
  const { c, ty } = useTokens();

  return (
    <View style={styles.inlineRow}>
      <View style={styles.inlineItem}>
        <TabBarIcon name="flame-outline" color={c.primary} size={14} />
        <Text style={[styles.inlineValue, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
          {calories.toLocaleString()}
        </Text>
        <Text style={[styles.inlineUnit, { color: c.textMuted, fontFamily: ty.body.family }]}>kcal</Text>
      </View>

      <Text style={[styles.inlineDivider, { color: c.textMuted }]}>·</Text>

      <View style={styles.inlineItem}>
        <TabBarIcon name="water-outline" color={c.primary} size={14} />
        <Text style={[styles.inlineValue, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
          {waterLiters}
        </Text>
      </View>

      {steps && steps !== 'Not set' ? (
        <>
          <Text style={[styles.inlineDivider, { color: c.textMuted }]}>·</Text>
          <View style={styles.inlineItem}>
            <TabBarIcon name="walk-outline" color={c.warning} size={14} />
            <Text style={[styles.inlineValue, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
              {steps}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

// ─── Accept / Edit Inline ───

interface AcceptEditInlineProps {
  accepted: boolean;
  disabled?: boolean;
  onAccept: () => void;
  onEdit: () => void;
}

function AcceptEditInline({ accepted, disabled = false, onAccept, onEdit }: AcceptEditInlineProps) {
  const { c, ty, r } = useTokens();

  return (
    <View style={styles.actionsRow}>
      <Pressable
        style={[
          styles.acceptButton,
          {
            backgroundColor: accepted ? c.primary : 'transparent',
            borderColor: accepted ? c.primary : `${c.primary}60`,
            borderRadius: r.pill,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
        onPress={onAccept}
        disabled={disabled}
      >
        <Text
          style={[
            styles.acceptLabel,
            {
              color: accepted ? c.bg : c.primary,
              fontFamily: ty.body.familySemibold,
            },
          ]}
        >
          {accepted ? 'Accepted' : 'Accept'}
        </Text>
      </Pressable>

      <Pressable onPress={onEdit} disabled={disabled} style={{ opacity: disabled ? 0.55 : 1 }}>
        <Text style={[styles.editLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>
          Edit
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Daily Snapshot Card ───

interface DailySnapshotCardProps {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  waterLiters: string;
  steps: string;
  accepted: boolean;
  disabled?: boolean;
  onAccept: () => void;
  onEdit: () => void;
}

export function DailySnapshotCard({
  protein,
  carbs,
  fat,
  calories,
  waterLiters,
  steps,
  accepted,
  disabled = false,
  onAccept,
  onEdit,
}: DailySnapshotCardProps) {
  const { c, ty, r } = useTokens();
  const macroColors = c.macros;
  const sharedMax = Math.max(protein, carbs, fat, 1);

  // Track whether animation has played for current data values
  const animatedRef = useRef<string | null>(null);
  const dataKey = `${protein}-${carbs}-${fat}`;
  const hasAnimated = animatedRef.current === dataKey;

  useEffect(() => {
    if (animatedRef.current !== dataKey) {
      // New data — will animate. Mark as animated after mount.
      const timer = setTimeout(() => {
        animatedRef.current = dataKey;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [dataKey]);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          borderRadius: r.lg,
        },
      ]}
    >
      <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
        Your Daily Targets
      </Text>

      <View style={styles.barsContainer}>
        <MacroBar
          label="Protein"
          value={protein}
          color={macroColors.protein}
          maxValue={sharedMax}
          index={0}
          hasAnimated={hasAnimated}
        />
        <MacroBar
          label="Carbs"
          value={carbs}
          color={macroColors.carbs}
          maxValue={sharedMax}
          index={1}
          hasAnimated={hasAnimated}
        />
        <MacroBar
          label="Fat"
          value={fat}
          color={macroColors.fat}
          maxValue={sharedMax}
          index={2}
          hasAnimated={hasAnimated}
        />
      </View>

      <InlineTargetsRow calories={calories} waterLiters={waterLiters} steps={steps} />

      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
      </View>

      <AcceptEditInline accepted={accepted} disabled={disabled} onAccept={onAccept} onEdit={onEdit} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  title: {
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  barsContainer: {
    gap: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    fontSize: 12,
    width: 48,
  },
  barTrack: {
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  barValue: {
    fontSize: 14,
    minWidth: 52,
    textAlign: 'right',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  inlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineValue: {
    fontSize: 13,
  },
  inlineUnit: {
    fontSize: 11,
  },
  inlineDivider: {
    fontSize: 14,
    opacity: 0.5,
  },
  divider: {
    paddingVertical: 2,
  },
  dividerLine: {
    height: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  acceptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
  },
  acceptLabel: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  editLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
