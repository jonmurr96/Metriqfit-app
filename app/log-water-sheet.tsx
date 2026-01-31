import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTokens } from '../lib/theme';
import { TabBarIcon } from '../components/navigation/TabBarIcon';
import { useLogWater } from '../hooks/useWater';

export default function LogWaterSheet() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState(250);
  const logWaterMutation = useLogWater();

  const presets = [
    { label: 'Glass', amount: 250, icon: '🥛' },
    { label: 'Bottle', amount: 500, icon: '🍶' },
    { label: 'Large', amount: 750, icon: '🫗' },
    { label: 'Liter', amount: 1000, icon: '💧' },
  ];

  const handleSave = () => {
    logWaterMutation.mutate(amount, {
      onSuccess: () => {
        router.back();
      },
      onError: (err) => {
        console.error('[LogWater] Error saving:', err);
      },
    });
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
            Log Water
          </Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, { padding: s.xl }]}>
        {/* Amount Display */}
        <View
          style={[
            styles.amountCard,
            {
              backgroundColor: c.surface,
              borderRadius: r.lg,
              padding: s.xl,
              borderWidth: 1,
              borderColor: c.border,
            },
          ]}
        >
          <TabBarIcon name="water" color={c.accent} size={48} />
          <Text
            style={{
              color: c.text,
              fontFamily: ty.mono.family,
              fontSize: 56,
              marginTop: s.md,
            }}
          >
            {amount}
          </Text>
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.lg,
            }}
          >
            ml
          </Text>
        </View>

        {/* Quick Presets */}
        <View style={[styles.presets, { marginTop: s.xl }]}>
          {presets.map((preset) => (
            <Pressable
              key={preset.label}
              style={[
                styles.presetButton,
                {
                  backgroundColor: amount === preset.amount ? c.primary : c.surface,
                  borderRadius: r.md,
                  borderWidth: 1,
                  borderColor: amount === preset.amount ? c.primary : c.border,
                },
              ]}
              onPress={() => setAmount(preset.amount)}
            >
              <Text style={{ fontSize: 24 }}>{preset.icon}</Text>
              <Text
                style={{
                  color: amount === preset.amount ? c.bg : c.text,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.md,
                  marginTop: s.xs,
                }}
              >
                {preset.amount}ml
              </Text>
              <Text
                style={{
                  color: amount === preset.amount ? c.bg : c.textMuted,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  opacity: 0.8,
                }}
              >
                {preset.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Adjust Buttons */}
        <View style={[styles.adjustRow, { marginTop: s.xl }]}>
          <Pressable
            style={[
              styles.adjustButton,
              {
                backgroundColor: c.surface,
                borderRadius: r.md,
                borderWidth: 1,
                borderColor: c.border,
              },
            ]}
            onPress={() => setAmount(Math.max(50, amount - 50))}
          >
            <Text
              style={{
                color: c.text,
                fontFamily: ty.mono.family,
                fontSize: ty.sizes.xl,
              }}
            >
              -50
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.adjustButton,
              {
                backgroundColor: c.surface,
                borderRadius: r.md,
                borderWidth: 1,
                borderColor: c.border,
              },
            ]}
            onPress={() => setAmount(amount + 50)}
          >
            <Text
              style={{
                color: c.text,
                fontFamily: ty.mono.family,
                fontSize: ty.sizes.xl,
              }}
            >
              +50
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Error Message */}
      {logWaterMutation.error && (
        <View style={[styles.errorBanner, { backgroundColor: c.danger, marginHorizontal: s.lg }]}>
          <Text style={{ color: '#fff', fontFamily: ty.body.family, fontSize: ty.sizes.sm, textAlign: 'center' }}>
            Failed to save water. Please try again.
          </Text>
        </View>
      )}

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
              backgroundColor: logWaterMutation.isPending ? c.textMuted : c.primary,
              borderRadius: r.md,
            },
          ]}
          onPress={handleSave}
          disabled={logWaterMutation.isPending}
        >
          {logWaterMutation.isPending ? (
            <Text
              style={{
                color: c.bg,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
              }}
            >
              Saving...
            </Text>
          ) : (
            <>
              <TabBarIcon name="water" color={c.bg} size={20} />
              <Text
                style={{
                  color: c.bg,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: ty.sizes.lg,
                  marginLeft: s.sm,
                }}
              >
                Log {amount}ml
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
  amountCard: {
    alignItems: 'center',
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 12,
  },
  adjustButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  footer: {},
  saveButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
});

