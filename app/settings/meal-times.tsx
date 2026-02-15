import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  TextInput,
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';

import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';
import { useMealTimes, formatTime12h, DEFAULT_MEAL_TIMES, type MealTimes } from '../../hooks/useMealTimes';
import { isValidTime } from '../../services/mealTimesService';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface TimeInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: string;
  color: string;
}

function TimeInput({ label, value, onChange, icon, color }: TimeInputProps) {
  const { c, s, ty, r } = useTokens();
  const [localValue, setLocalValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (text: string) => {
    setLocalValue(text);
    const valid = isValidTime(text);
    setIsValid(valid);
    if (valid) {
      onChange(text);
    }
  };

  const displayTime = formatTime12h(localValue || '00:00');

  return (
    <View style={[styles.timeInputContainer, { marginBottom: s.lg }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
        <TabBarIcon name={icon as any} color={color} size={20} />
      </View>
      <View style={styles.inputWrapper}>
        <Text style={[styles.inputLabel, { color: c.textMuted, fontFamily: ty.body.familyMedium }]}>
          {label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            value={localValue}
            onChangeText={handleChange}
            placeholder={label === 'Snacks' ? 'anytime' : '08:30'}
            placeholderTextColor={c.textSubtle}
            style={[
              styles.timeInput,
              {
                color: c.text,
                fontFamily: ty.mono.family,
                borderColor: isValid ? c.border : c.danger,
                backgroundColor: c.surface,
                borderRadius: r.md,
              }
            ]}
            maxLength={label === 'Snacks' ? 7 : 5}
          />
          <Text style={[styles.displayTime, { color: c.textMuted, fontFamily: ty.body.family, marginLeft: s.md }]}>
            = {displayTime}
          </Text>
        </View>
        {!isValid && (
          <Text style={[styles.errorText, { color: c.danger, fontFamily: ty.body.family, fontSize: 12 }]}>
            Use HH:MM format (e.g., 08:30)
          </Text>
        )}
      </View>
    </View>
  );
}

export default function MealTimesScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { mealTimes, isLoading, updateMealTimes, isUpdating } = useMealTimes();
  const [localTimes, setLocalTimes] = useState<MealTimes>(DEFAULT_MEAL_TIMES);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (mealTimes) {
      setLocalTimes(mealTimes);
    }
  }, [mealTimes]);

  const handleTimeChange = (meal: MealType, value: string) => {
    setLocalTimes(prev => ({ ...prev, [meal]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Validate all times
    const invalidMeals = Object.entries(localTimes).filter(([_, time]) => !isValidTime(time));
    if (invalidMeals.length > 0) {
      Alert.alert('Invalid Times', 'Please fix the invalid time formats before saving.');
      return;
    }

    updateMealTimes(localTimes, {
      onSuccess: () => {
        setHasChanges(false);
        Alert.alert('Success', 'Meal times updated successfully!');
      },
      onError: () => {
        Alert.alert('Error', 'Failed to update meal times. Please try again.');
      }
    });
  };

  const handleReset = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will reset all meal times to the default schedule. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setLocalTimes(DEFAULT_MEAL_TIMES);
            setHasChanges(true);
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={{ color: c.textMuted, marginTop: s.md }}>Loading meal times...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + s.md, paddingHorizontal: s.lg }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: c.text, fontFamily: ty.heading.familySemibold }]}>
          Meal Schedule
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400 }}
        >
          {/* Info Card */}
          <GlassCard intensity="light" style={{ marginBottom: s.xl, padding: s.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.infoIcon, { backgroundColor: `${c.primary}20` }]}>
                <TabBarIcon name="information-circle" color={c.primary} size={20} />
              </View>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, flex: 1, fontSize: 14 }}>
                Set your preferred meal times. These will be displayed on your nutrition timeline.
              </Text>
            </View>
          </GlassCard>

          {/* Time Inputs */}
          <View style={{ marginBottom: s.xl }}>
            <TimeInput
              label="Breakfast"
              value={localTimes.breakfast}
              onChange={(value) => handleTimeChange('breakfast', value)}
              icon="sunny-outline"
              color={c.meals.breakfast}
            />
            <TimeInput
              label="Lunch"
              value={localTimes.lunch}
              onChange={(value) => handleTimeChange('lunch', value)}
              icon="sunny"
              color={c.meals.lunch}
            />
            <TimeInput
              label="Dinner"
              value={localTimes.dinner}
              onChange={(value) => handleTimeChange('dinner', value)}
              icon="moon-outline"
              color={c.meals.dinner}
            />
            <TimeInput
              label="Snacks"
              value={localTimes.snack}
              onChange={(value) => handleTimeChange('snack', value)}
              icon="cafe-outline"
              color={c.meals.snack}
            />
          </View>

          {/* Helper Text */}
          <Text style={[styles.helperText, { color: c.textSubtle, fontFamily: ty.body.family, marginBottom: s.xl }]}>
            {'Tip: Use 24-hour format (HH:MM). For snacks, you can use "anytime" or a specific time.'}
          </Text>

          {/* Reset Button */}
          <Pressable
            onPress={handleReset}
            style={[styles.resetButton, { borderColor: c.border }]}
          >
            <TabBarIcon name="refresh-outline" color={c.textMuted} size={18} />
            <Text style={[styles.resetText, { color: c.textMuted, fontFamily: ty.body.family }]}>
              Reset to Defaults
            </Text>
          </Pressable>
        </MotiView>
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={[styles.footer, { paddingBottom: insets.bottom + s.lg, backgroundColor: c.bg }]}
        >
          <Pressable
            onPress={handleSave}
            disabled={isUpdating}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: c.primary,
                borderRadius: r.md,
                opacity: pressed || isUpdating ? 0.8 : 1,
              }
            ]}
          >
            {isUpdating ? (
              <ActivityIndicator color={c.bg} size="small" />
            ) : (
              <>
                <Text style={[styles.saveText, { color: c.bg, fontFamily: ty.heading.familySemibold }]}>
                  Save Changes
                </Text>
                <TabBarIcon name="checkmark" color={c.bg} size={18} />
              </>
            )}
          </Pressable>
        </MotiView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  timeInput: {
    width: 100,
    height: 48,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  displayTime: {
    fontSize: 14,
  },
  errorText: {
    marginTop: 4,
  },
  helperText: {
    fontSize: 13,
    textAlign: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  resetText: {
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 8,
  },
  saveText: {
    fontSize: 16,
  },
});
