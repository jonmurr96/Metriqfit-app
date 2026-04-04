import { Model } from '@nozbe/watermelondb';
import { field, date, readonly, json } from '@nozbe/watermelondb/decorators';
import { 
  ExperienceLevel, 
  GoalBucket, 
  TrainingStyle, 
  LiftComfort, 
  SessionEnvironment 
} from '../../../types/v1_engine';

const sanitizeArray = (rawArray: any) => {
  return Array.isArray(rawArray) ? rawArray : [];
};

export default class V1OnboardingProfile extends Model {
  static table = 'v1_onboarding_profiles';

  @field('user_id') userId!: string;
  @field('experience_level') experienceLevel!: ExperienceLevel;
  @field('primary_goal') primaryGoal!: GoalBucket;
  @field('secondary_goal') secondaryGoal!: GoalBucket | null;
  @field('days_per_week') daysPerWeek!: number;
  @field('preferred_style') preferredStyle!: TrainingStyle;
  @field('lift_comfort') liftComfort!: LiftComfort;
  @field('environment') environment!: SessionEnvironment;
  
  @json('contraindications', sanitizeArray) contraindications!: string[];
  
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;
}
