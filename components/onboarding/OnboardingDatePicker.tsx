import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { metriqfitTheme } from '../../lib/theme';

const { colors: c, radius: r, spacing: s } = metriqfitTheme;

interface OnboardingDatePickerProps {
  label: string;
  value: string | null;
  onChange: (date: string) => void;
  placeholder?: string;
}

export function OnboardingDatePicker({
  label,
  value,
  onChange,
  placeholder = 'MM/DD/YYYY',
}: OnboardingDatePickerProps) {
  const [month, setMonth] = useState(value ? value.split('/')[0] : '');
  const [day, setDay] = useState(value ? value.split('/')[1] : '');
  const [year, setYear] = useState(value ? value.split('/')[2] : '');

  const handleChange = (m: string, d: string, y: string) => {
    setMonth(m);
    setDay(d);
    setYear(y);

    if (m.length === 2 && d.length === 2 && y.length === 4) {
      const numMonth = parseInt(m);
      const numDay = parseInt(d);
      const numYear = parseInt(y);

      if (numMonth >= 1 && numMonth <= 12 && numDay >= 1 && numDay <= 31 && numYear >= 1920 && numYear <= 2020) {
        onChange(`${m}/${d}/${y}`);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
            placeholder="MM"
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            maxLength={2}
            value={month}
            onChangeText={(m) => handleChange(m, day, year)}
          />
          <Text style={[styles.dateLabel, { color: c.textMuted }]}>Month</Text>
        </View>
        <Text style={[styles.separator, { color: c.textMuted }]}>/</Text>
        <View style={styles.dateField}>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
            placeholder="DD"
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            maxLength={2}
            value={day}
            onChangeText={(d) => handleChange(month, d, year)}
          />
          <Text style={[styles.dateLabel, { color: c.textMuted }]}>Day</Text>
        </View>
        <Text style={[styles.separator, { color: c.textMuted }]}>/</Text>
        <View style={[styles.dateField, styles.yearField]}>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, color: c.text, borderColor: c.border }]}
            placeholder="YYYY"
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            maxLength={4}
            value={year}
            onChangeText={(y) => handleChange(month, day, y)}
          />
          <Text style={[styles.dateLabel, { color: c.textMuted }]}>Year</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: s.md,
  },
  label: {
    fontSize: 14,
    marginBottom: s.sm,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s.xs,
  },
  dateField: {
    flex: 1,
  },
  yearField: {
    flex: 1.5,
  },
  input: {
    height: 52,
    borderRadius: r.md,
    borderWidth: 1,
    paddingHorizontal: s.md,
    fontSize: 18,
    textAlign: 'center',
  },
  dateLabel: {
    fontSize: 12,
    marginTop: s.xs,
    textAlign: 'center',
  },
  separator: {
    fontSize: 24,
    marginTop: 12,
  },
});
