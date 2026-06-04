import { ActivityIndicator, Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PressableScale } from '@/components/common/PressableScale';
import { useTokens } from '../lib/theme';
import { TabBarIcon } from '../components/navigation/TabBarIcon';
import { useDailyWaterSummary, useLogWater } from '../hooks/useWater';
import { mlToOz, ozToMl } from '../utils/unitConversion';

type WaterUnit = 'ml' | 'oz';

const MIN_LOG_ML = 30;
const MAX_LOG_ML = 5000;
const QUICK_LOG_PRESETS_ML = [250, 500, 750, 1000];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDisplayValue(amountMl: number, unit: WaterUnit) {
  if (unit === 'ml') return Math.round(amountMl).toLocaleString();
  return mlToOz(amountMl).toFixed(1);
}

function formatUnitAmount(amountMl: number, unit: WaterUnit) {
  return `${formatDisplayValue(amountMl, unit)} ${unit}`;
}

function formatInlineProgressLabel(completionPct: number, remainingMl: number, unit: WaterUnit) {
  return {
    left: `${completionPct}% today`,
    right: `${formatUnitAmount(remainingMl, unit)} left`,
  };
}

function formatLogTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function LogWaterSheet() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [unit, setUnit] = useState<WaterUnit>('ml');
  const [amountMl, setAmountMl] = useState(500);
  const [manualInput, setManualInput] = useState('');
  const [isRecentLogsExpanded, setIsRecentLogsExpanded] = useState(false);
  const [activeQuickLogAmountMl, setActiveQuickLogAmountMl] = useState<number | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const { data: dailySummary } = useDailyWaterSummary(today);
  const logWaterMutation = useLogWater();

  const totalLoggedToday = Number(dailySummary?.totalMl || 0);
  const dailyTarget = Number(dailySummary?.targetMl || 2500);
  const remainingMl = Math.max(0, dailyTarget - totalLoggedToday);
  const completionPct = Math.min(100, Math.round((totalLoggedToday / Math.max(1, dailyTarget)) * 100));
  const projectedPct = Math.min(100, Math.round(((totalLoggedToday + amountMl) / Math.max(1, dailyTarget)) * 100));
  const recentLogs = dailySummary?.logs?.slice(0, 5) || [];

  const progressLabel = useMemo(
    () => formatInlineProgressLabel(completionPct, remainingMl, unit),
    [completionPct, remainingMl, unit],
  );

  const adjustmentButtons = useMemo(
    () => (
      unit === 'ml'
        ? [
            { label: '-100', delta: -100 },
            { label: '-50', delta: -50 },
            { label: '+50', delta: 50 },
            { label: '+100', delta: 100 },
          ]
        : [
            { label: '-4', delta: -4 },
            { label: '-2', delta: -2 },
            { label: '+2', delta: 2 },
            { label: '+4', delta: 4 },
          ]
    ),
    [unit],
  );

  const parsedManual = Number(manualInput.replace(',', '.'));
  const isManualValid = Number.isFinite(parsedManual) && parsedManual > 0;
  const manualAmountMl = isManualValid
    ? clamp(unit === 'ml' ? Math.round(parsedManual) : ozToMl(parsedManual), MIN_LOG_ML, MAX_LOG_ML)
    : null;

  const resetError = () => {
    if (logWaterMutation.error) {
      logWaterMutation.reset();
    }
  };

  const changeAmount = (delta: number) => {
    resetError();
    const deltaMl = unit === 'ml' ? delta : ozToMl(delta);
    setAmountMl((prev) => clamp(prev + deltaMl, MIN_LOG_ML, MAX_LOG_ML));
  };

  const handleQuickLog = (presetAmountMl: number) => {
    if (logWaterMutation.isPending) return;

    resetError();
    setActiveQuickLogAmountMl(presetAmountMl);
    logWaterMutation.mutate(presetAmountMl, {
      onSuccess: () => {
        setActiveQuickLogAmountMl(null);
        router.back();
      },
      onError: () => {
        setActiveQuickLogAmountMl(null);
      },
    });
  };

  const handleSave = () => {
    if (logWaterMutation.isPending) return;

    resetError();
    setActiveQuickLogAmountMl(null);
    logWaterMutation.mutate(amountMl, {
      onSuccess: () => {
        router.back();
      },
    });
  };

  const handleApplyManualAmount = () => {
    if (!manualAmountMl || logWaterMutation.isPending) return;
    resetError();
    setAmountMl(manualAmountMl);
    setManualInput('');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: s.md,
            paddingHorizontal: s.lg,
          },
        ]}
      >
        <View style={styles.handleBar}>
          <View style={[styles.handle, { backgroundColor: c.textSubtle }]} />
        </View>

        <View style={styles.headerRow}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Close log water"
            onPress={() => router.back()}
            style={(pressed) => [
              styles.closeButton,
              {
                borderRadius: r.pill,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: pressed ? c.surface2 : c.surface,
              },
            ]}
          >
            <TabBarIcon name="close" color={c.text} size={18} />
          </PressableScale>

          <View style={styles.headerCopy}>
            <Text
              style={{
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.xl,
                textAlign: 'center',
              }}
            >
              Log Water
            </Text>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
                marginTop: 3,
                textAlign: 'center',
              }}
            >
              {formatUnitAmount(totalLoggedToday, unit)} / {formatUnitAmount(dailyTarget, unit)} today
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: s.lg,
          paddingTop: s.md,
          paddingBottom: 154,
          gap: s.md,
        }}
      >
        <View
          style={[
            styles.primaryZone,
            {
              borderRadius: r.xl,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
              padding: s.lg,
            },
          ]}
        >
          <View style={styles.inlineProgressRow}>
            <Text
              style={{
                color: c.textMuted,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
              }}
            >
              {progressLabel.left}
            </Text>
            <Text
              style={{
                color: c.textSubtle,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
              }}
            >
              {progressLabel.right}
            </Text>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: c.bg, marginTop: s.sm }]}>
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

          <View style={styles.amountWrap}>
            <View
              style={[
                styles.unitToggle,
                {
                  borderRadius: r.pill,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.bg,
                },
              ]}
            >
              {(['ml', 'oz'] as WaterUnit[]).map((value) => {
                const active = unit === value;
                return (
                  <PressableScale
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${value} for water amounts`}
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      resetError();
                      setUnit(value);
                    }}
                    style={(pressed) => [
                      styles.unitToggleButton,
                      {
                        borderRadius: r.pill,
                        backgroundColor: active ? c.surface2 : pressed ? c.surface2 : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? c.primary : c.textMuted,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.xs,
                      }}
                    >
                      {value.toUpperCase()}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            <View
              style={[
                styles.amountDial,
                {
                  borderRadius: 120,
                  borderWidth: 1,
                  borderColor: `${c.primary}2A`,
                  backgroundColor: c.bg,
                },
              ]}
            >
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.mono.family,
                  fontSize: 54,
                  letterSpacing: -1,
                }}
              >
                {formatDisplayValue(amountMl, unit)}
              </Text>
              <Text
                style={{
                  color: c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.md,
                  marginTop: 4,
                }}
              >
                {unit}
              </Text>
              <Text
                style={{
                  color: c.textSubtle,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  marginTop: s.sm,
                }}
              >
                After log: {projectedPct}%
              </Text>
            </View>

            <View style={styles.stepperCluster}>
              {adjustmentButtons.map((button) => (
                <PressableScale
                  key={button.label}
                  accessibilityRole="button"
                  accessibilityLabel={`Adjust water amount ${button.label} ${unit}`}
                  onPress={() => changeAmount(button.delta)}
                  disabled={logWaterMutation.isPending}
                  style={(pressed) => [
                    styles.stepperChip,
                    {
                      borderRadius: r.md,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: pressed ? c.surface2 : c.bg,
                      opacity: logWaterMutation.isPending ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: ty.mono.family,
                      fontSize: ty.sizes.xs,
                    }}
                  >
                    {button.label}
                  </Text>
                </PressableScale>
              ))}
            </View>
          </View>

          <View style={styles.quickChipRow}>
            {QUICK_LOG_PRESETS_ML.map((presetAmountMl) => {
              const isActiveQuickLog = activeQuickLogAmountMl === presetAmountMl;
              return (
                <PressableScale
                  key={presetAmountMl}
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${Math.round(presetAmountMl)} milliliters of water`}
                  onPress={() => handleQuickLog(presetAmountMl)}
                  disabled={logWaterMutation.isPending}
                  style={(pressed) => [
                    styles.quickChip,
                    {
                      borderRadius: r.pill,
                      borderWidth: 1,
                      borderColor: isActiveQuickLog ? `${c.primary}66` : c.border,
                      backgroundColor: pressed || isActiveQuickLog ? c.surface2 : c.bg,
                      opacity: logWaterMutation.isPending && !isActiveQuickLog ? 0.55 : 1,
                    },
                  ]}
                >
                  {isActiveQuickLog ? (
                    <ActivityIndicator color={c.primary} />
                  ) : (
                    <Text
                      style={{
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.sm,
                      }}
                    >
                      {formatUnitAmount(presetAmountMl, unit)}
                    </Text>
                  )}
                </PressableScale>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.secondaryZone,
            {
              borderRadius: r.lg,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
            },
          ]}
        >
          <View style={[styles.customRow, { paddingHorizontal: s.md, paddingVertical: s.md }]}>
            <View style={styles.customLabel}>
              <Text
                style={{
                  color: c.text,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                }}
              >
                Custom
              </Text>
              <Text
                style={{
                  color: c.textSubtle,
                  fontFamily: ty.body.family,
                  fontSize: ty.sizes.xs,
                  marginTop: 2,
                }}
              >
                Apply a precise amount
              </Text>
            </View>

            <TextInput
              value={manualInput}
              onChangeText={(value) => {
                resetError();
                setManualInput(value);
              }}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              blurOnSubmit
              placeholder={unit === 'ml' ? 'ml' : 'oz'}
              placeholderTextColor={c.textSubtle}
              style={[
                styles.customInput,
                {
                  borderRadius: r.md,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.bg,
                  color: c.text,
                  fontFamily: ty.mono.family,
                },
              ]}
            />

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Apply custom water amount"
              onPress={handleApplyManualAmount}
              disabled={!isManualValid || logWaterMutation.isPending}
              style={(pressed) => [
                styles.applyButton,
                {
                  borderRadius: r.md,
                  backgroundColor: isManualValid ? (pressed ? `${c.primary}CC` : c.primary) : c.surface2,
                },
              ]}
            >
              <Text
                style={{
                  color: isManualValid ? c.bg : c.textMuted,
                  fontFamily: ty.body.familySemibold,
                  fontSize: ty.sizes.sm,
                }}
              >
                Apply
              </Text>
            </PressableScale>
          </View>

          {recentLogs.length ? (
            <>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={isRecentLogsExpanded ? 'Collapse recent logs' : 'Expand recent logs'}
                accessibilityState={{ expanded: isRecentLogsExpanded }}
                onPress={() => setIsRecentLogsExpanded((current) => !current)}
                style={(pressed) => [
                  styles.recentHeader,
                  {
                    paddingHorizontal: s.md,
                    paddingVertical: s.md,
                    backgroundColor: pressed ? c.surface2 : 'transparent',
                  },
                ]}
              >
                <View>
                  <Text
                    style={{
                      color: c.text,
                      fontFamily: ty.body.familySemibold,
                      fontSize: ty.sizes.sm,
                    }}
                  >
                    Recent logs
                  </Text>
                  <Text
                    style={{
                      color: c.textSubtle,
                      fontFamily: ty.body.family,
                      fontSize: ty.sizes.xs,
                      marginTop: 2,
                    }}
                  >
                    {recentLogs.length} today
                  </Text>
                </View>
                <View style={styles.recentHeaderRight}>
                  <Text
                    style={{
                      color: c.textMuted,
                      fontFamily: ty.body.family,
                      fontSize: ty.sizes.xs,
                    }}
                  >
                    {formatLogTime(recentLogs[0].logged_at)}
                  </Text>
                  <TabBarIcon
                    name={isRecentLogsExpanded ? 'chevron-up' : 'chevron-down'}
                    color={c.textMuted}
                    size={18}
                  />
                </View>
              </PressableScale>

              {isRecentLogsExpanded ? (
                <View style={{ paddingHorizontal: s.md, paddingBottom: s.md, gap: s.xs }}>
                  {recentLogs.map((log) => (
                    <View key={log.id} style={styles.recentItem}>
                      <Text
                        style={{
                          color: c.textMuted,
                          fontFamily: ty.body.family,
                          fontSize: ty.sizes.xs,
                        }}
                      >
                        {formatLogTime(log.logged_at)}
                      </Text>
                      <Text
                        style={{
                          color: c.text,
                          fontFamily: ty.mono.family,
                          fontSize: ty.sizes.sm,
                        }}
                      >
                        {formatUnitAmount(log.amount_ml, unit)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>

      {logWaterMutation.error ? (
        <View
          style={[
            styles.errorBanner,
            {
              marginHorizontal: s.lg,
              marginBottom: s.sm,
              borderRadius: r.md,
              backgroundColor: c.opacity.dangerLight,
              borderWidth: 1,
              borderColor: `${c.danger}33`,
            },
          ]}
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
            Couldn’t save water right now. Try again.
          </Text>
        </View>
      ) : null}

      <View
        style={[
          styles.footer,
          {
            paddingHorizontal: s.lg,
            paddingTop: s.sm,
            paddingBottom: insets.bottom + s.lg,
            borderTopWidth: 1,
            borderTopColor: c.border,
            backgroundColor: `${c.bg}F2`,
          },
        ]}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Log ${formatUnitAmount(amountMl, unit)} of water`}
          onPress={handleSave}
          disabled={logWaterMutation.isPending}
          style={(pressed) => [
            styles.footerButton,
            {
              borderRadius: r.md,
              backgroundColor: pressed ? `${c.primary}CC` : c.primary,
              opacity: logWaterMutation.isPending ? 0.65 : 1,
            },
          ]}
        >
          {logWaterMutation.isPending && activeQuickLogAmountMl == null ? (
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
            <Text
              style={{
                color: c.bg,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.lg,
              }}
            >
              Log {formatUnitAmount(amountMl, unit)}
            </Text>
          )}
        </PressableScale>
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
    paddingBottom: 8,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    opacity: 0.4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  primaryZone: {},
  inlineProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  amountWrap: {
    alignItems: 'center',
    marginTop: 14,
  },
  unitToggle: {
    flexDirection: 'row',
    padding: 4,
    alignSelf: 'flex-end',
  },
  unitToggleButton: {
    minHeight: 32,
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  amountDial: {
    width: 204,
    height: 204,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
  },
  stepperCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  stepperChip: {
    minWidth: 68,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  quickChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  quickChip: {
    minWidth: 82,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryZone: {},
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customLabel: {
    width: 88,
  },
  customInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  applyButton: {
    minWidth: 78,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  divider: {
    height: 1,
    opacity: 0.9,
  },
  recentHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recentHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentItem: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBanner: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  footer: {},
  footerButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
});
