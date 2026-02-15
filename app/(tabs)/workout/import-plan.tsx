import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useImportWorkoutPlan, useResolveWorkoutImportMappings } from '../../../hooks/useWorkoutImport';

type SourceType = 'text' | 'json' | 'csv';

export default function ImportWorkoutPlanScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [sourceType, setSourceType] = useState<SourceType>('text');
  const [payload, setPayload] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);
  const [mappingValues, setMappingValues] = useState<Record<string, string>>({});

  const importMutation = useImportWorkoutPlan();
  const resolveMutation = useResolveWorkoutImportMappings();

  const unresolved = useMemo(() => lastResult?.unresolvedMappings || [], [lastResult]);

  const submitImport = async () => {
    if (!payload.trim()) {
      Alert.alert('Missing plan content', 'Paste your workout content first.');
      return;
    }
    try {
      const parsedPayload = sourceType === 'json' ? JSON.parse(payload) : payload;
      const result = await importMutation.mutateAsync({
        sourceType,
        payload: parsedPayload,
        activate: false,
      });
      setLastResult(result);
      const initialMap: Record<string, string> = {};
      for (const item of result.unresolvedMappings || []) {
        if (item.suggestedExerciseId) {
          initialMap[item.sourceExerciseName] = item.suggestedExerciseId;
        }
      }
      setMappingValues(initialMap);
      if (result.status === 'validated') {
        Alert.alert('Import validated', 'Plan parsed successfully. Activate after reviewing.');
      }
    } catch (error: any) {
      Alert.alert('Import failed', error.message || 'Invalid input format.');
    }
  };

  const activateImport = async () => {
    if (!lastResult?.jobId) return;
    try {
      if (unresolved.length === 0) {
        await resolveMutation.mutateAsync({ jobId: lastResult.jobId, mappings: [], activate: true });
      } else {
        const mappings = unresolved
          .map((row: any) => ({
            sourceExerciseName: row.sourceExerciseName,
            mappedExerciseId: mappingValues[row.sourceExerciseName],
          }))
          .filter((row: any) => !!row.mappedExerciseId);

        if (mappings.length !== unresolved.length) {
          Alert.alert('Mappings required', 'Resolve all exercises before activation.');
          return;
        }

        await resolveMutation.mutateAsync({
          jobId: lastResult.jobId,
          mappings,
          activate: true,
        });
      }

      Alert.alert('Plan imported', 'Your imported plan is now active.');
      router.replace('/(tabs)/workout');
    } catch (error: any) {
      Alert.alert('Activation failed', error.message || 'Try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderRadius: r.pill }]}>
          <TabBarIcon name="chevron-back" color={c.text} size={20} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>Import Workout Plan</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 120 }}>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm }}>
          Supported formats: plain text, JSON, CSV. Import stays fully editable in builder after activation.
        </Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: s.md }}>
          {(['text', 'json', 'csv'] as const).map((type) => (
            <Pressable
              key={type}
              onPress={() => setSourceType(type)}
              style={{
                borderWidth: 1,
                borderColor: sourceType === type ? c.primary : c.border,
                backgroundColor: sourceType === type ? `${c.primary}20` : c.surface2,
                borderRadius: r.pill,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: sourceType === type ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                {type.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={payload}
          onChangeText={setPayload}
          multiline
          placeholder={sourceType === 'text' ? 'Day 1 - Push\nBench Press, 4x8\n...' : sourceType === 'json' ? '{ "days": [...] }' : 'day,exercise,sets,reps,rest'}
          placeholderTextColor={c.textMuted}
          style={{
            marginTop: s.md,
            minHeight: 220,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: r.lg,
            backgroundColor: c.surface,
            color: c.text,
            padding: 12,
            fontFamily: ty.mono.family,
            textAlignVertical: 'top',
          }}
        />

        <Pressable
          onPress={submitImport}
          disabled={importMutation.isPending}
          style={{
            marginTop: s.md,
            borderRadius: r.md,
            backgroundColor: c.primary,
            paddingVertical: 12,
            alignItems: 'center',
            opacity: importMutation.isPending ? 0.75 : 1,
          }}
        >
          {importMutation.isPending ? (
            <ActivityIndicator color={c.bg} />
          ) : (
            <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>Parse Import</Text>
          )}
        </Pressable>

        {lastResult && (
          <View style={{ marginTop: s.lg, backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.lg }}>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>Validation Summary</Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
              {`${lastResult.validationSummary.dayCount} days • ${lastResult.validationSummary.exerciseCount} exercises • ${lastResult.validationSummary.unresolvedCount} unresolved mappings`}
            </Text>
            {(lastResult.validationSummary.warnings || []).map((warning: string) => (
              <Text key={warning} style={{ color: c.warning || '#f59e0b', fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.xs }}>
                • {warning}
              </Text>
            ))}
          </View>
        )}

        {unresolved.length > 0 && (
          <View style={{ marginTop: s.lg, gap: s.sm }}>
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>Resolve Exercise Mappings</Text>
            {unresolved.map((item: any) => (
              <View key={item.sourceExerciseName} style={{ backgroundColor: c.surface, borderRadius: r.md, borderWidth: 1, borderColor: c.border, padding: s.md }}>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>{item.sourceExerciseName}</Text>
                {!!item.suggestedExerciseName && (
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.xs }}>
                    Suggested: {item.suggestedExerciseName} ({Math.round((item.confidence || 0) * 100)}%)
                  </Text>
                )}
                <TextInput
                  value={mappingValues[item.sourceExerciseName] || ''}
                  onChangeText={(value) =>
                    setMappingValues((prev) => ({
                      ...prev,
                      [item.sourceExerciseName]: value,
                    }))
                  }
                  placeholder="Mapped exercise ID"
                  placeholderTextColor={c.textMuted}
                  style={{
                    marginTop: s.sm,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: r.md,
                    backgroundColor: c.surface2,
                    color: c.text,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontFamily: ty.mono.family,
                  }}
                />
              </View>
            ))}
          </View>
        )}

        {!!lastResult && (
          <Pressable
            onPress={activateImport}
            disabled={resolveMutation.isPending}
            style={{
              marginTop: s.lg,
              borderRadius: r.md,
              borderWidth: 1,
              borderColor: c.primary,
              paddingVertical: 12,
              alignItems: 'center',
              opacity: resolveMutation.isPending ? 0.75 : 1,
            }}
          >
            {resolveMutation.isPending ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
                Activate Imported Plan
              </Text>
            )}
          </Pressable>
        )}
      </ScrollView>
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
    paddingVertical: 14,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
