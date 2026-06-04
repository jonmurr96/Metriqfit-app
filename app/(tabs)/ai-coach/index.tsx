import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { MotiView } from 'moti';
import { PressableScale } from '@/components/common/PressableScale';
import { PremiumBackground } from '../../../components/premium/PremiumBackground';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import {
  ChatInputBar,
  CoachActionsSheet,
  CoachBriefSheet,
  CoachHistorySheet,
  CoachInterventionCard,
  CoachInterventionReviewSheet,
  CoachMemorySheet,
  CoachPromptLauncherRow,
  CoachStatusStrip,
  MessageBubble,
  TypingIndicator,
} from '../../../components/ai-coach';
import { useTokens } from '../../../lib/theme';
import { useAuth } from '../../../lib/auth/AuthProvider';
import {
  useApproveAICoachAction,
  aiCoachKeys,
  useAICoachDashboard,
  useAICoachMemory,
  useAIChat,
  useAppendReceiptMessage,
  useCoachStatusStrip,
  useConsistencyRecommendation,
  useConversationThread,
  useConversationThreads,
  usePendingCoachActions,
  useRejectAICoachAction,
  useSuggestedPrompts,
  useUpdateAICoachMemoryStatus,
} from '../../../hooks/useAICoach';
import { usePrepCoachState, useRevertPrepAdjustment } from '../../../hooks/usePrepCoach';
import { useApplyMealPlanBatchChange } from '../../../hooks/usePlan';
import {
  useApplyWorkoutAdaptationRecommendation,
  useSetWorkoutAdaptationRecommendationStatus,
} from '../../../hooks/useWorkoutAdaptation';
import { useFeatureAccess } from '../../../hooks/useSubscription';
import { trackEvent } from '../../../lib/analytics';
import {
  buildThreadItems,
  createAICoachMemoryItem,
  createStatusReceipt,
  type AICoachAction,
  type AICoachAttachment,
  type AICoachConversationMessage,
  type AICoachConversationSummary,
  type AICoachDashboardState,
  type AICoachIntervention,
  type AICoachActionProposal,
  type AICoachThreadItem,
  type SuggestedPrompt,
} from '../../../services/aiCoachService';

function timestampLabel(input: string) {
  return new Date(input).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function historyLabel(input: string) {
  return new Date(input).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
}

function formatCoachError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Coach could not answer right now. Retry in a moment.';
  }

  if (error.message.includes('non-2xx')) {
    return 'Coach could not reach the live reasoning service. Retry in a moment or open context while the backend catches up.';
  }

  return error.message;
}

const EMPTY_CONVERSATIONS: AICoachConversationSummary[] = [];

function attachmentIntervention(attachment: AICoachAttachment, messageId: string): AICoachIntervention | null {
  if (attachment.type === 'workout_recommendation') {
    return {
      id: `inline-${messageId}-${attachment.recommendationId}`,
      sourceMessageId: messageId,
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
      attachment,
    };
  }

  if (attachment.type === 'nutrition_plan_batch_change') {
    return {
      id: `inline-${messageId}-${attachment.title}`,
      sourceMessageId: messageId,
      kind: 'nutrition',
      priority: 90,
      title: attachment.title,
      summary: attachment.summary,
      statusLabel: 'Ready',
      reviewLabel: 'Review meal shift',
      applyLabel: 'Apply meal shift',
      rejectLabel: 'Dismiss',
      batchChange: attachment,
      canApply: true,
      canReject: true,
      attachment,
    };
  }

  if (attachment.type === 'prep_adjustment_summary') {
    return {
      id: `inline-${messageId}-${attachment.title}`,
      sourceMessageId: messageId,
      kind: 'prep',
      priority: 75,
      title: attachment.title,
      summary: attachment.summary,
      statusLabel: attachment.status || 'Prep',
      reviewLabel: 'Review prep context',
      applyLabel: attachment.canRevert ? 'Revert adjustment' : undefined,
      canApply: !!attachment.canRevert,
      canReject: false,
      prepEventId: attachment.eventId,
      attachment,
    };
  }

  if (attachment.type === 'navigate_action') {
    return {
      id: `inline-${messageId}-${attachment.route}`,
      sourceMessageId: messageId,
      kind: 'navigate',
      priority: 30,
      title: attachment.label,
      summary: 'Jump directly to the related in-app flow.',
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

function formatContextNumber(value: number) {
  if (!Number.isFinite(value)) return '--';
  return Math.round(value).toLocaleString();
}

function CoachEmptyState({
  dashboard,
  prompts,
  onSelectPrompt,
}: {
  dashboard: AICoachDashboardState | null;
  prompts: SuggestedPrompt[];
  onSelectPrompt: (prompt: SuggestedPrompt) => void;
}) {
  const { c, s, ty, r } = useTokens();
  const stats = dashboard
    ? [
        { label: 'Calories left', value: `${formatContextNumber(dashboard.context.caloriesRemaining)}` },
        { label: 'Protein left', value: `${formatContextNumber(dashboard.context.proteinRemaining)}g` },
        { label: 'Hydration', value: `${formatContextNumber(dashboard.context.hydrationPercent)}%` },
      ]
    : [];

  return (
    <View style={[styles.emptyState, { paddingHorizontal: s.lg }]}>
      <View style={[styles.emptyIcon, { borderColor: c.border, backgroundColor: c.surface }]}>
        <TabBarIcon name="sparkles" color={c.primary} size={24} />
      </View>
      <Text
        style={{
          color: c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: 28,
          textAlign: 'center',
          marginTop: s.lg,
        }}
      >
        How can I help today?
      </Text>
      <Text
        style={{
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.sm,
          lineHeight: 21,
          textAlign: 'center',
          marginTop: s.sm,
          maxWidth: 330,
        }}
      >
        Ask about training, nutrition, recovery, or the next move. The coach uses your current app context.
      </Text>

      {stats.length ? (
        <View style={[styles.contextStrip, { gap: s.sm, marginTop: s.xl }]}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={[
                styles.contextPill,
                {
                  borderRadius: r.lg,
                  borderColor: c.border,
                  backgroundColor: c.surface,
                  padding: s.md,
                },
              ]}
            >
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                {stat.value}
              </Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 11, marginTop: 3 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {prompts.length ? (
        <View style={[styles.emptyPromptGrid, { gap: s.sm, marginTop: s.xl }]}>
          {prompts.slice(0, 4).map((prompt) => (
            <PressableScale
              key={prompt.id}
              accessibilityRole="button"
              accessibilityLabel={prompt.label}
              onPress={() => onSelectPrompt(prompt)}
              style={(pressed) => [
                styles.emptyPromptCard,
                {
                  borderRadius: r.lg,
                  borderWidth: 1,
                  borderColor: pressed ? `${c.primary}66` : c.border,
                  backgroundColor: pressed ? c.surface2 : c.surface,
                  padding: s.md,
                },
              ]}
            >
              <View style={[styles.emptyPromptIcon, { borderRadius: r.pill, backgroundColor: c.surface2 }]}>
                <TabBarIcon name={prompt.icon as any} color={c.textMuted} size={16} />
              </View>
              <Text
                numberOfLines={3}
                style={{
                  color: c.text,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                  lineHeight: 19,
                  marginTop: s.sm,
                }}
              >
                {prompt.label}
              </Text>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function AICoachScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { c, s, ty, r, animation } = useTokens();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const aiCoachTabBarOffset = 70;

  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);
  const [activeMutationId, setActiveMutationId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [dismissedStatusSignature, setDismissedStatusSignature] = useState<string | null>(null);
  const [dismissedThreadItemIds, setDismissedThreadItemIds] = useState<string[]>([]);

  const chat = useAIChat(user?.id);
  const dashboardQuery = useAICoachDashboard(user?.id);
  const statusStripQuery = useCoachStatusStrip(user?.id);
  const pendingActionsQuery = usePendingCoachActions(user?.id);
  const memoryQuery = useAICoachMemory(user?.id);
  const threadsQuery = useConversationThreads(user?.id);
  const consistencyQuery = useConsistencyRecommendation(user?.id);
  const prepStateQuery = usePrepCoachState();
  const updateMemoryStatus = useUpdateAICoachMemoryStatus(user?.id);
  const appendReceiptMessage = useAppendReceiptMessage(user?.id);
  const approveActionProposal = useApproveAICoachAction(user?.id);
  const rejectActionProposal = useRejectAICoachAction(user?.id);

  const applyWorkoutRecommendation = useApplyWorkoutAdaptationRecommendation();
  const rejectWorkoutRecommendation = useSetWorkoutAdaptationRecommendationStatus();
  const applyMealPlanBatchChange = useApplyMealPlanBatchChange();
  const revertPrepAdjustment = useRevertPrepAdjustment();
  const historyAccess = useFeatureAccess('unlimited_history');

  const conversationSummaries = threadsQuery.data ?? EMPTY_CONVERSATIONS;
  const latestConversationId = conversationSummaries[0]?.id || null;

  useEffect(() => {
    if (!selectedConversationId && latestConversationId) {
      setSelectedConversationId(latestConversationId);
    }
  }, [latestConversationId, selectedConversationId]);

  const activeConversationId = selectedConversationId || latestConversationId;
  const conversationQuery = useConversationThread(user?.id, activeConversationId || undefined);
  const activeConversationSummary = useMemo(
    () => conversationSummaries.find((item) => item.id === activeConversationId) || null,
    [conversationSummaries, activeConversationId],
  );

  const dashboard = dashboardQuery.data || null;
  const statusStrip = statusStripQuery.data || null;
  const statusStripSignature = useMemo(
    () => (statusStrip ? `${statusStrip.severity}|${statusStrip.label}|${statusStrip.summary}|${statusStrip.cta?.label || ''}` : null),
    [statusStrip],
  );
  const interventions = useMemo(
    () => pendingActionsQuery.data || dashboard?.queueItems || [],
    [pendingActionsQuery.data, dashboard?.queueItems],
  );
  const memoryItems = memoryQuery.data || [];
  const messages = useMemo(
    () => conversationQuery.data || [],
    [conversationQuery.data],
  );
  const isViewingHistory = !!activeConversationId && !!latestConversationId && activeConversationId !== latestConversationId;
  const isStatusStripVisible = !!statusStrip && statusStripSignature !== dismissedStatusSignature;

  const suggestedPromptsQuery = useSuggestedPrompts(
    (dashboard?.nutritionSnapshot?.consumed.calories || 0) > 0,
    false,
    consistencyQuery.data || null,
    prepStateQuery.data
      ? {
          prepModeEnabled: prepStateQuery.data.enabled,
          prepPhase: prepStateQuery.data.phase,
          prepDiscipline: prepStateQuery.data.discipline,
        }
      : null,
  );

  const promptSuggestions = useMemo(
    () => (suggestedPromptsQuery.data || []).slice(0, 5),
    [suggestedPromptsQuery.data],
  );
  const visiblePromptSuggestions = useMemo(
    () => (messages.length > 0 ? promptSuggestions.slice(0, 3) : promptSuggestions),
    [messages.length, promptSuggestions],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrateDismissedStatus() {
      if (!user?.id) {
        setDismissedStatusSignature(null);
        return;
      }

      try {
        const stored = await AsyncStorage.getItem(`ai-coach-status-dismissed:${user.id}`);
        if (!cancelled) {
          setDismissedStatusSignature(stored);
        }
      } catch {
        if (!cancelled) {
          setDismissedStatusSignature(null);
        }
      }
    }

    hydrateDismissedStatus();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    setDismissedThreadItemIds([]);
  }, [activeConversationId]);

  const threadItems = useMemo<AICoachThreadItem[]>(
    () =>
      buildThreadItems({
        messages,
        starterPrompts: promptSuggestions,
        errorState: chat.sendError
          ? {
              title: 'Coach is temporarily unavailable',
              message: formatCoachError(chat.sendError),
              retryLabel: 'Retry',
            }
          : null,
      }),
    [messages, promptSuggestions, chat.sendError],
  );

  const handleDismissStatusStrip = async () => {
    if (!user?.id || !statusStripSignature) return;

    setDismissedStatusSignature(statusStripSignature);

    try {
      await AsyncStorage.setItem(`ai-coach-status-dismissed:${user.id}`, statusStripSignature);
    } catch {
      // Ignore persistence failures; local state already hides the strip.
    }
  };

  const handleDismissThreadItem = (itemId: string) => {
    setDismissedThreadItemIds((current) => (current.includes(itemId) ? current : [...current, itemId]));
  };

  const selectedIntervention = useMemo(
    () =>
      interventions.find((item) => item.id === selectedInterventionId)
      || messages
        .flatMap((message) => message.parsedAttachments)
        .map((attachment, index) => attachmentIntervention(attachment, `fallback-${index}`))
        .find((item) => item?.id === selectedInterventionId)
      || null,
    [interventions, messages, selectedInterventionId],
  );

  useEffect(() => {
    const id = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
    return () => clearTimeout(id);
  }, [threadItems.length, chat.isSending]);

  const persistInterventionMemory = async (intervention: AICoachIntervention) => {
    if (!user || !intervention.memoryDraft) return;

    await createAICoachMemoryItem({
      userId: user.id,
      sourceMessageId: intervention.sourceMessageId,
      threadId: activeConversationId || null,
      memoryType: intervention.memoryDraft.memoryType,
      title: intervention.memoryDraft.title,
      body: intervention.memoryDraft.body,
      priority: intervention.memoryDraft.priority,
      metadataJson: {
        interventionId: intervention.id,
        kind: intervention.kind,
      },
      originType: 'tool',
      scope:
        intervention.kind === 'nutrition'
          ? 'nutrition'
          : intervention.kind === 'workout'
            ? 'workout'
            : intervention.kind === 'prep'
              ? 'settings'
              : 'conversation',
    });

    queryClient.invalidateQueries({ queryKey: aiCoachKeys.memory(user.id) });
    queryClient.invalidateQueries({ queryKey: aiCoachKeys.dashboard(user.id) });
  };

  const appendReceiptForIntervention = async (intervention: AICoachIntervention) => {
    if (!user) return;

    const receipt = createStatusReceipt({
      kind:
        intervention.kind === 'workout'
          ? 'workout'
          : intervention.kind === 'nutrition'
            ? 'nutrition'
            : intervention.kind === 'prep'
              ? 'prep'
              : 'system',
      title:
        intervention.kind === 'nutrition'
          ? 'Meal plan updated'
          : intervention.kind === 'workout'
            ? 'Workout plan updated'
            : intervention.kind === 'prep'
              ? 'Prep adjustment updated'
              : 'Coach action applied',
      summary:
        intervention.batchChange?.impactSummary
        || intervention.summary
        || 'A coach-directed change was applied successfully.',
      metadata: {
        interventionId: intervention.id,
        kind: intervention.kind,
      },
    });

    await appendReceiptMessage.mutateAsync(receipt);
  };

  const handleAction = (action: AICoachAction) => {
    if (action.type === 'open_brief') {
      setIsContextOpen(true);
      return;
    }
    if (action.type === 'open_actions') {
      setIsActionsOpen(true);
      return;
    }
    if (action.type === 'open_memory') {
      setIsMemoryOpen(true);
      return;
    }
    if (action.type === 'review_intervention' && action.interventionId) {
      setSelectedInterventionId(action.interventionId);
      return;
    }
    if (action.type === 'send_prompt' && action.prompt) {
      if (isViewingHistory) {
        Alert.alert('Viewing history', 'Return to live chat before sending a new coach request.');
        return;
      }
      chat.sendMessage({ message: action.prompt, options: { threadId: activeConversationId || undefined } });
    }
  };

  const handleThreadAction = (attachment: AICoachAttachment, message: AICoachConversationMessage, index: number) => {
    if (attachment.type === 'follow_up_prompt') {
      if (isViewingHistory) {
        Alert.alert('Viewing history', 'Return to live chat before sending a new coach request.');
        return;
      }
      chat.sendMessage({ message: attachment.prompt, options: { threadId: activeConversationId || undefined } });
      return;
    }

    if (attachment.type === 'navigate_action') {
      router.push(attachment.route as any);
      return;
    }

    const intervention = attachmentIntervention(attachment, `${message.id}-${index}`);
    if (intervention) {
      setSelectedInterventionId(intervention.id);
    }
  };

  const handleApplyIntervention = async (intervention: AICoachIntervention) => {
    try {
      setActiveMutationId(intervention.id);

      if (intervention.kind === 'workout' && intervention.recommendationId) {
        await applyWorkoutRecommendation.mutateAsync({ recommendationId: intervention.recommendationId });
      } else if (intervention.kind === 'nutrition' && intervention.batchChange) {
        await applyMealPlanBatchChange.mutateAsync({
          planId: intervention.batchChange.planId,
          dayOfWeek: intervention.batchChange.dayOfWeek,
          meals: intervention.batchChange.meals,
        });
      } else if (intervention.kind === 'prep' && intervention.prepEventId) {
        await revertPrepAdjustment.mutateAsync(intervention.prepEventId);
      } else if (intervention.kind === 'navigate' && intervention.route) {
        router.push(intervention.route as any);
      }

      await persistInterventionMemory(intervention);
      await appendReceiptForIntervention(intervention);
      setSelectedConversationId(latestConversationId);
      setSelectedInterventionId(null);
      setIsActionsOpen(false);
    } catch (error) {
      Alert.alert('Unable to apply change', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setActiveMutationId(null);
    }
  };

  const handleRejectIntervention = async (intervention: AICoachIntervention) => {
    try {
      setActiveMutationId(intervention.id);

      if (intervention.kind === 'workout' && intervention.recommendationId) {
        await rejectWorkoutRecommendation.mutateAsync({
          recommendationId: intervention.recommendationId,
          status: 'rejected',
        });
      }

      setSelectedInterventionId(null);
    } catch (error) {
      Alert.alert('Unable to reject change', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setActiveMutationId(null);
    }
  };

  const handleResolveMemory = async (memoryId: string) => {
    try {
      await updateMemoryStatus.mutateAsync({ memoryId, status: 'resolved' });
    } catch (error) {
      Alert.alert('Unable to update memory', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleDismissMemory = async (memoryId: string) => {
    try {
      await updateMemoryStatus.mutateAsync({ memoryId, status: 'dismissed' });
    } catch (error) {
      Alert.alert('Unable to update memory', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleSelectHistory = (item: AICoachConversationSummary) => {
    setSelectedConversationId(item.id);
    setIsHistoryOpen(false);
  };

  const handleReturnToLiveChat = () => {
    if (latestConversationId) {
      setSelectedConversationId(latestConversationId);
    }
  };

  const handleSend = (message: string) => {
    if (isViewingHistory) {
      Alert.alert('Viewing history', 'Return to live chat before sending a new coach request.');
      return;
    }
    chat.sendMessage({ message, options: { threadId: activeConversationId || undefined } });
  };

  const handleApproveProposal = async (proposal: AICoachActionProposal) => {
    try {
      setActiveMutationId(proposal.id);
      await approveActionProposal.mutateAsync(proposal.id);
    } catch (error) {
      Alert.alert('Unable to apply change', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setActiveMutationId(null);
    }
  };

  const handleRejectProposal = async (proposal: AICoachActionProposal) => {
    try {
      setActiveMutationId(proposal.id);
      await rejectActionProposal.mutateAsync(proposal.id);
    } catch (error) {
      Alert.alert('Unable to reject change', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setActiveMutationId(null);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear conversation history',
      'This removes the stored coach conversation thread from the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            chat.clearHistory();
            setIsHistoryOpen(false);
            setSelectedConversationId(null);
          },
        },
      ],
    );
  };

  return (
    <PremiumBackground variant="subtle">
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <MotiView
          from={{ opacity: 0, translateY: -8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: animation.duration.normal }}
          style={[
            styles.header,
            {
              paddingTop: insets.top + s.md,
              paddingHorizontal: s.lg,
              paddingBottom: s.sm,
            },
          ]}
        >
          <View style={styles.headerCopy}>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.xl,
              }}
            >
              AI Coach
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
                marginTop: 4,
              }}
            >
              {chat.rateLimit?.messagesLimit === -1 ? 'Unlimited messages' : `${chat.remainingMessages} messages left today`}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.headerActions}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Open coach actions"
                onPress={() => setIsActionsOpen(true)}
                style={(pressed) => [
                  styles.iconButton,
                  {
                    borderRadius: r.pill,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: pressed ? c.surface2 : c.surface,
                  },
                ]}
              >
                <TabBarIcon name="sparkles-outline" color={c.textMuted} size={18} />
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Open conversation history"
                onPress={() => {
                  if (!historyAccess.hasAccess) {
                    trackEvent('ai_coach_history_gate_viewed', {
                      source: 'ai_coach_header',
                      required_tier: historyAccess.upgradeTier,
                    });
                  }
                  setIsHistoryOpen(true);
                }}
                style={(pressed) => [
                  styles.iconButton,
                  {
                    borderRadius: r.pill,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: pressed ? c.surface2 : c.surface,
                  },
                ]}
              >
                <TabBarIcon name="time-outline" color={c.textMuted} size={18} />
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Open coach memory"
                onPress={() => setIsMemoryOpen(true)}
                style={(pressed) => [
                  styles.iconButton,
                  {
                    borderRadius: r.pill,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: pressed ? c.surface2 : c.surface,
                  },
                ]}
              >
                <TabBarIcon name="book-outline" color={c.textMuted} size={18} />
              </PressableScale>
            </View>
          </View>
        </MotiView>

        {isStatusStripVisible ? (
          <View style={{ paddingHorizontal: s.lg, marginTop: s.md }}>
            <CoachStatusStrip
              state={statusStrip}
              onAction={handleAction}
              onOpenContext={() => setIsContextOpen(true)}
              onDismiss={handleDismissStatusStrip}
            />
          </View>
        ) : null}

        {isViewingHistory && activeConversationId ? (
          <View
            style={[
              styles.historyBanner,
              {
                marginHorizontal: s.lg,
                marginTop: s.md,
                borderRadius: r.lg,
                borderWidth: 1,
                borderColor: `${c.primary}24`,
                backgroundColor: c.surface,
                padding: s.md,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.cardHeaderRow}>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.body.familySemibold,
                    fontSize: ty.sizes.sm,
                    flex: 1,
                    paddingRight: s.sm,
                  }}
                >
                  Viewing {activeConversationSummary?.title || historyLabel(activeConversationSummary?.updatedAt || new Date().toISOString())} history
                </Text>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Close history banner and return to live chat"
                  hitSlop={10}
                  onPress={handleReturnToLiveChat}
                  style={(pressed) => [
                    styles.dismissButton,
                    {
                      borderRadius: r.pill,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: pressed ? c.surface2 : 'transparent',
                    },
                  ]}
                >
                  <TabBarIcon name="close" color={c.textMuted} size={14} />
                </PressableScale>
              </View>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                  lineHeight: 20,
                  marginTop: s.xs,
                }}
              >
                Return to live chat to continue talking with the coach today.
              </Text>
            </View>

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Return to live chat"
              onPress={handleReturnToLiveChat}
              style={(pressed) => [
                styles.historyBannerAction,
                {
                  minHeight: 44,
                  borderRadius: r.md,
                  backgroundColor: pressed ? `${c.primary}CC` : c.primary,
                },
              ]}
            >
              <Text
                style={{
                  color: c.bg,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                }}
              >
                Live chat
              </Text>
            </PressableScale>
          </View>
        ) : null}

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={{
            paddingTop: messages.length ? (isStatusStripVisible ? s.xl : s.lg) : s.md,
            paddingBottom: messages.length ? 152 : 184,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!messages.length && !isViewingHistory ? (
            <CoachEmptyState
              dashboard={dashboard}
              prompts={promptSuggestions}
              onSelectPrompt={(prompt) => handleSend(prompt.label)}
            />
          ) : null}

          <View style={styles.threadStack}>
            {threadItems.map((item, index) => {
              if (dismissedThreadItemIds.includes(item.id)) {
                return null;
              }
              if (!messages.length && (item.id === 'starter-message' || item.id === 'starter-prompts')) {
                return null;
              }

              if (item.type === 'message') {
                return (
                  <View key={item.id}>
                    <MessageBubble
                      message={item.message.content}
                      sender={item.message.role === 'user' ? 'user' : 'coach'}
                      timestamp={timestampLabel(item.message.created_at)}
                      animated
                      delay={index * 40}
                    />

                    {item.actions.length ? (
                      <View style={{ paddingHorizontal: s.lg, gap: s.sm, marginTop: s.sm }}>
                        {item.actions.map((attachment, attachmentIndex) => (
                          <PressableScale
                            key={`${item.id}-${attachmentIndex}`}
                            accessibilityRole="button"
                            onPress={() => handleThreadAction(attachment, item.message, attachmentIndex)}
                            style={(pressed) => [
                              styles.inlineChip,
                              {
                                minHeight: 44,
                                borderRadius: r.pill,
                                borderWidth: 1,
                                borderColor: `${c.primary}28`,
                                backgroundColor: pressed ? c.surface2 : c.surface,
                              },
                            ]}
                          >
                            <TabBarIcon
                              name={(attachment.type === 'navigate_action' ? 'arrow-forward-circle' : 'chatbubble-ellipses') as any}
                              color={c.primary}
                              size={15}
                            />
                            <Text
                              style={{
                                color: c.text,
                                fontFamily: ty.body.familySemibold,
                                fontSize: ty.sizes.sm,
                                marginLeft: s.sm,
                              }}
                            >
                              {attachment.label}
                            </Text>
                          </PressableScale>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              }

              if (item.type === 'intervention_card') {
                return (
                  <View key={item.id} style={{ paddingHorizontal: s.lg, position: 'relative' }}>
                    <CoachInterventionCard
                      intervention={item.intervention}
                      compact
                      onPress={() => setSelectedInterventionId(item.intervention.id)}
                    />
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel="Dismiss coach card"
                      hitSlop={10}
                      onPress={() => handleDismissThreadItem(item.id)}
                      style={(pressed) => [
                        styles.overlayDismissButton,
                        {
                          top: s.sm,
                          right: s.sm,
                          borderRadius: r.pill,
                          borderWidth: 1,
                          borderColor: c.border,
                          backgroundColor: pressed ? c.surface2 : c.surface,
                        },
                      ]}
                    >
                      <TabBarIcon name="close" color={c.textMuted} size={14} />
                    </PressableScale>
                  </View>
                );
              }

              if (item.type === 'action_proposal') {
                const riskColor = item.proposal.riskLevel === 'high'
                  ? c.danger
                  : item.proposal.riskLevel === 'medium'
                    ? c.warning
                    : c.primary;

                return (
                  <View
                    key={item.id}
                    style={{
                      marginHorizontal: s.lg,
                      borderRadius: r.lg,
                      borderWidth: 1,
                      borderColor: `${riskColor}30`,
                      backgroundColor: c.surface,
                      padding: s.lg,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: s.md }}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: riskColor,
                            fontFamily: ty.body.familySemibold,
                            fontSize: 11,
                            letterSpacing: 0.8,
                          }}
                        >
                          {`${item.proposal.riskLevel.toUpperCase()} RISK`}
                        </Text>
                        <Text
                          style={{
                            color: c.text,
                            fontFamily: ty.heading.familySemibold,
                            fontSize: ty.sizes.md,
                            marginTop: s.sm,
                          }}
                        >
                          {item.proposal.title}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: s.sm }}>
                        <PressableScale
                          accessibilityRole="button"
                          accessibilityLabel="Dismiss proposal card"
                          hitSlop={10}
                          onPress={() => handleDismissThreadItem(item.id)}
                          style={(pressed) => [
                            styles.dismissButton,
                            {
                              borderRadius: r.pill,
                              borderWidth: 1,
                              borderColor: c.border,
                              backgroundColor: pressed ? c.surface2 : 'transparent',
                            },
                          ]}
                        >
                          <TabBarIcon name="close" color={c.textMuted} size={14} />
                        </PressableScale>
                        <View
                          style={{
                            minWidth: 72,
                            alignSelf: 'flex-start',
                            borderRadius: r.pill,
                            borderWidth: 1,
                            borderColor: `${riskColor}30`,
                            backgroundColor: 'rgba(8,14,32,0.36)',
                            paddingHorizontal: s.sm,
                            paddingVertical: 6,
                          }}
                        >
                          <Text
                            style={{
                              color: riskColor,
                              fontFamily: ty.body.familySemibold,
                              fontSize: 11,
                              textAlign: 'center',
                            }}
                          >
                            {item.proposal.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.sm,
                        lineHeight: 20,
                        marginTop: s.md,
                      }}
                    >
                      {item.proposal.summary}
                    </Text>

                    {item.proposal.rationale ? (
                      <Text
                        style={{
                          color: c.textSubtle,
                          fontFamily: ty.body.family,
                          fontSize: ty.sizes.xs,
                          lineHeight: 18,
                          marginTop: s.sm,
                        }}
                      >
                        {item.proposal.rationale}
                      </Text>
                    ) : null}

                    {item.proposal.status === 'pending' ? (
                      <View style={[styles.errorActions, { gap: s.sm, marginTop: s.lg }]}>
                        <PressableScale
                          accessibilityRole="button"
                          accessibilityLabel={item.proposal.rejectLabel}
                          onPress={() => handleRejectProposal(item.proposal)}
                          style={(pressed) => [
                            styles.errorAction,
                            {
                              minHeight: 44,
                              borderRadius: r.md,
                              borderWidth: 1,
                              borderColor: c.border,
                              backgroundColor: pressed ? c.surface2 : 'transparent',
                              opacity: activeMutationId === item.proposal.id ? 0.7 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: c.textMuted,
                              fontFamily: ty.body.familySemibold,
                              fontSize: ty.sizes.sm,
                            }}
                          >
                            {activeMutationId === item.proposal.id ? 'Working...' : item.proposal.rejectLabel}
                          </Text>
                        </PressableScale>

                        <PressableScale
                          accessibilityRole="button"
                          accessibilityLabel={item.proposal.approveLabel}
                          onPress={() => handleApproveProposal(item.proposal)}
                          style={(pressed) => [
                            styles.errorAction,
                            {
                              minHeight: 44,
                              borderRadius: r.md,
                              backgroundColor: pressed ? `${riskColor}CC` : riskColor,
                              opacity: activeMutationId === item.proposal.id ? 0.7 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: c.bg,
                              fontFamily: ty.body.familySemibold,
                              fontSize: ty.sizes.sm,
                            }}
                          >
                            {activeMutationId === item.proposal.id ? 'Applying...' : item.proposal.approveLabel}
                          </Text>
                        </PressableScale>
                      </View>
                    ) : null}
                  </View>
                );
              }

              if (item.type === 'memory_callout') {
                return (
                  <View
                    key={item.id}
                    style={{
                      marginHorizontal: s.lg,
                      borderRadius: r.lg,
                      borderWidth: 1,
                      borderColor: `${c.primary}20`,
                      backgroundColor: c.surface,
                      padding: s.md,
                    }}
                  >
                    <View style={styles.cardHeaderRow}>
                      <Text
                        style={{
                          color: c.primary,
                          fontFamily: ty.body.familySemibold,
                          fontSize: 11,
                          letterSpacing: 0.8,
                        }}
                      >
                        MEMORY
                      </Text>
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss memory card"
                        hitSlop={10}
                        onPress={() => handleDismissThreadItem(item.id)}
                        style={(pressed) => [
                          styles.dismissButton,
                          {
                            borderRadius: r.pill,
                            borderWidth: 1,
                            borderColor: c.border,
                            backgroundColor: pressed ? c.surface2 : 'transparent',
                          },
                        ]}
                      >
                        <TabBarIcon name="close" color={c.textMuted} size={14} />
                      </PressableScale>
                    </View>
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.sm,
                        marginTop: s.xs,
                      }}
                    >
                      {item.attachment.title}
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.sm,
                        lineHeight: 20,
                        marginTop: s.xs,
                      }}
                    >
                      {item.attachment.body}
                    </Text>
                  </View>
                );
              }

              if (item.type === 'tool_receipt') {
                return (
                  <View
                    key={item.id}
                    style={{
                      marginHorizontal: s.lg,
                      borderRadius: r.lg,
                      borderWidth: 1,
                      borderColor: `${c.success}24`,
                      backgroundColor: c.surface,
                      padding: s.md,
                    }}
                  >
                    <View style={styles.cardHeaderRow}>
                      <Text
                        style={{
                          color: c.success,
                          fontFamily: ty.body.familySemibold,
                          fontSize: 11,
                          letterSpacing: 0.8,
                        }}
                      >
                        {item.receipt.mutationLevel === 'none' ? 'NOT APPLIED' : 'ACTION RECEIPT'}
                      </Text>
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss receipt card"
                        hitSlop={10}
                        onPress={() => handleDismissThreadItem(item.id)}
                        style={(pressed) => [
                          styles.dismissButton,
                          {
                            borderRadius: r.pill,
                            borderWidth: 1,
                            borderColor: c.border,
                            backgroundColor: pressed ? c.surface2 : 'transparent',
                          },
                        ]}
                      >
                        <TabBarIcon name="close" color={c.textMuted} size={14} />
                      </PressableScale>
                    </View>
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.sm,
                        marginTop: s.xs,
                      }}
                    >
                      {item.receipt.title}
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.sm,
                        lineHeight: 20,
                        marginTop: s.xs,
                      }}
                    >
                      {item.receipt.summary}
                    </Text>
                  </View>
                );
              }

              if (item.type === 'status_receipt') {
                return (
                  <View
                    key={item.id}
                    style={{
                      marginHorizontal: s.lg,
                      borderRadius: r.lg,
                      borderWidth: 1,
                      borderColor: `${c.success}24`,
                      backgroundColor: c.surface,
                      padding: s.md,
                    }}
                  >
                    <View style={styles.cardHeaderRow}>
                      <Text
                        style={{
                          color: c.success,
                          fontFamily: ty.body.familySemibold,
                          fontSize: 11,
                          letterSpacing: 0.8,
                        }}
                      >
                        APPLIED
                      </Text>
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss status card"
                        hitSlop={10}
                        onPress={() => handleDismissThreadItem(item.id)}
                        style={(pressed) => [
                          styles.dismissButton,
                          {
                            borderRadius: r.pill,
                            borderWidth: 1,
                            borderColor: c.border,
                            backgroundColor: pressed ? c.surface2 : 'transparent',
                          },
                        ]}
                      >
                        <TabBarIcon name="close" color={c.textMuted} size={14} />
                      </PressableScale>
                    </View>
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.sm,
                        marginTop: s.xs,
                      }}
                    >
                      {item.receipt.title}
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.sm,
                        lineHeight: 20,
                        marginTop: s.xs,
                      }}
                    >
                      {item.receipt.summary}
                    </Text>
                  </View>
                );
              }

              if (item.type === 'context_note') {
                return (
                  <View
                    key={item.id}
                    style={{
                      marginHorizontal: s.lg,
                      borderRadius: r.lg,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: c.surface2,
                      padding: s.md,
                    }}
                  >
                    <View style={styles.cardHeaderRow}>
                      <Text
                        style={{
                          color: c.textMuted,
                          fontFamily: ty.body.familySemibold,
                          fontSize: 11,
                          letterSpacing: 0.8,
                        }}
                      >
                        {item.attachment.label.toUpperCase()}
                      </Text>
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss context card"
                        hitSlop={10}
                        onPress={() => handleDismissThreadItem(item.id)}
                        style={(pressed) => [
                          styles.dismissButton,
                          {
                            borderRadius: r.pill,
                            borderWidth: 1,
                            borderColor: c.border,
                            backgroundColor: pressed ? c.surface : 'transparent',
                          },
                        ]}
                      >
                        <TabBarIcon name="close" color={c.textMuted} size={14} />
                      </PressableScale>
                    </View>
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.sm,
                        marginTop: s.xs,
                      }}
                    >
                      {item.attachment.value}
                    </Text>
                    {item.attachment.source ? (
                      <Text
                        style={{
                          color: c.textSubtle,
                          fontFamily: ty.body.family,
                          fontSize: ty.sizes.xs,
                          marginTop: s.xs,
                        }}
                      >
                        {item.attachment.source}
                      </Text>
                    ) : null}
                  </View>
                );
              }

              if (item.type === 'prompt_group') {
                return (
                  <CoachPromptLauncherRow
                    key={item.id}
                    prompts={item.prompts}
                    onSelect={(prompt) => handleSend(prompt.label)}
                  />
                );
              }

              if (item.type === 'clarification_prompt') {
                return (
                  <View
                    key={item.id}
                    style={{
                      marginHorizontal: s.lg,
                      borderRadius: r.lg,
                      borderWidth: 1,
                      borderColor: `${c.warning}24`,
                      backgroundColor: c.surface,
                      padding: s.md,
                    }}
                  >
                    <View style={styles.cardHeaderRow}>
                      <Text
                        style={{
                          color: c.warning,
                          fontFamily: ty.body.familySemibold,
                          fontSize: 11,
                          letterSpacing: 0.8,
                        }}
                      >
                        NEEDS CLARITY
                      </Text>
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss clarification card"
                        hitSlop={10}
                        onPress={() => handleDismissThreadItem(item.id)}
                        style={(pressed) => [
                          styles.dismissButton,
                          {
                            borderRadius: r.pill,
                            borderWidth: 1,
                            borderColor: c.border,
                            backgroundColor: pressed ? c.surface2 : 'transparent',
                          },
                        ]}
                      >
                        <TabBarIcon name="close" color={c.textMuted} size={14} />
                      </PressableScale>
                    </View>
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.sm,
                        marginTop: s.xs,
                      }}
                    >
                      {item.attachment.title}
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.sm,
                        lineHeight: 20,
                        marginTop: s.xs,
                      }}
                    >
                      {item.attachment.prompt}
                    </Text>
                    {item.attachment.options?.length ? (
                      <View style={{ gap: s.sm, marginTop: s.md }}>
                        {item.attachment.options.map((option, optionIndex) => (
                          <PressableScale
                            key={`${item.id}-clarify-${optionIndex}`}
                            accessibilityRole="button"
                            accessibilityLabel={option.label}
                            onPress={() => handleSend(option.prompt)}
                            style={(pressed) => [
                              styles.inlineChip,
                              {
                                minHeight: 44,
                                borderRadius: r.pill,
                                borderWidth: 1,
                                borderColor: `${c.primary}28`,
                                backgroundColor: pressed ? c.surface2 : c.surface2,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color: c.text,
                                fontFamily: ty.body.familySemibold,
                                fontSize: ty.sizes.sm,
                              }}
                            >
                              {option.label}
                            </Text>
                          </PressableScale>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              }

              if (item.type === 'web_result_summary') {
                return (
                  <View
                    key={item.id}
                    style={{
                      marginHorizontal: s.lg,
                      borderRadius: r.lg,
                      borderWidth: 1,
                      borderColor: `${c.primary}24`,
                      backgroundColor: c.surface2,
                      padding: s.md,
                    }}
                  >
                    <View style={styles.cardHeaderRow}>
                      <Text
                        style={{
                          color: c.primary,
                          fontFamily: ty.body.familySemibold,
                          fontSize: 11,
                          letterSpacing: 0.8,
                        }}
                      >
                        LIVE WEB
                      </Text>
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss web result card"
                        hitSlop={10}
                        onPress={() => handleDismissThreadItem(item.id)}
                        style={(pressed) => [
                          styles.dismissButton,
                          {
                            borderRadius: r.pill,
                            borderWidth: 1,
                            borderColor: c.border,
                            backgroundColor: pressed ? c.surface : 'transparent',
                          },
                        ]}
                      >
                        <TabBarIcon name="close" color={c.textMuted} size={14} />
                      </PressableScale>
                    </View>
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.sm,
                        marginTop: s.xs,
                      }}
                    >
                      {item.attachment.title}
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.sm,
                        lineHeight: 20,
                        marginTop: s.xs,
                      }}
                    >
                      {item.attachment.summary}
                    </Text>
                    {item.attachment.sources?.length ? (
                      <View style={{ marginTop: s.sm, gap: 4 }}>
                        {item.attachment.sources.slice(0, 3).map((source, sourceIndex) => (
                          <Text
                            key={`${item.id}-source-${sourceIndex}`}
                            style={{
                              color: c.textSubtle,
                              fontFamily: ty.body.family,
                              fontSize: ty.sizes.xs,
                            }}
                          >
                            {source.title}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              }

              if (item.type === 'error_state') {
                return (
                  <View
                    key={item.id}
                    style={{
                      marginHorizontal: s.lg,
                      borderRadius: r.lg,
                      borderWidth: 1,
                      borderColor: `${c.danger}24`,
                      backgroundColor: c.surface,
                      padding: s.md,
                    }}
                  >
                    <View style={styles.cardHeaderRow}>
                      <Text
                        style={{
                          color: c.danger,
                          fontFamily: ty.body.familySemibold,
                          fontSize: 11,
                          letterSpacing: 0.8,
                        }}
                      >
                        COACH ERROR
                      </Text>
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss error card"
                        hitSlop={10}
                        onPress={() => handleDismissThreadItem(item.id)}
                        style={(pressed) => [
                          styles.dismissButton,
                          {
                            borderRadius: r.pill,
                            borderWidth: 1,
                            borderColor: c.border,
                            backgroundColor: pressed ? c.surface2 : 'transparent',
                          },
                        ]}
                      >
                        <TabBarIcon name="close" color={c.textMuted} size={14} />
                      </PressableScale>
                    </View>
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.sm,
                        marginTop: s.xs,
                      }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={{
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.sm,
                        lineHeight: 20,
                        marginTop: s.xs,
                      }}
                    >
                      {item.message}
                    </Text>
                    <View style={[styles.errorActions, { gap: s.sm, marginTop: s.md }]}>
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel={item.retryLabel || 'Retry'}
                        onPress={chat.retryLastMessage}
                        style={(pressed) => [
                          styles.errorAction,
                          {
                            minHeight: 44,
                            borderRadius: r.md,
                            backgroundColor: pressed ? `${c.primary}CC` : c.primary,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: c.bg,
                            fontFamily: ty.body.familySemibold,
                            fontSize: ty.sizes.sm,
                          }}
                        >
                          {item.retryLabel || 'Retry'}
                        </Text>
                      </PressableScale>
                      <PressableScale
                        accessibilityRole="button"
                        accessibilityLabel="Open coach context"
                        onPress={() => setIsContextOpen(true)}
                        style={(pressed) => [
                          styles.errorAction,
                          {
                            minHeight: 44,
                            borderRadius: r.md,
                            borderWidth: 1,
                            borderColor: c.border,
                            backgroundColor: pressed ? c.surface2 : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: c.textMuted,
                            fontFamily: ty.body.familySemibold,
                            fontSize: ty.sizes.sm,
                          }}
                        >
                          Open context
                        </Text>
                      </PressableScale>
                    </View>
                  </View>
                );
              }

              return null;
            })}
            {chat.isSending ? <TypingIndicator visible /> : null}
          </View>
        </ScrollView>

        {!isViewingHistory && messages.length > 0 ? (
          <CoachPromptLauncherRow
            prompts={visiblePromptSuggestions}
            onSelect={(prompt) => handleSend(prompt.label)}
          />
        ) : null}

        <ChatInputBar
          onSend={handleSend}
          onQuickActionsPress={() => setIsActionsOpen(true)}
          disabled={!chat.canSendMessage || isViewingHistory}
          bottomOffset={aiCoachTabBarOffset}
          placeholder={
            isViewingHistory
              ? 'Return to live chat to continue this conversation'
              : chat.canSendMessage
                ? 'Ask your coach what matters now...'
                : 'Daily coach limit reached'
          }
          quickActionLabel="Open coach actions"
        />
      </KeyboardAvoidingView>

      <CoachBriefSheet visible={isContextOpen} state={dashboard} onClose={() => setIsContextOpen(false)} />
      <CoachActionsSheet
        visible={isActionsOpen}
        items={interventions}
        onClose={() => setIsActionsOpen(false)}
        onSelect={(item) => {
          setIsActionsOpen(false);
          setSelectedInterventionId(item.id);
        }}
      />
      <CoachHistorySheet
        visible={isHistoryOpen}
        items={conversationSummaries}
        activeConversationId={activeConversationId}
        locked={!historyAccess.hasAccess}
        upgradeTier={historyAccess.upgradeTier}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={handleSelectHistory}
        onClearHistory={historyAccess.hasAccess ? handleClearHistory : undefined}
      />
      <CoachMemorySheet
        visible={isMemoryOpen}
        items={memoryItems}
        onClose={() => setIsMemoryOpen(false)}
        onResolve={(item) => handleResolveMemory(item.id)}
        onDismiss={(item) => handleDismissMemory(item.id)}
      />
      <CoachInterventionReviewSheet
        visible={!!selectedIntervention}
        intervention={selectedIntervention}
        onClose={() => setSelectedInterventionId(null)}
        onApply={handleApplyIntervention}
        onReject={handleRejectIntervention}
        isApplying={activeMutationId === selectedIntervention?.id}
        isRejecting={activeMutationId === selectedIntervention?.id}
      />
    </PremiumBackground>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  emptyState: {
    minHeight: 460,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextStrip: {
    flexDirection: 'row',
    width: '100%',
  },
  contextPill: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyPromptGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyPromptCard: {
    width: '48.5%',
    minHeight: 104,
  },
  emptyPromptIcon: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyBannerAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dismissButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  overlayDismissButton: {
    position: 'absolute',
    zIndex: 2,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  threadStack: {
    gap: 12,
  },
  inlineChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorActions: {
    flexDirection: 'row',
  },
  errorAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
});
