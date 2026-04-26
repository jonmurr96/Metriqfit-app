export type HomeMealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type HomeWorkoutStatus = 'completed' | 'planned' | 'rest' | 'none';
export type HomeDayPart = 'morning' | 'midday' | 'afternoon' | 'evening' | 'late';
export type HomeMealTimingStatus = 'logged' | 'flexible' | 'due_now' | 'up_next' | 'later_today' | 'missed';
export type HomeActionKey =
  | 'meal'
  | 'meal_plan'
  | 'workout'
  | 'water'
  | 'checkin'
  | 'coach'
  | 'barcode'
  | 'tomorrow'
  | 'progress';

export interface HomeDashboardMealInput {
  slot: HomeMealSlot;
  label: string;
  plannedName: string;
  targetCalories: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  loggedCalories: number;
  loggedItemCount: number;
  isLogged: boolean;
  planMealId?: string;
}

export interface HomeTomorrowInput {
  sessionType: 'workout' | 'rest' | 'active_recovery' | 'conditioning' | null;
  planName?: string | null;
  focus?: string | null;
}

export interface HomeDashboardMealState extends HomeDashboardMealInput {
  timingStatus: HomeMealTimingStatus;
  timingLabel: string;
  recoveryHint: string | null;
}

export interface HomeDashboardFocusState {
  title: string;
  subtitle: string;
  icon: string;
  action: HomeActionKey;
  secondaryAction?: HomeActionKey;
  ctaLabel: string;
  secondaryLabel?: string;
  tone: 'primary' | 'success' | 'accent';
  metrics: {
    label: string;
    value: string;
  }[];
}

export interface HomeDashboardCoachPulse {
  title: string;
  message: string;
  icon: string;
  action: HomeActionKey;
  ctaLabel: string;
}

export interface HomeDashboardTomorrowPreview {
  title: string;
  subtitle: string;
  icon: string;
}

export interface HomeDashboardState {
  dayPart: HomeDayPart;
  meals: HomeDashboardMealState[];
  activeMeal: HomeDashboardMealState | null;
  completedMealCount: number;
  isMealDayComplete: boolean;
  isDayWrapped: boolean;
  showMealFirst: boolean;
  focus: HomeDashboardFocusState;
  coachPulse: HomeDashboardCoachPulse;
  tomorrowPreview: HomeDashboardTomorrowPreview;
  habitDockLabel: string;
}

interface BuildHomeDashboardStateInput {
  now: Date;
  meals: HomeDashboardMealInput[];
  mealTimes: Record<HomeMealSlot, string>;
  workoutStatus: HomeWorkoutStatus;
  proteinRemaining: number;
  caloriesRemaining: number;
  waterPercent: number;
  waterRemainingMl: number;
  consistencyScore: number;
  sessionsThisWeek: number;
  prepEnabled?: boolean;
  prepNextCheckInDate?: string | null;
  tomorrow?: HomeTomorrowInput | null;
}

const DUE_NOW_WINDOW_MINUTES = 60;
const MISSED_AFTER_MINUTES = 90;
const UP_NEXT_WINDOW_MINUTES = 2 * 60;

function toMinutes(rawTime: string): number | null {
  if (!rawTime || rawTime === 'anytime') return null;
  const [hours, minutes] = rawTime.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function formatRemainingWater(waterRemainingMl: number) {
  if (waterRemainingMl <= 0) return 'On target';
  return `${Math.ceil(waterRemainingMl / 250)} glass${waterRemainingMl > 250 ? 'es' : ''} left`;
}

function titleForMealWindow(dayPart: HomeDayPart, mealLabel: string, timingStatus: HomeMealTimingStatus) {
  if (timingStatus === 'missed') return `${mealLabel} drifted. Recover the day`;
  if (timingStatus === 'due_now') {
    if (dayPart === 'morning') return `${mealLabel} sets the morning`;
    if (dayPart === 'midday') return `${mealLabel} is due now`;
    if (dayPart === 'afternoon') return `${mealLabel} keeps the day on line`;
    if (dayPart === 'evening') return `${mealLabel} closes the day`;
    return `${mealLabel} is still open`;
  }
  if (timingStatus === 'up_next') return `${mealLabel} is up next`;
  return `${mealLabel} is the next move`;
}

function buildRecoveryHint(meals: HomeDashboardMealInput[], currentMeal: HomeDashboardMealInput) {
  const currentIndex = meals.findIndex((meal) => meal.slot === currentMeal.slot);
  const laterMeal = meals.slice(currentIndex + 1).find((meal) => !meal.isLogged);
  if (laterMeal) {
    return `${currentMeal.label} drifted. Recover it at ${laterMeal.label} instead of forcing extra calories right now.`;
  }
  if (currentMeal.slot === 'dinner') {
    return 'Keep tonight simple: finish with a protein-first meal and avoid chasing the full gap.';
  }
  return `Let ${currentMeal.label.toLowerCase()} go. Tighten the next habit instead of trying to catch everything at once.`;
}

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayPart(date: Date): HomeDayPart {
  const hour = date.getHours();
  if (hour < 5) return 'late';
  if (hour < 11) return 'morning';
  if (hour < 15) return 'midday';
  if (hour < 18) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'late';
}

export function describeTomorrowPreview(tomorrow?: HomeTomorrowInput | null): HomeDashboardTomorrowPreview {
  if (!tomorrow || !tomorrow.sessionType || tomorrow.sessionType === 'rest') {
    return {
      title: 'Tomorrow: Recovery day',
      subtitle: 'Keep the basics tight and let recovery lead the pace.',
      icon: 'leaf-outline',
    };
  }

  if (tomorrow.sessionType === 'active_recovery') {
    return {
      title: 'Tomorrow: Active recovery',
      subtitle: 'Light movement, mobility, and hydration stay in front.',
      icon: 'leaf-outline',
    };
  }

  if (tomorrow.sessionType === 'conditioning') {
    return {
      title: 'Tomorrow: Conditioning',
      subtitle: 'Cardio and engine work are queued for tomorrow.',
      icon: 'pulse-outline',
    };
  }

  return {
    title: `Tomorrow: ${tomorrow.planName || 'Workout'}`,
    subtitle: tomorrow.focus || 'Training is scheduled. Show up fueled and ready.',
    icon: 'barbell-outline',
  };
}

export function enrichDashboardMeals(
  meals: HomeDashboardMealInput[],
  mealTimes: Record<HomeMealSlot, string>,
  now: Date,
) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return meals.map<HomeDashboardMealState>((meal) => {
    if (meal.isLogged) {
      return {
        ...meal,
        timingStatus: 'logged',
        timingLabel: 'Logged',
        recoveryHint: null,
      };
    }

    const slotTime = toMinutes(mealTimes[meal.slot]);
    if (slotTime == null) {
      return {
        ...meal,
        timingStatus: 'flexible',
        timingLabel: 'Flexible',
        recoveryHint: null,
      };
    }

    const diff = slotTime - currentMinutes;
    if (diff < -MISSED_AFTER_MINUTES) {
      return {
        ...meal,
        timingStatus: 'missed',
        timingLabel: 'Missed window',
        recoveryHint: buildRecoveryHint(meals, meal),
      };
    }

    if (diff <= DUE_NOW_WINDOW_MINUTES && diff >= -DUE_NOW_WINDOW_MINUTES) {
      return {
        ...meal,
        timingStatus: 'due_now',
        timingLabel: 'Due now',
        recoveryHint: null,
      };
    }

    if (diff <= UP_NEXT_WINDOW_MINUTES) {
      return {
        ...meal,
        timingStatus: 'up_next',
        timingLabel: 'Up next',
        recoveryHint: null,
      };
    }

    return {
      ...meal,
      timingStatus: 'later_today',
      timingLabel: 'Later today',
      recoveryHint: null,
    };
  });
}

export function buildHomeDashboardState(input: BuildHomeDashboardStateInput): HomeDashboardState {
  const dayPart = getDayPart(input.now);
  const meals = enrichDashboardMeals(input.meals, input.mealTimes, input.now);
  const activeMeal = meals.find((meal) => !meal.isLogged) || meals[0] || null;
  const completedMealCount = meals.filter((meal) => meal.isLogged).length;
  const isMealDayComplete = meals.length > 0 && completedMealCount === meals.length;
  const workoutClosed = input.workoutStatus === 'completed' || input.workoutStatus === 'rest' || input.workoutStatus === 'none';
  const isDayWrapped = isMealDayComplete && workoutClosed;
  const tomorrowPreview = describeTomorrowPreview(input.tomorrow);

  const nextMealIsUrgent = activeMeal && (
    activeMeal.timingStatus === 'missed'
    || activeMeal.timingStatus === 'due_now'
    || activeMeal.timingStatus === 'up_next'
  );
  const showMealFirst = Boolean(
    activeMeal
      ? nextMealIsUrgent || input.workoutStatus !== 'planned'
      : input.workoutStatus !== 'planned'
  );

  let focus: HomeDashboardFocusState;
  if (isDayWrapped) {
    focus = {
      title: 'Today is wrapped',
      subtitle: 'Meals are logged and training is closed. Keep recovery simple tonight and look at tomorrow with intent.',
      icon: 'checkmark-circle',
      action: 'tomorrow',
      secondaryAction: 'coach',
      ctaLabel: 'Preview Tomorrow',
      secondaryLabel: 'Open Coach',
      tone: 'success',
      metrics: [
        { label: 'Meals', value: `${completedMealCount}/${Math.max(1, meals.length)}` },
        { label: 'Water', value: `${Math.max(0, input.waterPercent)}%` },
      ],
    };
  } else if (activeMeal && activeMeal.timingStatus === 'missed') {
    focus = {
      title: titleForMealWindow(dayPart, activeMeal.label, activeMeal.timingStatus),
      subtitle: activeMeal.recoveryHint || `${activeMeal.label} needs a clean recovery move, not a catch-up spiral.`,
      icon: 'refresh-circle-outline',
      action: 'meal',
      secondaryAction: 'meal_plan',
      ctaLabel: 'Recover Next Meal',
      secondaryLabel: 'Open Plan',
      tone: 'accent',
      metrics: [
        { label: 'Protein', value: `${Math.max(0, Math.round(input.proteinRemaining))}g left` },
        { label: 'Calories', value: `${Math.max(0, Math.round(input.caloriesRemaining))} kcal` },
      ],
    };
  } else if (input.workoutStatus === 'planned') {
    // Show workout focus when there's a planned workout
    focus = {
      title: dayPart === 'morning' || dayPart === 'midday' 
        ? 'Start the day with training'
        : 'Training needs to close today',
      subtitle: dayPart === 'morning' || dayPart === 'midday'
        ? 'Get the session done early while energy is high. Knock it out before the day gets busy.'
        : 'Your workout is still pending. Get it done before the day gets away from you.',
      icon: 'barbell-outline',
      action: 'workout',
      secondaryAction: 'meal_plan',
      ctaLabel: 'Start Workout',
      secondaryLabel: 'View Plan',
      tone: 'accent',
      metrics: [
        { label: 'Meals', value: `${completedMealCount}/${Math.max(1, meals.length)}` },
        { label: 'Hydration', value: `${Math.max(0, input.waterPercent)}%` },
      ],
    };
  } else if (activeMeal && !isMealDayComplete) {
    focus = {
      title: titleForMealWindow(dayPart, activeMeal.label, activeMeal.timingStatus),
      subtitle:
        activeMeal.timingStatus === 'due_now'
          ? `${Math.max(0, Math.round(input.proteinRemaining))}g protein and ${Math.max(0, Math.round(input.caloriesRemaining))} kcal are still open across the day.`
          : activeMeal.timingStatus === 'up_next'
            ? `${activeMeal.label} is the next clean win. Keep the plan moving before the rest of the day starts competing with it.`
            : `${activeMeal.label} is still ahead. Keep the rest of the day light until that window opens.`,
      icon: 'restaurant-outline',
      action: 'meal',
      secondaryAction: 'meal_plan',
      ctaLabel: 'Log Next Meal',
      secondaryLabel: 'Open Plan',
      tone: 'primary',
      metrics: [
        { label: 'Remaining', value: `${Math.max(0, Math.round(input.caloriesRemaining))} kcal` },
        { label: 'Protein', value: `${Math.max(0, Math.round(input.proteinRemaining))}g left` },
      ],
    };
  } else if (input.waterPercent < 65) {
    focus = {
      title: 'Hydration needs attention',
      subtitle: 'Water is the easiest recovery lever left today. Bring that up now and keep the rest of the night simple.',
      icon: 'water-outline',
      action: 'water',
      secondaryAction: 'checkin',
      ctaLabel: 'Add Water',
      secondaryLabel: 'Check In',
      tone: 'accent',
      metrics: [
        { label: 'Hydration', value: `${Math.max(0, input.waterPercent)}%` },
        { label: 'Target', value: formatRemainingWater(input.waterRemainingMl) },
      ],
    };
  } else {
    focus = {
      title: 'Recovery is the play now',
      subtitle: 'Training is either closed or not the priority. Keep recovery habits tight and let the week compound.',
      icon: 'sparkles-outline',
      action: 'coach',
      secondaryAction: 'progress',
      ctaLabel: 'Open Coach',
      secondaryLabel: 'View Progress',
      tone: 'success',
      metrics: [
        { label: 'Sessions', value: `${input.sessionsThisWeek} this week` },
        { label: 'Consistency', value: `${Math.max(0, input.consistencyScore)}%` },
      ],
    };
  }

  let coachPulse: HomeDashboardCoachPulse;
  const prepDueSoon = Boolean(
    input.prepEnabled
    && input.prepNextCheckInDate
    && (new Date(input.prepNextCheckInDate).getTime() - input.now.getTime()) <= 2 * 24 * 60 * 60 * 1000
  );

  if (prepDueSoon) {
    coachPulse = {
      title: 'Prep check-in is close',
      message: 'Your next prep adjustment window is near. Get your check-in done on time so tomorrow’s targets stay honest.',
      icon: 'analytics-outline',
      action: 'checkin',
      ctaLabel: 'Open Check-In',
    };
  } else if (isDayWrapped) {
    coachPulse = {
      title: tomorrowPreview.title,
      message: `${tomorrowPreview.subtitle} Use tonight to make the next day feel obvious.`,
      icon: tomorrowPreview.icon,
      action: 'tomorrow',
      ctaLabel: 'Preview Tomorrow',
    };
  } else if (activeMeal?.timingStatus === 'missed') {
    coachPulse = {
      title: 'Recover the meal, do not chase it',
      message: activeMeal.recoveryHint || 'Take the next meal cleanly and keep the rest of the day inside the rails.',
      icon: 'refresh-circle-outline',
      action: 'meal',
      ctaLabel: 'Log Recovery Meal',
    };
  } else if (input.waterRemainingMl > 750 && dayPart !== 'morning') {
    coachPulse = {
      title: 'Hydration is the simplest win left',
      message: `${formatRemainingWater(input.waterRemainingMl)} is still open. Close that gap and tomorrow feels easier.`,
      icon: 'water-outline',
      action: 'water',
      ctaLabel: 'Add Water',
    };
  } else if (input.workoutStatus === 'planned') {
    coachPulse = {
      title: 'Do not let the workout drift',
      message: 'Training is still pending. Protect the session before small delays turn into a skipped day.',
      icon: 'barbell-outline',
      action: 'workout',
      ctaLabel: 'Open Workout',
    };
  } else if (input.proteinRemaining > 25 && !isMealDayComplete) {
    coachPulse = {
      title: 'Protein is still the cleanest lever',
      message: `You still have about ${Math.round(input.proteinRemaining)}g to recover. Keep the next meal protein-first and let the day tighten up.`,
      icon: 'nutrition-outline',
      action: 'meal_plan',
      ctaLabel: 'Review Plan',
    };
  } else {
    coachPulse = {
      title: 'Consistency is holding this week',
      message: `You are sitting around ${Math.max(0, input.consistencyScore)}% consistency. Stay boring and keep stacking clean days.`,
      icon: 'sparkles-outline',
      action: 'coach',
      ctaLabel: 'Open AI Coach',
    };
  }

  return {
    dayPart,
    meals,
    activeMeal,
    completedMealCount,
    isMealDayComplete,
    isDayWrapped,
    showMealFirst,
    focus,
    coachPulse,
    tomorrowPreview,
    habitDockLabel: isDayWrapped ? 'KEEP TIGHT' : 'HABIT DOCK',
  };
}
