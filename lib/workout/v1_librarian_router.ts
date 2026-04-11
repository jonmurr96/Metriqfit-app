import { GoalBucket, LiftComfort, ExperienceLevel, SessionEnvironment } from '../../types/v1_engine.ts';

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

const CONSTRAINED_FAMILY_SUPPORTED_DAYS: Record<string, number[]> = {
  fam_at_home_bw: [3],
  fam_min_equip_db: [3],
  fam_beginner_machine_fb: [3],
  fam_beginner_fb: [3],
  fam_minimalist_2_day: [2],
};

const supportsRequestedDays = (familyIdRef: string, daysPerWeek: number): boolean => {
  const supportedDays = CONSTRAINED_FAMILY_SUPPORTED_DAYS[familyIdRef];
  return supportedDays ? supportedDays.includes(daysPerWeek) : true;
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
  if (environment === SessionEnvironment.Bodyweight && supportsRequestedDays('fam_at_home_bw', daysPerWeek)) {
    return {
      familyIdRef: 'fam_at_home_bw',
      confidence: 'HIGH',
      notes: 'Strict Bodyweight routing mandated by environment.',
    };
  }

  // Home or Apt/Hotel with limited equipment
  if (environment === SessionEnvironment.Home || environment === SessionEnvironment.AptHotel) {
    if (daysPerWeek === 2 && supportsRequestedDays('fam_minimalist_2_day', daysPerWeek)) {
      return {
        familyIdRef: 'fam_minimalist_2_day',
        confidence: 'HIGH',
        notes: 'Constrained environment at 2 days/week routes to Minimalist Full Body.',
      };
    }
    if (
      (liftComfort === LiftComfort.NoBarbell || liftComfort === LiftComfort.MachineDB)
      && supportsRequestedDays('fam_min_equip_db', daysPerWeek)
    ) {
      return {
        familyIdRef: 'fam_min_equip_db',
        confidence: 'HIGH',
        notes: 'Limited environment with No Barbell/Machine preference forces DB routing.',
      };
    }
  }

  // 2. Lift Comfort Hard Overrides
  if (liftComfort === LiftComfort.NoBarbell || liftComfort === LiftComfort.MachineDB) {
    if (daysPerWeek === 2 && supportsRequestedDays('fam_minimalist_2_day', daysPerWeek)) {
      return {
        familyIdRef: 'fam_minimalist_2_day',
        confidence: 'HIGH',
        notes: 'Machine/DB or No Barbell preference at 2 days/week routes to Minimalist Full Body.',
      };
    }
  }

  // (Commercial Gym but user avoids Barbells)
  if (liftComfort === LiftComfort.NoBarbell) {
    // If beginner, they get the Machine/DB Full Body
    if (
      experienceLevel === ExperienceLevel.Beginner
      && supportsRequestedDays('fam_beginner_machine_fb', daysPerWeek)
    ) {
      return {
        familyIdRef: 'fam_beginner_machine_fb',
        confidence: 'HIGH',
        notes: 'Beginner + No Barbell comfort -> Machine/DB path.',
      };
    }
    // Otherwise, they get the high-volume DB path
    if (supportsRequestedDays('fam_min_equip_db', daysPerWeek)) {
      return {
        familyIdRef: 'fam_min_equip_db',
        confidence: 'HIGH',
        notes: 'User avoids barbells in commercial gym -> DB fallback.',
      };
    }
  }

  // 3. Safety/Experience Constraints
  if (experienceLevel === ExperienceLevel.Beginner) {
    if (
      liftComfort === LiftComfort.MachineDB
      && supportsRequestedDays('fam_beginner_machine_fb', daysPerWeek)
    ) {
      return {
        familyIdRef: 'fam_beginner_machine_fb',
        confidence: 'HIGH',
        notes: 'Beginner with Machine preference.',
      };
    }
    if (supportsRequestedDays('fam_beginner_fb', daysPerWeek)) {
      return {
        familyIdRef: 'fam_beginner_fb',
        confidence: 'HIGH',
        notes: 'Standard beginner barbell protocol.',
      };
    }
  }

  // 4. Goal-Based Routing (Assuming Commercial Gym + Barbell Comfort)

  // Hypertrophy Tracks
  if (primaryGoal === GoalBucket.Hypertrophy) {
    if (daysPerWeek === 2) {
      return {
        familyIdRef: 'fam_hyp_2_day',
        confidence: 'HIGH',
        notes: 'Hypertrophy 2-day maps to specialized full body split.',
      };
    }
    if (daysPerWeek <= 3) {
      return {
        familyIdRef: 'fam_hyp_fb',
        confidence: 'HIGH',
        notes: 'Hypertrophy 3-day maps to Full Body.',
      };
    }
    if (daysPerWeek === 5) {
      return {
        familyIdRef: 'fam_hyp_5_day',
        confidence: 'HIGH',
        notes: 'Hypertrophy 5-day routes to the optimized PPL-UL split.',
      };
    }
    if (daysPerWeek >= 6) {
      return {
        familyIdRef: 'fam_hyp_ppl',
        confidence: 'HIGH',
        notes: 'Hypertrophy 6+ days routes to traditional Push-Pull-Legs.',
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
    if (daysPerWeek === 2) {
      return {
        familyIdRef: 'fam_str_2_day',
        confidence: 'HIGH',
        notes: 'Strength 2-day maps to low-frequency powerlift compound focus.',
      };
    }
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
    if (daysPerWeek === 2) {
      return {
        familyIdRef: 'fam_gen_2_day',
        confidence: 'HIGH',
        notes: 'General Fitness 2-day maps to maintenance/longevity full body.',
      };
    }
    if (daysPerWeek === 5) {
      return {
        familyIdRef: 'fam_hyp_5_day',
        confidence: 'MODERATE',
        notes: '5-Day GenFit/Recomp routes to optimized Hypertrophy PPL-UL.',
      };
    }
    if (daysPerWeek >= 6) {
      return {
        familyIdRef: 'fam_hyp_ppl',
        confidence: 'MODERATE',
        notes: '6+ Day GenFit/Recomp routes to Hypertrophy PPL.',
      };
    }
    if (daysPerWeek >= 4) {
      return {
        familyIdRef: 'fam_hyp_ul',
        confidence: 'MODERATE',
        notes: '4-Day GenFit/Recomp routes to Hypertrophy Upper/Lower.',
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
