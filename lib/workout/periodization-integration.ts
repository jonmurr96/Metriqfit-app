/**
 * periodization-integration.ts
 *
 * Phase 3 Integration: Periodization + Recipes
 *
 * Connects the periodization system (Phase 3) with the recipe system (Phase 2)
 * to generate complete, periodized training programs.
 */

import { type UserTrainingProfile, type ExperienceLevel, type PrimaryGoal, normalizeUserTrainingProfile } from './training-profile.ts';
import type { DayRecipe } from './exercise-recipes-by-experience.ts';
import { selectRecipesForPlan } from './recipe-selection.ts';
import {
  type PeriodizationConfig,
  type WeekStructure,
  type ProgressiveOverloadProtocol,
  getPeriodizationConfig,
  getCurrentWeekStructure,
  isDeloadWeek,
  shouldDeload,
  PROGRESSIVE_OVERLOAD_PROTOCOLS,
  DELOAD_STRATEGIES,
} from './periodization-models.ts';
import {
  type ProgressionState,
  type WeekPlan,
  type ExercisePlan,
  type FatigueAssessment,
  initializeProgression,
  generateWeekPlan,
  assessFatigue,
  generateDeloadPlan,
  generatePerformanceSummary,
  recordWeekPerformance,
} from './week-progression.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PeriodizedProgram = {
  programId: string;
  userId: string;
  profile: UserTrainingProfile;
  totalWeeks: number;
  periodizationConfig: PeriodizationConfig;
  protocol: ProgressiveOverloadProtocol;
  weeks: WeekPlan[];
  currentWeek: number;
  progressionState: ProgressionState;
};

export type ProgramGenerationOptions = {
  weeks?: number;
  forceDeload?: boolean;
  customBlocks?: boolean;
  protocolName?: string;
};

export type WeekPreview = {
  weekNumber: number;
  blockName: string;
  focus: string;
  volumeMultiplier: number;
  targetRPE: number;
  isDeload: boolean;
  totalExercises: number;
  totalSets: number;
  keyChanges: string[];
};

// ---------------------------------------------------------------------------
// Main Program Generation
// ---------------------------------------------------------------------------

export function generatePeriodizedProgram(
  userId: string,
  profile: UserTrainingProfile,
  options: ProgramGenerationOptions = {}
): PeriodizedProgram {
  const weeks = options.weeks || 12;
  const splitKey = determineSplitKey(profile);

  // 1. Get base recipes from Phase 2
  const recipeResult = selectRecipesForPlan({
    splitKey,
    experienceLevel: profile.experienceLevel,
    primaryGoal: profile.primaryGoal,
    daysPerWeek: profile.daysPerWeek,
    sessionDurationMin: profile.sessionDurationMin || 60,
    equipmentAccess: profile.equipmentAccess,
    recoveryBurden: profile.injuries && profile.injuries.length > 0 ? 'high' : 'moderate',
  });

  // 2. Initialize periodization from Phase 3
  const periodizationConfig = getPeriodizationConfig(
    profile.experienceLevel,
    profile.primaryGoal,
    weeks
  );

  // Override protocol if specified
  let protocol = selectProtocolForProfile(profile, options.protocolName);

  // 3. Initialize progression state
  let progressionState = initializeProgression(
    userId,
    generateProgramId(),
    profile.experienceLevel,
    profile.primaryGoal,
    weeks
  );

  // Override with custom protocol
  progressionState = { ...progressionState, protocol };

  // 4. Generate all weeks
  const programWeeks: WeekPlan[] = [];
  const baseRecipes = recipeResult.recipes.map((r) => r.recipe);

  for (let weekNum = 1; weekNum <= weeks; weekNum++) {
    // Generate week plan
    const { plan } = generateWeekPlan(progressionState, baseRecipes);
    programWeeks.push(plan);

    // Simulate advancement (in real app, this happens after week completion)
    if (weekNum < weeks) {
      progressionState = {
        ...progressionState,
        currentWeek: weekNum + 1,
        periodizationConfig: advancePeriodizationConfig(progressionState.periodizationConfig),
      };
    }
  }

  return {
    programId: progressionState.programId,
    userId,
    profile,
    totalWeeks: weeks,
    periodizationConfig,
    protocol,
    weeks: programWeeks,
    currentWeek: 1,
    progressionState: {
      ...progressionState,
      currentWeek: 1, // Reset to start
    },
  };
}

function determineSplitKey(profile: UserTrainingProfile): string {
  const { daysPerWeek, primaryGoal } = profile;

  // Map days to splits
  if (daysPerWeek <= 3) return 'full_body_3';
  if (daysPerWeek === 4) return 'upper_lower_4';
  if (daysPerWeek === 5) return 'upper_lower_4'; // Could add push_pull_legs
  if (daysPerWeek >= 6) return 'upper_lower_4'; // Could add bro_split

  return 'full_body_3';
}

function generateProgramId(): string {
  return `prog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function selectProtocolForProfile(
  profile: UserTrainingProfile,
  overrideName?: string
): ProgressiveOverloadProtocol {
  if (overrideName) {
    const protocol = PROGRESSIVE_OVERLOAD_PROTOCOLS.find((p) =>
      p.name.toLowerCase().includes(overrideName.toLowerCase())
    );
    if (protocol) return protocol;
  }

  // Auto-select based on profile
  if (profile.experienceLevel === 'beginner') {
    return PROGRESSIVE_OVERLOAD_PROTOCOLS.find((p) => p.name === 'Linear Weight Addition')!;
  }

  if (profile.primaryGoal === 'get_stronger') {
    return PROGRESSIVE_OVERLOAD_PROTOCOLS.find((p) => p.name === 'APRE (Autoregulated)')!;
  }

  if (profile.experienceLevel === 'advanced') {
    return PROGRESSIVE_OVERLOAD_PROTOCOLS.find((p) => p.name === 'RPE-Based')!;
  }

  return PROGRESSIVE_OVERLOAD_PROTOCOLS.find((p) => p.name === 'Double Progression')!;
}

function advancePeriodizationConfig(config: PeriodizationConfig): PeriodizationConfig {
  const newConfig = { ...config };
  const currentBlock = newConfig.blocks[newConfig.currentBlockIndex];

  // Move to next week in block
  if (!currentBlock) return newConfig;

  const nextWeekInBlock = newConfig.currentWeekInBlock + 1;

  if (nextWeekInBlock >= currentBlock.durationWeeks) {
    // Move to next block
    newConfig.currentBlockIndex++;
    newConfig.currentWeekInBlock = 0;
  } else {
    newConfig.currentWeekInBlock = nextWeekInBlock;
  }

  return newConfig;
}

// ---------------------------------------------------------------------------
// Week Navigation
// ---------------------------------------------------------------------------

export function getCurrentWeek(program: PeriodizedProgram): WeekPlan {
  return program.weeks[program.currentWeek - 1];
}

export function advanceToNextWeek(
  program: PeriodizedProgram,
  lastWeekPerformance?: Parameters<typeof recordWeekPerformance>[1]
): PeriodizedProgram {
  if (program.currentWeek >= program.totalWeeks) {
    return program; // Program complete
  }

  let newProgressionState = program.progressionState;

  // Record performance if provided
  if (lastWeekPerformance) {
    newProgressionState = recordWeekPerformance(newProgressionState, lastWeekPerformance);
  }

  return {
    ...program,
    currentWeek: program.currentWeek + 1,
    progressionState: newProgressionState,
  };
}

export function previewUpcomingWeeks(
  program: PeriodizedProgram,
  numWeeks: number = 4
): WeekPreview[] {
  const startWeek = program.currentWeek;
  const previews: WeekPreview[] = [];

  for (let i = 0; i < numWeeks && startWeek + i <= program.totalWeeks; i++) {
    const weekNum = startWeek + i;
    const weekPlan = program.weeks[weekNum - 1];

    if (!weekPlan) break;

    const keyChanges: string[] = [];

    if (weekPlan.isDeload) {
      keyChanges.push('🔄 Deload week');
    }

    if (weekPlan.volumeMultiplier !== 1.0) {
      const direction = weekPlan.volumeMultiplier > 1.0 ? '↑' : '↓';
      keyChanges.push(`${direction} Volume ${Math.round(weekPlan.volumeMultiplier * 100)}%`);
    }

    if (Math.abs(weekPlan.targetRPE - 8) > 0.5) {
      const direction = weekPlan.targetRPE > 8 ? '↑' : '↓';
      keyChanges.push(`${direction} Intensity (RPE ${weekPlan.targetRPE})`);
    }

    previews.push({
      weekNumber: weekNum,
      blockName: weekPlan.blockFocus,
      focus: weekPlan.isDeload ? 'Recovery' : 'Training',
      volumeMultiplier: weekPlan.volumeMultiplier,
      targetRPE: weekPlan.targetRPE,
      isDeload: weekPlan.isDeload,
      totalExercises: weekPlan.days.reduce((sum, d) => sum + d.exercises.length, 0),
      totalSets: weekPlan.days.reduce((sum, d) => sum + d.totalSets, 0),
      keyChanges,
    });
  }

  return previews;
}

// ---------------------------------------------------------------------------
// Fatigue Monitoring
// ---------------------------------------------------------------------------

export function checkFatigueStatus(
  program: PeriodizedProgram
): { assessment: FatigueAssessment; shouldDeload: boolean } {
  const assessment = assessFatigue(
    program.progressionState.performanceHistory,
    program.periodizationConfig
  );

  const needsDeload =
    assessment.level === 'high' ||
    isDeloadWeek(program.periodizationConfig) ||
    program.periodizationConfig.currentWeekInBlock > 0
      ? shouldDeload(program.periodizationConfig, assessment.indicators)
      : false;

  return { assessment, shouldDeload: needsDeload };
}

// ---------------------------------------------------------------------------
// Program Summary
// ---------------------------------------------------------------------------

export type ProgramSummary = {
  programId: string;
  totalWeeks: number;
  weeksCompleted: number;
  weeksRemaining: number;
  currentBlock: string;
  protocol: string;
  nextWeekPreview: WeekPreview | null;
  fatigueStatus: FatigueAssessment;
  recommendations: string[];
};

export function getProgramSummary(program: PeriodizedProgram): ProgramSummary {
  const { assessment, shouldDeload } = checkFatigueStatus(program);
  const upcoming = previewUpcomingWeeks(program, 1);

  const recommendations: string[] = [];

  if (shouldDeload) {
    recommendations.push('🔄 Take a deload week to recover');
  }

  if (assessment.level === 'moderate') {
    recommendations.push('⚠️ Monitor fatigue levels closely');
  }

  const performanceSummary = generatePerformanceSummary(
    program.progressionState.performanceHistory,
    program.profile.experienceLevel
  );

  recommendations.push(...performanceSummary.recommendations);

  return {
    programId: program.programId,
    totalWeeks: program.totalWeeks,
    weeksCompleted: program.currentWeek - 1,
    weeksRemaining: program.totalWeeks - program.currentWeek + 1,
    currentBlock: program.weeks[program.currentWeek - 1]?.blockFocus || 'Unknown',
    protocol: program.protocol.name,
    nextWeekPreview: upcoming[0] || null,
    fatigueStatus: assessment,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// Program Modification
// ---------------------------------------------------------------------------

export function forceDeload(program: PeriodizedProgram): PeriodizedProgram {
  // Insert a deload week at current position
  const currentWeekPlan = program.weeks[program.currentWeek - 1];
  const strategy = DELOAD_STRATEGIES[program.profile.experienceLevel];

  // Get base recipes for deload
  const recipeResult = selectRecipesForPlan({
    splitKey: determineSplitKey(program.profile),
    experienceLevel: program.profile.experienceLevel,
    primaryGoal: program.profile.primaryGoal,
    daysPerWeek: program.profile.daysPerWeek,
    sessionDurationMin: program.profile.sessionDurationMin || 60,
    equipmentAccess: program.profile.equipmentAccess,
    recoveryBurden: 'high',
  });

  const baseRecipes = recipeResult.recipes.map((r) => r.recipe);
  const deloadWeek = generateDeloadPlan(baseRecipes, strategy, program.profile.experienceLevel);

  // Insert deload week
  const newWeeks = [...program.weeks];
  newWeeks.splice(program.currentWeek - 1, 0, {
    ...deloadWeek,
    weekNumber: program.currentWeek,
  });

  // Renumber subsequent weeks
  for (let i = program.currentWeek; i < newWeeks.length; i++) {
    newWeeks[i] = { ...newWeeks[i], weekNumber: i + 1 };
  }

  return {
    ...program,
    totalWeeks: program.totalWeeks + 1,
    weeks: newWeeks,
  };
}

export function adjustProgramIntensity(
  program: PeriodizedProgram,
  adjustment: 'increase' | 'decrease' | 'reset'
): PeriodizedProgram {
  const newWeeks = program.weeks.map((week) => {
    if (week.weekNumber < program.currentWeek) return week; // Don't change past weeks

    const multiplier = adjustment === 'increase' ? 1.1 : adjustment === 'decrease' ? 0.9 : 1.0;

    return {
      ...week,
      days: week.days.map((day) => ({
        ...day,
        exercises: day.exercises.map((ex) => ({
          ...ex,
          sets: adjustment === 'reset' ? ex.sets : Math.round(ex.sets * multiplier),
          targetRPE: adjustment === 'reset' ? ex.slot.rpe || 8 : ex.targetRPE,
        })),
      })),
    };
  });

  return {
    ...program,
    weeks: newWeeks,
  };
}

// ---------------------------------------------------------------------------
// Export Preset Programs
// ---------------------------------------------------------------------------

export const PRESET_PROGRAMS = {
  beginner_strength: (userId: string) =>
    generatePeriodizedProgram(userId, normalizeUserTrainingProfile({
      experienceLevel: 'beginner',
      primaryGoal: 'get_stronger',
      daysPerWeek: 3,
      sessionDurationTargetMin: 45,
      equipmentAccess: 'full_gym',
    }), { weeks: 8 }),

  intermediate_hypertrophy: (userId: string) =>
    generatePeriodizedProgram(userId, normalizeUserTrainingProfile({
      experienceLevel: 'intermediate',
      primaryGoal: 'build_muscle',
      daysPerWeek: 4,
      sessionDurationTargetMin: 60,
      equipmentAccess: 'full_gym',
    }), { weeks: 12 }),

  advanced_undulating: (userId: string) =>
    generatePeriodizedProgram(userId, normalizeUserTrainingProfile({
      experienceLevel: 'advanced',
      primaryGoal: 'build_muscle',
      daysPerWeek: 5,
      sessionDurationTargetMin: 75,
      equipmentAccess: 'full_gym',
    }), { weeks: 16, protocolName: 'RPE' }),
};
