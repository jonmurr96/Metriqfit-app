/**
 * MetriqFit React Query Hooks
 * Central export for all domain hooks
 */

// User hooks
export {
  userKeys,
  useProfile,
  useUserTargets,
  useOnboardingAnswers,
  useMeasurements,
  useUpdateProfile,
  useLogMeasurement,
  useDeleteMeasurement,
  useUserDashboard,
  type Profile,
  type UserTargets,
  type Measurement,
  type OnboardingAnswersRecord,
} from './useUser';

// Nutrition hooks
export {
  nutritionKeys,
  useSearchFoods,
  useFoodById,
  useFoodByBarcode,
  useDailyTotals,
  useDailyMeals,
  useLogFood,
  useDeleteMealLogItem,
} from './useNutrition';

export {
  nutritionDashboardKeys,
  useNutritionTodaySnapshot,
  useNutritionToolsSnapshot,
} from './useNutritionDashboard';

// Workout hooks
export {
  workoutKeys,
  usePrograms,
  useProgramWithDays,
  useExercises,
  useActiveSession,
  useWorkoutHistory,
  useUserPRs,
  useWorkoutStats,
  useStartSession,
  useAddExerciseToSession,
  useLogSet,
  useFinishSession,
  useCheckAndUpdatePR,
} from './useWorkout';

// Workout builder hooks
export {
  workoutBuilderKeys,
  useWorkoutProgramFamilies,
  useWorkoutProgramsByFamily,
  useWorkoutProgramTemplateV2,
  usePlanDayBlocks,
  useCreateCustomWorkoutProgram,
  useCreateWorkoutPlanFromTemplateV2,
  useAddPlanDayBlock,
  useUpdatePlanDayBlock,
  useRemovePlanDayBlock,
  useAddBlockExercise,
  useUpdateBlockExercise,
  useRemoveBlockExercise,
  usePublishWorkoutProgram,
} from './useWorkoutBuilder';

// Workout import hooks
export {
  workoutImportKeys,
  useWorkoutImportJob,
  useImportWorkoutPlan,
  useResolveWorkoutImportMappings,
} from './useWorkoutImport';

// Workout adaptation hooks
export {
  workoutAdaptationKeys,
  useWorkoutAdaptationRecommendations,
  useGenerateWorkoutAdaptationRecommendations,
  useApplyWorkoutAdaptationRecommendation,
  useSetWorkoutAdaptationRecommendationStatus,
} from './useWorkoutAdaptation';

// Water hooks
export {
  waterKeys,
  useDailyWaterLogs,
  useDailyWaterSummary,
  useWaterHistory,
  useLogWater,
  useDeleteWaterLog,
  useQuickAddWater,
} from './useWater';

// AI Coach hooks
export {
  aiCoachKeys,
  useConversationHistory,
  useParsedConversationHistory,
  useRateLimitStatus,
  useDailyAIUsage,
  useSuggestedPrompts,
  useConsistencyRecommendation,
  useAICoachDashboard,
  useAICoachInterventions,
  useAICoachMemory,
  useUpdateAICoachMemoryStatus,
  useSendMessage,
  useClearConversation,
  useAIChat,
} from './useAICoach';

// Plan hooks
export {
  planKeys,
  useActiveWorkoutPlan,
  useActiveNutritionPlan,
  useLatestNutritionPlanPreview,
  useEditableNutritionPlanContext,
  useWorkoutPlanHistory,
  useNutritionPlanHistory,
  useWorkoutPlanDay,
  useTodaysWorkout,
  useTodayWorkoutScheduleEntry,
  useWorkoutSchedule,
  useNutritionPlanDay,
  useNutritionPlanMeal,
  useGenerationHistory,
  useTriggerPlanGeneration,
  useWorkoutPlanPreview,
  useWorkoutPlanCoherence,
  useGenerateNutritionPlanPreview,
  useGenerateWorkoutPlanPreview,
  useApplyNutritionPlanPreview,
  useApplyWorkoutPlanPreview,
  useDiscardNutritionPlanPreview,
  useDiscardWorkoutPlanPreview,
  useRepairWorkoutPlanPreview,
  useMarkDayCompleted,
  useSwapExercise,
  useUpdateExerciseTargets,
  useAddWorkoutPlanExercise,
  useRemoveWorkoutPlanExercise,
  useMoveWorkoutPlanExercise,
  useApplyMealPlanChange,
  useApplyMealPlanBatchChange,
  useAddNutritionPlanMeal,
  useRemoveNutritionPlanMeal,
  useMoveNutritionPlanMeal,
  useCopyNutritionDayMeals,
  useRescheduleWorkoutDay,
  useComputePlanConsistency,
  useConsistencyHistory,
  useLatestConsistency,
  useReactivatePlan,
  usePlanDashboard,
} from './usePlan';

// Subscription hooks
export {
  subscriptionKeys,
  useSubscription,
  useEntitlementStatus,
  useAvailablePackages,
  usePurchasePackage,
  useRestorePurchases,
  useHostedPaywall,
  useCustomerCenter,
  useFeatureAccess,
  useFeatureLimit,
  useSubscriptionUI,
  usePaywall,
  useBillingStatus,
} from './useSubscription';

// Recipe import hooks
export {
  recipeImportKeys,
  useImportRecipe,
} from './useRecipeImport';

// Menu scan hooks
export {
  menuScanKeys,
  useMenuScan,
} from './useMenuScan';

// Pantry hooks
export {
  pantryKeys,
  usePantryItems,
  usePantryItem,
  usePantryTransactions,
  useCreatePantryItem,
  useUpdatePantryItem,
  useLogPantryTransaction,
} from './usePantry';

// Grocery hooks
export {
  groceryKeys,
  useGroceryLists,
  useGroceryListItems,
  useArchiveGroceryList,
} from './useGrocery';

// Meal builder hooks
export {
  mealBuilderKeys,
  useBuildMealsFromConstraints,
  useApplyMealsBatch,
} from './useMealBuilder';

// Meal Times hooks
export {
  useMealTimes,
  useFormattedMealTimes,
  formatTime12h,
  DEFAULT_MEAL_TIMES,
  type MealTimes,
} from './useMealTimes';

// Check-in hooks
export {
  usePreviewCheckIn,
  useApplyCheckInUpdates,
} from './useCheckIn';

// Prep coach hooks
export {
  prepCoachKeys,
  usePrepCoachState,
  usePrepAdjustmentHistory,
  useRunPrepCheckInAdjustment,
  useRevertPrepAdjustment,
} from './usePrepCoach';

// Progress photo hooks
export {
  progressMetricKeys,
  useProgressSnapshot,
  useProgressTrends,
  useProgressRecordSummary,
  useHomeSnapshot,
  useWeeklyActivity,
  type ProgressRangeOption,
  type ProgressSnapshot,
  type ProgressTrendSnapshot,
  type ProgressRecordSummary,
  type HomeSnapshot,
  type DailyActivityStatus,
} from './useProgressMetrics';

// Progress review hooks
export {
  progressReviewKeys,
  useProgressDailyReview,
  useProgressWeeklyReview,
  type ProgressDailyReviewSnapshot,
  type ProgressWeeklyReviewSnapshot,
  type ProgressReviewStatus,
  type ProgressReviewMiss,
  type ProgressReviewAction,
} from './useProgressReview';

// Progress body hooks
export {
  progressBodyKeys,
  useProgressBodyTimeline,
  useProgressPhotoCompare,
  useLatestBodyCheckInStatus,
  type ProgressBodyTimelineSnapshot,
  type ProgressBodyCheckpoint,
  type ProgressCheckpointStatSummary,
  type ProgressPhotoCompareSnapshot,
  type ProgressComparePair,
  type ProgressBodyStatusSnapshot,
  type ProgressPhotoAngle,
} from './useProgressBody';

// Progress photo hooks
export {
  progressPhotoKeys,
  useProgressPhotos,
  useUploadProgressPhoto,
  useDeleteProgressPhoto,
} from './useProgressPhotos';

// Onboarding review hooks
export {
  onboardingReviewKeys,
  useOnboardingReviewState,
  useUpsertOnboardingReviewState,
  useSetReviewSectionAccepted,
  useSetPricingDecision,
  useUpdateReviewMacros,
  useUpdateReviewDailyTargets,
  useUpdateReviewWorkoutPlan,
  useAddReviewWorkoutDay,
  useRemoveReviewWorkoutDay,
  useUpdateReviewNutritionPlan,
} from './useOnboardingReview';

// Intelligent meal plan hook
export {
  useIntelligentMealPlan,
  type UseIntelligentMealPlanOptions,
  type UseIntelligentMealPlanReturn,
} from './useIntelligentMealPlan';
