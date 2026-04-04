import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, children } from '@nozbe/watermelondb/decorators';
import type V1Template from './V1Template';
import { GoalBucket, TrainingStyle, LiftComfort, SessionEnvironment, ProgressionModel } from '../../../types/v1_engine';

export default class V1PlanFamily extends Model {
  static table = 'v1_plan_families';

  @field('external_id') externalId!: string;
  @field('name') name!: string;
  @field('goal_bucket') goalBucket!: GoalBucket;
  @field('training_style') trainingStyle!: TrainingStyle;
  @field('days_per_week') daysPerWeek!: number;
  @field('lift_comfort') liftComfort!: LiftComfort;
  @field('environment') environment!: SessionEnvironment;
  @field('progression_model') progressionModel!: ProgressionModel;
  
  @readonly @date('created_at') createdAt!: Date;

  @children('v1_templates') templates!: any; // Relation to V1Template
}
