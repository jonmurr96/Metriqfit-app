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
  useRateLimitStatus,
  useDailyAIUsage,
  useSuggestedPrompts,
  useConsistencyRecommendation,
  useSendMessage,
  useClearConversation,
  useAIChat,
} from './useAICoach';

// Plan hooks
export {
  planKeys,
  useActiveWorkoutPlan,
  useActiveNutritionPlan,
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
