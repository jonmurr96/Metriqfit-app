import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { ActiveSetRowViewModel } from '../../../lib/workout/logging-state';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

interface SetLogRowProps {
  row: ActiveSetRowViewModel;
  onSelect: () => void;
  onDraftChange: (field: 'weight' | 'reps' | 'rpe' | 'isWarmup', value: string | boolean) => void;
  onLogSet: () => void;
  onRepeatLast: () => void;
  onRepeatPlusFive: () => void;
  onEditCompleted: () => void;
  onDeleteCompleted: () => void;
  onOpenPlateCalculator: () => void;
}

export function SetLogRow(props: SetLogRowProps) {
  const { c, s, ty, r } = useTokens();
  const [showAdvanced, setShowAdvanced] = useState(Boolean(props.row.draft.rpe) || props.row.draft.isWarmup);

  const cardTone = useMemo(() => {
    if (props.row.state === 'completed') {
      return {
        backgroundColor: `${c.primary}12`,
        borderColor: `${c.primary}40`,
      };
    }

    if (props.row.state === 'active') {
      return {
        backgroundColor: c.surface,
        borderColor: `${c.primary}55`,
      };
    }

    return {
      backgroundColor: c.surface,
      borderColor: c.border,
    };
  }, [c.border, c.primary, c.surface, props.row.state]);

  if (props.row.state === 'completed' && props.row.completedSet) {
    return (
      <View
        style={{
          borderRadius: r.lg,
          borderWidth: 1,
          borderColor: cardTone.borderColor,
          backgroundColor: cardTone.backgroundColor,
          padding: s.md,
          gap: s.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
            {props.row.summaryLabel}
          </Text>
          <TabBarIcon name="checkmark" color={c.primary} size={16} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
            Previous: {props.row.previousLabel}
          </Text>
          <View style={{ flexDirection: 'row', gap: s.sm }}>
            <Pressable onPress={props.onEditCompleted}>
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                Edit
              </Text>
            </Pressable>
            <Pressable onPress={props.onDeleteCompleted}>
              <Text style={{ color: c.danger, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (props.row.state === 'upcoming') {
    return (
      <Pressable
        onPress={props.onSelect}
        style={{
          borderRadius: r.lg,
          borderWidth: 1,
          borderColor: cardTone.borderColor,
          backgroundColor: cardTone.backgroundColor,
          padding: s.md,
          opacity: 0.68,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
            Set {props.row.setNumber}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
            Previous: {props.row.previousLabel}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        borderRadius: r.xl,
        borderWidth: 1,
        borderColor: cardTone.borderColor,
        backgroundColor: cardTone.backgroundColor,
        padding: s.md,
        gap: s.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
          Set {props.row.setNumber}
        </Text>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
          Previous: {props.row.previousLabel}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: s.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: 6 }}>
            Weight
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: s.xs,
              borderRadius: r.lg,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface2,
              paddingHorizontal: s.sm,
            }}
          >
            <TextInput
              value={props.row.draft.weight}
              onChangeText={(value) => props.onDraftChange('weight', value)}
              placeholder="0"
              placeholderTextColor={c.textSubtle}
              keyboardType="numeric"
              style={{
                flex: 1,
                minHeight: 42,
                color: c.text,
                fontFamily: ty.heading.familySemibold,
              }}
            />
            <Pressable onPress={props.onOpenPlateCalculator}>
              <TabBarIcon name="calculator" size={14} color={c.primary} />
            </Pressable>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: 6 }}>
            Reps
          </Text>
          <TextInput
            value={props.row.draft.reps}
            onChangeText={(value) => props.onDraftChange('reps', value)}
            placeholder="0"
            placeholderTextColor={c.textSubtle}
            keyboardType="numeric"
            style={{
              minHeight: 42,
              borderRadius: r.lg,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface2,
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              paddingHorizontal: s.sm,
            }}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: s.sm, flexWrap: 'wrap' }}>
        {props.row.canRepeatLast ? (
          <Pressable
            onPress={props.onRepeatLast}
            style={{
              paddingHorizontal: s.md,
              paddingVertical: s.xs,
              borderRadius: r.pill,
              backgroundColor: c.surface2,
            }}
          >
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              Repeat Last
            </Text>
          </Pressable>
        ) : null}

        {props.row.canRepeatPlusFive ? (
          <Pressable
            onPress={props.onRepeatPlusFive}
            style={{
              paddingHorizontal: s.md,
              paddingVertical: s.xs,
              borderRadius: r.pill,
              backgroundColor: `${c.primary}18`,
            }}
          >
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              Repeat +5
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={() => setShowAdvanced((current) => !current)}
          style={{
            paddingHorizontal: s.md,
            paddingVertical: s.xs,
            borderRadius: r.pill,
            backgroundColor: c.surface2,
          }}
        >
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
            {showAdvanced ? 'Hide Advanced' : 'Advanced'}
          </Text>
        </Pressable>
      </View>

      {showAdvanced ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm }}>
          <Pressable
            onPress={() => props.onDraftChange('isWarmup', !props.row.draft.isWarmup)}
            style={{
              paddingHorizontal: s.md,
              paddingVertical: s.xs,
              borderRadius: r.pill,
              backgroundColor: props.row.draft.isWarmup ? `${c.warning}20` : c.surface2,
            }}
          >
            <Text
              style={{
                color: props.row.draft.isWarmup ? c.warning : c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
              }}
            >
              Warm-up
            </Text>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: 6 }}>
              RPE
            </Text>
            <TextInput
              value={props.row.draft.rpe}
              onChangeText={(value) => props.onDraftChange('rpe', value)}
              placeholder="-"
              placeholderTextColor={c.textSubtle}
              keyboardType="numeric"
              style={{
                minHeight: 40,
                borderRadius: r.lg,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface2,
                color: c.text,
                fontFamily: ty.body.familySemibold,
                paddingHorizontal: s.sm,
              }}
            />
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={props.onLogSet}
        style={{
          borderRadius: r.pill,
          backgroundColor: c.primary,
          paddingVertical: s.sm,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
          Log Set
        </Text>
      </Pressable>
    </View>
  );
}
