/**
 * recovery-system.ts
 *
 * Phase 4: Recovery Management - Main Export
 *
 * Complete recovery implementation with:
 * - Recovery score calculation (sleep, muscle, nervous system, hydration)
 * - Rest day optimization
 * - Active recovery recommendations
 * - Overreaching/overtraining detection
 * - Auto-adjustments to training based on recovery
 * - Nutrition timing guidance
 * - Sleep optimization protocols
 */

// Core recovery management
export {
  // Types
  type RecoveryMetric,
  type RecoveryScore,
  type RestDayPlacement,
  type ActiveRecoverySession,
  type OverreachingStatus,
  type RecoveryRecommendation,
  type NutritionTiming,
  type RecoverySummary,
  // Functions
  calculateRecoveryScore,
  optimizeRestDays,
  getActiveRecoverySession,
  getContrastTherapyProtocol,
  detectOverreaching,
  generateRecoveryRecommendations,
  getNutritionTiming,
  generateSleepProtocol,
  generateRecoverySummary,
} from './recovery-management.ts';

// Integration with periodization
export {
  // Types
  type ProgramWithRecovery,
  type RecoveryAlert,
  type DailyCheckIn,
  type EnhancedProgramSummary,
  // Functions
  enhanceProgramWithRecovery,
  processDailyCheckIn,
  adjustWeekPlanForRecovery,
  getRestDayRecommendations,
  generateEnhancedSummary,
  // System export
  RecoverySystem,
} from './recovery-integration.ts';

/**
 * Quick Start: Add Recovery to Program
 *
 * @example
 * ```typescript
 * import { generatePeriodizedProgram } from './periodization-system';
 * import { enhanceProgramWithRecovery, processDailyCheckIn } from './recovery-system';
 *
 * // Create base program
 * const baseProgram = generatePeriodizedProgram('user_123', profile);
 *
 * // Add recovery tracking
 * let program = enhanceProgramWithRecovery(baseProgram);
 *
 * // Daily check-in
 * const { program: updated, checkIn } = processDailyCheckIn(program, {
 *   date: new Date().toISOString(),
 *   sleepHours: 7.5,
 *   sleepQuality: 'good',
 *   sorenessLevel: 3,
 *   energyLevel: 4,
 *   stressLevel: 2,
 *   motivationLevel: 'high',
 * });
 *
 * console.log(checkIn.recommendation);
 * // → "READY TO TRAIN: Recovery looks good. Proceed with planned workout."
 * console.log(checkIn.alerts);
 * // → [] (no alerts for good recovery)
 * ```
 */

/**
 * Recovery Score Components
 *
 * The recovery score (0-100) is calculated from four components:
 *
 * | Component | Weight | Metrics |
 * |-----------|--------|---------|
 * | Sleep | 35% | Hours + Quality |
 * | Muscle Recovery | 30% | Soreness + Performance trend |
 * | Nervous System | 25% | HRV + Resting HR + Energy |
 * | Hydration | 10% | Estimated from energy/stress |
 *
 * Score Ranges:
 * - 85-100: Excellent (optimal training conditions)
 * - 70-84: Good (ready for hard training)
 * - 50-69: Fair (proceed with caution)
 * - 30-49: Poor (reduce volume/intensity)
 * - 0-29: Critical (rest required)
 *
 * @example
 * ```typescript
 * import { calculateRecoveryScore } from './recovery-system';
 *
 * const score = calculateRecoveryScore(
 *   [{
 *     date: '2024-01-15',
 *     sleepHours: 7,
 *     sleepQuality: 'good',
 *     sorenessLevel: 2,
 *     energyLevel: 4,
 *     stressLevel: 2,
 *     motivationLevel: 'high',
 *   }],
 *   [], // performance history
 *   'intermediate'
 * );
 *
 * console.log(score.overall); // 78
 * console.log(score.status);  // "good"
 * console.log(score.trend);   // "stable"
 * ```
 */

/**
 * Overreaching Detection
 *
 * Automatically detects functional overreaching (beneficial) vs
 * non-functional overreaching (harmful) vs overtraining (dangerous).
 *
 * States:
 * - **Fresh**: Excellent recovery, ready for overload
 * - **Adequate**: Normal training fatigue
 * - **Functional Overreaching**: High fatigue but performance maintained
 *   → Can be beneficial if followed by recovery
 * - **Non-Functional Overreaching**: Performance declining
 *   → Deload required
 * - **Overtrained**: Chronic performance suppression
 *   → Complete rest, medical consultation
 *
 * @example
 * ```typescript
 * import { detectOverreaching } from './recovery-system';
 *
 * const status = detectOverreaching(metrics, performanceHistory, 'intermediate');
 *
 * console.log(status.state);      // "overreached"
 * console.log(status.functional); // true
 * console.log(status.actions);
 * // → ["Schedule deload week", "Prioritize sleep 9+ hours", ...]
 * ```
 */

/**
 * Rest Day Optimization
 *
 * Intelligently places rest days based on:
 * - Training frequency and split
 * - Recovery scores
 * - Consecutive training days
 * - Experience level requirements
 *
 * @example
 * ```typescript
 * import { optimizeRestDays } from './recovery-system';
 *
 * const restDays = optimizeRestDays(
 *   4, // days per week
 *   [1, 2, 4, 5], // training days (Mon, Tue, Thu, Fri)
 *   recoveryScores,
 *   'intermediate'
 * );
 *
 * // Returns:
 * // [
 * //   { dayOfWeek: 0, priority: "recommended", reason: "Post-weekend recovery", ... },
 * //   { dayOfWeek: 3, priority: "required", reason: "Between split sessions", ... },
 * //   { dayOfWeek: 6, priority: "recommended", reason: "Pre-week prep", ... }
 * // ]
 * ```
 */

/**
 * Active Recovery Sessions
 *
 * Get personalized active recovery recommendations based on recovery status.
 *
 * Types:
 * - **Light Cardio**: 20min walk/cycle at conversational pace
 * - **Mobility**: Joint circles, dynamic stretching
 * - **Yoga**: Restorative poses, breathing focus
 * - **Stretching**: Static stretches for sore muscles
 * - **Foam Rolling**: Myofascial release
 * - **Contrast Therapy**: Hot/cold for inflammation
 *
 * @example
 * ```typescript
 * import { getActiveRecoverySession } from './recovery-system';
 *
 * const session = getActiveRecoverySession(
 *   { overall: 65, status: 'fair', ... },
 *   false, // not a training day
 *   'build_muscle'
 * );
 *
 * console.log(session.type);        // "light_cardio"
 * console.log(session.durationMin); // 20
 * console.log(session.description); // "Easy walk or light cycling..."
 * ```
 */

/**
 * Nutrition Timing
 *
 * Get meal timing and macro recommendations for different contexts.
 *
 * @example
 * ```typescript
 * import { getNutritionTiming } from './recovery-system';
 *
 * const postWorkout = getNutritionTiming('post_workout', 'morning', 'build_muscle');
 *
 * console.log(postWorkout.timing);    // "Within 2 hours (ideally 30-60 min)"
 * console.log(postWorkout.macros);    // { protein: 40, carbs: 60, fats: 10 }
 * console.log(postWorkout.foods);     // ["lean protein", "rice or potatoes", ...]
 * ```
 */

/**
 * Sleep Optimization
 *
 * Generate personalized sleep protocols based on current sleep quality.
 *
 * @example
 * ```typescript
 * import { generateSleepProtocol } from './recovery-system';
 *
 * const protocol = generateSleepProtocol(6, 'poor', 'high');
 *
 * console.log(protocol.targetHours);      // 9
 * console.log(protocol.preSleepRoutine);  // ["90 min before: Last meal...", ...]
 * console.log(protocol.supplements);      // ["Magnesium glycinate 400mg", ...]
 * ```
 */

/**
 * Auto-Adjustment System
 *
 * Recovery system automatically adjusts training based on metrics:
 *
 * | Recovery Status | Volume | Intensity | Action |
 * |----------------|--------|-----------|--------|
 * | Excellent | 100% | Normal | Proceed as planned |
 * | Good | 100% | Normal | Proceed as planned |
 * | Fair | 80% | Cap RPE 8 | Reduce volume 20% |
 * | Poor | 50% | Cap RPE 7.5 | Auto-deload triggered |
 * | Critical | 25% | Cap RPE 7 | Training suspended |
 *
 * @example
 * ```typescript
 * import { adjustWeekPlanForRecovery } from './recovery-system';
 *
 * const adjustedWeek = adjustWeekPlanForRecovery(weekPlan, programWithRecovery);
 *
 * // If recovery is poor:
 * // - Sets reduced from 4 to 2
 * // - RPE capped at 7.5
 * // - Notes added explaining adjustments
 * ```
 */

/**
 * Recovery Alerts
 *
 * System generates alerts at three levels:
 *
 * **Critical** (immediate action required):
 * - Overtraining detected
 * - Non-functional overreaching
 * - Recovery score < 30
 *
 * **Warning** (adjustments recommended):
 * - Functional overreaching
 * - Recovery score 30-49
 * - Poor sleep quality
 * - Elevated soreness > 5 days
 *
 * **Info** (optimization suggestions):
 * - Sleep could be improved
 * - Consider active recovery
 * - Hydration reminder
 */

/**
 * Complete Recovery Workflow
 *
 * ```typescript
 * import {
 *   generatePeriodizedProgram,
 *   enhanceProgramWithRecovery,
 *   processDailyCheckIn,
 *   adjustWeekPlanForRecovery,
 *   generateEnhancedSummary,
 * } from './workout-system';
 *
 * // 1. Create program
 * let program = enhanceProgramWithRecovery(
 *   generatePeriodizedProgram('user_123', profile)
 * );
 *
 * // 2. Daily check-in (every morning)
 * const { program: updated, checkIn } = processDailyCheckIn(program, {
 *   date: new Date().toISOString(),
 *   sleepHours: 7,
 *   sleepQuality: 'fair',
 *   sorenessLevel: 3,
 *   energyLevel: 3,
 *   stressLevel: 3,
 *   motivationLevel: 'moderate',
 * });
 *
 * program = updated;
 *
 * // 3. Check if training adjusted
 * if (checkIn.trainingAdjusted) {
 *   console.log('Training adjusted due to recovery status');
 * }
 *
 * // 4. Get adjusted week plan
 * const currentWeek = getCurrentWeek(program);
 * const adjustedWeek = adjustWeekPlanForRecovery(currentWeek, program);
 *
 * // 5. View summary
 * const summary = generateEnhancedSummary(program);
 * console.log(summary.today.recommendation);
 * console.log(summary.recoveryStatus);
 * ```
 */
