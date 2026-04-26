// Analytics service for tracking user events and behavior.
// Persists events to Supabase for rollout validation and lifecycle analysis.

import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '../supabase';

export type QuickAddActionId = 'food' | 'water' | 'weight' | 'workout';

type AnalyticsProperties = Record<string, unknown>;

const analyticsSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

let analyticsUserId: string | null = null;
let analyticsUserProperties: AnalyticsProperties = {};
let analyticsInitialized = false;

function sanitizeAnalyticsValue(value: unknown): unknown {
  if (
    value == null
    || typeof value === 'string'
    || typeof value === 'number'
    || typeof value === 'boolean'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeAnalyticsValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, sanitizeAnalyticsValue(nestedValue)]),
    );
  }

  return String(value);
}

function sanitizeAnalyticsProperties(properties?: AnalyticsProperties): AnalyticsProperties {
  if (!properties) return {};
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [key, sanitizeAnalyticsValue(value)]),
  );
}

async function persistEvent(eventName: string, properties: AnalyticsProperties) {
  if (!isSupabaseConfigured || !analyticsUserId) return;

  try {
    await (supabase as any)
      .from('analytics_events')
      .insert({
        user_id: analyticsUserId,
        event_name: eventName,
        platform: Platform.OS,
        session_id: analyticsSessionId,
        properties,
      });
  } catch (error) {
    if (__DEV__) {
      console.warn('📊 Analytics persistence failed:', error);
    }
  }
}

export function initAnalytics() {
  if (analyticsInitialized) return;
  analyticsInitialized = true;

  if (isSupabaseConfigured) {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        analyticsUserId = session?.user?.id ?? null;
      })
      .catch((error) => {
        if (__DEV__) {
          console.warn('📊 Analytics session bootstrap failed:', error);
        }
      });
  }

  if (__DEV__) {
    console.log('📊 Analytics initialized (development mode)');
  }
}

export function trackEvent(eventName: string, properties?: AnalyticsProperties) {
  const mergedProperties = sanitizeAnalyticsProperties({
    ...analyticsUserProperties,
    ...properties,
  });

  if (__DEV__) {
    console.log('📊 Track Event:', eventName, mergedProperties);
  }

  void persistEvent(eventName, mergedProperties);
}

export function trackScreen(screenName: string, properties?: AnalyticsProperties) {
  if (__DEV__) {
    console.log('📊 Track Screen:', screenName, properties);
  }
  trackEvent('screen_view', {
    screen_name: screenName,
    ...properties,
  });
}

export function trackScreenView(screenName: string, properties?: AnalyticsProperties) {
  trackScreen(screenName, properties);
}

export function setUserId(userId: string | null) {
  analyticsUserId = userId;
  if (__DEV__) {
    console.log('📊 Set User ID:', userId);
  }
}

export function setUserProperties(properties: AnalyticsProperties) {
  analyticsUserProperties = sanitizeAnalyticsProperties(properties);
  if (__DEV__) {
    console.log('📊 Set User Properties:', analyticsUserProperties);
  }
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

export function trackWorkoutProgramFamilySelected(properties?: Record<string, any>) {
  trackEvent('workout_program_family_selected', properties);
}

export function trackWorkoutProgramTemplateViewed(properties?: Record<string, any>) {
  trackEvent('workout_program_template_viewed', properties);
}

export function trackWorkoutProgramTemplateCloned(properties?: Record<string, any>) {
  trackEvent('workout_program_template_cloned', properties);
}

export function trackWorkoutProgramWeeklyLayoutUpdated(properties?: Record<string, any>) {
  trackEvent('workout_program_weekly_layout_updated', properties);
}

export function trackWorkoutProgramPublishBlocked(properties?: Record<string, any>) {
  trackEvent('workout_program_publish_blocked', properties);
}

export function trackWorkoutPlanRegenerationOpened(properties?: Record<string, any>) {
  trackEvent('workout_plan_regeneration_opened', properties);
}

export function trackWorkoutPlanRegenerationReasonSelected(properties?: Record<string, any>) {
  trackEvent('workout_plan_regeneration_reason_selected', properties);
}

export function trackWorkoutPlanRegenerationPreviewRequested(properties?: Record<string, any>) {
  trackEvent('workout_plan_regeneration_preview_requested', properties);
}

export function trackWorkoutPlanRegenerationPreviewGenerated(properties?: Record<string, any>) {
  trackEvent('workout_plan_regeneration_preview_generated', properties);
}

export function trackWorkoutPlanRegenerationNoopBlocked(properties?: Record<string, any>) {
  trackEvent('workout_plan_regeneration_noop_blocked', properties);
}

export function trackWorkoutPlanRegenerationPreviewAccepted(properties?: Record<string, any>) {
  trackEvent('workout_plan_regeneration_preview_accepted', properties);
}

export function trackWorkoutPlanRegenerationPreviewDiscarded(properties?: Record<string, any>) {
  trackEvent('workout_plan_regeneration_preview_discarded', properties);
}

export function trackWorkoutPlanBuilderOpenedFromMyPlan(properties?: Record<string, any>) {
  trackEvent('workout_plan_builder_opened_from_my_plan', properties);
}

export function trackWorkoutPlanImportOpenedFromMyPlan(properties?: Record<string, any>) {
  trackEvent('workout_plan_import_opened_from_my_plan', properties);
}

export function trackExerciseMediaPreviewVisible(properties?: Record<string, any>) {
  trackEvent('exercise_media_preview_visible', properties);
}

export function trackExerciseMediaPreviewExpanded(properties?: Record<string, any>) {
  trackEvent('exercise_media_preview_expanded', properties);
}

export function trackExerciseDetailOpenedFromPreview(properties?: Record<string, any>) {
  trackEvent('exercise_detail_opened_from_preview', properties);
}

export function trackActiveSessionMediaCollapsed(properties?: Record<string, any>) {
  trackEvent('active_session_media_collapsed', properties);
}

export function trackActiveSessionMediaExpanded(properties?: Record<string, any>) {
  trackEvent('active_session_media_expanded', properties);
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

export function trackProgressDashboardRangeChanged(properties?: Record<string, any>) {
  trackEvent('progress_dashboard_range_changed', properties);
}

export function trackProgressDashboardCardTapped(properties?: Record<string, any>) {
  trackEvent('progress_dashboard_card_tapped', properties);
}

export function trackProgressStatusHeroRendered(properties?: Record<string, any>) {
  trackEvent('progress_status_hero_rendered', properties);
}

export function trackProgressTrendsRangeChanged(properties?: Record<string, any>) {
  trackEvent('progress_trends_range_changed', properties);
}

export function trackProgressPrHighlightOpened(properties?: Record<string, any>) {
  trackEvent('progress_pr_highlight_opened', properties);
}

export function trackProgressPrimarySectionChanged(properties?: Record<string, any>) {
  trackEvent('progress_primary_section_changed', properties);
}

export function trackProgressSecondarySectionChanged(properties?: Record<string, any>) {
  trackEvent('progress_secondary_section_changed', properties);
}

export function trackProgressDailyReviewViewed(properties?: Record<string, any>) {
  trackEvent('progress_daily_review_viewed', properties);
}

export function trackProgressWeeklyReviewViewed(properties?: Record<string, any>) {
  trackEvent('progress_weekly_review_viewed', properties);
}

export function trackProgressBodyTimelineViewed(properties?: Record<string, any>) {
  trackEvent('progress_body_timeline_viewed', properties);
}

export function trackProgressBodyCheckpointSelected(properties?: Record<string, any>) {
  trackEvent('progress_body_checkpoint_selected', properties);
}

export function trackProgressPhotoComparePairChanged(properties?: Record<string, any>) {
  trackEvent('progress_photo_compare_pair_changed', properties);
}

export function trackProgressReviewCtaTapped(properties?: Record<string, any>) {
  trackEvent('progress_review_cta_tapped', properties);
}

export function trackProgressBodyCtaTapped(properties?: Record<string, any>) {
  trackEvent('progress_body_cta_tapped', properties);
}

export function trackNutritionPrimarySectionChanged(properties?: Record<string, any>) {
  trackEvent('nutrition_primary_section_changed', properties);
}

export function trackNutritionTodayStatusRendered(properties?: Record<string, any>) {
  trackEvent('nutrition_today_status_rendered', properties);
}

export function trackNutritionQuickLogTapped(properties?: Record<string, any>) {
  trackEvent('nutrition_quick_log_tapped', properties);
}

export function trackNutritionMealDetailOpened(properties?: Record<string, any>) {
  trackEvent('nutrition_meal_detail_opened', properties);
}

export function trackNutritionPlanPreviewOpened(properties?: Record<string, any>) {
  trackEvent('nutrition_plan_preview_opened', properties);
}

export function trackNutritionPlanPreviewApplied(properties?: Record<string, any>) {
  trackEvent('nutrition_plan_preview_applied', properties);
}

export function trackNutritionPlanPreviewDiscarded(properties?: Record<string, any>) {
  trackEvent('nutrition_plan_preview_discarded', properties);
}

export function trackNutritionToolOpened(properties?: Record<string, any>) {
  trackEvent('nutrition_tool_opened', properties);
}

export function trackNutritionToolGateViewed(properties?: Record<string, any>) {
  trackEvent('nutrition_tool_gate_viewed', properties);
}
