import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { useAuth } from '../../lib/auth';
import { useGenerationHistory } from '../../hooks/usePlan';
import { triggerPlanGeneration } from '../../services/planService';

const LOADING_STEPS = [
  { id: 1, label: 'Analyzing Body Composition...', icon: 'scan-outline' },
  { id: 2, label: 'Calculating Metabolic Targets...', icon: 'flame-outline' },
  { id: 3, label: 'Optimizing Workout Split...', icon: 'barbell-outline' },
  { id: 4, label: 'Generating Elite Plan...', icon: 'flash-outline' },
  { id: 5, label: 'Finalizing Details...', icon: 'checkmark-circle-outline' },
];

export default function PlanGenerationScreen() {
  const { c, s, ty } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: generationHistory } = useGenerationHistory();
  const latestRunId = generationHistory?.[0]?.id;

  const [currentStep, setCurrentStep] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);
  const [generatedRunId, setGeneratedRunId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const generationStarted = useRef(false);

  const goToPlanReview = useCallback((runId?: string, warnings: string[] = []) => {
    router.replace({
      pathname: '/(onboarding)/plan-review',
      params: {
        ...(runId ? { runId } : {}),
        ...(warnings.length ? { warnings: JSON.stringify(warnings) } : {}),
      },
    });
  }, [router]);

  const handleRetry = useCallback(() => {
    generationStarted.current = false;
    setCurrentStep(0);
    setGenerationError(null);
    setRetryNonce((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (generationError) return prev;
        if (prev < LOADING_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [generationError]);

  useEffect(() => {
    const generate = async () => {
      if (generationStarted.current || !user?.id) return;

      generationStarted.current = true;
      setGenerationError(null);
      setGenerationWarnings([]);
      setGeneratedRunId(null);
      setIsComplete(false);

      try {
        const startTime = Date.now();
        const result = await triggerPlanGeneration(user.id, 'both', {
          generation_mode: 'initial',
          strict_days_match: true,
          strict_macro_mode: true,
          variety_profile: 'moderate_rotation_4_5',
          macro_tolerance_percent: 5,
        });

        const warnings = (result.warnings || []).filter(Boolean);
        setGenerationWarnings(warnings);
        setGeneratedRunId(result.runId || null);

        const elapsed = Date.now() - startTime;
        if (elapsed < 3000) {
          await new Promise((resolve) => setTimeout(resolve, 3000 - elapsed));
        }

        setCurrentStep(LOADING_STEPS.length - 1);
        setIsComplete(true);

        setTimeout(() => {
          goToPlanReview(result.runId, warnings);
        }, warnings.length ? 250 : 1000);
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to generate plan';
        setGenerationError(errorMessage);

        if (/limit reached/i.test(errorMessage) && latestRunId) {
          goToPlanReview(latestRunId, ['Generation limit reached. Loaded your most recent generated plan.']);
          return;
        }

        Alert.alert(
          'Generation Issue',
          errorMessage,
          [
            {
              text: 'Retry',
              onPress: handleRetry,
            },
            {
              text: latestRunId ? 'Open Latest Plan' : 'Back to Onboarding',
              style: 'cancel',
              onPress: () => {
                if (latestRunId) {
                  goToPlanReview(latestRunId);
                  return;
                }
                router.replace('/(onboarding)/nutrition');
              },
            },
          ],
        );
      }
    };

    generate();
  }, [goToPlanReview, handleRetry, latestRunId, retryNonce, router, user?.id]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <LinearGradient colors={[c.bg, '#0a101f']} style={StyleSheet.absoluteFill} />

      <View style={[styles.content, { paddingTop: insets.top + s.xxl }]}>
        <View style={styles.animationContainer}>
          <MotiView
            from={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ type: 'timing', duration: 2000, loop: true }}
            style={[styles.pulseRing, { borderColor: c.primary, borderWidth: 2 }]}
          />
          <MotiView
            from={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.1, opacity: 0.2 }}
            transition={{ type: 'timing', duration: 2000, loop: true, delay: 500 }}
            style={[styles.pulseRing, { borderColor: c.primary, borderWidth: 1 }]}
          />
          <View style={[styles.coreCircle, { backgroundColor: c.surface2 }]}>
            <TabBarIcon name="logo-electron" color={c.primary} size={48} />
          </View>
        </View>

        <View style={styles.stepsContainer}>
          <AnimatePresence exitBeforeEnter>
            <MotiView
              key={currentStep}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -10 }}
              transition={{ type: 'timing', duration: 300 }}
              style={styles.stepWrapper}
            >
              <Text
                style={[
                  styles.stepLabel,
                  { color: c.primary, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg },
                ]}
              >
                {LOADING_STEPS[currentStep].label}
              </Text>
              <View style={{ marginTop: s.md }}>
                <TabBarIcon name={LOADING_STEPS[currentStep].icon as any} color={c.textMuted} size={24} />
              </View>
            </MotiView>
          </AnimatePresence>
        </View>

        {generationError ? (
          <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: s.lg }}>
            <Text style={{ color: c.danger, textAlign: 'center', fontFamily: ty.body.familyMedium }}>
              {generationError}
            </Text>
            <View style={styles.errorActions}>
              <Pressable
                style={[styles.errorActionButton, { borderColor: c.border, backgroundColor: c.surface }]}
                onPress={handleRetry}
              >
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>Retry</Text>
              </Pressable>
              {latestRunId ? (
                <Pressable
                  style={[styles.errorActionButton, { borderColor: c.border, backgroundColor: c.surface }]}
                  onPress={() => goToPlanReview(latestRunId)}
                >
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>Open latest plan</Text>
                </Pressable>
              ) : null}
            </View>
          </MotiView>
        ) : null}

        {generationWarnings.length > 0 ? (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={[styles.warningCard, { backgroundColor: c.surface, borderColor: c.accent, marginTop: s.lg }]}
          >
            <Text style={[styles.warningTitle, { color: c.text, fontFamily: ty.body.familySemibold }]}>
              Plan Adjustments Applied
            </Text>
            {generationWarnings.slice(0, 3).map((warning, idx) => (
              <Text key={`${warning}-${idx}`} style={[styles.warningItem, { color: c.textMuted, fontFamily: ty.body.family }]}>
                • {warning}
              </Text>
            ))}
          </MotiView>
        ) : null}

        <View style={[styles.progressDots, { marginTop: s.xl }]}>
          {LOADING_STEPS.map((_, index) => (
            <MotiView
              key={index}
              animate={{
                backgroundColor: index <= currentStep ? c.primary : c.surface2,
                scale: index === currentStep ? 1.5 : 1,
              }}
              style={styles.dot}
            />
          ))}
        </View>

        {isComplete && generationWarnings.length > 0 ? (
          <Pressable
            style={[styles.continueButton, { backgroundColor: c.primary, marginTop: s.xl }]}
            onPress={() => goToPlanReview(generatedRunId || undefined, generationWarnings)}
            accessibilityRole="button"
            accessibilityLabel="Continue to plan review"
          >
            <Text style={[styles.continueText, { color: c.bg, fontFamily: ty.body.familySemibold }]}>
              Continue
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  animationContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  coreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  stepsContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepWrapper: {
    alignItems: 'center',
  },
  stepLabel: {
    textAlign: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  warningCard: {
    width: '86%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  warningTitle: {
    fontSize: 14,
  },
  warningItem: {
    fontSize: 12,
    lineHeight: 18,
  },
  errorActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  errorActionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  continueButton: {
    minWidth: 140,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontSize: 14,
  },
});
