/**
 * AI Coach Service
 *
 * Handles:
 * - Chat history and rate limiting
 * - Typed attachment parsing
 * - Persistent coach memory CRUD
 * - Dashboard/intervention aggregation
 * - Suggested prompts and consistency/prep summaries
 */

import { supabase } from '../lib/supabase';
import type { Database, Json } from '../lib/supabase/types';
import { buildAICoachDashboardState, type AICoachDashboardBuildInput } from '../lib/ai-coach/dashboard-state';
import { getNutritionTodaySnapshot, type NutritionTodaySnapshot } from './nutritionDashboardService';
import { getActiveWorkoutPlan } from './planService';
import { getWorkoutAdaptationRecommendations } from './workoutAdaptationService';
import { checkEntitlementStatus, getFeatureLimit } from './subscriptionService';
import { type SubscriptionTier } from '../lib/subscription/plans';
import { invokeFunction } from '../lib/supabase/invokeFunction';
import { captureSentryIssue } from '../lib/sentry';

// ============================================================================
// Types
// ============================================================================

export type ChatMessage = Database['public']['Tables']['ai_coach_messages']['Row'];
export type AIUsageDaily = Database['public']['Tables']['ai_usage_daily']['Row'];

export interface RateLimitStatus {
  canSendMessage: boolean;
  messagesUsed: number;
  messagesLimit: number; // -1 for unlimited
  resetTime: string; // ISO timestamp of when limit resets
  tier?: SubscriptionTier;
}

export interface CoachContext {
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  waterTarget: number;
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  waterConsumed: number;
  workoutsThisWeek: number;
  currentGoal: string;
  prepModeEnabled?: boolean;
  prepPhase?: 'cut' | 'bulk' | null;
  prepDiscipline?: 'bodybuilding' | 'powerlifting' | null;
}

export interface SuggestedPrompt {
  id: string;
  label: string;
  icon: string;
}

export interface ConsistencyRecommendation {
  type?: string;
  title?: string;
  message?: string;
  actions?: string[];
}

export interface PrepPromptContext {
  prepModeEnabled?: boolean;
  prepPhase?: 'cut' | 'bulk' | null;
  prepDiscipline?: 'bodybuilding' | 'powerlifting' | null;
}

export interface PrepCoachSummary {
  enabled: boolean;
  discipline: 'bodybuilding' | 'powerlifting' | null;
  phase: 'cut' | 'bulk' | null;
  lastStatus: string | null;
  coachSummary: string | null;
  lastUpdatedAt: string | null;
}

export type AICoachIntentMode =
  | 'general_qa'
  | 'coaching_qa'
  | 'app_read'
  | 'app_mutation'
  | 'memory_update'
  | 'web_freshness_needed'
  | 'unsafe_or_restricted';

export interface AICoachIntentClassification {
  mode: AICoachIntentMode;
  confidence: number;
  requiresWeb: boolean;
  requiresApproval: boolean;
  requiresClarification: boolean;
}

export type AICoachRiskLevel = 'low' | 'medium' | 'high';
export type AICoachMutationLevel = 'none' | 'low' | 'medium' | 'high';
export type AICoachProposalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'
  | 'expired';

export type AICoachMemoryType =
  | 'goal'
  | 'constraint'
  | 'preference'
  | 'commitment'
  | 'summary'
  | 'intervention';

export type AICoachMemoryStatus = 'active' | 'resolved' | 'dismissed';

export interface AICoachMemoryItem {
  id: string;
  userId: string;
  sourceMessageId: string | null;
  threadId: string | null;
  proposalId: string | null;
  memoryType: AICoachMemoryType;
  title: string;
  body: string;
  status: AICoachMemoryStatus;
  priority: number;
  metadataJson: Record<string, unknown> | null;
  originType: 'derived' | 'conversation' | 'tool' | 'profile';
  scope: 'global' | 'nutrition' | 'workout' | 'settings' | 'conversation';
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  isDerived?: boolean;
}

export interface AICoachNavigateActionAttachment {
  type: 'navigate_action';
  label: string;
  route: string;
}

export interface AICoachWorkoutRecommendationAttachment {
  type: 'workout_recommendation';
  recommendationId: string;
  recommendationType: string;
  title: string;
  summary: string;
  rationale?: string | null;
  impactSummary?: string | null;
}

export interface AICoachNutritionPlanBatchChangeAttachment {
  type: 'nutrition_plan_batch_change';
  title: string;
  summary: string;
  planId?: string;
  dayOfWeek: number;
  meals: {
    meal_slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    name: string;
    description?: string;
    target_calories?: number;
    target_protein?: number;
    target_carbs?: number;
    target_fat?: number;
    prep_time_min?: number;
    items?: {
      food_item_id?: string | null;
      item_name?: string;
      quantity_value?: number;
      quantity_unit?: string;
      grams?: number;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
    }[];
  }[];
  rationale?: string | null;
  impactSummary?: string | null;
}

export interface AICoachPrepAdjustmentSummaryAttachment {
  type: 'prep_adjustment_summary';
  eventId?: string | null;
  title: string;
  summary: string;
  status?: string | null;
  coachSummary?: string | null;
  canRevert?: boolean;
}

export interface AICoachMemoryAttachment {
  type: 'memory_item';
  memoryType: AICoachMemoryType;
  title: string;
  body: string;
  priority?: number;
}

export interface AICoachFollowUpPromptAttachment {
  type: 'follow_up_prompt';
  label: string;
  prompt: string;
}

interface AICoachActionProposalPayload {
  proposalId: string;
  title: string;
  summary: string;
  riskLevel: AICoachRiskLevel;
  toolName: string;
  toolInputPreview?: Record<string, unknown> | null;
  approveLabel?: string;
  rejectLabel?: string;
  canAutoApply?: boolean;
  receiptPreview?: string | null;
  rationale?: string | null;
  affectedArea?: string | null;
  status?: AICoachProposalStatus;
}

export interface AICoachActionProposalAttachment extends AICoachActionProposalPayload {
  type: 'action_proposal';
}

export interface AICoachSettingsChangeProposalAttachment extends AICoachActionProposalPayload {
  type: 'settings_change_proposal';
}

export interface AICoachLogActionProposalAttachment extends AICoachActionProposalPayload {
  type: 'log_action_proposal';
}

export interface AICoachToolReceiptAttachment {
  type: 'tool_receipt';
  receiptId: string;
  toolName: string;
  title: string;
  summary: string;
  mutationLevel: AICoachMutationLevel;
  createdAt?: string;
  metadata?: Record<string, unknown> | null;
}

export interface AICoachClarificationPromptAttachment {
  type: 'clarification_prompt';
  title: string;
  prompt: string;
  options?: {
    label: string;
    prompt: string;
  }[];
}

export interface AICoachWebResultSummaryAttachment {
  type: 'web_result_summary';
  title: string;
  summary: string;
  query?: string | null;
  sources?: {
    title: string;
    url: string;
  }[];
}

export interface AICoachStatusReceiptAttachment {
  type: 'status_receipt';
  kind: 'nutrition' | 'workout' | 'prep' | 'navigation' | 'system';
  title: string;
  summary: string;
  appliedAt?: string;
  metadata?: Record<string, unknown> | null;
}

export interface AICoachContextNoteAttachment {
  type: 'context_note';
  label: string;
  value: string;
  source?: string | null;
}

export interface AICoachConversationTitleHintAttachment {
  type: 'conversation_title_hint';
  title: string;
}

export type AICoachAttachment =
  | AICoachNavigateActionAttachment
  | AICoachWorkoutRecommendationAttachment
  | AICoachNutritionPlanBatchChangeAttachment
  | AICoachPrepAdjustmentSummaryAttachment
  | AICoachMemoryAttachment
  | AICoachFollowUpPromptAttachment
  | AICoachActionProposalAttachment
  | AICoachSettingsChangeProposalAttachment
  | AICoachLogActionProposalAttachment
  | AICoachToolReceiptAttachment
  | AICoachClarificationPromptAttachment
  | AICoachWebResultSummaryAttachment
  | AICoachStatusReceiptAttachment
  | AICoachContextNoteAttachment
  | AICoachConversationTitleHintAttachment;

export type AICoachInterventionKind = 'workout' | 'nutrition' | 'prep' | 'navigate' | 'memory';

export interface AICoachIntervention {
  id: string;
  sourceMessageId?: string | null;
  kind: AICoachInterventionKind;
  priority: number;
  title: string;
  summary: string;
  statusLabel: string;
  reviewLabel: string;
  applyLabel?: string;
  rejectLabel?: string;
  route?: string;
  recommendationId?: string;
  recommendationType?: string;
  batchChange?: AICoachNutritionPlanBatchChangeAttachment;
  prepEventId?: string | null;
  canApply: boolean;
  canReject: boolean;
  memoryDraft?: Pick<AICoachMemoryItem, 'memoryType' | 'title' | 'body' | 'priority'>;
  attachment?: AICoachAttachment;
}

export type AICoachQueueItem = AICoachIntervention;

export interface AICoachAction {
  type: 'open_brief' | 'open_actions' | 'open_memory' | 'review_intervention' | 'send_prompt';
  label: string;
  interventionId?: string;
  prompt?: string;
}

export interface AICoachBriefDetail {
  label: string;
  value: string;
}

export interface AICoachDashboardState {
  status: 'on_track' | 'watch' | 'recovery' | 'behind' | 'prep_active';
  statusLabel: string;
  headline: string;
  summary: string;
  primaryAction: AICoachAction | null;
  secondaryAction: AICoachAction | null;
  queueItems: AICoachQueueItem[];
  briefDetails: AICoachBriefDetail[];
  recommendations: string[];
  memoryPreview: AICoachMemoryItem[];
  context: {
    caloriesRemaining: number;
    proteinRemaining: number;
    hydrationPercent: number;
    workoutsThisWeek: number;
    nextMealLabel: string | null;
  };
  nutritionSnapshot: NutritionTodaySnapshot | null;
  usage: RateLimitStatus | null;
}

export interface AICoachConversationMessage extends ChatMessage {
  parsedAttachments: AICoachAttachment[];
}

export interface AICoachConversationSummary {
  id: string;
  title: string;
  lastMessagePreview: string;
  updatedAt: string;
  messageCount: number;
}

export interface AICoachStatusStripState {
  label: string;
  summary: string;
  cta: AICoachAction | null;
  severity: AICoachDashboardState['status'];
  source: string;
}

export interface AICoachReceipt {
  id: string;
  kind: 'nutrition' | 'workout' | 'prep' | 'navigation' | 'system';
  title: string;
  summary: string;
  appliedAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface AICoachActionProposal {
  id: string;
  title: string;
  summary: string;
  riskLevel: AICoachRiskLevel;
  toolName: string;
  toolInputPreview: Record<string, unknown> | null;
  approveLabel: string;
  rejectLabel: string;
  canAutoApply: boolean;
  receiptPreview?: string | null;
  rationale?: string | null;
  affectedArea?: string | null;
  status: AICoachProposalStatus;
  sourceMessageId?: string | null;
}

export interface AICoachToolReceipt {
  id: string;
  toolName: string;
  title: string;
  summary: string;
  mutationLevel: AICoachMutationLevel;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface AICoachAssistantCapabilities {
  canUseWeb: boolean;
  canAutoApplyLowRiskActions: boolean;
  canModifyLogs: boolean;
  canModifyPlans: boolean;
  canModifySettings: boolean;
  canStoreMemory: boolean;
}

export interface AICoachLowRiskActionInput {
  userId: string;
  message: string;
  threadId?: string;
  contextMode?: 'auto' | 'minimal' | 'full';
}

export interface AICoachSettingUpdateInput {
  userId: string;
  threadId?: string;
  setting: 'unit_system';
  value: 'imperial' | 'metric';
}

export interface AICoachWebSearchInput {
  userId: string;
  query: string;
  threadId?: string;
  contextMode?: 'auto' | 'minimal' | 'full';
}

export type AICoachThreadItem =
  | {
      id: string;
      type: 'message';
      message: AICoachConversationMessage;
      actions: (AICoachNavigateActionAttachment | AICoachFollowUpPromptAttachment)[];
    }
  | {
      id: string;
      type: 'intervention_card';
      intervention: AICoachIntervention;
    }
  | {
      id: string;
      type: 'memory_callout';
      attachment: AICoachMemoryAttachment;
      sourceMessageId?: string | null;
    }
  | {
      id: string;
      type: 'action_proposal';
      proposal: AICoachActionProposal;
    }
  | {
      id: string;
      type: 'tool_receipt';
      receipt: AICoachToolReceipt;
    }
  | {
      id: string;
      type: 'clarification_prompt';
      attachment: AICoachClarificationPromptAttachment;
    }
  | {
      id: string;
      type: 'web_result_summary';
      attachment: AICoachWebResultSummaryAttachment;
    }
  | {
      id: string;
      type: 'status_receipt';
      receipt: AICoachReceipt;
    }
  | {
      id: string;
      type: 'context_note';
      attachment: AICoachContextNoteAttachment;
    }
  | {
      id: string;
      type: 'error_state';
      title: string;
      message: string;
      retryLabel?: string;
    }
  | {
      id: string;
      type: 'prompt_group';
      prompts: SuggestedPrompt[];
    };

export interface CreateAICoachMemoryItemInput {
  userId: string;
  sourceMessageId?: string | null;
  threadId?: string | null;
  proposalId?: string | null;
  memoryType: AICoachMemoryType;
  title: string;
  body: string;
  status?: AICoachMemoryStatus;
  priority?: number;
  metadataJson?: Record<string, unknown> | null;
  originType?: AICoachMemoryItem['originType'];
  scope?: AICoachMemoryItem['scope'];
}

// ============================================================================
// Utilities
// ============================================================================

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function conversationBucketId(input: string) {
  const date = new Date(input);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function conversationBucketLabel(bucketId: string) {
  const date = new Date(`${bucketId}T12:00:00`);
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function threadTitleFromMessages(bucketId: string, messages: ChatMessage[]) {
  const firstUser = messages.find((message) => message.role === 'user' && message.content.trim().length > 0);
  if (!firstUser) {
    return `Coach chat · ${conversationBucketLabel(bucketId)}`;
  }

  const normalized = firstUser.content.replace(/\s+/g, ' ').trim();
  return normalized.length > 42 ? `${normalized.slice(0, 42).trimEnd()}...` : normalized;
}

function lastPreviewFromMessages(messages: ChatMessage[]) {
  const last = messages[messages.length - 1];
  if (!last) return 'No conversation yet';
  const normalized = last.content.replace(/\s+/g, ' ').trim();
  return normalized.length > 84 ? `${normalized.slice(0, 84).trimEnd()}...` : normalized;
}

function mapMemoryRow(row: any): AICoachMemoryItem {
  return {
    id: row.id,
    userId: row.user_id,
    sourceMessageId: row.source_message_id || null,
    threadId: row.thread_id || null,
    proposalId: row.proposal_id || null,
    memoryType: row.memory_type,
    title: row.title,
    body: row.body,
    status: row.status,
    priority: Number(row.priority || 50),
    metadataJson: toRecord(row.metadata_json),
    originType: (row.origin_type || 'conversation') as AICoachMemoryItem['originType'],
    scope: (row.scope || 'conversation') as AICoachMemoryItem['scope'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at || null,
  };
}

function normalizePromptLabel(raw: string) {
  return raw.length > 54 ? `${raw.slice(0, 51).trim()}...` : raw;
}

// ============================================================================
// Attachment parsing
// ============================================================================

export function parseAICoachAttachments(raw: Json | null | undefined): AICoachAttachment[] {
  if (!Array.isArray(raw)) return [];

  return raw.reduce<AICoachAttachment[]>((acc, entry) => {
    const item = toRecord(entry);
    if (!item) return acc;

    const type = typeof item.type === 'string' ? item.type : null;

    if (type === 'navigate_action' || type === 'navigate') {
      const label = toStringOrNull(item.label);
      const route = toStringOrNull(item.route);
      if (!label || !route) return acc;
      acc.push({ type: 'navigate_action', label, route });
      return acc;
    }

    if (type === 'workout_recommendation') {
      const recommendationId = toStringOrNull(item.recommendationId || item.recommendation_id);
      const recommendationType = toStringOrNull(item.recommendationType || item.recommendation_type);
      const title = toStringOrNull(item.title);
      const summary = toStringOrNull(item.summary);
      if (!recommendationId || !recommendationType || !title || !summary) return acc;
      acc.push({
        type: 'workout_recommendation',
        recommendationId,
        recommendationType,
        title,
        summary,
        rationale: toStringOrNull(item.rationale),
        impactSummary: toStringOrNull(item.impactSummary || item.impact_summary),
      });
      return acc;
    }

    if (type === 'nutrition_plan_batch_change') {
      const title = toStringOrNull(item.title);
      const summary = toStringOrNull(item.summary);
      const meals = Array.isArray(item.meals) ? item.meals : [];
      const dayOfWeek = Number(item.dayOfWeek ?? item.day_of_week);
      if (!title || !summary || !Number.isInteger(dayOfWeek) || meals.length === 0) return acc;
      acc.push({
        type: 'nutrition_plan_batch_change',
        title,
        summary,
        planId: toStringOrNull(item.planId || item.plan_id) || undefined,
        dayOfWeek,
        meals: meals as AICoachNutritionPlanBatchChangeAttachment['meals'],
        rationale: toStringOrNull(item.rationale),
        impactSummary: toStringOrNull(item.impactSummary || item.impact_summary),
      });
      return acc;
    }

    if (type === 'prep_adjustment_summary') {
      const title = toStringOrNull(item.title);
      const summary = toStringOrNull(item.summary);
      if (!title || !summary) return acc;
      acc.push({
        type: 'prep_adjustment_summary',
        eventId: toStringOrNull(item.eventId || item.event_id),
        title,
        summary,
        status: toStringOrNull(item.status),
        coachSummary: toStringOrNull(item.coachSummary || item.coach_summary),
        canRevert: item.canRevert === true || item.can_revert === true,
      });
      return acc;
    }

    if (type === 'memory_item') {
      const title = toStringOrNull(item.title);
      const body = toStringOrNull(item.body);
      const memoryType = toStringOrNull(item.memoryType || item.memory_type) as AICoachMemoryType | null;
      if (!title || !body || !memoryType) return acc;
      acc.push({
        type: 'memory_item',
        memoryType,
        title,
        body,
        priority: Number(item.priority || 50),
      });
      return acc;
    }

    if (type === 'follow_up_prompt') {
      const prompt = toStringOrNull(item.prompt);
      if (!prompt) return acc;
      acc.push({
        type: 'follow_up_prompt',
        label: toStringOrNull(item.label) || normalizePromptLabel(prompt),
        prompt,
      });
      return acc;
    }

    if (type === 'action_proposal' || type === 'settings_change_proposal' || type === 'log_action_proposal') {
      const proposalId = toStringOrNull(item.proposalId || item.proposal_id);
      const title = toStringOrNull(item.title);
      const summary = toStringOrNull(item.summary);
      const riskLevel = toStringOrNull(item.riskLevel || item.risk_level) as AICoachRiskLevel | null;
      const toolName = toStringOrNull(item.toolName || item.tool_name);
      if (!proposalId || !title || !summary || !riskLevel || !toolName) return acc;

      const base = {
        proposalId,
        title,
        summary,
        riskLevel,
        toolName,
        toolInputPreview: toRecord(item.toolInputPreview || item.tool_input_preview),
        approveLabel: toStringOrNull(item.approveLabel || item.approve_label) || undefined,
        rejectLabel: toStringOrNull(item.rejectLabel || item.reject_label) || undefined,
        canAutoApply: item.canAutoApply === true || item.can_auto_apply === true,
        receiptPreview: toStringOrNull(item.receiptPreview || item.receipt_preview),
        rationale: toStringOrNull(item.rationale),
        affectedArea: toStringOrNull(item.affectedArea || item.affected_area),
        status: (toStringOrNull(item.status) as AICoachProposalStatus | null) || 'pending',
      };

      if (type === 'settings_change_proposal') {
        acc.push({ type, ...base });
        return acc;
      }

      if (type === 'log_action_proposal') {
        acc.push({ type, ...base });
        return acc;
      }

      acc.push({ type: 'action_proposal', ...base });
      return acc;
    }

    if (type === 'tool_receipt') {
      const receiptId = toStringOrNull(item.receiptId || item.receipt_id);
      const toolName = toStringOrNull(item.toolName || item.tool_name);
      const title = toStringOrNull(item.title);
      const summary = toStringOrNull(item.summary);
      const mutationLevel = toStringOrNull(item.mutationLevel || item.mutation_level) as AICoachMutationLevel | null;
      if (!receiptId || !toolName || !title || !summary || !mutationLevel) return acc;
      acc.push({
        type: 'tool_receipt',
        receiptId,
        toolName,
        title,
        summary,
        mutationLevel,
        createdAt: toStringOrNull(item.createdAt || item.created_at) || undefined,
        metadata: toRecord(item.metadata),
      });
      return acc;
    }

    if (type === 'clarification_prompt') {
      const title = toStringOrNull(item.title);
      const prompt = toStringOrNull(item.prompt);
      if (!title || !prompt) return acc;
      acc.push({
        type: 'clarification_prompt',
        title,
        prompt,
        options: Array.isArray(item.options)
          ? item.options
              .map((option) => {
                const record = toRecord(option);
                if (!record) return null;
                const label = toStringOrNull(record.label);
                const nestedPrompt = toStringOrNull(record.prompt);
                if (!label || !nestedPrompt) return null;
                return { label, prompt: nestedPrompt };
              })
              .filter(Boolean) as AICoachClarificationPromptAttachment['options']
          : undefined,
      });
      return acc;
    }

    if (type === 'web_result_summary') {
      const title = toStringOrNull(item.title);
      const summary = toStringOrNull(item.summary);
      if (!title || !summary) return acc;
      acc.push({
        type: 'web_result_summary',
        title,
        summary,
        query: toStringOrNull(item.query),
        sources: Array.isArray(item.sources)
          ? item.sources
              .map((source) => {
                const record = toRecord(source);
                if (!record) return null;
                const sourceTitle = toStringOrNull(record.title);
                const url = toStringOrNull(record.url);
                if (!sourceTitle || !url) return null;
                return { title: sourceTitle, url };
              })
              .filter(Boolean) as AICoachWebResultSummaryAttachment['sources']
          : undefined,
      });
      return acc;
    }

    if (type === 'status_receipt') {
      const title = toStringOrNull(item.title);
      const summary = toStringOrNull(item.summary);
      const kind = toStringOrNull(item.kind) as AICoachStatusReceiptAttachment['kind'] | null;
      if (!title || !summary || !kind) return acc;
      acc.push({
        type: 'status_receipt',
        kind,
        title,
        summary,
        appliedAt: toStringOrNull(item.appliedAt || item.applied_at) || undefined,
        metadata: toRecord(item.metadata) || null,
      });
      return acc;
    }

    if (type === 'context_note') {
      const label = toStringOrNull(item.label);
      const value = toStringOrNull(item.value);
      if (!label || !value) return acc;
      acc.push({
        type: 'context_note',
        label,
        value,
        source: toStringOrNull(item.source),
      });
      return acc;
    }

    if (type === 'conversation_title_hint') {
      const title = toStringOrNull(item.title);
      if (!title) return acc;
      acc.push({
        type: 'conversation_title_hint',
        title,
      });
      return acc;
    }

    return acc;
  }, []);
}

export function withParsedAttachments(message: ChatMessage): AICoachConversationMessage {
  return {
    ...message,
    parsedAttachments: parseAICoachAttachments(message.attachments),
  };
}

function attachmentToIntervention(
  attachment: AICoachAttachment,
  sourceMessageId?: string | null,
): AICoachIntervention | null {
  if (attachment.type === 'workout_recommendation') {
    return {
      id: `msg-workout-${sourceMessageId || attachment.recommendationId}`,
      sourceMessageId,
      kind: 'workout',
      priority: 100,
      title: attachment.title,
      summary: attachment.summary,
      statusLabel: 'Pending',
      reviewLabel: 'Review workout change',
      applyLabel: 'Apply change',
      rejectLabel: 'Reject',
      recommendationId: attachment.recommendationId,
      recommendationType: attachment.recommendationType,
      canApply: true,
      canReject: true,
      memoryDraft: {
        memoryType: 'intervention',
        title: attachment.title,
        body: attachment.summary,
        priority: 90,
      },
      attachment,
    };
  }

  if (attachment.type === 'nutrition_plan_batch_change') {
    return {
      id: `msg-nutrition-${sourceMessageId || attachment.title}`,
      sourceMessageId,
      kind: 'nutrition',
      priority: 90,
      title: attachment.title,
      summary: attachment.summary,
      statusLabel: 'Ready',
      reviewLabel: 'Review meal adjustment',
      applyLabel: 'Apply meal change',
      rejectLabel: 'Dismiss',
      batchChange: attachment,
      canApply: true,
      canReject: true,
      memoryDraft: {
        memoryType: 'intervention',
        title: attachment.title,
        body: attachment.summary,
        priority: 80,
      },
      attachment,
    };
  }

  if (attachment.type === 'prep_adjustment_summary') {
    return {
      id: `msg-prep-${sourceMessageId || attachment.eventId || attachment.title}`,
      sourceMessageId,
      kind: 'prep',
      priority: 80,
      title: attachment.title,
      summary: attachment.summary,
      statusLabel: attachment.status || 'Prep',
      reviewLabel: 'Review prep context',
      applyLabel: attachment.canRevert ? 'Revert adjustment' : undefined,
      rejectLabel: undefined,
      prepEventId: attachment.eventId,
      canApply: !!attachment.canRevert,
      canReject: false,
      memoryDraft: {
        memoryType: 'summary',
        title: attachment.title,
        body: attachment.summary,
        priority: 70,
      },
      attachment,
    };
  }

  if (attachment.type === 'navigate_action') {
    return {
      id: `msg-nav-${sourceMessageId || attachment.route}`,
      sourceMessageId,
      kind: 'navigate',
      priority: 40,
      title: attachment.label,
      summary: 'Jump directly to the relevant in-app flow.',
      statusLabel: 'Action',
      reviewLabel: 'Open',
      route: attachment.route,
      canApply: true,
      canReject: false,
      attachment,
    };
  }

  return null;
}

function attachmentToActionProposal(
  attachment: AICoachAttachment,
  sourceMessageId?: string | null,
): AICoachActionProposal | null {
  if (
    attachment.type !== 'action_proposal'
    && attachment.type !== 'settings_change_proposal'
    && attachment.type !== 'log_action_proposal'
  ) {
    return null;
  }

  return {
    id: attachment.proposalId,
    title: attachment.title,
    summary: attachment.summary,
    riskLevel: attachment.riskLevel,
    toolName: attachment.toolName,
    toolInputPreview: attachment.toolInputPreview || null,
    approveLabel: attachment.approveLabel || (attachment.canAutoApply ? 'Apply now' : 'Approve'),
    rejectLabel: attachment.rejectLabel || 'Not now',
    canAutoApply: attachment.canAutoApply === true,
    receiptPreview: attachment.receiptPreview || null,
    rationale: attachment.rationale || null,
    affectedArea: attachment.affectedArea || null,
    status: attachment.status || 'pending',
    sourceMessageId,
  };
}

// ============================================================================
// Message Management
// ============================================================================

export async function getConversationHistory(
  userId: string,
  limit = 50,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_coach_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

function mapChatMessageRow(row: any): ChatMessage {
  return {
    id: row.id,
    user_id: row.user_id,
    thread_id: row.thread_id || null,
    role: row.role,
    content: row.content,
    context_snapshot: row.context_snapshot ?? null,
    attachments: row.attachments ?? null,
    tokens_input: row.tokens_input ?? null,
    tokens_output: row.tokens_output ?? null,
    model: row.model ?? null,
    intent_mode: row.intent_mode ?? null,
    intent_confidence: row.intent_confidence ?? null,
    tool_calls_json: row.tool_calls_json ?? null,
    web_used: row.web_used ?? false,
    approval_required: row.approval_required ?? false,
    proposal_id: row.proposal_id ?? null,
    receipt_id: row.receipt_id ?? null,
    created_at: row.created_at,
  } as ChatMessage;
}

interface AICoachMessageFunctionResponse {
  id?: string | null;
  user_id?: string | null;
  thread_id?: string | null;
  role?: ChatMessage['role'] | null;
  content?: string | null;
  context_snapshot?: Json | null;
  attachments?: Json | null;
  tokens_input?: number | null;
  tokens_output?: number | null;
  model?: string | null;
  intent_mode?: string | null;
  intent_confidence?: number | null;
  intent_classification?: {
    mode?: string | null;
    confidence?: number | null;
    requiresApproval?: boolean | null;
  } | null;
  tool_calls?: Json | null;
  tool_calls_json?: Json | null;
  web_used?: boolean | null;
  approval_required?: boolean | null;
  proposal_id?: string | null;
  receipt_id?: string | null;
  action_proposals?: { id?: string | null }[] | null;
  tool_receipts?: { id?: string | null }[] | null;
  created_at?: string | null;
}

export async function getConversationThreads(
  userId: string,
  limit = 200,
): Promise<AICoachConversationSummary[]> {
  const { data: threads, error } = await (supabase as any)
    .from('ai_coach_threads')
    .select('*')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (!error && Array.isArray(threads)) {
    const { data: messageRows } = await (supabase as any)
      .from('ai_coach_messages')
      .select('thread_id')
      .eq('user_id', userId)
      .not('thread_id', 'is', null);

    const counts = new Map<string, number>();
    for (const row of messageRows || []) {
      if (!row.thread_id) continue;
      counts.set(row.thread_id, (counts.get(row.thread_id) || 0) + 1);
    }

    return threads.map((thread: any) => ({
      id: thread.id,
      title: thread.title,
      lastMessagePreview: thread.last_message_preview || 'No conversation yet',
      updatedAt: thread.updated_at,
      messageCount: counts.get(thread.id) || 0,
    }));
  }

  const messages = await getConversationHistory(userId, limit);
  const groups = new Map<string, ChatMessage[]>();

  for (const message of messages) {
    const bucket = conversationBucketId(message.created_at);
    const existing = groups.get(bucket) || [];
    existing.push(message);
    groups.set(bucket, existing);
  }

  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([bucket, bucketMessages]) => ({
      id: bucket,
      title: threadTitleFromMessages(bucket, bucketMessages),
      lastMessagePreview: lastPreviewFromMessages(bucketMessages),
      updatedAt: bucketMessages[bucketMessages.length - 1]?.created_at || `${bucket}T00:00:00.000Z`,
      messageCount: bucketMessages.length,
    }));
}

export async function getParsedConversationHistory(
  userId: string,
  limit = 50,
): Promise<AICoachConversationMessage[]> {
  const messages = await getConversationHistory(userId, limit);
  return messages.map(withParsedAttachments);
}

export async function getConversationThreadMessages(
  userId: string,
  threadId?: string,
  limit = 200,
): Promise<AICoachConversationMessage[]> {
  const targetThreadId = threadId || (await getConversationThreads(userId, 1))[0]?.id;
  const canQueryThreadTable = !!targetThreadId && /^[0-9a-f-]{36}$/i.test(targetThreadId);

  if (canQueryThreadTable) {
    const { data, error } = await (supabase as any)
      .from('ai_coach_messages')
      .select('*')
      .eq('user_id', userId)
      .eq('thread_id', targetThreadId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (!error) {
      return (data || []).map((row: any) => withParsedAttachments(mapChatMessageRow(row)));
    }
  }

  const messages = await getParsedConversationHistory(userId, limit);
  if (!threadId) return messages;
  return messages.filter((message) => conversationBucketId(message.created_at) === threadId);
}

export async function sendMessage(
  userId: string,
  message: string,
  options?: {
    threadId?: string;
    contextMode?: 'auto' | 'minimal' | 'full';
    context?: Partial<CoachContext>;
    allowWeb?: boolean;
    allowActions?: boolean;
    allowAutoApply?: boolean;
  },
): Promise<ChatMessage> {
  const rateLimitStatus = await checkRateLimit(userId);
  if (!rateLimitStatus.canSendMessage) {
    throw new Error(
      `Daily message limit reached (${rateLimitStatus.messagesLimit}). Upgrade to ${rateLimitStatus.tier === 'premium' ? 'Elite' : 'Premium'} for ${rateLimitStatus.tier === 'premium' ? 'unlimited messages' : 'more coaching access'}.`,
    );
  }

  const ensureFreshSession = async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw new Error(sessionError.message || 'Unable to read current session');
    }

    const currentSession = sessionData.session;
    if (!currentSession) {
      throw new Error('No active session. Please sign in again.');
    }

    const expiresSoon = !!currentSession.expires_at && currentSession.expires_at * 1000 <= Date.now() + 60_000;
    if (!expiresSoon) {
      return currentSession;
    }

    const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: currentSession.refresh_token,
    });

    if (refreshError || !refreshedData.session) {
      throw new Error(refreshError?.message || 'Session expired. Please sign in again.');
    }

    return refreshedData.session;
  };

  const invokeCoachMessage = () =>
    invokeFunction<AICoachMessageFunctionResponse>(() =>
      supabase.functions.invoke<AICoachMessageFunctionResponse>('ai-coach-message', {
        body: {
          user_id: userId,
          message,
          context: options?.context,
          thread_id: options?.threadId,
          context_mode: options?.contextMode,
          allow_web: options?.allowWeb ?? true,
          allow_actions: options?.allowActions ?? true,
          allow_auto_apply: options?.allowAutoApply ?? true,
        },
      })
    );

  await ensureFreshSession();

  let { data, parsedError, rawError } = await invokeCoachMessage();

  if (rawError?.message?.includes('non-2xx') || rawError?.context?.status === 401) {
    await ensureFreshSession();
    ({ data, parsedError, rawError } = await invokeCoachMessage());
  }

  if (rawError) {
    captureSentryIssue(rawError, {
      category: 'backend_failure',
      severity: 'error',
      operation: 'ai.coach.send',
      userId,
      threadId: options?.threadId ?? null,
      status: rawError?.context?.status ?? null,
    });
    throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to send AI Coach message');
  }
  if (!data?.id || !data?.content) {
    const invalidResponseError = new Error('AI Coach returned an invalid response');
    captureSentryIssue(invalidResponseError, {
      category: 'unexpected_runtime_error',
      severity: 'error',
      operation: 'ai.coach.send',
      userId,
      threadId: options?.threadId ?? null,
    });
    throw invalidResponseError;
  }

  return mapChatMessageRow({
    id: data.id,
    user_id: userId,
    thread_id: data.thread_id || options?.threadId || null,
    role: 'assistant',
    content: data.content,
    context_snapshot: options?.context ?? null,
    attachments: data.attachments ?? null,
    tokens_input: null,
    tokens_output: null,
    model: data.model ?? null,
    intent_mode: data.intent_classification?.mode || null,
    intent_confidence: data.intent_classification?.confidence ?? null,
    tool_calls_json: data.tool_calls ?? null,
    web_used: data.web_used === true,
    approval_required: data.intent_classification?.requiresApproval === true || data.approval_required === true,
    proposal_id: Array.isArray(data.action_proposals) && data.action_proposals.length
      ? data.action_proposals[0]?.id || null
      : null,
    receipt_id: Array.isArray(data.tool_receipts) && data.tool_receipts.length
      ? data.tool_receipts[0]?.id || null
      : null,
    created_at: data.created_at || new Date().toISOString(),
  });
}

export async function approveActionProposal(proposalId: string, userId: string): Promise<ChatMessage> {
  const { data, parsedError, rawError } = await invokeFunction<AICoachMessageFunctionResponse>(() =>
    supabase.functions.invoke<AICoachMessageFunctionResponse>('ai-coach-message', {
      body: {
        user_id: userId,
        approved_proposal_id: proposalId,
        allow_actions: true,
        allow_auto_apply: true,
      },
    })
  );

  if (rawError) {
    captureSentryIssue(rawError, {
      category: 'backend_failure',
      severity: 'error',
      operation: 'ai.coach.approve_action',
      userId,
      proposalId,
      status: rawError?.context?.status ?? null,
    });
    throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to approve coach action');
  }
  if (!data?.id || !data?.content) {
    const invalidApprovalError = new Error('AI Coach returned an invalid approval response');
    captureSentryIssue(invalidApprovalError, {
      category: 'unexpected_runtime_error',
      severity: 'error',
      operation: 'ai.coach.approve_action',
      userId,
      proposalId,
    });
    throw invalidApprovalError;
  }
  return mapChatMessageRow({
    ...data,
    user_id: data.user_id || '',
    role: data.role || 'assistant',
  });
}

export async function rejectActionProposal(proposalId: string, userId: string): Promise<ChatMessage> {
  const { data, parsedError, rawError } = await invokeFunction<AICoachMessageFunctionResponse>(() =>
    supabase.functions.invoke<AICoachMessageFunctionResponse>('ai-coach-message', {
      body: {
        user_id: userId,
        rejected_proposal_id: proposalId,
        allow_actions: true,
      },
    })
  );

  if (rawError) {
    captureSentryIssue(rawError, {
      category: 'backend_failure',
      severity: 'error',
      operation: 'ai.coach.reject_action',
      userId,
      proposalId,
      status: rawError?.context?.status ?? null,
    });
    throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to reject coach action');
  }
  if (!data?.id || !data?.content) {
    const invalidRejectionError = new Error('AI Coach returned an invalid rejection response');
    captureSentryIssue(invalidRejectionError, {
      category: 'unexpected_runtime_error',
      severity: 'error',
      operation: 'ai.coach.reject_action',
      userId,
      proposalId,
    });
    throw invalidRejectionError;
  }
  return mapChatMessageRow({
    ...data,
    user_id: data.user_id || '',
    role: data.role || 'assistant',
  });
}

export function createStatusReceipt(input: {
  kind: AICoachReceipt['kind'];
  title: string;
  summary: string;
  metadata?: Record<string, unknown> | null;
}): AICoachReceipt {
  return {
    id: `receipt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: input.kind,
    title: input.title,
    summary: input.summary,
    appliedAt: new Date().toISOString(),
    metadata: input.metadata || null,
  };
}

export async function appendStatusReceiptMessage(
  userId: string,
  receipt: AICoachReceipt,
): Promise<ChatMessage | null> {
  const thread = (await getConversationThreads(userId, 1))[0];
  const threadId = thread?.id && /^[0-9a-f-]{36}$/i.test(thread.id) ? thread.id : null;
  const { data, error } = await supabase
    .from('ai_coach_messages')
    .insert({
      user_id: userId,
      thread_id: threadId,
      role: 'assistant',
      content: receipt.summary,
      attachments: [
        {
          type: 'status_receipt',
          kind: receipt.kind,
          title: receipt.title,
          summary: receipt.summary,
          applied_at: receipt.appliedAt,
          metadata: receipt.metadata || null,
        },
      ],
    })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data ? mapChatMessageRow(data) : null;
}

export async function clearConversationHistory(userId: string): Promise<void> {
  const { error } = await (supabase as any).from('ai_coach_threads').delete().eq('user_id', userId);
  if (!error) return;

  const fallback = await supabase.from('ai_coach_messages').delete().eq('user_id', userId);
  if (fallback.error) throw fallback.error;
}

export async function getAssistantCapabilities(_userId: string): Promise<AICoachAssistantCapabilities> {
  return {
    canUseWeb: true,
    canAutoApplyLowRiskActions: true,
    canModifyLogs: true,
    canModifyPlans: true,
    canModifySettings: true,
    canStoreMemory: true,
  };
}

export async function executeLowRiskAction(input: AICoachLowRiskActionInput): Promise<ChatMessage> {
  return sendMessage(input.userId, input.message, {
    threadId: input.threadId,
    contextMode: input.contextMode,
    allowActions: true,
    allowAutoApply: true,
    allowWeb: false,
  });
}

export async function updateSetting(input: AICoachSettingUpdateInput): Promise<ChatMessage> {
  const message = `Change my unit system to ${input.value}`;

  return sendMessage(input.userId, message, {
    threadId: input.threadId,
    allowActions: true,
    allowAutoApply: true,
    allowWeb: false,
  });
}

export async function searchWeb(input: AICoachWebSearchInput): Promise<ChatMessage> {
  return sendMessage(input.userId, input.query, {
    threadId: input.threadId,
    contextMode: input.contextMode,
    allowActions: false,
    allowAutoApply: false,
    allowWeb: true,
  });
}

export async function getAICoachToolReceipts(userId: string, threadId?: string): Promise<AICoachToolReceipt[]> {
  let query = (supabase as any)
    .from('ai_coach_tool_receipts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (threadId) {
    query = query.eq('thread_id', threadId);
  }

  const { data, error } = await query;
  if (error) {
    if (error.message?.includes('ai_coach_tool_receipts')) return [];
    throw error;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    toolName: row.tool_name,
    title: row.tool_name.replace(/_/g, ' '),
    summary: row.summary,
    mutationLevel: row.mutation_level,
    createdAt: row.created_at,
    metadata: toRecord(row.metadata_json),
  }));
}

export async function getConversationMemoryContext(userId: string, _threadId?: string): Promise<AICoachMemoryItem[]> {
  return getAICoachMemoryItems(userId);
}

export async function getSettingsSnapshot(userId: string): Promise<{
  unitSystem: 'imperial' | 'metric';
  prepModeEnabled: boolean;
  prepDiscipline: 'bodybuilding' | 'powerlifting' | null;
  prepPhase: 'cut' | 'bulk' | null;
}> {
  const [{ data: profile }, { data: onboarding }, prepSummary] = await Promise.all([
    supabase.from('profiles').select('unit_system').eq('id', userId).maybeSingle(),
    supabase.from('onboarding_answers').select('answers').eq('user_id', userId).maybeSingle(),
    getLatestPrepCoachSummary(userId),
  ]);

  const answers = (onboarding?.answers || {}) as Record<string, unknown>;

  return {
    unitSystem: (profile?.unit_system || 'imperial') as 'imperial' | 'metric',
    prepModeEnabled: prepSummary.enabled || answers.prep_mode_enabled === true,
    prepDiscipline: prepSummary.discipline,
    prepPhase: prepSummary.phase,
  };
}

// ============================================================================
// Rate Limiting
// ============================================================================

export async function checkRateLimit(userId: string, isElite = false): Promise<RateLimitStatus> {
  const today = new Date().toISOString().split('T')[0];
  const entitlement = await checkEntitlementStatus(userId);
  const tier = isElite ? 'elite' : entitlement.tier;
  const messageLimit = getFeatureLimit('ai_messages', tier);

  if (!Number.isFinite(messageLimit)) {
    return {
      canSendMessage: true,
      messagesUsed: 0,
      messagesLimit: -1,
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      tier,
    };
  }
  const { data: usage } = await supabase
    .from('ai_usage_daily')
    .select('coach_messages')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .maybeSingle();

  const messagesUsed = usage?.coach_messages || 0;
  const now = new Date();
  const resetTime = new Date(now);
  resetTime.setHours(24, 0, 0, 0);

  return {
    canSendMessage: messagesUsed < messageLimit,
    messagesUsed,
    messagesLimit: messageLimit,
    resetTime: resetTime.toISOString(),
    tier,
  };
}

export async function getDailyUsage(userId: string, date?: string): Promise<AIUsageDaily | null> {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ai_usage_daily')
    .select('*')
    .eq('user_id', userId)
    .eq('usage_date', targetDate)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// ============================================================================
// Suggested Prompts
// ============================================================================

export function getSuggestedPrompts(
  hasLoggedToday = false,
  hasActiveWorkout = false,
  consistencyRecommendation?: ConsistencyRecommendation | null,
  prepContext?: PrepPromptContext | null,
): SuggestedPrompt[] {
  const prompts: SuggestedPrompt[] = [];

  if (!hasLoggedToday) {
    prompts.push({ id: 'log_help', label: 'Help me log my meals', icon: 'restaurant' });
  }

  if (hasActiveWorkout) {
    prompts.push({ id: 'workout_sub', label: 'Suggest exercise substitution', icon: 'barbell' });
  }

  if (consistencyRecommendation?.type === 'nutrition_protein') {
    prompts.push({ id: 'protein_swap', label: 'Show high-protein swaps', icon: 'flame' });
  }

  if (consistencyRecommendation?.type === 'workout_adherence') {
    prompts.push({ id: 'simplify_split', label: 'Simplify my workout split', icon: 'calendar' });
  }

  if (consistencyRecommendation?.type === 'hydration') {
    prompts.push({ id: 'hydration_plan', label: 'Build a hydration schedule', icon: 'water' });
  }

  if (prepContext?.prepModeEnabled) {
    prompts.push(
      {
        id: 'prep_pace',
        label: `Review this week's ${prepContext.prepPhase || 'prep'} pace`,
        icon: 'trending-up',
      },
      {
        id: 'prep_macro_explain',
        label: 'Explain my auto-adjusted macros',
        icon: 'analytics',
      },
      {
        id: 'prep_strength',
        label: 'How to preserve strength this week',
        icon: 'barbell',
      },
    );
  }

  prompts.push(
    { id: 'protein_goal', label: 'What should I eat to hit my protein goal?', icon: 'nutrition' },
    { id: 'explain_macros', label: 'Explain my macro targets', icon: 'analytics' },
    { id: 'meal_ideas', label: 'Give me healthy meal ideas', icon: 'restaurant' },
    { id: 'progress_check', label: 'How am I progressing?', icon: 'trending-up' },
    { id: 'test_plan', label: 'Suggest plan substitution', icon: 'construct' },
  );

  return prompts.slice(0, 7);
}

export function buildThreadItems(input: {
  messages: AICoachConversationMessage[];
  starterPrompts?: SuggestedPrompt[];
  starterMessage?: string;
  errorState?: { title: string; message: string; retryLabel?: string } | null;
}): AICoachThreadItem[] {
  if (!input.messages.length) {
    const starter: AICoachThreadItem[] = [
      {
        id: 'starter-message',
        type: 'message',
        message: {
          id: 'starter-message',
          user_id: 'system',
          thread_id: null,
          role: 'assistant',
          content:
            input.starterMessage ||
            "I'm grounded in your targets, current logging, workout plan, and prep state. Ask what matters now or review a change.",
          context_snapshot: null,
          attachments: null,
          tokens_input: null,
          tokens_output: null,
          model: 'system',
          intent_mode: null,
          intent_confidence: null,
          tool_calls_json: null,
          web_used: false,
          approval_required: false,
          proposal_id: null,
          receipt_id: null,
          created_at: new Date().toISOString(),
          parsedAttachments: [],
        },
        actions: [],
      },
    ];

    if (input.starterPrompts?.length) {
      starter.push({
        id: 'starter-prompts',
        type: 'prompt_group',
        prompts: input.starterPrompts.slice(0, 5),
      });
    }

    if (input.errorState) {
      starter.push({
        id: 'starter-error',
        type: 'error_state',
        ...input.errorState,
      });
    }

    return starter;
  }

  const items: AICoachThreadItem[] = [];
  let lastContextSignature: string | null = null;

  for (const message of input.messages) {
    const actions = message.parsedAttachments.filter(
      (attachment): attachment is AICoachNavigateActionAttachment | AICoachFollowUpPromptAttachment =>
        attachment.type === 'navigate_action' || attachment.type === 'follow_up_prompt',
    );

    items.push({
      id: `message-${message.id}`,
      type: 'message',
      message,
      actions,
    });

    for (const [index, attachment] of message.parsedAttachments.entries()) {
      if (attachment.type === 'navigate_action' || attachment.type === 'follow_up_prompt') {
        continue;
      }

      const proposal = attachmentToActionProposal(attachment, message.id);
      if (proposal) {
        items.push({
          id: `proposal-${message.id}-${index}`,
          type: 'action_proposal',
          proposal,
        });
        continue;
      }

      const intervention = attachmentToIntervention(attachment, message.id);
      if (intervention) {
        items.push({
          id: `intervention-${message.id}-${index}`,
          type: 'intervention_card',
          intervention,
        });
        continue;
      }

      if (attachment.type === 'tool_receipt') {
        items.push({
          id: `tool-receipt-${message.id}-${index}`,
          type: 'tool_receipt',
          receipt: {
            id: attachment.receiptId,
            toolName: attachment.toolName,
            title: attachment.title,
            summary: attachment.summary,
            mutationLevel: attachment.mutationLevel,
            createdAt: attachment.createdAt || message.created_at,
            metadata: attachment.metadata || null,
          },
        });
        continue;
      }

      if (attachment.type === 'clarification_prompt') {
        items.push({
          id: `clarification-${message.id}-${index}`,
          type: 'clarification_prompt',
          attachment,
        });
        continue;
      }

      if (attachment.type === 'web_result_summary') {
        items.push({
          id: `web-${message.id}-${index}`,
          type: 'web_result_summary',
          attachment,
        });
        continue;
      }

      if (attachment.type === 'memory_item') {
        items.push({
          id: `memory-${message.id}-${index}`,
          type: 'memory_callout',
          attachment,
          sourceMessageId: message.id,
        });
        continue;
      }

      if (attachment.type === 'status_receipt') {
        items.push({
          id: `receipt-${message.id}-${index}`,
          type: 'status_receipt',
          receipt: {
            id: `receipt-${message.id}-${index}`,
            kind: attachment.kind,
            title: attachment.title,
            summary: attachment.summary,
            appliedAt: attachment.appliedAt || message.created_at,
            metadata: attachment.metadata || null,
          },
        });
        continue;
      }

      if (attachment.type === 'context_note') {
        const signature = `${attachment.label}|${attachment.value}|${attachment.source || ''}`;
        if (signature === lastContextSignature) {
          continue;
        }

        lastContextSignature = signature;
        items.push({
          id: `context-${message.id}-${index}`,
          type: 'context_note',
          attachment,
        });
      }
    }
  }

  if (input.errorState) {
    items.push({
      id: 'thread-error',
      type: 'error_state',
      ...input.errorState,
    });
  }

  return items;
}

export async function getLatestConsistencyRecommendation(
  userId: string,
): Promise<ConsistencyRecommendation | null> {
  const { data, error } = await supabase
    .from('user_plan_consistency_daily')
    .select('recommendation_json')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch consistency recommendation:', error);
    return null;
  }

  return (data?.recommendation_json as ConsistencyRecommendation) || null;
}

export async function getLatestPrepCoachSummary(userId: string): Promise<PrepCoachSummary> {
  const [{ data: cycle }, { data: event }, { data: onboarding }] = await Promise.all([
    (supabase as any)
      .from('prep_coach_cycles')
      .select('discipline, phase, is_active, auto_adjust_enabled, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .maybeSingle(),
    (supabase as any)
      .from('prep_coach_adjustment_events')
      .select('id, status, coach_summary, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('onboarding_answers')
      .select('answers')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const answers = (onboarding?.answers || {}) as Record<string, unknown>;
  const prepEnabled = Boolean(cycle?.is_active) || answers.prep_mode_enabled === true;
  const discipline = (cycle?.discipline || answers.prep_discipline || null) as PrepCoachSummary['discipline'];
  const phase = (cycle?.phase || answers.prep_phase || null) as PrepCoachSummary['phase'];

  return {
    enabled: prepEnabled,
    discipline,
    phase,
    lastStatus: event?.status || null,
    coachSummary: event?.coach_summary || null,
    lastUpdatedAt: event?.updated_at || cycle?.updated_at || null,
  };
}

// ============================================================================
// Context Gathering
// ============================================================================

export async function gatherCoachContext(userId: string): Promise<CoachContext> {
  const today = new Date().toISOString().split('T')[0];

  const { data: targets } = await supabase
    .from('user_targets')
    .select('calories, protein_g, carbs_g, fat_g, water_ml')
    .eq('user_id', userId)
    .single();

  const { data: meals } = await supabase
    .from('meal_logs')
    .select(`
      *,
      items:meal_log_items(
        quantity_grams,
        food:food_items(calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g)
      )
    `)
    .eq('user_id', userId)
    .eq('logged_date', today);

  let caloriesConsumed = 0;
  let proteinConsumed = 0;
  let carbsConsumed = 0;
  let fatConsumed = 0;

  meals?.forEach((meal) => {
    meal.items?.forEach((item: any) => {
      const grams = item.quantity_grams;
      if (item.food) {
        caloriesConsumed += (item.food.calories_per_100g * grams) / 100;
        proteinConsumed += (item.food.protein_per_100g * grams) / 100;
        carbsConsumed += (item.food.carbs_per_100g * grams) / 100;
        fatConsumed += (item.food.fat_per_100g * grams) / 100;
      }
    });
  });

  const { data: waterLogs } = await supabase
    .from('water_logs')
    .select('amount_ml')
    .eq('user_id', userId)
    .eq('logged_date', today);

  const waterConsumed = waterLogs?.reduce((sum, log) => sum + log.amount_ml, 0) || 0;

  const [{ data: onboarding }, prepSummary] = await Promise.all([
    supabase
      .from('onboarding_answers')
      .select('answers')
      .eq('user_id', userId)
      .maybeSingle(),
    getLatestPrepCoachSummary(userId),
  ]);

  const answers = (onboarding?.answers || {}) as Record<string, unknown>;
  const goalType = typeof answers.goal_type === 'string' ? answers.goal_type : 'maintain_weight';

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: workouts } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('started_at', weekAgo);

  return {
    calorieTarget: targets?.calories || 2000,
    proteinTarget: targets?.protein_g || 150,
    carbsTarget: targets?.carbs_g || 200,
    fatTarget: targets?.fat_g || 65,
    waterTarget: targets?.water_ml || 2500,
    caloriesConsumed: Math.round(caloriesConsumed),
    proteinConsumed: Math.round(proteinConsumed),
    carbsConsumed: Math.round(carbsConsumed),
    fatConsumed: Math.round(fatConsumed),
    waterConsumed,
    workoutsThisWeek: workouts?.length || 0,
    currentGoal: goalType,
    prepModeEnabled: prepSummary.enabled,
    prepPhase: prepSummary.phase,
    prepDiscipline: prepSummary.discipline,
  };
}

// ============================================================================
// Memory
// ============================================================================

export async function getAICoachMemoryItems(userId: string): Promise<AICoachMemoryItem[]> {
  const { data, error } = await (supabase as any)
    .from('ai_coach_memory_items')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) {
    // Memory is a new table; fail soft until migrations are applied everywhere.
    if (error.message?.includes('ai_coach_memory_items')) return [];
    throw error;
  }

  return (data || []).map(mapMemoryRow);
}

export async function createAICoachMemoryItem(input: CreateAICoachMemoryItemInput): Promise<AICoachMemoryItem | null> {
  const { data, error } = await (supabase as any)
    .from('ai_coach_memory_items')
    .insert({
      user_id: input.userId,
      source_message_id: input.sourceMessageId || null,
      thread_id: input.threadId || null,
      proposal_id: input.proposalId || null,
      memory_type: input.memoryType,
      title: input.title,
      body: input.body,
      status: input.status || 'active',
      priority: input.priority ?? 50,
      metadata_json: input.metadataJson || null,
      origin_type: input.originType || 'conversation',
      scope: input.scope || 'conversation',
    })
    .select('*')
    .maybeSingle();

  if (error) {
    if (error.message?.includes('ai_coach_memory_items')) return null;
    throw error;
  }

  return data ? mapMemoryRow(data) : null;
}

export async function updateAICoachMemoryItemStatus(input: {
  memoryId: string;
  status: AICoachMemoryStatus;
}): Promise<void> {
  const patch: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };

  if (input.status === 'resolved') {
    patch.resolved_at = new Date().toISOString();
  }

  const { error } = await (supabase as any)
    .from('ai_coach_memory_items')
    .update(patch)
    .eq('id', input.memoryId);

  if (error) {
    if (error.message?.includes('ai_coach_memory_items')) return;
    throw error;
  }
}

// ============================================================================
// Interventions and dashboard state
// ============================================================================

export async function getLatestStructuredInterventions(userId: string, limit = 12): Promise<AICoachIntervention[]> {
  const messages = await getParsedConversationHistory(userId, limit);

  return messages
    .filter((message) => message.role === 'assistant')
    .flatMap((message) =>
      message.parsedAttachments
        .map((attachment) => attachmentToIntervention(attachment, message.id))
        .filter(Boolean) as AICoachIntervention[],
    );
}

async function buildDerivedMemoryPreview(
  userId: string,
  stored: AICoachMemoryItem[],
  context: CoachContext,
  prepSummary: PrepCoachSummary,
  nutritionSnapshot: NutritionTodaySnapshot | null,
): Promise<AICoachMemoryItem[]> {
  const activeStored = stored.filter((item) => item.status === 'active').slice(0, 3);
  if (activeStored.length >= 3) return activeStored;

  const derived: AICoachMemoryItem[] = [];
  const today = new Date().toISOString();

  derived.push({
    id: 'derived-goal',
    userId,
    sourceMessageId: null,
    threadId: null,
    proposalId: null,
    memoryType: 'goal',
    title: 'Current goal',
    body: `Primary goal is ${context.currentGoal.replace(/_/g, ' ')}.`,
    status: 'active',
    priority: 40,
    metadataJson: null,
    originType: 'derived',
    scope: 'global',
    createdAt: today,
    updatedAt: today,
    resolvedAt: null,
    isDerived: true,
  });

  if (prepSummary.enabled) {
    derived.push({
      id: 'derived-prep',
      userId,
      sourceMessageId: null,
      threadId: null,
      proposalId: null,
      memoryType: 'summary',
      title: 'Prep mode is active',
      body: `${prepSummary.discipline || 'Prep'} • ${prepSummary.phase || 'phase'}${prepSummary.coachSummary ? ` • ${prepSummary.coachSummary}` : ''}`,
      status: 'active',
      priority: 50,
      metadataJson: null,
      originType: 'derived',
      scope: 'settings',
      createdAt: today,
      updatedAt: today,
      resolvedAt: null,
      isDerived: true,
    });
  }

  if (nutritionSnapshot?.nextMeal) {
    derived.push({
      id: 'derived-next-meal',
      userId,
      sourceMessageId: null,
      threadId: null,
      proposalId: null,
      memoryType: 'commitment',
      title: `Next meal: ${nutritionSnapshot.nextMeal.slotLabel}`,
      body: `${nutritionSnapshot.nextMeal.mealName} at ${nutritionSnapshot.nextMeal.timeLabel}.`,
      status: 'active',
      priority: 35,
      metadataJson: null,
      originType: 'derived',
      scope: 'nutrition',
      createdAt: today,
      updatedAt: today,
      resolvedAt: null,
      isDerived: true,
    });
  }

  return [...activeStored, ...derived].slice(0, 3);
}

export async function getAICoachDashboard(userId: string): Promise<AICoachDashboardState> {
  const [context, nutritionSnapshot, rateLimit, consistencyRecommendation, prepSummary, memoryItems] = await Promise.all([
    gatherCoachContext(userId),
    getNutritionTodaySnapshot(userId, new Date().toISOString().split('T')[0]).catch(() => null),
    checkRateLimit(userId),
    getLatestConsistencyRecommendation(userId),
    getLatestPrepCoachSummary(userId),
    getAICoachMemoryItems(userId),
  ]);

  const [activeWorkoutPlan, structuredInterventions] = await Promise.all([
    getActiveWorkoutPlan(userId).catch(() => null),
    getLatestStructuredInterventions(userId),
  ]);

  const workoutRecommendations = activeWorkoutPlan?.id
    ? await getWorkoutAdaptationRecommendations(activeWorkoutPlan.id).catch(() => [])
    : [];

  const memoryPreview = await buildDerivedMemoryPreview(
    userId,
    memoryItems,
    context,
    prepSummary,
    nutritionSnapshot,
  );

  const input: AICoachDashboardBuildInput = {
    coachContext: context,
    rateLimit,
    consistencyRecommendation,
    prepSummary,
    nutritionSnapshot,
    memoryItems,
    memoryPreview,
    workoutRecommendations,
    structuredInterventions,
  };

  return buildAICoachDashboardState(input);
}

export async function getAICoachInterventions(userId: string): Promise<AICoachIntervention[]> {
  const dashboard = await getAICoachDashboard(userId);
  return dashboard.queueItems;
}

export async function getPendingCoachActions(userId: string): Promise<AICoachIntervention[]> {
  return getAICoachInterventions(userId);
}

export async function getCoachStatusStrip(userId: string): Promise<AICoachStatusStripState> {
  const dashboard = await getAICoachDashboard(userId);
  const top = dashboard.queueItems[0];

  const source = top?.kind === 'nutrition'
    ? "Based on today's logs"
    : top?.kind === 'workout'
      ? 'Based on your pending workout recommendation'
      : dashboard.status === 'prep_active'
        ? 'Based on your prep settings'
        : 'Based on your current app data';

  return {
    label: dashboard.statusLabel,
    summary: dashboard.summary,
    cta: dashboard.primaryAction,
    severity: dashboard.status,
    source,
  };
}
