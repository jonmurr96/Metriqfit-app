import { ReplacementGroup } from '../../types/v1_engine.ts';

export interface ExerciseSubstitution {
  original_external_id: string;
  alternative_external_id: string;
  compatibility_score: number;
}

/**
 * Seeded compatibility scores for exercise substitutions.
 * Used by the Architect to rank alternatives when the primary choice is unavailable.
 */
export const coreSubstitutions: ExerciseSubstitution[] = [
  // SQUAT FALLBACKS
  { original_external_id: 'ex_barbell_back_squat', alternative_external_id: 'ex_leg_press', compatibility_score: 95 },
  { original_external_id: 'ex_barbell_back_squat', alternative_external_id: 'ex_hack_squat', compatibility_score: 90 },
  { original_external_id: 'ex_barbell_back_squat', alternative_external_id: 'ex_goblet_squat', compatibility_score: 85 },
  { original_external_id: 'ex_barbell_back_squat', alternative_external_id: 'ex_smith_bench_press', compatibility_score: 0 }, // Safety check: should be 0 or omit

  // HINGE FALLBACKS
  { original_external_id: 'ex_barbell_deadlift', alternative_external_id: 'ex_barbell_rdl', compatibility_score: 95 },
  { original_external_id: 'ex_barbell_deadlift', alternative_external_id: 'ex_db_rdl', compatibility_score: 90 },
  { original_external_id: 'ex_barbell_deadlift', alternative_external_id: 'ex_leg_press', compatibility_score: 40 }, // Distance match is low but functional

  // PRESS FALLBACKS
  { original_external_id: 'ex_barbell_bench_press', alternative_external_id: 'ex_db_flat_bench_press', compatibility_score: 98 },
  { original_external_id: 'ex_barbell_bench_press', alternative_external_id: 'ex_machine_chest_press', compatibility_score: 92 },
  { original_external_id: 'ex_barbell_bench_press', alternative_external_id: 'ex_push_up', compatibility_score: 80 },

  // VERTICAL PRESS
  { original_external_id: 'ex_barbell_overhead_press', alternative_external_id: 'ex_db_shoulder_press', compatibility_score: 95 },
  { original_external_id: 'ex_barbell_overhead_press', alternative_external_id: 'ex_machine_shoulder_press', compatibility_score: 90 },
];

/**
 * Approved secondary group fallbacks for the Architect fallback ladder.
 */
export const secondaryGroupFallbacks: Record<string, ReplacementGroup> = {
  [ReplacementGroup.Primary_Bilateral_Squat]: ReplacementGroup.Unilateral_Squat_Lunge,
  [ReplacementGroup.Primary_Bilateral_Hinge]: ReplacementGroup.Unilateral_Hinge,
  [ReplacementGroup.Primary_Horizontal_Press]: ReplacementGroup.Isolation_Chest_Fly,
  [ReplacementGroup.Primary_Vertical_Press]: ReplacementGroup.Isolation_Lateral_Delt,
  [ReplacementGroup.Primary_Horizontal_Pull]: ReplacementGroup.Primary_Vertical_Pull,
  [ReplacementGroup.Primary_Vertical_Pull]: ReplacementGroup.Primary_Horizontal_Pull,
};
