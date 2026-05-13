import { GoalBucket, LiftComfort, ExperienceLevel, SessionEnvironment } from '../../types/v1_engine.ts';

export type OnboardingProfileInput = {
  userId?: string;
  experienceLevel: ExperienceLevel;
  primaryGoal: GoalBucket;
  daysPerWeek: number;
  liftComfort: LiftComfort;
  environment: SessionEnvironment;
  sessionDurationMin?: number;
  preferredSplitFamily?: string | null;
};

export type LibrarianRecommendation = {
  familyIdRef: string; // The external lookup string for PlanFamilies (e.g. 'fam_beginner_fullbody_v1')
  confidence: 'HIGH' | 'MODERATE' | 'FALLBACK';
  notes: string;
};

// Maps explicit split family keys to their required day count.
// If the user's requested days match, the router honors the preference;
// otherwise it falls back to the adaptive family for that day count.
const EXPLICIT_SPLIT_FAMILY_DAYS: Record<string, number> = {
  fam_upper_lower_full_3day: 3,
  fam_ppl_3day: 3,
  fam_ppl_6day: 6,
  fam_brosplit_4day: 4,
  fam_brosplit_5day: 5,
};

/**
 * The Librarian: Responsible for deterministic assignment of a user configuration to a V1 Plan Family.
 *
 * PRIORITY ORDER:
 * 1. Honor explicit split family preference when it matches the requested day count.
 * 2. Honor exact requested workout frequency from 2-6 days.
 * 3. Lock the route to the user's experience level.
 * 4. Defer goal, equipment, injury, and set-technique adaptation to the Architect.
 * 5. Never fall through from beginner to intermediate or advanced templates.
 */
export const routeUserToPlan = (profile: OnboardingProfileInput): LibrarianRecommendation => {
  const { experienceLevel, primaryGoal, daysPerWeek, liftComfort, environment, preferredSplitFamily } = profile;
  const supportedDays = Math.max(2, Math.min(6, Math.round(daysPerWeek || 3)));
  const experienceKey =
    experienceLevel === ExperienceLevel.Advanced
      ? 'advanced'
      : experienceLevel === ExperienceLevel.Intermediate
        ? 'intermediate'
        : 'beginner';

  // Honor explicit split family if it exists in the catalog and matches the requested day count.
  // Beginners are routed to adaptive regardless — explicit splits assume baseline barbell familiarity.
  if (
    preferredSplitFamily
    && preferredSplitFamily in EXPLICIT_SPLIT_FAMILY_DAYS
    && EXPLICIT_SPLIT_FAMILY_DAYS[preferredSplitFamily] === supportedDays
    && experienceLevel !== ExperienceLevel.Beginner
  ) {
    return {
      familyIdRef: preferredSplitFamily,
      confidence: 'HIGH',
      notes: [
        `Honored explicit split preference: ${preferredSplitFamily}.`,
        `${supportedDays}-day ${experienceKey} route.`,
        `Goal ${primaryGoal}, environment ${environment}, comfort ${liftComfort}.`,
      ].join(' '),
    };
  }

  const familyIdRef = `fam_adaptive_${experienceKey}_${supportedDays}_day`;

  return {
    familyIdRef,
    confidence: supportedDays === daysPerWeek ? 'HIGH' : 'MODERATE',
    notes: [
      `Exact ${supportedDays}-day ${experienceKey} adaptive route.`,
      `Goal ${primaryGoal}, environment ${environment}, comfort ${liftComfort}.`,
      'Template preserves requested frequency; architect adapts exercise selection, volume, intensity techniques, and equipment constraints.',
    ].join(' '),
  };
};
