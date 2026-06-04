import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import { 
  Exercise, 
  SwapAlternative, 
  ContinuityMethod 
} from '../../../types/v1_engine';

interface SwapConfirmationSheetProps {
  originalExercise: Exercise;
  alternative: SwapAlternative;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SwapConfirmationSheet({
  originalExercise,
  alternative,
  onConfirm,
  onCancel,
}: SwapConfirmationSheetProps) {
  const { c, s, ty, r } = useTokens();
  const { exercise, match_label, continuity_recommendation } = alternative;

  const renderContinuityMessage = () => {
    switch (continuity_recommendation) {
      case ContinuityMethod.Continue:
        return (
          <View style={{ gap: s.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs }}>
              <TabBarIcon name="trending-up" size={18} color={c.success} />
              <Text style={{ color: c.success, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                Carryover: Enabled
              </Text>
            </View>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, lineHeight: 18 }}>
              &quot;Good news! This is a perfect mechanical match. Your current weights and progression will carry over directly to {exercise.name}.&quot;
            </Text>
          </View>
        );
      case ContinuityMethod.Modified:
        return (
          <View style={{ gap: s.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs }}>
              <TabBarIcon name="shield-checkmark" size={18} color={c.primary} />
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                Carryover: Adjusted (-15%)
              </Text>
            </View>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, lineHeight: 18 }}>
              &quot;This feels similar, but the equipment profile is different. I&apos;ll carry over your progress with a small safety buffer to help you adjust.&quot;
            </Text>
          </View>
        );
      case ContinuityMethod.Reset:
      default:
        return (
          <View style={{ gap: s.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs }}>
              <TabBarIcon name="refresh" size={18} color={c.textMuted} />
              <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                Carryover: Fresh Track
              </Text>
            </View>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, lineHeight: 18 }}>
              &quot;This is a meaningful change in movement. We&apos;ll start a fresh track for this exercise to find your new baseline.&quot;
            </Text>
          </View>
        );
    }
  };

  return (
    <View style={{ padding: s.lg, backgroundColor: c.bg, borderTopLeftRadius: r.lg, borderTopRightRadius: r.lg }}>
      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md, marginBottom: s.lg }}>
        Confirm Exercise Swap
      </Text>

      {/* Comparison Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.xl }}>
        <View style={{ flex: 1, backgroundColor: c.surface, padding: s.md, borderRadius: r.md, borderWidth: 1, borderColor: c.border }}>
          <Text style={{ color: c.textMuted, fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>Current</Text>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 13 }} numberOfLines={2}>{originalExercise.name}</Text>
        </View>

        <View style={{ paddingHorizontal: s.sm }}>
          <TabBarIcon name="arrow-forward" size={20} color={c.textSubtle} />
        </View>

        <View style={{ flex: 1, backgroundColor: c.primary + '10', padding: s.md, borderRadius: r.md, borderWidth: 1, borderColor: c.primary + '30' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ color: c.primary, fontSize: 10, textTransform: 'uppercase' }}>Replacement</Text>
                <View style={{ backgroundColor: c.primary, paddingHorizontal: 4, borderRadius: 2 }}>
                    <Text style={{ color: c.bg, fontSize: 8, fontFamily: ty.mono.family }}>{match_label}</Text>
                </View>
            </View>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 13 }} numberOfLines={2}>{exercise.name}</Text>
        </View>
      </View>

      {/* Coach Info Box */}
      <View style={{ backgroundColor: c.surface2, padding: s.md, borderRadius: r.md, marginBottom: s.xl }}>
        {renderContinuityMessage()}
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: s.md }}>
        <Pressable 
          onPress={onCancel}
          style={{ flex: 1, paddingVertical: s.md, alignItems: 'center', backgroundColor: c.surface, borderRadius: r.md, borderWidth: 1, borderColor: c.border }}
        >
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold }}>Go Back</Text>
        </Pressable>
        
        <Pressable 
          onPress={onConfirm}
          style={{ flex: 2, paddingVertical: s.md, alignItems: 'center', backgroundColor: c.primary, borderRadius: r.md }}
        >
          <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold }}>Confirm Swap</Text>
        </Pressable>
      </View>
    </View>
  );
}
