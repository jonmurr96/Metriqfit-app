import React from 'react';
import { Text, View } from 'react-native';
import type { AICoachIntervention } from '../../services/aiCoachService';
import { useTokens } from '../../lib/theme';
import { CoachSheet } from './CoachSheet';
import { CoachInterventionCard } from './CoachInterventionCard';

interface CoachActionsSheetProps {
  visible: boolean;
  items: AICoachIntervention[];
  onClose: () => void;
  onSelect: (item: AICoachIntervention) => void;
}

export function CoachActionsSheet({ visible, items, onClose, onSelect }: CoachActionsSheetProps) {
  const { c, s, ty } = useTokens();

  const sections = [
    { key: 'workout', title: 'Workout recommendations', items: items.filter((item) => item.kind === 'workout') },
    { key: 'nutrition', title: 'Nutrition plan adjustments', items: items.filter((item) => item.kind === 'nutrition') },
    { key: 'prep', title: 'Prep adjustments', items: items.filter((item) => item.kind === 'prep') },
    { key: 'navigate', title: 'Linked actions', items: items.filter((item) => item.kind === 'navigate') },
  ].filter((section) => section.items.length > 0);

  return (
    <CoachSheet
      visible={visible}
      onClose={onClose}
      title="Coach Actions"
      subtitle="Direct interventions and linked next moves that can be reviewed in-place."
    >
      <View style={{ gap: s.xl }}>
        {sections.length ? sections.map((section) => (
          <View key={section.key}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
                letterSpacing: 1.2,
                marginBottom: s.sm,
              }}
            >
              {section.title.toUpperCase()}
            </Text>
            <View style={{ gap: s.sm }}>
              {section.items.map((item) => (
                <CoachInterventionCard
                  key={item.id}
                  intervention={item}
                  compact
                  onPress={() => onSelect(item)}
                />
              ))}
            </View>
          </View>
        )) : (
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.family,
              fontSize: ty.sizes.sm,
            }}
          >
            No pending coach actions right now.
          </Text>
        )}
      </View>
    </CoachSheet>
  );
}
