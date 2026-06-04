import React from 'react';
import { Text, View } from 'react-native';

import { GlassCard } from '../../premium/GlassCard';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import { PressableScale } from '@/components/common/PressableScale';
import type { WorkoutCoachQueueState } from '../../../lib/workout/dashboard-state';

type Props = {
  state: WorkoutCoachQueueState;
  onPrimaryPress?: () => void;
  onReviewAllPress?: () => void;
  onAcceptRecommendation?: (recommendationId: string) => void;
  onRejectRecommendation?: (recommendationId: string) => void;
  disabled?: boolean;
};

export function WorkoutCoachQueueCard({
  state,
  onPrimaryPress,
  onReviewAllPress,
  onAcceptRecommendation,
  onRejectRecommendation,
  disabled = false,
}: Props) {
  const { c, s, ty, r } = useTokens();

  return (
    <GlassCard
      intensity="light"
      animated
      style={{
        borderRadius: r.xl,
        borderWidth: 1,
        borderColor: `${c.primary}2f`,
      }}
    >
      <View style={{ gap: s.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.md }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${c.primary}14`,
              borderWidth: 1,
              borderColor: `${c.primary}40`,
            }}
          >
            <TabBarIcon name={state.icon as any} color={c.primary} size={20} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
                letterSpacing: 1,
              }}
            >
              COACH QUEUE
            </Text>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
                marginTop: 2,
              }}
            >
              {state.title}
            </Text>
          </View>
        </View>

        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
            lineHeight: 20,
          }}
        >
          {state.subtitle}
        </Text>

        {state.mode === 'recommendations' ? (
          <View style={{ gap: s.sm }}>
            {state.items.map((item) => (
              <View
                key={item.id}
                style={{
                  gap: s.sm,
                  borderRadius: r.lg,
                  padding: s.md,
                  backgroundColor: `${c.surface2}bb`,
                  borderWidth: 1,
                  borderColor: `${c.border}aa`,
                }}
              >
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.md,
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.sm,
                    lineHeight: 19,
                  }}
                >
                  {item.rationale}
                </Text>
                <View style={{ flexDirection: 'row', gap: s.sm }}>
                  <PressableScale
                    disabled={disabled}
                    onPress={() => onAcceptRecommendation?.(item.id)}
                    style={(pressed) => ({
                      flex: 1,
                      minHeight: 42,
                      borderRadius: r.pill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: c.primary,
                      opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: c.bg,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.sm,
                      }}
                    >
                      Accept
                    </Text>
                  </PressableScale>
                  <PressableScale
                    disabled={disabled}
                    onPress={() => onRejectRecommendation?.(item.id)}
                    style={(pressed) => ({
                      flex: 1,
                      minHeight: 42,
                      borderRadius: r.pill,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: `${c.border}dd`,
                      backgroundColor: `${c.bg}55`,
                      opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.sm,
                      }}
                    >
                      Keep Current
                    </Text>
                  </PressableScale>
                </View>
              </View>
            ))}

            {state.reviewAllAction && onReviewAllPress ? (
              <PressableScale
                disabled={disabled}
                onPress={onReviewAllPress}
                style={(pressed) => ({
                  alignSelf: 'flex-start',
                  paddingVertical: s.sm,
                  opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
                })}
              >
                <Text
                  style={{
                    color: c.primary,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.sm,
                  }}
                >
                  Review All
                </Text>
              </PressableScale>
            ) : null}
          </View>
        ) : (
          <View
            style={{
              gap: s.sm,
              borderRadius: r.lg,
              padding: s.md,
              backgroundColor: `${c.surface2}bb`,
              borderWidth: 1,
              borderColor: `${c.border}aa`,
            }}
          >
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
                letterSpacing: 0.9,
              }}
            >
              NEXT MOVE
            </Text>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.md,
              }}
            >
              {state.subtitle}
            </Text>
            {state.primaryLabel && onPrimaryPress ? (
              <PressableScale
                disabled={disabled}
                onPress={onPrimaryPress}
                style={(pressed) => ({
                  alignSelf: 'flex-start',
                  paddingHorizontal: s.lg,
                  minHeight: 42,
                  borderRadius: r.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${c.primary}18`,
                  borderWidth: 1,
                  borderColor: `${c.primary}45`,
                  opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
                })}
              >
                <Text
                  style={{
                    color: c.primary,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.sm,
                  }}
                >
                  {state.primaryLabel}
                </Text>
              </PressableScale>
            ) : null}
          </View>
        )}
      </View>
    </GlassCard>
  );
}
