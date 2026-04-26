/**
 * Meal Timing Engine
 * 
 * Calculates optimal meal times based on:
 * - Wake time
 * - First meal delay preference
 * - Training time
 * - Last meal constraint
 */

import type { 
  WakeTime, 
  FirstMealDelay, 
  LastMealBeforeBed, 
  TrainingTime 
} from '../onboarding/OnboardingContext';

export interface MealTimeConfig {
  wakeTime: WakeTime;
  firstMealDelay: FirstMealDelay;
  trainingTime: TrainingTime;
  lastMealBeforeBed: LastMealBeforeBed;
  // Optional custom times (in 24h format, e.g., "06:00")
  customWakeTime?: string;
  customTrainingTime?: string;
}

export interface MealSlot {
  slot: 'breakfast' | 'lunch' | 'dinner' | 'evening_snack' | 'pre_workout' | 'post_workout';
  label: string;
  time: string; // 24h format "HH:MM"
  isTrainingRelated: boolean;
  isRequired: boolean;
}

// Convert wake time enum to hour number
function getWakeHour(wakeTime: WakeTime, customTime?: string): number {
  if (wakeTime === 'other' && customTime) {
    const hour = parseInt(customTime.split(':')[0], 10);
    return isNaN(hour) ? 7 : hour;
  }
  
  switch (wakeTime) {
    case '5_6am': return 5.5; // 5:30 AM
    case '7_8am': return 7.5; // 7:30 AM
    case '9_10am': return 9.5; // 9:30 AM
    case 'other': return 7; // Default to 7 AM
    default: return 7;
  }
}

// Get training hour based on selection
function getTrainingHour(trainingTime: TrainingTime, customTime?: string): number | null {
  if (trainingTime === 'no_training') return null;
  
  if (customTime) {
    const hour = parseInt(customTime.split(':')[0], 10);
    return isNaN(hour) ? getDefaultTrainingHour(trainingTime) : hour;
  }
  
  return getDefaultTrainingHour(trainingTime);
}

function getDefaultTrainingHour(trainingTime: TrainingTime): number {
  switch (trainingTime) {
    case 'early_morning': return 6; // 6:00 AM
    case 'mid_morning': return 10; // 10:00 AM
    case 'midday': return 13; // 1:00 PM
    case 'afternoon': return 16; // 4:00 PM
    case 'evening': return 19; // 7:00 PM
    default: return 17; // Default 5:00 PM
  }
}

// Calculate first meal time based on wake time and delay
function calculateFirstMealTime(wakeHour: number, firstMealDelay: FirstMealDelay): number {
  switch (firstMealDelay) {
    case 'immediate': 
      return wakeHour + 0.25; // 15 minutes after waking
    case '1_2hrs': 
      return wakeHour + 1.5; // 1.5 hours after waking
    case '3hrs_plus': 
      return wakeHour + 3.5; // 3.5 hours after waking
    default: 
      return wakeHour + 1; // Default 1 hour after
  }
}

// Format hour number to HH:MM string
function formatTime(hour: number): string {
  const wholeHour = Math.floor(hour);
  const minutes = Math.round((hour - wholeHour) * 60);
  return `${wholeHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculate meal times based on user's schedule
 */
export function calculateMealTimes(config: MealTimeConfig): MealSlot[] {
  const { wakeTime, firstMealDelay, trainingTime, lastMealBeforeBed } = config;
  
  const wakeHour = getWakeHour(wakeTime, config.customWakeTime);
  const trainingHour = getTrainingHour(trainingTime, config.customTrainingTime);
  
  const meals: MealSlot[] = [];
  
  // Always have breakfast (or first meal)
  const firstMealHour = calculateFirstMealTime(wakeHour, firstMealDelay);
  
  // No training day - standard 3-4 meals
  if (!trainingHour) {
    meals.push({
      slot: 'breakfast',
      label: 'Breakfast',
      time: formatTime(firstMealHour),
      isTrainingRelated: false,
      isRequired: true,
    });
    
    // Lunch ~4 hours after breakfast
    const lunchHour = Math.min(firstMealHour + 4, 13);
    meals.push({
      slot: 'lunch',
      label: 'Lunch',
      time: formatTime(lunchHour),
      isTrainingRelated: false,
      isRequired: true,
    });
    
    // Dinner ~5 hours after lunch
    const dinnerHour = Math.min(lunchHour + 5, 19);
    meals.push({
      slot: 'dinner',
      label: 'Dinner',
      time: formatTime(dinnerHour),
      isTrainingRelated: false,
      isRequired: true,
    });
    
    // Optional evening snack if early dinner and not constrained
    if (lastMealBeforeBed !== '2hrs' && dinnerHour < 19) {
      meals.push({
        slot: 'evening_snack',
        label: 'Evening Snack',
        time: formatTime(dinnerHour + 3),
        isTrainingRelated: false,
        isRequired: false,
      });
    }
    
    return meals;
  }
  
  // Training day - adjust meals around workout
  const isEarlyMorningTraining = trainingHour <= 7;
  const isMorningTraining = trainingHour > 7 && trainingHour <= 11;
  const isAfternoonTraining = trainingHour > 11 && trainingHour <= 16;
  const isEveningTraining = trainingHour > 16;
  
  // Pre-workout meal timing (1.5 hours before)
  const preWorkoutHour = trainingHour - 1.5;
  const postWorkoutHour = trainingHour + 0.5; // 30 min after
  
  if (isEarlyMorningTraining) {
    // Training at 6 AM - fasted or light pre-workout, then post-workout breakfast
    meals.push({
      slot: 'post_workout',
      label: 'Post-Workout Breakfast',
      time: formatTime(postWorkoutHour),
      isTrainingRelated: true,
      isRequired: true,
    });
    
    meals.push({
      slot: 'lunch',
      label: 'Lunch',
      time: '12:00',
      isTrainingRelated: false,
      isRequired: true,
    });
    
    meals.push({
      slot: 'dinner',
      label: 'Dinner',
      time: '18:00',
      isTrainingRelated: false,
      isRequired: true,
    });
  } else if (isMorningTraining) {
    // Breakfast before workout
    meals.push({
      slot: 'breakfast',
      label: 'Breakfast',
      time: formatTime(Math.min(preWorkoutHour - 1, wakeHour + 1)),
      isTrainingRelated: false,
      isRequired: true,
    });
    
    meals.push({
      slot: 'pre_workout',
      label: 'Pre-Workout Snack',
      time: formatTime(preWorkoutHour),
      isTrainingRelated: true,
      isRequired: true,
    });
    
    meals.push({
      slot: 'post_workout',
      label: 'Post-Workout Meal',
      time: formatTime(postWorkoutHour),
      isTrainingRelated: true,
      isRequired: true,
    });
    
    meals.push({
      slot: 'dinner',
      label: 'Dinner',
      time: '18:00',
      isTrainingRelated: false,
      isRequired: true,
    });
  } else if (isAfternoonTraining) {
    // Standard breakfast and lunch, pre/post workout
    meals.push({
      slot: 'breakfast',
      label: 'Breakfast',
      time: formatTime(firstMealHour),
      isTrainingRelated: false,
      isRequired: true,
    });
    
    // Lunch 1-2 hours before pre-workout
    const lunchHour = Math.min(preWorkoutHour - 2, 12);
    meals.push({
      slot: 'lunch',
      label: 'Lunch',
      time: formatTime(lunchHour),
      isTrainingRelated: false,
      isRequired: true,
    });
    
    meals.push({
      slot: 'pre_workout',
      label: 'Pre-Workout',
      time: formatTime(preWorkoutHour),
      isTrainingRelated: true,
      isRequired: true,
    });
    
    meals.push({
      slot: 'post_workout',
      label: 'Post-Workout',
      time: formatTime(postWorkoutHour),
      isTrainingRelated: true,
      isRequired: true,
    });
    
    // Dinner if room
    if (postWorkoutHour < 18.5) {
      meals.push({
        slot: 'dinner',
        label: 'Dinner',
        time: formatTime(Math.max(postWorkoutHour + 2, 19)),
        isTrainingRelated: false,
        isRequired: true,
      });
    }
  } else {
    // Evening training - all meals before workout
    meals.push({
      slot: 'breakfast',
      label: 'Breakfast',
      time: formatTime(firstMealHour),
      isTrainingRelated: false,
      isRequired: true,
    });
    
    meals.push({
      slot: 'lunch',
      label: 'Lunch',
      time: formatTime(firstMealHour + 4.5),
      isTrainingRelated: false,
      isRequired: true,
    });
    
    meals.push({
      slot: 'pre_workout',
      label: 'Pre-Workout',
      time: formatTime(preWorkoutHour),
      isTrainingRelated: true,
      isRequired: true,
    });
    
    meals.push({
      slot: 'post_workout',
      label: 'Post-Workout Dinner',
      time: formatTime(postWorkoutHour),
      isTrainingRelated: true,
      isRequired: true,
    });
  }
  
  // Add evening snack if appropriate
  const lastMeal = meals[meals.length - 1];
  const lastMealHour = parseInt(lastMeal.time.split(':')[0], 10);
  
  if (lastMealBeforeBed === 'no_constraint' && lastMealHour < 20) {
    meals.push({
      slot: 'evening_snack',
      label: 'Evening Snack',
      time: formatTime(lastMealHour + 2),
      isTrainingRelated: false,
      isRequired: false,
    });
  }
  
  return meals;
}

/**
 * Get meal slot description based on timing
 */
export function getMealSlotDescription(slot: MealSlot['slot']): string {
  switch (slot) {
    case 'breakfast': return 'First meal of the day';
    case 'lunch': return 'Midday meal';
    case 'dinner': return 'Evening meal';
    case 'evening_snack': return 'Light evening snack';
    case 'pre_workout': return '1.5 hours before training';
    case 'post_workout': return 'Within 30 minutes after training';
    default: return '';
  }
}

/**
 * Check if a meal slot requires special nutrition timing
 */
export function isTrainingMeal(slot: MealSlot['slot']): boolean {
  return slot === 'pre_workout' || slot === 'post_workout';
}

/**
 * Sort meals by time
 */
export function sortMealsByTime(meals: MealSlot[]): MealSlot[] {
  return [...meals].sort((a, b) => {
    const timeA = parseInt(a.time.replace(':', ''), 10);
    const timeB = parseInt(b.time.replace(':', ''), 10);
    return timeA - timeB;
  });
}
