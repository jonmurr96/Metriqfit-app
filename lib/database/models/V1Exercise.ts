import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json } from '@nozbe/watermelondb/decorators';
import { 
  MovementPattern, 
  ReplacementGroup, 
  EquipmentCategory, 
  SetupComplexity, 
  FatigueCost, 
  ExerciseTier,
  ProgressionModel
} from '../../../types/v1_engine';

const sanitizeArray = (rawArray: any) => {
  return Array.isArray(rawArray) ? rawArray : [];
};

export default class V1Exercise extends Model {
  static table = 'v1_exercises';

  @field('external_id') externalId!: string;
  @field('name') name!: string;
  @field('movement_pattern') movementPattern!: MovementPattern;
  @field('architectural_group') architecturalGroup!: ReplacementGroup;
  @field('equipment_category') equipmentCategory!: EquipmentCategory;
  @field('is_unilateral') isUnilateral!: boolean;
  @field('setup_complexity') setupComplexity!: SetupComplexity;
  @field('fatigue_cost') fatigueCost!: FatigueCost;
  @field('tier') tier!: ExerciseTier;
  
  @json('progression_types', sanitizeArray) progressionTypes!: ProgressionModel[];
  @json('contraindications', sanitizeArray) contraindications!: string[];
  
  @field('estimated_duration_seconds') estimatedDurationSeconds!: number;
  
  @readonly @date('created_at') createdAt!: Date;
}
