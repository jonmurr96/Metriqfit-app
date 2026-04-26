import { Model, Query } from '@nozbe/watermelondb';
import { field, date, readonly, relation, children } from '@nozbe/watermelondb/decorators';
import { Associations } from '@nozbe/watermelondb/Model';
import type V1TemplateSlot from './V1TemplateSlot';
import { DayType } from '../../../types/v1_engine';

export default class V1WorkoutDay extends Model {
  static table = 'v1_workout_days';
  static associations: Associations = {
    v1_template_slots: { type: 'has_many', foreignKey: 'workout_day_id' },
  };

  @field('day_number') dayNumber!: number;
  @field('day_type') dayType!: DayType;
  
  @readonly @date('created_at') createdAt!: Date;

  @relation('v1_templates', 'template_id') template!: any;
  @children('v1_template_slots') slots!: Query<V1TemplateSlot>;
}
