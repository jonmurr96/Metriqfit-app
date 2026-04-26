/**
 * recovery-management.ts
 *
 * Recovery Management System
 * Part of Phase 4: Recovery & Regeneration
 *
 * Comprehensive recovery tracking and optimization including:
 * - Rest day optimization and placement
 * - Active recovery recommendations
 * - Sleep quality assessment
 * - Recovery score calculation
 * - Overreaching detection
 * - HRV integration support
 * - Nutrition timing guidance
 */

import type { ExperienceLevel, PrimaryGoal } from './training-profile.ts';
import type { WeekPlan, WeekPerformance, FatigueAssessment } from './week-progression.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecoveryMetric = {
  date: string;
  sleepHours: number;
  sleepQuality: 'poor' | 'fair' | 'good' | 'excellent';
  restingHR?: number; // Optional HRV/HR data
  hrvScore?: number; // 0-100 scale
  sorenessLevel: 1 | 2 | 3 | 4 | 5; // 1 = none, 5 = severe
  energyLevel: 1 | 2 | 3 | 4 | 5; // 1 = exhausted, 5 = energized
  stressLevel: 1 | 2 | 3 | 4 | 5; // 1 = none, 5 = extreme
  motivationLevel: 'low' | 'moderate' | 'high';
};

export type RecoveryScore = {
  overall: number; // 0-100
  sleep: number;
  muscleRecovery: number;
  nervousSystem: number;
  hydration: number; // Estimated/self-reported
  timestamp: string;
  trend: 'improving' | 'stable' | 'declining';
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
};

export type RestDayPlacement = {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  reason: string;
  priority: 'required' | 'recommended' | 'optional';
  activities: string[];
};

export type ActiveRecoverySession = {
  type: 'light_cardio' | 'mobility' | 'yoga' | 'stretching' | 'foam_rolling' | 'contrast';
  durationMin: number;
  intensity: 'very_light' | 'light';
  description: string;
  benefits: string[];
};

export type OverreachingStatus = {
  state: 'fresh' | 'adequate' | 'overreached' | 'overtrained';
  functional: boolean; // Functional overreaching (good) vs non-functional (bad)
  daysInState: number;
  indicators: string[];
  actions: string[];
};

export type RecoveryRecommendation = {
  category: 'sleep' | 'nutrition' | 'activity' | 'stress' | 'supplement';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionableSteps: string[];
  expectedBenefit: string;
};

export type NutritionTiming = {
  meal: 'pre_workout' | 'post_workout' | 'rest_day';
  timing: string;
  macros: {
    protein: number; // grams
    carbs: number;
    fats: number;
  };
  foods: string[];
  hydration: string;
};

// ---------------------------------------------------------------------------
// Recovery Score Calculation
// ---------------------------------------------------------------------------

export function calculateRecoveryScore(
  metrics: RecoveryMetric[],
  recentPerformance: WeekPerformance[],
  experienceLevel: ExperienceLevel
): RecoveryScore {
  const latest = metrics[metrics.length - 1];
  if (!latest) {
    return createDefaultRecoveryScore();
  }

  // Sleep score (0-100)
  const sleepScore = calculateSleepScore(latest.sleepHours, latest.sleepQuality);

  // Muscle recovery score (0-100)
  const muscleScore = calculateMuscleRecoveryScore(latest.sorenessLevel, recentPerformance);

  // Nervous system score (0-100)
  const nsScore = calculateNervousSystemScore(latest.hrvScore, latest.restingHR, latest.energyLevel);

  // Hydration estimation (0-100) - based on energy and stress
  const hydrationScore = estimateHydrationScore(latest.energyLevel, latest.stressLevel);

  // Weighted overall score
  const weights = {
    sleep: 0.35,
    muscle: 0.30,
    nervous: 0.25,
    hydration: 0.10,
  };

  const overall = Math.round(
    sleepScore * weights.sleep +
    muscleScore * weights.muscle +
    nsScore * weights.nervous +
    hydrationScore * weights.hydration
  );

  // Calculate trend
  const trend = calculateRecoveryTrend(metrics);

  // Determine status
  const status = determineRecoveryStatus(overall);

  return {
    overall,
    sleep: sleepScore,
    muscleRecovery: muscleScore,
    nervousSystem: nsScore,
    hydration: hydrationScore,
    timestamp: latest.date,
    trend,
    status,
  };
}

function createDefaultRecoveryScore(): RecoveryScore {
  return {
    overall: 50,
    sleep: 50,
    muscleRecovery: 50,
    nervousSystem: 50,
    hydration: 50,
    timestamp: new Date().toISOString(),
    trend: 'stable',
    status: 'fair',
  };
}

function calculateSleepScore(hours: number, quality: string): number {
  let score = 0;

  // Hours component (0-60 points)
  if (hours >= 9) score += 60;
  else if (hours >= 8) score += 55;
  else if (hours >= 7) score += 45;
  else if (hours >= 6) score += 30;
  else if (hours >= 5) score += 15;
  else score += 5;

  // Quality component (0-40 points)
  const qualityScores: Record<string, number> = {
    excellent: 40,
    good: 30,
    fair: 20,
    poor: 10,
  };
  score += qualityScores[quality] || 20;

  return score;
}

function calculateMuscleRecoveryScore(
  soreness: number,
  recentPerformance: WeekPerformance[]
): number {
  // Soreness is 1-5 (1 = none, 5 = severe)
  // Invert so higher score = better recovery
  const sorenessScore = (6 - soreness) * 20; // 100, 80, 60, 40, 20

  // Check for performance trends
  let performanceBonus = 0;
  if (recentPerformance.length >= 2) {
    const last = recentPerformance[recentPerformance.length - 1];
    const prev = recentPerformance[recentPerformance.length - 2];
    if (last.totalVolume >= prev.totalVolume) {
      performanceBonus = 10; // Bonus for maintaining/increasing volume
    }
  }

  return Math.min(100, sorenessScore + performanceBonus);
}

function calculateNervousSystemScore(
  hrv?: number,
  restingHR?: number,
  energy?: number
): number {
  let score = 50; // Base score

  // HRV scoring (if available)
  if (hrv !== undefined) {
    if (hrv >= 70) score += 25;
    else if (hrv >= 60) score += 15;
    else if (hrv >= 50) score += 5;
    else if (hrv >= 40) score -= 10;
    else score -= 20;
  }

  // Resting HR scoring (if available)
  if (restingHR !== undefined) {
    // Lower is generally better (simplified)
    if (restingHR <= 55) score += 15;
    else if (restingHR <= 65) score += 10;
    else if (restingHR <= 75) score += 0;
    else score -= 10;
  }

  // Energy level scoring (1-5)
  if (energy) {
    score += (energy - 3) * 10; // -20 to +20
  }

  return Math.max(0, Math.min(100, score));
}

function estimateHydrationScore(energy: number, stress: number): number {
  // Simplified estimation based on energy and stress
  // Low energy + high stress often correlates with dehydration
  let score = 70;

  if (energy <= 2) score -= 20;
  else if (energy <= 3) score -= 10;

  if (stress >= 4) score -= 15;
  else if (stress >= 3) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function calculateRecoveryTrend(metrics: RecoveryMetric[]): 'improving' | 'stable' | 'declining' {
  if (metrics.length < 3) return 'stable';

  const recent = metrics.slice(-3);
  const scores = recent.map((m) => m.energyLevel - m.sorenessLevel - m.stressLevel);

  const avgFirst = scores[0];
  const avgLast = scores[scores.length - 1];

  if (avgLast > avgFirst + 1) return 'improving';
  if (avgLast < avgFirst - 1) return 'declining';
  return 'stable';
}

function determineRecoveryStatus(score: number): RecoveryScore['status'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  if (score >= 30) return 'poor';
  return 'critical';
}

// ---------------------------------------------------------------------------
// Rest Day Optimization
// ---------------------------------------------------------------------------

export function optimizeRestDays(
  daysPerWeek: number,
  trainingDays: number[], // Days of week (0-6)
  recoveryScores: RecoveryScore[],
  experienceLevel: ExperienceLevel
): RestDayPlacement[] {
  const restDays: RestDayPlacement[] = [];
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const restDayIndices = allDays.filter((d) => !trainingDays.includes(d));

  // Determine rest day requirements based on experience and frequency
  const minRestDays = experienceLevel === 'beginner' ? 3 : experienceLevel === 'intermediate' ? 2 : 1;

  restDayIndices.forEach((dayIndex) => {
    const placement: RestDayPlacement = {
      dayOfWeek: dayIndex,
      priority: 'optional',
      reason: 'Standard rest day',
      activities: ['light walking', 'stretching'],
    };

    // Check if it's after heavy training
    const prevDay = (dayIndex + 6) % 7;
    if (trainingDays.includes(prevDay)) {
      placement.priority = 'recommended';
      placement.reason = 'Post-training recovery';
      placement.activities.push('foam rolling', 'protein-rich meal');
    }

    // Check if multiple training days in a row precede this
    const twoDaysAgo = (dayIndex + 5) % 7;
    if (trainingDays.includes(prevDay) && trainingDays.includes(twoDaysAgo)) {
      placement.priority = 'required';
      placement.reason = 'Recovery after consecutive training days';
      placement.activities.push('contrast shower', 'extra sleep', 'active recovery');
    }

    // Check recent recovery scores
    const avgScore = recoveryScores.length > 0
      ? recoveryScores.reduce((sum, s) => sum + s.overall, 0) / recoveryScores.length
      : 50;

    if (avgScore < 50 && placement.priority !== 'required') {
      placement.priority = 'required';
      placement.reason = 'Low recovery score - prioritizing restoration';
      placement.activities.push('complete rest', 'meditation', 'early bedtime');
    }

    restDays.push(placement);
  });

  // Ensure minimum rest days for experience level
  if (restDays.filter((r) => r.priority === 'required').length < minRestDays) {
    // Promote recommended days to required
    restDays
      .filter((r) => r.priority === 'recommended')
      .slice(0, minRestDays)
      .forEach((r) => {
        r.priority = 'required';
        r.reason = 'Minimum rest requirement for ' + experienceLevel;
      });
  }

  return restDays.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

// ---------------------------------------------------------------------------
// Active Recovery Recommendations
// ---------------------------------------------------------------------------

export function getActiveRecoverySession(
  recoveryScore: RecoveryScore,
  trainingDay: boolean,
  goal: PrimaryGoal
): ActiveRecoverySession | null {
  // If recovery is excellent and it's a training day, no active recovery needed
  if (recoveryScore.status === 'excellent' && trainingDay) {
    return null;
  }

  // Determine session type based on recovery status
  if (recoveryScore.status === 'critical' || recoveryScore.status === 'poor') {
    return {
      type: 'stretching',
      durationMin: 20,
      intensity: 'very_light',
      description: 'Gentle full-body stretching and breathing exercises',
      benefits: ['Reduces muscle tension', 'Improves circulation', 'Activates parasympathetic nervous system'],
    };
  }

  if (recoveryScore.muscleRecovery < 60) {
    return {
      type: 'foam_rolling',
      durationMin: 15,
      intensity: 'light',
      description: 'Targeted foam rolling on sore muscle groups',
      benefits: ['Reduces muscle soreness', 'Improves tissue quality', 'Increases range of motion'],
    };
  }

  if (recoveryScore.nervousSystem < 60) {
    return {
      type: 'yoga',
      durationMin: 30,
      intensity: 'very_light',
      description: 'Restorative yoga session with focus on breathing',
      benefits: ['Reduces cortisol', 'Improves HRV', 'Mental relaxation'],
    };
  }

  // Default for rest days
  if (!trainingDay) {
    return {
      type: 'light_cardio',
      durationMin: 20,
      intensity: 'very_light',
      description: 'Easy walk or light cycling at conversational pace',
      benefits: ['Increases blood flow', 'Aids nutrient delivery', 'Mental refreshment'],
    };
  }

  return null;
}

export function getContrastTherapyProtocol(
  sorenessLevel: number,
  muscleGroups: string[]
): ActiveRecoverySession | null {
  if (sorenessLevel < 3) return null;

  return {
    type: 'contrast',
    durationMin: 20,
    intensity: 'light',
    description: `Contrast therapy for ${muscleGroups.join(', ')}: 3 min hot, 1 min cold, repeat 3x`,
    benefits: ['Reduces inflammation', 'Improves circulation', 'Speeds muscle recovery'],
  };
}

// ---------------------------------------------------------------------------
// Overreaching Detection
// ---------------------------------------------------------------------------

export function detectOverreaching(
  metrics: RecoveryMetric[],
  performanceHistory: WeekPerformance[],
  experienceLevel: ExperienceLevel
): OverreachingStatus {
  const status: OverreachingStatus = {
    state: 'adequate',
    functional: true,
    daysInState: 0,
    indicators: [],
    actions: [],
  };

  if (metrics.length < 7) {
    status.indicators.push('Insufficient data for overreaching detection');
    return status;
  }

  const lastWeek = metrics.slice(-7);

  // Check for declining energy
  const energyTrend = lastWeek.map((m) => m.energyLevel);
  const avgEnergy = energyTrend.reduce((a, b) => a + b, 0) / energyTrend.length;

  if (avgEnergy < 2.5) {
    status.indicators.push('Persistent low energy');
    status.state = 'overreached';
  }

  // Check for high soreness
  const avgSoreness = lastWeek.reduce((sum, m) => sum + m.sorenessLevel, 0) / lastWeek.length;
  if (avgSoreness > 3.5) {
    status.indicators.push('Persistent muscle soreness');
    status.state = 'overreached';
  }

  // Check for poor sleep
  const poorSleepDays = lastWeek.filter(
    (m) => m.sleepQuality === 'poor' || m.sleepHours < 6
  ).length;
  if (poorSleepDays >= 4) {
    status.indicators.push('Chronic sleep deprivation');
    status.state = 'overreached';
  }

  // Check for performance drop
  if (performanceHistory.length >= 2) {
    const last = performanceHistory[performanceHistory.length - 1];
    const prev = performanceHistory[performanceHistory.length - 2];

    if (last.totalVolume < prev.totalVolume * 0.8) {
      status.indicators.push('Significant volume drop (>20%)');
      status.state = 'overreached';
    }

    if (last.averageRPE > prev.averageRPE + 1) {
      status.indicators.push('RPE increase without performance gain');
      status.state = 'overreached';
    }
  }

  // Determine if functional or non-functional
  if (status.state === 'overreached') {
    // Check duration
    const daysOverreached = metrics.filter(
      (m) => m.energyLevel <= 2 && m.sorenessLevel >= 4
    ).length;
    status.daysInState = daysOverreached;

    if (daysOverreached > 7) {
      status.functional = false;
      status.state = 'overtrained';
      status.actions = [
        'Take 1-2 weeks off from training',
        'Consult sports medicine professional',
        'Focus on sleep and nutrition',
        'Consider blood work to check hormone levels',
        'Gradual return to training after recovery',
      ];
    } else {
      status.functional = true;
      status.actions = [
        'Schedule deload week immediately',
        'Prioritize 9+ hours sleep',
        'Reduce training volume 50%',
        'Add active recovery sessions',
        'Monitor for improvement over 3-5 days',
      ];
    }
  }

  // Check for "fresh" state
  if (
    status.state === 'adequate' &&
    avgEnergy >= 4 &&
    avgSoreness <= 2 &&
    poorSleepDays <= 1
  ) {
    status.state = 'fresh';
    status.indicators.push('Excellent recovery status');
  }

  return status;
}

// ---------------------------------------------------------------------------
// Recovery Recommendations
// ---------------------------------------------------------------------------

export function generateRecoveryRecommendations(
  recoveryScore: RecoveryScore,
  overreachingStatus: OverreachingStatus,
  goal: PrimaryGoal,
  experienceLevel: ExperienceLevel
): RecoveryRecommendation[] {
  const recommendations: RecoveryRecommendation[] = [];

  // Critical recommendations
  if (overreachingStatus.state === 'overtrained') {
    recommendations.push({
      category: 'activity',
      priority: 'critical',
      title: 'Immediate Training Cessation',
      description: 'You are in a state of overtraining. Stop all training immediately.',
      actionableSteps: ['Take complete rest', 'See sports medicine doctor', 'Get blood work done'],
      expectedBenefit: 'Prevent long-term health consequences',
    });
  }

  if (overreachingStatus.state === 'overreached') {
    recommendations.push({
      category: 'activity',
      priority: 'critical',
      title: 'Mandatory Deload',
      description: 'You are functionally overreached. A deload is required.',
      actionableSteps: ['Reduce volume 50%', 'Lower intensity by 2 RPE', 'Add 1-2 rest days'],
      expectedBenefit: 'Restore performance and prevent overtraining',
    });
  }

  // Sleep recommendations
  if (recoveryScore.sleep < 60) {
    recommendations.push({
      category: 'sleep',
      priority: 'high',
      title: 'Sleep Optimization',
      description: 'Your sleep score indicates poor recovery during rest.',
      actionableSteps: [
        'Set consistent bedtime (±30 min)',
        'No screens 1 hour before bed',
        'Room temperature 65-68°F',
        'Consider magnesium supplement 400mg before bed',
      ],
      expectedBenefit: 'Improve GH release and muscle recovery by 20-30%',
    });
  }

  // Muscle recovery recommendations
  if (recoveryScore.muscleRecovery < 60) {
    recommendations.push({
      category: 'nutrition',
      priority: 'high',
      title: 'Protein Timing Optimization',
      description: 'Elevated muscle soreness suggests suboptimal recovery nutrition.',
      actionableSteps: [
        'Consume 25-40g protein within 2 hours post-workout',
        'Add tart cherry juice 8oz daily',
        'Consider omega-3 supplement 2-3g daily',
        'Ensure 1.6-2.2g protein per kg bodyweight daily',
      ],
      expectedBenefit: 'Reduce DOMS duration by 24-48 hours',
    });
  }

  // Nervous system recommendations
  if (recoveryScore.nervousSystem < 60) {
    recommendations.push({
      category: 'stress',
      priority: 'high',
      title: 'Parasympathetic Activation',
      description: 'Your nervous system shows signs of high stress.',
      actionableSteps: [
        'Practice box breathing: 4-4-4-4 seconds',
        '10-minute meditation daily',
        'Reduce caffeine intake after 2 PM',
        'Consider adaptogen supplement (ashwagandha 300mg)',
      ],
      expectedBenefit: 'Improve HRV and reduce cortisol levels',
    });
  }

  // Hydration recommendations
  if (recoveryScore.hydration < 60) {
    recommendations.push({
      category: 'nutrition',
      priority: 'medium',
      title: 'Hydration Protocol',
      description: 'Signs suggest suboptimal hydration affecting recovery.',
      actionableSteps: [
        'Drink 16oz water upon waking',
        'Consume 0.5-1oz water per lb bodyweight daily',
        'Add electrolytes to 1-2 bottles',
        'Limit alcohol (interferes with sleep and recovery)',
      ],
      expectedBenefit: 'Improve nutrient transport and muscle function',
    });
  }

  // Experience-specific recommendations
  if (experienceLevel === 'beginner') {
    recommendations.push({
      category: 'activity',
      priority: 'medium',
      title: 'Active Recovery for Beginners',
      description: 'As a beginner, your recovery capacity is still developing.',
      actionableSteps: [
        'Take 2-3 full rest days per week',
        'Walk 20-30 min on rest days',
        'Prioritize sleep over early morning workouts',
      ],
      expectedBenefit: 'Build recovery capacity and prevent burnout',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ---------------------------------------------------------------------------
// Nutrition Timing
// ---------------------------------------------------------------------------

export function getNutritionTiming(
  context: 'pre_workout' | 'post_workout' | 'rest_day',
  trainingTime: 'morning' | 'afternoon' | 'evening',
  goal: PrimaryGoal
): NutritionTiming {
  const baseTiming: Record<string, NutritionTiming> = {
    pre_workout: {
      meal: 'pre_workout',
      timing: trainingTime === 'morning' ? '30-60 min before' : '1.5-2 hours before',
      macros: { protein: 20, carbs: 40, fats: 5 },
      foods:
        trainingTime === 'morning'
          ? ['banana', 'whey protein', 'oatmeal']
          : ['chicken breast', 'white rice', 'vegetables'],
      hydration: '16-20oz water',
    },
    post_workout: {
      meal: 'post_workout',
      timing: 'Within 2 hours (ideally 30-60 min)',
      macros:
        goal === 'lose_fat'
          ? { protein: 40, carbs: 30, fats: 10 }
          : { protein: 40, carbs: 60, fats: 10 },
      foods: ['lean protein source', 'rice or potatoes', 'vegetables', 'creatine monohydrate 5g'],
      hydration: '20-24oz water with electrolytes',
    },
    rest_day: {
      meal: 'rest_day',
      timing: 'Spread evenly throughout day',
      macros: { protein: 35, carbs: 30, fats: 15 },
      foods: ['eggs', 'salmon', 'quinoa', 'leafy greens', 'berries'],
      hydration: '0.5-0.7oz per lb bodyweight',
    },
  };

  return baseTiming[context];
}

// ---------------------------------------------------------------------------
// Sleep Optimization
// ---------------------------------------------------------------------------

export function generateSleepProtocol(
  currentSleepHours: number,
  currentQuality: string,
  trainingIntensity: 'low' | 'moderate' | 'high'
): {
  targetHours: number;
  bedtime: string;
  wakeTime: string;
  preSleepRoutine: string[];
  environment: Record<string, string>;
  supplements: string[];
} {
  const targetHours = trainingIntensity === 'high' ? 9 : trainingIntensity === 'moderate' ? 8 : 7;

  const protocol = {
    targetHours,
    bedtime: 'Calculated based on wake time',
    wakeTime: 'Consistent daily (±30 min)',
    preSleepRoutine: [
      '90 min before: Last meal (light protein + carbs)',
      '60 min before: Stop all screens (blue light blocking)',
      '30 min before: Light stretching or reading',
      '15 min before: Box breathing (4-4-4-4)',
      'At bedtime: Room completely dark, cool (65-68°F)',
    ],
    environment: {
      temperature: '65-68°F (18-20°C)',
      darkness: 'Blackout curtains or eye mask',
      noise: 'White noise machine or earplugs',
      bedding: 'Breathable, moisture-wicking materials',
    },
    supplements:
      currentSleepHours < 7
        ? ['Magnesium glycinate 400mg', 'L-theanine 200mg', 'Avoid melatonin unless traveling']
        : ['Magnesium glycinate 200-400mg'],
  };

  if (currentQuality === 'poor') {
    protocol.preSleepRoutine.unshift('2 hours before: No caffeine or heavy meals');
    protocol.supplements.push('Tart cherry juice 8oz (natural melatonin)');
  }

  return protocol;
}

// ---------------------------------------------------------------------------
// Export Summary Functions
// ---------------------------------------------------------------------------

export type RecoverySummary = {
  currentScore: RecoveryScore;
  overreachingStatus: OverreachingStatus;
  recommendations: RecoveryRecommendation[];
  restDayPlan: RestDayPlacement[];
  activeRecovery: ActiveRecoverySession | null;
  nutritionTiming: NutritionTiming[];
  sleepProtocol: ReturnType<typeof generateSleepProtocol>;
};

export function generateRecoverySummary(
  metrics: RecoveryMetric[],
  recoveryScores: RecoveryScore[],
  performanceHistory: WeekPerformance[],
  trainingDays: number[],
  daysPerWeek: number,
  profile: {
    experienceLevel: ExperienceLevel;
    primaryGoal: PrimaryGoal;
    trainingIntensity: 'low' | 'moderate' | 'high';
  }
): RecoverySummary {
  const latestMetric = metrics[metrics.length - 1];

  const currentScore = calculateRecoveryScore(metrics, performanceHistory, profile.experienceLevel);

  const overreachingStatus = detectOverreaching(
    metrics,
    performanceHistory,
    profile.experienceLevel
  );

  const recommendations = generateRecoveryRecommendations(
    currentScore,
    overreachingStatus,
    profile.primaryGoal,
    profile.experienceLevel
  );

  const restDayPlan = optimizeRestDays(
    daysPerWeek,
    trainingDays,
    recoveryScores,
    profile.experienceLevel
  );

  const activeRecovery = latestMetric
    ? getActiveRecoverySession(currentScore, false, profile.primaryGoal)
    : null;

  const nutritionTiming = [
    getNutritionTiming('pre_workout', 'morning', profile.primaryGoal),
    getNutritionTiming('post_workout', 'morning', profile.primaryGoal),
    getNutritionTiming('rest_day', 'morning', profile.primaryGoal),
  ];

  const sleepProtocol = latestMetric
    ? generateSleepProtocol(
        latestMetric.sleepHours,
        latestMetric.sleepQuality,
        profile.trainingIntensity
      )
    : generateSleepProtocol(7, 'fair', profile.trainingIntensity);

  return {
    currentScore,
    overreachingStatus,
    recommendations,
    restDayPlan,
    activeRecovery,
    nutritionTiming,
    sleepProtocol,
  };
}
