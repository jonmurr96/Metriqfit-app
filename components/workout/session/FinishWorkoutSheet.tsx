import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { AnimatePresence, MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';

import type { FinishWorkoutViewModel } from '../../../lib/workout/logging-state';
import { useTokens } from '../../../lib/theme';

interface FinishWorkoutSheetProps {
  visible: boolean;
  viewModel: FinishWorkoutViewModel;
  bottomInset: number;
  topInset: number;
  isPaused: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function FinishWorkoutSheet(props: FinishWorkoutSheetProps) {
  const { c, s, ty, r } = useTokens();
  const confirmDisabled = props.isPaused || props.isSubmitting;

  return (
    <AnimatePresence>
      {props.visible ? (
        <>
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(4, 8, 18, 0.75)',
            }}
          />

          <MotiView
            from={{ translateY: 240 }}
            animate={{ translateY: 0 }}
            exit={{ translateY: 240 }}
            transition={{ type: 'spring', damping: 18 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              borderTopLeftRadius: r.xl,
              borderTopRightRadius: r.xl,
              backgroundColor: c.surface,
              paddingHorizontal: s.lg,
              paddingTop: s.lg,
              paddingBottom: props.bottomInset + s.lg,
              maxHeight: '84%',
              marginTop: props.topInset + s.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: s.md }}>
              <View>
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>
                  {props.viewModel.title}
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: 4 }}>
                  {props.viewModel.noteStatus}
                </Text>
              </View>

              <Pressable onPress={props.onClose}>
                <Ionicons name="close" size={24} color={c.text} />
              </Pressable>
            </View>

            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: s.sm }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ flexDirection: 'row', gap: s.sm, marginBottom: s.md }}>
                <Metric label="Exercises" value={`${props.viewModel.exercisesCompleted}/${props.viewModel.totalExercises}`} />
                <Metric label="Sets" value={`${props.viewModel.totalSets}`} />
                <Metric label="Duration" value={props.viewModel.durationLabel} />
              </View>

              {props.isPaused ? (
                <View
                  style={{
                    borderRadius: r.lg,
                    backgroundColor: `${c.warning}14`,
                    borderWidth: 1,
                    borderColor: `${c.warning}35`,
                    padding: s.md,
                    marginBottom: s.md,
                  }}
                >
                  <Text style={{ color: c.warning, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Resume the session timer before finishing.
                  </Text>
                </View>
              ) : null}

              {props.viewModel.incompleteItems.length > 0 ? (
                <View style={{ gap: s.sm }}>
                  {props.viewModel.incompleteItems.map((item) => (
                    <View
                      key={item.exerciseId}
                      style={{
                        borderRadius: r.lg,
                        padding: s.md,
                        backgroundColor: c.surface2,
                      }}
                    >
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                        {item.exerciseName}
                      </Text>
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                        {item.remainingSets} set{item.remainingSets === 1 ? '' : 's'} remaining
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  All planned work is logged. Finish the session and route cleanly into the summary.
                </Text>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.lg }}>
              <Pressable
                onPress={props.onClose}
                style={{
                  flex: 1,
                  borderRadius: r.pill,
                  backgroundColor: c.surface2,
                  paddingVertical: s.sm,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  Return to Session
                </Text>
              </Pressable>

              <Pressable
                disabled={confirmDisabled}
                onPress={props.onConfirm}
                style={{
                  flex: 1,
                  borderRadius: r.pill,
                  backgroundColor: confirmDisabled ? c.surface2 : c.primary,
                  paddingVertical: s.sm,
                  alignItems: 'center',
                  opacity: confirmDisabled ? 0.6 : 1,
                }}
              >
                <Text style={{ color: confirmDisabled ? c.textMuted : c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  {props.isSubmitting ? 'Finishing...' : props.viewModel.ctaLabel}
                </Text>
              </Pressable>
            </View>
          </MotiView>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function Metric(props: { label: string; value: string }) {
  const { c, s, ty, r } = useTokens();

  return (
    <View
      style={{
        flex: 1,
        borderRadius: r.lg,
        padding: s.md,
        backgroundColor: c.surface2,
      }}
    >
      <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
        {props.label}
      </Text>
      <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, marginTop: 6 }}>
        {props.value}
      </Text>
    </View>
  );
}
