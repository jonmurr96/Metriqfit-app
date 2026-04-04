import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { v1AppSchema } from './schema';

// V1 Models
import V1OnboardingProfile from './models/V1OnboardingProfile';
import V1PlanFamily from './models/V1PlanFamily';
import V1Template from './models/V1Template';
import V1WorkoutDay from './models/V1WorkoutDay';
import V1TemplateSlot from './models/V1TemplateSlot';
import V1Exercise from './models/V1Exercise';
import V1ExerciseSubstitution from './models/V1ExerciseSubstitution';
import V1UserMovementTrack from './models/V1UserMovementTrack';
import V1AdaptationHistory from './models/V1AdaptationHistory';
import V1UserSwap from './models/V1UserSwap';


const adapter = new SQLiteAdapter({
  schema: v1AppSchema,
  jsi: true, /* Requires setting up JSI bridge in expo-sqlite, standard for modern Expo apps */
  onSetUpError: error => {
    console.error('Core DB Setup Error:', error);
  }
});

export const database = new Database({
  adapter,
  modelClasses: [
    V1OnboardingProfile,
    V1PlanFamily,
    V1Template,
    V1WorkoutDay,
    V1TemplateSlot,
    V1Exercise,
    V1ExerciseSubstitution,
    V1UserMovementTrack,
    V1AdaptationHistory,
    V1UserSwap
  ],
});
