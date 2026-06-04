import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../../lib/theme';
import { TabBarIcon } from '../../../../components/navigation/TabBarIcon';
import { PressableScale } from '@/components/common/PressableScale';

type ToolCard = {
  title: string;
  description: string;
  icon: string;
  route: string;
};

const TOOL_CARDS: ToolCard[] = [
  {
    title: '1RM Calculator',
    description: 'Estimate your one-rep max with tested formulas.',
    icon: 'calculator',
    route: '/(tabs)/workout/calculators/one-rep-max',
  },
  {
    title: 'Plate Calculator',
    description: 'Instantly load plates by barbell target weight.',
    icon: 'albums',
    route: '/(tabs)/workout/calculators/plate-calculator',
  },
  {
    title: 'Program Builder',
    description: 'Build or clone complete training programs.',
    icon: 'build',
    route: '/(tabs)/workout/program-builder',
  },
  {
    title: 'Import Plan',
    description: 'Import existing plans from text, JSON, or CSV.',
    icon: 'cloud-upload',
    route: '/(tabs)/workout/import-plan',
  },
  {
    title: 'Adaptive Coach',
    description: 'Review data-driven adjustments and apply updates.',
    icon: 'sparkles',
    route: '/(tabs)/workout/adaptation',
  },
  {
    title: 'Workout Notes',
    description: 'Review, edit, and manage notes from your sessions and exercises.',
    icon: 'document-text',
    route: '/(tabs)/workout/workout-notes',
  },
  {
    title: 'Exercise Library',
    description: 'Browse movement database, equipment, and muscle categories.',
    icon: 'fitness',
    route: '/(tabs)/workout/exercise-library',
  },
];

export default function WorkoutToolsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c, s, ty, r } = useTokens();

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: c.surface, borderRadius: r.pill }]}>
          <TabBarIcon name="chevron-back" color={c.text} size={20} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>Workout Tools</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, gap: s.md, paddingBottom: insets.bottom + 110 }}>
        {TOOL_CARDS.map((card) => (
          <PressableScale
            key={card.title}
            onPress={() => router.push(card.route as any)}
            style={(pressed) => [
              styles.card,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                borderRadius: r.lg,
                padding: s.lg,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: c.surface2, borderRadius: r.md }]}>
              <TabBarIcon name={card.icon as any} color={c.primary} size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>{card.title}</Text>
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
                {card.description}
              </Text>
            </View>
            <TabBarIcon name="chevron-forward" color={c.textMuted} size={16} />
          </PressableScale>
        ))}
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
