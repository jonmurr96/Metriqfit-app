import { GoalBucket, LiftComfort, ExperienceLevel, SessionEnvironment, TrainingStyle } from '../../types/v1_engine.ts';

export type OnboardingProfileInput = {
  userId?: string;
  experienceLevel: ExperienceLevel;
  primaryGoal: GoalBucket;
  daysPerWeek: number;
  liftComfort: LiftComfort;
  environment: SessionEnvironment;
};

export type LibrarianRecommendation = {
  familyIdRef: string; // The external lookup string for PlanFamilies (e.g. 'fam_beginner_fullbody_v1')
  confidence: 'HIGH' | 'MODERATE' | 'FALLBACK';
  notes: string;
};

/**
 * The Librarian: Responsible for deterministic assignment of a user configuration to a V1 Plan Family.
 * 
 * PRIORITY ORDER:
 * 1. Environment Hard Constraints (Bodyweight, Apt/Hotel, Home)
 * 2. Lift Comfort Hard Constraints (No Barbell, Machine/DB)
 * 3. Safety/Experience (Beginner lockouts)
 * 4. Goal Bucket (Hypertrophy, Strength, Fat Loss, GenFit)
 * 5. Refinement (Days per week)
 */
export const routeUserToPlan = (profile: OnboardingProfileInput): LibrarianRecommendation => {
  const { experienceLevel, primaryGoal, daysPerWeek, liftComfort, environment } = profile;

  // 1. Environment Hard Overrides
  // Bodyweight is the absolute constraint
  if (environment === SessionEnvironment.Bodyweight) {
    return {
      familyIdRef: 'fam_at_home_bw',
      confidence: 'HIGH',
      notes: 'Strict Bodyweight routing mandated by environment.',
    };
  }

  // Home or Apt/Hotel with limited equipment forces Minimal Equipment DB path
  if (environment === SessionEnvironment.Home || environment === SessionEnvironment.AptHotel) {
    if (liftComfort === LiftComfort.NoBarbell || liftComfort === LiftComfort.MachineDB) {
      return {
        familyIdRef: 'fam_min_equip_db',
        confidence: 'HIGH',
        notes: 'Limited environment with No Barbell/Machine preference forces DB routing.',
      };
    }
  }

  // 2. Lift Comfort Hard Overrides (Commercial Gym but user avoids Barbells)
  if (liftComfort === LiftComfort.NoBarbell) {
    // If beginner, they get the Machine/DB Full Body
    if (experienceLevel === ExperienceLevel.Beginner) {
      return {
        familyIdRef: 'fam_beginner_machine_fb',
        confidence: 'HIGH',
        notes: 'Beginner + No Barbell comfort -> Machine/DB path.',
      };
    }
    // Otherwise, they get the high-volume DB path
    return {
      familyIdRef: 'fam_min_equip_db',
      confidence: 'HIGH',
      notes: 'User avoids barbells in commercial gym -> DB fallback.',
    };
  }

  // 3. Safety/Experience Constraints
  if (experienceLevel === ExperienceLevel.Beginner) {
    if (liftComfort === LiftComfort.MachineDB) {
      return {
        familyIdRef: 'fam_beginner_machine_fb',
        confidence: 'HIGH',
        notes: 'Beginner with Machine preference.',
      };
    }
    return {
      familyIdRef: 'fam_beginner_fb',
      confidence: 'HIGH',
      notes: 'Standard beginner barbell protocol.',
    };
  }

  // 4. Goal-Based Routing (Assuming Commercial Gym + Barbell Comfort)

  // Hypertrophy Tracks
  if (primaryGoal === GoalBucket.Hypertrophy) {
    if (daysPerWeek <= 3) {
      return {
        familyIdRef: 'fam_hyp_fb',
        confidence: 'HIGH',
        notes: 'Hypertrophy 3-day max forces Full Body structure.',
      };
    }
    if (daysPerWeek >= 5) {
      return {
        familyIdRef: 'fam_hyp_ppl',
        confidence: 'HIGH',
        notes: 'Hypertrophy 5+ days routes to Push-Pull-Legs.',
      };
    }
    return {
      familyIdRef: 'fam_hyp_ul',
      confidence: 'HIGH',
      notes: 'Hypertrophy 4-day sweet spot maps to Upper/Lower.',
    };
  }

  // Strength Tracks
  if (primaryGoal === GoalBucket.Strength) {
    if (daysPerWeek >= 4) {
      return {
        familyIdRef: 'fam_str_ul',
        confidence: 'HIGH',
        notes: 'Strength 4-day maps to Upper/Lower.',
      };
    }
    return {
      familyIdRef: 'fam_str_fb',
      confidence: 'HIGH',
      notes: 'Strength 3-day maps to Full Body.',
    };
  }

  // Fat Loss Tracks
  if (primaryGoal === GoalBucket.FatLoss) {
    return {
      familyIdRef: 'fam_fatloss_fb',
      confidence: 'MODERATE',
      notes: 'Fat Loss defaults to Strength-Maintenance Full Body.',
    };
  }

  // General Fitness / Recomp / Athletic
  if (primaryGoal === GoalBucket.GenFitness || primaryGoal === GoalBucket.Recomp || primaryGoal === GoalBucket.Athletic) {
    if (daysPerWeek >= 4) {
      return {
        familyIdRef: 'fam_hyp_ul',
        confidence: 'MODERATE',
        notes: '4+ Days General Fitness routes to Upper/Lower structure (fam_hyp_ul). No dedicated GenFit UL family is seeded.',
      };
    }
  }

  // 5. Universal Fallback
  return {
    familyIdRef: 'fam_beginner_fb',
    confidence: 'FALLBACK',
    notes: 'Edge case triggered fallback to universal beginner baseline.',
  };
};
