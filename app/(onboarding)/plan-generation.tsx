import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { useAuth } from '../../lib/auth';
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

    // State
    const [currentStep, setCurrentStep] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const generationStarted = useRef(false);

    // Animation Effect
    useEffect(() => {
        // Progress steps visually even if generation is faster/slower
        // We want to show at least some progress
        const interval = setInterval(() => {
            setCurrentStep((prev) => {
                if (generationError) return prev; // Stop if error

                // Keep cycling correctly until finished
                if (prev < LOADING_STEPS.length - 1) {
                    return prev + 1;
                }
                return prev;
            });
        }, 2500); // 2.5s per step to allow time for API

        return () => clearInterval(interval);
    }, [generationError]);

    // Generation Effect
    useEffect(() => {
        const generate = async () => {
            if (generationStarted.current || !user?.id) return;

            generationStarted.current = true;
            setIsGenerating(true);
            setGenerationError(null);

            try {
                console.log('[PlanGeneration] Triggering AI generation for user:', user.id);

                // Minimum wait time for UX (so it feels substantial)
                const startTime = Date.now();

                await triggerPlanGeneration(user.id, 'both');

                const elapsed = Date.now() - startTime;
                const minTime = 3000; // 3 seconds min

                if (elapsed < minTime) {
                    await new Promise(resolve => setTimeout(resolve, minTime - elapsed));
                }

                // Success!
                console.log('[PlanGeneration] Generation successful');

                // Force step to end
                setCurrentStep(LOADING_STEPS.length - 1);

                // Navigate after short delay
                setTimeout(() => {
                    router.replace('/(onboarding)/paywall');
                }, 1000);

            } catch (error: any) {
                console.error('[PlanGeneration] Generation failed:', error);
                setGenerationError(error.message || 'Failed to generate plan');

                Alert.alert(
                    'Generation Issue',
                    'We encountered an issue creating your customized plan. You can retry or continue to the app.',
                    [
                        {
                            text: 'Retry',
                            onPress: () => {
                                generationStarted.current = false;
                                setCurrentStep(0);
                                setGenerationError(null);
                                // Effect will run again because strict mode re-mounts or we force update? 
                                // Actually ref prevents re-run. We need to reset ref and trigger.
                                // Best way is to reload component or simpler: call generate() manually.
                                generate();
                            }
                        },
                        {
                            text: 'Skip',
                            style: 'cancel',
                            onPress: () => router.replace('/(onboarding)/paywall')
                        }
                    ]
                );
            } finally {
                setIsGenerating(false);
            }
        };

        generate();
    }, [user?.id]);

    return (
        <View style={[styles.container, { backgroundColor: c.bg }]}>
            <LinearGradient
                colors={[c.bg, '#0a101f']}
                style={StyleSheet.absoluteFill}
            />

            <View style={[styles.content, { paddingTop: insets.top + s.xxl }]}>
                {/* Pulsing Core Animation */}
                <View style={styles.animationContainer}>
                    <MotiView
                        from={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 1.2, opacity: 0 }}
                        transition={{
                            type: 'timing',
                            duration: 2000,
                            loop: true,
                        }}
                        style={[styles.pulseRing, { borderColor: c.primary, borderWidth: 2 }]}
                    />
                    <MotiView
                        from={{ scale: 1, opacity: 0.8 }}
                        animate={{ scale: 1.1, opacity: 0.2 }}
                        transition={{
                            type: 'timing',
                            duration: 2000,
                            loop: true,
                            delay: 500,
                        }}
                        style={[styles.pulseRing, { borderColor: c.primary, borderWidth: 1 }]}
                    />
                    <View style={[styles.coreCircle, { backgroundColor: c.surface2 }]}>
                        <TabBarIcon name="logo-electron" color={c.primary} size={48} />
                    </View>
                </View>

                {/* Dynamic Loading Text */}
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
                            <Text style={[styles.stepLabel, { color: c.primary, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }]}>
                                {LOADING_STEPS[currentStep].label}
                            </Text>
                            <View style={{ marginTop: s.md }}>
                                <TabBarIcon
                                    name={LOADING_STEPS[currentStep].icon as any}
                                    color={c.textMuted}
                                    size={24}
                                />
                            </View>
                        </MotiView>
                    </AnimatePresence>
                </View>

                {/* Error State */}
                {generationError && (
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ marginTop: s.lg }}
                    >
                        <Text style={{ color: c.danger, textAlign: 'center', fontFamily: ty.body.familyMedium }}>
                            Connection issue... Retrying
                        </Text>
                    </MotiView>
                )}

                {/* Progress Indicators */}
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
});
