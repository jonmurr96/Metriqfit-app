import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useTokens } from '../../lib/theme';
import { PressableScale } from '@/components/common/PressableScale';
import * as FileSystem from 'expo-file-system';

interface VoiceInputProps {
    onTranscription: (text: string) => void;
    isProcessing?: boolean;
}

export const VoiceInput = ({ onTranscription, isProcessing = false }: VoiceInputProps) => {
    const { c, r, ty } = useTokens();
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
        return () => {
            if (recording) {
                recording.stopAndUnloadAsync();
            }
        };
    }, []);

    async function startRecording() {
        try {
            if (permissionResponse?.status !== 'granted') {
                const resp = await requestPermission();
                if (resp.status !== 'granted') {
                    Alert.alert('Permission needed', 'Microphone permission is required to use voice logging.');
                    return;
                }
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            setRecording(recording);
            setIsRecording(true);
        } catch (err) {
            console.error('Failed to start recording', err);
            Alert.alert('Error', 'Failed to start recording');
        }
    }

    async function stopRecording() {
        if (!recording) return;

        setIsRecording(false);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);

            if (uri) {
                // Here we would normally send to backend
                // For now, we'll simulate a transcription for testing
                // onTranscription("2 eggs and toast"); 

                // TODO: Implement actual transcription service call
                // const text = await transcribeAudio(uri);
                // onTranscription(text);

                // Simulating delay and response for UI dev
                setTimeout(() => {
                    // Mock response based on simple randomness or fixed for demo
                    onTranscription("2 large eggs, 2 slices of whole wheat toast, and a black coffee");
                }, 1500);
            }
        } catch (err) {
            console.error('Failed to stop recording', err);
        }
    }

    return (
        <View style={styles.container}>
            <PressableScale
                onPressIn={startRecording}
                onPressOut={stopRecording}
                disabled={isProcessing}
                style={(pressed) => [
                    styles.button,
                    {
                        backgroundColor: isRecording ? c.primary : c.surface2,
                        borderColor: c.primary,
                        borderWidth: isRecording ? 0 : 1
                    }
                ]}
            >
                <MotiView
                    from={{ scale: 1, opacity: 0.5 }}
                    animate={{
                        scale: isRecording ? 1.5 : 1,
                        opacity: isRecording ? 0.2 : 0
                    }}
                    transition={{
                        type: 'timing',
                        duration: 1000,
                        loop: true,
                    }}
                    style={[StyleSheet.absoluteFillObject, { backgroundColor: c.primary, borderRadius: r.pill }]}
                />

                <Ionicons
                    name={isRecording ? "mic" : "mic-outline"}
                    size={24}
                    color={isRecording ? c.bg : c.text}
                />
            </PressableScale>

            {isRecording && (
                <MotiView
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    style={styles.hintContainer}
                >
                    <Text style={[styles.hintText, { color: c.text }]}>Listening...</Text>
                </MotiView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    button: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible', // allow ripple
    },
    hintContainer: {
        position: 'absolute',
        top: -40,
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    hintText: {
        fontSize: 12,
        fontWeight: '600',
    }
});
