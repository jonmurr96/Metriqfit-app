import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { gamificationKeys } from '../../hooks/useGamification';
import { XPToast } from './XPToast';

type ToastEvent = {
  xp: number;
  message: string;
};

export function GlobalGamificationToasts() {
  const [toast, setToast] = useState<ToastEvent | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'GAMIFICATION_XP_AWARDED',
      (event: ToastEvent) => {
        setToast({ xp: event.xp, message: event.message });
        
        // Force React Query to flush cache and update UI anywhere XP data is shown
        queryClient.invalidateQueries({ queryKey: gamificationKeys.all });
      }
    );

    return () => {
      subscription.remove();
    };
  }, [queryClient]);

  if (!toast) return null;

  return (
    <XPToast
      xp={toast.xp}
      message={toast.message}
      onDismiss={() => setToast(null)}
    />
  );
}
