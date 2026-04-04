/**
 * SmartSubstitutionPicker
 *
 * 3-tier exercise substitution picker:
 * 1. Perfect Matches - Same pattern + equipment compatible
 * 2. Good Alternatives - Related patterns + equipment compatible
 * 3. All Exercises - Text search fallback (warns if equipment incompatible)
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import { 
  getSwapAlternatives, 
} from '../../../lib/workout/v1_swap_engine';
import { 
  Exercise as V1Exercise, 
  SwapAlternative, 
  ContinuityMethod,
  GoalBucket,
  SessionEnvironment,
  LiftComfort
} from '../../../types/v1_engine';
import { coreExercises } from '../../../loaders/seeds/exercises';

interface SmartSubstitutionPickerProps {
  originalExercise: V1Exercise;
  userProfile: {
    goal: GoalBucket;
    environment: SessionEnvironment;
    comfort: LiftComfort;
    injuries: string[];
  };
  onSelect: (alternative: SwapAlternative) => void;
  onManualSelect: (exercise: V1Exercise) => void;
  onClose: () => void;
}

export function SmartSubstitutionPicker({
  originalExercise,
  userProfile,
  onSelect,
  onManualSelect,
  onClose,
}: SmartSubstitutionPickerProps) {
  const { c, s, ty, r } = useTokens();

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [alternatives, setAlternatives] = useState<SwapAlternative[]>([]);

  // Load alternatives on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      // In a real app, this might be an API call, but our V1 engine is local/synchronous
      const results = getSwapAlternatives(originalExercise, userProfile);
      setAlternatives(results);
      setIsLoading(false);
    };
    load();
  }, [originalExercise.external_id]);

  // Filter all exercises for manual search fallback
  const manualFlatList = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    // Use coreExercises directly for manual fallback search
    return coreExercises.filter(ex => 
      ex.external_id !== originalExercise.external_id &&
      (ex.name.toLowerCase().includes(query) || 
       ex.movement_pattern.toLowerCase().includes(query))
    ).slice(0, 15);
  }, [searchQuery, originalExercise.external_id]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: c.bg,
      }}
    >
      {/* Header */}
      <View
        style={{
          paddingHorizontal: s.lg,
          paddingVertical: s.md,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: s.xs }}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.md,
              }}
            >
              Swap Exercise
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
                marginTop: 2,
              }}
            >
              Replacing: {originalExercise.name}
            </Text>
          </View>
          <Pressable onPress={onClose} style={{ padding: s.xs }}>
            <TabBarIcon name="close" size={24} color={c.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* Main Alternative List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: s.lg,
          paddingTop: s.md,
          paddingBottom: s.xl,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: s.xl }} />
        ) : (
          <>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: s.md,
              }}
            >
              Coach Recommendations
            </Text>
            
            <View style={{ gap: s.sm, marginBottom: s.xl }}>
              {alternatives.map((alt, index) => (
                <V1SwapOptionCard
                  key={alt.exercise.external_id}
                  alternative={alt}
                  rank={index + 1}
                  onSelect={() => onSelect(alt)}
                />
              ))}
            </View>

            {/* Manual Search Section */}
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: c.border,
                paddingTop: s.xl,
                marginBottom: s.xl,
              }}
            >
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                  marginBottom: 4,
                }}
              >
                Search more exercises
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: 12,
                  marginBottom: s.md,
                }}
              >
                Manual swap — may start a new track
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c.surface,
                  borderRadius: r.md,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: s.sm,
                  paddingVertical: s.xs,
                }}
              >
                <TabBarIcon name="search" size={18} color={c.textMuted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Find something else..."
                  placeholderTextColor={c.textSubtle}
                  style={{
                    flex: 1,
                    marginLeft: s.sm,
                    color: c.text,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.sm,
                  }}
                />
              </View>

              {searchQuery.length > 0 && (
                <View style={{ marginTop: s.md, gap: s.xs }}>
                  {manualFlatList.map((ex) => (
                    <Pressable
                      key={ex.external_id}
                      onPress={() => onManualSelect(ex)}
                      style={{
                        padding: s.md,
                        backgroundColor: c.surface,
                        borderRadius: r.md,
                        borderWidth: 1,
                        borderColor: c.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                          {ex.name}
                        </Text>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 11 }}>
                          {ex.movement_pattern} • {ex.equipment_category}
                        </Text>
                      </View>
                      <TabBarIcon name="chevron-forward" size={16} color={c.textSubtle} />
                    </Pressable>
                  ))}
                  {manualFlatList.length === 0 && (
                    <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: s.md }}>
                      No specific match found for "{searchQuery}"
                    </Text>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface V1SwapOptionCardProps {
  alternative: SwapAlternative;
  rank: number;
  onSelect: () => void;
}

function V1SwapOptionCard({ alternative, rank, onSelect }: V1SwapOptionCardProps) {
  const { c, s, ty, r } = useTokens();
  const { exercise, match_label, benefit_tag, continuity_recommendation } = alternative;

  const continuityColor = 
    continuity_recommendation === ContinuityMethod.Continue ? c.success :
    continuity_recommendation === ContinuityMethod.Modified ? c.primary :
    c.textMuted;

  const continuityLabel = 
    continuity_recommendation === ContinuityMethod.Continue ? 'Continue Progress' :
    continuity_recommendation === ContinuityMethod.Modified ? 'Modified Carryover' :
    'Start New Track';

  return (
    <Pressable
      onPress={onSelect}
      style={{
        backgroundColor: c.surface,
        borderRadius: r.md,
        borderWidth: 1,
        borderColor: c.border,
        padding: s.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: s.xs }}>
        {/* Rank Badge */}
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: c.surface2,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: s.sm,
          }}
        >
          <Text style={{ color: c.text, fontFamily: ty.mono.family, fontSize: 10 }}>
            {rank}
          </Text>
        </View>

        <Text
          style={{
            flex: 1,
            color: c.text,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.sm,
          }}
          numberOfLines={1}
        >
          {exercise.name}
        </Text>

        {/* Match Label */}
        <View
          style={{
            paddingHorizontal: s.xs,
            paddingVertical: 2,
            borderRadius: r.sm,
            backgroundColor: c.primary + '15',
          }}
        >
          <Text
            style={{
              color: c.primary,
              fontFamily: ty.body.familySemibold,
              fontSize: 10,
              textTransform: 'uppercase',
            }}
          >
            {match_label}
          </Text>
        </View>
      </View>

      {/* Benefit Tag & Equipment */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.xs, marginBottom: s.sm }}>
        <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: 12 }}>
          {benefit_tag}
        </Text>
        <Text style={{ color: c.textSubtle }}>•</Text>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 11 }}>
          {exercise.equipment_category}
        </Text>
      </View>

      {/* Continuity Badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: s.sm,
            paddingVertical: 4,
            borderRadius: r.pill,
            backgroundColor: continuityColor + '15',
            gap: 6,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: continuityColor }} />
          <Text style={{ color: continuityColor, fontFamily: ty.body.familySemibold, fontSize: 10 }}>
            {continuityLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
