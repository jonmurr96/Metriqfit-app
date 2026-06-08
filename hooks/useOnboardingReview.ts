import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { planKeys } from './usePlan';
import { userKeys } from './useUser';
import { subscriptionKeys } from './useSubscription';
import {
  addManualWorkoutPlanDay,
  getReviewState,
  removeManualWorkoutPlanDay,
  setSectionAccepted,
  setSectionsAccepted,
  setPricingDecision,
  upsertReviewState,
  updateManualDailyTargets,
  updateManualNutritionPlan,
  updateManualTargets,
  updateManualWorkoutPlan,
  type OnboardingReviewState,
  type PricingTier,
  type ReviewSection,
} from '../services/onboardingReviewService';

export const onboardingReviewKeys = {
  all: ['onboarding-review'] as const,
  byRun: (userId: string, runId: string) => [...onboardingReviewKeys.all, userId, runId] as const,
};

export function useOnboardingReviewState(runId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery<OnboardingReviewState | null>({
    queryKey: onboardingReviewKeys.byRun(user?.id || '', runId || ''),
    queryFn: () => getReviewState(user!.id, runId!, true),
    enabled: !!user && !!runId,
    staleTime: 60 * 1000,
  });
}

export function useUpsertOnboardingReviewState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, updates }: { runId: string; updates: Partial<OnboardingReviewState> }) =>
      upsertReviewState(user!.id, runId, updates),
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingReviewKeys.byRun(user!.id, data.generation_run_id), data);
    },
  });
}

export function useSetReviewSectionAccepted() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, section, accepted }: { runId: string; section: ReviewSection; accepted: boolean }) =>
      setSectionAccepted(user!.id, runId, section, accepted),
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingReviewKeys.byRun(user!.id, data.generation_run_id), data);
    },
  });
}

export function useSetReviewSectionsAccepted() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, sections, accepted }: { runId: string; sections: ReviewSection[]; accepted: boolean }) =>
      setSectionsAccepted(user!.id, runId, sections, accepted),
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingReviewKeys.byRun(user!.id, data.generation_run_id), data);
    },
  });
}

export function useSetPricingDecision() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, tier }: { runId: string; tier: PricingTier }) => setPricingDecision(user!.id, runId, tier),
    onSuccess: (data) => {
      queryClient.setQueryData(onboardingReviewKeys.byRun(user!.id, data.generation_run_id), data);
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.status(user!.id) });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.entitlement(user!.id) });
    },
  });
}

export function useUpdateReviewMacros() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { calories: number; protein_g: number; carbs_g: number; fat_g: number }) =>
      updateManualTargets(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.targets(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

export function useUpdateReviewDailyTargets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { water_ml: number; avg_steps: number | null }) => updateManualDailyTargets(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.targets(user!.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.onboarding(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

export function useUpdateReviewWorkoutPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
        name: string;
        description: string | null;
        days_per_week: number;
        preferred_days_off: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'no_preference')[];
        minutes_per_workout: string;
      }) => updateManualWorkoutPlan(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.onboarding(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workout() });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

export function useAddReviewWorkoutDay() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input?: {
      name?: string;
      focus?: string;
      preferred_days_off?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'no_preference')[];
    }) => addManualWorkoutPlanDay(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.onboarding(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workout() });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

export function useRemoveReviewWorkoutDay() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planDayId,
      preferred_days_off,
    }: {
      planDayId: string;
      preferred_days_off?: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | 'no_preference')[];
    }) => removeManualWorkoutPlanDay(user!.id, planDayId, preferred_days_off),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.onboarding(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.workout() });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}

export function useUpdateReviewNutritionPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      name: string;
      description: string | null;
      meals_per_day: '2' | '3' | '4' | '5_plus' | 'no_preference';
      dietary_preference: string;
      allergies_exclusions: string[];
      refused_foods: string[];
    }) => updateManualNutritionPlan(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.onboarding(user!.id) });
      queryClient.invalidateQueries({ queryKey: planKeys.nutrition() });
      queryClient.invalidateQueries({ queryKey: planKeys.consistency() });
    },
  });
}
