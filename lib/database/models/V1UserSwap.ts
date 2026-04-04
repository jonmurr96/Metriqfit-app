import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class V1UserSwap extends Model {
  static table = 'v1_user_swaps';

  @field('user_id') userId!: string;
  @field('original_exercise_id') originalExerciseId!: string;
  @field('new_exercise_id') newExerciseId!: string;
  @field('replacement_group') replacementGroup!: string;
  @field('reason') reason!: string;
  @field('continuity_method') continuityMethod!: string;
  @readonly @date('created_at') createdAt!: Date;
}
