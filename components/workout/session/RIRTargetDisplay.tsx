/**
 * RIRTargetDisplay
 *
 * Shows RIR (Reps In Reserve) or RPE targets and tracks actual performance.
 * Features:
 * - Shows target RIR/RPE (e.g., "Target: RPE 7-8" or "Leave 2-3 reps in reserve")
 * - Post-set prompt to log actual RIR/RPE
 * - Trend chart showing RIR/RPE over time
 * - Auto-suggests volume adjustments if consistently under/over target
 * - Educational tooltips for RIR and RPE
 */

import React, { useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

export type IntensityMode = 'RIR' | 'RPE';

export interface RIRRPEConfig {
  mode: IntensityMode; // 'RIR' or 'RPE'
  rir_target_min?: number; // e.g., 2 (leave 2-3 reps in reserve)
  rir_target_max?: number; // e.g., 3
  rpe_target_min?: number; // e.g., 7 (RPE 7-8)
  rpe_target_max?: number; // e.g., 8
}

interface RIRTargetDisplayProps {
  exerciseName: string;
  setNumber: number;
  config: RIRRPEConfig;
  previousValue?: number; // Last session's RIR/RPE for this exercise
  historicalTrend?: number[]; // Last 5 sessions
  onLogValue: (value: number) => void;
  onShowInfo: () => void;
}

export function RIRTargetDisplay({
  exerciseName,
  setNumber,
  config,
  previousValue,
  historicalTrend,
  onLogValue,
  onShowInfo,
}: RIRTargetDisplayProps) {
  const { c, s, ty, r } = useTokens();
  const [showTooltip, setShowTooltip] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  const isRIR = config.mode === 'RIR';
  const targetMin = isRIR ? config.rir_target_min : config.rpe_target_min;
  const targetMax = isRIR ? config.rir_target_max : config.rpe_target_max;

  // Determine if previous value was in target range
  const isPreviousOnTarget = previousValue !== undefined && targetMin !== undefined && targetMax !== undefined
    ? previousValue >= targetMin && previousValue <= targetMax
    : null;

  // Determine suggested adjustment based on historical trend
  const getSuggestion = (): string | null => {
    if (!historicalTrend || historicalTrend.length < 3 || targetMin === undefined || targetMax === undefined) {
      return null;
    }

    const recentAvg = historicalTrend.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

    if (isRIR) {
      // For RIR: if consistently too low (e.g., leaving 0-1 reps) → reduce weight
      if (recentAvg < targetMin - 1) {
        return 'Consider reducing weight - you\'re pushing too close to failure';
      }
      // If consistently too high (e.g., leaving 5+ reps) → increase weight
      if (recentAvg > targetMax + 1) {
        return 'Consider increasing weight - you have more in the tank';
      }
    } else {
      // For RPE: if consistently too high → reduce weight
      if (recentAvg > targetMax + 1) {
        return 'Consider reducing weight - RPE is consistently above target';
      }
      // If consistently too low → increase weight
      if (recentAvg < targetMin - 1) {
        return 'Consider increasing weight - RPE is consistently below target';
      }
    }

    return null;
  };

  const suggestion = getSuggestion();

  // Quick select buttons
  const quickSelectValues = isRIR
    ? [0, 1, 2, 3, 4, 5] // RIR values
    : [6, 7, 8, 9, 10]; // RPE values

  const handleSelect = (value: number) => {
    setSelectedValue(value);
    onLogValue(value);
  };

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: r.md,
        borderWidth: 1,
        borderColor: c.border,
        padding: s.md,
        marginBottom: s.md,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: c.opacity.primaryLight,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TabBarIcon name="speedometer-outline" size={16} color={c.primary} />
          </View>
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              textTransform: 'uppercase',
            }}
          >
            {isRIR ? 'RIR' : 'RPE'} Target
          </Text>
        </View>
        <Pressable onPress={() => setShowTooltip(!showTooltip)}>
          <TabBarIcon name="information-circle-outline" size={20} color={c.textMuted} />
        </Pressable>
      </View>

      {/* Educational Tooltip */}
      {showTooltip && (
        <View
          style={{
            backgroundColor: c.bg,
            borderRadius: r.sm,
            padding: s.sm,
            marginBottom: s.sm,
          }}
        >
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
              lineHeight: 18,
            }}
          >
            {isRIR ? (
              <>
                <Text style={{ fontFamily: ty.body.familySemibold, color: c.text }}>What is RIR?</Text>
                {'\n'}
                Reps In Reserve: How many more reps you could have done before failure.
                {'\n\n'}
                <Text style={{ fontFamily: ty.body.familySemibold }}>RIR 0:</Text> Absolute failure
                {'\n'}
                <Text style={{ fontFamily: ty.body.familySemibold }}>RIR 1:</Text> Could have done 1 more rep
                {'\n'}
                <Text style={{ fontFamily: ty.body.familySemibold }}>RIR 2-3:</Text> Optimal hypertrophy zone
              </>
            ) : (
              <>
                <Text style={{ fontFamily: ty.body.familySemibold, color: c.text }}>What is RPE?</Text>
                {'\n'}
                Rate of Perceived Exertion (1-10 scale): How hard the set feels.
                {'\n\n'}
                <Text style={{ fontFamily: ty.body.familySemibold }}>RPE 10:</Text> Absolute max effort
                {'\n'}
                <Text style={{ fontFamily: ty.body.familySemibold }}>RPE 8:</Text> Could do 2 more reps
                {'\n'}
                <Text style={{ fontFamily: ty.body.familySemibold }}>RPE 6-7:</Text> Moderately hard
              </>
            )}
          </Text>
        </View>
      )}

      {/* Exercise Name & Set Number */}
      <Text
        style={{
          color: c.text,
          fontFamily: ty.body.familySemibold,
          fontSize: ty.sizes.md,
          marginBottom: s.xs,
        }}
      >
        {exerciseName} - Set {setNumber}
      </Text>

      {/* Target Display */}
      <View
        style={{
          backgroundColor: c.opacity.primaryLight,
          borderRadius: r.sm,
          padding: s.md,
          marginBottom: s.md,
        }}
      >
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.xs,
            marginBottom: 4,
          }}
        >
          Target {isRIR ? 'RIR' : 'RPE'}:
        </Text>
        <Text
          style={{
            color: c.text,
            fontFamily: ty.mono.family,
            fontSize: ty.sizes.xl,
          }}
        >
          {targetMin === targetMax ? targetMin : `${targetMin}-${targetMax}`}
        </Text>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: 11,
            marginTop: 4,
          }}
        >
          {isRIR
            ? `Leave ${targetMin === targetMax ? targetMin : `${targetMin}-${targetMax}`} ${targetMin === 1 ? 'rep' : 'reps'} in reserve`
            : `Rate this set ${targetMin === targetMax ? targetMin : `${targetMin}-${targetMax}`} out of 10`}
        </Text>
      </View>

      {/* Previous Performance */}
      {previousValue !== undefined && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: c.bg,
            borderRadius: r.sm,
            padding: s.sm,
            marginBottom: s.md,
          }}
        >
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
            }}
          >
            Last session:
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs }}>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.mono.family,
                fontSize: ty.sizes.sm,
              }}
            >
              {isRIR ? 'RIR' : 'RPE'} {previousValue}
            </Text>
            {isPreviousOnTarget !== null && (
              <TabBarIcon
                name={isPreviousOnTarget ? 'checkmark-circle' : 'alert-circle-outline'}
                size={16}
                color={isPreviousOnTarget ? c.success : c.warning}
              />
            )}
          </View>
        </View>
      )}

      {/* Suggestion Alert */}
      {suggestion && (
        <View
          style={{
            backgroundColor: c.opacity.warningLight,
            borderRadius: r.sm,
            padding: s.sm,
            marginBottom: s.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: s.xs,
          }}
        >
          <TabBarIcon name="bulb-outline" size={16} color={c.warning} />
          <Text
            style={{
              color: c.text,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
              flex: 1,
              lineHeight: 18,
            }}
          >
            {suggestion}
          </Text>
        </View>
      )}

      {/* Quick Select Buttons */}
      <View style={{ marginBottom: s.sm }}>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.xs,
            marginBottom: s.xs,
          }}
        >
          How did this set feel?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.xs }}>
          {quickSelectValues.map((value) => {
            const isTarget = targetMin !== undefined && targetMax !== undefined && value >= targetMin && value <= targetMax;
            const isSelected = selectedValue === value;

            return (
              <Pressable
                key={value}
                onPress={() => handleSelect(value)}
                style={{
                  paddingHorizontal: s.sm,
                  paddingVertical: s.xs,
                  borderRadius: r.md,
                  backgroundColor: isSelected
                    ? c.primary
                    : isTarget
                    ? c.opacity.primaryLight
                    : c.surface2,
                  borderWidth: 1,
                  borderColor: isSelected ? c.primary : isTarget ? c.primary : c.border,
                  minWidth: 44,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: isSelected ? c.bg : c.text,
                    fontFamily: ty.mono.family,
                    fontSize: ty.sizes.sm,
                  }}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Historical Trend (if available) */}
      {historicalTrend && historicalTrend.length > 0 && (
        <View
          style={{
            marginTop: s.sm,
            paddingTop: s.sm,
            borderTopWidth: 1,
            borderTopColor: c.border,
          }}
        >
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              marginBottom: s.xs,
              textTransform: 'uppercase',
            }}
          >
            Recent Trend
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: s.xs, height: 40 }}>
            {historicalTrend.slice(0, 5).reverse().map((value, idx) => {
              const heightPercent = isRIR ? (value / 5) * 100 : (value / 10) * 100;
              const isInTarget = targetMin !== undefined && targetMax !== undefined && value >= targetMin && value <= targetMax;

              return (
                <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
                  <View
                    style={{
                      width: '100%',
                      height: heightPercent,
                      backgroundColor: isInTarget ? c.success : c.warning,
                      borderRadius: r.sm,
                      justifyContent: 'flex-start',
                      paddingTop: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: c.bg,
                        fontFamily: ty.mono.family,
                        fontSize: 11,
                        textAlign: 'center',
                      }}
                    >
                      {value}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
