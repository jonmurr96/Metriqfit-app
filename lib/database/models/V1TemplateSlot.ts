import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, relation } from '@nozbe/watermelondb/decorators';
import { ReplacementGroup, SlotArchetype, ProgressionModel } from '../../../types/v1_engine';

export default class V1TemplateSlot extends Model {
  static table = 'v1_template_slots';

  @field('order_index') orderIndex!: number;
  @field('architectural_group') architecturalGroup!: ReplacementGroup;
  @field('is_required') isRequired!: boolean;
  @field('archetype') archetype!: SlotArchetype;
  @field('progression_model') progressionModel!: ProgressionModel;
  
  @field('sets') sets!: number;
  @field('reps_min') repsMin!: number;
  @field('reps_max') repsMax!: number;
  @field('target_rpe') targetRpe!: number;
  @field('rest_seconds') restSeconds!: number;
  @field('timer_cap_seconds') timerCapSeconds!: number | null;
  
  @readonly @date('created_at') createdAt!: Date;

  @relation('v1_workout_days', 'workout_day_id') workoutDay!: any;
}
