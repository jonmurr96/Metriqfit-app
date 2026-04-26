/**
 * feedback-system.ts
 *
 * User Feedback Collection System
 * Part of Phase 5: Testing & Validation
 *
 * Collects and analyzes user feedback to continuously improve programs.
 */

import type { ExperienceLevel, PrimaryGoal } from './training-profile.ts';
import type { PeriodizedProgram } from './periodization-integration.ts';

// ---------------------------------------------------------------------------
// Feedback Types
// ---------------------------------------------------------------------------

export type FeedbackType =
  | 'workout_rating'
  | 'exercise_difficulty'
  | 'program_satisfaction'
  | 'feature_request'
  | 'bug_report'
  | 'general_comment';

export type WorkoutFeedback = {
  type: 'workout_rating';
  programId: string;
  weekNumber: number;
  dayNumber: number;
  rating: 1 | 2 | 3 | 4 | 5;
  difficulty: 'too_easy' | 'just_right' | 'too_hard';
  duration: 'too_short' | 'just_right' | 'too_long';
  energyLevel: 'low' | 'moderate' | 'high';
  completion: 'all_sets' | 'most_sets' | 'some_sets' | 'skipped';
  notes?: string;
};

export type ExerciseFeedback = {
  type: 'exercise_difficulty';
  programId: string;
  exerciseName: string;
  weekNumber: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  weightAppropriate: 'too_light' | 'just_right' | 'too_heavy';
  formConfidence: 'low' | 'moderate' | 'high';
  painOrDiscomfort: boolean;
  painLocation?: string;
  suggestions?: string;
};

export type ProgramSatisfactionFeedback = {
  type: 'program_satisfaction';
  programId: string;
  overallRating: 1 | 2 | 3 | 4 | 5;
  wouldRecommend: boolean;
  bestAspect?: string;
  worstAspect?: string;
  improvements?: string[];
  likelihoodToContinue: 'very_likely' | 'likely' | 'neutral' | 'unlikely' | 'very_unlikely';
};

export type FeatureRequest = {
  type: 'feature_request';
  category: 'exercise' | 'nutrition' | 'recovery' | 'analytics' | 'ui' | 'other';
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  useCase: string;
};

export type BugReport = {
  type: 'bug_report';
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  description: string;
  stepsToReproduce?: string[];
  expectedBehavior?: string;
  actualBehavior?: string;
  screenshots?: string[];
};

export type GeneralComment = {
  type: 'general_comment';
  category: 'praise' | 'complaint' | 'suggestion' | 'question';
  message: string;
};

export type UserFeedback =
  | WorkoutFeedback
  | ExerciseFeedback
  | ProgramSatisfactionFeedback
  | FeatureRequest
  | BugReport
  | GeneralComment;

export type FeedbackSubmission = {
  id: string;
  userId: string;
  timestamp: string;
  feedback: UserFeedback;
  context?: {
    experienceLevel: ExperienceLevel;
    primaryGoal: PrimaryGoal;
    programWeek?: number;
    deviceInfo?: string;
  };
  processed: boolean;
  analysis?: FeedbackAnalysis;
};

export type FeedbackAnalysis = {
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  category: string;
  keyPhrases: string[];
  actionable: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
  suggestedAction?: string;
  relatedFeatures?: string[];
};

// ---------------------------------------------------------------------------
// Feedback Storage (In-memory for demo - would be database in production)
// ---------------------------------------------------------------------------

const feedbackStore: FeedbackSubmission[] = [];

export function submitFeedback(submission: Omit<FeedbackSubmission, 'id' | 'timestamp' | 'processed'>): FeedbackSubmission {
  const fullSubmission: FeedbackSubmission = {
    ...submission,
    id: generateFeedbackId(),
    timestamp: new Date().toISOString(),
    processed: false,
  };

  // Auto-analyze feedback
  fullSubmission.analysis = analyzeFeedback(fullSubmission);
  fullSubmission.processed = true;

  feedbackStore.push(fullSubmission);

  return fullSubmission;
}

function generateFeedbackId(): string {
  return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Feedback Analysis
// ---------------------------------------------------------------------------

function analyzeFeedback(submission: FeedbackSubmission): FeedbackAnalysis {
  const feedback = submission.feedback;

  // Determine sentiment based on feedback type
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  let sentimentScore = 0;
  let actionable = false;
  let priority: FeedbackAnalysis['priority'] = 'low';

  switch (feedback.type) {
    case 'workout_rating':
      sentimentScore = (feedback.rating - 3) / 2; // -1 to 1
      sentiment = feedback.rating >= 4 ? 'positive' : feedback.rating <= 2 ? 'negative' : 'neutral';
      actionable = feedback.difficulty !== 'just_right' || feedback.duration !== 'just_right';
      priority = feedback.rating <= 2 ? 'high' : feedback.rating <= 3 ? 'medium' : 'low';
      break;

    case 'exercise_difficulty':
      sentimentScore = (feedback.difficulty - 3) / 2;
      sentiment = feedback.difficulty >= 4 ? 'positive' : feedback.difficulty <= 2 ? 'negative' : 'neutral';
      actionable = feedback.painOrDiscomfort || feedback.weightAppropriate !== 'just_right';
      priority = feedback.painOrDiscomfort ? 'critical' : feedback.difficulty <= 2 ? 'medium' : 'low';
      break;

    case 'program_satisfaction':
      sentimentScore = (feedback.overallRating - 3) / 2;
      sentiment = feedback.overallRating >= 4 ? 'positive' : feedback.overallRating <= 2 ? 'negative' : 'neutral';
      actionable = feedback.improvements && feedback.improvements.length > 0;
      priority = feedback.overallRating <= 2 ? 'high' : 'medium';
      break;

    case 'bug_report':
      sentiment = 'negative';
      sentimentScore = -0.7;
      actionable = true;
      priority = feedback.severity === 'critical' ? 'critical' : feedback.severity === 'major' ? 'high' : 'medium';
      break;

    case 'feature_request':
      sentiment = 'neutral';
      sentimentScore = 0.1;
      actionable = true;
      priority = feedback.priority;
      break;

    case 'general_comment':
      sentiment = analyzeSentiment(feedback.message);
      sentimentScore = sentiment === 'positive' ? 0.5 : sentiment === 'negative' ? -0.5 : 0;
      actionable = feedback.category === 'suggestion';
      priority = 'low';
      break;
  }

  // Extract key phrases (simplified)
  const keyPhrases = extractKeyPhrases(getFeedbackText(feedback));

  // Determine category
  const category = determineCategory(feedback);

  // Suggest action
  const suggestedAction = suggestAction(feedback, sentiment);

  return {
    sentiment,
    sentimentScore,
    category,
    keyPhrases,
    actionable,
    priority,
    suggestedAction,
    relatedFeatures: extractRelatedFeatures(feedback),
  };
}

function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['great', 'awesome', 'love', 'excellent', 'amazing', 'good', 'perfect', 'helpful'];
  const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'broken', 'useless', 'difficult', 'confusing'];

  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter((w) => lowerText.includes(w)).length;
  const negativeCount = negativeWords.filter((w) => lowerText.includes(w)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function extractKeyPhrases(text: string): string[] {
  // Simplified key phrase extraction
  const phrases: string[] = [];

  // Common exercise terms
  const exerciseTerms = ['squat', 'bench', 'deadlift', 'press', 'curl', 'extension', 'row'];
  exerciseTerms.forEach((term) => {
    if (text.toLowerCase().includes(term)) {
      phrases.push(term);
    }
  });

  // Common feedback terms
  const feedbackTerms = ['too hard', 'too easy', 'confusing', 'helpful', 'slow', 'fast', 'bug', 'error'];
  feedbackTerms.forEach((term) => {
    if (text.toLowerCase().includes(term)) {
      phrases.push(term);
    }
  });

  return phrases;
}

function determineCategory(feedback: UserFeedback): string {
  switch (feedback.type) {
    case 'workout_rating':
      return 'workout_experience';
    case 'exercise_difficulty':
      return feedback.painOrDiscomfort ? 'injury_prevention' : 'exercise_selection';
    case 'program_satisfaction':
      return 'program_design';
    case 'bug_report':
      return 'technical_issue';
    case 'feature_request':
      return `feature_${feedback.category}`;
    case 'general_comment':
      return 'general';
  }
}

function suggestAction(feedback: UserFeedback, sentiment: string): string | undefined {
  if (feedback.type === 'workout_rating') {
    if (feedback.difficulty === 'too_hard') {
      return 'Consider reducing volume or intensity for this user';
    }
    if (feedback.difficulty === 'too_easy') {
      return 'Consider increasing progression rate';
    }
  }

  if (feedback.type === 'exercise_feedback' && 'painOrDiscomfort' in feedback) {
    if (feedback.painOrDiscomfort) {
      return 'Immediate review: User reported pain. Suggest form check or exercise substitution.';
    }
  }

  if (feedback.type === 'bug_report') {
    return `Create ticket: ${feedback.severity} priority bug`;
  }

  if (feedback.type === 'feature_request') {
    return 'Add to product backlog for prioritization';
  }

  return undefined;
}

function extractRelatedFeatures(feedback: UserFeedback): string[] | undefined {
  const features: string[] = [];

  if (feedback.type === 'workout_rating') {
    features.push('workout_generation', 'volume_prescription');
  } else if (feedback.type === 'exercise_difficulty') {
    features.push('exercise_selection', 'progressive_overload');
  } else if (feedback.type === 'program_satisfaction') {
    features.push('periodization', 'program_structure');
  }

  return features.length > 0 ? features : undefined;
}

function getFeedbackText(feedback: UserFeedback): string {
  switch (feedback.type) {
    case 'general_comment':
      return feedback.message;
    case 'feature_request':
      return feedback.description;
    case 'bug_report':
      return feedback.description;
    default:
      return JSON.stringify(feedback);
  }
}

// ---------------------------------------------------------------------------
// Feedback Aggregation
// ---------------------------------------------------------------------------

export type FeedbackSummary = {
  totalSubmissions: number;
  byType: Record<FeedbackType, number>;
  bySentiment: { positive: number; neutral: number; negative: number };
  averageRatings: {
    workout?: number;
    exercise?: number;
    program?: number;
  };
  topIssues: string[];
  topSuggestions: string[];
  actionableItems: Array<{
    priority: string;
    description: string;
    count: number;
  }>;
  trends: Array<{
    period: string;
    sentimentScore: number;
    submissionCount: number;
  }>;
};

export function aggregateFeedback(
  filters?: {
    startDate?: string;
    endDate?: string;
    type?: FeedbackType;
    programId?: string;
  }
): FeedbackSummary {
  let filtered = [...feedbackStore];

  if (filters?.startDate) {
    filtered = filtered.filter((f) => f.timestamp >= filters.startDate!);
  }
  if (filters?.endDate) {
    filtered = filtered.filter((f) => f.timestamp <= filters.endDate!);
  }
  if (filters?.type) {
    filtered = filtered.filter((f) => f.feedback.type === filters.type);
  }
  if (filters?.programId) {
    filtered = filtered.filter((f) => {
      const fb = f.feedback;
      return 'programId' in fb && fb.programId === filters.programId;
    });
  }

  const byType: Record<string, number> = {};
  const bySentiment = { positive: 0, neutral: 0, negative: 0 };

  let workoutRatingSum = 0;
  let workoutRatingCount = 0;
  let exerciseRatingSum = 0;
  let exerciseRatingCount = 0;
  let programRatingSum = 0;
  let programRatingCount = 0;

  const issues: Record<string, number> = {};
  const suggestions: Record<string, number> = {};
  const actionableItems: Record<string, { priority: string; count: number }> = {};

  filtered.forEach((submission) => {
    const feedback = submission.feedback;
    const analysis = submission.analysis;

    // Count by type
    byType[feedback.type] = (byType[feedback.type] || 0) + 1;

    // Count by sentiment
    if (analysis) {
      bySentiment[analysis.sentiment]++;
    }

    // Aggregate ratings
    if (feedback.type === 'workout_rating') {
      workoutRatingSum += feedback.rating;
      workoutRatingCount++;
    } else if (feedback.type === 'exercise_difficulty') {
      exerciseRatingSum += feedback.difficulty;
      exerciseRatingCount++;
    } else if (feedback.type === 'program_satisfaction') {
      programRatingSum += feedback.overallRating;
      programRatingCount++;
    }

    // Collect issues and suggestions
    if (feedback.type === 'general_comment' && feedback.category === 'complaint') {
      issues[feedback.message] = (issues[feedback.message] || 0) + 1;
    }
    if (feedback.type === 'general_comment' && feedback.category === 'suggestion') {
      suggestions[feedback.message] = (suggestions[feedback.message] || 0) + 1;
    }

    // Collect actionable items
    if (analysis?.actionable && analysis.suggestedAction) {
      const key = analysis.suggestedAction;
      if (!actionableItems[key]) {
        actionableItems[key] = { priority: analysis.priority, count: 0 };
      }
      actionableItems[key].count++;
    }
  });

  // Calculate trends (simplified - by week)
  const trends: FeedbackSummary['trends'] = [];
  const weeklyData: Record<string, { sum: number; count: number }> = {};

  filtered.forEach((f) => {
    const week = f.timestamp.substring(0, 10); // YYYY-MM-DD
    if (!weeklyData[week]) {
      weeklyData[week] = { sum: 0, count: 0 };
    }
    weeklyData[week].sum += f.analysis?.sentimentScore || 0;
    weeklyData[week].count++;
  });

  Object.entries(weeklyData).forEach(([period, data]) => {
    trends.push({
      period,
      sentimentScore: data.sum / (data.count || 1),
      submissionCount: data.count,
    });
  });

  return {
    totalSubmissions: filtered.length,
    byType: byType as Record<FeedbackType, number>,
    bySentiment,
    averageRatings: {
      workout: workoutRatingCount > 0 ? workoutRatingSum / workoutRatingCount : undefined,
      exercise: exerciseRatingCount > 0 ? exerciseRatingSum / exerciseRatingCount : undefined,
      program: programRatingCount > 0 ? programRatingSum / programRatingCount : undefined,
    },
    topIssues: Object.entries(issues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue),
    topSuggestions: Object.entries(suggestions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([suggestion]) => suggestion),
    actionableItems: Object.entries(actionableItems)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
      })
      .map(([description, data]) => ({
        priority: data.priority,
        description,
        count: data.count,
      })),
    trends: trends.sort((a, b) => a.period.localeCompare(b.period)),
  };
}

// ---------------------------------------------------------------------------
// Program-Specific Feedback
// ---------------------------------------------------------------------------

export type ProgramFeedbackSummary = {
  programId: string;
  totalResponses: number;
  averageWorkoutRating: number;
  completionRate: number;
  topComplaints: string[];
  topPraises: string[];
  exerciseRatings: Record<string, { average: number; count: number }>;
  weekByWeekSatisfaction: Array<{ week: number; rating: number; responses: number }>;
};

export function getProgramFeedbackSummary(programId: string): ProgramFeedbackSummary {
  const programFeedback = feedbackStore.filter((f) => {
    const fb = f.feedback;
    return 'programId' in fb && fb.programId === programId;
  });

  const workoutFeedbacks = programFeedback
    .filter((f) => f.feedback.type === 'workout_rating')
    .map((f) => f.feedback as WorkoutFeedback);

  const exerciseFeedbacks = programFeedback
    .filter((f) => f.feedback.type === 'exercise_difficulty')
    .map((f) => f.feedback as ExerciseFeedback);

  // Calculate average workout rating
  const ratingSum = workoutFeedbacks.reduce((sum, f) => sum + f.rating, 0);
  const averageWorkoutRating = workoutFeedbacks.length > 0 ? ratingSum / workoutFeedbacks.length : 0;

  // Calculate completion rate
  const completedWorkouts = workoutFeedbacks.filter((f) => f.completion === 'all_sets').length;
  const completionRate = workoutFeedbacks.length > 0 ? (completedWorkouts / workoutFeedbacks.length) * 100 : 0;

  // Aggregate exercise ratings
  const exerciseRatings: ProgramFeedbackSummary['exerciseRatings'] = {};
  exerciseFeedbacks.forEach((f) => {
    if (!exerciseRatings[f.exerciseName]) {
      exerciseRatings[f.exerciseName] = { average: 0, count: 0 };
    }
    exerciseRatings[f.exerciseName].average += f.difficulty;
    exerciseRatings[f.exerciseName].count++;
  });

  Object.keys(exerciseRatings).forEach((name) => {
    exerciseRatings[name].average /= exerciseRatings[name].count;
  });

  // Week by week satisfaction
  const weekRatings: Record<number, { sum: number; count: number }> = {};
  workoutFeedbacks.forEach((f) => {
    if (!weekRatings[f.weekNumber]) {
      weekRatings[f.weekNumber] = { sum: 0, count: 0 };
    }
    weekRatings[f.weekNumber].sum += f.rating;
    weekRatings[f.weekNumber].count++;
  });

  const weekByWeekSatisfaction = Object.entries(weekRatings)
    .map(([week, data]) => ({
      week: parseInt(week),
      rating: data.sum / data.count,
      responses: data.count,
    }))
    .sort((a, b) => a.week - b.week);

  // Get complaints and praises
  const generalComments = programFeedback
    .filter((f) => f.feedback.type === 'general_comment')
    .map((f) => f.feedback as GeneralComment);

  const complaints = generalComments
    .filter((c) => c.category === 'complaint')
    .map((c) => c.message);

  const praises = generalComments
    .filter((c) => c.category === 'praise')
    .map((c) => c.message);

  return {
    programId,
    totalResponses: programFeedback.length,
    averageWorkoutRating,
    completionRate,
    topComplaints: complaints.slice(0, 5),
    topPraises: praises.slice(0, 5),
    exerciseRatings,
    weekByWeekSatisfaction,
  };
}

// ---------------------------------------------------------------------------
// Quick Feedback Forms
// ---------------------------------------------------------------------------

export function createQuickWorkoutFeedback(
  programId: string,
  weekNumber: number,
  dayNumber: number,
  rating: 1 | 2 | 3 | 4 | 5
): Omit<WorkoutFeedback, 'type'> {
  return {
    programId,
    weekNumber,
    dayNumber,
    rating,
    difficulty: 'just_right',
    duration: 'just_right',
    energyLevel: 'moderate',
    completion: 'all_sets',
  };
}

export function createNPSFeedback(
  programId: string,
  score: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
): Omit<ProgramSatisfactionFeedback, 'type'> {
  return {
    programId,
    overallRating: score <= 6 ? 2 : score <= 8 ? 3 : 5,
    wouldRecommend: score >= 9,
    likelihoodToContinue: score >= 9 ? 'very_likely' : score >= 7 ? 'likely' : score >= 5 ? 'neutral' : 'unlikely',
  };
}

// ---------------------------------------------------------------------------
// Export Feedback Functions
// ---------------------------------------------------------------------------

export const FeedbackSystem = {
  submit: submitFeedback,
  analyze: analyzeFeedback,
  aggregate: aggregateFeedback,
  getProgramSummary: getProgramFeedbackSummary,
  createQuickWorkoutFeedback,
  createNPSFeedback,
  // For testing
  getAllFeedback: () => feedbackStore,
  clearFeedback: () => feedbackStore.splice(0, feedbackStore.length),
};
