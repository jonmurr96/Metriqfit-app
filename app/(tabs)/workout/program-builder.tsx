import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import {
  useCreateCustomWorkoutProgram,
  useCreateWorkoutPlanFromTemplateV2,
  useWorkoutProgramFamilies,
  useWorkoutProgramsByFamily,
} from '../../../hooks/useWorkoutBuilder';
import { useActiveWorkoutPlan } from '../../../hooks/usePlan';

export default function ProgramBuilderScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [family, setFamily] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('4');
  const [description, setDescription] = useState('');

  const { data: activePlan } = useActiveWorkoutPlan();
  const { data: families = [], isLoading: familyLoading } = useWorkoutProgramFamilies();
  const { data: templates = [], isLoading: templateLoading } = useWorkoutProgramsByFamily(family);
  const createCustom = useCreateCustomWorkoutProgram();
  const createFromTemplate = useCreateWorkoutPlanFromTemplateV2();

  const selectedFamilyLabel = useMemo(() => {
    if (!family) return 'All families';
    return families.find((f) => f.external_key === family)?.display_name || 'All families';
  }, [family, families]);

  const handleCreateCustom = async () => {
    const freq = Number(daysPerWeek);
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your custom plan a name before creating it.');
      return;
    }
    if (!Number.isFinite(freq) || freq < 2 || freq > 7) {
      Alert.alert('Invalid frequency', 'Days per week must be between 2 and 7.');
      return;
    }

    try {
      const result = await createCustom.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        daysPerWeek: freq,
        activate: true,
      });
      router.push({ pathname: '/(tabs)/workout/program-builder-day', params: { planId: result.planId } });
    } catch (error: any) {
      Alert.alert('Failed to create plan', error.message || 'Try again.');
    }
  };

  const handleCloneTemplate = async (templateId: string, templateName: string) => {
    try {
      const result = await createFromTemplate.mutateAsync({ templateId, activate: true });
      Alert.alert('Plan ready', `${templateName} is now active and ready to edit.`);
      router.push({ pathname: '/(tabs)/workout/program-builder-day', params: { planId: result.planId } });
    } catch (error: any) {
      Alert.alert('Failed to clone template', error.message || 'Try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: c.surface, borderRadius: r.pill }]}>
          <TabBarIcon name="chevron-back" color={c.text} size={20} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>Program Builder</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 120 }}>
        <View style={{ backgroundColor: c.surface, borderRadius: r.lg, borderWidth: 1, borderColor: c.border, padding: s.lg }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>Create Custom Program</Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
            Build from scratch and publish directly to your active plan.
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Program name"
            placeholderTextColor={c.textMuted}
            style={[styles.input, { borderColor: c.border, color: c.text, fontFamily: ty.body.family, marginTop: s.md, borderRadius: r.md }]}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor={c.textMuted}
            style={[styles.input, { borderColor: c.border, color: c.text, fontFamily: ty.body.family, marginTop: s.sm, borderRadius: r.md }]}
          />
          <TextInput
            value={daysPerWeek}
            onChangeText={setDaysPerWeek}
            placeholder="Days per week (2-7)"
            placeholderTextColor={c.textMuted}
            keyboardType="number-pad"
            style={[styles.input, { borderColor: c.border, color: c.text, fontFamily: ty.body.family, marginTop: s.sm, borderRadius: r.md }]}
          />

          <Pressable
            onPress={handleCreateCustom}
            disabled={createCustom.isPending}
            style={({ pressed }) => [
              {
                marginTop: s.md,
                backgroundColor: c.primary,
                borderRadius: r.md,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed || createCustom.isPending ? 0.8 : 1,
              },
            ]}
          >
            {createCustom.isPending ? (
              <ActivityIndicator color={c.bg} />
            ) : (
              <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>Create & Edit</Text>
            )}
          </Pressable>
        </View>

        <View style={{ marginTop: s.xl }}>
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>Use a Program Family</Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
            Family: {selectedFamilyLabel}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: s.sm }}>
            <Pressable
              onPress={() => setFamily(undefined)}
              style={[styles.chip, { backgroundColor: !family ? c.primary : c.surface2, borderColor: !family ? c.primary : c.border, borderRadius: r.pill }]}
            >
              <Text style={{ color: !family ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>All</Text>
            </Pressable>
            {(families || []).map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setFamily(item.external_key)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: family === item.external_key ? c.primary : c.surface2,
                    borderColor: family === item.external_key ? c.primary : c.border,
                    borderRadius: r.pill,
                  },
                ]}
              >
                <Text style={{ color: family === item.external_key ? c.bg : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                  {item.display_name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {familyLoading || templateLoading ? (
          <View style={{ marginTop: s.lg, alignItems: 'center' }}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <View style={{ marginTop: s.md, gap: s.sm }}>
            {templates.map((template) => (
              <View
                key={template.id}
                style={{
                  backgroundColor: c.surface,
                  borderRadius: r.lg,
                  borderWidth: 1,
                  borderColor: c.border,
                  padding: s.lg,
                }}
              >
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>{template.name}</Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                  {(template.description || 'Structured program template') + ` • ${template.days_per_week} days/week`}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: s.sm, flexWrap: 'wrap' }}>
                  {(template.goal_tags || []).slice(0, 4).map((tag) => (
                    <View key={`${template.id}-${tag}`} style={{ backgroundColor: c.surface2, borderRadius: r.pill, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: c.textMuted, fontFamily: ty.mono.family, fontSize: ty.sizes.xs }}>{tag}</Text>
                    </View>
                  ))}
                </View>
                <Pressable
                  onPress={() => handleCloneTemplate(template.id, template.name)}
                  disabled={createFromTemplate.isPending}
                  style={({ pressed }) => [
                    {
                      marginTop: s.md,
                      borderRadius: r.md,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: c.primary,
                      alignItems: 'center',
                      opacity: pressed || createFromTemplate.isPending ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>Clone & Customize</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {activePlan && (
          <Pressable
            onPress={() => router.push({ pathname: '/(tabs)/workout/program-builder-day', params: { planId: activePlan.id } })}
            style={({ pressed }) => [
              {
                marginTop: s.xl,
                backgroundColor: c.surface2,
                borderRadius: r.md,
                paddingVertical: 12,
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
              Edit Active Plan: {activePlan.name}
            </Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  back: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
