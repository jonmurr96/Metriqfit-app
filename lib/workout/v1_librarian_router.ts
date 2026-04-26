import { GoalBucket, LiftComfort, ExperienceLevel, SessionEnvironment } from '../../types/v1_engine.ts';

export type OnboardingProfileInput = {
  userId?: string;
  experienceLevel: ExperienceLevel;
  primaryGoal: GoalBucket;
  daysPerWeek: number;
  liftComfort: LiftComfort;
  environment: SessionEnvironment;
  sessionDurationMin?: number;
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
 * 1. Honor exact requested workout frequency from 2-6 days.
 * 2. Lock the route to the user's experience level.
 * 3. Defer goal, equipment, injury, and set-technique adaptation to the Architect.
 * 4. Never fall through from beginner to intermediate or advanced templates.
 */
export const routeUserToPlan = (profile: OnboardingProfileInput): LibrarianRecommendation => {
  const { experienceLevel, primaryGoal, daysPerWeek, liftComfort, environment } = profile;
  const supportedDays = Math.max(2, Math.min(6, Math.round(daysPerWeek || 3)));
  const experienceKey =
    experienceLevel === ExperienceLevel.Advanced
      ? 'advanced'
      : experienceLevel === ExperienceLevel.Intermediate
        ? 'intermediate'
        : 'beginner';

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
