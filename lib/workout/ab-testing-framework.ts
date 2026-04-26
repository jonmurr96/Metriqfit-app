/**
 * ab-testing-framework.ts
 *
 * A/B Testing & Experimentation Framework
 * Part of Phase 5: Testing & Validation
 *
 * Enables controlled experiments to test:
 * - Different periodization models
 * - Recipe variations
 * - Recovery protocols
 * - Progressive overload methods
 */

import type { ExperienceLevel, PrimaryGoal } from './training-profile.ts';
import type { PeriodizedProgram } from './periodization-integration.ts';
import type { ProgramMetrics } from './analytics-framework.ts';

// ---------------------------------------------------------------------------
// A/B Test Types
// ---------------------------------------------------------------------------

export type ExperimentType =
  | 'periodization_model'
  | 'recipe_variation'
  | 'progression_protocol'
  | 'recovery_intervention'
  | 'deload_timing'
  | 'volume_prescription';

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';

export type ExperimentVariant = {
  id: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  trafficPercentage: number; // 0-100
};

export type Experiment = {
  id: string;
  name: string;
  description: string;
  type: ExperimentType;
  status: ExperimentStatus;
  hypothesis: string;
  successMetric: string;
  variants: ExperimentVariant[];
  targetPopulation: {
    experienceLevels?: ExperienceLevel[];
    primaryGoals?: PrimaryGoal[];
    minDaysPerWeek?: number;
    maxDaysPerWeek?: number;
  };
  startDate?: string;
  endDate?: string;
  minSampleSize: number;
  minDurationDays: number;
  results?: ExperimentResults;
};

export type ExperimentAssignment = {
  experimentId: string;
  variantId: string;
  userId: string;
  assignedAt: string;
  enrolled: boolean;
};

export type ExperimentResults = {
  variantResults: Array<{
    variantId: string;
    sampleSize: number;
    metrics: {
      completionRate: number;
      adherenceScore: number;
      strengthGain: number;
      recoveryScore: number;
      satisfaction?: number;
    };
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  }>;
  winner?: string; // variantId
  statisticalSignificance: boolean;
  pValue: number;
  effectSize: number;
  recommendation: string;
};

// ---------------------------------------------------------------------------
// Experiment Registry
// ---------------------------------------------------------------------------

const activeExperiments: Map<string, Experiment> = new Map();
const userAssignments: Map<string, ExperimentAssignment[]> = new Map();

export function registerExperiment(experiment: Experiment): void {
  if (experiment.variants.reduce((sum, v) => sum + v.trafficPercentage, 0) !== 100) {
    throw new Error('Variant traffic percentages must sum to 100');
  }

  activeExperiments.set(experiment.id, experiment);
}

export function getExperiment(id: string): Experiment | undefined {
  return activeExperiments.get(id);
}

export function listExperiments(
  status?: ExperimentStatus
): Experiment[] {
  const experiments = Array.from(activeExperiments.values());
  return status ? experiments.filter((e) => e.status === status) : experiments;
}

// ---------------------------------------------------------------------------
// User Assignment
// ---------------------------------------------------------------------------

export function assignUserToExperiment(
  userId: string,
  profile: {
    experienceLevel: ExperienceLevel;
    primaryGoal: PrimaryGoal;
    daysPerWeek: number;
  }
): ExperimentAssignment | null {
  // Find eligible experiments
  const eligibleExperiments = Array.from(activeExperiments.values()).filter((exp) => {
    if (exp.status !== 'running') return false;

    const target = exp.targetPopulation;
    if (target.experienceLevels && !target.experienceLevels.includes(profile.experienceLevel)) {
      return false;
    }
    if (target.primaryGoals && !target.primaryGoals.includes(profile.primaryGoal)) {
      return false;
    }
    if (target.minDaysPerWeek && profile.daysPerWeek < target.minDaysPerWeek) {
      return false;
    }
    if (target.maxDaysPerWeek && profile.daysPerWeek > target.maxDaysPerWeek) {
      return false;
    }

    return true;
  });

  if (eligibleExperiments.length === 0) return null;

  // Pick experiment (simplified - first eligible)
  const experiment = eligibleExperiments[0];

  // Check if user already assigned
  const existingAssignments = userAssignments.get(userId) || [];
  const existingAssignment = existingAssignments.find((a) => a.experimentId === experiment.id);
  if (existingAssignment) return existingAssignment;

  // Assign to variant based on traffic percentage
  const variant = selectVariant(experiment);
  if (!variant) return null;

  const assignment: ExperimentAssignment = {
    experimentId: experiment.id,
    variantId: variant.id,
    userId,
    assignedAt: new Date().toISOString(),
    enrolled: true,
  };

  existingAssignments.push(assignment);
  userAssignments.set(userId, existingAssignments);

  return assignment;
}

function selectVariant(experiment: Experiment): ExperimentVariant | null {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const variant of experiment.variants) {
    cumulative += variant.trafficPercentage;
    if (random <= cumulative) {
      return variant;
    }
  }

  return experiment.variants[experiment.variants.length - 1] || null;
}

export function getUserVariant(
  userId: string,
  experimentId: string
): ExperimentVariant | null {
  const assignments = userAssignments.get(userId) || [];
  const assignment = assignments.find((a) => a.experimentId === experimentId);

  if (!assignment) return null;

  const experiment = activeExperiments.get(experimentId);
  if (!experiment) return null;

  return experiment.variants.find((v) => v.id === assignment.variantId) || null;
}

// ---------------------------------------------------------------------------
// Predefined Experiments
// ---------------------------------------------------------------------------

export const PREDEFINED_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp_periodization_model_2024',
    name: 'Periodization Model Comparison',
    description: 'Compare Linear vs Block periodization for intermediate users',
    type: 'periodization_model',
    status: 'draft',
    hypothesis: 'Block periodization will yield higher strength gains than Linear for intermediate users',
    successMetric: 'strength_gain_percentage',
    variants: [
      {
        id: 'control',
        name: 'Linear Periodization',
        description: 'Standard linear progression model',
        config: { model: 'linear' },
        trafficPercentage: 50,
      },
      {
        id: 'treatment',
        name: 'Block Periodization',
        description: 'Accumulation/Intensification block model',
        config: { model: 'block' },
        trafficPercentage: 50,
      },
    ],
    targetPopulation: {
      experienceLevels: ['intermediate'],
      primaryGoals: ['build_muscle', 'build_strength'],
      minDaysPerWeek: 3,
      maxDaysPerWeek: 5,
    },
    minSampleSize: 100,
    minDurationDays: 84, // 12 weeks
  },
  {
    id: 'exp_recovery_messaging_2024',
    name: 'Recovery Messaging Impact',
    description: 'Test impact of proactive recovery alerts on adherence',
    type: 'recovery_intervention',
    status: 'draft',
    hypothesis: 'Proactive recovery alerts will improve program completion rates',
    successMetric: 'completion_rate',
    variants: [
      {
        id: 'control',
        name: 'Standard Recovery',
        description: 'Default recovery tracking without proactive messaging',
        config: { proactiveAlerts: false },
        trafficPercentage: 50,
      },
      {
        id: 'treatment',
        name: 'Proactive Recovery',
        description: 'Enhanced recovery alerts and recommendations',
        config: { proactiveAlerts: true, alertThreshold: 65 },
        trafficPercentage: 50,
      },
    ],
    targetPopulation: {
      experienceLevels: ['beginner', 'intermediate'],
      minDaysPerWeek: 3,
    },
    minSampleSize: 200,
    minDurationDays: 56, // 8 weeks
  },
  {
    id: 'exp_deload_frequency_2024',
    name: 'Deload Frequency Optimization',
    description: 'Compare 3-week vs 4-week deload cycles for advanced users',
    type: 'deload_timing',
    status: 'draft',
    hypothesis: '3-week deload cycles will reduce overreaching without compromising gains',
    successMetric: 'recovery_score',
    variants: [
      {
        id: 'control',
        name: '4-Week Deload',
        description: 'Standard deload every 4 weeks',
        config: { deloadFrequency: 4 },
        trafficPercentage: 50,
      },
      {
        id: 'treatment',
        name: '3-Week Deload',
        description: 'More frequent deloads every 3 weeks',
        config: { deloadFrequency: 3 },
        trafficPercentage: 50,
      },
    ],
    targetPopulation: {
      experienceLevels: ['advanced'],
      minDaysPerWeek: 4,
    },
    minSampleSize: 80,
    minDurationDays: 84,
  },
  {
    id: 'exp_volume_beginners_2024',
    name: 'Beginner Volume Prescription',
    description: 'Test lower vs higher volume for beginners',
    type: 'volume_prescription',
    status: 'draft',
    hypothesis: 'Lower volume with higher frequency will improve beginner adherence',
    successMetric: 'adherence_score',
    variants: [
      {
        id: 'control',
        name: 'Standard Volume',
        description: 'MEV-based volume prescription',
        config: { volumeMultiplier: 1.0 },
        trafficPercentage: 50,
      },
      {
        id: 'treatment',
        name: 'Reduced Volume',
        description: '20% lower volume with focus on technique',
        config: { volumeMultiplier: 0.8 },
        trafficPercentage: 50,
      },
    ],
    targetPopulation: {
      experienceLevels: ['beginner'],
      minDaysPerWeek: 3,
      maxDaysPerWeek: 3,
    },
    minSampleSize: 150,
    minDurationDays: 56,
  },
];

// ---------------------------------------------------------------------------
// Results Analysis
// ---------------------------------------------------------------------------

export function analyzeExperimentResults(
  experiment: Experiment,
  metrics: ProgramMetrics[]
): ExperimentResults {
  const variantResults = experiment.variants.map((variant) => {
    const variantMetrics = metrics.filter((m) => {
      // In real implementation, would track variant assignment in metrics
      // For now, simulate based on some criteria
      return true;
    });

    const sampleSize = variantMetrics.length;

    const completionRates = variantMetrics.map((m) => m.completionRate);
    const avgCompletionRate =
      completionRates.reduce((sum, r) => sum + r, 0) / (completionRates.length || 1);

    const adherenceScores = variantMetrics.map((m) => m.adherenceScore);
    const avgAdherence =
      adherenceScores.reduce((sum, s) => sum + s, 0) / (adherenceScores.length || 1);

    const strengthGains = variantMetrics.flatMap((m) => Object.values(m.strengthImprovements));
    const avgStrengthGain =
      strengthGains.reduce((sum, g) => sum + g, 0) / (strengthGains.length || 1);

    const recoveryScores = variantMetrics.map((m) => m.averageRecoveryScore);
    const avgRecovery =
      recoveryScores.reduce((sum, s) => sum + s, 0) / (recoveryScores.length || 1);

    // Calculate standard error and confidence interval (simplified)
    const stdDev = calculateStandardDeviation(completionRates);
    const stdError = stdDev / Math.sqrt(sampleSize);
    const marginOfError = 1.96 * stdError; // 95% confidence

    return {
      variantId: variant.id,
      sampleSize,
      metrics: {
        completionRate: avgCompletionRate,
        adherenceScore: avgAdherence,
        strengthGain: avgStrengthGain,
        recoveryScore: avgRecovery,
      },
      confidenceInterval: {
        lower: Math.max(0, avgCompletionRate - marginOfError),
        upper: Math.min(100, avgCompletionRate + marginOfError),
      },
    };
  });

  // Determine winner (simplified - highest completion rate)
  const sorted = [...variantResults].sort(
    (a, b) => b.metrics.completionRate - a.metrics.completionRate
  );
  const winner = sorted[0].sampleSize > 0 ? sorted[0].variantId : undefined;

  // Calculate statistical significance (simplified)
  const control = variantResults.find((v) => v.variantId === 'control');
  const treatment = variantResults.find((v) => v.variantId === 'treatment');

  let pValue = 1;
  let effectSize = 0;
  let statisticalSignificance = false;

  if (control && treatment && control.sampleSize > 10 && treatment.sampleSize > 10) {
    // Simplified t-test approximation
    const diff = treatment.metrics.completionRate - control.metrics.completionRate;
    const pooledStd = Math.sqrt(
      (Math.pow(calculateStandardDeviation([control.metrics.completionRate]), 2) +
        Math.pow(calculateStandardDeviation([treatment.metrics.completionRate]), 2)) /
        2
    );

    effectSize = diff / (pooledStd || 1);
    pValue = Math.max(0.001, 1 - Math.abs(effectSize)); // Simplified
    statisticalSignificance = pValue < 0.05 && Math.abs(effectSize) > 0.2;
  }

  return {
    variantResults,
    winner,
    statisticalSignificance,
    pValue,
    effectSize,
    recommendation: generateRecommendation(variantResults, statisticalSignificance, winner),
  };
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;

  return Math.sqrt(avgSquaredDiff);
}

function generateRecommendation(
  results: ExperimentResults['variantResults'],
  significant: boolean,
  winner?: string
): string {
  if (!significant) {
    return 'Results are not statistically significant. Continue running the experiment or consider a larger sample size.';
  }

  if (!winner) {
    return 'No clear winner detected. Variants performed similarly.';
  }

  const winnerResult = results.find((r) => r.variantId === winner);
  if (!winnerResult) {
    return 'Error determining winner.';
  }

  const improvement = winnerResult.metrics.completionRate - (results[0]?.metrics.completionRate || 0);

  return `Variant "${winner}" is the winner with ${improvement.toFixed(1)}% improvement in completion rate. Recommend rolling out to all users.`;
}

// ---------------------------------------------------------------------------
// Feature Flags
// ---------------------------------------------------------------------------

export type FeatureFlag = {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers?: string[];
  description: string;
};

const featureFlags: Map<string, FeatureFlag> = new Map();

export function registerFeatureFlag(flag: FeatureFlag): void {
  featureFlags.set(flag.name, flag);
}

export function isFeatureEnabled(featureName: string, userId?: string): boolean {
  const flag = featureFlags.get(featureName);
  if (!flag) return false;
  if (!flag.enabled) return false;

  // Check specific user targeting
  if (flag.targetUsers && userId) {
    return flag.targetUsers.includes(userId);
  }

  // Percentage rollout
  if (flag.rolloutPercentage >= 100) return true;
  if (flag.rolloutPercentage <= 0) return false;

  // Deterministic hash of userId for consistent experience
  if (userId) {
    const hash = hashString(userId + featureName);
    return (hash % 100) < flag.rolloutPercentage;
  }

  return flag.rolloutPercentage > 50;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Register default feature flags
registerFeatureFlag({
  name: 'recovery_auto_adjustments',
  enabled: true,
  rolloutPercentage: 100,
  description: 'Automatically adjust training based on recovery metrics',
});

registerFeatureFlag({
  name: 'proactive_recovery_alerts',
  enabled: true,
  rolloutPercentage: 50,
  description: 'Send proactive alerts when recovery declines',
});

registerFeatureFlag({
  name: 'advanced_analytics',
  enabled: true,
  rolloutPercentage: 25,
  description: 'Enable detailed analytics dashboard',
});

// ---------------------------------------------------------------------------
// Export Functions
// ---------------------------------------------------------------------------

export const ABTesting = {
  registerExperiment,
  getExperiment,
  listExperiments,
  assignUserToExperiment,
  getUserVariant,
  analyzeExperimentResults,
  predefinedExperiments: PREDEFINED_EXPERIMENTS,
};

export const FeatureFlags = {
  register: registerFeatureFlag,
  isEnabled: isFeatureEnabled,
};
