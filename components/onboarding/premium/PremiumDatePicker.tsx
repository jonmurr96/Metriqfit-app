import React, { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
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

  const dateValue = value ? new Date(value) : new Date();

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

  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: s.lg }}>
        <Text style={{ fontSize: 14, fontFamily: 'Sora_600SemiBold', color: c.text, marginBottom: s.sm }}>{label}</Text>
        <View
          className="relative flex-row items-center border h-[52px]"
          style={{ backgroundColor: glass.background, borderColor: c.border, borderRadius: r.sm }}
        >
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

  return (
    <View style={{ marginBottom: s.lg }}>
      <Text style={{ fontSize: 14, fontFamily: 'Sora_600SemiBold', color: c.text, marginBottom: s.sm }}>{label}</Text>
      <Pressable
        className="flex-row items-center border"
        style={{ backgroundColor: glass.background, borderColor: c.border, borderRadius: r.sm, paddingHorizontal: 16, paddingVertical: 14, gap: s.sm }}
        onPress={handlePress}
      >
        <Ionicons name="calendar-outline" size={20} color={c.primary} />
        <Text style={{ fontSize: 15, fontFamily: 'Sora_400Regular', color: value ? c.text : c.textSubtle }}>
          {value ? formatDate(value) : placeholder}
        </Text>
      </Pressable>

      {showPicker && (
        <>
          {Platform.OS === 'ios' ? (
            <View
              className="overflow-hidden"
              style={{ backgroundColor: c.surface, borderRadius: r.lg, marginTop: s.md }}
            >
              <View
                className="flex-row justify-end border-b"
                style={{ paddingHorizontal: s.lg, paddingVertical: s.md, borderBottomColor: c.border }}
              >
                <Pressable onPress={handleDismiss}>
                  <Text style={{ fontSize: 16, fontFamily: 'Sora_600SemiBold', color: c.primary }}>Done</Text>
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
