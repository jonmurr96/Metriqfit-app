/**
 * Exercise GIF Mapper Utility
 * Maps MetriqFit exercises to animation GIFs from the exercises-gifs repository
 */

/**
 * Gets the local asset path for an exercise GIF
 * @param gifId - The numeric GIF ID (e.g., "0001", "1234")
 * @returns Local asset path or null if no gifId provided
 */
export function getExerciseGifPath(gifId: string | null | undefined): string | null {
  if (!gifId) return null;

  // Ensure gifId is 4-digit padded
  const paddedId = gifId.padStart(4, '0');

  // Return local asset path
  // In React Native, assets are accessed differently than web
  // For now, return the path that can be used with require() or asset resolution
  return `/assets/exercises/${paddedId}.gif`;
}

/**
 * Mapping of MetriqFit exercise names to GIF IDs from exercises-gifs repository
 * This mapping was created by matching exercise names between:
 * - MetriqFit's 175 exercises (from app_ready_programs_175_v3_constraints.json)
 * - exercises-gifs repository (1323 exercises from Kaggle dataset)
 *
 * Note: Not all MetriqFit exercises have matching GIFs in the repository.
 * This is a partial mapping that can be expanded over time.
 */
export const EXERCISE_NAME_TO_GIF_ID: Record<string, string> = {
  // Core/Abs exercises
  'Cable Crunch': '0126',
  'Crunch': '0252',
  'Decline Crunch': '0272',
  'Hanging Knee Raise': '0421',
  'Hanging Leg Raise': '0423',
  'Plank': '0661',
  'Side Plank': '0788',
  'Russian Twist': '0738',

  // Back exercises
  'Barbell Row': '0049',
  'Bent-Over Row': '0074',
  'Cable Row': '0131',
  'Seated Cable Row': '0771',
  'T-Bar Row': '0862',
  'Lat Pulldown': '0498',
  'Wide-Grip Lat Pulldown': '0952',
  'Pull-Up': '0707',
  'Chin-Up': '0185',
  'Deadlift': '0270',
  'Romanian Deadlift': '0733',
  'Sumo Deadlift': '0850',

  // Chest exercises
  'Barbell Bench Press': '0033',
  'Incline Barbell Bench Press': '0450',
  'Decline Barbell Bench Press': '0269',
  'Dumbbell Bench Press': '0308',
  'Incline Dumbbell Bench Press': '0451',
  'Decline Dumbbell Bench Press': '0273',
  'Dumbbell Fly': '0314',
  'Cable Fly': '0123',
  'Push-Up': '0712',
  'Dip': '0288',

  // Shoulder exercises
  'Overhead Press': '0641',
  'Dumbbell Shoulder Press': '0362',
  'Arnold Press': '0020',
  'Lateral Raise': '0495',
  'Front Raise': '0381',
  'Rear Delt Fly': '0723',
  'Face Pull': '0370',
  'Upright Row': '0912',

  // Leg exercises
  'Back Squat': '0027',
  'Front Squat': '0379',
  'Leg Press': '0508',
  'Leg Extension': '0504',
  'Leg Curl': '0503',
  'Lunge': '0543',
  'Bulgarian Split Squat': '0115',
  'Calf Raise': '0135',

  // Arm exercises
  'Barbell Curl': '0040',
  'Dumbbell Curl': '0311',
  'Hammer Curl': '0414',
  'Preacher Curl': '0686',
  'Tricep Pushdown': '0895',
  'Overhead Tricep Extension': '0642',
  'Skull Crusher': '0802',
  'Dumbbell Kickback': '0327',
};

/**
 * Gets GIF ID for an exercise by name
 * @param exerciseName - The name of the exercise
 * @returns GIF ID or null if no mapping exists
 */
export function getGifIdByExerciseName(exerciseName: string): string | null {
  return EXERCISE_NAME_TO_GIF_ID[exerciseName] || null;
}

/**
 * Gets the full GIF path for an exercise by name
 * @param exerciseName - The name of the exercise
 * @returns Local asset path or null if no mapping exists
 */
export function getExerciseGifByName(exerciseName: string): string | null {
  const gifId = getGifIdByExerciseName(exerciseName);
  return getExerciseGifPath(gifId);
}
