import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { usePrograms } from '../../../hooks/useWorkout';
import { ActivityIndicator } from 'react-native';
import { WorkoutTemplate } from '../../../services/workoutService';

export default function ProgramBrowserScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: programs, isLoading } = usePrograms();

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: c.surface }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <TabBarIcon name="chevron-back" color={c.text} size={24} />
        </Pressable>
        <Text
          style={[
            styles.title,
            {
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.xl,
            },
          ]}
        >
          Programs
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: s.lg, paddingBottom: 100 }}
      >
        {isLoading ? (
          <View style={{ padding: s.xl, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : programs?.map((program: WorkoutTemplate) => {
          // Determine colors based on difficulty
          let badgeColor = c.primary; // Default Blue (Beginner)
          let badgeText = 'Beginner';

          const diff = (program.difficulty || 'beginner').toLowerCase();

          if (diff === 'intermediate') {
            badgeColor = c.macros?.carbs || '#F5A623'; // Orange
            badgeText = 'Intermediate';
          } else if (diff === 'advanced' || diff === 'expert') {
            badgeColor = c.macros?.fat || '#BD10E0'; // Purple
            badgeText = 'Advanced';
          } else {
            // Beginner
            badgeColor = c.primary; // Blue
            badgeText = 'Beginner';
          }

          return (
            <Pressable
              key={program.name}
              style={[
                styles.programCard,
                {
                  backgroundColor: c.surface,
                  borderRadius: r.lg,
                  borderWidth: 1,
                  borderColor: c.border,
                  marginBottom: s.md,
                },
              ]}
              onPress={() => router.push({
                pathname: '/(tabs)/workout/program-detail',
                params: { programId: program.id }
              })}
            >
              {/* Title Row */}
              <View style={styles.programHeader}>
                <Text
                  style={{
                    color: c.text,
                    fontFamily: ty.heading.familySemibold,
                    fontSize: ty.sizes.lg,
                    lineHeight: 24,
                  }}
                >
                  {program.name}
                </Text>
              </View>

              {/* Meta Row: Badge + Duration */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: s.sm }}>
                <View
                  style={[
                    styles.levelBadge,
                    {
                      backgroundColor: c.surface2,
                      borderRadius: r.sm,
                      borderWidth: 1,
                      borderColor: badgeColor + '40',
                      marginRight: s.md,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: badgeColor,
                      fontFamily: ty.body.familySemibold,
                      fontSize: ty.sizes.xs,
                    }}
                  >
                    {badgeText}
                  </Text>
                </View>

                <Text
                  style={{
                    color: c.textMuted,
                    fontFamily: ty.body.family,
                    fontSize: ty.sizes.sm,
                    flex: 1,
                  }}
                >
                  {program.duration_weeks} weeks • {program.days_per_week} days/week
                </Text>
              </View>
            </Pressable>
          )
        })}

        <View
          style={[
            styles.comingSoonCard,
            {
              backgroundColor: c.surface,
              borderRadius: r.lg,
              borderWidth: 1,
              borderColor: c.border,
              borderStyle: 'dashed',
            },
          ]}
        >
          <Text
            style={{
              color: c.textMuted,
              fontFamily: ty.body.familyMedium,
              fontSize: ty.sizes.md,
              textAlign: 'center',
            }}
          >
            More programs coming soon
          </Text>
        </View>
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
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    letterSpacing: -0.3,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  programCard: {
    padding: 18,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align tops if wrapping, or center if single line
    justifyContent: 'space-between',
    marginBottom: 4, // Add some breathing room
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  comingSoonCard: {
    padding: 24,
    alignItems: 'center',
  },
});

