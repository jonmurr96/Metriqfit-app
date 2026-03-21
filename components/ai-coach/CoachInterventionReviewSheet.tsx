import React from 'react';
import { Text, View } from 'react-native';
import type { AICoachIntervention } from '../../services/aiCoachService';
import { useTokens } from '../../lib/theme';
import { CoachSheet } from './CoachSheet';
import { CoachInterventionCard } from './CoachInterventionCard';

interface CoachInterventionReviewSheetProps {
  visible: boolean;
  intervention: AICoachIntervention | null;
  onClose: () => void;
  onApply?: (intervention: AICoachIntervention) => void;
  onReject?: (intervention: AICoachIntervention) => void;
  isApplying?: boolean;
  isRejecting?: boolean;
}

export function CoachInterventionReviewSheet({
  visible,
  intervention,
  onClose,
  onApply,
  onReject,
  isApplying = false,
  isRejecting = false,
}: CoachInterventionReviewSheetProps) {
  const { c, s, ty } = useTokens();

  return (
    <CoachSheet
      visible={visible}
      onClose={onClose}
      title="Intervention Review"
      subtitle="Review the rationale and decide whether to apply the change from inside AI Coach."
    >
      {intervention ? (
        <View style={{ gap: s.lg }}>
          <CoachInterventionCard
            intervention={intervention}
            onApply={intervention.canApply && onApply ? () => onApply(intervention) : undefined}
            onReject={intervention.canReject && onReject ? () => onReject(intervention) : undefined}
            isApplying={isApplying}
            isRejecting={isRejecting}
          />

          {intervention.batchChange?.impactSummary ? (
            <View>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                Expected impact
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, lineHeight: 20, marginTop: s.xs }}>
                {intervention.batchChange.impactSummary}
              </Text>
            </View>
          ) : null}

          {intervention.recommendationType ? (
            <View>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                Change type
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, lineHeight: 20, marginTop: s.xs }}>
                {intervention.recommendationType.replace(/_/g, ' ')}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </CoachSheet>
  );
}
