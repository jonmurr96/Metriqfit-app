export type WorkoutActionKey =
  | 'resume_session'
  | 'finish_session'
  | 'start_workout'
  | 'view_summary'
  | 'open_plan'
  | 'open_tomorrow'
  | 'browse_programs'
  | 'generate_plan'
  | 'open_adaptation'
  | 'open_history'
  | 'open_tools'
  | 'open_programs'
  | 'accept_recommendation'
  | 'reject_recommendation'
  | 'open_notes'
  | 'open_exercise_library'
  | 'open_program_builder'
  | 'import_plan'
  | 'open_one_rep_max'
  | 'open_plate_calculator';

type WorkoutSessionType = 'workout' | 'rest' | 'active_recovery' | 'conditioning';
type WorkoutScheduleStatus = 'planned' | 'completed' | 'missed' | 'rescheduled' | 'skipped';

export interface WorkoutDashboardActiveSession {
  id: string;
  name: string;
  startedAt: string;
  exercises: {
    id: string;
    name: string;
    loggedSetCount: number;
  }[];
}

export interface WorkoutDashboardScheduleEntry {
  sessionType: WorkoutSessionType;
  status: WorkoutScheduleStatus;
  planDayId: string | null;
  planDayName: string | null;
  focus: string | null;
}

export interface WorkoutDashboardHistoryItem {
  id: string;
  name: string;
  startedAt: string;
  durationSeconds: number;
  volumeLb: number;
  prCount: number;
}

export interface WorkoutDashboardRecommendation {
  id: string;
  recommendationType: string;
  rationale: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export interface WorkoutDashboardPrimaryHeroState {
  mode: 'active_session' | 'stale_session' | 'today_workout' | 'completed_today' | 'missed_session' | 'recovery' | 'no_plan';
  chipLabel: 'ACTIVE SESSION' | 'STALE SESSION' | 'TODAY' | 'RECOVERY' | 'MISSED TODAY' | 'NO PLAN';
  title: string;
  subtitle: string;
  icon: string;
  tone: 'primary' | 'success' | 'accent';
  primaryLabel: string;
  primaryAction: WorkoutActionKey;
  secondaryLabel?: string;
  secondaryAction?: WorkoutActionKey;
  metrics: {
    label: string;
    value: string;
  }[];
  progress: {
    completedExercises: number;
    totalExercises: number;
    currentExerciseName: string | null;
    elapsedMinutes?: number;
  };
  completedSessionId?: string | null;
}

export interface WorkoutTomorrowPreviewState {
  title: string;
  subtitle: string;
  icon: string;
  action: WorkoutActionKey;
  planDayId?: string | null;
}

export interface WorkoutCoachQueueItemState {
  id: string;
  title: string;
  rationale: string;
  recommendationType: string;
  primaryAction: 'accept_recommendation';
  secondaryAction: 'reject_recommendation';
}

export interface WorkoutCoachQueueState {
  mode: 'recommendations' | 'fallback';
  title: string;
  subtitle: string;
  icon: string;
  items: WorkoutCoachQueueItemState[];
  primaryAction?: WorkoutActionKey;
  primaryLabel?: string;
  reviewAllAction?: WorkoutActionKey;
}

export interface WorkoutMomentumState {
  summary: string;
  items: {
    label: string;
    value: string;
    detail: string;
    icon: string;
    tone: 'primary' | 'success' | 'accent';
  }[];
}

export interface WorkoutDashboardPrimaryCardState {
  title: string;
  subtitle: string;
  meta: string;
  actionLabel: string;
  action: WorkoutActionKey;
  actionIcon: string;
  tone: 'primary' | 'success' | 'accent';
}

export interface WorkoutDashboardUtilityTileState {
  title: string;
  subtitle: string;
  icon: string;
  action: WorkoutActionKey;
  badgeLabel?: string;
}

export interface WorkoutDashboardQuickActionState {
  label: string;
  icon: string;
  action: WorkoutActionKey;
}

export interface WorkoutDashboardResourceState {
  label: string;
  icon: string;
  action: WorkoutActionKey;
}

export interface WorkoutDashboardCompactLayoutState {
  primaryCard: WorkoutDashboardPrimaryCardState;
  myPlanTile: WorkoutDashboardUtilityTileState;
  changeProgramTile: WorkoutDashboardUtilityTileState;
  quickActions: WorkoutDashboardQuickActionState[];
  resources: WorkoutDashboardResourceState[];
}

export interface WorkoutDashboardState {
  hero: WorkoutDashboardPrimaryHeroState;
  tomorrow: WorkoutTomorrowPreviewState;
  coachQueue: WorkoutCoachQueueState;
  momentum: WorkoutMomentumState;
  utilityEmphasis: 'plan' | 'history' | 'programs' | 'tools';
  compact: WorkoutDashboardCompactLayoutState;
}

interface BuildWorkoutDashboardStateInput {
  now: Date;
  hasActivePlan: boolean;
  activePlanLabel?: string | null;
  activeSession: WorkoutDashboardActiveSession | null;
  todayEntry: WorkoutDashboardScheduleEntry | null;
  tomorrowEntry: WorkoutDashboardScheduleEntry | null;
  latestConsistencyScore: number;
  weeklyStats: {
    totalSessions: number;
    totalVolumeLb: number;
    avgDurationMinutes: number;
  };
  recentHistory: WorkoutDashboardHistoryItem[];
  pendingRecommendations: WorkoutDashboardRecommendation[];
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMinutes(minutes: number) {
  const rounded = Math.max(0, Math.round(minutes));

  if (rounded >= 24 * 60) {
    const days = Math.floor(rounded / (24 * 60));
    const hours = Math.floor((rounded % (24 * 60)) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (rounded >= 60) {
    const hours = Math.floor(rounded / 60);
    const mins = rounded % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return `${rounded} min`;
}

function formatVolume(volumeLb: number) {
  return `${Math.round(volumeLb).toLocaleString()} lb`;
}

function humanizeRecommendationType(type: string) {
  switch (type) {
    case 'deload_microcycle':
      return 'Deload the current microcycle';
    case 'schedule_recovery_shift':
      return 'Shift the next session into recovery';
    case 'load_adjustment':
      return 'Reduce load until RPE normalizes';
    default:
      return type.replaceAll('_', ' ').replace(/\b\w/g, (match) => match.toUpperCase());
  }
}

function buildTomorrowState(entry: WorkoutDashboardScheduleEntry | null): WorkoutTomorrowPreviewState {
  if (!entry) {
    return {
      title: 'Tomorrow: Open day',
      subtitle: 'No scheduled session yet. Review the week and keep recovery on line.',
      icon: 'calendar-outline',
      action: 'open_plan',
      planDayId: null,
    };
  }

  if (entry.sessionType === 'workout') {
    return {
      title: `Tomorrow: ${entry.planDayName || 'Workout'}`,
      subtitle: entry.focus || 'Training is scheduled. Show up fueled and ready.',
      icon: 'barbell-outline',
      action: 'open_tomorrow',
      planDayId: entry.planDayId,
    };
  }

  if (entry.sessionType === 'conditioning') {
    return {
      title: 'Tomorrow: Conditioning',
      subtitle: entry.focus || 'Cardio and engine work are queued for tomorrow.',
      icon: 'pulse-outline',
      action: 'open_tomorrow',
      planDayId: entry.planDayId,
    };
  }

  if (entry.sessionType === 'active_recovery') {
    return {
      title: 'Tomorrow: Active recovery',
      subtitle: 'Light movement, mobility, and sleep quality are the win.',
      icon: 'leaf-outline',
      action: 'open_tomorrow',
      planDayId: entry.planDayId,
    };
  }

  return {
    title: 'Tomorrow: Recovery day',
    subtitle: 'No heavy session is scheduled. Keep the basics tight.',
    icon: 'moon-outline',
    action: 'open_tomorrow',
    planDayId: entry.planDayId,
  };
}

function getRecentPrCount(history: WorkoutDashboardHistoryItem[]) {
  return history.slice(0, 5).reduce((sum, item) => sum + item.prCount, 0);
}

function buildCompactPrimaryCard(
  hero: WorkoutDashboardPrimaryHeroState,
  todayEntry: WorkoutDashboardScheduleEntry | null,
): WorkoutDashboardPrimaryCardState {
  switch (hero.mode) {
    case 'active_session':
      return {
        title: hero.title,
        subtitle: hero.progress.currentExerciseName
          ? `Up next: ${hero.progress.currentExerciseName}`
          : 'Pick the session back up where you left it.',
        meta: `${hero.progress.completedExercises}/${Math.max(1, hero.progress.totalExercises)} exercises logged`,
        actionLabel: hero.primaryLabel,
        action: hero.primaryAction,
        actionIcon: 'play',
        tone: hero.tone,
      };
    case 'stale_session':
      return {
        title: hero.primaryAction === 'finish_session' ? 'Close older session' : 'Resume workout',
        subtitle: hero.primaryAction === 'finish_session'
          ? 'All work is logged. Finish it before starting fresh.'
          : 'Older session still needs to be closed cleanly.',
        meta: `${hero.progress.completedExercises}/${Math.max(1, hero.progress.totalExercises)} exercises logged`,
        actionLabel: hero.primaryLabel,
        action: hero.primaryAction,
        actionIcon: hero.primaryAction === 'finish_session' ? 'checkmark' : 'play',
        tone: hero.tone,
      };
    case 'today_workout':
      return {
        title: hero.title,
        subtitle: todayEntry?.focus || 'Today is set. Start before the day gets noisy.',
        meta: todayEntry?.planDayName || hero.metrics[0]?.value || 'Scheduled session',
        actionLabel: hero.primaryLabel,
        action: hero.primaryAction,
        actionIcon: 'play',
        tone: hero.tone,
      };
    case 'completed_today':
      return {
        title: 'Workout Complete',
        subtitle: 'Today is closed. Review the session and protect recovery.',
        meta: hero.metrics[0]?.value || 'Session complete',
        actionLabel: hero.primaryLabel,
        action: hero.primaryAction,
        actionIcon: 'checkmark',
        tone: hero.tone,
      };
    case 'missed_session':
      return {
        title: 'Missed session',
        subtitle: 'Reset the week on purpose instead of letting it drift.',
        meta: hero.metrics[0]?.value || 'Today slipped',
        actionLabel: 'Open Plan',
        action: 'open_plan',
        actionIcon: 'refresh',
        tone: hero.tone,
      };
    case 'recovery':
      return {
        title: hero.title,
        subtitle: hero.subtitle,
        meta: hero.metrics[0]?.value || 'Recovery focus',
        actionLabel: hero.primaryLabel,
        action: hero.primaryAction,
        actionIcon: todayEntry?.sessionType === 'conditioning' ? 'pulse-outline' : 'leaf-outline',
        tone: hero.tone,
      };
    case 'no_plan':
    default:
      return {
        title: 'No Plan Active',
        subtitle: 'Choose a program and give the week structure.',
        meta: 'Browse programs or generate a fresh plan',
        actionLabel: 'Open Plan',
        action: 'open_plan',
        actionIcon: 'calendar',
        tone: 'primary',
      };
  }
}

function buildChangeProgramTile(
  activePlanLabel: string | null | undefined,
): WorkoutDashboardUtilityTileState {
  return {
    title: 'Change Program',
    subtitle: activePlanLabel 
      ? `Currently: ${activePlanLabel}`
      : 'Browse available training programs',
    icon: 'swap-horizontal-outline',
    action: 'browse_programs',
  };
}

function buildCompactPlanTile(input: BuildWorkoutDashboardStateInput): WorkoutDashboardUtilityTileState {
  const nextLabel = input.tomorrowEntry?.planDayName
    || (input.tomorrowEntry?.sessionType === 'conditioning'
      ? 'Conditioning'
      : input.tomorrowEntry?.sessionType === 'active_recovery'
        ? 'Active recovery'
        : input.tomorrowEntry?.sessionType === 'rest'
          ? 'Recovery day'
          : null);

  return {
    title: 'My Plan',
    subtitle:
      input.activePlanLabel
        ? nextLabel
          ? `${input.activePlanLabel} • Next: ${nextLabel}`
          : input.activePlanLabel
        : nextLabel || (input.hasActivePlan ? 'View weekly layout and upcoming sessions.' : 'Choose a program and build the week.'),
    icon: 'calendar-outline',
    action: 'open_plan',
  };
}

export function buildWorkoutDashboardState(input: BuildWorkoutDashboardStateInput): WorkoutDashboardState {
  const todayKey = toLocalDateKey(input.now);
  const todayCompletedSession = input.recentHistory.find((session) => toLocalDateKey(new Date(session.startedAt)) === todayKey) || null;
  const tomorrow = buildTomorrowState(input.tomorrowEntry);
  const recentPrCount = getRecentPrCount(input.recentHistory);
  const lastSession = input.recentHistory[0] || null;

  let hero: WorkoutDashboardPrimaryHeroState;

  if (input.activeSession) {
    const completedExercises = input.activeSession.exercises.filter((exercise) => exercise.loggedSetCount > 0).length;
    const allExercisesLogged =
      input.activeSession.exercises.length > 0 && completedExercises >= input.activeSession.exercises.length;
    const isStaleSession = elapsedMinutesSince(input.now, input.activeSession.startedAt) >= 12 * 60;
    const currentExercise =
      allExercisesLogged
        ? null
        : input.activeSession.exercises.find((exercise) => exercise.loggedSetCount === 0)
          || input.activeSession.exercises[Math.max(0, completedExercises - 1)]
          || null;
    const elapsedMinutes = elapsedMinutesSince(input.now, input.activeSession.startedAt);

    hero = {
      mode: isStaleSession ? 'stale_session' : 'active_session',
      chipLabel: isStaleSession ? 'STALE SESSION' : 'ACTIVE SESSION',
      title: isStaleSession
        ? allExercisesLogged
          ? 'Older session ready to close'
          : 'Older session still open'
        : input.activeSession.name || 'Resume your session',
      subtitle: isStaleSession
        ? allExercisesLogged
          ? 'This workout has been open too long and all planned work is already logged. Finish it now so the dashboard can reset cleanly.'
          : 'This session has been open too long. Resume it only if you still plan to finish it, otherwise open the plan and reset the week intentionally.'
        : allExercisesLogged
          ? 'All planned work is logged. Wrap your notes and close the session cleanly.'
          : currentExercise
            ? `${currentExercise.name} is the next move. Pick the session back up where you left it.`
            : 'Your session is in progress. Get back in and keep the work moving.',
      icon: isStaleSession ? 'time-outline' : 'play',
      tone: 'accent',
      primaryLabel: allExercisesLogged ? 'Finish Workout' : 'Resume Session',
      primaryAction: allExercisesLogged ? 'finish_session' : 'resume_session',
      secondaryLabel: isStaleSession ? 'Open Plan' : 'Workout Notes',
      secondaryAction: isStaleSession ? 'open_plan' : 'open_notes',
      metrics: [
        { label: 'Elapsed', value: formatMinutes(elapsedMinutes) },
        { label: 'Progress', value: `${completedExercises}/${Math.max(1, input.activeSession.exercises.length)} exercises` },
      ],
      progress: {
        completedExercises,
        totalExercises: input.activeSession.exercises.length,
        currentExerciseName: currentExercise?.name || null,
        elapsedMinutes,
      },
    };
  } else if (input.todayEntry?.sessionType === 'workout' && input.todayEntry.status === 'planned') {
    hero = {
      mode: 'today_workout',
      chipLabel: 'TODAY',
      title: input.todayEntry.planDayName || 'Workout is ready',
      subtitle: input.todayEntry.focus || 'Your next training session is queued. Start it before the day gets noisy.',
      icon: 'barbell-outline',
      tone: 'primary',
      primaryLabel: 'Start Workout',
      primaryAction: 'start_workout',
      secondaryLabel: 'Open Plan',
      secondaryAction: 'open_plan',
      metrics: [
        { label: 'Focus', value: input.todayEntry.focus || 'Scheduled session' },
        { label: 'This week', value: `${input.weeklyStats.totalSessions} sessions` },
      ],
      progress: {
        completedExercises: 0,
        totalExercises: 0,
        currentExerciseName: null,
      },
    };
  } else if (input.todayEntry?.sessionType === 'workout' && input.todayEntry.status === 'completed' && todayCompletedSession) {
    hero = {
      mode: 'completed_today',
      chipLabel: 'RECOVERY',
      title: `${todayCompletedSession.name || 'Workout'} complete`,
      subtitle: todayCompletedSession.prCount > 0
        ? `Today is closed with ${todayCompletedSession.prCount} new PR${todayCompletedSession.prCount === 1 ? '' : 's'}. Review the win while it is still fresh and set up tomorrow with intent.`
        : 'Today\'s training is closed. Review the session while it is still fresh, recover cleanly, and look at tomorrow with intent.',
      icon: 'checkmark-circle',
      tone: 'success',
      primaryLabel: 'View Summary',
      primaryAction: 'view_summary',
      secondaryLabel: 'Tomorrow',
      secondaryAction: 'open_tomorrow',
      metrics: [
        { label: 'Duration', value: formatMinutes(todayCompletedSession.durationSeconds / 60) },
        { label: 'Volume', value: formatVolume(todayCompletedSession.volumeLb) },
        { label: 'PRs', value: `${todayCompletedSession.prCount}` },
      ],
      progress: {
        completedExercises: 0,
        totalExercises: 0,
        currentExerciseName: null,
      },
      completedSessionId: todayCompletedSession.id,
    };
  } else if (input.todayEntry?.sessionType === 'workout' && input.todayEntry.status === 'missed') {
    hero = {
      mode: 'missed_session',
      chipLabel: 'MISSED TODAY',
      title: 'Missed session recovery',
      subtitle: `${input.todayEntry.planDayName || 'Today\'s workout'} slipped. Open the plan and pick the least disruptive recovery move for the week.`,
      icon: 'refresh-outline',
      tone: 'accent',
      primaryLabel: 'Make-Up Options',
      primaryAction: 'open_plan',
      secondaryLabel: 'Tomorrow',
      secondaryAction: 'open_tomorrow',
      metrics: [
        { label: 'Missed', value: input.todayEntry.planDayName || 'Workout' },
        { label: 'Tomorrow', value: input.tomorrowEntry?.planDayName || 'Open day' },
      ],
      progress: {
        completedExercises: 0,
        totalExercises: 0,
        currentExerciseName: null,
      },
    };
  } else if (input.hasActivePlan) {
    const isConditioning = input.todayEntry?.sessionType === 'conditioning';
    const isRecovery = input.todayEntry?.sessionType === 'active_recovery';
    hero = {
      mode: 'recovery',
      chipLabel: 'RECOVERY',
      title: isConditioning
        ? 'Conditioning day'
        : isRecovery
          ? 'Recovery keeps the week moving'
          : 'Recovery is the play today',
      subtitle: isConditioning
        ? 'Use controlled intensity and finish the day fresher than you started.'
        : 'Use mobility, hydration, and tomorrow prep to keep the next session obvious.',
      icon: isConditioning ? 'pulse-outline' : 'leaf-outline',
      tone: 'accent',
      primaryLabel: 'Open Plan',
      primaryAction: 'open_plan',
      secondaryLabel: 'Tomorrow',
      secondaryAction: 'open_tomorrow',
      metrics: [
        { label: 'Tomorrow', value: input.tomorrowEntry?.planDayName || 'Open day' },
        { label: 'Score', value: `${Math.max(0, input.latestConsistencyScore)}%` },
      ],
      progress: {
        completedExercises: 0,
        totalExercises: 0,
        currentExerciseName: null,
      },
    };
  } else {
    hero = {
      mode: 'no_plan',
      chipLabel: 'NO PLAN',
      title: 'No active workout plan',
      subtitle: 'Choose a program or generate one so the week has a real training spine.',
      icon: 'compass',
      tone: 'primary',
      primaryLabel: 'Browse Programs',
      primaryAction: 'browse_programs',
      secondaryLabel: 'Generate Plan',
      secondaryAction: 'generate_plan',
      metrics: [
        { label: 'Programs', value: 'Browse library' },
        { label: 'Plan', value: 'Generate fresh' },
      ],
      progress: {
        completedExercises: 0,
        totalExercises: 0,
        currentExerciseName: null,
      },
    };
  }

  const pendingRecommendations = input.pendingRecommendations
    .filter((item) => item.status === 'pending')
    .slice(0, 2)
    .map<WorkoutCoachQueueItemState>((item) => ({
      id: item.id,
      title: humanizeRecommendationType(item.recommendationType),
      rationale: item.rationale || 'Review the recommendation and either accept it or keep the current plan.',
      recommendationType: item.recommendationType,
      primaryAction: 'accept_recommendation',
      secondaryAction: 'reject_recommendation',
    }));

  const coachQueue: WorkoutCoachQueueState = pendingRecommendations.length > 0
    ? {
        mode: 'recommendations',
        title: 'Coach Queue',
        subtitle: 'Recovery and adaptation signals suggest one or more plan changes.',
        icon: 'sparkles-outline',
        items: pendingRecommendations,
        reviewAllAction: 'open_adaptation',
      }
    : {
        mode: 'fallback',
        title:
          hero.mode === 'today_workout'
            ? 'Today\'s session is the highest leverage move'
            : hero.mode === 'stale_session'
              ? 'Clean up the older session'
            : hero.mode === 'completed_today'
              ? 'Recovery now, momentum tomorrow'
              : hero.mode === 'missed_session'
                ? 'Recover the week, not the missed rep'
              : hero.mode === 'recovery'
                ? 'Recovery should feel productive, not passive'
                : hero.mode === 'no_plan'
                  ? 'Build the week before chasing intensity'
                  : hero.primaryAction === 'finish_session'
                    ? 'Close the session cleanly'
                    : 'Stay inside the work already underway',
        subtitle:
          hero.mode === 'today_workout'
            ? 'Start the session before other decisions begin competing with it.'
            : hero.mode === 'stale_session'
              ? hero.primaryAction === 'finish_session'
                ? 'All planned work is logged. Finish the stale session now so the dashboard reflects the real week.'
                : 'This session has been open too long. Either resume it now or open the plan and reset the week intentionally.'
            : hero.mode === 'completed_today'
              ? `${tomorrow.subtitle} Use tonight to lock in recovery and keep the next session obvious.`
              : hero.mode === 'missed_session'
                ? 'Open the plan and decide whether to make up today\'s session or shift the week forward on purpose.'
              : hero.mode === 'recovery'
                ? 'Mobility, hydration, and tomorrow prep are the right win today.'
                : hero.mode === 'no_plan'
                  ? 'A stronger workout tab starts with a real plan and a clear next session.'
                  : hero.primaryAction === 'finish_session'
                    ? 'All planned work is already logged. Close the session and lock the day.'
                    : 'Your best move is to re-enter the session and finish what is already in motion.',
        icon:
          hero.mode === 'completed_today' || hero.mode === 'recovery'
            ? 'leaf-outline'
            : hero.mode === 'missed_session'
              ? 'refresh-outline'
              : hero.mode === 'stale_session'
                ? 'time-outline'
            : hero.mode === 'no_plan'
              ? 'compass'
              : 'barbell-outline',
        items: [],
        primaryAction:
          hero.mode === 'today_workout'
            ? 'start_workout'
            : hero.mode === 'stale_session'
              ? hero.primaryAction
            : hero.mode === 'completed_today'
              ? 'open_tomorrow'
              : hero.mode === 'missed_session'
                ? 'open_plan'
              : hero.mode === 'recovery'
                ? 'open_plan'
                : hero.mode === 'no_plan'
                  ? 'browse_programs'
                  : hero.primaryAction === 'finish_session'
                    ? 'finish_session'
                    : 'resume_session',
        primaryLabel:
          hero.mode === 'today_workout'
            ? 'Start Workout'
            : hero.mode === 'stale_session'
              ? hero.primaryLabel
            : hero.mode === 'completed_today'
              ? 'Preview Tomorrow'
              : hero.mode === 'missed_session'
                ? 'Make-Up Options'
              : hero.mode === 'recovery'
                ? 'Open Plan'
                : hero.mode === 'no_plan'
                  ? 'Browse Programs'
                  : hero.primaryAction === 'finish_session'
                    ? 'Finish Workout'
                    : 'Resume Session',
      };

  const momentum: WorkoutMomentumState = {
    summary:
      hero.mode === 'completed_today'
        ? 'Today is closed. Protect recovery and carry that standard into tomorrow.'
        : hero.mode === 'stale_session'
          ? 'An older session is still open. Close that loop before starting anything else.'
          : hero.mode === 'missed_session'
            ? 'One missed day only becomes a pattern if the next move stays fuzzy.'
        : hero.mode === 'active_session'
          ? hero.primaryAction === 'finish_session'
            ? 'All work is logged. Finish the workout and lock in the day.'
            : 'Keep the session moving. Finishing the work matters more than browsing the rest of the app.'
          : recentPrCount > 0
            ? 'Recent PR momentum is real. Keep stacking quality sessions without forcing the next jump.'
            : input.weeklyStats.totalSessions > 0
              ? 'Momentum comes from clean repeats. Show up for the next session and let the week compound.'
              : 'The week is still open. A plan and one good session fix that quickly.',
    items: [
      {
        label: 'Sessions',
        value: `${input.weeklyStats.totalSessions}`,
        detail: 'completed this week',
        icon: 'barbell-outline',
        tone: 'primary',
      },
      {
        label: 'Last Session',
        value: lastSession ? formatMinutes(lastSession.durationSeconds / 60) : '--',
        detail: lastSession ? formatVolume(lastSession.volumeLb) : 'no recent workout',
        icon: 'time-outline',
        tone: lastSession ? 'success' : 'accent',
      },
      {
        label: recentPrCount > 0 ? 'PRs' : 'Score',
        value: recentPrCount > 0 ? `${recentPrCount}` : `${Math.max(0, input.latestConsistencyScore)}%`,
        detail: recentPrCount > 0 ? 'recent records' : 'readiness / adherence',
        icon: recentPrCount > 0 ? 'trophy-outline' : 'analytics-outline',
        tone: recentPrCount > 0 ? 'success' : 'accent',
      },
    ],
  };

  const utilityEmphasis: WorkoutDashboardState['utilityEmphasis'] =
    hero.mode === 'no_plan'
      ? 'programs'
      : hero.mode === 'completed_today'
        ? 'history'
        : hero.mode === 'recovery' || hero.mode === 'stale_session' || hero.mode === 'missed_session'
          ? 'plan'
          : 'tools';

  const compact: WorkoutDashboardCompactLayoutState = {
    primaryCard: buildCompactPrimaryCard(hero, input.todayEntry),
    myPlanTile: buildCompactPlanTile(input),
    changeProgramTile: buildChangeProgramTile(input.activePlanLabel),
    quickActions: [
      { label: 'Notes', icon: 'document-text', action: 'open_notes' },
      { label: 'Exercise Library', icon: 'bar-chart', action: 'open_exercise_library' },
      { label: 'Programs', icon: 'barbell', action: 'open_programs' },
      { label: 'Tools', icon: 'construct', action: 'open_tools' },
    ],
    resources: [
      { label: '1RM Calculator', icon: 'calculator', action: 'open_one_rep_max' },
      { label: 'Plate Calculator', icon: 'albums', action: 'open_plate_calculator' },
      { label: 'Program Builder', icon: 'build', action: 'open_program_builder' },
      { label: 'Import Plan', icon: 'cloud-upload', action: 'import_plan' },
      { label: 'Adaptive Coach', icon: 'sparkles', action: 'open_adaptation' },
      { label: 'Workout Notes', icon: 'document-text', action: 'open_notes' },
    ],
  };

  return {
    hero,
    tomorrow,
    coachQueue,
    momentum,
    utilityEmphasis,
    compact,
  };
}

function elapsedMinutesSince(now: Date, startedAt: string) {
  return Math.max(
    1,
    Math.round((now.getTime() - new Date(startedAt).getTime()) / (1000 * 60)),
  );
}
