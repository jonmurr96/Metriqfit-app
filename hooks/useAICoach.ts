/**
 * React Query hooks for AI Coach
 * Handles chat, dashboard aggregation, interventions, memory, and rate limiting.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nutritionDashboardKeys } from './useNutritionDashboard';
import { planKeys } from './usePlan';
import { progressBodyKeys } from './useProgressBody';
import { progressMetricKeys } from './useProgressMetrics';
import { userKeys } from './useUser';
import { waterKeys } from './useWater';
import { workoutBuilderKeys } from './useWorkoutBuilder';
import { workoutKeys } from './useWorkout';
import { addSentryBreadcrumb } from '../lib/sentry';
import {
  approveActionProposal,
  appendStatusReceiptMessage,
  buildThreadItems,
  clearConversationHistory,
  checkRateLimit,
  executeLowRiskAction,
  getAICoachDashboard,
  getAICoachInterventions,
  getAICoachMemoryItems,
  getAICoachToolReceipts,
  getAssistantCapabilities,
  getCoachStatusStrip,
  getConversationHistory,
  getConversationThreadMessages,
  getConversationThreads,
  getDailyUsage,
  getLatestConsistencyRecommendation,
  getPendingCoachActions,
  getParsedConversationHistory,
  getSuggestedPrompts,
  rejectActionProposal,
  searchWeb,
  sendMessage,
  updateSetting,
  updateAICoachMemoryItemStatus,
  type AICoachAssistantCapabilities,
  type AICoachConversationSummary,
  type AICoachConversationMessage,
  type AICoachDashboardState,
  type AICoachIntervention,
  type AICoachMemoryItem,
  type AICoachReceipt,
  type AICoachStatusStripState,
  type AICoachThreadItem,
  type AICoachToolReceipt,
  type AIUsageDaily,
  type ChatMessage,
  type ConsistencyRecommendation,
  type PrepPromptContext,
} from '../services/aiCoachService';

export const aiCoachKeys = {
  all: ['ai-coach'] as const,
  conversation: (userId: string) => [...aiCoachKeys.all, 'conversation', userId] as const,
  parsedConversation: (userId: string) => [...aiCoachKeys.all, 'conversation-parsed', userId] as const,
  rateLimit: (userId: string) => [...aiCoachKeys.all, 'rate-limit', userId] as const,
  usage: (userId: string, date: string) => [...aiCoachKeys.all, 'usage', userId, date] as const,
  prompts: () => [...aiCoachKeys.all, 'prompts'] as const,
  recommendation: (userId: string) => [...aiCoachKeys.all, 'recommendation', userId] as const,
  dashboard: (userId: string) => [...aiCoachKeys.all, 'dashboard', userId] as const,
  interventions: (userId: string) => [...aiCoachKeys.all, 'interventions', userId] as const,
  memory: (userId: string) => [...aiCoachKeys.all, 'memory', userId] as const,
  threads: (userId: string) => [...aiCoachKeys.all, 'threads', userId] as const,
  thread: (userId: string, threadId: string) => [...aiCoachKeys.all, 'thread', userId, threadId] as const,
  statusStrip: (userId: string) => [...aiCoachKeys.all, 'status-strip', userId] as const,
  pendingActions: (userId: string) => [...aiCoachKeys.all, 'pending-actions', userId] as const,
};

function invalidateCoachSideEffectQueries(queryClient: ReturnType<typeof useQueryClient>, userId: string) {
  queryClient.invalidateQueries({ queryKey: userKeys.all });
  queryClient.invalidateQueries({ queryKey: userKeys.profile(userId) });
  queryClient.invalidateQueries({ queryKey: userKeys.measurements(userId) });
  queryClient.invalidateQueries({ queryKey: nutritionDashboardKeys.all });
  queryClient.invalidateQueries({ queryKey: waterKeys.all });
  queryClient.invalidateQueries({ queryKey: planKeys.all });
  queryClient.invalidateQueries({ queryKey: workoutKeys.all });
  queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.all });
  queryClient.invalidateQueries({ queryKey: progressMetricKeys.all });
  queryClient.invalidateQueries({ queryKey: progressBodyKeys.all });
}

export function useConversationHistory(userId?: string, limit = 50) {
  return useQuery<ChatMessage[]>({
    queryKey: aiCoachKeys.conversation(userId || ''),
    queryFn: () => userId ? getConversationHistory(userId, limit) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useParsedConversationHistory(userId?: string, limit = 50) {
  return useQuery<AICoachConversationMessage[]>({
    queryKey: aiCoachKeys.parsedConversation(userId || ''),
    queryFn: () => userId ? getParsedConversationHistory(userId, limit) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useConversationThreads(userId?: string, limit = 200) {
  return useQuery<AICoachConversationSummary[]>({
    queryKey: aiCoachKeys.threads(userId || ''),
    queryFn: () => userId ? getConversationThreads(userId, limit) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useConversationThread(userId?: string, threadId?: string, limit = 200) {
  return useQuery<AICoachConversationMessage[]>({
    queryKey: aiCoachKeys.thread(userId || '', threadId || 'latest'),
    queryFn: () => userId ? getConversationThreadMessages(userId, threadId, limit) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useRateLimitStatus(userId?: string, isElite = false) {
  return useQuery({
    queryKey: aiCoachKeys.rateLimit(userId || ''),
    queryFn: () => userId ? checkRateLimit(userId, isElite) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useDailyAIUsage(userId?: string, date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery<AIUsageDaily | null>({
    queryKey: aiCoachKeys.usage(userId || '', targetDate),
    queryFn: () => userId ? getDailyUsage(userId) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useSuggestedPrompts(
  hasLoggedToday = false,
  hasActiveWorkout = false,
  consistencyRecommendation?: ConsistencyRecommendation | null,
  prepContext?: PrepPromptContext | null,
) {
  return useQuery({
    queryKey: [
      ...aiCoachKeys.prompts(),
      hasLoggedToday,
      hasActiveWorkout,
      consistencyRecommendation?.type || 'none',
      prepContext?.prepModeEnabled
        ? `prep:${prepContext.prepDiscipline || 'unknown'}:${prepContext.prepPhase || 'unknown'}`
        : 'prep:none',
    ],
    queryFn: () => getSuggestedPrompts(hasLoggedToday, hasActiveWorkout, consistencyRecommendation, prepContext),
    staleTime: Infinity,
  });
}

export function useConsistencyRecommendation(userId?: string) {
  return useQuery<ConsistencyRecommendation | null>({
    queryKey: aiCoachKeys.recommendation(userId || ''),
    queryFn: () => userId ? getLatestConsistencyRecommendation(userId) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useAICoachDashboard(userId?: string) {
  return useQuery<AICoachDashboardState | null>({
    queryKey: aiCoachKeys.dashboard(userId || ''),
    queryFn: () => userId ? getAICoachDashboard(userId) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useCoachStatusStrip(userId?: string) {
  return useQuery<AICoachStatusStripState | null>({
    queryKey: aiCoachKeys.statusStrip(userId || ''),
    queryFn: () => userId ? getCoachStatusStrip(userId) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useAICoachInterventions(userId?: string) {
  return useQuery<AICoachIntervention[]>({
    queryKey: aiCoachKeys.interventions(userId || ''),
    queryFn: () => userId ? getAICoachInterventions(userId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function usePendingCoachActions(userId?: string) {
  return useQuery<AICoachIntervention[]>({
    queryKey: aiCoachKeys.pendingActions(userId || ''),
    queryFn: () => userId ? getPendingCoachActions(userId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useAICoachMemory(userId?: string) {
  return useQuery<AICoachMemoryItem[]>({
    queryKey: aiCoachKeys.memory(userId || ''),
    queryFn: () => userId ? getAICoachMemoryItems(userId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useUpdateAICoachMemoryStatus(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { memoryId: string; status: 'active' | 'resolved' | 'dismissed' }) =>
      updateAICoachMemoryItemStatus(input),
    onSuccess: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.memory(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.dashboard(userId) });
    },
  });
}

export function useSendMessage(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: string | { message: string; options?: Parameters<typeof sendMessage>[2] }) => {
      if (!userId) throw new Error('User ID required');
      if (typeof input === 'string') {
        return sendMessage(userId, input);
      }
      return sendMessage(userId, input.message, input.options);
    },
    onMutate: async (input) => {
      if (!userId) return;
      const message = typeof input === 'string' ? input : input.message;
      addSentryBreadcrumb('AI Coach message queued', 'ai.coach', {
        userId,
        threadId: typeof input === 'string' ? null : input.options?.threadId || null,
        messageLength: message.length,
      });

      await queryClient.cancelQueries({ queryKey: aiCoachKeys.conversation(userId) });

      const previousConversation = queryClient.getQueryData<ChatMessage[]>(
        aiCoachKeys.conversation(userId),
      );

      const optimisticUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        user_id: userId,
        thread_id: typeof input === 'string' ? null : input.options?.threadId || null,
        role: 'user',
        content: message,
        context_snapshot: null,
        attachments: null,
        tokens_input: null,
        tokens_output: null,
        model: null,
        intent_mode: null,
        intent_confidence: null,
        tool_calls_json: null,
        web_used: false,
        approval_required: false,
        proposal_id: null,
        receipt_id: null,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatMessage[]>(aiCoachKeys.conversation(userId), (old) => [
        ...(old || []),
        optimisticUserMessage,
      ]);

      return { previousConversation };
    },
    onSuccess: () => {
      if (!userId) return;
      addSentryBreadcrumb('AI Coach message completed', 'ai.coach', { userId });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.conversation(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.parsedConversation(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.threads(userId) });
      queryClient.invalidateQueries({ queryKey: [...aiCoachKeys.all, 'thread', userId] });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.rateLimit(userId) });
      queryClient.invalidateQueries({
        queryKey: aiCoachKeys.usage(userId, new Date().toISOString().split('T')[0]),
      });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.dashboard(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.interventions(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.memory(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.statusStrip(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.pendingActions(userId) });
      invalidateCoachSideEffectQueries(queryClient, userId);
    },
    onError: (_error, _message, context) => {
      if (!userId) return;
      if (context?.previousConversation) {
        queryClient.setQueryData(aiCoachKeys.conversation(userId), context.previousConversation);
      }
    },
  });
}

export function useClearConversation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => userId ? clearConversationHistory(userId) : Promise.resolve(),
    onSuccess: () => {
      if (!userId) return;
      addSentryBreadcrumb('AI Coach conversation cleared', 'ai.coach', { userId });
      queryClient.setQueryData(aiCoachKeys.conversation(userId), []);
      queryClient.setQueryData(aiCoachKeys.parsedConversation(userId), []);
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.dashboard(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.interventions(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.threads(userId) });
      queryClient.invalidateQueries({ queryKey: [...aiCoachKeys.all, 'thread', userId] });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.statusStrip(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.pendingActions(userId) });
    },
  });
}

export function useAIChat(userId?: string) {
  const conversationQuery = useConversationHistory(userId);
  const rateLimitQuery = useRateLimitStatus(userId);
  const sendMessageMutation = useSendMessage(userId);
  const clearMutation = useClearConversation(userId);

  return {
    messages: conversationQuery.data || [],
    rateLimit: rateLimitQuery.data,
    isLoadingHistory: conversationQuery.isLoading,
    isSending: sendMessageMutation.isPending,
    sendMessage: sendMessageMutation.mutate,
    clearHistory: clearMutation.mutate,
    canSendMessage: rateLimitQuery.data?.canSendMessage ?? true,
    remainingMessages: rateLimitQuery.data?.messagesLimit === -1
      ? Infinity
      : (rateLimitQuery.data?.messagesLimit ?? 10) - (rateLimitQuery.data?.messagesUsed ?? 0),
    sendError: sendMessageMutation.error,
    historyError: conversationQuery.error,
    lastAttemptedMessage: sendMessageMutation.variables,
    retryLastMessage: () => {
      if (typeof sendMessageMutation.variables === 'string' && sendMessageMutation.variables.trim().length > 0) {
        sendMessageMutation.mutate(sendMessageMutation.variables);
      } else if (
        sendMessageMutation.variables
        && typeof sendMessageMutation.variables === 'object'
        && sendMessageMutation.variables.message.trim().length > 0
      ) {
        sendMessageMutation.mutate(sendMessageMutation.variables);
      }
    },
  };
}

export function useThreadItems(input: {
  messages: AICoachConversationMessage[];
  starterPrompts?: Parameters<typeof buildThreadItems>[0]['starterPrompts'];
  starterMessage?: string;
  errorState?: Parameters<typeof buildThreadItems>[0]['errorState'];
}) {
  return useQuery<AICoachThreadItem[]>({
    queryKey: [
      ...aiCoachKeys.all,
      'thread-items',
      input.messages.map((message) => message.id).join(','),
      input.starterPrompts?.map((prompt) => prompt.id).join(',') || 'starter',
      input.errorState?.message || 'ok',
    ],
    queryFn: () => Promise.resolve(buildThreadItems(input)),
    staleTime: Infinity,
  });
}

export function useAppendReceiptMessage(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (receipt: AICoachReceipt) => {
      if (!userId) throw new Error('User ID required');
      return appendStatusReceiptMessage(userId, receipt);
    },
    onSuccess: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.conversation(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.parsedConversation(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.threads(userId) });
      queryClient.invalidateQueries({ queryKey: [...aiCoachKeys.all, 'thread', userId] });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.statusStrip(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.pendingActions(userId) });
    },
  });
}

export function useApproveAICoachAction(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (proposalId: string) => {
      if (!userId) throw new Error('User ID required');
      return approveActionProposal(proposalId, userId);
    },
    onSuccess: (_data, proposalId) => {
      if (!userId) return;
      addSentryBreadcrumb('AI Coach action approved', 'ai.coach', { userId, proposalId });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.threads(userId) });
      queryClient.invalidateQueries({ queryKey: [...aiCoachKeys.all, 'thread', userId] });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.dashboard(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.pendingActions(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.memory(userId) });
      invalidateCoachSideEffectQueries(queryClient, userId);
    },
  });
}

export function useRejectAICoachAction(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (proposalId: string) => {
      if (!userId) throw new Error('User ID required');
      return rejectActionProposal(proposalId, userId);
    },
    onSuccess: (_data, proposalId) => {
      if (!userId) return;
      addSentryBreadcrumb('AI Coach action rejected', 'ai.coach', { userId, proposalId });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.threads(userId) });
      queryClient.invalidateQueries({ queryKey: [...aiCoachKeys.all, 'thread', userId] });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.dashboard(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.pendingActions(userId) });
    },
  });
}

export function useAICoachCapabilities(userId?: string) {
  return useQuery<AICoachAssistantCapabilities | null>({
    queryKey: [...aiCoachKeys.all, 'capabilities', userId || ''],
    queryFn: () => userId ? getAssistantCapabilities(userId) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: Infinity,
  });
}

export function useAICoachSettingsActions(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { setting: 'unit_system'; value: 'imperial' | 'metric'; threadId?: string }) => {
      if (!userId) throw new Error('User ID required');
      return updateSetting({ userId, ...input });
    },
    onSuccess: () => {
      if (!userId) return;
      addSentryBreadcrumb('AI Coach setting updated', 'ai.coach', { userId, setting: 'unit_system' });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.threads(userId) });
      queryClient.invalidateQueries({ queryKey: [...aiCoachKeys.all, 'thread', userId] });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.memory(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.dashboard(userId) });
    },
  });
}

export function useExecuteAICoachLowRiskAction(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { message: string; threadId?: string; contextMode?: 'auto' | 'minimal' | 'full' }) => {
      if (!userId) throw new Error('User ID required');
      return executeLowRiskAction({ userId, ...input });
    },
    onSuccess: () => {
      if (!userId) return;
      addSentryBreadcrumb('AI Coach low-risk action executed', 'ai.coach', { userId });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.threads(userId) });
      queryClient.invalidateQueries({ queryKey: [...aiCoachKeys.all, 'thread', userId] });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.dashboard(userId) });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.memory(userId) });
    },
  });
}

export function useAICoachWebSearch(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { query: string; threadId?: string; contextMode?: 'auto' | 'minimal' | 'full' }) => {
      if (!userId) throw new Error('User ID required');
      return searchWeb({ userId, ...input });
    },
    onSuccess: () => {
      if (!userId) return;
      addSentryBreadcrumb('AI Coach web search completed', 'ai.coach', { userId });
      queryClient.invalidateQueries({ queryKey: aiCoachKeys.threads(userId) });
      queryClient.invalidateQueries({ queryKey: [...aiCoachKeys.all, 'thread', userId] });
    },
  });
}

export function useAICoachToolReceipts(userId?: string, threadId?: string) {
  return useQuery<AICoachToolReceipt[]>({
    queryKey: [...aiCoachKeys.all, 'tool-receipts', userId || '', threadId || 'latest'],
    queryFn: () => userId ? getAICoachToolReceipts(userId, threadId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}
