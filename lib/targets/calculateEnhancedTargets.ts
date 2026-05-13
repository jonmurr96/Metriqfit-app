import {
  calculateTargets,
  type CarbTolerance,
  type DayMacroTargets,
  type TargetInput,
} from './calculateTargets';

export interface EnhancedTargetInput extends TargetInput {
  carb_tolerance?: CarbTolerance | null;
}

export type DayTargets = DayMacroTargets;

export interface EnhancedTargetOutput {
  trainingDay: DayTargets;
  restDay: DayTargets;
  computation_method: string;
  water_ml: number;
}

export function calculateEnhancedTargets(input: EnhancedTargetInput): EnhancedTargetOutput {
  const targets = calculateTargets(input);
  return {
    trainingDay: targets.trainingDay,
    restDay: targets.restDay,
    computation_method: targets.computation_method,
    water_ml: targets.water_ml,
  };
}

export function getMacroSplitDescription(carbTolerance: CarbTolerance): string {
  switch (carbTolerance) {
    case 'energized_satiated':
      return 'Balanced macros with moderate carbs for sustained energy';
    case 'hungry_quickly':
      return 'Higher carb approach for improved satiety';
    case 'tired_sleepy':
      return 'Moderate-low carbs to prevent energy crashes';
    case 'bloated':
      return 'Lower carb, higher fat for digestive comfort';
    default:
      return 'Balanced macro approach';
  }
}
