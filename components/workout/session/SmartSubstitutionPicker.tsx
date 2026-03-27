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
import type { SubstitutionOption, Exercise } from '../../../services/exerciseSubstitutionService';
import { getSmartSubstitutions } from '../../../services/exerciseSubstitutionService';

interface SmartSubstitutionPickerProps {
  originalExercise: Exercise;
  userEquipment: string[];
  sessionExercises: Exercise[];
  dayFocus: string | null;
  slotIndex: number;
  userId: string;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

type ActiveTab = 'perfect' | 'good' | 'all';

export function SmartSubstitutionPicker({
  originalExercise,
  userEquipment,
  sessionExercises,
  dayFocus,
  slotIndex,
  userId,
  onSelect,
  onClose,
}: SmartSubstitutionPickerProps) {
  const { c, s, ty, r } = useTokens();

  const [activeTab, setActiveTab] = useState<ActiveTab>('perfect');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [perfectMatches, setPerfectMatches] = useState<SubstitutionOption[]>([]);
  const [goodAlternatives, setGoodAlternatives] = useState<SubstitutionOption[]>([]);
  const [allExercises, setAllExercises] = useState<SubstitutionOption[]>([]);

  // Load substitution options on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setIsLoading(true);
        const result = await getSmartSubstitutions({
          originalExerciseId: originalExercise.id,
          userId,
          sessionExercises,
          dayFocus,
          slotIndex,
        });

        setPerfectMatches(result.perfectMatches);
        setGoodAlternatives(result.goodAlternatives);
        setAllExercises(result.allExercises);

        // Auto-select first non-empty tab
        if (result.perfectMatches.length > 0) {
          setActiveTab('perfect');
        } else if (result.goodAlternatives.length > 0) {
          setActiveTab('good');
        } else {
          setActiveTab('all');
        }
      } catch (error) {
        console.error('[SmartSubstitutionPicker] Failed to load options:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOptions();
  }, [originalExercise.id, userId]);

  // Filter all exercises by search query
  const filteredAllExercises = useMemo(() => {
    if (!searchQuery.trim()) {
      return allExercises;
    }

    const query = searchQuery.toLowerCase();
    return allExercises.filter(opt =>
      opt.exercise.name.toLowerCase().includes(query) ||
      (opt.exercise.primary_muscle || '').toLowerCase().includes(query) ||
      (opt.exercise.category || '').toLowerCase().includes(query)
    );
  }, [allExercises, searchQuery]);

  // Get active list based on tab
  const activeList =
    activeTab === 'perfect'
      ? perfectMatches
      : activeTab === 'good'
      ? goodAlternatives
      : filteredAllExercises;

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

      {/* Tab Bar */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: s.lg,
          paddingTop: s.md,
          gap: s.sm,
        }}
      >
        <TabButton
          label="Perfect Matches"
          count={perfectMatches.length}
          active={activeTab === 'perfect'}
          onPress={() => setActiveTab('perfect')}
          color={c.success}
        />
        <TabButton
          label="Good Alternatives"
          count={goodAlternatives.length}
          active={activeTab === 'good'}
          onPress={() => setActiveTab('good')}
          color={c.primary}
        />
        <TabButton
          label="All Exercises"
          count={allExercises.length}
          active={activeTab === 'all'}
          onPress={() => setActiveTab('all')}
          color={c.textMuted}
        />
      </View>

      {/* Search Bar (only for "All Exercises" tab) */}
      {activeTab === 'all' && (
        <View style={{ paddingHorizontal: s.lg, paddingTop: s.md }}>
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
              placeholder="Search exercises..."
              placeholderTextColor={c.textSubtle}
              style={{
                flex: 1,
                marginLeft: s.sm,
                color: c.text,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
              }}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <TabBarIcon name="close-circle" size={18} color={c.textMuted} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Exercise List */}
      {isLoading ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: s.xl,
          }}
        >
          <ActivityIndicator size="large" color={c.primary} />
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.sm,
              marginTop: s.md,
            }}
          >
            Finding best matches...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: s.lg,
            paddingTop: s.md,
            paddingBottom: s.xl,
            gap: s.sm,
          }}
        >
          {activeList.length === 0 ? (
            <View
              style={{
                paddingVertical: s.xl,
                alignItems: 'center',
              }}
            >
              <TabBarIcon name="search-outline" size={48} color={c.textSubtle} />
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  marginTop: s.md,
                  textAlign: 'center',
                }}
              >
                {activeTab === 'all' && searchQuery
                  ? 'No exercises found matching your search'
                  : activeTab === 'perfect'
                  ? 'No perfect matches found. Try "Good Alternatives"'
                  : 'No alternatives found. Try "All Exercises"'}
              </Text>
            </View>
          ) : (
            activeList.map((option, index) => (
              <ExerciseOptionCard
                key={option.exercise.id}
                option={option}
                rank={index + 1}
                onSelect={() => onSelect(option.exercise)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface TabButtonProps {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  color: string;
}

function TabButton({ label, count, active, onPress, color }: TabButtonProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: s.sm,
        paddingHorizontal: s.xs,
        borderRadius: r.md,
        backgroundColor: active ? color + '20' : 'transparent',
        borderWidth: 1,
        borderColor: active ? color : c.border,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: active ? color : c.textMuted,
          fontFamily: active ? ty.body.familySemibold : ty.body.family,
          fontSize: ty.sizes.xs,
          marginBottom: 2,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          paddingHorizontal: s.xs,
          paddingVertical: 2,
          borderRadius: r.pill,
          backgroundColor: active ? color : c.surface2,
        }}
      >
        <Text
          style={{
            color: active ? c.bg : c.textMuted,
            fontFamily: ty.mono.familySemibold,
            fontSize: ty.sizes.xxs,
          }}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

interface ExerciseOptionCardProps {
  option: SubstitutionOption;
  rank: number;
  onSelect: () => void;
}

function ExerciseOptionCard({ option, rank, onSelect }: ExerciseOptionCardProps) {
  const { c, s, ty, r } = useTokens();

  const categoryColor =
    option.category === 'perfect_match'
      ? c.success
      : option.category === 'good_alternative'
      ? c.primary
      : c.textMuted;

  const categoryLabel =
    option.category === 'perfect_match'
      ? 'Perfect Match'
      : option.category === 'good_alternative'
      ? 'Good Alternative'
      : 'Different Pattern';

  return (
    <Pressable
      onPress={onSelect}
      style={{
        backgroundColor: c.surface,
        borderRadius: r.md,
        borderWidth: 1,
        borderColor: option.equipmentCompatible ? c.border : c.warning + '40',
        padding: s.md,
      }}
    >
      {/* Header Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: s.xs }}>
        {/* Rank Badge */}
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: categoryColor + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: s.sm,
          }}
        >
          <Text
            style={{
              color: categoryColor,
              fontFamily: ty.mono.familySemibold,
              fontSize: ty.sizes.xs,
            }}
          >
            {rank}
          </Text>
        </View>

        {/* Exercise Name */}
        <Text
          style={{
            flex: 1,
            color: c.text,
            fontFamily: ty.body.familySemibold,
            fontSize: ty.sizes.sm,
          }}
          numberOfLines={1}
        >
          {option.exercise.name}
        </Text>

        {/* Category Badge */}
        <View
          style={{
            paddingHorizontal: s.xs,
            paddingVertical: 2,
            borderRadius: r.sm,
            backgroundColor: categoryColor + '20',
          }}
        >
          <Text
            style={{
              color: categoryColor,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xxs,
              textTransform: 'uppercase',
            }}
          >
            {categoryLabel}
          </Text>
        </View>
      </View>

      {/* Exercise Details */}
      <View style={{ marginBottom: s.xs }}>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.xs,
          }}
        >
          {option.exercise.primary_muscle || 'Unknown muscle'} •{' '}
          {option.exercise.category || 'General'} •{' '}
          {option.exercise.difficulty || 'Unknown difficulty'}
        </Text>
      </View>

      {/* Match Reasons */}
      {option.matchReasons.length > 0 && (
        <View style={{ marginBottom: s.xs }}>
          {option.matchReasons.slice(0, 2).map((reason, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: c.success,
                  marginRight: s.xs,
                }}
              />
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {reason}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Warnings */}
      {option.warnings.length > 0 && (
        <View
          style={{
            marginTop: s.xs,
            paddingTop: s.xs,
            borderTopWidth: 1,
            borderTopColor: c.border,
          }}
        >
          {option.warnings.slice(0, 2).map((warning, idx) => (
            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <TabBarIcon name="alert-circle-outline" size={14} color={c.warning} />
              <Text
                style={{
                  color: c.warning,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  marginLeft: s.xs,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {warning}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Score (debug - can be removed) */}
      {/* <Text style={{ color: c.textSubtle, fontFamily: ty.mono.family, fontSize: ty.sizes.xxs, marginTop: 4 }}>
        Score: {option.score}
      </Text> */}
    </Pressable>
  );
}
