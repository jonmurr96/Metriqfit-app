/**
 * MetriqFit React Query Hooks
 * Central export for all domain hooks
 */

// User hooks
export {
  userKeys,
  useProfile,
  useUserTargets,
  useMeasurements,
  useUpdateProfile,
  useLogMeasurement,
  useDeleteMeasurement,
  useUserDashboard,
  type Profile,
  type UserTargets,
  type Measurement,
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
  useGenerationHistory,
  useTriggerPlanGeneration,
  useMarkDayCompleted,
  useSwapExercise,
  useUpdateExerciseTargets,
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
} from './useSubscription';
