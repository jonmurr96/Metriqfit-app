import { useCallback, useEffect, useState } from 'react';

import type { PersistedRestTimerState } from './useWorkoutLoggingDrafts';

export function useSessionRestTimer(input: {
  initialState: PersistedRestTimerState | null;
  onChange?: (state: PersistedRestTimerState | null) => void;
}) {
  const { initialState, onChange } = input;
  const [restTimerState, setRestTimerState] = useState<PersistedRestTimerState | null>(initialState);

  useEffect(() => {
    setRestTimerState(initialState);
  }, [initialState]);

  useEffect(() => {
    onChange?.(restTimerState);
  }, [onChange, restTimerState]);

  useEffect(() => {
    if (!restTimerState || restTimerState.remainingSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRestTimerState((current) => {
        if (!current) {
          return null;
        }

        if (current.remainingSeconds <= 1) {
          return null;
        }

        return {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [restTimerState]);

  const startRestTimer = useCallback((sessionExerciseId: string, remainingSeconds: number) => {
    setRestTimerState({
      sessionExerciseId,
      remainingSeconds,
    });
  }, []);

  const skipRestTimer = useCallback(() => {
    setRestTimerState(null);
  }, []);

  const addSeconds = useCallback((seconds: number) => {
    setRestTimerState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        remainingSeconds: current.remainingSeconds + seconds,
      };
    });
  }, []);

  return {
    restTimerState,
    startRestTimer,
    skipRestTimer,
    addSeconds,
    setRestTimerState,
  };
}
