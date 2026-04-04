import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, children, relation } from '@nozbe/watermelondb/decorators';
import type V1PlanFamily from './V1PlanFamily';
import type V1WorkoutDay from './V1WorkoutDay';
import { Associations } from '@nozbe/watermelondb/Model';

export default class V1Template extends Model {
  static table = 'v1_templates';
  static associations: Associations = {
    v1_workout_days: { type: 'has_many', foreignKey: 'template_id' },
  };

  @field('external_id') externalId!: string;
  @field('name') name!: string;
  @field('block_number') blockNumber!: number;
  @field('difficulty_score') difficultyScore!: number;
  
  @readonly @date('created_at') createdAt!: Date;

  @relation('v1_plan_families', 'family_id') family!: any;
  @children('v1_workout_days') days!: Query<V1WorkoutDay>;
}
