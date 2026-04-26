export const V1_PUBLIC_EXERCISE_NAME_ALIASES: Record<string, string[]> = {
  'Barbell Row': ['Pendlay Row', 'T-Bar Row'],
  'Bodyweight Calf Raise': ['Single-Leg Calf Raise (Bodyweight)', 'Standing Calf Raise'],
  'Bodyweight Lunge': ['Walking Lunge', 'Reverse Lunge'],
  'Box Jump': ['box jump down with one leg stabilization'],
  'Burpees': ['burpee'],
  'Crunch': ['crunch (hands overhead)', 'Cable Crunch'],
  'DB Flat Bench Press': ['Flat Dumbbell Bench Press'],
  'DB Lateral Raise': ['dumbbell seated lateral raise', 'Cable Lateral Raise', 'Machine Lateral Raise'],
  'DB RDL': ['Dumbbell Romanian Deadlift', 'Romanian Deadlift (Dumbbell)'],
  'DB Russian Twist': ['Russian Twist', 'weighted russian twist'],
  'DB Skull Crusher': ['Skull Crushers (Dumbbells)'],
  'Glute Bridge': ['Glute Bridge (Bodyweight)', 'Glute Bridge Iso Hold', 'low glute bridge on floor'],
  'Single Arm DB RDL': ['Dumbbell Romanian Deadlift', 'Single-Leg Romanian Deadlift'],
  'Single Leg Glute Bridge': ['single leg bridge with outstretched leg', 'Glute Bridge (Bodyweight)'],
  'Single Leg RDL': ['Single-Leg Romanian Deadlift'],
  'Tricep Rope Pushdown': ['Triceps Pushdown (Rope)', 'Tricep Pushdown (Rope)'],
};

export function publicExerciseNameCandidates(name: string): string[] {
  return [name, ...(V1_PUBLIC_EXERCISE_NAME_ALIASES[name] || [])];
}
