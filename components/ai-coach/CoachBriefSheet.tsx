import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AICoachDashboardState } from '../../services/aiCoachService';
import { useTokens } from '../../lib/theme';
import { CoachSheet } from './CoachSheet';

interface CoachBriefSheetProps {
  visible: boolean;
  state: AICoachDashboardState | null;
  onClose: () => void;
}

export function CoachBriefSheet({ visible, state, onClose }: CoachBriefSheetProps) {
  const { c, s, r, ty } = useTokens();

  return (
    <CoachSheet
      visible={visible}
      onClose={onClose}
      title="Coach Context"
      subtitle="Grounded context for the current day, including what matters now and why the coach is saying it."
    >
      {state ? (
        <View style={{ gap: s.lg }}>
          <View
            style={[
              styles.hero,
              {
                borderRadius: r.lg,
                padding: s.lg,
                backgroundColor: c.surface2,
                borderWidth: 1,
                borderColor: `${c.primary}24`,
              },
            ]}
          >
            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 12, letterSpacing: 0.8 }}>
              {state.statusLabel.toUpperCase()}
            </Text>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl, marginTop: s.sm }}>
              {state.headline}
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, lineHeight: 21, marginTop: s.sm }}>
              {state.summary}
            </Text>
          </View>

          <View style={{ gap: s.sm }}>
            {state.briefDetails.map((detail) => (
              <View
                key={detail.label}
                style={[
                  styles.row,
                  {
                    borderRadius: r.md,
                    paddingHorizontal: s.md,
                    paddingVertical: s.md,
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.border,
                  },
                ]}
              >
                <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  {detail.label}
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  {detail.value}
                </Text>
              </View>
            ))}
          </View>

          <View>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
              Coach guidance
            </Text>
            <View style={{ marginTop: s.sm, gap: s.sm }}>
              {state.recommendations.map((entry, index) => (
                <View key={`${entry}-${index}`} style={styles.recommendationRow}>
                  <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    {index + 1}.
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, lineHeight: 20, flex: 1 }}>
                    {entry}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </CoachSheet>
  );
}

const styles = StyleSheet.create({
  hero: {},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  recommendationRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
});
