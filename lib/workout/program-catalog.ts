export type WorkoutProgramSourceModel =
  | 'generated'
  | 'v2_template'
  | 'custom_builder'
  | 'legacy_template'
  | 'v1_architect'
  | 'v3_deterministic';

export type WeekdayCode =
  | 'mon'
  | 'tue'
  | 'wed'
  | 'thu'
  | 'fri'
  | 'sat'
  | 'sun';

export type WorkoutDayType =
  | 'workout'
  | 'rest'
  | 'conditioning'
  | 'recovery'
  | 'active_recovery';

export const WEEKDAY_SEQUENCE: WeekdayCode[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const FAMILY_FALLBACK_ORDER = [
  'bro_split_5',
  'arnold_split_6',
  'ppl_3',
  'ppl_6',
  'ppl_ul_hybrid_5',
  'upper_lower_4',
  'upper_lower_5',
  'phul_4',
  'phat_5',
  'powerbuilding_5',
  'full_body_beginner_3',
  'full_body_strength_3',
  'novice_linear_strength_3',
  'five_three_one_variant_4',
  'conjugate_4',
  'athletic_performance_5',
  'conditioning_hybrid_4',
  'calisthenics_foundation_4',
  'rehab_resilience_3',
  'minimalist_full_body_2',
  'home_dumbbell_4',
  'bodyweight_only_3',
  'glute_focus_4',
  'general_fitness_beginner_3',
] as const;

export interface WeeklyLayoutAssignment {
  weekday: WeekdayCode;
  planDayId: string | null;
  sessionType: 'workout' | 'rest' | 'conditioning' | 'active_recovery';
}

export interface WorkoutProgramDayBlueprint {
  id: string;
  sequenceIndex: number;
  dayType: WorkoutDayType;
  name: string;
  focus: string | null;
  estimatedDurationMin: number | null;
  exerciseCount: number;
}

export interface WorkoutProgramCatalogItem {
  id: string;
  name: string;
  description: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  daysPerWeek: number;
  durationWeeks: number | null;
  familyKey: string | null;
  familyDisplayName: string | null;
  progressionModel: string | null;
  goalTags: string[];
  trainingStyleTags: string[];
  equipmentRequired: string[];
  targetAudience: string | null;
  sourceModel: WorkoutProgramSourceModel;
  dayBlueprint: WorkoutProgramDayBlueprint[];
}

export interface UserWorkoutPlanProgramMeta {
  sourceModel: WorkoutProgramSourceModel;
  programTemplateV2Id: string | null;
  programFamilyKey: string | null;
  progressionModel: string | null;
  trainingStyleTags: string[];
  goalTags: string[];
  weeklyLayout: WeeklyLayoutAssignment[];
}

export function normalizeWeekday(value: string | null | undefined): WeekdayCode | null {
  const normalized = String(value || '').trim().toLowerCase().slice(0, 3);
  return WEEKDAY_SEQUENCE.includes(normalized as WeekdayCode)
    ? normalized as WeekdayCode
    : null;
}

export function normalizeWorkoutDayType(value: string | null | undefined): WorkoutDayType {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'conditioning') return 'conditioning';
  if (normalized === 'recovery') return 'recovery';
  if (normalized === 'active_recovery') return 'active_recovery';
  if (normalized === 'rest') return 'rest';
  return 'workout';
}

export function toScheduleSessionType(dayType: WorkoutDayType): WeeklyLayoutAssignment['sessionType'] {
  if (dayType === 'conditioning') return 'conditioning';
  if (dayType === 'recovery' || dayType === 'active_recovery') return 'active_recovery';
  if (dayType === 'rest') return 'rest';
  return 'workout';
}

function sortWeekdaysByPreferredOffDays(preferredDaysOff: WeekdayCode[]) {
  const offDaySet = new Set(preferredDaysOff);
  const preferred = WEEKDAY_SEQUENCE.filter((weekday) => !offDaySet.has(weekday));
  const remaining = WEEKDAY_SEQUENCE.filter((weekday) => offDaySet.has(weekday));
  return [...preferred, ...remaining];
}

export function buildWeeklyLayout(input: {
  planDays: Array<{ id: string; dayType?: string | null }>;
  daysPerWeek: number;
  preferredDaysOff?: string[] | null;
}): WeeklyLayoutAssignment[] {
  const planDays = input.planDays.filter((day) => !!day?.id);
  const preferredDaysOff = (input.preferredDaysOff || [])
    .map((value) => normalizeWeekday(value))
    .filter(Boolean) as WeekdayCode[];

  const orderedWeekdays = sortWeekdaysByPreferredOffDays(preferredDaysOff);
  const assignedDays = orderedWeekdays.slice(0, Math.max(0, Math.min(WEEKDAY_SEQUENCE.length, input.daysPerWeek)));
  const assignmentsByDay = new Map<WeekdayCode, WeeklyLayoutAssignment>();

  let cursor = 0;
  for (const weekday of WEEKDAY_SEQUENCE) {
    if (!assignedDays.includes(weekday) || planDays.length === 0) {
      assignmentsByDay.set(weekday, {
        weekday,
        planDayId: null,
        sessionType: 'rest',
      });
      continue;
    }

    const planDay = planDays[cursor % planDays.length];
    const dayType = normalizeWorkoutDayType(planDay.dayType);
    assignmentsByDay.set(weekday, {
      weekday,
      planDayId: planDay.id,
      sessionType: toScheduleSessionType(dayType),
    });
    cursor += 1;
  }

  return WEEKDAY_SEQUENCE.map((weekday) => assignmentsByDay.get(weekday)!).filter(Boolean);
}

export function normalizeWeeklyLayout(
  raw: unknown,
  planDays: Array<{ id: string; dayType?: string | null }>,
  daysPerWeek: number,
  preferredDaysOff?: string[] | null,
): WeeklyLayoutAssignment[] {
  if (Array.isArray(raw)) {
    const normalized = raw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const weekday = normalizeWeekday((entry as { weekday?: string }).weekday);
        if (!weekday) return null;
        const planDayId = typeof (entry as { planDayId?: unknown }).planDayId === 'string'
          ? (entry as { planDayId: string }).planDayId
          : null;
        const sessionType = String((entry as { sessionType?: string }).sessionType || '').toLowerCase();
        const normalizedSessionType =
          sessionType === 'conditioning'
            ? 'conditioning'
            : sessionType === 'active_recovery'
              ? 'active_recovery'
              : sessionType === 'workout'
                ? 'workout'
                : 'rest';
        return {
          weekday,
          planDayId,
          sessionType: normalizedSessionType,
        } satisfies WeeklyLayoutAssignment;
      })
      .filter(Boolean) as WeeklyLayoutAssignment[];

    if (normalized.length === WEEKDAY_SEQUENCE.length) {
      const seen = new Set(normalized.map((entry) => entry.weekday));
      if (seen.size === WEEKDAY_SEQUENCE.length) {
        return WEEKDAY_SEQUENCE.map((weekday) => normalized.find((entry) => entry.weekday === weekday)!).filter(Boolean);
      }
    }
  }

  return buildWeeklyLayout({
    planDays,
    daysPerWeek,
    preferredDaysOff,
  });
}

export function summarizeWeeklyLayout(layout: WeeklyLayoutAssignment[]) {
  return layout
    .filter((entry) => entry.sessionType !== 'rest')
    .map((entry) => entry.weekday.toUpperCase())
    .join(' • ');
}

export function buildBlueprintSummary(days: WorkoutProgramDayBlueprint[]) {
  return days
    .filter((day) => day.dayType === 'workout')
    .slice(0, 5)
    .map((day) => day.name)
    .join(' / ');
}

export function sortFamilyRecords<T extends { external_key?: string | null; display_name?: string | null }>(families: T[]) {
  const order = new Map<string, number>(FAMILY_FALLBACK_ORDER.map((key, index) => [key, index]));

  return [...families].sort((a, b) => {
    const aRank = order.get(String(a.external_key || ''));
    const bRank = order.get(String(b.external_key || ''));
    if (aRank !== undefined || bRank !== undefined) {
      return (aRank ?? Number.MAX_SAFE_INTEGER) - (bRank ?? Number.MAX_SAFE_INTEGER);
    }
    return String(a.display_name || '').localeCompare(String(b.display_name || ''));
  });
}
