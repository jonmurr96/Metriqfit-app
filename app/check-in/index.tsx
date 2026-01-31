import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { PremiumBackground } from '../../components/premium/PremiumBackground';
import { GlassCard } from '../../components/premium/GlassCard';
import { RingIconButton } from '../../components/common/RingIconButton';

type Step = 'metrics' | 'wellness' | 'photos' | 'analysis';

export default function CheckInScreen() {
    const { c, s, ty, r, shadow } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [currentStep, setCurrentStep] = useState<Step>('metrics');
    const [progress, setProgress] = useState(0.25);

    // Form Data
    const [weight, setWeight] = useState('188.4');
    const [sleep, setSleep] = useState(7);
    const [stress, setStress] = useState(4);
    const [energy, setEnergy] = useState(8);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        switch (currentStep) {
            case 'metrics': setProgress(0.25); break;
            case 'wellness': setProgress(0.50); break;
            case 'photos': setProgress(0.75); break;
            case 'analysis': setProgress(1.0); break;
        }
    }, [currentStep]);

    const handleNext = () => {
        if (currentStep === 'metrics') setCurrentStep('wellness');
        else if (currentStep === 'wellness') setCurrentStep('photos');
        else if (currentStep === 'photos') {
            setCurrentStep('analysis');
            startAnalysis();
        } else {
            router.back();
        }
    };

    const startAnalysis = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            setIsAnalyzing(false);
        }, 3000);
    };

    // --- Components ---

    const StepHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
        <View style={{ marginBottom: s.xl }}>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 24, marginBottom: 8 }}>
                {title}
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 16 }}>
                {subtitle}
            </Text>
        </View>
    );

    const Slider = ({ label, value, onChange }: any) => (
        <View style={{ marginBottom: s.xl }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ color: c.text, fontFamily: ty.body.familyMedium }}>{label}</Text>
                <Text style={{ color: c.primary, fontFamily: ty.mono.family, fontSize: 16 }}>{value}/10</Text>
            </View>
            <View style={{ height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <Pressable
                        key={num}
                        onPress={() => onChange(num)}
                        style={{
                            width: 28,
                            height: num === value ? 40 : 28,
                            backgroundColor: num <= value ? c.primary : c.surface2,
                            borderRadius: 4,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: num <= value ? 1 : 0.3
                        }}
                    >
                        {num === value && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.bg }} />}
                    </Pressable>
                ))}
            </View>
        </View>
    );

    const PhotoSlot = ({ label }: { label: string }) => (
        <Pressable style={{ flex: 1, aspectRatio: 0.75, borderWidth: 1, borderColor: c.border, borderRadius: r.md, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
            <TabBarIcon name="camera" color={c.textMuted} size={24} />
            <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8, fontFamily: ty.body.family }}>{label}</Text>
        </Pressable>
    );

    return (
        <View style={[styles.container, { backgroundColor: c.bg }]}>
            <LinearGradient colors={[c.surface, c.bg]} style={StyleSheet.absoluteFill} />

            {/* Progress Bar */}
            <View style={[styles.progressBarContainer, { paddingTop: insets.top }]}>
                <View style={{ height: 4, backgroundColor: c.surface2, width: '100%' }}>
                    <MotiView
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ type: 'timing', duration: 500 }}
                        style={{ height: '100%', backgroundColor: c.primary }}
                    />
                </View>
            </View>

            {/* Header Actions */}
            <View style={[styles.header, { marginTop: s.md }]}>
                <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
                    <TabBarIcon name="close" color={c.textMuted} size={24} />
                </Pressable>
                <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: 12 }}>
                    WEEKLY CHECK-IN
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>
                <AnimatePresence exitBeforeEnter>

                    {/* STEP 1: METRICS */}
                    {currentStep === 'metrics' && (
                        <MotiView
                            key="step1"
                            from={{ opacity: 0, translateX: 20 }}
                            animate={{ opacity: 1, translateX: 0 }}
                            exit={{ opacity: 0, translateX: -20 }}
                            transition={{ type: 'timing', duration: 300 }}
                        >
                            <StepHeader
                                title="Let's check the numbers."
                                subtitle="Update your current weight to help us adjust your calorie targets."
                            />

                            <View style={{ alignItems: 'center', marginTop: s.xxl }}>
                                <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
                                    <TextInput
                                        value={weight}
                                        onChangeText={setWeight}
                                        keyboardType="numeric"
                                        style={{
                                            color: c.text,
                                            fontSize: 64,
                                            fontFamily: ty.heading.familySemibold,
                                            borderBottomWidth: 2,
                                            borderBottomColor: c.primary,
                                            minWidth: 160,
                                            textAlign: 'center',
                                            paddingBottom: 8
                                        }}
                                    />
                                    <Text style={{ color: c.textMuted, fontSize: 24, marginBottom: 18, marginLeft: 8, fontFamily: ty.body.family }}>lbs</Text>
                                </View>
                                <Text style={{ color: c.success, marginTop: 16, fontFamily: ty.body.familyMedium }}>
                                    📉 1.2 lbs down from last week
                                </Text>
                            </View>
                        </MotiView>
                    )}

                    {/* STEP 2: WELLNESS */}
                    {currentStep === 'wellness' && (
                        <MotiView
                            key="step2"
                            from={{ opacity: 0, translateX: 20 }}
                            animate={{ opacity: 1, translateX: 0 }}
                            exit={{ opacity: 0, translateX: -20 }}
                            transition={{ type: 'timing', duration: 300 }}
                        >
                            <StepHeader
                                title="How are you feeling?"
                                subtitle="Your recovery dictates your intensity. Be honest."
                            />

                            <GlassCard intensity="light" style={{ padding: s.xl }}>
                                <Slider label="Sleep Quality" value={sleep} onChange={setSleep} />
                                <Slider label="Stress Level" value={stress} onChange={setStress} />
                                <Slider label="Energy Level" value={energy} onChange={setEnergy} />
                            </GlassCard>
                        </MotiView>
                    )}

                    {/* STEP 3: PHOTOS */}
                    {currentStep === 'photos' && (
                        <MotiView
                            key="step3"
                            from={{ opacity: 0, translateX: 20 }}
                            animate={{ opacity: 1, translateX: 0 }}
                            exit={{ opacity: 0, translateX: -20 }}
                            transition={{ type: 'timing', duration: 300 }}
                        >
                            <StepHeader
                                title="Visual Progress"
                                subtitle="The mirror doesn't lie. Add photos to track body composition changes."
                            />

                            <View style={{ flexDirection: 'row', gap: 12, height: 200 }}>
                                <PhotoSlot label="Front" />
                                <PhotoSlot label="Side" />
                                <PhotoSlot label="Back" />
                            </View>

                            <View style={{ marginTop: s.xl, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(34, 211, 238, 0.1)', padding: 16, borderRadius: r.md }}>
                                <TabBarIcon name="information-circle" color={c.primary} size={20} />
                                <Text style={{ color: c.text, flex: 1, fontSize: 12 }}>
                                    Photos are privately stored and only analyzed by AI for body fat estimation.
                                </Text>
                            </View>
                        </MotiView>
                    )}

                    {/* STEP 4: ANALYSIS */}
                    {currentStep === 'analysis' && (
                        <MotiView
                            key="step4"
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'timing', duration: 300 }}
                        >
                            {isAnalyzing ? (
                                <View style={{ alignItems: 'center', justifyContent: 'center', height: 400 }}>
                                    <View style={[styles.pulse, { backgroundColor: c.primary, shadowColor: c.primary }]} />
                                    <Text style={{ color: c.text, marginTop: 32, fontFamily: ty.heading.familySemibold, fontSize: 18 }}>
                                        Analyzing Metadata...
                                    </Text>
                                    <Text style={{ color: c.textMuted, marginTop: 8 }}>
                                        Calculating new TDEE and recovery score
                                    </Text>
                                </View>
                            ) : (
                                <View>
                                    <View style={{ alignItems: 'center', marginBottom: s.xl }}>
                                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(46, 229, 157, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                            <TabBarIcon name="checkmark" color={c.success} size={32} />
                                        </View>
                                        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: 24, textAlign: 'center' }}>
                                            Program Updated
                                        </Text>
                                        <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: 8, maxWidth: 300 }}>
                                            Based on your 1.2lb weight loss and high energy levels, we're making a few tweaks.
                                        </Text>
                                    </View>

                                    <GlassCard intensity="strong" style={{ padding: 0, overflow: 'hidden' }}>
                                        <View style={{ padding: 16, backgroundColor: 'rgba(34, 211, 238, 0.1)', borderBottomWidth: 1, borderBottomColor: c.border }}>
                                            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>ADJUSTMENTS</Text>
                                        </View>
                                        <View style={{ padding: 16, gap: 16 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: c.textMuted }}>Daily Calories</Text>
                                                <Text style={{ color: c.success, fontFamily: ty.mono.family }}>+50 kcal ↗</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: c.textMuted }}>Protein Target</Text>
                                                <Text style={{ color: c.text, fontFamily: ty.mono.family }}>180g (No Change)</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={{ color: c.textMuted }}>Next Week Focus</Text>
                                                <Text style={{ color: c.text, fontFamily: ty.mono.family }}>Hypertrophy</Text>
                                            </View>
                                        </View>
                                    </GlassCard>
                                </View>
                            )}
                        </MotiView>
                    )}

                </AnimatePresence>
            </ScrollView>

            {/* Footer CTA */}
            {!isAnalyzing && (
                <View style={[styles.footer, { paddingBottom: insets.bottom + s.lg, backgroundColor: c.bg }]}>
                    {currentStep === 'analysis' && (
                        <Pressable
                            style={{ alignItems: 'center', padding: 12, marginBottom: 8 }}
                            onPress={() => router.back()}
                        >
                            <Text style={{ color: c.textMuted, fontFamily: ty.body.familyMedium }}>
                                No Thanks, Keep Current Targets
                            </Text>
                        </Pressable>
                    )}

                    <Pressable
                        style={({ pressed }) => [
                            styles.primaryButton,
                            {
                                backgroundColor: c.primary,
                                borderRadius: r.md,
                                opacity: pressed ? 0.9 : 1,
                                ...shadow.glow,
                            }
                        ]}
                        onPress={handleNext}
                    >
                        <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: 16 }}>
                            {currentStep === 'analysis' ? 'Accept Updates' : currentStep === 'photos' ? 'Analyze Progress' : 'Continue'}
                        </Text>
                        {currentStep !== 'analysis' && <TabBarIcon name="arrow-forward" color={c.bg} size={18} />}
                    </Pressable>
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    progressBarContainer: {
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    footer: {
        paddingHorizontal: 24,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        gap: 8,
    },
    pulse: {
        width: 80,
        height: 80,
        borderRadius: 40,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 40,
    }
});
