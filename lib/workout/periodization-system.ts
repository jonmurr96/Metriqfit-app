/**
 * periodization-system.ts
 *
 * Phase 3: Periodization System - Main Export
 *
 * Complete periodization implementation with:
 * - Linear, Block, and Daily Undulating models
 * - Progressive overload protocols
 * - Week-to-week progression tracking
 * - Fatigue monitoring and auto-regulation
 * - Deload strategies
 */

// Periodization Models
export {
  // Types
  type PeriodizationModel,
  type MesocycleFocus,
  type WeekStructure,
  type PeriodizationBlock,
  type ProgressiveOverloadProtocol,
  type DeloadStrategy,
  type PeriodizationConfig,
  type ProgressionRecommendation,
  // Functions
  getPeriodizationConfig,
  getCurrentWeekStructure,
  advanceWeek,
  isDeloadWeek,
  shouldDeload,
  calculateProgression,
  applyWeekAdjustments,
  // Constants
  PROGRESSIVE_OVERLOAD_PROTOCOLS,
  DELOAD_STRATEGIES,
  PERIODIZATION_PRESETS,
} from './periodization-models.ts';

// Week Progression
export {
  // Types
  type ExercisePerformance,
  type WeekPerformance,
  type ProgressionState,
  type WeekPlan,
  type DayPlan,
  type ExercisePlan,
  type PerformanceSummary,
  // Functions
  initializeProgression,
  generateWeekPlan,
  recordWeekPerformance,
  assessFatigue,
  generateDeloadPlan,
  generatePerformanceSummary,
} from './week-progression.ts';

// Integration
export {
  // Types
  type PeriodizedProgram,
  type ProgramGenerationOptions,
  type WeekPreview,
  type ProgramSummary,
  // Functions
  generatePeriodizedProgram,
  getCurrentWeek,
  advanceToNextWeek,
  previewUpcomingWeeks,
  checkFatigueStatus,
  getProgramSummary,
  forceDeload,
  adjustProgramIntensity,
  // Presets
  PRESET_PROGRAMS,
} from './periodization-integration.ts';

/**
 * Quick Start: Generate a Periodized Program
 *
 * @example
 * ```typescript
 * import { generatePeriodizedProgram, getProgramSummary } from './periodization-system';
 *
 * // Create program
 * const program = generatePeriodizedProgram('user_123', {
 *   experienceLevel: 'intermediate',
 *   primaryGoal: 'build_muscle',
 *   daysPerWeek: 4,
 *   sessionDurationMin: 60,
 *   equipmentAccess: 'full_gym',
 * });
 *
 * // Get current week's plan
 * const currentWeek = program.weeks[program.currentWeek - 1];
 *
 * // Check fatigue status
 * const summary = getProgramSummary(program);
 * console.log(summary.fatigueStatus.level); // 'low' | 'moderate' | 'high'
 * console.log(summary.recommendations);
 * ```
 */

/**
 * Week-to-Week Workflow
 *
 * 1. User completes a week of training
 * 2. Record performance data
 * 3. System calculates next week's adjustments
 * 4. Advance to next week
 *
 * @example
 * ```typescript
 * import { recordWeekPerformance, advanceToNextWeek } from './periodization-system';
 *
 * // After completing week 1
 * const updatedProgram = advanceToNextWeek(program, {
 *   weekNumber: 1,
 *   fatigueLevel: 'moderate',
 *   motivationLevel: 'high',
 *   sleepQuality: 'good',
 *   averageRPE: 8.5,
 *   totalVolume: 15000,
 *   deloadTriggered: false,
 *   exercises: [
 *     { exerciseName: 'Bench Press', weight: 185, reps: [8, 8, 7], rpe: [8, 8, 9] },
 *     // ... more exercises
 *   ],
 * });
 *
 * // Next week's plan has auto-adjustments applied
 * const nextWeek = updatedProgram.weeks[updatedProgram.currentWeek - 1];
 * ```
 */

/**
 * Periodization Models
 *
 * **Linear Periodization** (Beginners):
 * - Weeks 1-3: Gradual volume increase
 * - Week 4: Deload
 * - Simple progression: add weight each session
 *
 * **Block Periodization** (Intermediate):
 * - Accumulation: High volume, moderate intensity
 * - Intensification: Moderate volume, high intensity
 * - Realization: Low volume, peak intensity
 * - Deload every 4th week
 *
 * **Daily Undulating** (Advanced):
 * - Heavy day: Low reps, high intensity
 * - Moderate day: Medium reps, moderate intensity
 * - Light day: High reps, lower intensity
 * - Undulates throughout the week
 *
 * **Auto-Regulated** (All levels):
 * - Uses RPE to adjust loads
 * - Responds to fatigue in real-time
 * - Flexible progression based on performance
 */

/**
 * Progressive Overload Protocols
 *
 * | Protocol | Best For | How It Works |
 * |----------|----------|--------------|
 * | Linear Weight Addition | Beginners | Add weight every session |
 * | Double Progression | Intermediates | Hit rep range → add weight |
 * | Rep Goal | Hypertrophy | Total rep goal across sets |
 * | APRE | Strength | Adjust based on performance surplus/deficit |
 * | RPE-Based | Advanced | Auto-regulate using RPE targets |
 * | Volume Progression | Advanced | Add sets weekly to MRV |
 */

/**
 * Deload Strategies
 *
 * | Level | Volume | Intensity | Frequency | Indicators |
 * |-------|--------|-----------|-----------|------------|
 * | Beginner | 50% | -1 RPE | Every 6 weeks | Fatigue, motivation drop |
 * | Intermediate | 50% | -2 RPE | Every 4 weeks | RPE >9, joint aches |
 * | Advanced | 40% | -2.5 RPE | Every 3 weeks | Central fatigue, illness |
 */
