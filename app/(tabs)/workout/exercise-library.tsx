import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../lib/theme';
import { TabBarIcon } from '../../../components/navigation/TabBarIcon';
import { useExercises } from '../../../hooks/useWorkout';

export default function ExerciseLibraryScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  // Fetch exercises
  const { data: exercises, isLoading } = useExercises({ search });

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
          Exercise Library
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { paddingHorizontal: s.lg }]}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: c.surface,
              borderRadius: r.md,
              borderWidth: 1,
              borderColor: c.border,
            },
          ]}
        >
          <TabBarIcon name="search" color={c.textMuted} size={20} />
          <TextInput
            style={{
              flex: 1,
              color: c.text,
              marginLeft: s.sm,
              fontFamily: ty.body.family,
              height: 40
            }}
            placeholder="Search exercises..."
            placeholderTextColor={c.textSubtle}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: s.lg, paddingBottom: 100 }}
      >
        {isLoading ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <View>
            <Text style={{ color: c.textMuted, marginBottom: 8, fontSize: 12, letterSpacing: 1 }}>
              {exercises?.length || 0} EXERCISES
            </Text>
            {exercises?.map(ex => (
              <Pressable
                key={ex.id}
                style={{
                  backgroundColor: c.surface,
                  padding: 16,
                  borderRadius: r.md,
                  marginBottom: 8,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
                onPress={() => router.push(`/(tabs)/workout/exercise-detail?id=${ex.id}`)}
              >
                <View>
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold }}>{ex.name}</Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>{ex.category} • {ex.primary_muscle}</Text>
                </View>
                <TabBarIcon name="chevron-forward" color={c.textMuted} size={16} />
              </Pressable>
            ))}

            {exercises?.length === 0 && (
              <Text style={{ color: c.textMuted, textAlign: 'center', marginTop: 20 }}>
                No exercises found.
              </Text>
            )}
          </View>
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
  searchContainer: {
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  scrollView: {
    flex: 1,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    padding: 18,
  },
});

