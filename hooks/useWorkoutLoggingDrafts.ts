import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WorkoutSetDraft } from '../lib/workout/logging-state';

export interface PersistedRestTimerState {
  sessionExerciseId: string;
  remainingSeconds: number;
}

interface WorkoutLoggingDraftState {
  draftsByExerciseId: Record<string, Record<number, WorkoutSetDraft>>;
  extraSetCountByExerciseId: Record<string, number>;
  activeSetByExerciseId: Record<string, number>;
  activeExerciseIndex: number;
  restTimerState: PersistedRestTimerState | null;
  updatedTimestamp: number;
}

const EMPTY_STATE: WorkoutLoggingDraftState = {
  draftsByExerciseId: {},
  extraSetCountByExerciseId: {},
  activeSetByExerciseId: {},
  activeExerciseIndex: 0,
  restTimerState: null,
  updatedTimestamp: 0,
};

function createStorageKey(sessionId: string) {
  return `workout_session_${sessionId}`;
}

export async function clearWorkoutLoggingDraftsForSession(sessionId: string) {
  if (!sessionId) {
    return;
  }

  await AsyncStorage.removeItem(createStorageKey(sessionId));
}

export function useWorkoutLoggingDrafts(sessionId?: string) {
  const [state, setState] = useState<WorkoutLoggingDraftState>(EMPTY_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  const storageKey = useMemo(
    () => (sessionId ? createStorageKey(sessionId) : null),
    [sessionId],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!storageKey) {
        setState(EMPTY_STATE);
        setIsHydrated(true);
        return;
      }

      setIsHydrated(false);

      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (!raw) {
          if (!cancelled) {
            setState(EMPTY_STATE);
          }
          return;
        }

        const parsed = JSON.parse(raw) as Partial<WorkoutLoggingDraftState>;
        if (!cancelled) {
          setState({
            draftsByExerciseId: parsed.draftsByExerciseId ?? {},
            extraSetCountByExerciseId: parsed.extraSetCountByExerciseId ?? {},
            activeSetByExerciseId: parsed.activeSetByExerciseId ?? {},
            activeExerciseIndex: parsed.activeExerciseIndex ?? 0,
            restTimerState: parsed.restTimerState ?? null,
            updatedTimestamp: parsed.updatedTimestamp ?? 0,
          });
        }
      } catch (error) {
        console.error('Failed to load workout session draft state', error);
        if (!cancelled) {
          setState(EMPTY_STATE);
        }
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !isHydrated) {
      return;
    }

    const timeout = setTimeout(() => {
      AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          ...state,
          updatedTimestamp: Date.now(),
        }),
      ).catch((error) => {
        console.error('Failed to persist workout session draft state', error);
      });
    }, 120);

    return () => clearTimeout(timeout);
  }, [isHydrated, state, storageKey]);

  const mergeExerciseDrafts = useCallback(
    (exerciseId: string, setNumber: number, draft: Partial<WorkoutSetDraft>) => {
      setState((current) => {
        const currentDraft = current.draftsByExerciseId[exerciseId]?.[setNumber];

        return {
          ...current,
          draftsByExerciseId: {
            ...current.draftsByExerciseId,
            [exerciseId]: {
              ...current.draftsByExerciseId[exerciseId],
              [setNumber]: {
                ...(currentDraft ?? {
                  weight: '',
                  reps: '',
                  rpe: '',
                  isWarmup: false,
                }),
                ...draft,
              },
            },
          },
        };
      });
    },
    [],
  );

  const replaceExerciseDraft = useCallback(
    (exerciseId: string, setNumber: number, draft: WorkoutSetDraft) => {
      setState((current) => ({
        ...current,
        draftsByExerciseId: {
          ...current.draftsByExerciseId,
          [exerciseId]: {
            ...current.draftsByExerciseId[exerciseId],
            [setNumber]: draft,
          },
        },
      }));
    },
    [],
  );

  const clearExerciseDraft = useCallback((exerciseId: string, setNumber: number) => {
    setState((current) => {
      const nextExerciseDrafts = { ...(current.draftsByExerciseId[exerciseId] ?? {}) };
      delete nextExerciseDrafts[setNumber];

      const nextDraftsByExerciseId = { ...current.draftsByExerciseId };
      if (Object.keys(nextExerciseDrafts).length === 0) {
        delete nextDraftsByExerciseId[exerciseId];
      } else {
        nextDraftsByExerciseId[exerciseId] = nextExerciseDrafts;
      }

      return {
        ...current,
        draftsByExerciseId: nextDraftsByExerciseId,
      };
    });
  }, []);

  const setActiveSet = useCallback((exerciseId: string, setNumber: number) => {
    setState((current) => ({
      ...current,
      activeSetByExerciseId: {
        ...current.activeSetByExerciseId,
        [exerciseId]: setNumber,
      },
    }));
  }, []);

  const clearExerciseState = useCallback((exerciseId: string) => {
    setState((current) => {
      const nextDraftsByExerciseId = { ...current.draftsByExerciseId };
      const nextExtraSetCountByExerciseId = { ...current.extraSetCountByExerciseId };
      const nextActiveSetByExerciseId = { ...current.activeSetByExerciseId };

      delete nextDraftsByExerciseId[exerciseId];
      delete nextExtraSetCountByExerciseId[exerciseId];
      delete nextActiveSetByExerciseId[exerciseId];

      return {
        ...current,
        draftsByExerciseId: nextDraftsByExerciseId,
        extraSetCountByExerciseId: nextExtraSetCountByExerciseId,
        activeSetByExerciseId: nextActiveSetByExerciseId,
      };
    });
  }, []);

  const addExtraSet = useCallback((exerciseId: string) => {
    setState((current) => ({
      ...current,
      extraSetCountByExerciseId: {
        ...current.extraSetCountByExerciseId,
        [exerciseId]: (current.extraSetCountByExerciseId[exerciseId] ?? 0) + 1,
      },
    }));
  }, []);

  const removeExtraSet = useCallback((exerciseId: string) => {
    setState((current) => ({
      ...current,
      extraSetCountByExerciseId: {
        ...current.extraSetCountByExerciseId,
        [exerciseId]: Math.max(0, (current.extraSetCountByExerciseId[exerciseId] ?? 0) - 1),
      },
    }));
  }, []);

  const setActiveExerciseIndex = useCallback((nextIndex: number) => {
    setState((current) => ({
      ...current,
      activeExerciseIndex: nextIndex,
    }));
  }, []);

  const setRestTimerState = useCallback((restTimerState: PersistedRestTimerState | null) => {
    setState((current) => ({
      ...current,
      restTimerState,
    }));
  }, []);

  const clearAll = useCallback(async () => {
    if (storageKey && sessionId) {
      await clearWorkoutLoggingDraftsForSession(sessionId);
    }
    setState(EMPTY_STATE);
  }, [sessionId, storageKey]);

  return {
    isHydrated,
    draftsByExerciseId: state.draftsByExerciseId,
    extraSetCountByExerciseId: state.extraSetCountByExerciseId,
    activeSetByExerciseId: state.activeSetByExerciseId,
    activeExerciseIndex: state.activeExerciseIndex,
    restTimerState: state.restTimerState,
    mergeExerciseDrafts,
    replaceExerciseDraft,
    clearExerciseDraft,
    clearExerciseState,
    addExtraSet,
    removeExtraSet,
    setActiveSet,
    setActiveExerciseIndex,
    setRestTimerState,
    clearAll,
  };
}
