import { StyleSheet, View, Text, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { MotiView } from 'moti';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { PremiumBackground } from '../../../components/premium/PremiumBackground';
import {
  CoachContextCard,
  SuggestionChips,
  MessageBubble,
  TypingIndicator,
  ChatInputBar,
  PlanUpdateCard,
} from '../../../components/ai-coach';
import { useAuth } from '../../../lib/auth/AuthProvider';
import { useAIChat, useSuggestedPrompts, useConsistencyRecommendation } from '../../../hooks/useAICoach';
import { useUserDashboard, useWorkoutsThisWeek } from '../../../hooks/useUser';
import { useDailyTotals } from '../../../hooks/useNutrition';
import { usePrepCoachState } from '../../../hooks/usePrepCoach';

export default function AICoachScreen() {
  const { user } = useAuth();
  const { c, s, ty, r, animation } = useTokens();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch data
  const {
    targets,
    calorieTarget,
    proteinTarget,
    isLoading: targetsLoading
  } = useUserDashboard();
  const { data: workoutsThisWeekData } = useWorkoutsThisWeek();
  const { data: prepState } = usePrepCoachState();
  const today = new Date().toISOString().split('T')[0];
  const { data: nutritionSummary } = useDailyTotals(today);

  // AI Chat hooks
  const {
    messages,
    rateLimit,
    isSending,
    sendMessage,
    canSendMessage,
    remainingMessages,
    sendError,
  } = useAIChat(user?.id);

  const { data: consistencyRecommendation } = useConsistencyRecommendation(user?.id);

  // Suggested prompts
  const { data: suggestedPrompts } = useSuggestedPrompts(
    !!nutritionSummary && (nutritionSummary?.calories || 0) > 0,
    false,
    consistencyRecommendation,
    prepState
      ? {
          prepModeEnabled: prepState.enabled,
          prepPhase: prepState.phase,
          prepDiscipline: prepState.discipline,
        }
      : null,
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = (text: string) => {
    if (!canSendMessage) return;
    sendMessage(text);
  };

  const handleSuggestionSelect = (suggestion: { id: string; label: string; icon: string }) => {
    handleSendMessage(suggestion.label);
  };

  // Calculate context for display
  const caloriesRemaining = (calorieTarget || 2000) - (nutritionSummary?.calories || 0);
  const proteinRemaining = (proteinTarget || 150) - (nutritionSummary?.protein || 0);

  return (
    <PremiumBackground variant="subtle">
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + s.lg, paddingBottom: 180 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: animation.duration.normal }}
            style={[styles.header, { paddingHorizontal: s.xl }]}
          >
            <View>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                  letterSpacing: 1.5,
                  marginBottom: s.xs,
                }}
              >
                POWERED BY AI
              </Text>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.heading.family,
                  fontSize: ty.sizes.h2,
                  letterSpacing: -0.5,
                }}
              >
                AI Coach
              </Text>
            </View>
            <View
              style={[
                styles.headerBadge,
                {
                  backgroundColor: 'transparent',
                  borderRadius: r.pill,
                  borderWidth: 2,
                  borderColor: c.primary,
                  ...(Platform.OS === 'web' ? {
                    boxShadow: `0 0 12px ${c.primary}40`,
                  } : {}),
                },
              ]}
            >
              <TabBarIcon name="sparkles" color={c.primary} size={14} />
              <Text
                style={{
                  color: c.primary,
                  fontFamily: ty.body.familySemibold,
                  fontSize: 11,
                  marginLeft: 4,
                }}
              >
                {rateLimit?.messagesLimit === -1
                  ? 'Unlimited'
                  : `${remainingMessages} left today`}
              </Text>
            </View>
          </MotiView>

          {/* Context Card */}
          <View style={{ paddingHorizontal: s.lg, marginTop: s.lg }}>
            <CoachContextCard
              caloriesRemaining={Math.max(0, caloriesRemaining)}
              proteinRemaining={Math.max(0, proteinRemaining)}
              workoutsThisWeek={workoutsThisWeekData ?? 0}
              isOnboarded={!targetsLoading && !!targets}
            />
          </View>

          {prepState?.enabled && (
            <View
              style={{
                marginTop: s.md,
                marginHorizontal: s.lg,
                padding: s.md,
                borderRadius: r.md,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Text
                style={{
                  color: c.primary,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                }}
              >
                Prep Context
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  marginTop: s.xs,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.sm,
                }}
              >
                {prepState.discipline || 'prep'} • {prepState.phase || 'phase'}
                {prepState.lastAdjustment?.coach_summary ? ` | ${prepState.lastAdjustment.coach_summary}` : ''}
              </Text>
            </View>
          )}

          {consistencyRecommendation?.title && (
            <View
              style={{
                marginTop: s.lg,
                marginHorizontal: s.lg,
                padding: s.md,
                borderRadius: r.md,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <Text
                style={{
                  color: c.primary,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                }}
              >
                {consistencyRecommendation.title}
              </Text>
              {consistencyRecommendation.message && (
                <Text
                  style={{
                    color: c.textMuted,
                    marginTop: s.xs,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.sm,
                  }}
                >
                  {consistencyRecommendation.message}
                </Text>
              )}
            </View>
          )}

          {/* Suggestion Chips */}
          {suggestedPrompts && suggestedPrompts.length > 0 && (
            <View style={{ marginTop: s.xl }}>
              <SuggestionChips suggestions={suggestedPrompts} onSelect={handleSuggestionSelect} />
            </View>
          )}

          {/* Conversation Section */}
          <View style={[styles.conversationSection, { marginTop: s.xl }]}>
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ type: 'timing', duration: 300, delay: 400 }}
              style={{ paddingHorizontal: s.lg, marginBottom: s.sm }}
            >
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.xs,
                  letterSpacing: 1.5,
                }}
              >
                CONVERSATION
              </Text>
            </MotiView>

            {messages.length === 0 ? (
              <MotiView
                from={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 300, delay: 500 }}
                style={[
                  styles.emptyState,
                  {
                    marginHorizontal: s.lg,
                    backgroundColor: c.surface,
                    borderRadius: r.xl,
                    borderWidth: 1,
                    borderColor: c.border,
                    padding: s.xxl,
                  },
                ]}
              >
                <View
                  style={[
                    styles.emptyIcon,
                    { backgroundColor: c.opacity.primaryLight },
                  ]}
                >
                  <TabBarIcon name="sparkles" color={c.primary} size={32} />
                </View>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.heading.familySemibold,
                    fontSize: ty.sizes.lg,
                    textAlign: 'center',
                    marginTop: s.md,
                  }}
                >
                  Start a conversation
                </Text>
                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.sm,
                    textAlign: 'center',
                    marginTop: s.xs,
                    lineHeight: 20,
                  }}
                >
                  Ask about your nutrition, workouts, or get personalized advice
                </Text>
              </MotiView>
            ) : (
              <View style={styles.messagesContainer}>
                {messages.map((msg, index) => {
                  if (msg.content.startsWith('[PLAN_UPDATE]')) {
                    try {
                      const jsonStr = msg.content.replace('[PLAN_UPDATE]', '').trim();
                      const planData = JSON.parse(jsonStr);
                      return (
                        <PlanUpdateCard
                          key={msg.id}
                          dayName={planData.dayName}
                          changes={planData.changes}
                          onApprove={() => Alert.alert('Approved', 'Plan updated successfully!')}
                          onReject={() => Alert.alert('Rejected', 'Changes discarded.')}
                        />
                      );
                    } catch {
                      return <MessageBubble key={msg.id} message="Error parsing plan update" sender="coach" />;
                    }
                  }

                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg.content}
                      sender={msg.role === 'user' ? 'user' : 'coach'}
                      timestamp={new Date(msg.created_at).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      animated
                      delay={index * 100}
                    />
                  );
                })}
                {isSending && <TypingIndicator visible />}
              </View>
            )}

            {/* Error Banner */}
            {sendError && (
              <View
                style={{
                  backgroundColor: c.opacity.dangerLight,
                  borderRadius: r.md,
                  padding: s.md,
                  marginHorizontal: s.lg,
                  marginTop: s.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <TabBarIcon name="alert-circle" color={c.danger} size={16} />
                <Text
                  style={{
                    color: c.danger,
                    fontFamily: ty.body.familyMedium,
                    fontSize: ty.sizes.sm,
                    marginLeft: s.sm,
                    flex: 1,
                  }}
                >
                  {sendError instanceof Error ? sendError.message : 'Failed to send message'}
                </Text>
              </View>
            )}
          </View>

          {/* Disclaimer */}
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 300, delay: 600 }}
            style={[
              styles.disclaimer,
              {
                marginHorizontal: s.lg,
                marginTop: s.xl,
                backgroundColor: c.opacity.warningLight,
                borderRadius: r.md,
                padding: s.md,
              },
            ]}
          >
            <TabBarIcon name="information-circle" color={c.warning} size={16} />
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
                marginLeft: s.sm,
                flex: 1,
                lineHeight: 16,
              }}
            >
              AI Coach provides general fitness guidance. Not a substitute for professional medical advice.
            </Text>
          </MotiView>
        </ScrollView>

        {/* Input Bar */}
        <ChatInputBar onSend={handleSendMessage} />
      </KeyboardAvoidingView>
    </PremiumBackground>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  conversationSection: {},
  emptyState: {
    alignItems: 'center',
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    paddingBottom: 8,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
