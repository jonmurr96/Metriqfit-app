import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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

  const isImperial = profile?.unit_system === 'imperial';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'other' | ''>('');

  useEffect(() => {
    if (!profile) return;

    setFirstName(profile.first_name || '');
    setLastName(profile.last_name || '');
    setDateOfBirth(profile.date_of_birth || '');
    setSex(profile.sex || '');
    setHeightInput(
      profile.height_cm
        ? isImperial
          ? String(Math.round(profile.height_cm / 2.54))
          : String(Math.round(profile.height_cm))
        : '',
    );
    setWeightInput(
      profile.current_weight_kg
        ? isImperial
          ? String(Math.round(profile.current_weight_kg * 2.20462))
          : String(Math.round(profile.current_weight_kg))
        : '',
    );
  }, [profile, isImperial]);

  const handleSave = async () => {
    try {
      const updates: Record<string, unknown> = {};

      if (firstName !== (profile?.first_name || '')) updates.first_name = firstName.trim() || null;
      if (lastName !== (profile?.last_name || '')) updates.last_name = lastName.trim() || null;
      if (dateOfBirth !== (profile?.date_of_birth || '')) updates.date_of_birth = dateOfBirth.trim() || null;
      if (sex !== (profile?.sex || '')) updates.sex = sex || null;

      const parsedHeight = parseFloat(heightInput);
      if (!Number.isNaN(parsedHeight)) {
        const nextHeightCm = isImperial ? Number((parsedHeight * 2.54).toFixed(2)) : parsedHeight;
        if (nextHeightCm !== profile?.height_cm) {
          updates.height_cm = nextHeightCm;
        }
      }

      const parsedWeight = parseFloat(weightInput);
      if (!Number.isNaN(parsedWeight)) {
        const nextWeightKg = isImperial ? Number((parsedWeight / 2.20462).toFixed(2)) : parsedWeight;
        if (nextWeightKg !== profile?.current_weight_kg) {
          updates.current_weight_kg = nextWeightKg;
        }
      }

      if (!Object.keys(updates).length) {
        router.back();
        return;
      }

      await updateProfileMutation.mutateAsync(updates as any);
      router.back();
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Could not save your profile.');
    }
  };

  const InputField = ({
    label,
    value,
    onChangeText,
    keyboardType = 'default',
    editable = true,
    placeholder,
  }: {
    label: string;
    value: string;
    onChangeText?: (text: string) => void;
    keyboardType?: 'default' | 'numeric' | 'email-address';
    editable?: boolean;
    placeholder?: string;
  }) => (
    <View style={styles.inputContainer}>
      <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.familyMedium }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: editable ? c.surface2 : c.surface,
            color: editable ? c.text : c.textMuted,
            fontFamily: ty.body.family,
            borderColor: c.border,
            borderRadius: r.md,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
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

  const initials = firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : null;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <LinearGradient colors={[c.surface, c.bg]} style={StyleSheet.absoluteFill} />

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
          </View>
        </View>

        <GlassCard intensity="light" style={{ padding: s.xl, marginTop: s.xl }}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField label="First Name" value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={{ width: s.md }} />
            <View style={{ flex: 1 }}>
              <InputField label="Last Name" value={lastName} onChangeText={setLastName} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputField
                label={`Weight (${isImperial ? 'lbs' : 'kg'})`}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: s.md }} />
            <View style={{ flex: 1 }}>
              <InputField
                label={`Height (${isImperial ? 'in' : 'cm'})`}
                value={heightInput}
                onChangeText={setHeightInput}
                keyboardType="numeric"
              />
            </View>
          </View>

          <InputField
            label="Date of Birth"
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
          />

          <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.body.familyMedium }]}>Sex</Text>
          <View style={styles.segmentRow}>
            {(['male', 'female', 'other'] as const).map((option) => {
              const selected = sex === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setSex(option)}
                  style={[
                    styles.segment,
                    {
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: selected ? `${c.primary}18` : c.surface2,
                    },
                  ]}
                >
                  <Text style={{ color: selected ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold }}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <InputField label="Email" value={profile?.email || ''} keyboardType="email-address" editable={false} />
        </GlassCard>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + s.lg, backgroundColor: c.bg, borderTopColor: c.border }]}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: c.primary,
              borderRadius: r.md,
              opacity: pressed || updateProfileMutation.isPending ? 0.8 : 1,
              ...shadow.glow,
            },
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
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  segment: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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

