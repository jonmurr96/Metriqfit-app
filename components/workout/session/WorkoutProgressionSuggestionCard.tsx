/**
 * WorkoutProgressionSuggestionCard
 *
 * Displays progressive overload suggestions before/during a workout.
 * Shows 1-3 top progression opportunities with actionable recommendations.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import type { ProgressionRecommendation } from '../../../services/progressiveOverloadService';

interface WorkoutProgressionSuggestionCardProps {
  recommendations: ProgressionRecommendation[];
  onApply: (recommendation: ProgressionRecommendation) => void;
  onDismiss: (recommendation: ProgressionRecommendation) => void;
  maxDisplay?: number;
}

export function WorkoutProgressionSuggestionCard({
  recommendations,
  onApply,
  onDismiss,
  maxDisplay = 3,
}: WorkoutProgressionSuggestionCardProps) {
  const { c, s, ty, r } = useTokens();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Show only top N recommendations (sorted by readiness score)
  const topRecommendations = recommendations.slice(0, maxDisplay);

  if (topRecommendations.length === 0) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: r.md,
        borderWidth: 1,
        borderColor: c.border,
        padding: s.md,
        marginHorizontal: s.lg,
        marginBottom: s.md,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: s.sm }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: c.opacity.successLight,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: s.sm,
          }}
        >
          <TabBarIcon name="trending-up" size={18} color={c.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.sm,
            }}
          >
            Ready to Progress
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
              marginTop: 2,
            }}
          >
            {topRecommendations.length} {topRecommendations.length === 1 ? 'opportunity' : 'opportunities'} detected
          </Text>
        </View>
      </View>

      {/* Recommendations List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: s.sm }}
      >
        {topRecommendations.map((rec) => (
          <RecommendationItem
            key={rec.analysis.exerciseId}
            recommendation={rec}
            isExpanded={expandedId === rec.analysis.exerciseId}
            onToggleExpand={() =>
              setExpandedId(expandedId === rec.analysis.exerciseId ? null : rec.analysis.exerciseId)
            }
            onApply={() => onApply(rec)}
            onDismiss={() => onDismiss(rec)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface RecommendationItemProps {
  recommendation: ProgressionRecommendation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onApply: () => void;
  onDismiss: () => void;
}

function RecommendationItem({
  recommendation,
  isExpanded,
  onToggleExpand,
  onApply,
  onDismiss,
}: RecommendationItemProps) {
  const { c, s, ty, r } = useTokens();
  const { type, analysis, suggestedWeight, suggestedReps, rationale, confidence } = recommendation;

  // Determine icon and color based on suggestion type
  const getTypeInfo = () => {
    switch (type) {
      case 'increase_weight':
        return { icon: 'barbell-outline', color: c.success, label: 'Add Weight' };
      case 'increase_reps':
        return { icon: 'add-circle-outline', color: c.primary, label: 'Add Reps' };
      case 'deload':
        return { icon: 'battery-charging-outline', color: c.warning, label: 'Deload' };
      default:
        return { icon: 'checkmark-circle-outline', color: c.textMuted, label: 'Maintain' };
    }
  };

  const typeInfo = getTypeInfo();

  return (
    <View
      style={{
        width: 280,
        backgroundColor: c.surface2,
        borderRadius: r.md,
        padding: s.md,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      {/* Exercise Name & Type Badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: s.xs }}>
        <TabBarIcon name={typeInfo.icon as any} size={16} color={typeInfo.color} />
        <Text
          style={{
            color: c.text,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.sm,
            flex: 1,
            marginLeft: s.xs,
          }}
          numberOfLines={1}
        >
          {analysis.exerciseName}
        </Text>
      </View>

      {/* Suggestion Summary */}
      <View
        style={{
          backgroundColor: c.bg,
          borderRadius: r.sm,
          padding: s.sm,
          marginBottom: s.sm,
        }}
      >
        {type === 'increase_weight' && suggestedWeight && (
          <Text
            style={{
              color: typeInfo.color,
              fontFamily: ty.mono.family,
              fontSize: ty.sizes.lg,
              textAlign: 'center',
            }}
          >
            Try {suggestedWeight} lbs
          </Text>
        )}
        {type === 'increase_reps' && suggestedReps && (
          <Text
            style={{
              color: typeInfo.color,
              fontFamily: ty.mono.family,
              fontSize: ty.sizes.lg,
              textAlign: 'center',
            }}
          >
            Push for {suggestedReps} reps
          </Text>
        )}
        {type === 'deload' && suggestedWeight && (
          <Text
            style={{
              color: typeInfo.color,
              fontFamily: ty.mono.family,
              fontSize: ty.sizes.lg,
              textAlign: 'center',
            }}
          >
            Reduce to {suggestedWeight} lbs
          </Text>
        )}
      </View>

      {/* Previous Performance */}
      <View style={{ marginBottom: s.sm }}>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.xs,
            marginBottom: 4,
          }}
        >
          Last session: {analysis.lastSession.topSetWeight} lbs × {analysis.lastSession.topSetReps}
          {analysis.lastSession.avgRPE && ` @ RPE ${analysis.lastSession.avgRPE}`}
        </Text>
      </View>

      {/* Confidence Badge */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: s.sm,
          gap: s.xs,
        }}
      >
        <View
          style={{
            paddingHorizontal: s.xs,
            paddingVertical: 2,
            borderRadius: r.sm,
            backgroundColor:
              confidence === 'high'
                ? c.opacity.successLight
                : confidence === 'medium'
                ? c.opacity.primaryLight
                : c.opacity.warningLight,
          }}
        >
          <Text
            style={{
              color:
                confidence === 'high'
                  ? c.success
                  : confidence === 'medium'
                  ? c.primary
                  : c.warning,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xxs,
              textTransform: 'uppercase',
            }}
          >
            {confidence} confidence
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: s.xs,
            paddingVertical: 2,
            borderRadius: r.sm,
            backgroundColor: c.opacity.primaryLight,
          }}
        >
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.mono.family,
              fontSize: ty.sizes.xxs,
            }}
          >
            {analysis.readinessScore}/100
          </Text>
        </View>
      </View>

      {/* Rationale (Expandable) */}
      <Pressable onPress={onToggleExpand}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: s.xs }}>
          <TabBarIcon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={c.textMuted}
          />
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.xs,
              marginLeft: 4,
            }}
          >
            {isExpanded ? 'Hide' : 'Show'} details
          </Text>
        </View>
      </Pressable>

      {isExpanded && (
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
            {rationale}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: s.xs }}>
        <Pressable
          onPress={onApply}
          style={{
            flex: 1,
            paddingVertical: s.sm,
            borderRadius: r.md,
            backgroundColor: typeInfo.color,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: c.bg,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
            }}
          >
            Apply
          </Text>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          style={{
            flex: 1,
            paddingVertical: s.sm,
            borderRadius: r.md,
            backgroundColor: c.surface3,
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
            Dismiss
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
