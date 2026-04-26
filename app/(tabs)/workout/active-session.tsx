import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatePresence, MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useQueryClient } from '@tanstack/react-query';

import { useTokens } from '../../../lib/theme';
import { GlassCard } from '../../../components/premium/GlassCard';
import { PlateCalculator } from '../../../components/workout/PlateCalculator';
import { OneRepMaxCalculator } from '../../../components/workout/OneRepMaxCalculator';
import { ActiveSessionHeader } from '../../../components/workout/session/ActiveSessionHeader';
import { ExerciseCommandStrip } from '../../../components/workout/session/ExerciseCommandStrip';
import { SetLogList } from '../../../components/workout/session/SetLogList';
import { RestTimerDock } from '../../../components/workout/session/RestTimerDock';
import { FinishWorkoutSheet } from '../../../components/workout/session/FinishWorkoutSheet';
import { ExerciseMediaHero } from '../../../components/workout/media/ExerciseMediaHero';
import { ExerciseMediaPreview } from '../../../components/workout/media/ExerciseMediaPreview';
import { WorkoutProgressionSuggestionCard } from '../../../components/workout/session/WorkoutProgressionSuggestionCard';
import { SmartSubstitutionPicker } from '../../../components/workout/session/SmartSubstitutionPicker';
import { SupersetPairDisplay } from '../../../components/workout/session/SupersetPairDisplay';
import { DropSetPrompt } from '../../../components/workout/session/DropSetPrompt';
import { TempoCoach } from '../../../components/workout/session/TempoCoach';
import { RIRTargetDisplay } from '../../../components/workout/session/RIRTargetDisplay';
import {
  ExerciseTier,
  GoalBucket,
  LiftComfort,
  SessionEnvironment,
  ContinuityMethod,
  MovementPattern,
  ReplacementGroup,
  EquipmentCategory,
  SetupComplexity,
  FatigueCost,
  type Exercise as V1Exercise,
  type SwapAlternative,
  SwapReason,
  ExperienceLevel,
} from '../../../types/v1_engine';
import { SwapConfirmationSheet } from '../../../components/workout/session/SwapConfirmationSheet';
import {
  buildExerciseSetRows,
  buildFinishWorkoutViewModel,
  getNextExerciseIndex,
  type LoggingExercise,
  type LoggingSet,
  type WorkoutSetDraft,
} from '../../../lib/workout/logging-state';
import {
  hasAdvancedTechnique,
  getPrimaryTechnique,
  getRIRRPEConfig,
  detectSuperset,
  initializeDropSet,
  initializeTempo,
  advanceDropPhase,
  startTempoSet,
  advanceTempoRep,
  completeTempoSet,
  type SupersetState,
  type DropSetState,
  type TempoState,
} from '../../../lib/workout/technique-execution';
import {
  clearWorkoutLoggingDraftsForSession,
  useWorkoutLoggingDrafts,
} from '../../../hooks/useWorkoutLoggingDrafts';
import { useSessionRestTimer } from '../../../hooks/useSessionRestTimer';
import {
  useActiveSession,
  useCheckPR,
  useDeleteSet,
  useExerciseHistory,
  useExercises,
  useFinishSession,
  useLogSet,
  useSwapExercise,
  useUpdateSessionExerciseNote,
  useUpdateSessionNotes,
  workoutKeys,
} from '../../../hooks/useWorkout';
import { useMarkDayCompleted } from '../../../hooks/usePlan';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { getActiveSession } from '../../../services/workoutService';
import {
  useGenerateSuggestionsForWorkout,
  useApplySuggestion,
  useDismissSuggestion,
  type ProgressionRecommendation,
} from '../../../hooks/useProgressiveOverload';
import {
  trackActiveSessionMediaCollapsed,
  trackActiveSessionMediaExpanded,
  trackExerciseMediaPreviewExpanded,
  trackWorkoutFinishConfirmed,
  trackWorkoutFinishEarlyConfirmed,
  trackWorkoutFinishSheetOpened,
  trackWorkoutNextExerciseTapped,
  trackWorkoutNoteCreated,
  trackWorkoutNoteDeleted,
  trackWorkoutNoteUpdated,
  trackWorkoutRestTimerSkipped,
  trackWorkoutRestTimerStarted,
  trackWorkoutSetDeleted,
  trackWorkoutSetEdited,
  trackWorkoutSetLogged,
  trackWorkoutSetRepeatLastUsed,
  trackWorkoutSetRepeatPlusFiveUsed,
} from '../../../lib/analytics';

function normalizeInstructionSteps(raw: unknown, legacyInstructions?: string | null): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (legacyInstructions) {
    return legacyInstructions
      .split(/\n+/)
      .map((line) => line.trim().replace(/^[-*]\s*/, ''))
      .filter(Boolean);
  }
  return [];
}

function formatElapsedTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function toLoggingSet(set: {
  id?: string;
  set_number: number;
  reps: number;
  weight_lb: number | null;
  rpe: number | null;
  is_warmup: boolean;
}): LoggingSet {
  return {
    id: set.id,
    set_number: set.set_number,
    reps: set.reps,
    weight_lb: set.weight_lb,
    rpe: set.rpe,
    is_warmup: set.is_warmup,
  };
}

function toV1Exercise(ex: any): V1Exercise {
  return {
    external_id: ex.id,
    name: ex.name,
    movement_pattern: (ex.pattern as any) || MovementPattern.Squat,
    architectural_group: (ex.category as any) || ReplacementGroup.Primary_Bilateral_Squat,
    equipment_category: (ex.equipment_required as any) || EquipmentCategory.Misc,
    tier: (ex.difficulty as any) || ExerciseTier.T1,
    is_unilateral: false,
    setup_complexity: SetupComplexity.Low,
    fatigue_cost: FatigueCost.Low,
    progression_types: [],
    contraindications: [],
    estimated_duration_seconds: 60,
  };
}

function toWorkoutSetDraft(set: LoggingSet): WorkoutSetDraft {
  return {
    weight: set.weight_lb === null || set.weight_lb === undefined ? '' : String(set.weight_lb),
    reps: String(set.reps),
    rpe: set.rpe === null || set.rpe === undefined ? '' : String(set.rpe),
    isWarmup: set.is_warmup,
  };
}

export default function ActiveSessionScreen() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const enableKeepAwake = async () => {
      try {
        await activateKeepAwakeAsync();
      } catch (error) {
        console.warn('KeepAwake failed', error);
      }
    };

    enableKeepAwake();

    return () => {
      deactivateKeepAwake().catch(() => {});
    };
  }, []);

  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const bottomOverlayOffset = insets.bottom;
  const { user, loading: authLoading } = useAuth();

  const { data: session, isLoading } = useActiveSession();
  const logSetMutation = useLogSet();
  const finishSessionMutation = useFinishSession();
  const checkPRMutation = useCheckPR();
  const deleteSetMutation = useDeleteSet();
  const swapExerciseMutation = useSwapExercise();
  const markDayCompletedMutation = useMarkDayCompleted();
  const updateExerciseNoteMutation = useUpdateSessionExerciseNote();
  const updateSessionNoteMutation = useUpdateSessionNotes();

  // Progressive Overload hooks
  const generateSuggestionsMutation = useGenerateSuggestionsForWorkout();
  const applySuggestionMutation = useApplySuggestion();
  const dismissSuggestionMutation = useDismissSuggestion();
  const [progressionRecommendations, setProgressionRecommendations] = useState<ProgressionRecommendation[]>([]);

  // Advanced Technique state
  const [supersetState, setSupersetState] = useState<SupersetState | null>(null);
  const [dropSetState, setDropSetState] = useState<DropSetState | null>(null);
  const [tempoState, setTempoState] = useState<TempoState | null>(null);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [plateCalcTarget, setPlateCalcTarget] = useState<number | null>(null);
  const [showOneRepMax, setShowOneRepMax] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [showFinishSheet, setShowFinishSheet] = useState(false);
  const [showExercisePreview, setShowExercisePreview] = useState(true);
  const [swapSearch, setSwapSearch] = useState('');
  const [pendingSwap, setPendingSwap] = useState<{ alt: SwapAlternative; reason: SwapReason } | null>(null);
  const [showSwapSuccess, setShowSwapSuccess] = useState(false);
  const [exerciseNoteDraft, setExerciseNoteDraft] = useState('');
  const [sessionNoteDraft, setSessionNoteDraft] = useState('');
  const [exerciseNoteSaving, setExerciseNoteSaving] = useState(false);
  const [sessionNoteSaving, setSessionNoteSaving] = useState(false);
  const lastSessionIdRef = useRef<string | null>(null);
  const hasHandledExpiryRef = useRef(false);

  const {
    isHydrated,
    draftsByExerciseId,
    extraSetCountByExerciseId,
    activeSetByExerciseId,
    activeExerciseIndex,
    restTimerState: persistedRestTimerState,
    mergeExerciseDrafts,
    replaceExerciseDraft,
    clearExerciseDraft,
    clearExerciseState,
    addExtraSet,
    setActiveSet,
    setActiveExerciseIndex,
    setRestTimerState,
    clearAll,
  } = useWorkoutLoggingDrafts(session?.id);

  const { restTimerState, startRestTimer, skipRestTimer, addSeconds } = useSessionRestTimer({
    initialState: persistedRestTimerState,
    onChange: setRestTimerState,
  });

  const exercises = useMemo(() => session?.exercises ?? [], [session?.exercises]);

  useEffect(() => {
    if (!session?.id) {
      return;
    }

    lastSessionIdRef.current = session.id;
    hasHandledExpiryRef.current = false;
  }, [session?.id]);

  // Generate progression suggestions when session starts
  useEffect(() => {
    if (!session?.id || exercises.length === 0 || !user) {
      return;
    }

    // Generate suggestions once per session load
    const exerciseList = exercises.map(ex => ({
      id: ex.exercise.id,
      name: ex.exercise.name,
    }));

    generateSuggestionsMutation.mutateAsync(exerciseList)
      .then(recommendations => {
        setProgressionRecommendations(recommendations);
      })
      .catch(error => {
        console.error('[ActiveSession] Failed to generate progression suggestions:', error);
        // Silently fail - suggestions are optional
      });
  }, [session?.id, exercises.length, user?.id]);

  // Detect and initialize technique state when active exercise changes
  useEffect(() => {
    if (!exercises || exercises.length === 0 || activeExerciseIndex >= exercises.length) {
      return;
    }

    const currentExercise = exercises[activeExerciseIndex];
    if (!currentExercise) return;

    // Check for superset (requires current + next exercise)
    const nextExercise = exercises[activeExerciseIndex + 1];
    const superset = detectSuperset(currentExercise, nextExercise);
    setSupersetState(superset);

    // Reset drop set state (will initialize after working set is logged)
    setDropSetState(null);

    // Check for tempo
    if (currentExercise.tempo) {
      // Get target reps from reps_target (e.g., "8-12" → use 10)
      const repsTarget = currentExercise.reps_target || '8-12';
      const targetReps = parseInt(repsTarget.split('-')[1] || repsTarget.split('-')[0] || '10');
      const tempo = initializeTempo(currentExercise, targetReps);
      setTempoState(tempo);
    } else {
      setTempoState(null);
    }
  }, [activeExerciseIndex, exercises]);

  const handleExpiredSessionReset = useCallback(async () => {
    if (hasHandledExpiryRef.current) {
      return;
    }

    hasHandledExpiryRef.current = true;

    if (lastSessionIdRef.current) {
      await clearWorkoutLoggingDraftsForSession(lastSessionIdRef.current);
    }

    Alert.alert(
      'Session expired',
      'This workout stayed open past midnight and has been reset. Yesterday is now incomplete.',
      [
        {
          text: 'Open Plan',
          onPress: () => router.replace('/(tabs)/workout/my-plan'),
        },
      ],
    );
  }, [router]);

  const revalidateSessionForDayBoundary = useCallback(async () => {
    if (!user?.id || authLoading) {
      return;
    }

    const latestSession = await queryClient.fetchQuery({
      queryKey: workoutKeys.activeSession(),
      queryFn: () => getActiveSession(user.id),
    });

    if (!latestSession && lastSessionIdRef.current) {
      await handleExpiredSessionReset();
    }
  }, [authLoading, handleExpiredSessionReset, queryClient, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void revalidateSessionForDayBoundary();
    }, [revalidateSessionForDayBoundary]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void revalidateSessionForDayBoundary();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [revalidateSessionForDayBoundary]);

  useEffect(() => {
    if (!session?.started_at) {
      return;
    }

    const updateTimer = () => {
      if (!isPaused) {
        const start = new Date(session.started_at).getTime();
        const now = Date.now();
        setElapsedTime(Math.max(0, Math.floor((now - start) / 1000)));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isPaused, session?.started_at]);

  useEffect(() => {
    if (!session?.id) {
      return;
    }

    setSessionNoteDraft(session.notes ?? '');
  }, [session?.id, session?.notes]);

  useEffect(() => {
    if (!session?.id) {
      return;
    }

    const storageKey = `workout-session-media:${session.id}`;
    let cancelled = false;

    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!cancelled) {
          setShowExercisePreview(value !== '0');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShowExercisePreview(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    if (exercises.length === 0) {
      return;
    }

    if (activeExerciseIndex < 0 || activeExerciseIndex > exercises.length - 1) {
      setActiveExerciseIndex(0);
    }
  }, [activeExerciseIndex, exercises.length, setActiveExerciseIndex]);

  const currentExercise = exercises[activeExerciseIndex];

  useEffect(() => {
    setExerciseNoteDraft(currentExercise?.notes ?? '');
  }, [currentExercise?.id, currentExercise?.notes]);

  const { data: exerciseHistory } = useExerciseHistory(currentExercise?.exercise?.id ?? '', 5);
  const previousSession = useMemo(
    () => exerciseHistory?.find((item) => item.sessionId !== session?.id) ?? null,
    [exerciseHistory, session?.id],
  );

  const { data: allExercises } = useExercises({ search: swapSearch });
  const swapOptions = useMemo(
    () => (allExercises ?? []).filter((item) => item.id !== currentExercise?.exercise?.id),
    [allExercises, currentExercise?.exercise?.id],
  );

  const currentExerciseModel = useMemo<LoggingExercise | null>(() => {
    if (!currentExercise) {
      return null;
    }

    return {
      id: currentExercise.id,
      exerciseName: currentExercise.exercise.name,
      sets_target: currentExercise.sets_target,
      reps_min: currentExercise.reps_min,
      reps_max: currentExercise.reps_max,
      rest_seconds: currentExercise.rest_seconds,
      sets: currentExercise.sets.map(toLoggingSet),
      isModifiedCarryover: currentExercise.is_modified_carryover,
      isReset: currentExercise.is_reset,
    };
  }, [currentExercise]);

  const currentExerciseRows = useMemo(
    () => {
      if (!currentExerciseModel) return null;

      const recommendation = progressionRecommendations.find(
        (r) => r.analysis.exerciseId === currentExercise?.exercise?.id,
      );

      return buildExerciseSetRows({
        exercise: currentExerciseModel,
        draftsBySet: draftsByExerciseId[currentExerciseModel.id],
        extraSetCount: extraSetCountByExerciseId[currentExerciseModel.id],
        activeSetNumber: activeSetByExerciseId[currentExerciseModel.id],
        previousSession: previousSession
          ? {
              sessionId: previousSession.sessionId,
              sets: (previousSession.sets ?? []).map(toLoggingSet),
            }
          : null,
        recommendation,
      });
    },
    [
      activeSetByExerciseId,
      currentExerciseModel,
      draftsByExerciseId,
      extraSetCountByExerciseId,
      previousSession,
      progressionRecommendations,
    ],
  );

  const finishViewModel = useMemo(
    () =>
      buildFinishWorkoutViewModel({
        sessionNote: sessionNoteDraft,
        elapsedSeconds: elapsedTime,
        exercises: exercises.map((exercise) => ({
          id: exercise.id,
          exerciseName: exercise.exercise.name,
          sets_target:
            (exercise.sets_target ?? 3) + (extraSetCountByExerciseId[exercise.id] ?? 0),
          sets: exercise.sets.map(toLoggingSet),
        })),
      }),
    [elapsedTime, exercises, extraSetCountByExerciseId, sessionNoteDraft],
  );

  const currentExerciseSteps = normalizeInstructionSteps(
    currentExercise?.exercise?.instruction_steps,
    currentExercise?.exercise?.instructions,
  );

  const toggleExercisePreview = async () => {
    if (!session?.id) {
      return;
    }

    const nextValue = !showExercisePreview;
    setShowExercisePreview(nextValue);
    if (nextValue) {
      trackActiveSessionMediaExpanded({
        session_id: session.id,
        exercise_id: currentExercise?.exercise?.id,
      });
    } else {
      trackActiveSessionMediaCollapsed({
        session_id: session.id,
        exercise_id: currentExercise?.exercise?.id,
      });
    }
    try {
      await AsyncStorage.setItem(`workout-session-media:${session.id}`, nextValue ? '1' : '0');
    } catch {
      // Ignore local persistence failures here; preview state still updates in memory.
    }
  };

  const isFinalExercise = activeExerciseIndex >= exercises.length - 1;
  const showNextExerciseInRestDock =
    Boolean(currentExerciseRows?.exerciseComplete) && !isFinalExercise;

  if (isLoading || authLoading || !isHydrated) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ color: c.textMuted, marginTop: s.sm }}>Loading session...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: c.text, fontFamily: ty.body.family }}>
          This workout session is no longer active
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)/workout/my-plan')}
          style={{ marginTop: 20, padding: 10, backgroundColor: c.surface, borderRadius: 8 }}
        >
          <Text style={{ color: c.primary }}>Open Plan</Text>
        </Pressable>
      </View>
    );
  }

  if (session && exercises.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: c.text, fontFamily: ty.body.family, textAlign: 'center', paddingHorizontal: s.xl }}>
          This workout session has no exercises to resume
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)/workout/my-plan')}
          style={{ marginTop: 20, padding: 10, backgroundColor: c.surface, borderRadius: 8 }}
        >
          <Text style={{ color: c.primary }}>Open Plan</Text>
        </Pressable>
      </View>
    );
  }

  if (!currentExercise || !currentExerciseModel || !currentExerciseRows) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ color: c.textMuted, marginTop: s.sm }}>Restoring session...</Text>
      </View>
    );
  }

  const currentDraftForSet = (setNumber: number) =>
    currentExerciseRows.rows.find((row) => row.setNumber === setNumber)?.draft;

  const handleExerciseDraftChange = (
    exerciseId: string,
    setNumber: number,
    field: 'weight' | 'reps' | 'rpe' | 'isWarmup',
    value: string | boolean,
  ) => {
    const currentDraft = exerciseId === currentExercise.id ? currentDraftForSet(setNumber) : undefined;
    mergeExerciseDrafts(exerciseId, setNumber, {
      ...currentDraft,
      [field]: value,
    });
  };

  const handleDraftChange = (
    setNumber: number,
    field: 'weight' | 'reps' | 'rpe' | 'isWarmup',
    value: string | boolean,
  ) => {
    handleExerciseDraftChange(currentExercise.id, setNumber, field, value);
  };

  const currentRIRRPEConfig = getRIRRPEConfig(currentExercise);

  const handleSwapExercise = async (newExerciseId: string, reason: SwapReason, alternative?: SwapAlternative, source: 'coach' | 'manual' = 'coach') => {
    try {
      const originalExId = currentExercise.exercise.id;
      const continuity = alternative?.continuity_recommendation || ContinuityMethod.Reset;

      console.log(`[SWAP_LOG] User swapped exercise:`, {
        original: originalExId,
        new: newExerciseId,
        reason,
        continuityMethod: continuity,
        timestamp: new Date().toISOString(),
        source: source
      });

      // 2. Perform the swap mutation
      await swapExerciseMutation.mutateAsync({
        sessionExerciseId: currentExercise.id,
        newExerciseId,
        reason,
        continuity,
      });

      // 3. Optional: Prepopulate/Adjust Progress (V1.1 UI Logic)
      if (continuity === ContinuityMethod.Modified) {
        // In a real app, we'd adjust the drafts here or in the service.
        // For now, we clear the state so it starts fresh or uses the service's default.
        clearExerciseState(currentExercise.id);
      }

      // 4. Feedback & Cleanup
      setPendingSwap(null);
      setShowSwap(false);
      setShowSwapSuccess(true);
      setTimeout(() => setShowSwapSuccess(false), 2500);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error('Swap failed:', err);
      Alert.alert('Error', 'Failed to swap exercise');
    }
  };

  const handleSelectSet = (setNumber: number) => {
    setActiveSet(currentExercise.id, setNumber);
  };

  const handleOpenPlateCalculator = (setNumber: number) => {
    const draft = currentDraftForSet(setNumber);
    const nextValue = draft?.weight ? Number(draft.weight) : 135;
    setPlateCalcTarget(Number.isFinite(nextValue) ? nextValue : 135);
  };

  // Progressive Overload handlers
  const handleApplyProgression = async (recommendation: ProgressionRecommendation) => {
    try {
      // Find the session exercise for this recommendation
      const sessionExercise = exercises.find(ex => ex.exercise.id === recommendation.analysis.exerciseId);
      if (!sessionExercise) {
        Alert.alert('Error', 'Could not find exercise in current session');
        return;
      }

      // Update drafts with suggested values
      if (recommendation.suggestedWeight) {
        // Apply to first set draft
        handleExerciseDraftChange(sessionExercise.id, 1, 'weight', recommendation.suggestedWeight.toString());
      }

      if (recommendation.suggestedReps) {
        handleExerciseDraftChange(sessionExercise.id, 1, 'reps', recommendation.suggestedReps.toString());
      }

      // Mark suggestion as applied (this is tracked in the database)
      // The actual suggestion ID would come from the database version
      // For now, just remove it from the local state
      setProgressionRecommendations(prev =>
        prev.filter(r => r.analysis.exerciseId !== recommendation.analysis.exerciseId)
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Progression Applied',
        `${recommendation.type === 'increase_weight' ? 'Weight increased' : 'Rep target increased'} for ${recommendation.analysis.exerciseName}. Good luck!`
      );
    } catch (error) {
      console.error('[ActiveSession] Failed to apply progression:', error);
      Alert.alert('Error', 'Failed to apply progression suggestion');
    }
  };

  const handleDismissProgression = async (recommendation: ProgressionRecommendation) => {
    // Remove from local state
    setProgressionRecommendations(prev =>
      prev.filter(r => r.analysis.exerciseId !== recommendation.analysis.exerciseId)
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const moveToNextExercise = () => {
    if (!currentExerciseRows.exerciseComplete) {
      return;
    }

    const nextIndex = getNextExerciseIndex(
      exercises.map((exercise) => ({
        sets_target:
          (exercise.sets_target ?? 3) + (extraSetCountByExerciseId[exercise.id] ?? 0),
        sets: exercise.sets.map(toLoggingSet),
      })),
      activeExerciseIndex,
    );

    if (nextIndex !== activeExerciseIndex) {
      setActiveExerciseIndex(nextIndex);
      trackWorkoutNextExerciseTapped({
        from_exercise_id: currentExercise.id,
        to_exercise_id: exercises[nextIndex]?.id,
      });
      skipRestTimer();
    }
  };

  const logDraftSet = async (setNumber: number, overrideDraft?: WorkoutSetDraft, source?: 'manual' | 'repeat_last' | 'repeat_plus_five') => {
    const row = currentExerciseRows.rows.find((item) => item.setNumber === setNumber);
    const draft = overrideDraft ?? row?.draft;

    if (!row || !draft) {
      return;
    }

    const reps = Number(draft.reps);
    if (!Number.isFinite(reps) || reps <= 0) {
      Alert.alert('Reps required', 'Enter a rep count greater than 0 before logging the set.');
      return;
    }

    const trimmedWeight = draft.weight.trim();
    const weightValue = trimmedWeight === '' ? undefined : Number(trimmedWeight);
    if (trimmedWeight !== '' && !Number.isFinite(weightValue)) {
      Alert.alert('Invalid weight', 'Enter a valid weight or leave it blank.');
      return;
    }

    const trimmedRpe = draft.rpe.trim();
    const rpeValue = trimmedRpe === '' ? undefined : Number(trimmedRpe);
    if (trimmedRpe !== '' && !Number.isFinite(rpeValue)) {
      Alert.alert('Invalid RPE', 'Enter a valid RPE or leave it blank.');
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      const logResult = await logSetMutation.mutateAsync({
        sessionExerciseId: currentExercise.id,
        setNumber,
        reps,
        weightLb: weightValue,
        rpe: rpeValue,
        isWarmup: draft.isWarmup,
      });

      clearExerciseDraft(currentExercise.id, setNumber);
      startRestTimer(currentExercise.id, currentExerciseRows.restSeconds);
      trackWorkoutRestTimerStarted({
        session_exercise_id: currentExercise.id,
        rest_seconds: currentExerciseRows.restSeconds,
      });

      const nextRows = buildExerciseSetRows({
        exercise: {
          ...currentExerciseModel,
          sets: [
            ...currentExerciseModel.sets,
            {
              id: logResult.id,
              set_number: setNumber,
              reps,
              weight_lb: weightValue ?? null,
              rpe: rpeValue ?? null,
              is_warmup: draft.isWarmup,
            },
          ],
        },
        draftsBySet: draftsByExerciseId[currentExercise.id],
        extraSetCount: extraSetCountByExerciseId[currentExercise.id],
        activeSetNumber: setNumber + 1,
        previousSession: previousSession
          ? {
              sessionId: previousSession.sessionId,
              sets: (previousSession.sets ?? []).map(toLoggingSet),
            }
          : null,
      });

      if (nextRows.activeSetNumber) {
        setActiveSet(currentExercise.id, nextRows.activeSetNumber);
      }

      trackWorkoutSetLogged({
        session_exercise_id: currentExercise.id,
        set_number: setNumber,
        reps,
        weight_lb: weightValue ?? null,
        rpe: rpeValue ?? null,
        is_warmup: draft.isWarmup,
        source: source ?? 'manual',
      });

      if (source === 'repeat_last') {
        trackWorkoutSetRepeatLastUsed({
          session_exercise_id: currentExercise.id,
          set_number: setNumber,
        });
      } else if (source === 'repeat_plus_five') {
        trackWorkoutSetRepeatPlusFiveUsed({
          session_exercise_id: currentExercise.id,
          set_number: setNumber,
        });
      }

      if (!draft.isWarmup && weightValue !== undefined && weightValue > 0) {
        const prResult = await checkPRMutation.mutateAsync({
          exerciseId: currentExercise.exercise.id,
          weightLb: weightValue,
          reps,
          setId: logResult.id,
        });

        if (prResult.isPR) {
          Alert.alert('New Personal Record', `You just hit a new PR for ${currentExercise.exercise.name}.`);
        }
      }
    } catch (error) {
      console.error('Failed to log set', error);
      Alert.alert('Error', 'Failed to save set');
    }
  };

  const handleEditCompletedSet = async (setNumber: number) => {
    const row = currentExerciseRows.rows.find((item) => item.setNumber === setNumber);
    if (!row?.completedSet?.id) {
      return;
    }

    try {
      await deleteSetMutation.mutateAsync(row.completedSet.id);
      replaceExerciseDraft(currentExercise.id, setNumber, toWorkoutSetDraft(row.completedSet));
      setActiveSet(currentExercise.id, setNumber);
      trackWorkoutSetEdited({
        session_exercise_id: currentExercise.id,
        set_id: row.completedSet.id,
        set_number: setNumber,
      });
    } catch {
      Alert.alert('Error', 'Failed to reopen the set for editing.');
    }
  };

  const handleDeleteCompletedSet = async (setNumber: number) => {
    const row = currentExerciseRows.rows.find((item) => item.setNumber === setNumber);
    if (!row?.completedSet?.id) {
      return;
    }

    try {
      await deleteSetMutation.mutateAsync(row.completedSet.id);
      setActiveSet(currentExercise.id, setNumber);
      trackWorkoutSetDeleted({
        session_exercise_id: currentExercise.id,
        set_id: row.completedSet.id,
        set_number: setNumber,
      });
    } catch {
      Alert.alert('Error', 'Failed to delete set');
    }
  };

  const saveExerciseNote = async () => {
    if (!currentExercise) {
      return;
    }

    const trimmedDraft = exerciseNoteDraft.trim();
    const previousNote = currentExercise.notes?.trim() ?? '';

    if (trimmedDraft === previousNote) {
      return;
    }

    setExerciseNoteSaving(true);
    try {
      await updateExerciseNoteMutation.mutateAsync({
        sessionExerciseId: currentExercise.id,
        notes: trimmedDraft || null,
      });

      if (!previousNote && trimmedDraft) {
        trackWorkoutNoteCreated({ type: 'exercise', session_exercise_id: currentExercise.id });
      } else if (previousNote && trimmedDraft) {
        trackWorkoutNoteUpdated({ type: 'exercise', session_exercise_id: currentExercise.id });
      } else if (previousNote && !trimmedDraft) {
        trackWorkoutNoteDeleted({ type: 'exercise', session_exercise_id: currentExercise.id });
      }
    } catch {
      Alert.alert('Error', 'Failed to save exercise note.');
    } finally {
      setExerciseNoteSaving(false);
    }
  };

  const saveSessionNote = async () => {
    if (!session) {
      return;
    }

    const trimmedDraft = sessionNoteDraft.trim();
    const previousNote = session.notes?.trim() ?? '';

    if (trimmedDraft === previousNote) {
      return;
    }

    setSessionNoteSaving(true);
    try {
      await updateSessionNoteMutation.mutateAsync({
        sessionId: session.id,
        notes: trimmedDraft || null,
      });

      if (!previousNote && trimmedDraft) {
        trackWorkoutNoteCreated({ type: 'session', session_id: session.id });
      } else if (previousNote && trimmedDraft) {
        trackWorkoutNoteUpdated({ type: 'session', session_id: session.id });
      } else if (previousNote && !trimmedDraft) {
        trackWorkoutNoteDeleted({ type: 'session', session_id: session.id });
      }
    } catch {
      Alert.alert('Error', 'Failed to save session note.');
    } finally {
      setSessionNoteSaving(false);
    }
  };

  const handleOpenFinishSheet = () => {
    setShowFinishSheet(true);
    trackWorkoutFinishSheetOpened({
      session_id: session.id,
      is_early_finish: finishViewModel.isEarlyFinish,
      incomplete_count: finishViewModel.incompleteItems.length,
    });
  };

  const handleConfirmFinish = async () => {
    if (isPaused) {
      return;
    }

    try {
      await finishSessionMutation.mutateAsync({
        sessionId: session.id,
        notes: sessionNoteDraft.trim() || undefined,
      });

      if (session.plan_day_id) {
        try {
          await markDayCompletedMutation.mutateAsync(session.plan_day_id);
        } catch (error) {
          console.warn('Failed to mark plan day complete', error);
        }
      }

      if (finishViewModel.isEarlyFinish) {
        trackWorkoutFinishEarlyConfirmed({
          session_id: session.id,
          incomplete_count: finishViewModel.incompleteItems.length,
        });
      } else {
        trackWorkoutFinishConfirmed({
          session_id: session.id,
          total_sets: finishViewModel.totalSets,
        });
      }

      await clearAll();

      router.replace({
        pathname: '/(tabs)/workout/summary',
        params: { sessionId: session.id },
      });
    } catch (error) {
      console.error('Failed to finish workout', error);
      if (error instanceof Error && error.message.includes('expired when the day rolled over')) {
        await handleExpiredSessionReset();
        return;
      }
      Alert.alert('Error', 'Failed to finish workout');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, overflow: 'visible' }]}>
      <LinearGradient colors={[c.bg, '#0a101f']} style={StyleSheet.absoluteFill} />
      <View style={{ height: insets.top }} />

      <ActiveSessionHeader
        elapsedTimeLabel={formatElapsedTime(elapsedTime)}
        sessionName={session.name}
        isPaused={isPaused}
        onOpenOneRepMax={() => setShowOneRepMax(true)}
        onTogglePaused={() => setIsPaused((value) => !value)}
        onOpenFinish={handleOpenFinishSheet}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, overflow: 'visible' }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: s.lg,
            paddingBottom: bottomOverlayOffset + (restTimerState ? 176 : 72),
          }}
        >
          <ExerciseCommandStrip
            currentExerciseIndex={activeExerciseIndex}
            totalExercises={exercises.length}
            exerciseName={currentExercise.exercise.name}
            activeSetNumber={currentExerciseRows.activeSetNumber}
            totalPlannedSets={currentExerciseRows.totalPlannedSets}
            targetRepLabel={currentExerciseRows.targetRepLabel}
            lastWorkingSetLabel={currentExerciseRows.lastWorkingSetLabel}
            restSeconds={currentExerciseRows.restSeconds}
            exerciseComplete={currentExerciseRows.exerciseComplete}
            canGoPrevious={activeExerciseIndex > 0}
            canGoNext={activeExerciseIndex < exercises.length - 1}
            onPrevExercise={() => setActiveExerciseIndex(Math.max(0, activeExerciseIndex - 1))}
            onNextExercise={() => setActiveExerciseIndex(Math.min(exercises.length - 1, activeExerciseIndex + 1))}
            onOpenQueue={() => setShowQueue(true)}
            onOpenInfo={() => setShowInfo(true)}
            onOpenSwap={() => setShowSwap(true)}
          />

          {/* Progressive Overload Suggestions */}
          {progressionRecommendations.length > 0 && (
            <WorkoutProgressionSuggestionCard
              recommendations={progressionRecommendations}
              onApply={handleApplyProgression}
              onDismiss={handleDismissProgression}
              maxDisplay={3}
            />
          )}

          {/* Advanced Techniques */}
          {supersetState && (
            <SupersetPairDisplay
              exerciseA={{
                id: supersetState.exerciseA.id,
                name: supersetState.exerciseA.exercise.name,
                setsTarget: supersetState.totalRounds,
                repsTarget: supersetState.exerciseA.reps_target || '8-12',
                setsCompleted: supersetState.exerciseA.sets?.length || 0,
              }}
              exerciseB={{
                id: supersetState.exerciseB.id,
                name: supersetState.exerciseB.exercise.name,
                setsTarget: supersetState.totalRounds,
                repsTarget: supersetState.exerciseB.reps_target || '8-12',
                setsCompleted: supersetState.exerciseB.sets?.length || 0,
              }}
              config={supersetState.config}
              currentRound={supersetState.currentRound}
              totalRounds={supersetState.totalRounds}
              activeExercise={supersetState.activeExercise}
              onStartExercise={(exercise) => {
                setSupersetState(prev => prev ? { ...prev, activeExercise: exercise } : null);
              }}
              onCompleteExercise={(exercise) => {
                // Advance to next exercise or next round
                setSupersetState(prev => {
                  if (!prev) return null;

                  if (exercise === 'A') {
                    return { ...prev, activeExercise: 'B' };
                  } else {
                    // Both exercises complete, advance round
                    const nextRound = prev.currentRound + 1;
                    if (nextRound > prev.totalRounds) {
                      return null; // Superset complete
                    }
                    return { ...prev, currentRound: nextRound, activeExercise: null };
                  }
                });
              }}
              onShowInfo={() => {
                Alert.alert(
                  'Superset',
                  'Two exercises performed back-to-back with minimal rest. Increases workout density and efficiency.',
                  [{ text: 'Got it' }]
                );
              }}
            />
          )}

          {dropSetState && (
            <DropSetPrompt
              exerciseName={currentExercise.exercise.name}
              workingSetWeight={dropSetState.workingSetWeight}
              workingSetReps={dropSetState.workingSetReps}
              config={dropSetState.config}
              currentDropPhase={dropSetState.currentDropPhase}
              onCompleteDropPhase={(weight, reps) => {
                // Log the drop set and advance to next phase
                setDropSetState(prev => prev ? advanceDropPhase(prev) : null);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
              onSkipRemainingDrops={() => {
                setDropSetState(null);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onShowInfo={() => {
                Alert.alert(
                  'Drop Set',
                  'After reaching failure, immediately reduce weight and continue without rest to maximize muscle fatigue and metabolic stress.',
                  [{ text: 'Got it' }]
                );
              }}
            />
          )}

          {tempoState && (
            <TempoCoach
              exerciseName={currentExercise.exercise.name}
              config={tempoState.config}
              isActive={tempoState.isActive}
              currentRep={tempoState.currentRep}
              targetReps={tempoState.targetReps}
              onSetComplete={() => {
                setTempoState(prev => prev ? completeTempoSet(prev) : null);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
              onShowInfo={() => {
                Alert.alert(
                  'Tempo Training',
                  'Control rep speed to increase time under tension (TUT), maximizing muscle fiber recruitment and hypertrophy.\n\nFormat: Eccentric-Pause-Concentric-Rest (in seconds)\nExample: "3-0-1-0" = 3s down, 0s pause, 1s up, 0s rest',
                  [{ text: 'Got it' }]
                );
              }}
            />
          )}

          {currentRIRRPEConfig && currentExerciseRows.activeSetNumber !== null && (
            <RIRTargetDisplay
              exerciseName={currentExercise.exercise.name}
              setNumber={currentExerciseRows.activeSetNumber}
              config={currentRIRRPEConfig}
              previousValue={undefined} // TODO: fetch from previous session
              historicalTrend={undefined} // TODO: fetch last 5 sessions
              onLogValue={(value) => {
                // Update current draft with RIR/RPE value
                handleDraftChange(currentExerciseRows.activeSetNumber!, 'rpe', value.toString());
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onShowInfo={() => {
                if (currentRIRRPEConfig.mode === 'RIR') {
                  Alert.alert(
                    'RIR (Reps In Reserve)',
                    'How many more reps you could have done before failure.\n\nRIR 0 = Absolute failure\nRIR 1 = Could have done 1 more rep\nRIR 2-3 = Optimal hypertrophy zone',
                    [{ text: 'Got it' }]
                  );
                } else {
                  Alert.alert(
                    'RPE (Rate of Perceived Exertion)',
                    'How hard the set feels on a 1-10 scale.\n\nRPE 10 = Absolute max effort\nRPE 8 = Could do 2 more reps\nRPE 6-7 = Moderately hard',
                    [{ text: 'Got it' }]
                  );
                }
              }}
            />
          )}

          <GlassCard intensity="medium" style={{ marginTop: s.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showExercisePreview ? s.sm : 0 }}>
              <View style={{ flex: 1, paddingRight: s.sm }}>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                  CURRENT EXERCISE PREVIEW
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm, marginTop: 4 }}>
                  {currentExercise.exercise.name}
                </Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                  {currentExercise.exercise.primary_muscle || 'Unknown muscle'} • tap preview for full details
                </Text>
              </View>
              <Pressable onPress={toggleExercisePreview} style={{ padding: 6 }}>
                <Ionicons
                  name={showExercisePreview ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={c.textMuted}
                />
              </Pressable>
            </View>
            {showExercisePreview ? (
              <Pressable
                onPress={() => {
                  trackExerciseMediaPreviewExpanded({
                    source: 'active_session',
                    exercise_id: currentExercise.exercise.id,
                    session_id: session.id,
                  });
                  setShowInfo(true);
                }}
              >
                <ExerciseMediaPreview
                  exerciseId={currentExercise.exercise.id}
                  videoUrl={currentExercise.exercise.video_url}
                  gifUrl={currentExercise.exercise.gif_url}
                  imageUrl={currentExercise.exercise.image_url}
                  posterUrl={currentExercise.exercise.poster_url}
                  hasMedia={currentExercise.exercise.has_media}
                  autoplay
                  fit="contain"
                  height={148}
                  label={currentExercise.exercise.category || currentExercise.exercise.primary_muscle || 'Exercise demo'}
                  analyticsSource="active_session"
                  analyticsExerciseId={currentExercise.exercise.id}
                />
              </Pressable>
            ) : null}
          </GlassCard>

          <SetLogList
            rows={currentExerciseRows.rows}
            exerciseComplete={currentExerciseRows.exerciseComplete}
            hasNextExercise={!isFinalExercise}
            isFinalExercise={isFinalExercise}
            onSelectSet={handleSelectSet}
            onDraftChange={handleDraftChange}
            onLogSet={(setNumber) => logDraftSet(setNumber, undefined, 'manual')}
            onRepeatLast={(setNumber) => {
              const row = currentExerciseRows.rows.find((item) => item.setNumber === setNumber);
              if (row?.repeatLastDraft) {
                logDraftSet(setNumber, row.repeatLastDraft, 'repeat_last');
              }
            }}
            onRepeatPlusFive={(setNumber) => {
              const row = currentExerciseRows.rows.find((item) => item.setNumber === setNumber);
              if (row?.repeatPlusFiveDraft) {
                logDraftSet(setNumber, row.repeatPlusFiveDraft, 'repeat_plus_five');
              }
            }}
            onEditCompleted={handleEditCompletedSet}
            onDeleteCompleted={handleDeleteCompletedSet}
            onAddSet={() => {
              addExtraSet(currentExercise.id);
              setActiveSet(currentExercise.id, currentExerciseRows.totalPlannedSets + 1);
            }}
            onNextExercise={moveToNextExercise}
            onFinishWorkout={handleOpenFinishSheet}
            onOpenPlateCalculator={handleOpenPlateCalculator}
          />

          <GlassCard intensity="medium" style={{ marginTop: s.md }}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, letterSpacing: 1 }}>
              EXERCISE NOTE
            </Text>
            <TextInput
              value={exerciseNoteDraft}
              onChangeText={setExerciseNoteDraft}
              onBlur={saveExerciseNote}
              placeholder={`Add cues or reminders for ${currentExercise.exercise.name}`}
              placeholderTextColor={c.textSubtle}
              multiline
              style={{
                marginTop: s.xs,
                minHeight: 52,
                borderRadius: r.md,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface,
                color: c.text,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
                paddingHorizontal: s.sm,
                paddingVertical: s.xs,
                textAlignVertical: 'top',
              }}
            />
            <Text style={{ marginTop: 4, color: c.textSubtle, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
              {exerciseNoteSaving ? 'Saving note...' : 'Saved on blur'}
            </Text>
          </GlassCard>

          <GlassCard intensity="medium" style={{ marginTop: s.md }}>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, letterSpacing: 1 }}>
              SESSION NOTE
            </Text>
            <TextInput
              value={sessionNoteDraft}
              onChangeText={setSessionNoteDraft}
              onBlur={saveSessionNote}
              placeholder="How did this session feel overall?"
              placeholderTextColor={c.textSubtle}
              multiline
              style={{
                marginTop: s.xs,
                minHeight: 72,
                borderRadius: r.md,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.surface,
                color: c.text,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.sm,
                paddingHorizontal: s.sm,
                paddingVertical: s.xs,
                textAlignVertical: 'top',
              }}
            />
            <Text style={{ marginTop: 4, color: c.textSubtle, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
              {sessionNoteSaving ? 'Saving note...' : 'Saved on blur and at finish'}
            </Text>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <RestTimerDock
        visible={Boolean(restTimerState && restTimerState.remainingSeconds > 0)}
        remainingSeconds={restTimerState?.remainingSeconds ?? 0}
        exerciseName={currentExercise.exercise.name}
        bottomOffset={bottomOverlayOffset}
        showNextExercise={showNextExerciseInRestDock}
        onAddThirtySeconds={() => addSeconds(30)}
        onSkip={() => {
          skipRestTimer();
          trackWorkoutRestTimerSkipped({
            session_exercise_id: currentExercise.id,
          });
        }}
        onNextExercise={moveToNextExercise}
      />

      <FinishWorkoutSheet
        visible={showFinishSheet}
        viewModel={finishViewModel}
        bottomInset={insets.bottom}
        topInset={insets.top}
        isPaused={isPaused}
        isSubmitting={finishSessionMutation.isPending}
        onClose={() => setShowFinishSheet(false)}
        onConfirm={handleConfirmFinish}
      />

      <AnimatePresence>
        {plateCalcTarget !== null ? (
          <MotiView
            from={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            style={[StyleSheet.absoluteFill, styles.overlayBackdrop]}
          >
            <View style={{ width: '100%', maxWidth: 420 }}>
              <PlateCalculator
                initialWeight={plateCalcTarget}
                onClose={() => setPlateCalcTarget(null)}
              />
            </View>
          </MotiView>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showOneRepMax ? (
          <MotiView
            from={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            style={[StyleSheet.absoluteFill, styles.overlayBackdrop]}
          >
            <View style={{ width: '100%', maxWidth: 420 }}>
              <OneRepMaxCalculator onClose={() => setShowOneRepMax(false)} />
            </View>
          </MotiView>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showQueue ? (
          <MotiView
            from={{ opacity: 0, translateY: 80 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 80 }}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: c.bg, zIndex: 100, paddingTop: insets.top + s.lg },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: s.lg, marginBottom: s.lg }}>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
                Workout Queue
              </Text>
              <Pressable onPress={() => setShowQueue(false)}>
                <Ionicons name="close" size={28} color={c.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: insets.bottom + s.xl, gap: s.sm }}>
              {exercises.map((exercise, index) => {
                const queueRows = buildExerciseSetRows({
                  exercise: {
                    id: exercise.id,
                    exerciseName: exercise.exercise.name,
                    sets_target: exercise.sets_target,
                    reps_min: exercise.reps_min,
                    reps_max: exercise.reps_max,
                    rest_seconds: exercise.rest_seconds,
                    sets: exercise.sets.map(toLoggingSet),
                  },
                  draftsBySet: draftsByExerciseId[exercise.id],
                  extraSetCount: extraSetCountByExerciseId[exercise.id],
                  activeSetNumber: activeSetByExerciseId[exercise.id],
                });

                return (
                  <Pressable
                    key={exercise.id}
                    onPress={() => {
                      setActiveExerciseIndex(index);
                      setShowQueue(false);
                    }}
                    style={{
                      borderRadius: r.lg,
                      padding: s.md,
                      backgroundColor: index === activeExerciseIndex ? c.surface2 : c.surface,
                      borderWidth: 1,
                      borderColor: index === activeExerciseIndex ? `${c.primary}40` : c.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                          {exercise.exercise.name}
                        </Text>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                          {exercise.sets.length}/{queueRows.totalPlannedSets} sets logged
                        </Text>
                      </View>
                      {queueRows.exerciseComplete ? (
                        <Ionicons name="checkmark-circle" size={20} color={c.primary} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </MotiView>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showInfo ? (
          <MotiView
            from={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            style={[StyleSheet.absoluteFill, styles.overlayBackdrop]}
          >
            <View
              style={{
                width: '100%',
                maxWidth: 420,
                maxHeight: '82%',
                borderRadius: r.xl,
                backgroundColor: c.surface,
                padding: s.lg,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: s.md }}>
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, flex: 1 }}>
                  {currentExercise.exercise.name}
                </Text>
                <Pressable onPress={() => setShowInfo(false)}>
                  <Ionicons name="close" size={24} color={c.text} />
                </Pressable>
              </View>

              <ScrollView>
                <Text style={{ color: c.textMuted, marginBottom: s.xs, textTransform: 'uppercase', fontSize: 12 }}>
                  Primary Muscle
                </Text>
                <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, marginBottom: s.md }}>
                  {currentExercise.exercise.primary_muscle || 'Unknown'}
                </Text>

                <View style={{ marginBottom: s.md }}>
                  <ExerciseMediaHero
                    exerciseId={currentExercise.exercise.id}
                    videoUrl={currentExercise.exercise.video_url}
                    gifUrl={currentExercise.exercise.gif_url}
                    imageUrl={currentExercise.exercise.image_url}
                    posterUrl={currentExercise.exercise.poster_url}
                    hasMedia={currentExercise.exercise.has_media}
                    height={160}
                    fit="contain"
                  />
                </View>

                <Text style={{ color: c.textMuted, marginBottom: s.xs, textTransform: 'uppercase', fontSize: 12 }}>
                  Instructions
                </Text>
                {currentExerciseSteps.length > 0 ? (
                  <View style={{ gap: s.sm }}>
                    {currentExerciseSteps.slice(0, 5).map((step, index) => (
                      <View key={`${index}-${step.slice(0, 24)}`} style={{ flexDirection: 'row', gap: s.sm }}>
                        <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>{index + 1}.</Text>
                        <Text style={{ color: c.text, lineHeight: 20, flex: 1 }}>{step}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: c.text, lineHeight: 22 }}>No instructions available.</Text>
                )}
              </ScrollView>
            </View>
          </MotiView>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showSwap ? (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: c.bg, zIndex: 100, paddingTop: insets.top },
            ]}
          >
            <SmartSubstitutionPicker
              originalExercise={toV1Exercise(currentExercise.exercise)}
              userProfile={{
                goal: GoalBucket.Hypertrophy,
                environment: SessionEnvironment.Commercial,
                comfort: LiftComfort.BarbellAdv,
                injuries: [],
                experience_level: ExperienceLevel.Intermediate,
              }}
              onSelect={(alt, reason) => {
                setPendingSwap({ alt, reason });
              }}
              onManualSelect={(v1ex, reason) => {
                handleSwapExercise(v1ex.external_id, reason, undefined, 'manual');
              }}
              onClose={() => setShowSwap(false)}
            />

            {/* V1 Mandatory Confirmation Sheet */}
            {pendingSwap && (
              <SwapConfirmationSheet
                originalExercise={toV1Exercise(currentExercise.exercise)}
                alternative={pendingSwap.alt}
                onConfirm={() => handleSwapExercise(pendingSwap.alt.exercise.external_id, pendingSwap.reason, pendingSwap.alt, 'coach')}
                onCancel={() => setPendingSwap(null)}
              />
            )}
          </MotiView>
        ) : null}
      </AnimatePresence>

      {/* Modern Success Toast */}
      <AnimatePresence>
        {showSwapSuccess ? (
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 20 }}
            style={{
              position: 'absolute',
              bottom: insets.bottom + 100,
              alignSelf: 'center',
              backgroundColor: 'rgba(16, 185, 129, 0.9)', // Success Green
              paddingHorizontal: s.lg,
              paddingVertical: s.md,
              borderRadius: r.pill || r.lg || 100,
              flexDirection: 'row',
              alignItems: 'center',
              gap: s.sm,
              zIndex: 200,
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={{ color: 'white', fontFamily: ty.body.familySemibold }}>
              Swap applied — Progress adjusted
            </Text>
          </MotiView>
        ) : null}
      </AnimatePresence>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlayBackdrop: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(4, 8, 18, 0.82)',
    zIndex: 110,
    padding: 20,
  },
});
