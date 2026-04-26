/**
 * ExerciseProgressionChart
 *
 * Displays weight and RPE progression over recent sessions for a single exercise.
 * Shows trend lines and session data points.
 */

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTokens } from '../../../lib/theme';
import type { ExerciseProgressionAnalysis } from '../../../services/progressiveOverloadService';
import type { ExerciseSessionData } from '../../../services/progressiveOverloadService';

interface ExerciseProgressionChartProps {
  analysis: ExerciseProgressionAnalysis;
  history: ExerciseSessionData[];
}

export function ExerciseProgressionChart({
  analysis,
  history,
}: ExerciseProgressionChartProps) {
  const { c, s, ty, r } = useTokens();

  if (history.length === 0) {
    return (
      <View
        style={{
          backgroundColor: c.surface2,
          borderRadius: r.md,
          padding: s.lg,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
          }}
        >
          No history available yet. Complete a few sessions to see your progression.
        </Text>
      </View>
    );
  }

  // Calculate metrics for each session
  const sessionMetrics = history.reverse().map((session) => {
    const workingSets = session.sets.filter(s => !s.is_warmup);
    const avgWeight = workingSets.length > 0
      ? workingSets.reduce((sum, s) => sum + (s.weight_lb || 0), 0) / workingSets.length
      : 0;
    const avgReps = workingSets.length > 0
      ? workingSets.reduce((sum, s) => sum + s.reps, 0) / workingSets.length
      : 0;
    const avgRPE = workingSets.filter(s => s.rpe !== null).length > 0
      ? workingSets.filter(s => s.rpe !== null).reduce((sum, s) => sum + (s.rpe || 0), 0) /
        workingSets.filter(s => s.rpe !== null).length
      : null;

    return {
      date: new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      avgWeight: Math.round(avgWeight * 10) / 10,
      avgReps: Math.round(avgReps * 10) / 10,
      avgRPE: avgRPE !== null ? Math.round(avgRPE * 10) / 10 : null,
      volume: workingSets.reduce((sum, s) => sum + (s.weight_lb || 0) * s.reps, 0),
    };
  });

  // Calculate chart bounds
  const weights = sessionMetrics.map(m => m.avgWeight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const weightRange = maxWeight - minWeight || 10;

  const rpeValues = sessionMetrics.map(m => m.avgRPE).filter(r => r !== null) as number[];
  const hasRPE = rpeValues.length > 0;

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: r.md,
        borderWidth: 1,
        borderColor: c.border,
        padding: s.md,
      }}
    >
      {/* Header */}
      <View style={{ marginBottom: s.md }}>
        <Text
          style={{
            color: c.text,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.sm,
            marginBottom: s.xs,
          }}
        >
          {analysis.exerciseName} - Progression
        </Text>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.xs,
          }}
        >
          Last {sessionMetrics.length} sessions
        </Text>
      </View>

      {/* Summary Stats */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginBottom: s.md,
          paddingVertical: s.sm,
          backgroundColor: c.surface2,
          borderRadius: r.sm,
        }}
      >
        <StatPill
          label="Avg Weight"
          value={`${analysis.trendLast5Sessions.avgWeightLb} lbs`}
          trend={analysis.trendLast5Sessions.weightProgression}
        />
        <StatPill
          label="Avg Reps"
          value={analysis.trendLast5Sessions.avgReps.toString()}
        />
        {analysis.trendLast5Sessions.avgRPE !== null && (
          <StatPill
            label="Avg RPE"
            value={analysis.trendLast5Sessions.avgRPE.toString()}
            trend={
              analysis.trendLast5Sessions.rpeChangePercent !== null &&
              analysis.trendLast5Sessions.rpeChangePercent < -5
                ? 'decreasing' // Declining RPE is good
                : analysis.trendLast5Sessions.rpeChangePercent !== null &&
                  analysis.trendLast5Sessions.rpeChangePercent > 5
                ? 'increasing'
                : 'stable'
            }
          />
        )}
      </View>

      {/* Weight Chart */}
      <View style={{ marginBottom: s.md }}>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.xs,
            marginBottom: s.xs,
            textTransform: 'uppercase',
          }}
        >
          Weight Progression
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: s.sm, height: 120 }}>
            {sessionMetrics.map((metric, idx) => {
              const heightPercent = weightRange > 0
                ? ((metric.avgWeight - minWeight) / weightRange) * 80 + 20
                : 50;
              const isLatest = idx === sessionMetrics.length - 1;

              return (
                <View key={idx} style={{ alignItems: 'center', gap: s.xs }}>
                  {/* Bar */}
                  <View
                    style={{
                      width: 40,
                      height: heightPercent,
                      backgroundColor: isLatest ? c.primary : c.surface2,
                      borderRadius: r.sm,
                      justifyContent: 'flex-start',
                      paddingTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: isLatest ? c.bg : c.textMuted,
                        fontFamily: ty.mono.family,
                        fontSize: 11,
                        textAlign: 'center',
                      }}
                    >
                      {metric.avgWeight}
                    </Text>
                  </View>
                  {/* Date Label */}
                  <Text
                    style={{
                      color: c.textMuted,
                      fontFamily: ty.body.family,
                      fontSize: 11,
                    }}
                  >
                    {metric.date.replace(' ', '\n')}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* RPE Chart (if available) */}
      {hasRPE && (
        <View>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
              marginBottom: s.xs,
              textTransform: 'uppercase',
            }}
          >
            RPE Trend
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: s.sm, height: 100 }}>
              {sessionMetrics.map((metric, idx) => {
                if (metric.avgRPE === null) return null;

                const heightPercent = (metric.avgRPE / 10) * 100;
                const isLatest = idx === sessionMetrics.length - 1;
                const rpeColor =
                  metric.avgRPE >= 9
                    ? c.danger
                    : metric.avgRPE >= 8
                    ? c.warning
                    : metric.avgRPE >= 7
                    ? c.primary
                    : c.success;

                return (
                  <View key={idx} style={{ alignItems: 'center', gap: s.xs }}>
                    {/* Bar */}
                    <View
                      style={{
                        width: 40,
                        height: heightPercent,
                        backgroundColor: isLatest ? rpeColor : c.surface2,
                        borderRadius: r.sm,
                        justifyContent: 'flex-start',
                        paddingTop: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: isLatest ? c.bg : c.textMuted,
                          fontFamily: ty.mono.family,
                          fontSize: 11,
                          textAlign: 'center',
                        }}
                      >
                        {metric.avgRPE}
                      </Text>
                    </View>
                    {/* Date Label */}
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: 11,
                      }}
                    >
                      {metric.date.replace(' ', '\n')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Readiness Score */}
      <View
        style={{
          marginTop: s.md,
          paddingTop: s.md,
          borderTopWidth: 1,
          borderTopColor: c.border,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.xs,
          }}
        >
          Progression Readiness
        </Text>
        <View
          style={{
            paddingHorizontal: s.sm,
            paddingVertical: s.xs,
            borderRadius: r.pill,
            backgroundColor:
              analysis.readinessScore >= 70
                ? c.opacity.successLight
                : analysis.readinessScore >= 50
                ? c.opacity.primaryLight
                : c.opacity.warningLight,
          }}
        >
          <Text
            style={{
              color:
                analysis.readinessScore >= 70
                  ? c.success
                  : analysis.readinessScore >= 50
                  ? c.primary
                  : c.warning,
              fontFamily: ty.mono.family,
              fontSize: ty.sizes.sm,
            }}
          >
            {analysis.readinessScore}/100
          </Text>
        </View>
      </View>
    </View>
  );
}

interface StatPillProps {
  label: string;
  value: string;
  trend?: 'increasing' | 'stable' | 'decreasing';
}

function StatPill({ label, value, trend }: StatPillProps) {
  const { c, s, ty, r } = useTokens();

  const trendColor =
    trend === 'increasing' ? c.success : trend === 'decreasing' ? c.danger : c.textMuted;

  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          color: c.text,
          fontFamily: ty.mono.family,
          fontSize: ty.sizes.md,
          marginBottom: 2,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: 11,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      {trend && (
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: trendColor,
            marginTop: 4,
          }}
        />
      )}
    </View>
  );
}
