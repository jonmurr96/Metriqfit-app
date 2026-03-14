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

export function trackPlanReviewViewed(properties?: Record<string, any>) {
  trackEvent('plan_review_viewed', properties);
}

export function trackPlanReviewSectionEdited(properties?: Record<string, any>) {
  trackEvent('plan_review_section_edited', properties);
}

export function trackPlanReviewSectionAccepted(properties?: Record<string, any>) {
  trackEvent('plan_review_section_accepted', properties);
}

export function trackPlanReviewContinueClicked(properties?: Record<string, any>) {
  trackEvent('plan_review_continue_clicked', properties);
}

export function trackOnboardingPricingViewed(properties?: Record<string, any>) {
  trackEvent('onboarding_pricing_viewed', properties);
}

export function trackOnboardingPricingTierSelected(properties?: Record<string, any>) {
  trackEvent('onboarding_pricing_tier_selected', properties);
}

export function trackOnboardingPurchaseStarted(properties?: Record<string, any>) {
  trackEvent('onboarding_purchase_started', properties);
}

export function trackOnboardingPurchaseSucceeded(properties?: Record<string, any>) {
  trackEvent('onboarding_purchase_succeeded', properties);
}

export function trackOnboardingPurchaseFailed(properties?: Record<string, any>) {
  trackEvent('onboarding_purchase_failed', properties);
}

export function trackOnboardingFreeSelected(properties?: Record<string, any>) {
  trackEvent('onboarding_free_selected', properties);
}

// Workout Analytics
export function trackWorkoutStarted(workoutType?: string) {
  trackEvent('workout_started', { workout_type: workoutType });
}

export function trackWorkoutCompleted(workoutType?: string, duration?: number) {
  trackEvent('workout_completed', { workout_type: workoutType, duration });
}

export function trackWorkoutHomeViewed(properties?: Record<string, any>) {
  trackEvent('workout_home_viewed', properties);
}

export function trackWorkoutHomeQuickAccessTapped(properties?: Record<string, any>) {
  trackEvent('workout_home_quick_access_tapped', properties);
}

export function trackWorkoutHomeToolTapped(properties?: Record<string, any>) {
  trackEvent('workout_home_tool_tapped', properties);
}

export function trackWorkoutInsightRendered(properties?: Record<string, any>) {
  trackEvent('workout_insight_rendered', properties);
}

export function trackWorkoutHomeHeroRendered(properties?: Record<string, any>) {
  trackEvent('workout_home_hero_rendered', properties);
}

export function trackWorkoutHomeHeroTapped(properties?: Record<string, any>) {
  trackEvent('workout_home_hero_tapped', properties);
}

export function trackWorkoutHomeResumeTapped(properties?: Record<string, any>) {
  trackEvent('workout_home_resume_tapped', properties);
}

export function trackWorkoutTomorrowPreviewTapped(properties?: Record<string, any>) {
  trackEvent('workout_tomorrow_preview_tapped', properties);
}

export function trackWorkoutRecommendationRendered(properties?: Record<string, any>) {
  trackEvent('workout_recommendation_rendered', properties);
}

export function trackWorkoutRecommendationAccepted(properties?: Record<string, any>) {
  trackEvent('workout_recommendation_accepted', properties);
}

export function trackWorkoutRecommendationRejected(properties?: Record<string, any>) {
  trackEvent('workout_recommendation_rejected', properties);
}

export function trackWorkoutRecommendationReviewTapped(properties?: Record<string, any>) {
  trackEvent('workout_recommendation_review_tapped', properties);
}

export function trackWorkoutSecondaryUtilityTapped(properties?: Record<string, any>) {
  trackEvent('workout_secondary_utility_tapped', properties);
}

export function trackWorkoutNoteCreated(properties?: Record<string, any>) {
  trackEvent('workout_note_created', properties);
}

export function trackWorkoutNoteUpdated(properties?: Record<string, any>) {
  trackEvent('workout_note_updated', properties);
}

export function trackWorkoutNoteDeleted(properties?: Record<string, any>) {
  trackEvent('workout_note_deleted', properties);
}

export function trackWorkoutSetLogged(properties?: Record<string, any>) {
  trackEvent('workout_set_logged', properties);
}

export function trackWorkoutSetRepeatLastUsed(properties?: Record<string, any>) {
  trackEvent('workout_set_repeat_last_used', properties);
}

export function trackWorkoutSetRepeatPlusFiveUsed(properties?: Record<string, any>) {
  trackEvent('workout_set_repeat_plus_five_used', properties);
}

export function trackWorkoutSetDeleted(properties?: Record<string, any>) {
  trackEvent('workout_set_deleted', properties);
}

export function trackWorkoutSetEdited(properties?: Record<string, any>) {
  trackEvent('workout_set_edited', properties);
}

export function trackWorkoutRestTimerStarted(properties?: Record<string, any>) {
  trackEvent('workout_rest_timer_started', properties);
}

export function trackWorkoutRestTimerSkipped(properties?: Record<string, any>) {
  trackEvent('workout_rest_timer_skipped', properties);
}

export function trackWorkoutNextExerciseTapped(properties?: Record<string, any>) {
  trackEvent('workout_next_exercise_tapped', properties);
}

export function trackWorkoutFinishSheetOpened(properties?: Record<string, any>) {
  trackEvent('workout_finish_sheet_opened', properties);
}

export function trackWorkoutFinishConfirmed(properties?: Record<string, any>) {
  trackEvent('workout_finish_confirmed', properties);
}

export function trackWorkoutFinishEarlyConfirmed(properties?: Record<string, any>) {
  trackEvent('workout_finish_early_confirmed', properties);
}

// Nutrition Analytics
export function trackFoodLogged(source?: string) {
  trackEvent('food_logged', { source });
}

export function trackWaterLogged(amount?: number) {
  trackEvent('water_logged', { amount });
}

export function trackRecipeImportStarted(properties?: Record<string, any>) {
  trackEvent('recipe_import_started', properties);
}

export function trackRecipeImportCompleted(properties?: Record<string, any>) {
  trackEvent('recipe_import_completed', properties);
}

export function trackMenuScanStarted(properties?: Record<string, any>) {
  trackEvent('menu_scan_started', properties);
}

export function trackMenuScanCompleted(properties?: Record<string, any>) {
  trackEvent('menu_scan_completed', properties);
}

export function trackMealBuilderRun(properties?: Record<string, any>) {
  trackEvent('meal_builder_run', properties);
}

export function trackPantryUpdated(properties?: Record<string, any>) {
  trackEvent('pantry_updated', properties);
}

// Home + Progress Analytics
export function trackHomeViewed(properties?: Record<string, any>) {
  trackEvent('home_viewed', properties);
}

export function trackHomeCtaTapped(properties?: Record<string, any>) {
  trackEvent('home_cta_tapped', properties);
}

export function trackHomeCardRendered(properties?: Record<string, any>) {
  trackEvent('home_card_rendered', properties);
}

export function trackProgressViewed(properties?: Record<string, any>) {
  trackEvent('progress_viewed', properties);
}

export function trackProgressTimeframeChanged(properties?: Record<string, any>) {
  trackEvent('progress_timeframe_changed', properties);
}

export function trackProgressCardRendered(properties?: Record<string, any>) {
  trackEvent('progress_card_rendered', properties);
}

export function trackProgressCtaTapped(properties?: Record<string, any>) {
  trackEvent('progress_cta_tapped', properties);
}

export function trackProgressPhotoUploaded(properties?: Record<string, any>) {
  trackEvent('progress_photo_uploaded', properties);
}

export function trackProgressPhotoDeleted(properties?: Record<string, any>) {
  trackEvent('progress_photo_deleted', properties);
}

export function trackProgressPhotoTimelineViewed(properties?: Record<string, any>) {
  trackEvent('progress_photo_timeline_viewed', properties);
}

// Error Analytics
export function trackErrorDisplayed(error: string, context?: string) {
  trackEvent('error_displayed', { error, context });
}

// Progress Tab Rebuild – New Events
export function trackProgressCardCompleted(properties?: Record<string, any>) {
  trackEvent('progress_card_completed', properties);
}

export function trackProgressWeeklyActivityViewed(properties?: Record<string, any>) {
  trackEvent('progress_weekly_activity_viewed', properties);
}

export function trackProgressGoalTrackerTapped(properties?: Record<string, any>) {
  trackEvent('progress_goal_tracker_tapped', properties);
}

export function trackProgressPhotoCompareViewed(properties?: Record<string, any>) {
  trackEvent('progress_photo_compare_viewed', properties);
}

export function trackProgressHistoryRangeChanged(properties?: Record<string, any>) {
  trackEvent('progress_history_range_changed', properties);
}
