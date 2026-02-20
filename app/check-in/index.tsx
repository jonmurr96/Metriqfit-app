import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, Alert, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, AnimatePresence } from 'moti';
import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';
import { useAuth } from '../../lib/auth';
import { useProfile } from '../../hooks/useUser';
import { useApplyCheckInUpdates, usePreviewCheckIn } from '../../hooks/useCheckIn';
import { usePrepCoachState, useRunPrepCheckInAdjustment } from '../../hooks/usePrepCoach';
import { useEntitlementStatus } from '../../hooks/useSubscription';
import { useUploadProgressPhoto } from '../../hooks/useProgressPhotos';
import { trackEvent, trackProgressPhotoUploaded } from '../../lib/analytics';
import type { CheckInPreviewResult } from '../../services/checkInService';
import type { PrepCoachAdjustmentResult } from '../../services/prepCoachService';

type Step = 'metrics' | 'wellness' | 'photos' | 'analysis';
type PhotoAngle = 'front' | 'side' | 'back';

export default function CheckInScreen() {
    const { c, s, ty, r, shadow } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { data: profile } = useProfile();
    const { data: prepState } = usePrepCoachState();
    const { data: entitlement } = useEntitlementStatus();
    const previewCheckInMutation = usePreviewCheckIn();
    const applyUpdatesMutation = useApplyCheckInUpdates();
    const runPrepAdjustmentMutation = useRunPrepCheckInAdjustment();
    const uploadProgressPhotoMutation = useUploadProgressPhoto();
    const cameraRef = useRef<CameraView | null>(null);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();

    const [currentStep, setCurrentStep] = useState<Step>('metrics');
    const [progress, setProgress] = useState(0.25);
    const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
    const [captureSlot, setCaptureSlot] = useState<PhotoAngle | null>(null);
    const [capturedPhotos, setCapturedPhotos] = useState<Partial<Record<PhotoAngle, string>>>({});

    // Determine user's unit system
    const isImperial = profile?.unit_system === 'imperial';
    const weightUnit = isImperial ? 'lbs' : 'kg';

    // Form Data — initialize weight from real profile
    const [weight, setWeight] = useState('');
    const [sleep, setSleep] = useState(7);
    const [stress, setStress] = useState(4);
    const [energy, setEnergy] = useState(8);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<CheckInPreviewResult | null>(null);
    const [prepPreviewResult, setPrepPreviewResult] = useState<PrepCoachAdjustmentResult | null>(null);
    const [prepAppliedResult, setPrepAppliedResult] = useState<PrepCoachAdjustmentResult | null>(null);
    const [updatesApplied, setUpdatesApplied] = useState(false);

    const prepModeEnabled = prepState?.enabled === true;
    const isElite = entitlement?.isElite === true;
    const isApplyingAnyUpdate = applyUpdatesMutation.isPending || runPrepAdjustmentMutation.isPending;

    // Populate weight from profile when it loads
    useEffect(() => {
        if (profile?.current_weight_kg && !weight) {
            const displayWeight = isImperial
                ? (profile.current_weight_kg * 2.20462).toFixed(1)
                : profile.current_weight_kg.toFixed(1);
            setWeight(displayWeight);
        }
    }, [profile, isImperial, weight]);

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
            startAnalysis().catch(() => undefined);
        } else {
            if (!analysisResult) {
                Alert.alert('No analysis yet', 'Run analysis before applying updates.');
                return;
            }
            if (updatesApplied) {
                router.back();
                return;
            }
            handleApplyUpdates().catch(() => undefined);
        }
    };

    const startAnalysis = async () => {
        const parsedWeight = parseFloat(weight);
        if (!user?.id) {
            Alert.alert('Session required', 'Please sign in again before submitting a check-in.');
            return;
        }
        if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
            Alert.alert('Invalid weight', 'Enter a valid weight before running analysis.');
            setCurrentStep('metrics');
            return;
        }

        setIsAnalyzing(true);
        setPrepPreviewResult(null);
        try {
            // Keep a short branded analyzing animation while we persist + compute.
            await new Promise((resolve) => setTimeout(resolve, 1200));
            const preview = await previewCheckInMutation.mutateAsync({
                weightValue: parsedWeight,
                unitSystem: isImperial ? 'imperial' : 'metric',
                sleep,
                stress,
                energy,
            });
            await uploadCapturedPhotos(preview.measurementId);
            setAnalysisResult(preview);
            setUpdatesApplied(false);
            setPrepAppliedResult(null);

            if (prepModeEnabled) {
                try {
                    const prepPreview = await runPrepAdjustmentMutation.mutateAsync({
                        measurementId: preview.measurementId,
                        dryRun: true,
                    });
                    setPrepPreviewResult(prepPreview);
                } catch (prepError: any) {
                    setPrepPreviewResult(null);
                    Alert.alert('Prep preview unavailable', prepError?.message || 'Could not generate prep preview. Standard check-in updates are still available.');
                }
            } else {
                setPrepPreviewResult(null);
            }
        } catch (error: any) {
            Alert.alert('Check-in failed', error?.message || 'Could not save check-in right now.');
            setCurrentStep('photos');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleApplyUpdates = async () => {
        if (!analysisResult) return;
        try {
            let prepApplyResult: PrepCoachAdjustmentResult | null = null;
            if (prepModeEnabled) {
                // Use local variable — don't rely on stale state
                prepApplyResult = await runPrepAdjustmentMutation.mutateAsync({
                    measurementId: analysisResult.measurementId,
                    dryRun: false,
                });
                setPrepAppliedResult(prepApplyResult);
            } else {
                await applyUpdatesMutation.mutateAsync(analysisResult);
                setPrepAppliedResult(null);
            }

            setUpdatesApplied(true);

            if (prepModeEnabled) {
                // Use local prepApplyResult (not stale state) for the applied check
                if (isElite && prepApplyResult?.applied) {
                    Alert.alert('Prep adjustments applied', 'Targets, nutrition plan, and workout adaptations have been updated for this prep cycle.', [
                        { text: 'Done', onPress: () => router.back() },
                    ]);
                } else {
                    Alert.alert(
                        'Prep recommendations ready',
                        'Auto-apply is available for Elite users with Prep Mode enabled. Your recommendations are saved in Prep Coach.',
                        [{ text: 'Done', onPress: () => router.back() }],
                    );
                }
            } else {
                Alert.alert('Targets updated', 'Your weekly check-in updates are now active.', [
                    { text: 'Done', onPress: () => router.back() },
                ]);
            }
        } catch (error: any) {
            Alert.alert('Update failed', error?.message || 'Could not apply new targets. Your check-in was still saved.');
        }
    };

    const openPhotoCapture = async (slot: PhotoAngle) => {
        trackEvent('checkin_photo_capture_opened', { slot });
        if (!cameraPermission?.granted) {
            const permission = await requestCameraPermission();
            if (!permission.granted) {
                Alert.alert('Camera access needed', 'Enable camera permission to capture progress photos.');
                return;
            }
        }
        setCaptureSlot(slot);
    };

    const removePhotoSlot = (slot: PhotoAngle) => {
        setCapturedPhotos((prev) => {
            const next = { ...prev };
            delete next[slot];
            return next;
        });
        trackEvent('checkin_photo_removed', { slot });
    };

    const handlePhotoSlotPress = (slot: PhotoAngle) => {
        const uri = capturedPhotos[slot];
        if (!uri) {
            openPhotoCapture(slot).catch(() => undefined);
            return;
        }
        Alert.alert(
            `${slot[0].toUpperCase()}${slot.slice(1)} photo`,
            'Choose an action for this photo.',
            [
                { text: 'Retake', onPress: () => openPhotoCapture(slot).catch(() => undefined) },
                { text: 'Remove', style: 'destructive', onPress: () => removePhotoSlot(slot) },
                { text: 'Cancel', style: 'cancel' },
            ],
        );
    };

    const captureProgressPhoto = async () => {
        if (!cameraRef.current || !captureSlot) return;
        try {
            const snap = await cameraRef.current.takePictureAsync({
                quality: 0.7,
                skipProcessing: true,
            });
            if (!snap?.uri) {
                throw new Error('Capture failed');
            }
            setCapturedPhotos((prev) => ({ ...prev, [captureSlot]: snap.uri }));
            trackEvent('checkin_photo_captured', { slot: captureSlot });
            setCaptureSlot(null);
        } catch (error: any) {
            Alert.alert('Capture failed', error?.message || 'Could not capture photo.');
        }
    };

    const uploadCapturedPhotos = async (measurementId: string) => {
        const entries = Object.entries(capturedPhotos) as [PhotoAngle, string][];
        if (!entries.length) return;
        let successCount = 0;
        for (const [angle, uri] of entries) {
            if (!uri) continue;
            try {
                await uploadProgressPhotoMutation.mutateAsync({
                    uri,
                    angle,
                    measurementId,
                    metadata: {
                        source: 'weekly_check_in',
                    },
                });
                successCount += 1;
                trackProgressPhotoUploaded({ source: 'weekly_check_in', angle, measurement_id: measurementId });
            } catch (uploadError: any) {
                trackEvent('checkin_photo_upload_failed', {
                    angle,
                    message: uploadError?.message || 'upload_failed',
                });
            }
        }
        trackEvent('checkin_photo_upload_batch_completed', {
            uploaded_count: successCount,
            attempted_count: entries.length,
            measurement_id: measurementId,
        });
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

    const getValueLabel = (val: number, type: 'sleep' | 'stress' | 'energy') => {
        if (type === 'sleep') {
            if (val <= 3) return { label: 'Poor', color: c.danger as string };
            if (val <= 5) return { label: 'Fair', color: c.warning as string };
            if (val <= 7) return { label: 'Good', color: c.primary as string };
            return { label: 'Excellent', color: c.success as string };
        }
        if (type === 'stress') {
            if (val <= 3) return { label: 'Low', color: c.success as string };
            if (val <= 5) return { label: 'Moderate', color: c.primary as string };
            if (val <= 7) return { label: 'High', color: c.warning as string };
            return { label: 'Very High', color: c.danger as string };
        }
        // energy
        if (val <= 3) return { label: 'Drained', color: c.danger as string };
        if (val <= 5) return { label: 'Low', color: c.warning as string };
        if (val <= 7) return { label: 'Good', color: c.primary as string };
        return { label: 'Peak', color: c.success as string };
    };

    const WellnessCard = ({
        emoji, label, value, onChange, type,
    }: { emoji: string; label: string; value: number; onChange: (v: number) => void; type: 'sleep' | 'stress' | 'energy' }) => {
        const { label: valLabel, color } = getValueLabel(value, type);
        const trackRef = React.useRef<View>(null);
        const [trackWidth, setTrackWidth] = React.useState(0);

        const handleTrackPress = (e: any) => {
            const locationX = e.nativeEvent.locationX;
            if (!trackWidth) return;
            const clamped = Math.max(0, Math.min(locationX, trackWidth));
            const ratio = clamped / trackWidth;
            const newVal = Math.max(1, Math.min(10, Math.round(ratio * 10)));
            onChange(newVal);
        };

        const fillPct = ((value - 1) / 9) * 100;

        return (
            <MotiView
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 400 }}
                style={[styles.wellnessCard, {
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderColor: `${color}30`,
                    borderWidth: 1,
                    borderRadius: 20,
                    padding: 20,
                    marginBottom: 16,
                }]}
            >
                {/* Card Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 24 }}>{emoji}</Text>
                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 15 }}>{label}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                        <Text style={{ color, fontFamily: ty.heading.familySemibold, fontSize: 28 }}>{value}</Text>
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 13 }}>/10</Text>
                    </View>
                </View>

                {/* Value label */}
                <Text style={{ color, fontFamily: ty.body.familyMedium, fontSize: 12, marginBottom: 12, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                    {valLabel}
                </Text>

                {/* Slider Track */}
                <View>
                    <Pressable
                        ref={trackRef as any}
                        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                        onPress={handleTrackPress}
                        style={{
                            height: 10,
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderRadius: 999,
                            overflow: 'hidden',
                            position: 'relative',
                        }}
                    >
                        <View style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${fillPct}%`,
                            backgroundColor: color,
                            borderRadius: 999,
                            opacity: 0.85,
                        }} />
                    </Pressable>

                    {/* Thumb + step dots */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <Pressable
                                key={num}
                                onPress={() => onChange(num)}
                                style={{ alignItems: 'center', paddingVertical: 4, paddingHorizontal: 2 }}
                            >
                                <View style={{
                                    width: num === value ? 14 : 6,
                                    height: num === value ? 14 : 6,
                                    borderRadius: 999,
                                    backgroundColor: num <= value ? color : 'rgba(255,255,255,0.12)',
                                    ...(num === value ? {
                                        shadowColor: color,
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 1,
                                        shadowRadius: 8,
                                    } : {}),
                                }} />
                                {num === 1 || num === 10 ? (
                                    <Text style={{ color: c.textMuted, fontSize: 9, fontFamily: ty.body.family, marginTop: 4 }}>
                                        {num}
                                    </Text>
                                ) : null}
                            </Pressable>
                        ))}
                    </View>
                </View>
            </MotiView>
        );
    };

    const PhotoSlot = ({ label, slot }: { label: string; slot: PhotoAngle }) => {
        const uri = capturedPhotos[slot];
        return (
            <Pressable
                onPress={() => handlePhotoSlotPress(slot)}
                style={{
                    flex: 1,
                    aspectRatio: 0.75,
                    borderWidth: 1,
                    borderColor: uri ? c.primary : c.border,
                    borderRadius: r.md,
                    borderStyle: uri ? 'solid' : 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                }}
            >
                {uri ? (
                    <>
                        <Image source={{ uri }} style={{ width: '100%', height: '100%', position: 'absolute' }} />
                        <View
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                bottom: 0,
                                paddingVertical: 6,
                                backgroundColor: 'rgba(0,0,0,0.55)',
                                alignItems: 'center',
                            }}
                        >
                            <Text style={{ color: '#fff', fontSize: 12, fontFamily: ty.body.familySemibold }}>{label}</Text>
                        </View>
                    </>
                ) : (
                    <>
                        <TabBarIcon name="camera" color={c.textMuted} size={24} />
                        <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 8, fontFamily: ty.body.family }}>{label}</Text>
                    </>
                )}
            </Pressable>
        );
    };

    const formatDelta = (value: number, suffix = '') => `${value >= 0 ? '+' : ''}${value}${suffix}`;

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
                                    <Text style={{ color: c.textMuted, fontSize: 24, marginBottom: 18, marginLeft: 8, fontFamily: ty.body.family }}>{weightUnit}</Text>
                                </View>
                                {analysisResult && analysisResult.weightChangeKg !== null ? (
                                    <Text style={{ color: c.success, marginTop: 16, fontFamily: ty.body.familyMedium }}>
                                        {analysisResult.weightChangeKg <= 0 ? '📉' : '📈'} {Math.abs(analysisResult.weightChangeKg).toFixed(1)} kg change since last check-in
                                    </Text>
                                ) : (
                                    <Text style={{ color: c.textMuted, marginTop: 16, fontFamily: ty.body.familyMedium }}>
                                        First tracked check-in. Keep going.
                                    </Text>
                                )}
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

                            <WellnessCard
                                emoji="🌙"
                                label="Sleep Quality"
                                value={sleep}
                                onChange={setSleep}
                                type="sleep"
                            />
                            <WellnessCard
                                emoji="⚡"
                                label="Stress Level"
                                value={stress}
                                onChange={setStress}
                                type="stress"
                            />
                            <WellnessCard
                                emoji="🔋"
                                label="Energy Level"
                                value={energy}
                                onChange={setEnergy}
                                type="energy"
                            />
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
                                <PhotoSlot label="Front" slot="front" />
                                <PhotoSlot label="Side" slot="side" />
                                <PhotoSlot label="Back" slot="back" />
                            </View>

                            <View style={{ marginTop: s.xl, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(34, 211, 238, 0.1)', padding: 16, borderRadius: r.md }}>
                                <TabBarIcon name="information-circle" color={c.primary} size={20} />
                                <Text style={{ color: c.text, flex: 1, fontSize: 12 }}>
                                    Photos are privately stored in your timeline and attached to this check-in measurement.
                                </Text>
                            </View>
                            <Text style={{ color: c.textMuted, marginTop: s.md, fontFamily: ty.body.family, fontSize: 12 }}>
                                Captured this check-in: {Object.keys(capturedPhotos).length}/3
                            </Text>
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
                                            Check-In Saved
                                        </Text>
                                        <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: 8, maxWidth: 300 }}>
                                            Your weekly data is logged. Review suggested target updates below.
                                        </Text>
                                    </View>

                                    {prepModeEnabled && (
                                        <GlassCard intensity="strong" style={{ padding: 16, marginBottom: s.lg }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>
                                                    Prep Adjustment Preview
                                                </Text>
                                                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 12 }}>
                                                    {isElite ? 'Elite' : 'Free'}
                                                </Text>
                                            </View>
                                            {prepPreviewResult ? (
                                                <View style={{ marginTop: 10, gap: 6 }}>
                                                    <Text style={{ color: c.text, fontFamily: ty.body.familyMedium }}>
                                                        {prepPreviewResult.discipline} • {prepPreviewResult.phase}
                                                    </Text>
                                                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 13 }}>
                                                        {prepPreviewResult.coachSummary}
                                                    </Text>
                                                    <Text style={{ color: c.text, fontFamily: ty.mono.family, fontSize: 12 }}>
                                                        Calories {formatDelta(prepPreviewResult.targetDelta.calories)} | Protein {formatDelta(prepPreviewResult.targetDelta.protein_g, 'g')} | Carbs {formatDelta(prepPreviewResult.targetDelta.carbs_g, 'g')}
                                                    </Text>
                                                    {!isElite && (
                                                        <Text style={{ color: c.warning, fontFamily: ty.body.familyMedium, fontSize: 12 }}>
                                                            Recommendation-only on Free. Upgrade to Elite for auto-apply.
                                                        </Text>
                                                    )}
                                                </View>
                                            ) : (
                                                <Text style={{ color: c.textMuted, marginTop: 10, fontFamily: ty.body.family }}>
                                                    Preparing prep adjustment preview...
                                                </Text>
                                            )}
                                        </GlassCard>
                                    )}

                                    {analysisResult ? (
                                        <GlassCard intensity="strong" style={{ padding: 0, overflow: 'hidden' }}>
                                            <View style={{ padding: 16, backgroundColor: `${c.primary}15`, borderBottomWidth: 1, borderBottomColor: c.border }}>
                                                <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>
                                                    {analysisResult.recommendation.title}
                                                </Text>
                                                <Text style={{ color: c.textMuted, marginTop: 4, fontFamily: ty.body.family }}>
                                                    {analysisResult.recommendation.message}
                                                </Text>
                                            </View>
                                            <View style={{ padding: 16, gap: 12 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Recovery score</Text>
                                                    <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>{analysisResult.recoveryScore}/100</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Calories</Text>
                                                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
                                                        {analysisResult.baselineTargets.calories} → {analysisResult.proposedTargets.calories}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Protein</Text>
                                                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
                                                        {analysisResult.baselineTargets.protein_g}g → {analysisResult.proposedTargets.protein_g}g
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Carbs</Text>
                                                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
                                                        {analysisResult.baselineTargets.carbs_g}g → {analysisResult.proposedTargets.carbs_g}g
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Fat</Text>
                                                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
                                                        {analysisResult.baselineTargets.fat_g}g → {analysisResult.proposedTargets.fat_g}g
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>Water</Text>
                                                    <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
                                                        {analysisResult.baselineTargets.water_ml}ml → {analysisResult.proposedTargets.water_ml}ml
                                                    </Text>
                                                </View>
                                            </View>
                                        </GlassCard>
                                    ) : (
                                        <GlassCard intensity="strong" style={{ padding: 16 }}>
                                            <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>
                                                Analysis data unavailable. Try running the check-in again.
                                            </Text>
                                        </GlassCard>
                                    )}

                                    {updatesApplied && prepAppliedResult && (
                                        <GlassCard intensity="strong" style={{ padding: 16, marginTop: s.lg }}>
                                            <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold }}>
                                                Prep Coach Update Summary
                                            </Text>
                                            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 6 }}>
                                                {prepAppliedResult.coachSummary}
                                            </Text>
                                            <Text style={{ color: c.text, fontFamily: ty.mono.family, marginTop: 8, fontSize: 12 }}>
                                                Targets: {formatDelta(prepAppliedResult.targetDelta.calories)} kcal, {formatDelta(prepAppliedResult.targetDelta.protein_g, 'g')} protein, {formatDelta(prepAppliedResult.targetDelta.carbs_g, 'g')} carbs, {formatDelta(prepAppliedResult.targetDelta.fat_g, 'g')} fat
                                            </Text>
                                            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 8, fontSize: 12 }}>
                                                Nutrition plan version: {prepAppliedResult.nutritionPlanVersionFrom ?? '-'} → {prepAppliedResult.nutritionPlanVersionTo ?? '-'}
                                            </Text>
                                            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, marginTop: 4, fontSize: 12 }}>
                                                Workout adjustments: {prepAppliedResult.workoutAdjustmentsApplied.length}
                                            </Text>
                                        </GlassCard>
                                    )}
                                </View>
                            )}
                        </MotiView>
                    )}

                </AnimatePresence>
            </ScrollView>

            <Modal visible={!!captureSlot} animationType="slide" transparent={false} onRequestClose={() => setCaptureSlot(null)}>
                <View style={{ flex: 1, backgroundColor: c.bg }}>
                    <View style={[styles.header, { marginTop: insets.top + 6 }]}>
                        <Pressable onPress={() => setCaptureSlot(null)} style={{ padding: 8 }}>
                            <TabBarIcon name="close" color={c.textMuted} size={24} />
                        </Pressable>
                        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>
                            Capture {captureSlot ? `${captureSlot[0].toUpperCase()}${captureSlot.slice(1)}` : ''} Photo
                        </Text>
                        <Pressable onPress={() => setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'))} style={{ padding: 8 }}>
                            <TabBarIcon name="camera-reverse-outline" color={c.textMuted} size={22} />
                        </Pressable>
                    </View>
                    <View style={{ flex: 1, margin: 16, borderRadius: r.lg, overflow: 'hidden' }}>
                        <CameraView ref={cameraRef} style={{ flex: 1 }} facing={cameraFacing} />
                    </View>
                    <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20 }}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.primaryButton,
                                {
                                    backgroundColor: c.primary,
                                    borderRadius: r.md,
                                    opacity: pressed ? 0.9 : 1,
                                },
                            ]}
                            onPress={() => captureProgressPhoto().catch(() => undefined)}
                        >
                            <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: 16 }}>
                                Capture Photo
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Footer CTA */}
            {!isAnalyzing && (
                <View style={[styles.footer, { paddingBottom: insets.bottom + s.lg, backgroundColor: c.bg }]}>
                    {currentStep === 'analysis' && (
                        <Pressable
                            style={{ alignItems: 'center', padding: 12, marginBottom: 8 }}
                            onPress={() => router.back()}
                            disabled={isApplyingAnyUpdate}
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
                        disabled={isApplyingAnyUpdate}
                    >
                        <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: 16 }}>
                            {currentStep === 'analysis'
                                ? (
                                    isApplyingAnyUpdate
                                        ? 'Applying Updates...'
                                        : (prepModeEnabled
                                            ? (isElite ? 'Apply Prep Adjustments' : 'Save Prep Recommendation')
                                            : 'Accept Updates')
                                )
                                : currentStep === 'photos'
                                    ? (previewCheckInMutation.isPending ? 'Analyzing...' : 'Analyze Progress')
                                    : 'Continue'}
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
    },
    wellnessCard: {
        // base styles applied inline, this just reserves the name
    },
});
