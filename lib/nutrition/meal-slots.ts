import type { MealSlot } from '../../services/nutritionService';

export const MEAL_SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function normalizeMealSlot(value: unknown): MealSlot | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'string') return null;

  switch (candidate.toLowerCase()) {
    case 'breakfast':
      return 'breakfast';
    case 'lunch':
      return 'lunch';
    case 'dinner':
      return 'dinner';
    case 'snack':
    case 'snacks':
      return 'snack';
    default:
      return null;
  }
}

export function getMealSlotIndex(slot: unknown): number {
  const normalized = normalizeMealSlot(slot);
  return normalized ? MEAL_SLOT_ORDER.indexOf(normalized) : Number.MAX_SAFE_INTEGER;
}

export function getMealSlotLabel(slot: unknown): string {
  const normalized = normalizeMealSlot(slot);
  return normalized ? MEAL_SLOT_LABELS[normalized] : 'Meal';
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeDateKey(value: unknown, fallback = getLocalDateKey()): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'string') return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return fallback;

  const parsed = new Date(`${candidate}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? fallback : candidate;
}

export function getDayOfWeekFromDateKey(dateKey: string): number {
  const parsed = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().getDay();
  }
  return parsed.getDay();
}

