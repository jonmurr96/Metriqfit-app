import type {
  AICoachAction,
  AICoachDashboardState,
  AICoachIntervention,
  AICoachMemoryItem,
  CoachContext,
  ConsistencyRecommendation,
  PrepCoachSummary,
  RateLimitStatus,
} from '../../services/aiCoachService';
import type { NutritionTodaySnapshot } from '../../services/nutritionDashboardService';
import type { WorkoutAdaptationRecommendation } from '../../services/workoutAdaptationService';

export interface AICoachDashboardBuildInput {
  coachContext: CoachContext;
  rateLimit: RateLimitStatus | null;
  consistencyRecommendation: ConsistencyRecommendation | null;
  prepSummary: PrepCoachSummary;
  nutritionSnapshot: NutritionTodaySnapshot | null;
  memoryItems: AICoachMemoryItem[];
  memoryPreview: AICoachMemoryItem[];
  workoutRecommendations: WorkoutAdaptationRecommendation[];
  structuredInterventions: AICoachIntervention[];
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function proteinBoostIntervention(input: AICoachDashboardBuildInput): AICoachIntervention | null {
  const { nutritionSnapshot, coachContext } = input;
  const nextMeal = nutritionSnapshot?.nextMeal;
  const dayPlan = nutritionSnapshot?.dayPlan;

  if (!nextMeal || !dayPlan || coachContext.proteinConsumed >= coachContext.proteinTarget) {
    return null;
  }

  const proteinRemaining = Math.max(0, coachContext.proteinTarget - coachContext.proteinConsumed);
  const boostProtein = Math.min(25, Math.max(15, round(proteinRemaining * 0.4)));
  const boostCalories = Math.min(220, Math.max(90, Math.round(boostProtein * 5)));
  const existingMeal = dayPlan.meals.find((meal) => meal.id === nextMeal.planMealId);

  if (!existingMeal) return null;

  return {
    id: `nutrition-recovery-${existingMeal.id}`,
    kind: 'nutrition',
    priority: 85,
    title: `Rebalance ${nextMeal.slotLabel.toLowerCase()} for protein`,
    summary: `Raise ${nextMeal.slotLabel.toLowerCase()} by about ${boostProtein}g protein so the rest of the day stays recoverable.`,
    statusLabel: 'Recovery',
    reviewLabel: 'Review meal shift',
    applyLabel: 'Apply meal shift',
    rejectLabel: 'Dismiss',
    canApply: true,
    canReject: true,
    batchChange: {
      type: 'nutrition_plan_batch_change',
      title: `Protein recovery shift for ${nextMeal.slotLabel}`,
      summary: `Increase ${nextMeal.slotLabel.toLowerCase()} protein and calories without changing the rest of the day.`,
      planId: dayPlan.planId,
      dayOfWeek: dayPlan.dayOfWeek,
      meals: [
        {
          meal_slot: existingMeal.meal_slot,
          name: existingMeal.selected_variant?.name || existingMeal.name,
          description: `${existingMeal.description || 'Coach-adjusted'} • protein recovery emphasis`,
          target_calories: Math.round(nextMeal.targetCalories + boostCalories),
          target_protein: round(nextMeal.targetProtein + boostProtein),
          target_carbs: round(nextMeal.targetCarbs),
          target_fat: round(nextMeal.targetFat),
          prep_time_min: existingMeal.prep_time_min || 15,
        },
      ],
      rationale: `Protein remaining is ${Math.round(proteinRemaining)}g with ${nextMeal.slotLabel.toLowerCase()} still open.`,
      impactSummary: `Adds ~${boostProtein}g protein to the planned target for ${nextMeal.slotLabel.toLowerCase()}.`,
    },
    memoryDraft: {
      memoryType: 'intervention',
      title: `Adjusted ${nextMeal.slotLabel.toLowerCase()} for protein`,
      body: `Applied a coach-led protein recovery shift to ${nextMeal.slotLabel.toLowerCase()}.`,
      priority: 70,
    },
  };
}

function workoutInterventions(recommendations: WorkoutAdaptationRecommendation[]): AICoachIntervention[] {
  return recommendations
    .filter((rec) => rec.status === 'pending')
    .map((rec) => ({
      id: `workout-${rec.id}`,
      kind: 'workout',
      priority: 100,
      title:
        rec.recommendation_type === 'deload_microcycle'
          ? 'Reduce training stress'
          : rec.recommendation_type === 'schedule_recovery_shift'
            ? 'Shift to active recovery'
            : rec.recommendation_type === 'load_adjustment'
              ? 'Reduce loading guidance'
              : 'Review workout change',
      summary: rec.rationale || 'A workout adaptation recommendation is ready for review.',
      statusLabel: 'Pending',
      reviewLabel: 'Review workout change',
      applyLabel: 'Apply change',
      rejectLabel: 'Reject',
      recommendationId: rec.id,
      recommendationType: rec.recommendation_type,
      canApply: true,
      canReject: true,
      memoryDraft: {
        memoryType: 'intervention',
        title: 'Workout plan updated',
        body: rec.rationale || 'Applied a workout recommendation from AI Coach.',
        priority: 85,
      },
    }));
}

function prepIntervention(prepSummary: PrepCoachSummary): AICoachIntervention | null {
  if (!prepSummary.enabled || !prepSummary.coachSummary) return null;

  return {
    id: 'prep-summary',
    kind: 'prep',
    priority: 70,
    title: 'Prep adjustment is in play',
    summary: prepSummary.coachSummary,
    statusLabel: prepSummary.lastStatus === 'applied' ? 'Applied' : 'Prep',
    reviewLabel: 'Review prep context',
    canApply: false,
    canReject: false,
  };
}

function uniqInterventions(interventions: AICoachIntervention[]) {
  const seen = new Set<string>();
  return interventions.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function chooseStatus(input: {
  queueItems: AICoachIntervention[];
  nutritionSnapshot: NutritionTodaySnapshot | null;
  prepSummary: PrepCoachSummary;
  consistencyRecommendation: ConsistencyRecommendation | null;
}) {
  const { queueItems, nutritionSnapshot, prepSummary, consistencyRecommendation } = input;
  const top = queueItems[0];

  if (top?.kind === 'workout') {
    return {
      status: 'watch' as const,
      statusLabel: 'Watch',
      headline: top.title,
      summary: top.summary,
    };
  }

  if (top?.kind === 'nutrition') {
    return {
      status: 'behind' as const,
      statusLabel: 'Behind',
      headline: top.title,
      summary: top.summary,
    };
  }

  if (prepSummary.enabled && prepSummary.coachSummary) {
    return {
      status: 'prep_active' as const,
      statusLabel: 'Prep Active',
      headline: 'Prep priorities are driving the day',
      summary: prepSummary.coachSummary,
    };
  }

  if (consistencyRecommendation?.title) {
    return {
      status: 'recovery' as const,
      statusLabel: 'Recovery',
      headline: consistencyRecommendation.title,
      summary: consistencyRecommendation.message || 'Coach has a consistency recovery suggestion ready.',
    };
  }

  if (nutritionSnapshot?.nextMeal) {
    return {
      status: 'on_track' as const,
      statusLabel: 'On Track',
      headline: `${nutritionSnapshot.nextMeal.slotLabel} is the next lever`,
      summary: `${nutritionSnapshot.nextMeal.mealName} at ${nutritionSnapshot.nextMeal.timeLabel}.`,
    };
  }

  return {
    status: 'on_track' as const,
    statusLabel: 'On Track',
    headline: 'Coach is grounded and ready',
    summary: 'Ask about today, review a recommendation, or tighten the next move.',
  };
}

function choosePrimaryAction(queueItems: AICoachIntervention[]): AICoachAction | null {
  const top = queueItems[0];
  if (!top) {
    return { type: 'send_prompt', label: 'Ask Coach', prompt: 'What matters most for me today?' };
  }

  return {
    type: 'review_intervention',
    label: top.reviewLabel,
    interventionId: top.id,
  };
}

export function buildAICoachDashboardState(input: AICoachDashboardBuildInput): AICoachDashboardState {
  const workoutItems = workoutInterventions(input.workoutRecommendations);
  const nutritionItem = proteinBoostIntervention(input);
  const prepItem = prepIntervention(input.prepSummary);

  const queueItems = uniqInterventions([
    ...workoutItems,
    ...(nutritionItem ? [nutritionItem] : []),
    ...(prepItem ? [prepItem] : []),
    ...input.structuredInterventions,
  ]).sort((a, b) => b.priority - a.priority);

  const status = chooseStatus({
    queueItems,
    nutritionSnapshot: input.nutritionSnapshot,
    prepSummary: input.prepSummary,
    consistencyRecommendation: input.consistencyRecommendation,
  });

  const caloriesRemaining = Math.max(0, round(input.coachContext.calorieTarget - input.coachContext.caloriesConsumed));
  const proteinRemaining = Math.max(0, round(input.coachContext.proteinTarget - input.coachContext.proteinConsumed));
  const hydrationPercent = input.coachContext.waterTarget > 0
    ? Math.min(100, Math.round((input.coachContext.waterConsumed / input.coachContext.waterTarget) * 100))
    : 0;

  const briefDetails = [
    { label: 'Calories left', value: `${Math.round(caloriesRemaining)} kcal` },
    { label: 'Protein left', value: `${Math.round(proteinRemaining)} g` },
    { label: 'Hydration', value: `${hydrationPercent}% complete` },
    {
      label: 'Next meal',
      value: input.nutritionSnapshot?.nextMeal
        ? `${input.nutritionSnapshot.nextMeal.slotLabel} · ${input.nutritionSnapshot.nextMeal.timeLabel}`
        : 'No meal queued',
    },
  ];

  const recommendations = [
    queueItems[0]?.summary,
    input.consistencyRecommendation?.message,
    input.prepSummary.coachSummary,
  ].filter((value): value is string => !!value).slice(0, 3);

  return {
    status: status.status,
    statusLabel: status.statusLabel,
    headline: status.headline,
    summary: status.summary,
    primaryAction: choosePrimaryAction(queueItems),
    secondaryAction: { type: 'open_brief', label: 'Open Brief' },
    queueItems,
    briefDetails,
    recommendations,
    memoryPreview: input.memoryPreview,
    context: {
      caloriesRemaining,
      proteinRemaining,
      hydrationPercent,
      workoutsThisWeek: input.coachContext.workoutsThisWeek,
      nextMealLabel: input.nutritionSnapshot?.nextMeal
        ? `${input.nutritionSnapshot.nextMeal.slotLabel} at ${input.nutritionSnapshot.nextMeal.timeLabel}`
        : null,
    },
    nutritionSnapshot: input.nutritionSnapshot,
    usage: input.rateLimit,
  };
}
