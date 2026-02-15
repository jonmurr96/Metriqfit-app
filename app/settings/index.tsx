import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useTokens } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { useProfile } from '../../hooks/useUser';
import { useEntitlementStatus } from '../../hooks/useSubscription';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';
import { BrandMark } from '../../components/branding/BrandMark';

export default function SettingsScreen() {
    const { c, s, ty } = useTokens();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { signOut } = useAuth();
    const { data: profile } = useProfile();
    const { data: entitlement } = useEntitlementStatus();

    // Derive display data from real profile (with safe fallbacks)
    const isElite = entitlement?.isElite ?? false;
    const userName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'User'
        : 'Loading...';
    const memberSince = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : '...';

    const renderSectionHeader = (title: string) => (
        <Text style={[styles.sectionHeader, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>
            {title}
        </Text>
    );

    const SettingsItem = ({ icon, label, value, onPress, isDestructive = false }: any) => (
        <Pressable
            style={({ pressed }) => [
                styles.item,
                { backgroundColor: pressed ? c.surface2 : 'transparent' }
            ]}
            onPress={onPress}
        >
            <View style={styles.itemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: isDestructive ? `${c.danger}15` : c.surface2 }]}>
                    <TabBarIcon
                        name={icon}
                        color={isDestructive ? c.danger : c.primary}
                        size={20}
                    />
                </View>
                <Text style={[styles.itemLabel, { color: isDestructive ? c.danger : c.text, fontFamily: ty.body.family }]}>
                    {label}
                </Text>
            </View>
            <View style={styles.itemRight}>
                {value && (
                    <Text style={[styles.itemValue, { color: c.textMuted, fontFamily: ty.body.family }]}>
                        {value}
                    </Text>
                )}
                <TabBarIcon name="chevron-forward" color={c.textSubtle} size={16} />
            </View>
        </Pressable>
    );

    const handleLogout = () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        await signOut();
                        router.replace('/');
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: c.bg }]}>
            <LinearGradient
                colors={[c.surface, c.bg]}
                style={StyleSheet.absoluteFill}
            />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + s.md }]}>
                <View style={styles.headerTop}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <TabBarIcon name="close" color={c.text} size={24} />
                    </Pressable>
                    <View style={styles.headerTitleWrap}>
                        <BrandMark size="xs" glow="none" />
                        <Text style={[styles.headerTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                            Settings
                        </Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.profileCard}>
                    <View style={[styles.avatar, { borderColor: c.primary, shadowColor: c.primary, backgroundColor: c.surface2 }]}>
                        <Text style={{ fontSize: 22, color: c.primary, fontFamily: ty.heading.familySemibold }}>
                            {profile?.first_name && profile?.last_name
                                ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
                                : '👤'}
                        </Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={[styles.userName, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
                            {userName}
                        </Text>
                        <View style={styles.memberBadge}>
                            <TabBarIcon name={isElite ? "diamond" : "leaf"} color={isElite ? c.primary : c.textMuted} size={12} />
                            <Text style={[styles.memberText, { color: c.textMuted, fontFamily: ty.body.family }]}>
                                {isElite ? 'MetriqFit Elite' : 'Starter Plan'} • Since {memberSince}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + s.xl }]}>

                {/* MEMBERSHIP Section */}
                {renderSectionHeader('MEMBERSHIP')}
                <GlassCard intensity="light" style={{ padding: 0, marginBottom: s.xl, overflow: 'hidden' }}>
                    <SettingsItem
                        icon="card-outline"
                        label="Manage Subscription"
                        value={isElite ? "Active" : "Upgrade"}
                        onPress={() => router.push('/settings/subscription')}
                    />
                </GlassCard>

                {/* ACCOUNT Section */}
                {renderSectionHeader('ACCOUNT')}
                <GlassCard intensity="light" style={{ padding: 0, marginBottom: s.xl, overflow: 'hidden' }}>
                    <SettingsItem
                        icon="person-outline"
                        label="Edit Profile"
                        onPress={() => router.push('/settings/profile')}
                    />
                    <View style={{ height: 1, backgroundColor: c.surface }} />
                    <SettingsItem
                        icon="lock-closed-outline"
                        label="Security & Privacy"
                        onPress={() => router.push('/settings/security' as any)}
                    />
                    <View style={{ height: 1, backgroundColor: c.surface }} />
                    <SettingsItem
                        icon="notifications-outline"
                        label="Notifications"
                        value="On"
                        onPress={() => router.push('/settings/notifications' as any)}
                    />
                </GlassCard>

                {/* PREFERENCES Section */}
                {renderSectionHeader('PREFERENCES')}
                <GlassCard intensity="light" style={{ padding: 0, marginBottom: s.xl, overflow: 'hidden' }}>
                    <SettingsItem
                        icon="time-outline"
                        label="Meal Schedule"
                        value="Edit Times"
                        onPress={() => router.push('/settings/meal-times')}
                    />
                    <View style={{ height: 1, backgroundColor: c.surface }} />
                    <SettingsItem
                        icon="barbell-outline"
                        label="Units"
                        value={profile?.unit_system === 'metric' ? 'Metric (kg)' : 'Imperial (lbs)'}
                        onPress={() => router.push('/settings/units' as any)}
                    />
                    <View style={{ height: 1, backgroundColor: c.surface }} />
                    <SettingsItem
                        icon="moon-outline"
                        label="Theme"
                        value="Neon Void"
                        onPress={() => router.push('/settings/theme' as any)}
                    />
                </GlassCard>

                {/* SUPPORT Section */}
                {renderSectionHeader('SUPPORT')}
                <GlassCard intensity="light" style={{ padding: 0, marginBottom: s.xl, overflow: 'hidden' }}>
                    <SettingsItem
                        icon="help-circle-outline"
                        label="Help Center"
                        onPress={() => router.push('/settings/help' as any)}
                    />
                    <View style={{ height: 1, backgroundColor: c.surface }} />
                    <SettingsItem
                        icon="log-out-outline"
                        label="Log Out"
                        isDestructive
                        onPress={handleLogout}
                    />
                </GlassCard>

                <Text style={[styles.versionText, { color: c.textSubtle, fontFamily: ty.mono.family }]}>
                    v3.0.0 (Build 2025.12)
                </Text>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 18,
    },
    headerTitleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'transparent', // Set dynamically via inline style
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    profileInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        marginBottom: 4,
    },
    memberBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    memberText: {
        fontSize: 12,
    },
    content: {
        paddingHorizontal: 20,
    },
    sectionHeader: {
        fontSize: 12,
        marginBottom: 12,
        marginLeft: 4,
        letterSpacing: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemLabel: {
        fontSize: 15,
    },
    itemValue: {
        fontSize: 14,
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        opacity: 0.5,
        marginTop: 20,
    },
});
