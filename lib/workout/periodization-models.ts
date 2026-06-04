/**
 * periodization-models.ts
 *
 * Periodization Models and Protocols
 * Part of Phase 3: Periodization System
 *
 * Implements multiple periodization strategies:
 * - Linear Periodization: Gradual volume/intensity progression
 * - Block Periodization: Mesocycles with specific focuses
 * - Daily Undulating: Variable rep ranges across the week
 * - Auto-regulation: RPE-based adjustments based on fatigue
 */

import type { ExperienceLevel, PrimaryGoal } from './training-profile.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PeriodizationModel = 'linear' | 'block' | 'daily_undulating' | 'auto_regulated';

export type MesocycleFocus = 'hypertrophy' | 'strength' | 'peaking' | 'deload' | 'maintenance';

export type WeekStructure = {
  weekNumber: number;
  focus: MesocycleFocus;
  volumeMultiplier: number;
  intensityTarget: number; // Average RPE target
  repRangeShift: number; // Modifier to base rep ranges
  specialTechnique?: string;
};

export type PeriodizationBlock = {
  name: string;
  durationWeeks: number;
  focus: MesocycleFocus;
  weeks: WeekStructure[];
  progressionStrategy: string;
  deloadRequired: boolean;
};

export type ProgressiveOverloadProtocol = {
  name: string;
  applicableTo: ExperienceLevel[];
  description: string;
  primaryDriver: 'weight' | 'reps' | 'sets' | 'volume';
  progressionRule: string;
  minimumProgression: number;
  maximumProgression: number;
  resetThreshold?: number; // When to reset (e.g., failed 2x)
};

export type DeloadStrategy = {
  name: string;
  volumeReduction: number; // 0.4 = 60% reduction
  intensityReduction: number; // 0.2 = drop 2 RPE points
  durationDays: number;
  frequency: number; // Every X weeks
  indicators: string[]; // When to trigger
};

export type PeriodizationConfig = {
  model: PeriodizationModel;
  blocks: PeriodizationBlock[];
  currentBlockIndex: number;
  currentWeekInBlock: number;
  totalWeeks: number;
  deloadStrategy: DeloadStrategy;
};

// ---------------------------------------------------------------------------
// Linear Periodization Blocks
// ---------------------------------------------------------------------------

const LINEAR_HYPERTROPHY_BLOCK: PeriodizationBlock = {
  name: 'Accumulation (Hypertrophy)',
  durationWeeks: 4,
  focus: 'hypertrophy',
  progressionStrategy: 'Increase volume weekly, maintain RPE 8',
  deloadRequired: true,
  weeks: [
    { weekNumber: 1, focus: 'hypertrophy', volumeMultiplier: 1.0, intensityTarget: 8, repRangeShift: 0 },
    { weekNumber: 2, focus: 'hypertrophy', volumeMultiplier: 1.1, intensityTarget: 8, repRangeShift: 0 },
    { weekNumber: 3, focus: 'hypertrophy', volumeMultiplier: 1.2, intensityTarget: 9, repRangeShift: 0 },
    { weekNumber: 4, focus: 'deload', volumeMultiplier: 0.5, intensityTarget: 7, repRangeShift: 2 }, // Higher reps, lighter
  ],
};

const LINEAR_STRENGTH_BLOCK: PeriodizationBlock = {
  name: 'Intensification (Strength)',
  durationWeeks: 4,
  focus: 'strength',
  progressionStrategy: 'Decrease volume, increase intensity weekly',
  deloadRequired: true,
  weeks: [
    { weekNumber: 1, focus: 'strength', volumeMultiplier: 0.9, intensityTarget: 8, repRangeShift: -2 },
    { weekNumber: 2, focus: 'strength', volumeMultiplier: 0.85, intensityTarget: 9, repRangeShift: -3 },
    { weekNumber: 3, focus: 'strength', volumeMultiplier: 0.8, intensityTarget: 9.5, repRangeShift: -4 },
    { weekNumber: 4, focus: 'deload', volumeMultiplier: 0.5, intensityTarget: 7, repRangeShift: 0 },
  ],
};

const LINEAR_PEAKING_BLOCK: PeriodizationBlock = {
  name: 'Peaking',
  durationWeeks: 3,
  focus: 'peaking',
  progressionStrategy: 'Maximal intensity, minimal volume',
  deloadRequired: false,
  weeks: [
    { weekNumber: 1, focus: 'peaking', volumeMultiplier: 0.7, intensityTarget: 9, repRangeShift: -5 },
    { weekNumber: 2, focus: 'peaking', volumeMultiplier: 0.6, intensityTarget: 9.5, repRangeShift: -6 },
    { weekNumber: 3, focus: 'peaking', volumeMultiplier: 0.5, intensityTarget: 10, repRangeShift: -7, specialTechnique: 'Testing PRs' },
  ],
};

// ---------------------------------------------------------------------------
// Block Periodization (Mike Israetel Style)
// ---------------------------------------------------------------------------

const BLOCK_HYPERTROPHY_FOCUS: PeriodizationBlock = {
  name: 'Hypertrophy Block',
  durationWeeks: 5,
  focus: 'hypertrophy',
  progressionStrategy: 'Volume ramp from MEV to MRV',
  deloadRequired: true,
  weeks: [
    { weekNumber: 1, focus: 'hypertrophy', volumeMultiplier: 0.8, intensityTarget: 7, repRangeShift: 0, specialTechnique: 'Intro week' },
    { weekNumber: 2, focus: 'hypertrophy', volumeMultiplier: 1.0, intensityTarget: 8, repRangeShift: 0 },
    { weekNumber: 3, focus: 'hypertrophy', volumeMultiplier: 1.1, intensityTarget: 8, repRangeShift: 0 },
    { weekNumber: 4, focus: 'hypertrophy', volumeMultiplier: 1.15, intensityTarget: 9, repRangeShift: 0, specialTechnique: 'Max recoverable' },
    { weekNumber: 5, focus: 'deload', volumeMultiplier: 0.5, intensityTarget: 7, repRangeShift: 2 },
  ],
};

const BLOCK_STRENGTH_FOCUS: PeriodizationBlock = {
  name: 'Strength Block',
  durationWeeks: 4,
  focus: 'strength',
  progressionStrategy: 'Heavy compounds, moderate accessories',
  deloadRequired: true,
  weeks: [
    { weekNumber: 1, focus: 'strength', volumeMultiplier: 0.9, intensityTarget: 8, repRangeShift: -2 },
    { weekNumber: 2, focus: 'strength', volumeMultiplier: 0.9, intensityTarget: 8.5, repRangeShift: -3 },
    { weekNumber: 3, focus: 'strength', volumeMultiplier: 0.85, intensityTarget: 9, repRangeShift: -4 },
    { weekNumber: 4, focus: 'deload', volumeMultiplier: 0.5, intensityTarget: 7, repRangeShift: 0 },
  ],
};

// ---------------------------------------------------------------------------
// Daily Undulating Periodization (DUP)
// ---------------------------------------------------------------------------

const DUP_BASE_WEEK: WeekStructure[] = [
  { weekNumber: 1, focus: 'strength', volumeMultiplier: 0.85, intensityTarget: 9, repRangeShift: -4 }, // Heavy
  { weekNumber: 2, focus: 'hypertrophy', volumeMultiplier: 1.0, intensityTarget: 8, repRangeShift: 0 }, // Moderate
  { weekNumber: 3, focus: 'hypertrophy', volumeMultiplier: 1.1, intensityTarget: 8, repRangeShift: 2 }, // Light/Higher reps
  { weekNumber: 4, focus: 'deload', volumeMultiplier: 0.5, intensityTarget: 7, repRangeShift: 0 },
];

// ---------------------------------------------------------------------------
// Progressive Overload Protocols
// ---------------------------------------------------------------------------

export const PROGRESSIVE_OVERLOAD_PROTOCOLS: ProgressiveOverloadProtocol[] = [
  {
    name: 'Double Progression',
    applicableTo: ['beginner', 'intermediate'],
    description: 'Work within rep range, increase weight when hitting top end',
    primaryDriver: 'weight',
    progressionRule: 'When you hit top of rep range for all sets, increase weight 2.5-5%',
    minimumProgression: 2.5,
    maximumProgression: 5,
    resetThreshold: 2, // Failed twice, deload
  },
  {
    name: 'Linear Weight Addition',
    applicableTo: ['beginner'],
    description: 'Add weight every session while maintaining reps',
    primaryDriver: 'weight',
    progressionRule: 'Add 2.5-5 lbs per session until plateau',
    minimumProgression: 2.5,
    maximumProgression: 5,
    resetThreshold: 3,
  },
  {
    name: 'Rep Goal',
    applicableTo: ['intermediate', 'advanced'],
    description: 'Hit total rep goal across sets, then increase weight',
    primaryDriver: 'reps',
    progressionRule: 'Total reps across all sets ≥ rep goal? Add weight.',
    minimumProgression: 2.5,
    maximumProgression: 5,
  },
  {
    name: 'APRE (Autoregulated)',
    applicableTo: ['intermediate', 'advanced'],
    description: 'Adjust next session based on performance',
    primaryDriver: 'weight',
    progressionRule: '0-1 reps over target: +5-10 lbs. 2-3 reps: +10-15 lbs. 4+: +15-20 lbs',
    minimumProgression: 5,
    maximumProgression: 20,
  },
  {
    name: 'Volume Progression',
    applicableTo: ['intermediate', 'advanced'],
    description: 'Add sets over mesocycle, then deload',
    primaryDriver: 'sets',
    progressionRule: 'Add 1-2 sets per week up to MRV, then deload',
    minimumProgression: 1,
    maximumProgression: 2,
  },
  {
    name: 'RPE-Based',
    applicableTo: ['advanced'],
    description: 'Use RPE to autoregulate load',
    primaryDriver: 'weight',
    progressionRule: 'Target RPE. If under, add weight. If over, reduce or maintain.',
    minimumProgression: 2.5,
    maximumProgression: 10,
  },
];

// ---------------------------------------------------------------------------
// Deload Strategies
// ---------------------------------------------------------------------------

export const DELOAD_STRATEGIES: Record<ExperienceLevel, DeloadStrategy> = {
  beginner: {
    name: 'Beginner Deload',
    volumeReduction: 0.5, // 50% volume
    intensityReduction: 1, // Drop 1 RPE
    durationDays: 7,
    frequency: 6, // Every 6 weeks (or when needed)
    indicators: ['Persistent fatigue', 'Motivation drop', 'Sleep issues', 'Stalled for 2+ weeks'],
  },
  intermediate: {
    name: 'Standard Deload',
    volumeReduction: 0.5,
    intensityReduction: 2, // Drop 2 RPE
    durationDays: 5,
    frequency: 4, // Every 4 weeks
    indicators: [
      'RPE higher than normal for same weight',
      'Joint aches',
      'Performance drop 10%+',
      'Elevated morning heart rate',
    ],
  },
  advanced: {
    name: 'Aggressive Deload',
    volumeReduction: 0.6, // 40% volume
    intensityReduction: 2.5,
    durationDays: 7,
    frequency: 3, // Every 3 weeks
    indicators: [
      'RPE 10 on moderate sets',
      'Central fatigue',
      'Irritability',
      'Strength down >15%',
      'Illness susceptibility',
    ],
  },
};

// ---------------------------------------------------------------------------
// Periodization Presets by Experience & Goal
// ---------------------------------------------------------------------------

export function getPeriodizationConfig(
  experienceLevel: ExperienceLevel,
  goal: PrimaryGoal,
  weeks: number = 12
): PeriodizationConfig {
  switch (experienceLevel) {
    case 'beginner':
      return getBeginnerConfig(goal, weeks);
    case 'intermediate':
      return getIntermediateConfig(goal, weeks);
    case 'advanced':
      return getAdvancedConfig(goal, weeks);
    default:
      return getBeginnerConfig(goal, weeks);
  }
}

function getBeginnerConfig(goal: PrimaryGoal, weeks: number): PeriodizationConfig {
  // Beginners: Simple linear progression, no deload needed for first 6-8 weeks
  return {
    model: 'linear',
    blocks: [
      {
        name: 'Foundation Block',
        durationWeeks: Math.min(weeks, 8),
        focus: 'hypertrophy',
        progressionStrategy: 'Linear weight addition, form focus',
        deloadRequired: weeks > 6,
        weeks: Array.from({ length: Math.min(weeks, 8) }, (_, i) => ({
          weekNumber: i + 1,
          focus: 'hypertrophy',
          volumeMultiplier: Math.min(1.0 + i * 0.05, 1.2), // Gradual volume increase
          intensityTarget: 7 + Math.min(i * 0.25, 1), // RPE 7 → 8
          repRangeShift: 0,
        })),
      },
    ],
    currentBlockIndex: 0,
    currentWeekInBlock: 0,
    totalWeeks: weeks,
    deloadStrategy: DELOAD_STRATEGIES.beginner,
  };
}

function getIntermediateConfig(goal: PrimaryGoal, weeks: number): PeriodizationConfig {
  // Intermediates: Block periodization or DUP
  if (goal === 'get_stronger') {
    return {
      model: 'block',
      blocks: [BLOCK_HYPERTROPHY_FOCUS, BLOCK_STRENGTH_FOCUS],
      currentBlockIndex: 0,
      currentWeekInBlock: 0,
      totalWeeks: weeks,
      deloadStrategy: DELOAD_STRATEGIES.intermediate,
    };
  }

  // Default: Block with hypertrophy focus
  const numBlocks = Math.ceil(weeks / 4);
  const blocks: PeriodizationBlock[] = [];

  for (let i = 0; i < numBlocks; i++) {
    blocks.push({
      ...BLOCK_HYPERTROPHY_FOCUS,
      name: `${BLOCK_HYPERTROPHY_FOCUS.name} ${i + 1}`,
    });
  }

  return {
    model: 'block',
    blocks,
    currentBlockIndex: 0,
    currentWeekInBlock: 0,
    totalWeeks: weeks,
    deloadStrategy: DELOAD_STRATEGIES.intermediate,
  };
}

function getAdvancedConfig(goal: PrimaryGoal, weeks: number): PeriodizationConfig {
  // Advanced: Full periodization with multiple blocks
  const config: PeriodizationConfig = {
    model: 'daily_undulating',
    blocks: [BLOCK_HYPERTROPHY_FOCUS, BLOCK_STRENGTH_FOCUS, LINEAR_PEAKING_BLOCK],
    currentBlockIndex: 0,
    currentWeekInBlock: 0,
    totalWeeks: weeks,
    deloadStrategy: DELOAD_STRATEGIES.advanced,
  };

  if (goal === 'get_stronger') {
    config.blocks = [BLOCK_STRENGTH_FOCUS, BLOCK_STRENGTH_FOCUS, LINEAR_PEAKING_BLOCK];
  }

  return config;
}

// ---------------------------------------------------------------------------
// Week Structure Helpers
// ---------------------------------------------------------------------------

export function getCurrentWeekStructure(config: PeriodizationConfig): WeekStructure | null {
  const block = config.blocks[config.currentBlockIndex];
  if (!block) return null;
  return block.weeks[config.currentWeekInBlock] || null;
}

export function advanceWeek(config: PeriodizationConfig): PeriodizationConfig {
  const newConfig = { ...config };
  const currentBlock = newConfig.blocks[newConfig.currentBlockIndex];

  newConfig.currentWeekInBlock++;

  // Check if block is complete
  if (newConfig.currentWeekInBlock >= currentBlock.durationWeeks) {
    newConfig.currentBlockIndex++;
    newConfig.currentWeekInBlock = 0;
  }

  return newConfig;
}

export function isDeloadWeek(config: PeriodizationConfig): boolean {
  const week = getCurrentWeekStructure(config);
  return week?.focus === 'deload';
}

export function shouldDeload(
  config: PeriodizationConfig,
  fatigueIndicators: string[]
): boolean {
  const strategy = config.deloadStrategy;

  // Check if it's time for scheduled deload
  const totalWeeksElapsed = config.blocks
    .slice(0, config.currentBlockIndex)
    .reduce((sum, b) => sum + b.durationWeeks, config.currentWeekInBlock);

  if (totalWeeksElapsed > 0 && totalWeeksElapsed % strategy.frequency === 0) {
    return true;
  }

  // Check fatigue indicators
  const matchedIndicators = fatigueIndicators.filter((indicator) =>
    strategy.indicators.some((i) => indicator.toLowerCase().includes(i.toLowerCase()))
  );

  return matchedIndicators.length >= 2;
}

// ---------------------------------------------------------------------------
// Progression Calculation
// ---------------------------------------------------------------------------

export type ProgressionRecommendation = {
  action: 'increase' | 'maintain' | 'decrease' | 'deload';
  weightChange?: number;
  repChange?: number;
  setChange?: number;
  reason: string;
};

export function calculateProgression(
  protocol: ProgressiveOverloadProtocol,
  lastSession: {
    weight: number;
    reps: number;
    sets: number;
    targetReps: number;
    rpe: number;
  },
  targetRpe: number
): ProgressionRecommendation {
  // If RPE was too high, maintain or decrease
  if (lastSession.rpe > targetRpe + 0.5) {
    return {
      action: 'maintain',
      reason: `RPE ${lastSession.rpe} exceeded target ${targetRpe}`,
    };
  }

  // If RPE was way too high, suggest deload check
  if (lastSession.rpe > targetRpe + 1.5) {
    return {
      action: 'decrease',
      weightChange: -5,
      reason: 'Significant overshoot on RPE, reduce load',
    };
  }

  // Check progression criteria based on protocol
  switch (protocol.name) {
    case 'Double Progression':
      if (lastSession.reps >= lastSession.targetReps) {
        return {
          action: 'increase',
          weightChange: protocol.minimumProgression,
          reason: `Hit target reps (${lastSession.reps}/${lastSession.targetReps})`,
        };
      }
      break;

    case 'Linear Weight Addition':
      return {
        action: 'increase',
        weightChange: protocol.minimumProgression,
        reason: 'Linear progression protocol',
      };

    case 'APRE (Autoregulated)':
      const repDiff = lastSession.reps - lastSession.targetReps;
      if (repDiff <= 1) {
        return {
          action: 'increase',
          weightChange: 5,
          reason: `APRE: ${repDiff} reps over target`,
        };
      } else if (repDiff <= 3) {
        return {
          action: 'increase',
          weightChange: 10,
          reason: `APRE: ${repDiff} reps over target`,
        };
      } else {
        return {
          action: 'increase',
          weightChange: 15,
          reason: `APRE: ${repDiff} reps over target (strong performance)`,
        };
      }

    case 'RPE-Based':
      if (lastSession.rpe < targetRpe - 0.5) {
        return {
          action: 'increase',
          weightChange: 2.5,
          reason: `RPE ${lastSession.rpe} below target ${targetRpe}`,
        };
      }
      break;
  }

  // Default: maintain
  return {
    action: 'maintain',
    reason: 'Progression criteria not met',
  };
}

// ---------------------------------------------------------------------------
// Volume/Intensity Adjustments
// ---------------------------------------------------------------------------

export function applyWeekAdjustments(
  baseSets: number,
  baseReps: string,
  baseRpe: number,
  weekStructure: WeekStructure
): { sets: number; reps: string; rpe: number; notes: string[] } {
  const notes: string[] = [];

  // Apply volume multiplier
  const adjustedSets = Math.max(1, Math.round(baseSets * weekStructure.volumeMultiplier));
  if (adjustedSets !== baseSets) {
    notes.push(`Volume adjusted: ${baseSets} → ${adjustedSets} sets`);
  }

  // Apply rep range shift
  let adjustedReps = baseReps;
  if (weekStructure.repRangeShift !== 0) {
    const [min, max] = baseReps.split('-').map((n) => parseInt(n.trim()));
    if (!isNaN(min) && !isNaN(max)) {
      const newMin = Math.max(1, min + weekStructure.repRangeShift);
      const newMax = Math.max(newMin, max + weekStructure.repRangeShift);
      adjustedReps = `${newMin}-${newMax}`;
      notes.push(`Rep range shifted: ${baseReps} → ${adjustedReps}`);
    }
  }

  // Apply RPE target
  const adjustedRpe = weekStructure.intensityTarget;
  if (Math.abs(adjustedRpe - baseRpe) > 0.1) {
    notes.push(`RPE target: ${baseRpe} → ${adjustedRpe}`);
  }

  // Add special technique note
  if (weekStructure.specialTechnique) {
    notes.push(`Technique: ${weekStructure.specialTechnique}`);
  }

  return {
    sets: adjustedSets,
    reps: adjustedReps,
    rpe: adjustedRpe,
    notes,
  };
}

// ---------------------------------------------------------------------------
// Export Presets
// ---------------------------------------------------------------------------

export const PERIODIZATION_PRESETS = {
  linear: {
    hypertrophy: LINEAR_HYPERTROPHY_BLOCK,
    strength: LINEAR_STRENGTH_BLOCK,
    peaking: LINEAR_PEAKING_BLOCK,
  },
  block: {
    hypertrophy: BLOCK_HYPERTROPHY_FOCUS,
    strength: BLOCK_STRENGTH_FOCUS,
  },
  dup: DUP_BASE_WEEK,
};
