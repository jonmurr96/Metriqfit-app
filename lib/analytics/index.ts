export {
  initAnalytics,
  trackEvent,
  trackScreen,
  trackScreenView,
  setUserId,
  setUserProperties,
  trackQuickAddOpen,
  trackQuickAddActionSelected,
  trackQuickAddDismissed,
  trackOnboardingStarted,
  trackOnboardingCompleted,
  trackWorkoutStarted,
  trackWorkoutCompleted,
  trackFoodLogged,
  trackWaterLogged,
  trackErrorDisplayed,
} from './analyticsService';

export type { QuickAddActionId } from './analyticsService';
