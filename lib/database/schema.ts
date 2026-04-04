import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const v1AppSchema = appSchema({
  version: 2, // Incremented for Week 1.3 Swaps
  tables: [
    tableSchema({
      name: 'v1_onboarding_profiles',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'experience_level', type: 'string' },
        { name: 'primary_goal', type: 'string' },
        { name: 'secondary_goal', type: 'string', isOptional: true },
        { name: 'days_per_week', type: 'number' },
        { name: 'preferred_style', type: 'string' },
        { name: 'lift_comfort', type: 'string' },
        { name: 'environment', type: 'string' },
        { name: 'contraindications', type: 'string' }, // Will serialize array to string
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'v1_plan_families',
      columns: [
        { name: 'external_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'goal_bucket', type: 'string' },
        { name: 'training_style', type: 'string' },
        { name: 'days_per_week', type: 'number' },
        { name: 'lift_comfort', type: 'string' },
        { name: 'environment', type: 'string' },
        { name: 'progression_model', type: 'string' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'v1_templates',
      columns: [
        { name: 'family_id', type: 'string', isIndexed: true },
        { name: 'external_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'block_number', type: 'number' },
        { name: 'difficulty_score', type: 'number' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'v1_workout_days',
      columns: [
        { name: 'template_id', type: 'string', isIndexed: true },
        { name: 'day_number', type: 'number' },
        { name: 'day_type', type: 'string' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'v1_template_slots',
      columns: [
        { name: 'workout_day_id', type: 'string', isIndexed: true },
        { name: 'order_index', type: 'number' },
        { name: 'architectural_group', type: 'string' },
        { name: 'is_required', type: 'boolean' },
        { name: 'archetype', type: 'string' },
        { name: 'progression_model', type: 'string' },
        { name: 'sets', type: 'number' },
        { name: 'reps_min', type: 'number' },
        { name: 'reps_max', type: 'number' },
        { name: 'target_rpe', type: 'number' },
        { name: 'rest_seconds', type: 'number' },
        { name: 'timer_cap_seconds', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'v1_exercises',
      columns: [
        { name: 'external_id', type: 'string', isIndexed: true },
        { name: 'name', type: 'string' },
        { name: 'movement_pattern', type: 'string' },
        { name: 'architectural_group', type: 'string' },
        { name: 'equipment_category', type: 'string' },
        { name: 'is_unilateral', type: 'boolean' },
        { name: 'setup_complexity', type: 'string' },
        { name: 'fatigue_cost', type: 'string' },
        { name: 'tier', type: 'string' },
        { name: 'progression_types', type: 'string' }, // Stringified array
        { name: 'contraindications', type: 'string' }, // Stringified array
        { name: 'estimated_duration_seconds', type: 'number' },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'v1_exercise_substitutions',
      columns: [
        { name: 'exercise_id', type: 'string', isIndexed: true },
        { name: 'substitute_exercise_id', type: 'string', isIndexed: true },
        { name: 'preference_rank', type: 'number' },
        { name: 'restriction_reason', type: 'string', isOptional: true },
        { name: 'is_global', type: 'boolean' },
        { name: 'user_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'created_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'v1_user_movement_tracks',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'exercise_id', type: 'string', isIndexed: true },
        { name: 'estimated_1rm', type: 'number', isOptional: true },
        { name: 'recent_max_reps', type: 'number', isOptional: true },
        { name: 'recent_load', type: 'number', isOptional: true },
        { name: 'last_performed_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'v1_adaptation_history',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'template_id', type: 'string', isIndexed: true },
        { name: 'block_number', type: 'number' },
        { name: 'started_at', type: 'number' },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'completion_status', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ]
    }),
    tableSchema({
      name: 'v1_user_swaps',
      columns: [
        { name: 'user_id', type: 'string', isIndexed: true },
        { name: 'original_exercise_id', type: 'string' },
        { name: 'new_exercise_id', type: 'string' },
        { name: 'replacement_group', type: 'string' },
        { name: 'reason', type: 'string' },
        { name: 'continuity_method', type: 'string' },
        { name: 'created_at', type: 'number' },
      ]
    }),
  ]
});
