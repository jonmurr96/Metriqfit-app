import { useCallback, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';

import { useAuth } from '../lib/auth/AuthProvider';
import type { MealTimes } from '../services/mealTimesService';
import type { NotificationCategory } from '../services/notificationService';
import {
  disableNotificationCategory,
  enableNotificationCategory,
  getNotificationPermissionState,
  openSystemSettings,
} from '../services/notificationService';

export function useNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus>(
    Notifications.PermissionStatus.UNDETERMINED,
  );
  const [canAskAgain, setCanAskAgain] = useState(true);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const refreshPermissionState = useCallback(async () => {
    const state = await getNotificationPermissionState();
    setPermissionStatus(state.permissionStatus);
    setCanAskAgain(state.canAskAgain);
    return state;
  }, []);

  useEffect(() => {
    refreshPermissionState().catch((error) => {
      console.warn('Failed to load notification permissions:', error);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((nextNotification) => {
      setNotification(nextNotification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification tapped!', response);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [refreshPermissionState]);

  const enableNotifications = useCallback(
    async (category: NotificationCategory, options: { mealTimes: MealTimes }) => {
      if (!user?.id) {
        throw new Error('You must be signed in to manage notifications.');
      }

      const result = await enableNotificationCategory(user.id, category, options.mealTimes);
      setPermissionStatus(result.permissionStatus);
      setCanAskAgain(result.canAskAgain);
      if (result.expoPushToken) {
        setExpoPushToken(result.expoPushToken);
      }
      return result;
    },
    [user?.id],
  );

  const disableNotifications = useCallback(
    async (category: NotificationCategory) => {
      if (!user?.id) {
        throw new Error('You must be signed in to manage notifications.');
      }

      await disableNotificationCategory(user.id, category);
      return refreshPermissionState();
    },
    [refreshPermissionState, user?.id],
  );

  return {
    expoPushToken,
    notification,
    permissionStatus,
    canAskAgain,
    enableNotifications,
    disableNotifications,
    openSystemSettings,
    refreshPermissionState,
  };
}
