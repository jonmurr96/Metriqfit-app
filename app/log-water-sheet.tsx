import { StyleSheet, View, Text, Pressable, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useTokens } from '../lib/theme';
import { TabBarIcon } from '../components/navigation/TabBarIcon';
import { useDailyWaterSummary, useLogWater } from '../hooks/useWater';
import { mlToOz, ozToMl } from '../utils/unitConversion';

type WaterUnit = 'ml' | 'oz';

const MIN_LOG_ML = 30;
const MAX_LOG_ML = 5000;

const COMMON_BOTTLE_PRESETS = [
  { id: 'cup-8', label: 'Cup', amountMl: 237 },
  { id: 'bottle-12', label: 'Bottle', amountMl: 355 },
  { id: 'standard-17', label: 'Standard', amountMl: 500 },
  { id: 'sport-20', label: 'Sport', amountMl: 591 },
  { id: 'large-24', label: 'Large', amountMl: 710 },
  { id: 'tumbler-32', label: 'Tumbler', amountMl: 946 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatUnitAmount(amountMl: number, unit: WaterUnit) {
  if (unit === 'ml') return `${Math.round(amountMl)} ml`;
  return `${mlToOz(amountMl).toFixed(1)} oz`;
}

function formatInputValue(amountMl: number, unit: WaterUnit) {
  if (unit === 'ml') return Math.round(amountMl).toLocaleString();
  return mlToOz(amountMl).toFixed(1);
}

export default function LogWaterSheet() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [unit, setUnit] = useState<WaterUnit>('ml');
  const [amountMl, setAmountMl] = useState(500);
  const [manualInput, setManualInput] = useState('');
  const logWaterMutation = useLogWater();
  const today = new Date().toISOString().split('T')[0];
  const { data: dailySummary } = useDailyWaterSummary(today);

  const totalLoggedToday = dailySummary?.totalMl || 0;
  const dailyTarget = dailySummary?.targetMl || 2500;
  const remainingMl = Math.max(0, dailyTarget - totalLoggedToday);
  const completionPct = Math.min(100, Math.round((totalLoggedToday / Math.max(1, dailyTarget)) * 100));
  const projectedPct = Math.min(100, Math.round(((totalLoggedToday + amountMl) / Math.max(1, dailyTarget)) * 100));
  const selectedPreset = COMMON_BOTTLE_PRESETS.find((preset) => preset.amountMl === amountMl);
  const recentLogs = dailySummary?.logs?.slice(0, 5) || [];

  const adjustmentButtons = useMemo(
    () => (
      unit === 'ml'
        ? [
            { label: '-100 ml', delta: -100 },
            { label: '-50 ml', delta: -50 },
            { label: '+50 ml', delta: 50 },
            { label: '+100 ml', delta: 100 },
          ]
        : [
            { label: '-4 oz', delta: -4 },
            { label: '-2 oz', delta: -2 },
            { label: '+2 oz', delta: 2 },
            { label: '+4 oz', delta: 4 },
          ]
    ),
    [unit]
  );

  const formatLogTime = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const parsedManual = Number(manualInput.replace(',', '.'));
  const isManualValid = Number.isFinite(parsedManual) && parsedManual > 0;
  const manualAmountMl = isManualValid
    ? clamp(unit === 'ml' ? Math.round(parsedManual) : ozToMl(parsedManual), MIN_LOG_ML, MAX_LOG_ML)
    : null;

  const applyManualAmount = () => {
    if (!manualAmountMl) return;
    setAmountMl(manualAmountMl);
    setManualInput('');
  };

  const addManualNow = () => {
    if (!manualAmountMl || logWaterMutation.isPending) return;
    logWaterMutation.mutate(manualAmountMl, {
      onSuccess: () => {
        router.back();
      },
      onError: (err) => {
        console.error('[LogWater] Error saving manual entry:', err);
      },
    });
  };

  const changeAmount = (delta: number) => {
    const deltaMl = unit === 'ml' ? delta : ozToMl(delta);
    setAmountMl((prev) => clamp(prev + deltaMl, MIN_LOG_ML, MAX_LOG_ML));
  };

  const handleSave = () => {
    logWaterMutation.mutate(amountMl, {
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          paddingHorizontal: s.lg,
          paddingTop: s.lg,
          paddingBottom: s.xl,
          gap: s.lg,
        }}
      >
        <View
          style={[
            styles.progressCard,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              borderRadius: r.lg,
            },
          ]}
        >
          <View style={styles.progressHeader}>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
              Hydration Today
            </Text>
            <View style={[styles.badge, { backgroundColor: c.opacity.primaryLight }]}>
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                {completionPct}%
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>Logged</Text>
              <Text style={{ color: c.text, fontFamily: ty.mono.family, fontSize: ty.sizes.lg }}>
                {formatInputValue(totalLoggedToday, unit)} {unit}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>Goal</Text>
              <Text style={{ color: c.text, fontFamily: ty.mono.family, fontSize: ty.sizes.lg }}>
                {formatInputValue(dailyTarget, unit)} {unit}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>Remaining</Text>
              <Text style={{ color: c.text, fontFamily: ty.mono.family, fontSize: ty.sizes.lg }}>
                {formatInputValue(remainingMl, unit)} {unit}
              </Text>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: c.surface2 }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${completionPct}%`,
                  backgroundColor: c.primary,
                },
              ]}
            />
          </View>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.xs }}>
            After this log: {projectedPct}% of daily target
          </Text>
        </View>

        <View
          style={[
            styles.amountCard,
            {
              backgroundColor: c.surface,
              borderRadius: r.lg,
              borderColor: c.border,
            },
          ]}
        >
          <View style={[styles.toggle, { backgroundColor: c.bg, borderColor: c.border, borderRadius: r.xl }]}>
            <Pressable
              style={[
                styles.toggleButton,
                unit === 'ml' && { backgroundColor: c.surface2, borderRadius: r.lg },
              ]}
              onPress={() => setUnit('ml')}
            >
              <Text style={{ color: unit === 'ml' ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                ML
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.toggleButton,
                unit === 'oz' && { backgroundColor: c.surface2, borderRadius: r.lg },
              ]}
              onPress={() => setUnit('oz')}
            >
              <Text style={{ color: unit === 'oz' ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                OZ
              </Text>
            </Pressable>
          </View>
          <View style={[styles.iconWrap, { backgroundColor: c.opacity.primaryLight }]}>
            <TabBarIcon name="water" color={c.primary} size={30} />
          </View>
          <Text style={{ color: c.text, fontFamily: ty.mono.family, fontSize: 54, marginTop: s.sm }}>
            {formatInputValue(amountMl, unit)}
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.lg }}>{unit}</Text>
          <Text style={{ color: c.textSubtle, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
            {selectedPreset ? `${selectedPreset.label} size selected` : 'Custom amount selected'}
          </Text>
        </View>

        <View>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm, letterSpacing: 0.8 }}>
            COMMON BOTTLE SIZES
          </Text>
          <View style={styles.presetGrid}>
            {COMMON_BOTTLE_PRESETS.map((preset) => {
              const active = amountMl === preset.amountMl;
              const primary = formatUnitAmount(preset.amountMl, unit);
              const secondary = unit === 'ml'
                ? `${mlToOz(preset.amountMl).toFixed(1)} oz`
                : `${preset.amountMl} ml`;

              return (
                <Pressable
                  key={preset.id}
                  onPress={() => setAmountMl(preset.amountMl)}
                  style={[
                    styles.presetButton,
                    {
                      backgroundColor: active ? c.opacity.primaryMedium : c.surface,
                      borderColor: active ? c.primary : c.border,
                      borderRadius: r.md,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: ty.body.familySemibold,
                      fontSize: ty.sizes.md,
                    }}
                  >
                    {primary}
                  </Text>
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                    {preset.label}
                  </Text>
                  <Text style={{ color: c.textSubtle, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 2 }}>
                    {secondary}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.manualCard,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              borderRadius: r.md,
            },
          ]}
        >
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm }}>
            MANUAL ADD
          </Text>
          <View style={styles.manualRow}>
            <TextInput
              value={manualInput}
              onChangeText={setManualInput}
              keyboardType="decimal-pad"
              placeholder={`Enter amount (${unit})`}
              placeholderTextColor={c.textSubtle}
              style={[
                styles.manualInput,
                {
                  backgroundColor: c.surface2,
                  borderColor: c.border,
                  color: c.text,
                  fontFamily: ty.mono.family,
                  borderRadius: r.sm,
                },
              ]}
            />
            <Pressable
              style={[
                styles.manualApply,
                {
                  backgroundColor: isManualValid ? c.primary : c.surface2,
                  borderRadius: r.sm,
                },
              ]}
              onPress={applyManualAmount}
              disabled={!isManualValid || logWaterMutation.isPending}
            >
              <Text style={{ color: isManualValid ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold }}>
                Use
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.manualApply,
                {
                  backgroundColor: isManualValid ? c.accent : c.surface2,
                  borderRadius: r.sm,
                },
              ]}
              onPress={addManualNow}
              disabled={!isManualValid || logWaterMutation.isPending}
            >
              <Text style={{ color: isManualValid ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold }}>
                Add
              </Text>
            </Pressable>
          </View>
        </View>

        <View
          style={[
            styles.adjustCard,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              borderRadius: r.md,
            },
          ]}
        >
          <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm }}>
            FINE TUNE
          </Text>
          <View style={styles.adjustRow}>
            {adjustmentButtons.map((button) => (
              <Pressable
                key={button.label}
                style={[
                  styles.adjustButton,
                  {
                    backgroundColor: c.surface2,
                    borderColor: c.border,
                    borderRadius: r.sm,
                  },
                ]}
                onPress={() => changeAmount(button.delta)}
              >
                <Text style={{ color: c.text, fontFamily: ty.mono.family, fontSize: ty.sizes.md }}>{button.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {recentLogs.length ? (
          <View
            style={[
              styles.recentCard,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                borderRadius: r.md,
              },
            ]}
          >
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs, marginBottom: s.sm }}>
              RECENT LOGS
            </Text>
            <View style={styles.recentWrap}>
              {recentLogs.map((log) => (
                <View
                  key={log.id}
                  style={[
                    styles.recentPill,
                    {
                      backgroundColor: c.surface2,
                      borderColor: c.border,
                      borderRadius: r.pill,
                    },
                  ]}
                >
                  <TabBarIcon name="time-outline" color={c.textMuted} size={14} />
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                    {formatLogTime(log.logged_at)}
                  </Text>
                  <Text style={{ color: c.text, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>
                    {formatUnitAmount(log.amount_ml, unit)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

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
        <Pressable onPress={handleSave} disabled={logWaterMutation.isPending} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
          <LinearGradient
            colors={logWaterMutation.isPending ? [c.surface2, c.surface2] : [c.primary, c.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.saveButton, { borderRadius: r.md }]}
          >
            {logWaterMutation.isPending ? (
              <>
                <ActivityIndicator color={c.bg} />
                <Text
                  style={{
                    color: c.bg,
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
                <TabBarIcon name="water" color={c.bg} size={20} />
                <Text
                  style={{
                    color: c.bg,
                    fontFamily: ty.heading.familySemibold,
                    fontSize: ty.sizes.lg,
                    marginLeft: s.sm,
                  }}
                >
                  Log {formatUnitAmount(amountMl, unit)}
                </Text>
              </>
            )}
          </LinearGradient>
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
  progressCard: {
    borderWidth: 1,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statsRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statItem: {
    flex: 1,
  },
  progressTrack: {
    marginTop: 14,
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  amountCard: {
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 16,
  },
  toggle: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetButton: {
    width: '48%',
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  manualCard: {
    borderWidth: 1,
    padding: 14,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  manualApply: {
    minWidth: 70,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  adjustCard: {
    borderWidth: 1,
    padding: 14,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustButton: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  recentCard: {
    borderWidth: 1,
    padding: 14,
  },
  recentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentPill: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  footer: {},
  saveButton: {
    minHeight: 54,
    flexDirection: 'row',
    paddingVertical: 14,
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
