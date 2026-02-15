import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MealTimes {
  breakfast: string;  // HH:MM format (24h)
  lunch: string;      // HH:MM format (24h)
  dinner: string;     // HH:MM format (24h)
  snack: string;      // HH:MM format (24h) or 'anytime'
}

export const DEFAULT_MEAL_TIMES: MealTimes = {
  breakfast: '08:30',
  lunch: '13:00',
  dinner: '19:30',
  snack: 'anytime',
};

const LOCAL_MEAL_TIMES_KEY_PREFIX = 'meal_times:';
let mealTimesStorageMode: 'unknown' | 'remote' | 'local' = 'unknown';

function getLocalMealTimesKey(userId: string): string {
  return `${LOCAL_MEAL_TIMES_KEY_PREFIX}${userId}`;
}

function isMissingMealTimesColumnError(error: any): boolean {
  if (!error) return false;
  if (error.code === '42703') return true;
  const message = String(error.message || '');
  const details = String(error.details || '');
  return /meal_times/i.test(message) || /meal_times/i.test(details);
}

function normalizeMealTimes(value: any): MealTimes {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<MealTimes>;
  return {
    breakfast: typeof raw.breakfast === 'string' ? raw.breakfast : DEFAULT_MEAL_TIMES.breakfast,
    lunch: typeof raw.lunch === 'string' ? raw.lunch : DEFAULT_MEAL_TIMES.lunch,
    dinner: typeof raw.dinner === 'string' ? raw.dinner : DEFAULT_MEAL_TIMES.dinner,
    snack: typeof raw.snack === 'string' ? raw.snack : DEFAULT_MEAL_TIMES.snack,
  };
}

async function readLocalMealTimes(userId: string): Promise<MealTimes> {
  try {
    const stored = await AsyncStorage.getItem(getLocalMealTimesKey(userId));
    if (!stored) return DEFAULT_MEAL_TIMES;
    return normalizeMealTimes(JSON.parse(stored));
  } catch (error) {
    console.warn('Failed to read local meal times:', error);
    return DEFAULT_MEAL_TIMES;
  }
}

async function writeLocalMealTimes(userId: string, mealTimes: MealTimes): Promise<void> {
  try {
    await AsyncStorage.setItem(getLocalMealTimesKey(userId), JSON.stringify(mealTimes));
  } catch (error) {
    console.warn('Failed to write local meal times:', error);
  }
}

/**
 * Convert 24h time string (HH:MM) to 12h format with AM/PM
 */
export function formatTime12h(time24h: string): string {
  if (time24h === 'anytime') return 'Anytime';

  const match = /^(\d{1,2}):(\d{1,2})$/.exec(time24h || '');
  if (!match) return '--';

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return '--';
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Fetch meal times for a user
 */
export async function getMealTimes(userId: string): Promise<MealTimes> {
  if (mealTimesStorageMode === 'local') {
    return readLocalMealTimes(userId);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('meal_times')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingMealTimesColumnError(error)) {
      console.warn('profiles.meal_times not available; falling back to local storage.');
      mealTimesStorageMode = 'local';
      return readLocalMealTimes(userId);
    }
    console.error('Error fetching meal times:', error);
    return DEFAULT_MEAL_TIMES;
  }

  mealTimesStorageMode = 'remote';

  // Merge with defaults to ensure all fields exist
  return normalizeMealTimes(data?.meal_times);
}

/**
 * Update meal times for a user
 */
export async function updateMealTimes(
  userId: string, 
  mealTimes: Partial<MealTimes>
): Promise<MealTimes> {
  // Get current times first
  const currentTimes = await getMealTimes(userId);
  
  // Merge with updates
  const updatedTimes = {
    ...currentTimes,
    ...mealTimes,
  };

  if (mealTimesStorageMode === 'local') {
    await writeLocalMealTimes(userId, updatedTimes);
    return updatedTimes;
  }

  const { error } = await supabase
    .from('profiles')
    .update({ meal_times: updatedTimes })
    .eq('id', userId);

  if (error) {
    if (isMissingMealTimesColumnError(error)) {
      console.warn('profiles.meal_times not available; saving meal times locally.');
      mealTimesStorageMode = 'local';
      await writeLocalMealTimes(userId, updatedTimes);
      return updatedTimes;
    }
    console.error('Error updating meal times:', error);
    throw new Error('Failed to update meal times');
  }

  mealTimesStorageMode = 'remote';
  return updatedTimes;
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTime(time: string): boolean {
  if (time === 'anytime') return true;
  
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}
