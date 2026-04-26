/**
 * testing-validation-system.ts
 *
 * Phase 5: Testing & Validation - Main Export
 *
 * Complete testing and validation system including:
 * - Unit and integration tests
 * - Performance benchmarks
 * - A/B testing framework
 * - User feedback collection
 * - Analytics and insights
 */

// Testing Framework
export {
  // Types
  type TestResult,
  type TestSuite,
  type ValidationRule,
  type BenchmarkResult,
  // Classes
  TestRunner,
  Validator,
  // Functions
  assertEquals,
  assertTrue,
  assertFalse,
  assertInRange,
  assertNotNull,
  assertArrayLength,
  forAll,
  generateRandomExperienceLevel,
  generateRandomGoal,
  generateRandomMetrics,
  benchmark,
  printBenchmark,
  // Validators
  createProgramValidator,
  createRecipeValidator,
  // Test Data
  TestData,
  // Runner
  testRunner,
} from './testing-framework.ts';

// Test Suite
export { runAllTests } from './test-suite.ts';

// Analytics
export {
  // Types
  type ProgramMetrics,
  type UserEngagementMetrics,
  type CohortMetrics,
  type PerformanceInsight,
  // Functions
  calculateProgramMetrics,
  calculateUserEngagement,
  generatePerformanceInsights,
  calculateCohortMetrics,
  // Namespace
  Analytics,
} from './analytics-framework.ts';

// A/B Testing
export {
  // Types
  type ExperimentType,
  type ExperimentStatus,
  type ExperimentVariant,
  type Experiment,
  type ExperimentAssignment,
  type ExperimentResults,
  type FeatureFlag,
  // Functions
  registerExperiment,
  getExperiment,
  listExperiments,
  assignUserToExperiment,
  getUserVariant,
  analyzeExperimentResults,
  isFeatureEnabled,
  // Constants
  PREDEFINED_EXPERIMENTS,
  // Namespaces
  ABTesting,
  FeatureFlags,
} from './ab-testing-framework.ts';

// Feedback System
export {
  // Types
  type FeedbackType,
  type WorkoutFeedback,
  type ExerciseFeedback,
  type ProgramSatisfactionFeedback,
  type FeatureRequest,
  type BugReport,
  type GeneralComment,
  type UserFeedback,
  type FeedbackSubmission,
  type FeedbackAnalysis,
  type FeedbackSummary,
  type ProgramFeedbackSummary,
  // Functions
  submitFeedback,
  analyzeFeedback,
  aggregateFeedback,
  getProgramFeedbackSummary,
  createQuickWorkoutFeedback,
  createNPSFeedback,
  // Namespace
  FeedbackSystem,
} from './feedback-system.ts';

/**
 * Quick Start: Run Tests
 *
 * @example
 * ```typescript
 * import { runAllTests } from './testing-validation-system';
 *
 * // Run complete test suite
 * runAllTests();
 *
 * // Output:
 * // ✅ Recovery Score Calculation (5 tests)
 * // ✅ Periodization Models (3 tests)
 * // ✅ Recipe System (4 tests)
 * // ✅ Full Program Generation (4 tests)
 * // ...
 * // ✅ ALL TESTS PASSED
 * ```
 */

/**
 * Performance Benchmarking
 *
 * @example
 * ```typescript
 * import { benchmark, printBenchmark } from './testing-validation-system';
 * import { generatePeriodizedProgram } from './periodization-system';
 *
 * const result = benchmark(
 *   'Program Generation',
 *   () => generatePeriodizedProgram('test', profile),
 *   1000
 * );
 *
 * printBenchmark(result);
 * // Program Generation
 * //   Operations: 1,000
 * //   Duration: 245.32ms
 * //   Ops/sec: 4,076
 * ```
 */

/**
 * A/B Testing Example
 *
 * @example
 * ```typescript
 * import { ABTesting, PREDEFINED_EXPERIMENTS } from './testing-validation-system';
 *
 * // Register an experiment
 * ABTesting.registerExperiment(PREDEFINED_EXPERIMENTS[0]);
 *
 * // Assign user to experiment
 * const assignment = ABTesting.assignUserToExperiment('user_123', {
 *   experienceLevel: 'intermediate',
 *   primaryGoal: 'build_muscle',
 *   daysPerWeek: 4,
 * });
 *
 * if (assignment) {
 *   console.log(`User assigned to variant: ${assignment.variantId}`);
 * }
 * ```
 */

/**
 * User Feedback Collection
 *
 * @example
 * ```typescript
 * import { FeedbackSystem } from './testing-validation-system';
 *
 * // Submit workout feedback
 * const submission = FeedbackSystem.submit({
 *   userId: 'user_123',
 *   feedback: {
 *     type: 'workout_rating',
 *     programId: 'prog_456',
 *     weekNumber: 3,
 *     dayNumber: 1,
 *     rating: 5,
 *     difficulty: 'just_right',
 *     duration: 'just_right',
 *     energyLevel: 'high',
 *     completion: 'all_sets',
 *   },
 *   context: {
 *     experienceLevel: 'intermediate',
 *     primaryGoal: 'build_muscle',
 *   },
 * });
 *
 * console.log(submission.analysis?.sentiment); // "positive"
 * console.log(submission.analysis?.actionable); // true/false
 * ```
 */

/**
 * Analytics Dashboard
 *
 * @example
 * ```typescript
 * import { Analytics } from './testing-validation-system';
 *
 * // Calculate program metrics
 * const metrics = Analytics.program(programWithRecovery, completedWorkouts);
 *
 * console.log(`Completion Rate: ${metrics.completionRate}%`);
 * console.log(`Strength Gains: ${JSON.stringify(metrics.strengthImprovements)}`);
 * console.log(`Avg Recovery Score: ${metrics.averageRecoveryScore}`);
 *
 * // Generate insights
 * const insights = Analytics.insights(metrics);
 * insights.forEach(insight => {
 *   console.log(`${insight.title}: ${insight.recommendation}`);
 * });
 * ```
 */

/**
 * Property-Based Testing
 *
 * @example
 * ```typescript
 * import { forAll, generateRandomMetrics } from './testing-validation-system';
 * import { calculateRecoveryScore } from './recovery-system';
 *
 * const result = forAll(
 *   generateRandomMetrics,
 *   (metrics) => {
 *     const score = calculateRecoveryScore([metrics], [], 'intermediate');
 *     return score.overall >= 0 && score.overall <= 100;
 *   },
 *   1000 // iterations
 * );
 *
 * console.log(result.passed); // true
 * ```
 */

/**
 * Validation
 *
 * @example
 * ```typescript
 * import { createProgramValidator } from './testing-validation-system';
 *
 * const validator = createProgramValidator();
 * const results = validator.validate(program);
 *
 * results.forEach(result => {
 *   if (!result.passed) {
 *     console.log(`[${result.severity}] ${result.message}`);
 *   }
 * });
 *
 * const isValid = validator.isValid(program);
 * ```
 */

/**
 * Feature Flags
 *
 * @example
 * ```typescript
 * import { FeatureFlags } from './testing-validation-system';
 *
 * // Check if feature is enabled
 * if (FeatureFlags.isEnabled('recovery_auto_adjustments', userId)) {
 *   // Apply auto-adjustments
 * }
 *
 * // Register new feature flag
 * FeatureFlags.register({
 *   name: 'new_feature',
 *   enabled: true,
 *   rolloutPercentage: 10,
 *   description: 'New feature in beta',
 * });
 * ```
 */

/**
 * Complete Testing Workflow
 *
 * ```typescript
 * import {
 *   testRunner,
 *   assertEquals,
 *   assertTrue,
 * } from './testing-validation-system';
 *
 * // Define test suite
 * testRunner.describe('My Feature', () => {
 *   testRunner.it('should work correctly', () => {
 *     const result = myFunction();
 *     assertEquals(result, expected);
 *   });
 *
 *   testRunner.it('should handle edge cases', () => {
 *     assertTrue(handleEdgeCase());
 *   });
 * });
 *
 * // Run and print results
 * testRunner.printResults();
 * ```
 */

/**
 * Predefined Experiments
 *
 * Available experiments for immediate use:
 *
 * 1. **Periodization Model Comparison** (`exp_periodization_model_2024`)
 *    - Compare Linear vs Block periodization
 *    - Target: Intermediate users
 *    - Metric: Strength gain percentage
 *
 * 2. **Recovery Messaging Impact** (`exp_recovery_messaging_2024`)
 *    - Test proactive recovery alerts
 *    - Target: Beginner/Intermediate
 *    - Metric: Completion rate
 *
 * 3. **Deload Frequency Optimization** (`exp_deload_frequency_2024`)
 *    - Compare 3-week vs 4-week deloads
 *    - Target: Advanced users
 *    - Metric: Recovery score
 *
 * 4. **Beginner Volume Prescription** (`exp_volume_beginners_2024`)
 *    - Test lower vs standard volume
 *    - Target: Beginners
 *    - Metric: Adherence score
 */

/**
 * Testing Best Practices
 *
 * 1. **Unit Tests**: Test individual functions in isolation
 * 2. **Integration Tests**: Test component interactions
 * 3. **Property-Based Tests**: Test invariants across random inputs
 * 4. **Performance Tests**: Ensure operations meet speed requirements
 * 5. **Validation Tests**: Ensure data integrity
 *
 * Run order:
 * ```
 * 1. Unit Tests (fast, many)
 * 2. Integration Tests (slower, fewer)
 * 3. Property Tests (many random inputs)
 * 4. Performance Benchmarks
 * 5. Validation Suite
 * ```
 */
