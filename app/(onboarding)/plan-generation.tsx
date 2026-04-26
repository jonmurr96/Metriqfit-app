import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';

import { useAuth } from '../../lib/auth';
import { useGenerationHistory } from '../../hooks/usePlan';
import { triggerPlanGeneration } from '../../services/planService';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';


const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const LOADING_STEPS = [
  { id: 1, label: 'Analyzing Body Composition', icon: 'scan' },
  { id: 2, label: 'Calculating Metabolic Targets', icon: 'flame' },
  { id: 3, label: 'Optimizing Workout Split', icon: 'barbell' },
  { id: 4, label: 'Generating Elite Plan', icon: 'flash' },
  { id: 5, label: 'Finalizing Details', icon: 'checkmark-circle' },
];

// ─── Animated Gradient Mesh Background ───
interface BlobConfig {
  color: string;
  size: number;
  initialX: number;
  initialY: number;
  translateX: number;
  translateY: number;
  duration: number;
  delay: number;
}

const BLOBS: BlobConfig[] = [
  {
    color: 'rgba(34, 211, 238, 0.06)',
    size: 420,
    initialX: SCREEN_W * 0.1,
    initialY: SCREEN_H * 0.15,
    translateX: SCREEN_W * 0.55,
    translateY: SCREEN_H * 0.3,
    duration: 16000,
    delay: 0,
  },
  {
    color: 'rgba(59, 130, 246, 0.05)',
    size: 480,
    initialX: SCREEN_W * 0.5,
    initialY: SCREEN_H * 0.6,
    translateX: -SCREEN_W * 0.45,
    translateY: -SCREEN_H * 0.35,
    duration: 20000,
    delay: 2500,
  },
  {
    color: 'rgba(6, 182, 212, 0.05)',
    size: 360,
    initialX: SCREEN_W * 0.6,
    initialY: SCREEN_H * 0.2,
    translateX: -SCREEN_W * 0.5,
    translateY: SCREEN_H * 0.45,
    duration: 18000,
    delay: 5000,
  },
];

function AnimatedBlob({ config }: { config: BlobConfig }) {
  const { color, size, initialX, initialY, translateX, translateY, duration, delay } = config;
  return (
    <MotiView
      from={{ opacity: 0.5, translateX: initialX, translateY: initialY, scale: 1 }}
      animate={{
        opacity: [0.5, 0.85, 0.5],
        translateX: [initialX, initialX + translateX, initialX],
        translateY: [initialY, initialY + translateY, initialY],
        scale: [1, 1.12, 1],
      }}
      transition={{ type: 'timing', duration, delay, loop: true, repeatReverse: false }}
      style={[styles.blob, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}
    />
  );
}

function GradientMeshBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BLOBS.map((blob, index) => (
        <AnimatedBlob key={index} config={blob} />
      ))}
    </View>
  );
}

// ─── Crystalline Orbital Prism Loader ───
function OrbitalRing({
  size,
  duration,
  rotateAxis,
  tiltX,
  tiltY,
  borderColor,
}: {
  size: number;
  duration: number;
  rotateAxis: 'x' | 'y' | 'z';
  tiltX: string;
  tiltY: string;
  borderColor: string;
}) {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [rotation, duration]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotateTransform =
      rotateAxis === 'x'
        ? { rotateX: `${rotation.value}deg` }
        : rotateAxis === 'y'
          ? { rotateY: `${rotation.value}deg` }
          : { rotateZ: `${rotation.value}deg` };

    return {
      transform: [
        { perspective: 400 },
        { rotateX: tiltX },
        { rotateY: tiltY },
        rotateTransform,
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.orbitalRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
          borderWidth: 1.5,
          shadowColor: borderColor,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 8,
          shadowOpacity: 0.4,
        },
        animatedStyle,
      ]}
    />
  );
}

function FloatingLogo() {
  const floatY = useSharedValue(0);
  const tilt = useSharedValue(0);
  const glow = useSharedValue(0);

  React.useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(12, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    tilt.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { perspective: 300 },
      { rotateY: `${tilt.value * 12}deg` },
      { rotateX: `${tilt.value * 6}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.9 + glow.value * 0.25 }],
  }));

  return (
    <View style={styles.logoContainer}>
      {/* Pulsing glow behind logo */}
      <Animated.View
        style={[
          styles.logoGlow,
          glowStyle,
          {
            backgroundColor: 'rgba(34, 211, 238, 0.25)',
            shadowColor: '#22D3EE',
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 40,
            shadowOpacity: 0.6,
          },
        ]}
      />
      {/* Logo image with 3D float */}
      <Animated.View style={logoStyle}>
        <Image
          source={require('../../assets/brand/mf-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

function OrbitingParticle({
  size,
  orbitDuration,
  orbitRadius,
  startAngle,
  color,
}: {
  size: number;
  orbitDuration: number;
  orbitRadius: number;
  startAngle: number;
  color: string;
}) {
  const angle = useSharedValue(startAngle);

  React.useEffect(() => {
    angle.value = withRepeat(
      withTiming(startAngle + 360, { duration: orbitDuration, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const particleStyle = useAnimatedStyle(() => {
    const rad = (angle.value * Math.PI) / 180;
    const x = Math.cos(rad) * orbitRadius;
    const y = Math.sin(rad) * orbitRadius * 0.35; // Elliptical flattening for 3D feel
    const scale = 0.5 + (Math.sin(rad) + 1) * 0.35; // Size varies with depth
    const opacity = 0.3 + (Math.sin(rad) + 1) * 0.35;

    return {
      transform: [{ translateX: x }, { translateY: y }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        particleStyle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 6,
          shadowOpacity: 0.8,
        },
      ]}
    />
  );
}

function CoreLoader() {
  const { c } = useTokens();
  const cyan = c.primary;
  const cyanFade = `${c.primary}50`;
  const whiteFade = 'rgba(255,255,255,0.25)';

  return (
    <View style={styles.prismContainer}>
      {/* Orbital rings — 3D tilted, rotating at different speeds */}
      <View style={styles.ringsLayer} pointerEvents="none">
        <OrbitalRing
          size={240}
          duration={12000}
          rotateAxis="y"
          tiltX="65deg"
          tiltY="15deg"
          borderColor={cyanFade}
        />
        <OrbitalRing
          size={200}
          duration={9000}
          rotateAxis="x"
          tiltX="15deg"
          tiltY="70deg"
          borderColor={whiteFade}
        />
        <OrbitalRing
          size={180}
          duration={7000}
          rotateAxis="z"
          tiltX="45deg"
          tiltY="45deg"
          borderColor={cyan}
        />
      </View>

      {/* Floating logo at center */}
      <FloatingLogo />

      {/* Orbiting particles */}
      <View style={styles.particlesLayer} pointerEvents="none">
        <OrbitingParticle size={5} orbitDuration={5000} orbitRadius={135} startAngle={0} color={cyan} />
        <OrbitingParticle size={4} orbitDuration={7000} orbitRadius={125} startAngle={72} color={whiteFade} />
        <OrbitingParticle size={6} orbitDuration={6000} orbitRadius={145} startAngle={144} color={cyan} />
        <OrbitingParticle size={3} orbitDuration={8000} orbitRadius={115} startAngle={216} color={whiteFade} />
        <OrbitingParticle size={5} orbitDuration={5500} orbitRadius={140} startAngle={288} color={cyan} />
        <OrbitingParticle size={4} orbitDuration={6500} orbitRadius={130} startAngle={36} color={cyanFade} />
      </View>
    </View>
  );
}
// ─── Step Timeline ───
function StepTimeline({ currentStep }: { currentStep: number }) {
  const { c, ty } = useTokens();

  return (
    <View style={styles.timelineContainer}>
      {LOADING_STEPS.map((step, index) => {
        const isComplete = index < currentStep;
        const isActive = index === currentStep;
        const isPending = index > currentStep;

        return (
          <MotiView
            key={step.id}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 400, delay: index * 80 }}
            style={styles.timelineRow}
          >
            {/* Connector line */}
            {index < LOADING_STEPS.length - 1 && (
              <View
                style={[
                  styles.timelineConnector,
                  {
                    backgroundColor: index < currentStep ? c.primary : 'rgba(255,255,255,0.08)',
                  },
                ]}
              />
            )}

            {/* Step indicator */}
            <View style={styles.timelineLeft}>
              <MotiView
                animate={{
                  scale: isActive ? [1, 1.15, 1] : 1,
                  shadowOpacity: isActive ? [0.3, 0.8, 0.3] : 0,
                }}
                transition={{ type: 'timing', duration: 1500, loop: isActive }}
                style={[
                  styles.timelineDot,
                  {
                    backgroundColor: isComplete ? c.primary : isActive ? `${c.primary}30` : 'transparent',
                    borderColor: isComplete ? c.primary : isActive ? c.primary : 'rgba(255,255,255,0.15)',
                    shadowColor: c.primary,
                  },
                ]}
              >
                {isComplete && (
                  <MotiView from={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
                    <Text style={[styles.checkmark, { color: c.bg }]}>✓</Text>
                  </MotiView>
                )}
                {isActive && (
                  <MotiView
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ type: 'timing', duration: 1000, loop: true }}
                    style={[styles.pulseDotInner, { backgroundColor: c.primary }]}
                  />
                )}
              </MotiView>
            </View>

            {/* Step label */}
            <View style={styles.timelineRight}>
              <Text
                style={[
                  styles.timelineLabel,
                  {
                    color: isComplete ? c.text : isActive ? c.primary : 'rgba(255,255,255,0.3)',
                    fontFamily: isActive ? ty.heading.familySemibold : ty.body.family,
                    textShadowColor: isActive ? `${c.primary}60` : 'transparent',
                    textShadowRadius: isActive ? 12 : 0,
                    textShadowOffset: isActive ? { width: 0, height: 0 } : { width: 0, height: 0 },
                  },
                ]}
              >
                {step.label}
              </Text>
              {isActive && (
                <MotiView
                  from={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 40 }}
                  transition={{ type: 'timing', duration: 600 }}
                  style={[styles.activeLine, { backgroundColor: c.primary }]}
                />
              )}
            </View>
          </MotiView>
        );
      })}
    </View>
  );
}

// ─── Main Screen ───
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
          generation_version: 'v1',
          generation_mode: 'initial',
          strict_days_match: true,
          strict_template_source: true,
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
        const errorStep = error?.step || 'unknown';
        const errorRequestId = error?.requestId || 'N/A';
        const errorCode = error?.errorCode || error?.error_code || null;
        const isTemplateSelectionUnsupported = errorCode === 'template_selection_unsupported';

        console.error('[PlanGeneration] Generation failed:', {
          message: errorMessage,
          errorCode,
          step: errorStep,
          requestId: errorRequestId,
        });

        setGenerationError(errorMessage);

        if (/limit reached/i.test(errorMessage) && latestRunId) {
          goToPlanReview(latestRunId, ['Generation limit reached. Loaded your most recent generated plan.']);
          return;
        }

        let alertMessage = isTemplateSelectionUnsupported
          ? 'Your current training setup does not match a supported workout template yet.\n\nGo back to Training and adjust your workout days, equipment, or split preference, then try again.'
          : errorMessage;
        if (errorStep !== 'unknown') alertMessage += `\n\nFailed at step: ${errorStep}`;
        if (errorRequestId !== 'N/A') alertMessage += `\nRequest ID: ${errorRequestId}`;
        const errorDetails = error?.details;
        if (errorDetails && !isTemplateSelectionUnsupported) {
          const detailText = typeof errorDetails === 'string' ? errorDetails : JSON.stringify(errorDetails, null, 2);
          alertMessage += `\n\nDetails: ${detailText}`;
        }

        Alert.alert(
          'Generation Issue',
          alertMessage,
          [
            { text: 'Retry', onPress: handleRetry },
            {
              text: isTemplateSelectionUnsupported
                ? 'Back to Training'
                : latestRunId
                  ? 'Open Latest Plan'
                  : 'Back to Onboarding',
              style: 'cancel',
              onPress: () => {
                if (isTemplateSelectionUnsupported) {
                  router.replace('/(onboarding)/training');
                  return;
                }
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
      {/* Atmospheric background */}
      <GradientMeshBackground />

      <View style={[styles.content, { paddingTop: insets.top + s.lg, paddingBottom: insets.bottom + s.lg }]}>
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600 }}
          style={styles.header}
        >
          <Text style={[styles.headerTitle, { color: c.primary, fontFamily: ty.heading.family }]}>
            Forging your plan
          </Text>
          <Text style={[styles.headerSubtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>
            This may take a moment
          </Text>
        </MotiView>

        {/* Ripple Pulse Core */}
        <View style={styles.coreWrapper}>
          <CoreLoader />
        </View>

        {/* Step Timeline */}
        <View style={styles.timelineWrapper}>
          <StepTimeline currentStep={currentStep} />
        </View>

        {/* Error State */}
        <AnimatePresence>
          {generationError && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0 }}
              style={styles.errorContainer}
            >
              <Text style={[styles.errorText, { color: c.danger, fontFamily: ty.body.familyMedium }]}>
                {generationError}
              </Text>
              <View style={styles.errorActions}>
                <Pressable
                  style={[styles.glassButton, { borderColor: 'rgba(255,255,255,0.12)' }]}
                  onPress={handleRetry}
                >
                  <Text style={[styles.glassButtonText, { color: c.text, fontFamily: ty.body.familySemibold }]}>
                    Retry
                  </Text>
                </Pressable>
                {latestRunId && (
                  <Pressable
                    style={[styles.glassButton, { borderColor: 'rgba(255,255,255,0.12)' }]}
                    onPress={() => goToPlanReview(latestRunId)}
                  >
                    <Text style={[styles.glassButtonText, { color: c.text, fontFamily: ty.body.familySemibold }]}>
                      Open latest plan
                    </Text>
                  </Pressable>
                )}
              </View>
            </MotiView>
          )}
        </AnimatePresence>

        {/* Warnings */}
        <AnimatePresence>
          {generationWarnings.length > 0 && !generationError && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              style={styles.warningContainer}
            >
              <View style={[styles.warningCard, { backgroundColor: 'rgba(10,17,40,0.7)', borderColor: `${c.primary}30` }]}>
                <Text style={[styles.warningTitle, { color: c.primary, fontFamily: ty.body.familySemibold }]}>
                  Plan Adjustments Applied
                </Text>
                {generationWarnings.slice(0, 3).map((warning, idx) => (
                  <Text key={idx} style={[styles.warningItem, { color: c.textMuted, fontFamily: ty.body.family }]}>
                    • {warning}
                  </Text>
                ))}
              </View>
            </MotiView>
          )}
        </AnimatePresence>

        {/* Continue Button (when complete with warnings) */}
        <AnimatePresence>
          {isComplete && generationWarnings.length > 0 && (
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ marginTop: s.lg }}
            >
              <Pressable
                style={[styles.continueButton, { backgroundColor: c.primary }]}
                onPress={() => goToPlanReview(generatedRunId || undefined, generationWarnings)}
                accessibilityRole="button"
                accessibilityLabel="Continue to plan review"
              >
                <Text style={[styles.continueText, { color: c.bg, fontFamily: ty.body.familySemibold }]}>
                  Continue
                </Text>
              </Pressable>
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },

  // Header
  header: {
    alignItems: 'center',
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 22,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.7,
  },

  // Core
  coreWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  // Crystalline Prism
  prismContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringsLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitalRing: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  particlesLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },

  // Timeline
  timelineWrapper: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 20,
  },
  timelineContainer: {
    width: '100%',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  timelineLeft: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    elevation: 3,
  },
  pulseDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  timelineConnector: {
    position: 'absolute',
    left: 17,
    top: 29,
    width: 1.5,
    height: 18,
  },
  timelineRight: {
    flex: 1,
    justifyContent: 'center',
  },
  timelineLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  activeLine: {
    height: 2,
    borderRadius: 1,
    marginTop: 4,
    opacity: 0.5,
  },

  // Error
  errorContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  glassButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  glassButtonText: {
    fontSize: 13,
  },

  // Warning
  warningContainer: {
    width: '100%',
    maxWidth: 320,
    marginBottom: 16,
  },
  warningCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  warningTitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  warningItem: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Continue
  continueButton: {
    minWidth: 160,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 0.35,
    elevation: 5,
  },
  continueText: {
    fontSize: 15,
  },
});
