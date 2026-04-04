/**
 * TempoCoach
 *
 * Visual metronome/timer for controlled tempo training.
 * Features:
 * - Shows tempo notation (e.g., "3-0-1-0")
 * - Visual timer during set with phase transitions
 * - Phase labels: "Eccentric (3s) → Pause (0s) → Concentric (1s) → Rest (0s)"
 * - Audio/haptic cues at phase transitions (optional)
 * - Educational tooltip explaining tempo training
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

export interface TempoConfig {
  tempo_notation: string; // e.g., "3-0-1-0" (Eccentric-Pause-Concentric-Rest)
  enforce_compliance: boolean; // If true, prompt user to confirm adherence
}

type TempoPhase = 'eccentric' | 'pause1' | 'concentric' | 'pause2';

interface TempoCoachProps {
  exerciseName: string;
  config: TempoConfig;
  isActive: boolean; // Whether set is currently being performed
  currentRep: number; // 0-indexed rep count
  targetReps: number;
  onSetComplete: () => void;
  onShowInfo: () => void;
}

export function TempoCoach({
  exerciseName,
  config,
  isActive,
  currentRep,
  targetReps,
  onSetComplete,
  onShowInfo,
}: TempoCoachProps) {
  const { c, s, ty, r } = useTokens();
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<TempoPhase>('eccentric');
  const [phaseTimeRemaining, setPhaseTimeRemaining] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Parse tempo notation (e.g., "3-0-1-0" → [3, 0, 1, 0])
  const tempoParts = config.tempo_notation.split('-').map(Number);
  const [eccentric, pause1, concentric, pause2] = tempoParts;

  const phaseData: Record<TempoPhase, { duration: number; label: string; color: string }> = {
    eccentric: { duration: eccentric, label: 'Lower (Eccentric)', color: c.warning },
    pause1: { duration: pause1, label: 'Pause (Stretch)', color: c.primary },
    concentric: { duration: concentric, label: 'Lift (Concentric)', color: c.success },
    pause2: { duration: pause2, label: 'Rest (Top)', color: c.textMuted },
  };

  // Cycle through tempo phases
  useEffect(() => {
    if (!isActive) {
      setCurrentPhase('eccentric');
      setPhaseTimeRemaining(eccentric);
      return;
    }

    const phaseOrder: TempoPhase[] = ['eccentric', 'pause1', 'concentric', 'pause2'];
    let currentPhaseIndex = phaseOrder.indexOf(currentPhase);
    let timeLeft = phaseTimeRemaining;

    const interval = setInterval(() => {
      if (timeLeft > 1) {
        timeLeft -= 1;
        setPhaseTimeRemaining(timeLeft);

        // Animate progress bar
        const phaseDuration = phaseData[currentPhase].duration;
        Animated.timing(progressAnim, {
          toValue: ((phaseDuration - timeLeft) / phaseDuration) * 100,
          duration: 200,
          useNativeDriver: false,
        }).start();
      } else {
        // Move to next phase
        currentPhaseIndex = (currentPhaseIndex + 1) % phaseOrder.length;
        const nextPhase = phaseOrder[currentPhaseIndex];
        setCurrentPhase(nextPhase);

        const nextDuration = phaseData[nextPhase].duration;
        timeLeft = nextDuration;
        setPhaseTimeRemaining(nextDuration);

        // Haptic feedback on phase transition
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Reset progress bar
        progressAnim.setValue(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, currentPhase, phaseTimeRemaining, eccentric, progressAnim]);

  const currentPhaseInfo = phaseData[currentPhase];

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: r.md,
        borderWidth: 1,
        borderColor: currentPhaseInfo.color,
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
            <TabBarIcon name="timer-outline" size={16} color={c.primary} />
          </View>
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              textTransform: 'uppercase',
            }}
          >
            Tempo Training
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
            <Text style={{ fontFamily: ty.body.familySemibold, color: c.text }}>What is tempo training?</Text>
            {'\n'}
            Control rep speed to increase time under tension (TUT), maximizing muscle fiber recruitment and hypertrophy.
            {'\n\n'}
            <Text style={{ fontFamily: ty.body.familySemibold }}>Format:</Text> Eccentric-Pause-Concentric-Rest (in seconds)
            {'\n'}
            <Text style={{ fontFamily: ty.body.familySemibold }}>Example:</Text> "3-0-1-0" = 3s down, 0s pause, 1s up, 0s rest
          </Text>
        </View>
      )}

      {/* Exercise Name */}
      <Text
        style={{
          color: c.text,
          fontFamily: ty.body.familySemibold,
          fontSize: ty.sizes.md,
          marginBottom: s.xs,
        }}
      >
        {exerciseName}
      </Text>

      {/* Tempo Notation */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.surface2,
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
            marginRight: s.xs,
          }}
        >
          Tempo:
        </Text>
        <Text
          style={{
            color: c.text,
            fontFamily: ty.mono.family,
            fontSize: ty.sizes.lg,
          }}
        >
          {config.tempo_notation}
        </Text>
      </View>

      {/* Current Phase Display */}
      {isActive ? (
        <View>
          {/* Phase Label */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: s.xs,
            }}
          >
            <Text
              style={{
                color: currentPhaseInfo.color,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.sm,
              }}
            >
              {currentPhaseInfo.label}
            </Text>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.mono.family,
                fontSize: ty.sizes.xl,
              }}
            >
              {phaseTimeRemaining}s
            </Text>
          </View>

          {/* Progress Bar */}
          <View
            style={{
              height: 8,
              backgroundColor: c.surface2,
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: s.md,
            }}
          >
            <Animated.View
              style={{
                height: '100%',
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: currentPhaseInfo.color,
              }}
            />
          </View>

          {/* Rep Counter */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: s.sm,
              backgroundColor: c.bg,
              borderRadius: r.sm,
            }}
          >
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
                marginRight: s.xs,
              }}
            >
              Rep:
            </Text>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.mono.family,
                fontSize: ty.sizes.md,
              }}
            >
              {currentRep + 1} / {targetReps}
            </Text>
          </View>
        </View>
      ) : (
        /* Inactive State - Show Phase Breakdown */
        <View style={{ gap: s.xs }}>
          <PhaseBreakdown phase="Eccentric" duration={eccentric} color={c.warning} icon="arrow-down" />
          {pause1 > 0 && <PhaseBreakdown phase="Pause (Stretch)" duration={pause1} color={c.primary} icon="pause" />}
          <PhaseBreakdown phase="Concentric" duration={concentric} color={c.success} icon="arrow-up" />
          {pause2 > 0 && <PhaseBreakdown phase="Rest (Top)" duration={pause2} color={c.textMuted} icon="pause" />}

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
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
                textAlign: 'center',
              }}
            >
              Total time per rep: {eccentric + pause1 + concentric + pause2}s
              {'\n'}
              Target reps: {targetReps} ({(eccentric + pause1 + concentric + pause2) * targetReps}s total)
            </Text>
          </View>
        </View>
      )}

      {/* Action Button */}
      {isActive && (
        <Pressable
          onPress={onSetComplete}
          style={{
            marginTop: s.md,
            paddingVertical: s.md,
            borderRadius: r.md,
            backgroundColor: c.primary,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: c.bg,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
            }}
          >
            Complete Set
          </Text>
        </Pressable>
      )}
    </View>
  );
}

interface PhaseBreakdownProps {
  phase: string;
  duration: number;
  color: string;
  icon: 'arrow-down' | 'arrow-up' | 'pause';
}

function PhaseBreakdown({ phase, duration, color, icon }: PhaseBreakdownProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: c.surface2,
        borderRadius: r.sm,
        padding: s.sm,
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs }}>
        <TabBarIcon name={icon} size={14} color={color} />
        <Text
          style={{
            color: c.text,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.xs,
          }}
        >
          {phase}
        </Text>
      </View>
      <Text
        style={{
          color: c.text,
          fontFamily: ty.mono.family,
          fontSize: ty.sizes.xs,
        }}
      >
        {duration}s
      </Text>
    </View>
  );
}
