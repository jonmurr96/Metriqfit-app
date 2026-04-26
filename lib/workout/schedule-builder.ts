/**
 * schedule-builder.ts
 *
 * Dynamic weekly schedule builder.
 *
 * Given a split family key + user's actual training days + rest day preferences,
 * produces a concrete day-by-day weekly assignment:
 *   Monday  → Push A
 *   Tuesday → rest
 *   Wednesday → Pull A
 *   Thursday  → rest
 *   Friday    → Legs A
 *   Saturday  → rest
 *   Sunday    → rest
 *
 * Supports all split types. When the split has fewer workout-day templates than
 * the user's training days, templates are cycled. When the user has more rest days
 * than the split expects, the extra rest days are distributed respecting preferred
 * days off.
 */

export type WeekdayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAY_ORDER: WeekdayCode[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export type DayTemplate = {
  /** e.g. 'push_a', 'pull_a', 'legs_a', 'upper_a', 'full_body_a', 'rest' */
  templateKey: string;
  /** Human readable: 'Push A', 'Pull A', 'Legs A', etc. */
  name: string;
  /** The muscle focus tags for exercise selection */
  focusTags: string[];
  /** 'workout' | 'rest' */
  type: 'workout' | 'rest';
};

export type WeeklyDayAssignment = {
  weekday: WeekdayCode;
  template: DayTemplate;
};

// ---------------------------------------------------------------------------
// Split day templates
// ---------------------------------------------------------------------------

const SPLIT_TEMPLATES: Record<string, DayTemplate[]> = {
  // Full Body (2-4 days) — template cycles (A/B for 4 days)
  full_body_beginner_3: [
    { templateKey: 'full_body_a', name: 'Full Body A', focusTags: ['full_body'], type: 'workout' },
    { templateKey: 'full_body_b', name: 'Full Body B', focusTags: ['full_body'], type: 'workout' },
    { templateKey: 'full_body_a', name: 'Full Body A', focusTags: ['full_body'], type: 'workout' },
  ],
  // Upper / Lower (4-day base)
  upper_lower_4: [
    { templateKey: 'upper_a',   name: 'Upper A',  focusTags: ['upper'],     type: 'workout' },
    { templateKey: 'lower_a',   name: 'Lower A',  focusTags: ['legs'],      type: 'workout' },
    { templateKey: 'upper_b',   name: 'Upper B',  focusTags: ['upper'],     type: 'workout' },
    { templateKey: 'lower_b',   name: 'Lower B',  focusTags: ['legs'],      type: 'workout' },
  ],
  upper_lower_5: [
    { templateKey: 'upper_a',   name: 'Upper A (Strength)',     focusTags: ['upper'],     type: 'workout' },
    { templateKey: 'lower_a',   name: 'Lower A (Strength)',     focusTags: ['legs'],      type: 'workout' },
    { templateKey: 'upper_b',   name: 'Upper B (Hypertrophy)',  focusTags: ['upper'],     type: 'workout' },
    { templateKey: 'lower_b',   name: 'Lower B (Hypertrophy)',  focusTags: ['legs'],      type: 'workout' },
    { templateKey: 'upper_c',   name: 'Upper C (Arms/Shoulders)', focusTags: ['upper', 'shoulders'], type: 'workout' },
  ],
  // PPL
  ppl_3: [
    { templateKey: 'push_a',  name: 'Push',  focusTags: ['push'],  type: 'workout' },
    { templateKey: 'pull_a',  name: 'Pull',  focusTags: ['pull'],  type: 'workout' },
    { templateKey: 'legs_a',  name: 'Legs',  focusTags: ['legs'],  type: 'workout' },
  ],
  ppl_6: [
    { templateKey: 'push_a',  name: 'Push A',  focusTags: ['push'],  type: 'workout' },
    { templateKey: 'pull_a',  name: 'Pull A',  focusTags: ['pull'],  type: 'workout' },
    { templateKey: 'legs_a',  name: 'Legs A',  focusTags: ['legs'],  type: 'workout' },
    { templateKey: 'push_b',  name: 'Push B',  focusTags: ['push'],  type: 'workout' },
    { templateKey: 'pull_b',  name: 'Pull B',  focusTags: ['pull'],  type: 'workout' },
    { templateKey: 'legs_b',  name: 'Legs B',  focusTags: ['legs'],  type: 'workout' },
  ],
  ppl_ul_hybrid_5: [
    { templateKey: 'push',  name: 'Push',      focusTags: ['push'],  type: 'workout' },
    { templateKey: 'pull',  name: 'Pull',      focusTags: ['pull'],  type: 'workout' },
    { templateKey: 'legs',  name: 'Legs',      focusTags: ['legs'],  type: 'workout' },
    { templateKey: 'upper', name: 'Upper Mix', focusTags: ['upper'], type: 'workout' },
    { templateKey: 'lower', name: 'Lower Mix', focusTags: ['legs'],  type: 'workout' },
  ],
  // PHUL (Power Hypertrophy Upper Lower)
  phul_4: [
    { templateKey: 'upper_power',  name: 'Upper Power',     focusTags: ['upper'],  type: 'workout' },
    { templateKey: 'lower_power',  name: 'Lower Power',     focusTags: ['legs'],   type: 'workout' },
    { templateKey: 'upper_hyper',  name: 'Upper Hypertrophy', focusTags: ['upper'], type: 'workout' },
    { templateKey: 'lower_hyper',  name: 'Lower Hypertrophy', focusTags: ['legs'],  type: 'workout' },
  ],
  // PHAT
  phat_5: [
    { templateKey: 'upper_power',  name: 'Upper Power',      focusTags: ['upper'],  type: 'workout' },
    { templateKey: 'lower_power',  name: 'Lower Power',      focusTags: ['legs'],   type: 'workout' },
    { templateKey: 'back_chest',   name: 'Back & Chest Hyper', focusTags: ['back', 'chest'], type: 'workout' },
    { templateKey: 'legs_hyper',   name: 'Legs Hypertrophy', focusTags: ['legs'],   type: 'workout' },
    { templateKey: 'shoulders_arms', name: 'Shoulders & Arms', focusTags: ['shoulders', 'arms'], type: 'workout' },
  ],
  // Arnold Split
  arnold_split_6: [
    { templateKey: 'chest_back_a',    name: 'Chest & Back A',   focusTags: ['chest', 'back'],       type: 'workout' },
    { templateKey: 'shoulders_arms_a', name: 'Shoulders & Arms A', focusTags: ['shoulders', 'arms'], type: 'workout' },
    { templateKey: 'legs_a',          name: 'Legs A',           focusTags: ['legs'],                type: 'workout' },
    { templateKey: 'chest_back_b',    name: 'Chest & Back B',   focusTags: ['chest', 'back'],       type: 'workout' },
    { templateKey: 'shoulders_arms_b', name: 'Shoulders & Arms B', focusTags: ['shoulders', 'arms'], type: 'workout' },
    { templateKey: 'legs_b',          name: 'Legs B',           focusTags: ['legs'],                type: 'workout' },
  ],
  // Bro Split
  bro_split_5: [
    { templateKey: 'chest_day',     name: 'Chest',             focusTags: ['chest'],      type: 'workout' },
    { templateKey: 'back_day',      name: 'Back',              focusTags: ['back'],       type: 'workout' },
    { templateKey: 'shoulders_day', name: 'Shoulders',         focusTags: ['shoulders'],  type: 'workout' },
    { templateKey: 'arms_day',      name: 'Arms',              focusTags: ['arms'],       type: 'workout' },
    { templateKey: 'legs_day',      name: 'Legs',              focusTags: ['legs'],       type: 'workout' },
  ],
  powerbuilding_5: [
    { templateKey: 'upper_power',  name: 'Upper Power',  focusTags: ['upper'], type: 'workout' },
    { templateKey: 'lower_power',  name: 'Lower Power',  focusTags: ['legs'],  type: 'workout' },
    { templateKey: 'push_volume',  name: 'Push Volume',  focusTags: ['push'],  type: 'workout' },
    { templateKey: 'pull_volume',  name: 'Pull Volume',  focusTags: ['pull'],  type: 'workout' },
    { templateKey: 'lower_volume', name: 'Lower Volume', focusTags: ['legs'],  type: 'workout' },
  ],
  // Bodyweight
  bodyweight_only_3: [
    { templateKey: 'bw_push',  name: 'Push (Bodyweight)',  focusTags: ['push'],  type: 'workout' },
    { templateKey: 'bw_pull',  name: 'Pull (Bodyweight)',  focusTags: ['pull'],  type: 'workout' },
    { templateKey: 'bw_lower', name: 'Lower (Bodyweight)', focusTags: ['legs'],  type: 'workout' },
  ],
  // Home / Dumbbell
  home_dumbbell_4: [
    { templateKey: 'db_upper_a', name: 'Upper A (Dumbbells)', focusTags: ['upper'], type: 'workout' },
    { templateKey: 'db_lower_a', name: 'Lower A (Dumbbells)', focusTags: ['legs'],  type: 'workout' },
    { templateKey: 'db_upper_b', name: 'Upper B (Dumbbells)', focusTags: ['upper'], type: 'workout' },
    { templateKey: 'db_lower_b', name: 'Lower B (Dumbbells)', focusTags: ['legs'],  type: 'workout' },
  ],
};

const REST_TEMPLATE: DayTemplate = {
  templateKey: 'rest', name: 'Rest Day', focusTags: [], type: 'rest',
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export type ScheduleBuilderInput = {
  familyKey: string;
  /** Explicit training days selected by user — takes priority over daysPerWeek */
  trainingDays: WeekdayCode[];
  /** Rest days explicitly chosen — remaining days become training days if needed */
  restDays?: WeekdayCode[];
  /** Fallback: if trainingDays is empty, use this count */
  daysPerWeek?: number;
  /** Preferred rest days to respect when auto-assigning (e.g. ['sat','sun']) */
  preferredDaysOff?: WeekdayCode[];
};

export type ScheduleBuildResult = {
  assignments: WeeklyDayAssignment[];
  workoutDayTemplates: DayTemplate[];
  warnings: string[];
};

/**
 * Build a concrete weekly schedule from user's training days + split family.
 */
export function buildWeeklySchedule(input: ScheduleBuilderInput): ScheduleBuildResult {
  const { familyKey, trainingDays, restDays, preferredDaysOff } = input;
  const warnings: string[] = [];

  // 1. Determine workout days
  let workoutDays: WeekdayCode[];

  if (trainingDays.length > 0) {
    workoutDays = [...trainingDays];
  } else {
    // Auto-assign from daysPerWeek + preferences
    const daysPerWeek = input.daysPerWeek ?? 3;
    const excluded = new Set([...(restDays ?? []), ...(preferredDaysOff ?? [])]);
    const candidates = WEEKDAY_ORDER.filter((d) => !excluded.has(d));
    const fallback = WEEKDAY_ORDER.filter((d) => excluded.has(d));
    workoutDays = [...candidates, ...fallback].slice(0, daysPerWeek);
    warnings.push(`Training days not explicitly set — auto-assigned ${daysPerWeek} days.`);
  }

  // Sort workout days by weekday order
  const workoutDaySet = new Set(workoutDays);
  const sortedWorkoutDays = WEEKDAY_ORDER.filter((d) => workoutDaySet.has(d));

  // 2. Get split templates
  const templates = SPLIT_TEMPLATES[familyKey] ?? SPLIT_TEMPLATES['full_body_beginner_3'];
  if (!SPLIT_TEMPLATES[familyKey]) {
    warnings.push(`Unknown split family key "${familyKey}" — defaulting to Full Body.`);
  }

  // 3. Cycle templates across workout days
  const workoutDayTemplates: DayTemplate[] = sortedWorkoutDays.map(
    (_, idx) => templates[idx % templates.length],
  );

  // 4. Build full week assignments
  const assignments: WeeklyDayAssignment[] = WEEKDAY_ORDER.map((weekday, dayIdx) => {
    const workoutIdx = sortedWorkoutDays.indexOf(weekday);
    if (workoutIdx === -1) {
      return { weekday, template: REST_TEMPLATE };
    }
    return { weekday, template: workoutDayTemplates[workoutIdx] };
  });

  // 5. Validate: warn if consecutive workout days > 3 (recovery risk)
  let consecutive = 0;
  let maxConsecutive = 0;
  for (const assignment of assignments) {
    if (assignment.template.type === 'workout') {
      consecutive++;
      maxConsecutive = Math.max(maxConsecutive, consecutive);
    } else {
      consecutive = 0;
    }
  }
  if (maxConsecutive > 3) {
    warnings.push(
      `Schedule has ${maxConsecutive} consecutive training days — consider inserting a rest day for recovery.`,
    );
  }

  return { assignments, workoutDayTemplates, warnings };
}

/**
 * Summarize a schedule for display: "MON · WED · FRI · SAT"
 */
export function summarizeSchedule(assignments: WeeklyDayAssignment[]): string {
  return assignments
    .filter((a) => a.template.type === 'workout')
    .map((a) => a.weekday.toUpperCase())
    .join(' · ');
}
