import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class V1ExerciseSubstitution extends Model {
  static table = 'v1_exercise_substitutions';

  @field('exercise_id') exerciseId!: string;
  @field('substitute_exercise_id') substituteExerciseId!: string;
  @field('preference_rank') preferenceRank!: number;
  @field('restriction_reason') restrictionReason?: string;
  @field('is_global') isGlobal!: boolean;
  @field('user_id') userId?: string;
  @readonly @date('created_at') createdAt!: Date;
}
