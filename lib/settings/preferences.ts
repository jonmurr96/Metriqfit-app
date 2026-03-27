export type NotificationPreferences = {
  workoutReminders: boolean;
  mealReminders: boolean;
  waterReminders: boolean;
  weeklySummary: boolean;
};

export type DisplayPreferences = {
  reduceMotion: boolean;
  highContrast: boolean;
  preferredAppearanceLabel: string;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  workoutReminders: false,
  mealReminders: false,
  waterReminders: false,
  weeklySummary: true,
};

export const DEFAULT_DISPLAY_PREFERENCES: DisplayPreferences = {
  reduceMotion: false,
  highContrast: false,
  preferredAppearanceLabel: 'MetriqFit Dark',
};

export function normalizeNotificationPreferences(
  value: unknown,
): NotificationPreferences {
  const raw = value && typeof value === 'object'
    ? (value as Partial<NotificationPreferences>)
    : {};

  return {
    workoutReminders:
      typeof raw.workoutReminders === 'boolean'
        ? raw.workoutReminders
        : DEFAULT_NOTIFICATION_PREFERENCES.workoutReminders,
    mealReminders:
      typeof raw.mealReminders === 'boolean'
        ? raw.mealReminders
        : DEFAULT_NOTIFICATION_PREFERENCES.mealReminders,
    waterReminders:
      typeof raw.waterReminders === 'boolean'
        ? raw.waterReminders
        : DEFAULT_NOTIFICATION_PREFERENCES.waterReminders,
    weeklySummary:
      typeof raw.weeklySummary === 'boolean'
        ? raw.weeklySummary
        : DEFAULT_NOTIFICATION_PREFERENCES.weeklySummary,
  };
}

export function getPreferredAppearanceLabel(
  prefs: Partial<DisplayPreferences>,
): string {
  if (prefs.highContrast) {
    return 'High Contrast';
  }

  return prefs.preferredAppearanceLabel?.trim() || DEFAULT_DISPLAY_PREFERENCES.preferredAppearanceLabel;
}

export function normalizeDisplayPreferences(value: unknown): DisplayPreferences {
  const raw = value && typeof value === 'object'
    ? (value as Partial<DisplayPreferences>)
    : {};

  return {
    reduceMotion:
      typeof raw.reduceMotion === 'boolean'
        ? raw.reduceMotion
        : DEFAULT_DISPLAY_PREFERENCES.reduceMotion,
    highContrast:
      typeof raw.highContrast === 'boolean'
        ? raw.highContrast
        : DEFAULT_DISPLAY_PREFERENCES.highContrast,
    preferredAppearanceLabel: getPreferredAppearanceLabel(raw),
  };
}

export function hasAnyEnabledNotifications(
  prefs: NotificationPreferences,
): boolean {
  return Object.values(prefs).some(Boolean);
}
