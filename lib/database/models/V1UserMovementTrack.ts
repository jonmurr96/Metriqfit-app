import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class V1UserMovementTrack extends Model {
  static table = 'v1_user_movement_tracks';

  @field('user_id') userId!: string;
  @field('exercise_id') exerciseId!: string;
  @field('estimated_1rm') estimated1Rm?: number;
  @field('recent_max_reps') recentMaxReps?: number;
  @field('recent_load') recentLoad?: number;
  @date('last_performed_at') lastPerformedAt?: Date;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
