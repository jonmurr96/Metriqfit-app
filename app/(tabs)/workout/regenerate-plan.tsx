import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import {
  useActiveWorkoutPlan,
  useApplyWorkoutPlanPreview,
  useDiscardWorkoutPlanPreview,
  useGenerateWorkoutPlanPreview,
  useRepairWorkoutPlanPreview,
  useTriggerPlanGeneration,
  useWorkoutPlanPreview,
} from '../../../hooks/usePlan';
import { useWorkoutProgramFamilies } from '../../../hooks/useWorkoutBuilder';
import {
  trackWorkoutPlanRegenerationOpened,
  trackWorkoutPlanRegenerationNoopBlocked,
  trackWorkoutPlanRegenerationPreviewAccepted,
  trackWorkoutPlanRegenerationPreviewDiscarded,
  trackWorkoutPlanRegenerationPreviewGenerated,
  trackWorkoutPlanRegenerationPreviewRequested,
  trackWorkoutPlanRegenerationReasonSelected,
} from '../../../lib/analytics';
import { buildWorkoutPlanDiff, type WorkoutPlanComparable } from '../../../lib/workout/plan-regeneration-diff';
import type {
  WorkoutPlanPreview,
  WorkoutPlanPreviewResult,
  WorkoutRegenerationIssueFlag,
  WorkoutRegenerationReason,
  WorkoutRegenerationRequest,
} from '../../../services/planService';
import type { WeeklyLayoutAssignment } from '../../../lib/workout/program-catalog';

type WizardStep = 1 | 2 | 3 | 4 | 5;

const REASON_OPTIONS: Array<{ value: WorkoutRegenerationReason; label: string }> = [
  { value: 'not_seeing_results', label: 'Not seeing results' },
  { value: 'too_hard_to_recover', label: 'Too hard to recover from' },
  { value: 'sessions_too_long', label: 'Sessions take too long' },
  { value: 'too_repetitive', label: 'Too repetitive / boring' },
  { value: 'schedule_changed', label: 'Schedule changed' },
  { value: 'equipment_changed', label: 'Equipment changed' },
  { value: 'pain_or_discomfort', label: 'Pain / discomfort' },
  { value: 'want_different_split', label: 'Want a different split' },
  { value: 'other', label: 'Other' },
];

const ISSUE_FLAGS: Array<{ value: WorkoutRegenerationIssueFlag; label: string }> = [
  { value: 'too_many_days', label: 'Too many days' },
  { value: 'too_much_volume', label: 'Too much volume' },
  { value: 'wrong_exercise_selection', label: 'Wrong exercise selection' },
  { value: 'need_more_variety', label: 'Need more variety' },
  { value: 'need_more_structure', label: 'Need more structure' },
];

const PROGRESSION_OPTIONS = [
  'linear_progression',
  'double_progression',
  'top_set_backoff',
  'volume_wave',
  'auto_regulated',
  'hypertrophy_accumulation',
] as const;

const GOAL_OPTIONS = [
  'strength',
  'hypertrophy',
  'body_composition',
  'general_fitness',
  'athletic_performance',
  'movement_quality',
] as const;

const SESSION_DURATION_OPTIONS = [35, 45, 50, 60, 75, 90] as const;
const DAYS_PER_WEEK_OPTIONS = [2, 3, 4, 5, 6] as const;
const EQUIPMENT_OPTIONS = ['full_gym', 'dumbbells_only', 'home_gym', 'bodyweight_only', 'travel_setup'] as const;
const WEEKDAYS = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
] as const;

function formatKeyLabel(value?: string | null, fallback = 'Unspecified') {
  const normalized = String(value || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (!normalized) return fallback;

  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseTagList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function summarizeWeeklyLayout(layout?: WeeklyLayoutAssignment[] | null) {
  if (!layout?.length) return 'Not set';
  return layout
    .filter((entry) => entry.sessionType !== 'rest')
    .map((entry) => entry.weekday.toUpperCase())
    .join(' • ');
}

function fieldLabelStyle(ty: any, c: any, s: any) {
  return {
    color: c.text,
    fontFamily: ty.body.familySemibold,
    fontSize: ty.sizes.sm,
    marginTop: s.lg,
    marginBottom: s.sm,
  };
}

function toComparablePlan(plan: any): WorkoutPlanComparable {
  return {
    id: plan?.id,
    familyKey: plan?.programMeta?.programFamilyKey || plan?.program_family_key || null,
    progressionModel: plan?.programMeta?.progressionModel || plan?.progression_model || null,
    daysPerWeek: plan?.days_per_week || 0,
    weeklyLayout: plan?.programMeta?.weeklyLayout || null,
    days: (plan?.days || []).map((day: any) => ({
      id: day.id,
      name: day.name || `Day ${day.day_number || ''}`.trim(),
      focus: day.focus || null,
      estimatedDurationMin: day.estimated_duration_min || null,
      exercises: (day.exercises || []).map((exercise: any) => ({
        exerciseId: exercise.exercise_id || exercise.exercise?.id || null,
        name: exercise.exercise?.name || null,
      })),
    })),
  };
}

function buildTargetedPrompts(reason: WorkoutRegenerationReason | null, keepCurrentSplit: boolean) {
  const prompts: string[] = [];

  switch (reason) {
    case 'sessions_too_long':
      prompts.push('Lower the session duration target or reduce training days.');
      prompts.push('Call out any exercises you would rather remove than keep.');
      break;
    case 'too_hard_to_recover':
      prompts.push('Lower training frequency or switch progression style.');
      prompts.push('Use the injury/restriction field to call out fatigue-sensitive patterns.');
      break;
    case 'too_repetitive':
      prompts.push('Uncheck "Keep current split" or choose a different family.');
      prompts.push('List a few favorite lifts to keep while changing everything else.');
      break;
    case 'want_different_split':
      prompts.push('Choose a new split family and leave "Keep current split" off.');
      break;
    case 'equipment_changed':
      prompts.push('Set equipment access to the new setup before generating again.');
      break;
    default:
      prompts.push('Be more explicit about the split, duration, or exercises to avoid.');
      prompts.push('Add one or two concrete issues in the free-text note.');
      break;
  }

  if (keepCurrentSplit) {
    prompts.push('Keeping the current split limits how different the new preview can be.');
  }

  return prompts;
}

function ChipButton({
  active,
  label,
  onPress,
  palette,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  palette: { primary: string; text: string; muted: string; surface: string; border: string; bg: string };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? `${palette.primary}22` : palette.surface,
          borderColor: active ? palette.primary : palette.border,
        },
      ]}
    >
      <Text style={{ color: active ? palette.primary : palette.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function SummaryCard({
  title,
  plan,
  palette,
  typography,
  radius,
  spacing,
}: {
  title: string;
  plan: any;
  palette: { text: string; textMuted: string; surface: string; border: string; primary: string };
  typography: { heading: any; body: any; mono: any; sizes: any };
  radius: any;
  spacing: any;
}) {
  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: palette.border,
        padding: spacing.lg,
        gap: spacing.xs,
      }}
    >
      <Text style={{ color: palette.primary, fontFamily: typography.mono.family, fontSize: typography.sizes.xs }}>{title}</Text>
      <Text style={{ color: palette.text, fontFamily: typography.heading.familySemibold, fontSize: typography.sizes.lg }}>
        {plan?.name || 'Workout Plan'}
      </Text>
      <Text style={{ color: palette.textMuted, fontFamily: typography.body.family, fontSize: typography.sizes.sm }}>
        {`${plan?.days_per_week || 0} days/week • ${formatKeyLabel(plan?.programMeta?.programFamilyKey || plan?.program_family_key)}`}
      </Text>
      <Text style={{ color: palette.textMuted, fontFamily: typography.body.family, fontSize: typography.sizes.xs }}>
        Progression: {formatKeyLabel(plan?.programMeta?.progressionModel || plan?.progression_model)}
      </Text>
      <Text style={{ color: palette.textMuted, fontFamily: typography.body.family, fontSize: typography.sizes.xs }}>
        Weekly layout: {summarizeWeeklyLayout(plan?.programMeta?.weeklyLayout)}
      </Text>
    </View>
  );
}

export default function RegeneratePlanScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const repairMode = modeParam === 'repair';
  const [step, setStep] = useState<WizardStep>(repairMode ? 5 : 1);
  const [reason, setReason] = useState<WorkoutRegenerationReason | null>(null);
  const [issueFlags, setIssueFlags] = useState<WorkoutRegenerationIssueFlag[]>([]);
  const [freeText, setFreeText] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState<string>('');
  const [preferredSplitFamily, setPreferredSplitFamily] = useState<string | null>(null);
  const [progressionPreference, setProgressionPreference] = useState<string | null>(null);
  const [sessionDurationTargetMin, setSessionDurationTargetMin] = useState<string>('');
  const [goalEmphasis, setGoalEmphasis] = useState<string | null>(null);
  const [keepCurrentSplit, setKeepCurrentSplit] = useState(true);
  const [startFresh, setStartFresh] = useState(false);
  const [preferredDaysOff, setPreferredDaysOff] = useState<string[]>([]);
  const [equipmentAccess, setEquipmentAccess] = useState<string | null>(null);
  const [injuriesText, setInjuriesText] = useState('');
  const [avoidExercisesText, setAvoidExercisesText] = useState('');
  const [keepExercisesText, setKeepExercisesText] = useState('');
  const [didSeedDefaults, setDidSeedDefaults] = useState(false);
  const [previewResult, setPreviewResult] = useState<WorkoutPlanPreviewResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [initialGenerationMessage, setInitialGenerationMessage] = useState<string | null>(null);
  const hasTrackedOpen = useRef(false);

  const { data: activePlan, isLoading: activePlanLoading } = useActiveWorkoutPlan();
  const { data: families = [] } = useWorkoutProgramFamilies();
  const { data: existingPreview } = useWorkoutPlanPreview(activePlan?.id, { enabled: !!activePlan?.id });
  const generatePreviewMutation = useGenerateWorkoutPlanPreview();
  const applyPreviewMutation = useApplyWorkoutPlanPreview();
  const discardPreviewMutation = useDiscardWorkoutPlanPreview();
  const repairPreviewMutation = useRepairWorkoutPlanPreview();
  const triggerPlanGeneration = useTriggerPlanGeneration();

  useEffect(() => {
    if (activePlanLoading) return;
    if (hasTrackedOpen.current) return;
    hasTrackedOpen.current = true;
    trackWorkoutPlanRegenerationOpened({
      source: repairMode ? 'my_plan_repair' : 'my_plan',
      has_active_plan: !!activePlan,
      current_plan_id: activePlan?.id || null,
    });
  }, [activePlan?.id, activePlanLoading, repairMode]);

  useEffect(() => {
    if (!repairMode) return;
    setStep(5);
  }, [repairMode]);

  useEffect(() => {
    if (!activePlan || didSeedDefaults) return;

    const averageDuration = (activePlan.days || [])
      .map((day: any) => Number(day.estimated_duration_min || 0))
      .filter((value: number) => Number.isFinite(value) && value > 0);
    const derivedPreferredDaysOff = (activePlan.programMeta?.weeklyLayout || [])
      .filter((entry: WeeklyLayoutAssignment) => entry.sessionType === 'rest')
      .map((entry: WeeklyLayoutAssignment) => entry.weekday);

    setDaysPerWeek(String(activePlan.days_per_week || 4));
    setPreferredSplitFamily(activePlan.programMeta?.programFamilyKey || activePlan.program_family_key || null);
    setProgressionPreference(activePlan.programMeta?.progressionModel || activePlan.progression_model || null);
    setGoalEmphasis(activePlan.programMeta?.goalTags?.[0] || null);
    setSessionDurationTargetMin(
      averageDuration.length
        ? String(Math.round(averageDuration.reduce((sum: number, value: number) => sum + value, 0) / averageDuration.length))
        : '',
    );
    setPreferredDaysOff(derivedPreferredDaysOff);
    setDidSeedDefaults(true);
  }, [activePlan, didSeedDefaults]);

  const existingPreviewResult = useMemo(() => {
    if (!activePlan || !existingPreview) return null;

    return {
      runId: 'existing-preview',
      previewPlanId: existingPreview.id,
      currentPlan: activePlan,
      previewPlan: existingPreview,
      diff: buildWorkoutPlanDiff({
        currentPlan: toComparablePlan(activePlan),
        previewPlan: toComparablePlan(existingPreview),
        minorRefinement: keepCurrentSplit && !startFresh,
      }),
      warnings: [],
    } satisfies WorkoutPlanPreview;
  }, [activePlan, existingPreview, keepCurrentSplit, startFresh]);

  const currentPreview = useMemo(() => {
    if (previewResult && !('status' in previewResult)) {
      return previewResult;
    }
    return existingPreviewResult;
  }, [existingPreviewResult, previewResult]);

  const validationFailure = previewResult && 'status' in previewResult ? previewResult : null;
  const isValidationFailure = validationFailure?.status === 'validation_failed';
  const prompts = useMemo(() => buildTargetedPrompts(reason, keepCurrentSplit), [reason, keepCurrentSplit]);
  const primaryButtonLabel = repairMode
    ? 'Generate Repair Preview'
    : step < 4
    ? 'Next'
    : activePlan
      ? 'Generate Preview'
      : 'Generate Plan';

  const canContinue = repairMode ? !!activePlan : step !== 1 || !!reason;

  const buildRequest = (): WorkoutRegenerationRequest => {
    if (!activePlan) {
      throw new Error('No active workout plan to regenerate.');
    }

    return {
      current_plan_id: activePlan.id,
      reason: reason || 'other',
      issue_flags: issueFlags,
      free_text: freeText.trim() || undefined,
      days_per_week_override: daysPerWeek ? Number(daysPerWeek) : null,
      preferred_split_family: preferredSplitFamily || null,
      progression_preference: progressionPreference || null,
      session_duration_target_min: sessionDurationTargetMin ? Number(sessionDurationTargetMin) : null,
      goal_emphasis: goalEmphasis || null,
      preferred_days_off: preferredDaysOff,
      equipment_access: equipmentAccess || null,
      injuries: parseTagList(injuriesText),
      avoid_exercise_names: parseTagList(avoidExercisesText),
      keep_exercise_names: parseTagList(keepExercisesText),
      keep_current_split: keepCurrentSplit,
      start_fresh: startFresh,
    };
  };

  const requestRepairPreview = useCallback(async () => {
    if (!activePlan) {
      throw new Error('No active workout plan to repair.');
    }

    setLocalError(null);
    const result = await repairPreviewMutation.mutateAsync(activePlan.id);
    setPreviewResult(result);
    setStep(5);
    return result;
  }, [activePlan, repairPreviewMutation]);

  useEffect(() => {
    if (!repairMode) return;
    if (!activePlan?.id) return;
    if (currentPreview || repairPreviewMutation.isPending) return;
    if (previewResult && 'status' in previewResult) return;

    requestRepairPreview().catch((error: any) => {
      setLocalError(error.message || 'Failed to build a repair preview.');
    });
  }, [
    activePlan?.id,
    currentPreview,
    previewResult,
    repairMode,
    repairPreviewMutation.isPending,
    requestRepairPreview,
  ]);

  const handleGenerate = async () => {
    setLocalError(null);
    setInitialGenerationMessage(null);

    if (repairMode) {
      try {
        await requestRepairPreview();
      } catch (error: any) {
        setLocalError(error.message || 'Failed to build a repair preview.');
      }
      return;
    }

    if (!reason && activePlan) {
      setLocalError('Choose the main reason for changing your current plan.');
      setStep(1);
      return;
    }

    try {
      if (!activePlan) {
        await triggerPlanGeneration.mutateAsync({
          planType: 'workout',
          options: {
            generation_horizon_days: { workout: 28 },
            program_family_preference: preferredSplitFamily || undefined,
            progression_preference: progressionPreference || undefined,
          },
        });
        setInitialGenerationMessage('A new workout plan was created from your answers and onboarding profile.');
        router.replace('/(tabs)/workout/my-plan');
        return;
      }

      if (existingPreview?.id) {
        await discardPreviewMutation.mutateAsync(existingPreview.id);
      }

      const request = buildRequest();
      trackWorkoutPlanRegenerationPreviewRequested({
        current_plan_id: request.current_plan_id,
        reason: request.reason,
        keep_current_split: request.keep_current_split,
        start_fresh: request.start_fresh,
      });

      const result = await generatePreviewMutation.mutateAsync(request);
      setPreviewResult(result);
      setStep(5);

      if ('status' in result) {
        trackWorkoutPlanRegenerationNoopBlocked({
          current_plan_id: request.current_plan_id,
          reason: request.reason,
          issue_flags: request.issue_flags,
        });
        return;
      }

      trackWorkoutPlanRegenerationPreviewGenerated({
        current_plan_id: request.current_plan_id,
        preview_plan_id: result.previewPlanId,
        overlap_percent: result.diff.exerciseOverlapPercent,
        materially_different: result.diff.isMateriallyDifferent,
      });
    } catch (error: any) {
      setLocalError(error.message || 'Failed to generate a workout preview.');
    }
  };

  const handleAcceptPreview = async () => {
    if (!currentPreview?.previewPlanId) return;

    try {
      trackWorkoutPlanRegenerationPreviewAccepted({
        preview_plan_id: currentPreview.previewPlanId,
        replaces_plan_id: currentPreview.currentPlan.id,
      });
      await applyPreviewMutation.mutateAsync(currentPreview.previewPlanId);
      router.replace('/(tabs)/workout/my-plan');
    } catch (error: any) {
      setLocalError(error.message || 'Failed to apply workout preview.');
    }
  };

  const handleDiscardPreview = async () => {
    const previewPlanId = currentPreview?.previewPlanId || existingPreview?.id;

    try {
      trackWorkoutPlanRegenerationPreviewDiscarded({
        preview_plan_id: previewPlanId || null,
        current_plan_id: activePlan?.id || null,
      });

      if (previewPlanId) {
        await discardPreviewMutation.mutateAsync(previewPlanId);
      }
      router.replace('/(tabs)/workout/my-plan');
    } catch (error: any) {
      setLocalError(error.message || 'Failed to discard workout preview.');
    }
  };

  const nextStep = () => {
    if (!canContinue) {
      setLocalError('Choose the main reason for regenerating before continuing.');
      return;
    }

    setLocalError(null);
    setStep((prev) => Math.min(4, prev + 1) as WizardStep);
  };

  const previousStep = () => {
    setLocalError(null);
    setStep((prev) => Math.max(1, prev - 1) as WizardStep);
  };

  const isBusy = generatePreviewMutation.isPending
    || applyPreviewMutation.isPending
    || discardPreviewMutation.isPending
    || triggerPlanGeneration.isPending;

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: c.surface, borderRadius: r.pill }]}>
          <TabBarIcon name="chevron-back" color={c.text} size={20} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>
          {repairMode ? 'Repair Plan' : 'Regenerate Plan'}
        </Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 32, gap: s.lg }}>
        <View style={{ gap: s.sm }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
            {repairMode
              ? 'This plan has exercises that do not match their workout days. Review a repaired preview before replacing the live plan.'
              : activePlan
              ? 'AI will ask what is not working, build a replacement preview, and keep your current plan live until you approve it.'
              : 'No live workout plan yet. This flow will create a new plan from your answers instead of replacing an existing one.'}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <View
                key={value}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: value <= step ? c.primary : c.surface2,
                }}
              />
            ))}
          </View>
        </View>

        {localError ? (
          <View style={[styles.noticeCard, { backgroundColor: `${c.danger || '#ef4444'}12`, borderColor: `${c.danger || '#ef4444'}55` }]}>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>{localError}</Text>
          </View>
        ) : null}

        {initialGenerationMessage ? (
          <View style={[styles.noticeCard, { backgroundColor: `${c.success || '#10b981'}12`, borderColor: `${c.success || '#10b981'}55` }]}>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>{initialGenerationMessage}</Text>
          </View>
        ) : null}

        {!repairMode && step === 1 ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, borderColor: c.border, padding: s.lg }]}>
            <Text style={[styles.cardTitle, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }]}>
              What&apos;s wrong with the current plan?
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
              Pick the main reason first. That gives the generator a clear direction.
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: s.md }}>
              {REASON_OPTIONS.map((option) => (
                <ChipButton
                  key={option.value}
                  active={reason === option.value}
                  label={option.label}
                  onPress={() => {
                    setReason(option.value);
                    trackWorkoutPlanRegenerationReasonSelected({ reason: option.value });
                  }}
                  palette={{ primary: c.primary, text: c.text, muted: c.textMuted, surface: c.surface2, border: c.border, bg: c.bg }}
                />
              ))}
            </View>

            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: s.lg }}>
              What else feels off?
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: s.sm }}>
              {ISSUE_FLAGS.map((option) => {
                const active = issueFlags.includes(option.value);
                return (
                  <ChipButton
                    key={option.value}
                    active={active}
                    label={option.label}
                    onPress={() =>
                      setIssueFlags((prev) =>
                        active ? prev.filter((flag) => flag !== option.value) : [...prev, option.value],
                      )
                    }
                    palette={{ primary: c.primary, text: c.text, muted: c.textMuted, surface: c.surface2, border: c.border, bg: c.bg }}
                  />
                );
              })}
            </View>

            <TextInput
              value={freeText}
              onChangeText={setFreeText}
              multiline
              placeholder="Tell us what feels off"
              placeholderTextColor={c.textMuted}
              style={[
                styles.textArea,
                {
                  borderColor: c.border,
                  backgroundColor: c.surface2,
                  color: c.text,
                  fontFamily: ty.body.family,
                  marginTop: s.lg,
                  borderRadius: r.md,
                },
              ]}
            />
          </View>
        ) : null}

        {!repairMode && step === 2 ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, borderColor: c.border, padding: s.lg }]}>
            <Text style={[styles.cardTitle, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }]}>
              What should change?
            </Text>

            <Text style={fieldLabelStyle(ty, c, s)}>Days per week</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DAYS_PER_WEEK_OPTIONS.map((value) => (
                <ChipButton
                  key={value}
                  active={daysPerWeek === String(value)}
                  label={`${value} days`}
                  onPress={() => setDaysPerWeek(String(value))}
                  palette={{ primary: c.primary, text: c.text, muted: c.textMuted, surface: c.surface2, border: c.border, bg: c.bg }}
                />
              ))}
            </View>

            <Text style={fieldLabelStyle(ty, c, s)}>Preferred split family</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {families.map((family) => (
                <ChipButton
                  key={family.id}
                  active={preferredSplitFamily === family.external_key}
                  label={family.display_name}
                  onPress={() => setPreferredSplitFamily(family.external_key)}
                  palette={{ primary: c.primary, text: c.text, muted: c.textMuted, surface: c.surface2, border: c.border, bg: c.bg }}
                />
              ))}
            </View>

            <Text style={fieldLabelStyle(ty, c, s)}>Progression preference</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PROGRESSION_OPTIONS.map((value) => (
                <ChipButton
                  key={value}
                  active={progressionPreference === value}
                  label={formatKeyLabel(value)}
                  onPress={() => setProgressionPreference(value)}
                  palette={{ primary: c.primary, text: c.text, muted: c.textMuted, surface: c.surface2, border: c.border, bg: c.bg }}
                />
              ))}
            </View>

            <Text style={fieldLabelStyle(ty, c, s)}>Session duration target</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {SESSION_DURATION_OPTIONS.map((value) => (
                <ChipButton
                  key={value}
                  active={sessionDurationTargetMin === String(value)}
                  label={`${value}m`}
                  onPress={() => setSessionDurationTargetMin(String(value))}
                  palette={{ primary: c.primary, text: c.text, muted: c.textMuted, surface: c.surface2, border: c.border, bg: c.bg }}
                />
              ))}
            </View>

            <Text style={fieldLabelStyle(ty, c, s)}>Goal emphasis</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GOAL_OPTIONS.map((value) => (
                <ChipButton
                  key={value}
                  active={goalEmphasis === value}
                  label={formatKeyLabel(value)}
                  onPress={() => setGoalEmphasis(value)}
                  palette={{ primary: c.primary, text: c.text, muted: c.textMuted, surface: c.surface2, border: c.border, bg: c.bg }}
                />
              ))}
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>Keep current split</Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                  Leave on for smaller changes. Turn it off for a more aggressive rebuild.
                </Text>
              </View>
              <Switch value={keepCurrentSplit} onValueChange={setKeepCurrentSplit} />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>Start fresh</Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                  Loosen overlap constraints and let the generator rebuild more aggressively.
                </Text>
              </View>
              <Switch value={startFresh} onValueChange={setStartFresh} />
            </View>
          </View>
        ) : null}

        {!repairMode && step === 3 ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, borderColor: c.border, padding: s.lg }]}>
            <Text style={[styles.cardTitle, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }]}>
              Constraints and preferences
            </Text>

            <Text style={fieldLabelStyle(ty, c, s)}>Preferred days off</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WEEKDAYS.map((weekday) => {
                const active = preferredDaysOff.includes(weekday.value);
                return (
                  <ChipButton
                    key={weekday.value}
                    active={active}
                    label={weekday.label}
                    onPress={() =>
                      setPreferredDaysOff((prev) =>
                        active ? prev.filter((day) => day !== weekday.value) : [...prev, weekday.value],
                      )
                    }
                    palette={{ primary: c.primary, text: c.text, muted: c.textMuted, surface: c.surface2, border: c.border, bg: c.bg }}
                  />
                );
              })}
            </View>

            <Text style={fieldLabelStyle(ty, c, s)}>Equipment access</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {EQUIPMENT_OPTIONS.map((value) => (
                <ChipButton
                  key={value}
                  active={equipmentAccess === value}
                  label={formatKeyLabel(value)}
                  onPress={() => setEquipmentAccess(value)}
                  palette={{ primary: c.primary, text: c.text, muted: c.textMuted, surface: c.surface2, border: c.border, bg: c.bg }}
                />
              ))}
            </View>

            <TextInput
              value={injuriesText}
              onChangeText={setInjuriesText}
              placeholder="Injury / restriction updates"
              placeholderTextColor={c.textMuted}
              style={[styles.input, { borderColor: c.border, backgroundColor: c.surface2, color: c.text, borderRadius: r.md }]}
            />
            <TextInput
              value={avoidExercisesText}
              onChangeText={setAvoidExercisesText}
              multiline
              placeholder="Exercises or movement patterns to avoid"
              placeholderTextColor={c.textMuted}
              style={[styles.textArea, { borderColor: c.border, backgroundColor: c.surface2, color: c.text, borderRadius: r.md }]}
            />
            <TextInput
              value={keepExercisesText}
              onChangeText={setKeepExercisesText}
              multiline
              placeholder="Favorite exercises or lifts to keep if possible"
              placeholderTextColor={c.textMuted}
              style={[styles.textArea, { borderColor: c.border, backgroundColor: c.surface2, color: c.text, borderRadius: r.md }]}
            />
          </View>
        ) : null}

        {!repairMode && step === 4 ? (
          <View style={{ gap: s.lg }}>
            <SummaryCard title="Current Plan" plan={activePlan} palette={{ text: c.text, textMuted: c.textMuted, surface: c.surface, border: c.border, primary: c.primary }} typography={ty} radius={r} spacing={s} />

            <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, borderColor: c.border, padding: s.lg }]}>
              <Text style={[styles.cardTitle, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }]}>
                Review the requested changes
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                Your current plan stays active until you approve the preview.
              </Text>

              <View style={{ gap: s.sm, marginTop: s.md }}>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Reason: {formatKeyLabel(reason)}
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Target days/week: {daysPerWeek || String(activePlan?.days_per_week || 0)}
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Preferred family: {formatKeyLabel(preferredSplitFamily || activePlan?.programMeta?.programFamilyKey || activePlan?.program_family_key)}
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Progression: {formatKeyLabel(progressionPreference || activePlan?.programMeta?.progressionModel || activePlan?.progression_model)}
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Session target: {sessionDurationTargetMin ? `${sessionDurationTargetMin}m` : 'Keep current'}
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Preferred days off: {preferredDaysOff.length ? preferredDaysOff.map((day) => day.toUpperCase()).join(', ') : 'No preference'}
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Keep current split: {keepCurrentSplit ? 'Yes' : 'No'}
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                  Start fresh: {startFresh ? 'Yes' : 'No'}
                </Text>
              </View>

              {existingPreview ? (
                <View style={[styles.noticeCard, { backgroundColor: `${c.primary}12`, borderColor: `${c.primary}44`, marginTop: s.lg }]}>
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    An older preview already exists for this plan.
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.xs }}>
                    Generating again will replace that preview with a fresh candidate.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {step === 5 ? (
          <View style={{ gap: s.lg }}>
            {isValidationFailure ? (
              <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, borderColor: c.border, padding: s.lg }]}>
                <Text style={[styles.cardTitle, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }]}>
                  We need more direction to build a meaningfully different plan
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
                  {validationFailure?.message || 'Try tightening the constraints and generate again.'}
                </Text>
                <View style={{ marginTop: s.lg, gap: s.sm }}>
                  {prompts.map((prompt) => (
                    <Text key={prompt} style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                      • {prompt}
                    </Text>
                  ))}
                </View>
              </View>
            ) : currentPreview ? (
              <>
                <View style={{ gap: s.sm }}>
                  <SummaryCard title="Current Plan" plan={currentPreview.currentPlan} palette={{ text: c.text, textMuted: c.textMuted, surface: c.surface, border: c.border, primary: c.textMuted }} typography={ty} radius={r} spacing={s} />
                  <SummaryCard title={repairMode ? 'Repair Preview' : 'Preview Replacement'} plan={currentPreview.previewPlan} palette={{ text: c.text, textMuted: c.textMuted, surface: c.surface, border: c.border, primary: c.primary }} typography={ty} radius={r} spacing={s} />
                </View>

                <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, borderColor: c.border, padding: s.lg }]}>
                  <Text style={[styles.cardTitle, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }]}>
                    What changed
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                    Exercise overlap: {currentPreview.diff.exerciseOverlapPercent}% • Weekly layout {currentPreview.diff.weeklyLayoutChanged ? 'changed' : 'kept'}
                  </Text>
                  <View style={{ marginTop: s.md, gap: s.sm }}>
                    {(currentPreview.diff.changeSummary.length
                      ? currentPreview.diff.changeSummary
                      : [repairMode
                        ? 'This repair preview replaces exercises that do not match the workout-day intent.'
                        : 'This preview keeps the same overall frame and mainly changes exercise selection.']).map((item) => (
                      <Text key={item} style={{ color: c.text, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                </View>

                <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, borderColor: c.border, padding: s.lg }]}>
                  <Text style={[styles.cardTitle, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }]}>
                    Day-by-day focus
                  </Text>
                  <View style={{ gap: s.sm, marginTop: s.md }}>
                    {(currentPreview.previewPlan.days || [])
                      .slice()
                      .sort((a: any, b: any) => Number(a.day_number || 0) - Number(b.day_number || 0))
                      .map((day: any) => (
                        <View
                          key={day.id}
                          style={{
                            borderWidth: 1,
                            borderColor: c.border,
                            borderRadius: r.md,
                            padding: s.md,
                            backgroundColor: c.surface2,
                          }}
                        >
                          <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                            {`Day ${day.day_number || ''} • ${day.name || 'Workout Day'}`}
                          </Text>
                          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.xs }}>
                            {`${day.focus || 'Full body'} • ${day.exercises?.length || 0} exercises • ${day.estimated_duration_min || '—'} min`}
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              </>
            ) : (
              <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, borderColor: c.border, padding: s.lg }]}>
                <Text style={[styles.cardTitle, { color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }]}>
                  {repairMode ? 'No repair preview available yet' : 'No preview available yet'}
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                  {repairMode
                    ? 'Generate a repair preview to replace mismatched exercises with movements that match each day.'
                    : 'Generate a preview from step 4 to compare your current plan against a replacement candidate.'}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {activePlanLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: s.lg }}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingHorizontal: s.lg, paddingBottom: insets.bottom + s.md, paddingTop: s.md, backgroundColor: c.bg }]}>
        {step === 5 ? (
          isValidationFailure ? (
            <>
              <Pressable
                onPress={repairMode ? handleGenerate : () => setStep(1)}
                style={[styles.primaryButton, { backgroundColor: c.primary, borderRadius: r.md }]}
              >
                <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                  {repairMode ? 'Try Repair Again' : 'Adjust Answers'}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleDiscardPreview}
                style={[styles.secondaryButton, { borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md }]}
              >
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  Keep Current Plan
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={handleAcceptPreview}
                disabled={!currentPreview || isBusy}
                style={[styles.primaryButton, { backgroundColor: c.primary, borderRadius: r.md, opacity: !currentPreview || isBusy ? 0.6 : 1 }]}
              >
                {applyPreviewMutation.isPending ? (
                  <ActivityIndicator color={c.bg} />
                ) : (
                  <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                    {repairMode ? 'Apply Repaired Plan' : 'Replace Current Plan'}
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={handleDiscardPreview}
                disabled={isBusy}
                style={[styles.secondaryButton, { borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md }]}
              >
                {discardPreviewMutation.isPending ? (
                  <ActivityIndicator color={c.text} />
                ) : (
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Keep Current Plan
                  </Text>
                )}
              </Pressable>
            </>
          )
        ) : (
          repairMode ? (
            <Pressable
              onPress={handleGenerate}
              disabled={isBusy || !activePlan}
              style={[styles.primaryButton, { backgroundColor: c.primary, borderRadius: r.md, opacity: isBusy || !activePlan ? 0.6 : 1 }]}
            >
              {isBusy ? (
                <ActivityIndicator color={c.bg} />
              ) : (
                <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                  {primaryButtonLabel}
                </Text>
              )}
            </Pressable>
          ) : (
          <>
            <View style={{ flexDirection: 'row', gap: s.sm }}>
              <Pressable
                onPress={step === 1 ? () => router.back() : previousStep}
                style={[styles.secondaryButton, { flex: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: r.md }]}
              >
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                  {step === 1 ? 'Cancel' : 'Back'}
                </Text>
              </Pressable>
              <Pressable
                onPress={step === 4 ? handleGenerate : nextStep}
                disabled={!canContinue || isBusy}
                style={[styles.primaryButton, { flex: 1.4, backgroundColor: c.primary, borderRadius: r.md, opacity: !canContinue || isBusy ? 0.6 : 1 }]}
              >
                {isBusy ? (
                  <ActivityIndicator color={c.bg} />
                ) : (
                  <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                    {primaryButtonLabel}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
  },
  cardTitle: {
    letterSpacing: -0.2,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 16,
  },
  textArea: {
    borderWidth: 1,
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  footer: {
    gap: 10,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryButton: {
    minHeight: 52,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  noticeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
});
