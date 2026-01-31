
import { StyleSheet, View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTokens } from '../lib/theme';
import { TabBarIcon } from '../components/navigation/TabBarIcon';
import { useLogSteps } from '../hooks/useSteps';

export default function LogStepsSheet() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [steps, setSteps] = useState('');
  const [error, setError] = useState<string | null>(null);

  const logStepsMutation = useLogSteps();

  const handleSave = async () => {
    if (!steps.trim()) return;

    setError(null);

    try {
      const stepsValue = parseInt(steps, 10);
      if (isNaN(stepsValue) || stepsValue <= 0) {
        setError('Please enter a valid number of steps');
        return;
      }

      await logStepsMutation.mutateAsync({ steps: stepsValue });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save steps');
    }
  };

  const presets = [
    { label: '5,000', value: '5000' },
    { label: '7,500', value: '7500' },
    { label: '10,000', value: '10000' },
    { label: '15,000', value: '15000' },
  ];

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
            Log Steps
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
          <TabBarIcon name="walk" color={c.success} size={48} />
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.stepsInput,
                {
                  color: c.text,
                  fontFamily: ty.mono.family,
                  fontSize: 48,
                },
              ]}
              placeholder="0"
              placeholderTextColor={c.textSubtle}
              value={steps}
              onChangeText={setSteps}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.lg,
              marginTop: s.xs,
            }}
          >
            steps
          </Text>
        </View>

        {/* Presets */}
        <View style={[styles.presets, { marginTop: s.xl }]}>
          {presets.map((preset) => (
            <Pressable
              key={preset.value}
              style={[
                styles.presetButton,
                {
                  backgroundColor: steps === preset.value ? c.primary : c.surface,
                  borderRadius: r.md,
                  borderWidth: 1,
                  borderColor: steps === preset.value ? c.primary : c.border,
                },
              ]}
              onPress={() => setSteps(preset.value)}
            >
              <Text
                style={{
                  color: steps === preset.value ? c.bg : c.text,
                  fontFamily: ty.mono.family,
                  fontSize: ty.sizes.md,
                }}
              >
                {preset.label}
              </Text>
            </Pressable>
          ))}
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
            marginTop: s.xl,
          }}
        >
          Manual step entry. Health app sync coming soon!
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
              backgroundColor: steps.trim() && !logStepsMutation.isPending ? c.primary : c.surface2,
              borderRadius: r.md,
            },
          ]}
          onPress={handleSave}
          disabled={!steps.trim() || logStepsMutation.isPending}
        >
          {logStepsMutation.isPending ? (
            <>
              <ActivityIndicator color={c.textSubtle} size="small" />
              <Text
                style={{
                  color: c.textSubtle,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.lg,
                  marginLeft: s.sm,
                }}
              >
                Saving...
              </Text>
            </>
          ) : (
            <>
              <TabBarIcon
                name="walk"
                color={steps.trim() ? c.bg : c.textSubtle}
                size={20}
              />
              <Text
                style={{
                  color: steps.trim() ? c.bg : c.textSubtle,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.lg,
                  marginLeft: s.sm,
                }}
              >
                Log Steps
              </Text>
            </>
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
  },
  inputCard: {
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 16,
  },
  stepsInput: {
    textAlign: 'center',
    minWidth: 150,
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  footer: {},
  saveButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

