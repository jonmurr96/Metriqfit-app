// Analytics service for tracking user events and behavior
// Currently a placeholder - integrate with your preferred analytics provider

export type QuickAddActionId = 'food' | 'water' | 'weight' | 'workout';

export function initAnalytics() {
  // Initialize analytics service here
  // Example: Google Analytics, Mixpanel, Amplitude, etc.
  if (__DEV__) {
    console.log('📊 Analytics initialized (development mode)');
  }
}

export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (__DEV__) {
    console.log('📊 Track Event:', eventName, properties);
  }
  // Add your analytics tracking logic here
}

export function trackScreen(screenName: string, properties?: Record<string, any>) {
  if (__DEV__) {
    console.log('📊 Track Screen:', screenName, properties);
  }
  // Add your screen tracking logic here
}

export function trackScreenView(screenName: string, properties?: Record<string, any>) {
  trackScreen(screenName, properties);
}

export function setUserId(userId: string) {
  if (__DEV__) {
    console.log('📊 Set User ID:', userId);
  }
  // Add your user identification logic here
}

export function setUserProperties(properties: Record<string, any>) {
  if (__DEV__) {
    console.log('📊 Set User Properties:', properties);
  }
  // Add your user properties logic here
}

// Quick Add Sheet Analytics
export async function trackQuickAddOpen() {
  trackEvent('quick_add_opened');
}

export async function trackQuickAddActionSelected(actionId: QuickAddActionId) {
  trackEvent('quick_add_action_selected', { action_id: actionId });
}

export async function trackQuickAddDismissed() {
  trackEvent('quick_add_dismissed');
}

// Onboarding Analytics
export function trackOnboardingStarted() {
  trackEvent('onboarding_started');
}

export function trackOnboardingCompleted() {
  trackEvent('onboarding_completed');
}

// Workout Analytics
export function trackWorkoutStarted(workoutType?: string) {
  trackEvent('workout_started', { workout_type: workoutType });
}

export function trackWorkoutCompleted(workoutType?: string, duration?: number) {
  trackEvent('workout_completed', { workout_type: workoutType, duration });
}

// Nutrition Analytics
export function trackFoodLogged(source?: string) {
  trackEvent('food_logged', { source });
}

export function trackWaterLogged(amount?: number) {
  trackEvent('water_logged', { amount });
}

// Error Analytics
export function trackErrorDisplayed(error: string, context?: string) {
  trackEvent('error_displayed', { error, context });
}
