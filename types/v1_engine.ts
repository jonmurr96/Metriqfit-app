// Shared Enum Dictionary for the V1 Workout Engine
// This is the canonical source of truth for the entire offline and backend system.

export enum ExperienceLevel {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
}

export enum GoalBucket {
  Hypertrophy = 'Hypertrophy',
  FatLoss = 'FatLoss',
  Strength = 'Strength',
  GenFitness = 'GenFitness',
  Recomp = 'Recomp',
  Athletic = 'Athletic',
}

export enum TrainingStyle {
  FullBody = 'FullBody',
  UpperLower = 'UpperLower',
  PPL = 'PPL',
  BroSplit = 'BroSplit',
  Auto = 'Auto',
}

export enum LiftComfort {
  BarbellAdv = 'BarbellAdv',
  BarbellBasic = 'BarbellBasic',
  MachineDB = 'MachineDB',
  NoBarbell = 'NoBarbell',
}

export enum SessionEnvironment {
  Commercial = 'Commercial',
  AptHotel = 'AptHotel',
  Home = 'Home',
  Bodyweight = 'Bodyweight',
}

export enum ProgressionModel {
  Linear_Load = 'Linear_Load',
  Double_Progression = 'Double_Progression',
  Step = 'Step',
  Rep_Goal = 'Rep_Goal',
  Top_Set_Backoff = 'Top_Set_Backoff',
  Mechanical_BW = 'Mechanical_BW',
  Tempo = 'Tempo',
  Density = 'Density',
}

export enum DayType {
  UpperStrength = 'UpperStrength',
  UpperHypertrophy = 'UpperHypertrophy',
  LowerStrength = 'LowerStrength',
  LowerHypertrophy = 'LowerHypertrophy',
  Push = 'Push',
  Pull = 'Pull',
  Legs = 'Legs',
  FullBodyStrength = 'FullBodyStrength',
  FullBodyHypertrophy = 'FullBodyHypertrophy',
  FullBodyGenFit = 'FullBodyGenFit',
  Conditioning = 'Conditioning',
  Recovery = 'Recovery',
}

export enum SlotArchetype {
  PrimeCompound = 'PrimeCompound',
  SecondaryCompound = 'SecondaryCompound',
  Isolation = 'Isolation',
  Finisher = 'Finisher',
}

export enum SetupComplexity {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum FatigueCost {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
}

export enum ExerciseTier {
  T1 = 'T1',
  T2 = 'T2',
  T3 = 'T3',
  T4A = 'T4A',
  T4B = 'T4B',
}

export enum EquipmentCategory {
  Barbell = 'Barbell',
  DB = 'DB',
  Machine = 'Machine',
  Cable = 'Cable',
  BW = 'BW',
  Misc = 'Misc',
}

// 18 Standard Replacement Groups from the Taxonomy Spec
export enum ReplacementGroup {
  Primary_Bilateral_Squat = 'Primary_Bilateral_Squat',
  Primary_Bilateral_Hinge = 'Primary_Bilateral_Hinge',
  Primary_Horizontal_Press = 'Primary_Horizontal_Press',
  Primary_Vertical_Press = 'Primary_Vertical_Press',
  Primary_Horizontal_Pull = 'Primary_Horizontal_Pull',
  Primary_Vertical_Pull = 'Primary_Vertical_Pull',
  Unilateral_Squat_Lunge = 'Unilateral_Squat_Lunge',
  Unilateral_Hinge = 'Unilateral_Hinge',
  Isolation_Chest_Fly = 'Isolation_Chest_Fly',
  Isolation_Lateral_Delt = 'Isolation_Lateral_Delt',
  Isolation_Bicep_Flexion = 'Isolation_Bicep_Flexion',
  Isolation_Tricep_Extension = 'Isolation_Tricep_Extension',
  Isolation_Hamstring_Curl = 'Isolation_Hamstring_Curl',
  Isolation_Quad_Extension = 'Isolation_Quad_Extension',
  Isolation_Calf_Raise = 'Isolation_Calf_Raise',
  Trunk_Flexion = 'Trunk_Flexion',
  Trunk_Anti_Extension = 'Trunk_Anti_Extension',
  Conditioning_Metabolic_Finisher = 'Conditioning_Metabolic_Finisher',
}

export enum MovementPattern {
  Squat = 'Squat',
  Hinge = 'Hinge',
  HPress = 'HPress',
  VPress = 'VPress',
  HPull = 'HPull',
  VPull = 'VPull',
  Iso = 'Iso',
  Core = 'Core',
  Cond = 'Cond',
}

export enum ContraindicationTag {
  Shoulder_Impingement = 'shoulder_impingement',
  Lower_Back_Shearing = 'lower_back_shearing',
  Knee_Shear = 'knee_shear',
  Wrist_Extension = 'wrist_extension',
}

// Type aliases for strict array checks
export type StrictStringReplacementGroup = `${ReplacementGroup}`;

// --- CORE SURFACES ---

export interface Exercise {
  external_id: string;
  name: string;
  movement_pattern: MovementPattern;
  architectural_group: ReplacementGroup;
  equipment_category: EquipmentCategory;
  is_unilateral: boolean;
  setup_complexity: SetupComplexity;
  fatigue_cost: FatigueCost;
  tier: ExerciseTier;
  progression_types: ProgressionModel[];
  contraindications: ContraindicationTag[];
  estimated_duration_seconds: number;
}

export interface PlanTemplateSlot {
  order_index: number;
  architectural_group: ReplacementGroup;
  is_required: boolean;
  archetype: SlotArchetype;
  progression_model: ProgressionModel;
  sets: number;
  reps_min: number;
  reps_max: number;
  target_rpe: number;
  rest_seconds: number;
}

export interface PlanTemplateDay {
  day_number: number;
  day_type: DayType;
  slots: PlanTemplateSlot[];
}

export interface PlanTemplate {
  external_id: string;
  name: string;
  goal_bucket: GoalBucket;
  training_style: TrainingStyle;
  days_per_week: number;
  lift_comfort: LiftComfort;
  environment: SessionEnvironment;
  experience_level: ExperienceLevel;
  days: PlanTemplateDay[];
}

export interface PlanFamily {
  external_id: string;
  name: string;
  description: string;
  template_id: string;
  experience_level: ExperienceLevel;
  goal_bucket: GoalBucket;
}

// --- HYDRATION OUTPUT (ARCHITECT) ---

export interface WorkoutExercise extends Exercise {
  sets: number;
  reps_min: number;
  reps_max: number;
  target_rpe: number;
  rest_seconds: number;
  progression_model: ProgressionModel;
  selection_metadata: {
    reason: string;
    fallback_path?: string;
    score_breakdown: {
      tier: number;
      seeded_score: number;
      heuristic_score: number;
      complexity_score: number;
    };
  };
}

export interface WorkoutDay {
  day_number: number;
  day_type: DayType;
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  family_id: string;
  template_id: string;
  user_persona: string;
  days: WorkoutDay[];
}

// --- USER SWAP ENGINE (WEEK 1.3) ---

export enum SwapReason {
  EquipmentUnavailable = 'EquipmentUnavailable',
  InjuryPain = 'InjuryPain',
  TooDifficult = 'TooDifficult',
  TooEasy = 'TooEasy',
  SetupTooComplex = 'SetupTooComplex',
  Preference = 'Preference',
}

export enum ContinuityMethod {
  Continue = 'continue',
  Modified = 'modified',
  Reset = 'reset',
}

export interface SwapAlternative {
  exercise: Exercise;
  benefit_tag: string;     // e.g. "Lower back friendly", "Stable machine"
  reliability_score: number; // 0-100
  match_label: string;     // 'Coach Match', 'Good Fit', etc.
  continuity_recommendation: ContinuityMethod;
}

export interface UserSwapRecord {
  id: string;
  user_id: string;
  original_exercise_id: string;
  new_exercise_id: string;
  replacement_group: ReplacementGroup;
  reason: SwapReason;
  continuity_method: ContinuityMethod;
  timestamp: Date;
}
