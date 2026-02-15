import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';
import { useProfile, useUpdateProfile } from '../../hooks/useUser';

export default function EditProfileScreen() {
    const { c, s, ty, r, shadow } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { data: profile, isLoading: profileLoading } = useProfile();
    const updateProfileMutation = useUpdateProfile();

    // Form State — initialized from real profile data
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [weightKg, setWeightKg] = useState('');

    // Populate form when profile data loads
    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
            setHeightCm(profile.height_cm ? String(profile.height_cm) : '');
            setWeightKg(profile.current_weight_kg ? String(profile.current_weight_kg) : '');
        }
    }, [profile]);

    const isImperial = profile?.unit_system === 'imperial';

    // Display conversions
    const displayWeight = () => {
        const kg = parseFloat(weightKg);
        if (isNaN(kg)) return '';
        return isImperial ? String(Math.round(kg * 2.20462)) : String(Math.round(kg));
    };

    const displayHeight = () => {
        const cm = parseFloat(heightCm);
        if (isNaN(cm)) return '';
        if (isImperial) {
            const totalInches = cm / 2.54;
            const feet = Math.floor(totalInches / 12);
            const inches = Math.round(totalInches % 12);
            return `${feet}'${inches}"`;
        }
        return `${Math.round(cm)} cm`;
    };

    const handleWeightChange = (text: string) => {
        // User enters in their unit system, we store in kg
        const numericOnly = text.replace(/[^0-9.]/g, '');
        if (isImperial) {
            const lbs = parseFloat(numericOnly);
            if (!isNaN(lbs)) {
                setWeightKg(String(lbs / 2.20462));
            } else {
                setWeightKg('');
            }
        } else {
            setWeightKg(numericOnly);
        }
    };

    const handleSave = async () => {
        try {
            const updates: any = {};
            if (firstName !== (profile?.first_name || '')) updates.first_name = firstName.trim() || null;
            if (lastName !== (profile?.last_name || '')) updates.last_name = lastName.trim() || null;

            const newHeightCm = parseFloat(heightCm);
            if (!isNaN(newHeightCm) && newHeightCm !== profile?.height_cm) {
                updates.height_cm = newHeightCm;
            }

            const newWeightKg = parseFloat(weightKg);
            if (!isNaN(newWeightKg) && newWeightKg !== profile?.current_weight_kg) {
                updates.current_weight_kg = newWeightKg;
            }

            if (Object.keys(updates).length === 0) {
                router.back();
                return;
            }

            await updateProfileMutation.mutateAsync(updates);
            router.back();
        } catch (error: any) {
            Alert.alert('Save Failed', error.message || 'Could not save your profile. Please try again.');
        }
    };

    const InputField = ({ label, value, onChangeText, keyboardType = 'default', editable = true }: any) => (
        <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.familyMedium }]}>
                {label}
            </Text>
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: editable ? c.surface2 : c.surface,
                        color: editable ? c.text : c.textMuted,
                        fontFamily: ty.body.family,
                        borderColor: c.border,
                        borderRadius: r.md,
                    }
                ]}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                placeholderTextColor={c.textSubtle}
                editable={editable}
            />
        </View>
    );

    if (profileLoading) {
        return (
            <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={c.primary} size="large" />
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.md }}>
                    Loading profile...
                </Text>
            </View>
        );
    }

    const initials = firstName && lastName
        ? `${firstName[0]}${lastName[0]}`.toUpperCase()
        : null;

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
                    <View style={[styles.avatar, { borderColor: c.primary, shadowColor: c.primary, backgroundColor: c.surface2 }]}>
                        <Text style={{ fontSize: initials ? 28 : 40, color: initials ? c.primary : c.text, fontFamily: ty.heading.familySemibold }}>
                            {initials || '👤'}
                        </Text>
                        <View style={[styles.editBadge, { backgroundColor: c.primary, borderColor: c.bg }]}>
                            <TabBarIcon name="camera" color={c.bg} size={14} />
                        </View>
                    </View>
                </View>

                <GlassCard intensity="light" style={{ padding: s.xl, marginTop: s.xl }}>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <InputField
                                label="First Name"
                                value={firstName}
                                onChangeText={setFirstName}
                            />
                        </View>
                        <View style={{ width: s.md }} />
                        <View style={{ flex: 1 }}>
                            <InputField
                                label="Last Name"
                                value={lastName}
                                onChangeText={setLastName}
                            />
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <InputField
                                label={`Weight (${isImperial ? 'lbs' : 'kg'})`}
                                value={displayWeight()}
                                onChangeText={handleWeightChange}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={{ width: s.md }} />
                        <View style={{ flex: 1 }}>
                            <InputField
                                label="Height"
                                value={displayHeight()}
                                editable={false}
                            />
                        </View>
                    </View>
                    <InputField
                        label="Email"
                        value={profile?.email || ''}
                        editable={false}
                    />
                </GlassCard>

            </ScrollView>

            {/* Save Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + s.lg, backgroundColor: c.bg, borderTopColor: c.border }]}>
                <Pressable
                    style={({ pressed }) => [
                        styles.saveButton,
                        {
                            backgroundColor: c.primary,
                            borderRadius: r.md,
                            opacity: pressed || updateProfileMutation.isPending ? 0.8 : 1,
                            ...shadow.glow,
                        }
                    ]}
                    onPress={handleSave}
                    disabled={updateProfileMutation.isPending}
                >
                    {updateProfileMutation.isPending ? (
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
        paddingTop: 16,
    },
    saveButton: {
        height: 54,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
