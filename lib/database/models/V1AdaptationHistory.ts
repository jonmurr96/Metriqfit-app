import { Model } from '@nozbe/watermelondb';
import { field, date, readonly } from '@nozbe/watermelondb/decorators';

export default class V1AdaptationHistory extends Model {
  static table = 'v1_adaptation_history';

  @field('user_id') userId!: string;
  @field('template_id') templateId!: string;
  @field('block_number') blockNumber!: number;
  @date('started_at') startedAt!: Date;
  @date('completed_at') completedAt?: Date;
  @field('completion_status') completionStatus!: string;
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
