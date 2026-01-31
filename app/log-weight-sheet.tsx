import { StyleSheet, View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTokens } from '../lib/theme';
import { TabBarIcon } from '../components/navigation/TabBarIcon';
import { useProfile, useLogMeasurement } from '../hooks/useUser';

export default function LogWeightSheet() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [weight, setWeight] = useState('');
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useProfile();
  const logMeasurement = useLogMeasurement();

  const [selectedUnit, setSelectedUnit] = useState<'lbs' | 'kg'>(
    profile?.unit_system === 'metric' ? 'kg' : 'lbs'
  );

  const handleSave = async () => {
    if (!weight.trim()) return;

    setError(null);

    try {
      const weightValue = parseFloat(weight);
      if (isNaN(weightValue) || weightValue <= 0) {
        setError('Please enter a valid weight');
        return;
      }

      // Convert to kg if needed
      const weightKg = selectedUnit === 'lbs' ? weightValue * 0.453592 : weightValue;

      await logMeasurement.mutateAsync({
        weightKg,
        measurements: {
          waist: parseFloat(measurements.waist) || undefined,
          chest: parseFloat(measurements.chest) || undefined,
          arms: parseFloat(measurements.arms) || undefined,
          thighs: parseFloat(measurements.thighs) || undefined,
          hips: parseFloat(measurements.hips) || undefined,
        }
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save weight');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: s.lg,
            paddingTop: s.lg,
          },
        ]}
      >
        <View style={styles.handleBar}>
          <View style={[styles.handle, { backgroundColor: c.textSubtle }]} />
        </View>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.closeButton, { backgroundColor: c.surface }]}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <TabBarIcon name="close" color={c.text} size={20} />
          </Pressable>
          <Text
            style={{
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.xl,
            }}
          >
            Log Weight
          </Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { padding: s.xl }]}>
        <View
          style={[
            styles.inputCard,
            {
              backgroundColor: c.surface,
              borderRadius: r.lg,
              padding: s.xl,
              borderWidth: 1,
              borderColor: c.border,
            },
          ]}
        >
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.weightInput,
                {
                  color: c.text,
                  fontFamily: ty.mono.family,
                  fontSize: 48,
                },
              ]}
              placeholder="0"
              placeholderTextColor={c.textSubtle}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              maxLength={6}
              autoFocus
            />
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xl,
                marginLeft: s.sm,
              }}
            >
              {selectedUnit}
            </Text>
          </View>

          <View style={[styles.unitToggle, { marginTop: s.xl }]}>
            <Pressable
              style={[
                styles.unitButton,
                {
                  backgroundColor: selectedUnit === 'lbs' ? c.primary : c.surface2,
                  borderRadius: r.sm,
                },
              ]}
              onPress={() => setSelectedUnit('lbs')}
            >
              <Text
                style={{
                  color: selectedUnit === 'lbs' ? c.bg : c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                }}
              >
                lbs
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.unitButton,
                {
                  backgroundColor: selectedUnit === 'kg' ? c.primary : c.surface2,
                  borderRadius: r.sm,
                },
              ]}
              onPress={() => setSelectedUnit('kg')}
            >
              <Text
                style={{
                  color: selectedUnit === 'kg' ? c.bg : c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                }}
              >
                kg
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Additional Measurements */}
        <View style={{ marginTop: s.xl }}>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, marginBottom: s.md }}>
            Body Measurements (Optional)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {['Waist', 'Chest', 'Arms', 'Thighs', 'Hips'].map((part) => (
              <View key={part} style={{ width: '48%' }}>
                <Text style={{ color: c.textSubtle, fontSize: 12, marginBottom: 4 }}>{part} (cm)</Text>
                <TextInput
                  style={{
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: r.md,
                    padding: 12,
                    color: c.text,
                    fontFamily: ty.mono.family
                  }}
                  placeholder="-"
                  placeholderTextColor={c.textSubtle}
                  keyboardType="numeric"
                  onChangeText={(val) => setMeasurements(prev => ({ ...prev, [part.toLowerCase()]: val }))}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Error Banner */}
        {error && (
          <View
            style={{
              backgroundColor: c.opacity.dangerLight,
              borderRadius: r.md,
              padding: s.md,
              marginTop: s.lg,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <TabBarIcon name="alert-circle" color={c.danger} size={16} />
            <Text
              style={{
                color: c.danger,
                fontFamily: ty.body.familyMedium,
                fontSize: ty.sizes.sm,
                marginLeft: s.sm,
                flex: 1,
              }}
            >
              {error}
            </Text>
          </View>
        )}

        {/* Info */}
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.sm,
            textAlign: 'center',
            marginTop: s.lg,
          }}
        >
          Weigh yourself at the same time each day for best results
        </Text>
      </View>

      {/* Save Button */}
      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: s.lg,
            paddingBottom: insets.bottom + s.lg,
            paddingTop: s.lg,
          },
        ]}
      >
        <Pressable
          style={[
            styles.saveButton,
            {
              backgroundColor: weight.trim() && !logMeasurement.isPending ? c.primary : c.surface2,
              borderRadius: r.md,
            },
          ]}
          onPress={handleSave}
          disabled={!weight.trim() || logMeasurement.isPending}
        >
          {logMeasurement.isPending ? (
            <ActivityIndicator color={c.textSubtle} />
          ) : (
            <Text
              style={{
                color: weight.trim() ? c.bg : c.textSubtle,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
              }}
            >
              Save Weight
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
  header: {},
  handleBar: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  inputCard: {
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  weightInput: {
    textAlign: 'center',
    minWidth: 120,
  },
  unitToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  footer: {},
  saveButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

