/**
 * Route Constants for MetriqFit
 * 
 * Following PRD Section 6 Navigation Contract
 * All route names are defined here as constants to prevent typos and ensure consistency
 */

// Tab Routes
export const TAB_ROUTES = {
  HOME: 'home',
  WORKOUT: 'workout',
  NUTRITION: 'nutrition',
  PROGRESS: 'progress',
  AI_COACH: 'ai-coach',
} as const;

// Home Stack Routes
export const HOME_ROUTES = {
  DASHBOARD: 'index',
  DAILY_SUMMARY: 'daily-summary',
} as const;

// Workout Stack Routes
export const WORKOUT_ROUTES = {
  HOME: 'index',
  PROGRAM_BROWSER: 'program-browser',
  PROGRAM_DETAIL: 'program-detail',
  DAY_PREVIEW: 'day-preview',
  ACTIVE_SESSION: 'active-session',
  WORKOUT_HISTORY: 'workout-history',
  SESSION_DETAIL: 'session-detail',
  EXERCISE_LIBRARY: 'exercise-library',
  EXERCISE_DETAIL: 'exercise-detail',
  PRS: 'prs',
  PR_DETAIL: 'pr-detail',
  PLATE_CALCULATOR: 'calculators/plate-calculator',
  ONE_REP_MAX: 'calculators/one-rep-max',
} as const;

// Nutrition Stack Routes
export const NUTRITION_ROUTES = {
  HOME: 'index',
  FOOD_SEARCH: 'food-search',
  FOOD_DETAIL: 'food-detail',
  FOOD_CAMERA: 'food-camera',
  BARCODE_SCANNER: 'barcode-scanner',
  MEAL_DETAIL: 'meal-detail',
  NUTRITION_HISTORY: 'nutrition-history',
  NUTRITION_PLAN: 'nutrition-plan',
  GROCERY_LIST: 'grocery-list',
} as const;

// Progress Stack Routes
export const PROGRESS_ROUTES = {
  HOME: 'index',
  DAILY_SUMMARY: 'daily-summary',
  TRENDS: 'trends',
  WEIGHT_TREND_DETAIL: 'weight-trend-detail',
  MACRO_TREND_DETAIL: 'macro-trend-detail',
  TRAINING_TREND_DETAIL: 'training-trend-detail',
  WEEKLY_REVIEW: 'weekly-review',
} as const;

// AI Coach Stack Routes
export const AI_COACH_ROUTES = {
  HOME: 'index',
  CHAT_THREAD: 'chat-thread',
  INSIGHT_DETAIL: 'insight-detail',
} as const;

// Modal/Sheet Routes
export const MODAL_ROUTES = {
  QUICK_ADD: 'quick-add-sheet',
  LOG_WEIGHT: 'log-weight-sheet',
  LOG_WATER: 'log-water-sheet',
  LOG_STEPS: 'log-steps-sheet',
} as const;

// Quick Add Actions (PRD Section 6.2)
export const QUICK_ADD_ACTIONS = [
  {
    id: 'scan_meal_photo',
    label: 'Scan Meal Photo',
    description: 'AI-powered food recognition',
    icon: 'camera-outline',
    route: `/(tabs)/nutrition/food-camera`,
    requiredTier: 'free',
  },
  {
    id: 'scan_barcode',
    label: 'Scan Barcode',
    description: 'Look up packaged foods',
    icon: 'barcode-outline',
    route: `/(tabs)/nutrition/barcode-scanner`,
    requiredTier: 'premium',
  },
  {
    id: 'start_workout',
    label: 'Start Workout',
    description: 'Begin or resume workout',
    icon: 'barbell',
    route: `/(tabs)/workout`,
    requiredTier: 'free',
  },
  {
    id: 'log_weight',
    label: 'Log Weight',
    description: 'Record your weight',
    icon: 'body-outline',
    route: '/log-weight-sheet',
    isModal: true,
    requiredTier: 'free',
  },
  {
    id: 'log_water',
    label: 'Log Water',
    description: 'Track hydration',
    icon: 'water-outline',
    route: '/log-water-sheet',
    isModal: true,
    requiredTier: 'free',
  },
] as const;

export const PROGRESS_QUICK_ADD_ACTIONS = [
  {
    id: 'log_weight',
    label: 'Log Weight',
    description: 'Record your current weight',
    icon: 'scale-outline',
    route: '/log-weight-sheet',
    isModal: true,
    requiredTier: 'free',
  },
  {
    id: 'progress_checkin',
    label: 'Progress Check-in',
    description: 'Add body metrics and photos',
    icon: 'body-outline',
    route: '/check-in',
    isModal: false,
    requiredTier: 'free',
  },
  {
    id: 'progress_photos',
    label: 'Body Photos',
    description: 'Review or compare check-ins',
    icon: 'camera-outline',
    route: '/(tabs)/progress/photos',
    requiredTier: 'free',
  },
  {
    id: 'start_workout',
    label: 'Start Workout',
    description: 'Begin or resume workout',
    icon: 'barbell',
    route: '/(tabs)/workout',
    requiredTier: 'free',
  },
  {
    id: 'quick_add_food',
    label: 'Log Food',
    description: 'Search and add a meal',
    icon: 'restaurant-outline',
    route: '/(tabs)/nutrition/food-search',
    requiredTier: 'free',
  },
  {
    id: 'scan_meal_photo',
    label: 'Scan Meal',
    description: 'AI-powered food recognition',
    icon: 'camera-outline',
    route: '/(tabs)/nutrition/food-camera',
    requiredTier: 'free',
  },
  {
    id: 'log_water',
    label: 'Log Water',
    description: 'Track hydration',
    icon: 'water-outline',
    route: '/log-water-sheet',
    isModal: true,
    requiredTier: 'free',
  },
  {
    id: 'log_steps',
    label: 'Log Steps',
    description: 'Record daily movement',
    icon: 'walk-outline',
    route: '/log-steps-sheet',
    isModal: true,
    requiredTier: 'free',
  },
  {
    id: 'weekly_review',
    label: 'Weekly Review',
    description: 'Open the weekly scorecard',
    icon: 'calendar-outline',
    route: '/(tabs)/progress/weekly-review',
    requiredTier: 'free',
  },
] as const;

export type QuickAddAction = typeof QUICK_ADD_ACTIONS[number] | typeof PROGRESS_QUICK_ADD_ACTIONS[number];
export type QuickAddActionId = QuickAddAction['id'];
