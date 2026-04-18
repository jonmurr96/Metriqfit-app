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
  fam_minimalist_2_day_strength: [2],
  fam_minimalist_2_day_aesthetics: [2],
  fam_minimalist_2_day_athletic: [2],
  fam_recomp_fb: [3],
  fam_recomp_ul: [4],
  fam_str_5_day: [5],
  fam_hyp_5_day: [5],
  fam_athletic_ul: [4],
  fam_fatloss_ul: [4],
  fam_db_only_ul: [4],
  fam_bw_skill_ul: [4],
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
 * 2. Specialized 2-Day Routing — all daysPerWeek === 2 exits cleanly here
 * 3. Lift Comfort Hard Constraints (No Barbell, Machine/DB) — 3+ day paths
 * 4. Safety/Experience (Beginner lockouts) — 3+ day paths
 * 5. Goal Bucket — 3+ day paths
 *
 * ─── 2-DAY FAMILY PRECEDENCE ──────────────────────────────────────────────
 * fam_minimalist_2_day_strength  → GoalBucket.Strength + Barbell comfort
 *                                  (replaces fam_str_2_day for minimalist users)
 * fam_minimalist_2_day_aesthetics→ GoalBucket.Hypertrophy
 *                                  (replaces fam_hyp_2_day for minimalist users)
 * fam_minimalist_2_day_athletic  → GoalBucket.Athletic
 *                                  (dedicated path; does NOT collapse into strength)
 * fam_minimalist_2_day           → GenFitness, FatLoss, Recomp, or Strength
 *                                  without barbell comfort (generic fallback)
 *
 * Legacy generic 2-day families (fam_hyp_2_day, fam_str_2_day, fam_gen_2_day)
 * are intentionally NOT reachable from this router for 2-day profiles.
 * They remain in the family catalog for admin assignment and future expansion.
 * ──────────────────────────────────────────────────────────────────────────
 */
export const routeUserToPlan = (profile: OnboardingProfileInput): LibrarianRecommendation => {
  const { experienceLevel, primaryGoal, daysPerWeek, liftComfort, environment } = profile;

  // 1. Environment Hard Overrides
  // Bodyweight is the absolute constraint
  if (environment === SessionEnvironment.Bodyweight) {
    if (daysPerWeek === 4 && supportsRequestedDays('fam_bw_skill_ul', daysPerWeek)) {
      return {
        familyIdRef: 'fam_bw_skill_ul',
        confidence: 'HIGH',
        notes: 'Bodyweight Skill routing for 4-day frequency.',
      };
    }
    if (supportsRequestedDays('fam_at_home_bw', daysPerWeek)) {
      return {
        familyIdRef: 'fam_at_home_bw',
        confidence: 'HIGH',
        notes: 'Strict Bodyweight routing mandated by environment.',
      };
    }
  }

  // 2. Specialized 2-Day Routing
  // If the user only has 2 days, we route them entirely through the highly-optimized minimalist tracks.
  if (daysPerWeek === 2) {
    if (primaryGoal === GoalBucket.Strength) {
      // Strength requires Barbells. If they don't want barbells, fall back to generic.
      if (liftComfort === LiftComfort.BarbellAdv || liftComfort === LiftComfort.BarbellBasic) {
        return {
          familyIdRef: 'fam_minimalist_2_day_strength',
          confidence: 'HIGH',
          notes: 'Strength goal at 2 days/week maps to Minimalist Strength Full Body.',
        };
      }
      return {
        familyIdRef: 'fam_minimalist_2_day',
        confidence: 'MODERATE',
        notes: 'Strength goal at 2 days/week but lacking barbell comfort routes to generic Minimalist.',
      };
    }

    if (primaryGoal === GoalBucket.Hypertrophy) {
      return {
        familyIdRef: 'fam_minimalist_2_day_aesthetics',
        confidence: 'HIGH',
        notes: 'Hypertrophy goal at 2 days/week maps to Minimalist Aesthetics Full Body.',
      };
    }

    if (primaryGoal === GoalBucket.Athletic) {
      return {
        familyIdRef: 'fam_minimalist_2_day_athletic',
        confidence: 'HIGH',
        notes: 'Athletic goal at 2 days/week maps to Minimalist Performance.',
      };
    }

    if (primaryGoal === GoalBucket.Recomp) {
      return {
        familyIdRef: 'fam_minimalist_2_day_aesthetics',
        confidence: 'HIGH',
        notes: 'Body Recomp goal at 2 days/week maps to Minimalist Aesthetics (closest physiological match).',
      };
    }

    // Default Fallback for GenFitness, FatLoss, Maintain, Bodyweight constraints, etc.
    return {
      familyIdRef: 'fam_minimalist_2_day',
      confidence: 'HIGH',
      notes: 'General, Fat Loss, or non-specific 2-day requests route to standard Minimalist Full Body.',
    };
  }

  // 3. Environment/Comfort Fallbacks for 3+ Days
  if (environment === SessionEnvironment.Home || environment === SessionEnvironment.AptHotel) {
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
    if (daysPerWeek === 4 && supportsRequestedDays('fam_db_only_ul', daysPerWeek)) {
      return {
        familyIdRef: 'fam_db_only_ul',
        confidence: 'HIGH',
        notes: 'User avoids barbells in commercial gym -> DB UL specialist.',
      };
    }
    if (supportsRequestedDays('fam_min_equip_db', daysPerWeek)) {
      return {
        familyIdRef: 'fam_min_equip_db',
        confidence: 'HIGH',
        notes: 'User avoids barbells in commercial gym -> DB fallback.',
      };
    }
  }

  // 4. Safety/Experience Constraints (For 3+ days)
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

  // 5. Goal-Based Routing (Assuming Commercial Gym + Barbell Comfort, 3+ Days)

  // Hypertrophy Tracks
  if (primaryGoal === GoalBucket.Hypertrophy) {
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
    if (daysPerWeek === 5) {
      return {
        familyIdRef: 'fam_str_5_day',
        confidence: 'HIGH',
        notes: 'Strength 5-day maps to optimized PPL-UL Strength split.',
      };
    }
    if (daysPerWeek >= 4) {
      return {
        familyIdRef: 'fam_str_ul',
        confidence: 'HIGH',
        notes: 'Strength 4-day (or 6-day fallback) maps to Upper/Lower.',
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
    if (daysPerWeek === 4 && supportsRequestedDays('fam_fatloss_ul', daysPerWeek)) {
      return {
        familyIdRef: 'fam_fatloss_ul',
        confidence: 'HIGH',
        notes: 'Fat Loss 4-day routes to specialized Upper/Lower metabolic density.',
      };
    }
    return {
      familyIdRef: 'fam_fatloss_fb',
      confidence: 'MODERATE',
      notes: 'Fat Loss defaults to Strength-Maintenance Full Body.',
    };
  }

  // Recomposition Tracks (High Density)
  if (primaryGoal === GoalBucket.Recomp) {
    if (daysPerWeek === 3) {
      return {
        familyIdRef: 'fam_recomp_fb',
        confidence: 'HIGH',
        notes: 'Recomp 3-day maps to specialized density-based Full Body.',
      };
    }
    if (daysPerWeek === 4) {
      return {
        familyIdRef: 'fam_recomp_ul',
        confidence: 'HIGH',
        notes: 'Recomp 4-day maps to specialized density-based Upper/Lower.',
      };
    }
  }

  // General Fitness / Athletic / Recomp (5-6 day fallback)
  if (primaryGoal === GoalBucket.GenFitness || primaryGoal === GoalBucket.Recomp || primaryGoal === GoalBucket.Athletic) {
    if (daysPerWeek === 5) {
      return {
        familyIdRef: 'fam_hyp_5_day',
        confidence: 'MODERATE',
        notes: '5-Day requests route to optimized Hypertrophy PPL-UL.',
      };
    }
    if (daysPerWeek >= 6) {
      return {
        familyIdRef: 'fam_hyp_ppl',
        confidence: 'MODERATE',
        notes: '6+ Day requests route to Hypertrophy PPL.',
      };
    }
    if (daysPerWeek >= 4) {
      if (primaryGoal === GoalBucket.Athletic && daysPerWeek === 4 && supportsRequestedDays('fam_athletic_ul', daysPerWeek)) {
        return {
          familyIdRef: 'fam_athletic_ul',
          confidence: 'HIGH',
          notes: 'Athletic 4-day routes to performance-focused Upper/Lower.',
        };
      }
      return {
        familyIdRef: 'fam_hyp_ul',
        confidence: 'MODERATE',
        notes: '4-Day GenFit/Athletic routes to Hypertrophy Upper/Lower.',
      };
    }
    // 3-Day cases for Athletic/GenFit
    if (daysPerWeek === 3) {
      return {
        familyIdRef: 'fam_hyp_fb',
        confidence: 'MODERATE',
        notes: '3-Day Athletic/GenFit routes to Hypertrophy Full Body.',
      };
    }
  }

  // 6. Universal Fallback
  return {
    familyIdRef: 'fam_beginner_fb',
    confidence: 'FALLBACK',
    notes: 'Edge case triggered fallback to universal beginner baseline.',
  };
};
