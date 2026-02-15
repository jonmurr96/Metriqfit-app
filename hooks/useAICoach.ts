/**
 * React Query hooks for AI Coach Service
 * Handles chat messages, conversation history, and rate limiting
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  sendMessage,
  getConversationHistory,
  checkRateLimit,
  getDailyUsage,
  clearConversationHistory,
  getSuggestedPrompts,
  getLatestConsistencyRecommendation,
  type ChatMessage,
  type RateLimitStatus,
  type AIUsageDaily,
  type ConsistencyRecommendation,
  type PrepPromptContext,
} from '../services/aiCoachService';

// Query Keys
export const aiCoachKeys = {
  all: ['ai-coach'] as const,
  conversation: (userId: string) => [...aiCoachKeys.all, 'conversation', userId] as const,
  rateLimit: (userId: string) => [...aiCoachKeys.all, 'rate-limit', userId] as const,
  usage: (userId: string, date: string) => [...aiCoachKeys.all, 'usage', userId, date] as const,
  prompts: () => [...aiCoachKeys.all, 'prompts'] as const,
  recommendation: (userId: string) => [...aiCoachKeys.all, 'recommendation', userId] as const,
};

/**
 * Get conversation history
 */
export function useConversationHistory(userId?: string, limit = 50) {
  return useQuery({
    queryKey: aiCoachKeys.conversation(userId || ''),
    queryFn: () => userId ? getConversationHistory(userId, limit) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Check rate limit status
 */
export function useRateLimitStatus(userId?: string, isElite = false) {
  return useQuery({
    queryKey: aiCoachKeys.rateLimit(userId || ''),
    queryFn: () => userId ? checkRateLimit(userId, isElite) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

/**
 * Get daily AI usage stats
 */
export function useDailyAIUsage(userId?: string, date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: aiCoachKeys.usage(userId || '', targetDate),
    queryFn: () => userId ? getDailyUsage(userId) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get suggested prompts
 */
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
      prepContext?.prepModeEnabled ? `prep:${prepContext.prepDiscipline || 'unknown'}:${prepContext.prepPhase || 'unknown'}` : 'prep:none',
    ],
    queryFn: () => getSuggestedPrompts(hasLoggedToday, hasActiveWorkout, consistencyRecommendation, prepContext),
    staleTime: Infinity, // Static data
  });
}

/**
 * Get latest consistency recommendation.
 */
export function useConsistencyRecommendation(userId?: string) {
  return useQuery({
    queryKey: aiCoachKeys.recommendation(userId || ''),
    queryFn: () => userId ? getLatestConsistencyRecommendation(userId) : Promise.resolve(null),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Send message to AI Coach
 */
export function useSendMessage(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: string) => {
      if (!userId) throw new Error("User ID required");
      return sendMessage(userId, message);
    },
    onMutate: async (message) => {
      if (!userId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: aiCoachKeys.conversation(userId),
      });

      // Snapshot previous value
      const previousConversation = queryClient.getQueryData<ChatMessage[]>(
        aiCoachKeys.conversation(userId)
      );

      // Optimistically add user message
      const optimisticUserMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        user_id: userId,
        role: 'user',
        content: message,
        context_snapshot: null,
        attachments: null,
        tokens_input: null,
        tokens_output: null,
        model: null,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatMessage[]>(aiCoachKeys.conversation(userId), (old) => [
        ...(old || []),
        optimisticUserMessage,
      ]);

      return { previousConversation };
    },
    onSuccess: (response) => {
      if (!userId) return;
      // Refetch conversation to get both messages with proper IDs
      queryClient.invalidateQueries({
        queryKey: aiCoachKeys.conversation(userId),
      });
      // Update rate limit status
      queryClient.invalidateQueries({
        queryKey: aiCoachKeys.rateLimit(userId),
      });
      queryClient.invalidateQueries({
        queryKey: aiCoachKeys.usage(userId, new Date().toISOString().split('T')[0]),
      });
    },
    onError: (err, message, context) => {
      if (!userId) return;
      // Rollback optimistic update
      if (context?.previousConversation) {
        queryClient.setQueryData(aiCoachKeys.conversation(userId), context.previousConversation);
      }
    },
  });
}

/**
 * Clear conversation history
 */
export function useClearConversation(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => userId ? clearConversationHistory(userId) : Promise.resolve(),
    onSuccess: () => {
      if (userId) {
        queryClient.setQueryData(aiCoachKeys.conversation(userId), []);
      }
    },
  });
}

/**
 * Combined hook for chat functionality
 */
export function useAIChat(userId?: string) {
  const conversationQuery = useConversationHistory(userId);
  const rateLimitQuery = useRateLimitStatus(userId);
  const sendMessageMutation = useSendMessage(userId);
  const clearMutation = useClearConversation(userId);

  return {
    // Data
    messages: conversationQuery.data || [],
    rateLimit: rateLimitQuery.data,

    // Loading states
    isLoadingHistory: conversationQuery.isLoading,
    isSending: sendMessageMutation.isPending,

    // Actions
    sendMessage: sendMessageMutation.mutate,
    clearHistory: clearMutation.mutate,

    // Computed
    canSendMessage: rateLimitQuery.data?.canSendMessage ?? true,
    remainingMessages: rateLimitQuery.data?.messagesLimit === -1
      ? Infinity
      : (rateLimitQuery.data?.messagesLimit ?? 10) - (rateLimitQuery.data?.messagesUsed ?? 0),

    // Error states
    sendError: sendMessageMutation.error,
    historyError: conversationQuery.error,
  };
}
