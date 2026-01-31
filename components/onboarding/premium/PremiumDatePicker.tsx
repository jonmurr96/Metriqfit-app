import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { metriqfitTheme } from '../../../lib/theme';

const { colors: c, spacing: s, radius: r, glass } = metriqfitTheme;

interface PremiumDatePickerProps {
  label: string;
  value: string | null; // ISO date string (YYYY-MM-DD)
  onChange: (date: string) => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

export function PremiumDatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  maximumDate,
  minimumDate,
}: PremiumDatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Convert ISO string to Date object
  const dateValue = value ? new Date(value) : new Date();

  // Format date for display (e.g., "Jan 15, 1990")
  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      // Convert to ISO format (YYYY-MM-DD)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const isoDate = `${year}-${month}-${day}`;
      onChange(isoDate);
    }
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      setShowPicker(true);
    }
  };

  const handleDismiss = () => {
    setShowPicker(false);
  };

  // Web uses native HTML5 date input
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.dateButtonWeb}>
          <Ionicons
            name="calendar-outline"
            size={20}
            color={c.primary}
            style={{ position: 'absolute', left: 16, zIndex: 1, pointerEvents: 'none' } as any}
          />
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            max={maximumDate?.toISOString().split('T')[0]}
            min={minimumDate?.toISOString().split('T')[0]}
            style={{
              width: '100%',
              height: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              fontFamily: 'Sora, sans-serif',
              color: value ? c.text : c.textSubtle,
              cursor: 'pointer',
              paddingLeft: 44,
              paddingRight: 16,
            }}
          />
        </View>
      </View>
    );
  }

  // iOS/Android uses native modal picker
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.dateButton} onPress={handlePress}>
        <Ionicons name="calendar-outline" size={20} color={c.primary} />
        <Text style={[styles.dateText, !value && styles.placeholder]}>
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>

      {showPicker && (
        <>
          {Platform.OS === 'ios' ? (
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <Pressable onPress={handleDismiss}>
                  <Text style={styles.iosPickerButton}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                textColor={c.text}
                themeVariant="dark"
              />
            </View>
          ) : (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display="default"
              onChange={handleChange}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: s.lg,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Sora_600SemiBold',
    color: c.text,
    marginBottom: s.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glass.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: r.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: s.sm,
  },
  dateButtonWeb: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glass.background,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: r.sm,
    height: 52,
  },
  dateText: {
    fontSize: 15,
    fontFamily: 'Sora_400Regular',
    color: c.text,
  },
  placeholder: {
    color: c.textSubtle,
  },
  iosPickerContainer: {
    backgroundColor: c.surface,
    borderRadius: r.lg,
    marginTop: s.md,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: s.lg,
    paddingVertical: s.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  iosPickerButton: {
    fontSize: 16,
    fontFamily: 'Sora_600SemiBold',
    color: c.primary,
  },
});
