import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { GlassCard } from '../../../components/premium/GlassCard';
import {
  useActiveSession,
  useLogSet,
  useFinishSession,
  useCheckPR,
  useDeleteSet,
  useSwapExercise,
  useExerciseHistory,
  useExercises,
  useUpdateSessionExerciseNote,
  useUpdateSessionNotes,
} from '../../../hooks/useWorkout';
import { useMarkDayCompleted } from '../../../hooks/usePlan';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { PlateCalculator } from '../../../components/workout/PlateCalculator';
import { OneRepMaxCalculator } from '../../../components/workout/OneRepMaxCalculator';
import { Ionicons } from '@expo/vector-icons';
import { trackWorkoutNoteCreated, trackWorkoutNoteDeleted, trackWorkoutNoteUpdated } from '../../../lib/analytics';
import { Video, ResizeMode } from 'expo-av';


const SCREEN_WIDTH = Dimensions.get('window').width;

// Fallback target when session rows do not carry an explicit set target.
const DEFAULT_SETS_TARGET = 3;

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

export default function ActiveSessionScreen() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      const enableKeepAwake = async () => {
        try {
          await activateKeepAwakeAsync();
        } catch (e) {
          console.warn('KeepAwake failed', e);
        }
      };
      enableKeepAwake();
      return () => {
        deactivateKeepAwake().catch(() => { });
      };
    }
  }, []);

  const { c, s, ty, r, glass, animation } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Real data hooks
  const { loading: authLoading } = useAuth();
  const { data: session, isLoading } = useActiveSession();
  const logSetMutation = useLogSet();
  const finishSessionMutation = useFinishSession();
  const checkPRMutation = useCheckPR();
  const deleteSetMutation = useDeleteSet();
  const swapExerciseMutation = useSwapExercise();
  const updateExerciseNoteMutation = useUpdateSessionExerciseNote();
  const updateSessionNoteMutation = useUpdateSessionNotes();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [plateCalcTarget, setPlateCalcTarget] = useState<number | null>(null);
  const [showOneRepMax, setShowOneRepMax] = useState(false);

  // New State for Modals
  const [showQueue, setShowQueue] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [swapSearch, setSwapSearch] = useState('');

  // State for current exercise inputs
  const [inputValues, setInputValues] = useState<Record<number, { weight: string; reps: string; rpe: string; isWarmup: boolean }>>({});
  // Local state for set targets (to support "Add Set" visually)
  const [setTargets, setSetTargets] = useState<Record<string, number>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [exerciseNoteDraft, setExerciseNoteDraft] = useState('');
  const [sessionNoteDraft, setSessionNoteDraft] = useState('');
  const [exerciseNoteSaving, setExerciseNoteSaving] = useState(false);
  const [sessionNoteSaving, setSessionNoteSaving] = useState(false);

  // Reset inputs when exercise changes
  useEffect(() => {
    // Only reset if we don't have saved state for this index? 
    // Actually, we want to keep inputValues if we navigate back and forth?
    // The current logic clears it. Let's keep it for now but load from storage if available.
    // setInputValues({});
  }, [currentExerciseIndex]);

  // Persistence Key
  const STORAGE_KEY = `workout_session_${session?.id}`;

  // Load state on mount/session change
  useEffect(() => {
    if (!session?.id) return;

    const loadState = async () => {
      try {
        console.log('Loading state for session:', session.id);
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        console.log('Loaded saved state:', saved);
        if (saved) {
          const { inputValues: savedInputs, lastUpdated } = JSON.parse(saved);
          // Only use saved state if it's recent (e.g. within 24 hours)
          if (Date.now() - lastUpdated < 24 * 60 * 60 * 1000) {
            setInputValues(savedInputs);
          }
        }
      } catch (e) {
        console.error('Failed to load session state', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadState();
  }, [session?.id]);

  // Save state on change
  useEffect(() => {
    if (!session?.id || !isLoaded) return;

    const saveState = async () => {
      try {
        console.log('Saving session state for', session?.id, inputValues);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
          inputValues,
          lastUpdated: Date.now()
        }));
      } catch (e) {
        console.error('Failed to save session state', e);
      }
    };

    const timeout = setTimeout(saveState, 100); // 100ms debounce
    return () => clearTimeout(timeout);
  }, [session?.id, inputValues, isLoaded]);


  const handleInputChange = (setNumber: number, field: 'weight' | 'reps' | 'rpe' | 'isWarmup', value: string | boolean) => {
    setInputValues(prev => ({
      ...prev,
      [setNumber]: {
        ...prev[setNumber],
        [field]: value
      }
    }));
  };

  const getInputValues = (setNumber: number, completedSet: any) => {
    // If set is completed, show the saved value
    if (completedSet) {
      return {
        weight: completedSet.weight_lb?.toString() || '',
        reps: completedSet.reps?.toString() || '',
        rpe: completedSet.rpe?.toString() || '',
        isWarmup: completedSet.is_warmup || false
      };
    }
    // Otherwise show local input state (or empty/default)
    return {
      weight: inputValues[setNumber]?.weight || '',
      reps: inputValues[setNumber]?.reps || '',
      rpe: inputValues[setNumber]?.rpe || '',
      isWarmup: inputValues[setNumber]?.isWarmup || false
    };
  };



  const exercises = session?.exercises || [];
  const currentExercise = exercises[currentExerciseIndex];
  const currentExerciseSteps = normalizeInstructionSteps(
    (currentExercise as any)?.exercise?.instruction_steps,
    (currentExercise as any)?.exercise?.instructions,
  );

  useEffect(() => {
    setExerciseNoteDraft((currentExercise as any)?.notes || '');
  }, [currentExercise?.id, (currentExercise as any)?.notes]);

  useEffect(() => {
    setSessionNoteDraft(session?.notes || '');
  }, [session?.id, session?.notes]);

  // Fetch history for current exercise to show "Previous"
  const { data: exerciseHistory } = useExerciseHistory(currentExercise?.exercise?.id || '', 5);
  const previousSession = exerciseHistory?.find(s => s.sessionId !== session?.id);

  // Fetch exercises for Swap functionality (filter by same target muscle if possible, or just all)
  const { data: allExercises } = useExercises({ search: swapSearch });

  // Filter swap exercises to exclude current
  const swapOptions = allExercises?.filter(e => e.id !== currentExercise?.exercise?.id) || [];

  const handleSwapExercise = async (newExerciseId: string) => {
    try {
      await swapExerciseMutation.mutateAsync({
        sessionExerciseId: currentExercise.id,
        newExerciseId
      });
      setShowSwap(false);
      // Haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to swap exercise');
    }
  };

  // Timer logic - Calculate from start time
  useEffect(() => {
    if (!session?.started_at) return;

    const updateTimer = () => {
      if (!isPaused) {
        const start = new Date(session.started_at).getTime();
        const now = new Date().getTime();
        setElapsedTime(Math.floor((now - start) / 1000));
      }
    };

    updateTimer(); // Initial update
    const interval = setInterval(() => {
      updateTimer();
      if (restTimer !== null && restTimer > 0) {
        setRestTimer(prev => (prev && prev > 0 ? prev - 1 : 0));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.started_at, isPaused, restTimer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCompleteSet = async (sessionExerciseId: string, setNumber: number, currentReps: number, currentWeight?: number, rpe?: number, isWarmup: boolean = false) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      // Optimistically trigger rest timer
      setRestTimer(90);

      const logResult = await logSetMutation.mutateAsync({
        sessionExerciseId,
        setNumber,
        reps: currentReps,
        weightLb: currentWeight,
        rpe,
        isWarmup
      });

      // Check for PR
      if (currentWeight) {
        const prResult = await checkPRMutation.mutateAsync({
          exerciseId: currentExercise.exercise.id,
          weightLb: currentWeight,
          reps: currentReps,
          setId: logResult.id
        });

        if (prResult.isPR) {
          Alert.alert('🎉 New Personal Record!', `You just hit a new PR for ${currentExercise.exercise.name}!`);
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }
    } catch (error) {
      console.error('Failed to log set:', error);
      Alert.alert('Error', 'Failed to save set');
    }
  };

  const handleDeleteSet = async (setId?: string, setNumber?: number) => {
    Alert.alert(
      'Delete Set',
      'Are you sure you want to delete this set?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // If it's a logged set (has ID)
            if (setId) {
              try {
                await deleteSetMutation.mutateAsync(setId);
              } catch (e) {
                Alert.alert('Error', 'Failed to delete set');
              }
            }

            // Also reduce local target count if it was an extra set
            setSetTargets(prev => {
              const currentTgt = prev[currentExercise.id] || (currentExercise as any)?.sets_target || DEFAULT_SETS_TARGET;
              if (currentTgt > 0) {
                return { ...prev, [currentExercise.id]: currentTgt - 1 };
              }
              return prev;
            });
          }
        }
      ]
    );
  };

  const handleAddSet = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSetTargets(prev => {
      const currentCount = prev[currentExercise.id] || Math.max((currentExercise as any)?.sets_target || DEFAULT_SETS_TARGET, currentExercise.sets.length);
      return { ...prev, [currentExercise.id]: currentCount + 1 };
    });
  };

  const markDayCompletedMutation = useMarkDayCompleted();

  const handleFinishWorkout = () => {

    if (isPaused) {
      if (Platform.OS === 'web') {
        alert('Session Paused: Please resume the workout timer before finishing.');
      } else {
        Alert.alert('Session Paused', 'Please resume the workout timer before finishing.');
      }
      return;
    }

    // Check completion
    let incompleteSets = 0;
    session?.exercises.forEach(ex => {
      // Determine target count: Local state override > DB target > Default 3
      const target = setTargets[ex.id] || (ex as any).sets_target || DEFAULT_SETS_TARGET;

      // Count completed sets (assuming all logged sets count towards progress)
      const completedCount = ex.sets ? ex.sets.length : 0;

      if (completedCount < target) {
        incompleteSets += (target - completedCount);
      }
    });

    const proceedToFinish = async () => {
      try {
        if (session?.id) {
          // 1. Finish session
          await finishSessionMutation.mutateAsync({
            sessionId: session.id,
            notes: sessionNoteDraft.trim() || undefined,
          });

          // 2. Mark Plan Day Complete if linked
          if (session.plan_day_id) {
            try {
              // We just fire and forget this mostly, but good to wait
              await markDayCompletedMutation.mutateAsync(session.plan_day_id);
            } catch (e) {
              console.warn('Failed to mark plan day complete', e);
              // Don't block flow for this
            }
          }

          // 3. Cleanup local storage
          await AsyncStorage.removeItem(`workout_session_${session.id}`);

          // 4. Navigate to Summary
          router.replace({
            pathname: '/(tabs)/workout/summary',
            params: { sessionId: session.id }
          });
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to finish workout');
        console.error(error);
      }
    };

    if (incompleteSets > 0) {
      Alert.alert(
        'Finish Early?',
        `You have incomplete sets remaining. Are you sure you want to finish?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Finish Anyway',
            style: 'destructive',
            onPress: proceedToFinish
          }
        ]
      );
    } else {
      Alert.alert(
        'Finish Workout',
        'Great job! Ready to wrap up?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Finish',
            style: 'default',
            onPress: proceedToFinish
          }
        ]
      );
    }
  };

  const saveExerciseNote = async () => {
    if (!currentExercise?.id) return;
    const prev = String((currentExercise as any)?.notes || '').trim();
    const next = exerciseNoteDraft.trim();
    if (prev === next) return;

    try {
      setExerciseNoteSaving(true);
      await updateExerciseNoteMutation.mutateAsync({
        sessionExerciseId: currentExercise.id,
        notes: next.length > 0 ? next : null,
      });

      if (next.length === 0) {
        trackWorkoutNoteDeleted({ type: 'exercise', session_exercise_id: currentExercise.id });
      } else if (prev.length === 0) {
        trackWorkoutNoteCreated({ type: 'exercise', session_exercise_id: currentExercise.id });
      } else {
        trackWorkoutNoteUpdated({ type: 'exercise', session_exercise_id: currentExercise.id });
      }
    } catch (error) {
      console.warn('Failed to save exercise note', error);
      Alert.alert('Note not saved', 'Unable to save exercise note right now.');
    } finally {
      setExerciseNoteSaving(false);
    }
  };

  const saveSessionNote = async () => {
    if (!session?.id) return;
    const prev = String(session.notes || '').trim();
    const next = sessionNoteDraft.trim();
    if (prev === next) return;

    try {
      setSessionNoteSaving(true);
      await updateSessionNoteMutation.mutateAsync({
        sessionId: session.id,
        notes: next.length > 0 ? next : null,
      });

      if (next.length === 0) {
        trackWorkoutNoteDeleted({ type: 'session', session_id: session.id });
      } else if (prev.length === 0) {
        trackWorkoutNoteCreated({ type: 'session', session_id: session.id });
      } else {
        trackWorkoutNoteUpdated({ type: 'session', session_id: session.id });
      }
    } catch (error) {
      console.warn('Failed to save session note', error);
      Alert.alert('Note not saved', 'Unable to save session note right now.');
    } finally {
      setSessionNoteSaving(false);
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  const handlePrevExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  if (isLoading || authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ color: c.textMuted, marginTop: s.sm }}>Loading session...</Text>
      </View>
    );
  }

  if (!session || !currentExercise) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: c.text, fontFamily: ty.body.family }}>No active session found</Text>
        <Pressable
          onPress={() => router.back()}
          style={{ marginTop: 20, padding: 10, backgroundColor: c.surface, borderRadius: 8 }}
        >
          <Text style={{ color: c.primary }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <LinearGradient
        colors={[c.bg, '#0a101f']}
        style={StyleSheet.absoluteFill}
      />

      {/* Safe Area Spacer */}
      <View style={{ height: insets.top }} />

      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <View>
          <Text style={[styles.timerText, { color: c.primary, fontFamily: ty.mono.family }]}>
            {formatTime(elapsedTime)}
          </Text>
          <Text style={[styles.sessionName, { color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }]}>
            {session.name}
          </Text>
        </View>

        <View style={styles.headerControls}>
          <Pressable
            onPress={() => setShowOneRepMax(true)}
            style={[styles.iconButton, { borderColor: c.primary }]}
          >
            <TabBarIcon name="barbell" color={c.primary} size={18} />
          </Pressable>
          <Pressable
            onPress={() => setIsPaused(!isPaused)}
            style={[styles.iconButton, { borderColor: c.primary }]}
          >
            <TabBarIcon name={isPaused ? "play" : "pause"} color={c.primary} size={18} />
          </Pressable>
          <Pressable
            onPress={handleFinishWorkout}
            style={[styles.finishButton, { backgroundColor: c.surface2, cursor: 'pointer' } as any]}
            hitSlop={20}
          >
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              Finish
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, { padding: s.lg }]}>

          {/* Exercise Navigation */}
          <View style={[styles.exerciseNav, { marginBottom: s.lg }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={handlePrevExercise}
                disabled={currentExerciseIndex === 0}
                style={{ opacity: currentExerciseIndex === 0 ? 0.3 : 1, padding: 10 }}
              >
                <TabBarIcon name="chevron-back" color={c.text} size={24} />
              </Pressable>
            </View>

            <View style={{ alignItems: 'center', flex: 1 }}>
              <Pressable onPress={() => setShowQueue(true)} style={{ alignItems: 'center' }}>
                <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, letterSpacing: 1 }}>
                  EXERCISE {currentExerciseIndex + 1}/{session.exercises.length} ▼
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg, textAlign: 'center' }}>
                    {currentExercise.exercise.name}
                  </Text>
                  <Pressable onPress={() => setShowInfo(true)} hitSlop={10}>
                    <Ionicons name="information-circle-outline" size={20} color={c.textMuted} />
                  </Pressable>
                </View>
              </Pressable>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={() => setShowSwap(true)} style={{ padding: 10 }}>
                <Ionicons name="swap-horizontal" size={20} color={c.textMuted} />
              </Pressable>
              <Pressable
                onPress={handleNextExercise}
                disabled={currentExerciseIndex === session.exercises.length - 1}
                style={{ opacity: currentExerciseIndex === session.exercises.length - 1 ? 0.3 : 1, padding: 10 }}
              >
                <TabBarIcon name="chevron-forward" color={c.text} size={24} />
              </Pressable>
            </View>
          </View>

          <GlassCard intensity="medium" style={{ marginBottom: s.md }}>
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

          {/* Current Set Card */}
          <GlassCard glowEffect intensity="strong" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Table Header */}
            <View style={[styles.row, styles.tableHeader, { backgroundColor: `${c.primary}10`, borderBottomWidth: 1, borderBottomColor: `${c.primary}20` }]}>
              <Text style={[styles.colSet, { color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 10 }]}>SET</Text>
              <Text style={[styles.colPrev, { color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 10 }]}>PREVIOUS</Text>
              <View style={[styles.colInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }]}>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 10 }}>LBS</Text>
              </View>
              <Text style={[styles.colInput, { color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 10 }]}>REPS</Text>
              <Text style={[styles.colRpe, { color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 10 }]}>RPE</Text>
              <View style={styles.colCheck} />
            </View>

            {/* Sets */}
            <View style={{ padding: s.md }}>
              {Array.from({ length: Math.max(setTargets[currentExercise.id] || (currentExercise as any).sets_target || DEFAULT_SETS_TARGET, currentExercise.sets.length) }).map((_, index) => {
                const setNumber = index + 1;
                const completedSet = currentExercise.sets.find(s => s.set_number === setNumber);
                const isCompleted = !!completedSet;
                const isWarmup = completedSet?.is_warmup || false;

                const values = getInputValues(setNumber, completedSet);

                return (
                  <View
                    key={setNumber}
                    style={[
                      styles.row,
                      {
                        marginBottom: s.sm,
                        opacity: isCompleted ? 0.5 : 1,
                      }
                    ]}
                  >
                    <Pressable
                      style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
                      onLongPress={() => handleDeleteSet(completedSet?.id, setNumber)}
                      delayLongPress={500}
                    />
                    <View style={styles.colSet}>
                      <Pressable
                        onPress={() => !isCompleted && handleInputChange(setNumber, 'isWarmup', !values.isWarmup)}
                        style={[
                          styles.setBadge,
                          {
                            backgroundColor: (isWarmup || values.isWarmup) ? c.warning + '20' : c.surface2,
                            borderColor: (isWarmup || values.isWarmup) ? c.warning : 'transparent',
                            borderWidth: (isWarmup || values.isWarmup) ? 1 : 0,
                          }
                        ]}
                      >
                        <Text style={{ color: (isWarmup || values.isWarmup) ? c.warning : c.text, fontFamily: ty.mono.family, fontSize: 10 }}>
                          {setNumber}
                        </Text>
                      </Pressable>
                    </View>

                    <Text style={[styles.colPrev, { color: c.textMuted, fontFamily: ty.body.family, fontSize: 11 }]}>
                      {(() => {
                        const prevSet = previousSession?.sets?.find((s: any) => s.set_number === setNumber);
                        if (prevSet) {
                          return `${prevSet.weight_lb}x${prevSet.reps}`;
                        }
                        return '-';
                      })()}
                    </Text>

                    <View style={styles.colInput}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <TextInput
                          value={values.weight}
                          onChangeText={(text) => handleInputChange(setNumber, 'weight', text)}
                          placeholder="-"
                          placeholderTextColor={c.textMuted}
                          style={[
                            styles.input,
                            {
                              color: c.text,
                              backgroundColor: c.surface,
                              borderColor: c.border,
                              fontFamily: ty.heading.familySemibold,
                              flex: 1
                            }
                          ]}
                          keyboardType="numeric"
                          editable={!isCompleted}
                        />
                        {!isCompleted && (
                          <Pressable
                            onPress={() => setPlateCalcTarget(parseFloat(values.weight) || 135)}
                            style={{ padding: 4 }}
                          >
                            <TabBarIcon name="calculator" size={14} color={c.primary} />
                          </Pressable>
                        )}
                      </View>
                    </View>

                    <View style={styles.colInput}>
                      <TextInput
                        value={values.reps}
                        onChangeText={(text) => handleInputChange(setNumber, 'reps', text)}
                        placeholder="10"
                        placeholderTextColor={c.textMuted}
                        style={[
                          styles.input,
                          {
                            color: c.text,
                            backgroundColor: c.surface,
                            borderColor: c.border,
                            fontFamily: ty.heading.familySemibold,
                          }
                        ]}
                        keyboardType="numeric"
                        editable={!isCompleted}
                      />
                    </View>

                    <View style={styles.colRpe}>
                      <TextInput
                        value={values.rpe}
                        onChangeText={(text) => handleInputChange(setNumber, 'rpe', text)}
                        placeholder="-"
                        placeholderTextColor={c.textMuted}
                        style={[
                          styles.input,
                          {
                            color: c.text,
                            backgroundColor: c.surface,
                            borderColor: c.border,
                            fontSize: 12,
                            fontFamily: ty.body.family,
                          }
                        ]}
                        keyboardType="numeric"
                        editable={!isCompleted}
                      />
                    </View>

                    <Pressable
                      onPress={() => {
                        if (isCompleted) return;
                        const weight = parseFloat(values.weight) || 0;
                        const reps = parseFloat(values.reps) || 0;
                        const rpe = parseFloat(values.rpe) || undefined;
                        const isWarmupVal = values.isWarmup;
                        handleCompleteSet(currentExercise.id, setNumber, reps, weight, rpe, isWarmupVal);
                      }}
                      style={[
                        styles.colCheck,
                        styles.checkButton,
                        {
                          backgroundColor: isCompleted ? c.primary : 'transparent',
                          borderColor: c.primary,
                        },
                        isCompleted && {
                          shadowColor: c.primary,
                          shadowOpacity: 0.5,
                          shadowRadius: 10,
                        }
                      ]}
                    >
                      <TabBarIcon name="checkmark" color={isCompleted ? c.bg : c.primary} size={16} />
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {/* Add Set Button */}
            <Pressable
              onPress={handleAddSet}
              style={[styles.addSetButton, { borderTopWidth: 1, borderTopColor: c.border }]}
            >
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                + Add Set
              </Text>
            </Pressable>
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

      {/* Plate Calculator Modal */}
      <AnimatePresence>
        {plateCalcTarget !== null && (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, padding: 20 }]}
          >
            <View style={{ width: '100%', maxWidth: 400 }}>
              <PlateCalculator
                initialWeight={plateCalcTarget}
                onClose={() => setPlateCalcTarget(null)}
              />
            </View>
          </MotiView>
        )}
      </AnimatePresence>

      {/* 1RM Calculator Modal */}
      <AnimatePresence>
        {showOneRepMax && (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, padding: 20 }]}
          >
            <View style={{ width: '100%', maxWidth: 400 }}>
              <OneRepMaxCalculator
                onClose={() => setShowOneRepMax(false)}
              />
            </View>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Exercise Queue Modal */}
      <AnimatePresence>
        {showQueue && (
          <MotiView
            from={{ opacity: 0, translateY: 100 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 100 }}
            style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, zIndex: 100, paddingTop: insets.top + s.lg }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: s.lg, marginBottom: s.lg }}>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>Workout Queue</Text>
              <Pressable onPress={() => setShowQueue(false)}>
                <Ionicons name="close" size={28} color={c.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 100 }}>
              {exercises.map((ex, idx) => (
                <Pressable
                  key={ex.id}
                  onPress={() => {
                    setCurrentExerciseIndex(idx);
                    setShowQueue(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: c.surface2,
                    backgroundColor: idx === currentExerciseIndex ? c.surface2 : 'transparent',
                    borderRadius: 8,
                    paddingHorizontal: 8
                  }}
                >
                  <Text style={{ color: c.textMuted, width: 30, textAlign: 'center' }}>{idx + 1}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: idx === currentExerciseIndex ? c.primary : c.text, fontFamily: ty.body.familySemibold }}>
                      {ex.exercise.name}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>
                      {ex.sets.length} sets planned
                    </Text>
                  </View>
                  {idx < currentExerciseIndex && (
                    <Ionicons name="checkmark-circle" size={20} color={c.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Exercise Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 110, padding: 20 }]}
          >
            <View style={{ width: '100%', maxWidth: 400, backgroundColor: c.surface, borderRadius: 16, padding: 20, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 18, flex: 1 }}>
                  {currentExercise.exercise.name}
                </Text>
                <Pressable onPress={() => setShowInfo(false)}>
                  <Ionicons name="close" size={24} color={c.text} />
                </Pressable>
              </View>
              <ScrollView>
                <Text style={{ color: c.textMuted, marginBottom: 8, textTransform: 'uppercase', fontSize: 12 }}>Primary Muscle</Text>
                <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, marginBottom: 16 }}>
                  {currentExercise.exercise.primary_muscle || 'Unknown'}
                </Text>

                {(currentExercise as any)?.exercise?.video_url ? (
                  <Video
                    source={{ uri: (currentExercise as any).exercise.video_url }}
                    style={{ width: '100%', height: 140, borderRadius: 10, backgroundColor: c.surface2, marginBottom: 16 }}
                    useNativeControls
                    resizeMode={ResizeMode.COVER}
                    isLooping
                  />
                ) : (currentExercise as any)?.exercise?.gif_url ? (
                  <Image
                    source={{ uri: (currentExercise as any).exercise.gif_url }}
                    style={{ width: '100%', height: 140, borderRadius: 10, backgroundColor: c.surface2, marginBottom: 16 }}
                    resizeMode="cover"
                  />
                ) : null}

                <Text style={{ color: c.textMuted, marginBottom: 8, textTransform: 'uppercase', fontSize: 12 }}>Instructions</Text>
                {currentExerciseSteps.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {currentExerciseSteps.slice(0, 3).map((step, idx) => (
                      <View key={`${idx}-${step.slice(0, 20)}`} style={{ flexDirection: 'row', gap: 8 }}>
                        <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>{idx + 1}.</Text>
                        <Text style={{ color: c.text, lineHeight: 20, flex: 1 }}>{step}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: c.text, lineHeight: 22 }}>
                    No instructions available.
                  </Text>
                )}
              </ScrollView>
            </View>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Swap Exercise Modal */}
      <AnimatePresence>
        {showSwap && (
          <MotiView
            from={{ opacity: 0, translateY: 100 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: 100 }}
            style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, zIndex: 100, paddingTop: insets.top + s.lg }]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: s.lg, marginBottom: s.lg }}>
              <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>Swap Exercise</Text>
              <Pressable onPress={() => setShowSwap(false)}>
                <Ionicons name="close" size={28} color={c.text} />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: s.lg, marginBottom: s.md }}>
              <TextInput
                placeholder="Search replacement..."
                placeholderTextColor={c.textMuted}
                value={swapSearch}
                onChangeText={setSwapSearch}
                style={{
                  backgroundColor: c.surface,
                  color: c.text,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: c.border
                }}
              />
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: s.lg, paddingBottom: 100 }}>
              {swapOptions.map((ex) => (
                <Pressable
                  key={ex.id}
                  onPress={() => handleSwapExercise(ex.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: c.surface2
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
                      {ex.name}
                    </Text>
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>
                      {ex.primary_muscle} • {ex.category}
                    </Text>
                  </View>
                  <Ionicons name="swap-vertical" size={20} color={c.primary} />
                </Pressable>
              ))}
              {swapOptions.length === 0 && (
                <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: 20 }}>No matching exercises found.</Text>
              )}
            </ScrollView>
          </MotiView>
        )}
      </AnimatePresence>

      {/* Rest Timer Overlay (Bottom) */}
      <AnimatePresence>
        {restTimer !== null && restTimer > 0 && (
          <MotiView
            from={{ translateY: 100 }}
            animate={{ translateY: 0 }}
            exit={{ translateY: 100 }}
            transition={{ type: 'spring', damping: 20 }}
            style={[
              styles.restTimerPanel,
              {
                backgroundColor: c.surface,
                paddingBottom: insets.bottom + s.md,
                borderTopColor: c.primary,
              }
            ]}
          >
            <View style={styles.restContent}>
              <View>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 10, letterSpacing: 1 }}>
                  REST TIMER
                </Text>
                <Text style={{ color: c.text, fontFamily: ty.mono.family, fontSize: 32 }}>
                  {formatTime(restTimer)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: s.md }}>
                <Pressable
                  onPress={() => setRestTimer(prev => (prev || 0) + 30)}
                  style={[styles.timerButton, { backgroundColor: c.surface2 }]}
                >
                  <Text style={{ color: c.text, fontSize: 12 }}>+30s</Text>
                </Pressable>
                <Pressable
                  onPress={() => setRestTimer(null)}
                  style={[styles.timerButton, { backgroundColor: c.surface2 }]}
                >
                  <Text style={{ color: c.text, fontSize: 12 }}>Skip</Text>
                </Pressable>
              </View>
            </View>
          </MotiView>
        )}
      </AnimatePresence>
    </View >
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
    paddingVertical: 12,
  },
  timerText: {
    fontSize: 24,
    marginBottom: 2,
  },
  sessionName: {},
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  finishButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  exerciseNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Table
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  colSet: { width: 30, textAlign: 'center' },
  colPrev: { flex: 1, textAlign: 'center' },
  colInput: { width: 80 },
  colRpe: { width: 40, textAlign: 'center' },
  colCheck: { width: 36, alignItems: 'center' },

  setBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  checkButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },

  // Rest Timer
  restTimerPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 24,
    borderTopWidth: 2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  restContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
});
