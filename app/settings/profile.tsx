import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';

export default function EditProfileScreen() {
    const { c, s, ty, r, shadow } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [name, setName] = useState('Jonathon Murray');
    const [weight, setWeight] = useState('185');
    const [height, setHeight] = useState('5\'10"');
    const [goal, setGoal] = useState('Build Muscle');
    const [activity, setActivity] = useState('Moderately Active');

    const handleSave = () => {
        setIsSaving(true);
        // Simulate API call
        setTimeout(() => {
            setIsSaving(false);
            router.back();
        }, 1500);
    };

    const InputField = ({ label, value, onChangeText, keyboardType = 'default' }: any) => (
        <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.familyMedium }]}>
                {label}
            </Text>
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: c.surface2,
                        color: c.text,
                        fontFamily: ty.body.family,
                        borderColor: c.border,
                        borderRadius: r.md,
                    }
                ]}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                placeholderTextColor={c.textSubtle}
            />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: c.bg }]}>
            <LinearGradient
                colors={[c.surface, c.bg]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + s.md }]}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <TabBarIcon name="arrow-back" color={c.text} size={24} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                    Edit Profile
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 }]}>

                <View style={styles.avatarContainer}>
                    <View style={[styles.avatar, { borderColor: c.primary, shadowColor: c.primary }]}>
                        <Text style={{ fontSize: 40 }}>🧔🏻‍♂️</Text>
                        <View style={[styles.editBadge, { backgroundColor: c.primary }]}>
                            <TabBarIcon name="camera" color={c.bg} size={14} />
                        </View>
                    </View>
                </View>

                <GlassCard intensity="light" style={{ padding: s.xl, marginTop: s.xl }}>
                    <InputField
                        label="Full Name"
                        value={name}
                        onChangeText={setName}
                    />
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <InputField
                                label="Weight (lbs)"
                                value={weight}
                                onChangeText={setWeight}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ width: s.md }} />
                        <View style={{ flex: 1 }}>
                            <InputField
                                label="Height"
                                value={height}
                                onChangeText={setHeight}
                            />
                        </View>
                    </View>
                    <InputField
                        label="Primary Goal"
                        value={goal}
                        onChangeText={setGoal}
                    />
                    <InputField
                        label="Activity Level"
                        value={activity}
                        onChangeText={setActivity}
                    />
                </GlassCard>

            </ScrollView>

            {/* Save Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + s.lg, backgroundColor: c.bg }]}>
                <Pressable
                    style={({ pressed }) => [
                        styles.saveButton,
                        {
                            backgroundColor: c.primary,
                            borderRadius: r.md,
                            opacity: pressed || isSaving ? 0.8 : 1,
                            ...shadow.glow,
                        }
                    ]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color={c.bg} />
                    ) : (
                        <Text style={{ color: c.bg, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
                            Save Changes
                        </Text>
                    )}
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    content: {
        paddingHorizontal: 20,
    },
    avatarContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1E1E2E',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#050510',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        marginBottom: 8,
    },
    input: {
        width: '100%',
        height: 50,
        paddingHorizontal: 16,
        borderWidth: 1,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
    },
    footer: {
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 16,
    },
    saveButton: {
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
