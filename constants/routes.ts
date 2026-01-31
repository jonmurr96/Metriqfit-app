/**
 * Route Constants
 * Central registry of all app routes to prevent typos and enable refactoring
 */

export const ROUTES = {
  // Auth
  AUTH: {
    SIGN_IN: '/(auth)/sign-in',
    SIGN_UP: '/(auth)/sign-up',
    FORGOT_PASSWORD: '/(auth)/forgot-password',
  },

  // Onboarding
  ONBOARDING: {
    IDENTITY: '/(onboarding)/identity',
    BODY_STATS: '/(onboarding)/body-stats',
    GOALS_LIFESTYLE: '/(onboarding)/goals-lifestyle',
    NUTRITION_PREFS: '/(onboarding)/nutrition-prefs',
    TRAINING_SETUP: '/(onboarding)/training-setup',
  },

  // Main Tabs
  TABS: {
    HOME: '/(tabs)/home',
    WORKOUT: '/(tabs)/workout',
    NUTRITION: '/(tabs)/nutrition',
    PROGRESS: '/(tabs)/progress',
    AI_COACH: '/(tabs)/ai-coach',
  },

  // Home Stack
  HOME: {
    INDEX: '/(tabs)/home/',
    DAILY_SUMMARY: '/(tabs)/home/daily-summary',
  },

  // Workout Stack
  WORKOUT: {
    INDEX: '/(tabs)/workout/',
    PROGRAM_BROWSER: '/(tabs)/workout/program-browser',
    DAY_PREVIEW: '/(tabs)/workout/day-preview',
    ACTIVE_SESSION: '/(tabs)/workout/active-session',
    EXERCISE_LIBRARY: '/(tabs)/workout/exercise-library',
    EXERCISE_DETAIL: '/(tabs)/workout/exercise-detail',
    WORKOUT_HISTORY: '/(tabs)/workout/workout-history',
    SESSION_DETAIL: '/(tabs)/workout/session-detail',
  },

  // Nutrition Stack
  NUTRITION: {
    INDEX: '/(tabs)/nutrition/',
    FOOD_SEARCH: '/(tabs)/nutrition/food-search',
    FOOD_DETAIL: '/(tabs)/nutrition/food-detail',
    FOOD_CAMERA: '/(tabs)/nutrition/food-camera',
    BARCODE_SCANNER: '/(tabs)/nutrition/barcode-scanner',
    MEAL_DETAIL: '/(tabs)/nutrition/meal-detail',
  },

  // Progress Stack
  PROGRESS: {
    INDEX: '/(tabs)/progress/',
    DAILY_SUMMARY: '/(tabs)/progress/daily-summary',
    TRENDS: '/(tabs)/progress/trends',
    WEEKLY_REVIEW: '/(tabs)/progress/weekly-review',
  },

  // AI Coach Stack
  AI_COACH: {
    INDEX: '/(tabs)/ai-coach/',
  },

  // Modal Sheets
  SHEETS: {
    LOG_WATER: '/log-water-sheet',
    LOG_WEIGHT: '/log-weight-sheet',
    LOG_STEPS: '/log-steps-sheet',
    QUICK_ADD: '/quick-add-sheet',
  },

  // Settings
  SETTINGS: {
    INDEX: '/settings',
    PROFILE: '/settings/profile',
    TARGETS: '/settings/targets',
    NOTIFICATIONS: '/settings/notifications',
    SUBSCRIPTION: '/settings/subscription',
    PRIVACY: '/settings/privacy',
    ABOUT: '/settings/about',
  },
} as const;

// Quick Add Action IDs
export const QUICK_ADD_ACTIONS = {
  SCAN_MEAL_PHOTO: 'scan_meal_photo',
  SCAN_BARCODE: 'scan_barcode',
  QUICK_ADD_FOOD: 'quick_add_food',
  START_WORKOUT: 'start_workout',
  LOG_WEIGHT: 'log_weight',
  LOG_WATER: 'log_water',
  LOG_STEPS: 'log_steps',
} as const;

// Map Quick Add actions to routes
export const QUICK_ADD_ROUTES: Record<string, string> = {
  [QUICK_ADD_ACTIONS.SCAN_MEAL_PHOTO]: ROUTES.NUTRITION.FOOD_CAMERA,
  [QUICK_ADD_ACTIONS.SCAN_BARCODE]: ROUTES.NUTRITION.BARCODE_SCANNER,
  [QUICK_ADD_ACTIONS.QUICK_ADD_FOOD]: ROUTES.NUTRITION.FOOD_SEARCH,
  [QUICK_ADD_ACTIONS.START_WORKOUT]: ROUTES.WORKOUT.ACTIVE_SESSION,
  [QUICK_ADD_ACTIONS.LOG_WEIGHT]: ROUTES.SHEETS.LOG_WEIGHT,
  [QUICK_ADD_ACTIONS.LOG_WATER]: ROUTES.SHEETS.LOG_WATER,
  [QUICK_ADD_ACTIONS.LOG_STEPS]: ROUTES.SHEETS.LOG_STEPS,
};

export type RouteKeys = typeof ROUTES;
