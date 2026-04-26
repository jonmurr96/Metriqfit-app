import { getLocalDateKey } from '../nutrition/meal-slots.ts';

export function getSessionStartLocalDateKey(startedAt: string): string | null {
  if (!startedAt) {
    return null;
  }

  const parsed = new Date(startedAt);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return getLocalDateKey(parsed);
}

export function isWorkoutSessionExpiredForLocalDay(startedAt: string, now = new Date()): boolean {
  const sessionDateKey = getSessionStartLocalDateKey(startedAt);
  if (!sessionDateKey) {
    return false;
  }

  return sessionDateKey !== getLocalDateKey(now);
}
