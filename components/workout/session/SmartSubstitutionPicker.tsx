import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import { 
  getSwapAlternatives, 
} from '../../../lib/workout/v1_swap_engine';
import { 
  Exercise as V1Exercise, 
  SwapAlternative, 
  ContinuityMethod,
  GoalBucket,
  SessionEnvironment,
  LiftComfort,
  SwapReason,
  ExperienceLevel
} from '../../../types/v1_engine';
import { coreExercises } from '../../../loaders/seeds/exercises';

interface SmartSubstitutionPickerProps {
  originalExercise: V1Exercise;
  userProfile: {
    goal: GoalBucket;
    environment: SessionEnvironment;
    comfort: LiftComfort;
    injuries: string[];
    experience_level: ExperienceLevel;
  };
  onSelect: (alternative: SwapAlternative, reason: SwapReason) => void;
  onManualSelect: (exercise: V1Exercise, reason: SwapReason) => void;
  onClose: () => void;
}

type PickerStep = 'selection' | 'reason';

export function SmartSubstitutionPicker({
  originalExercise,
  userProfile,
  onSelect,
  onManualSelect,
  onClose,
}: SmartSubstitutionPickerProps) {
  const { c, s, ty, r } = useTokens();

  const [step, setStep] = useState<PickerStep>('selection');
  const [selectedAlt, setSelectedAlt] = useState<SwapAlternative | null>(null);
  const [selectedManual, setSelectedManual] = useState<V1Exercise | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [alternatives, setAlternatives] = useState<SwapAlternative[]>([]);

  // Load alternatives on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const results = getSwapAlternatives(originalExercise, userProfile);
      setAlternatives(results);
      setIsLoading(false);
    };
    load();
  }, [originalExercise.external_id]);

  const manualFlatList = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return coreExercises.filter(ex => 
      ex.external_id !== originalExercise.external_id &&
      (ex.name.toLowerCase().includes(query) || 
       ex.movement_pattern.toLowerCase().includes(query))
    ).slice(0, 15);
  }, [searchQuery, originalExercise.external_id]);

  const handleAltPress = (alt: SwapAlternative) => {
    setSelectedAlt(alt);
    setStep('reason');
  };

  const handleManualPress = (ex: V1Exercise) => {
    setSelectedManual(ex);
    setStep('reason');
  };

  const handleReasonSelect = (reason: SwapReason) => {
    if (selectedAlt) {
      onSelect(selectedAlt, reason);
    } else if (selectedManual) {
      onManualSelect(selectedManual, reason);
    }
  };

  if (step === 'reason') {
    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Pressable onPress={() => setStep('selection')} style={styles.backButton}>
            <TabBarIcon name="chevron-back" size={24} color={c.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: c.text, fontFamily: ty.body.familySemibold }]}>
            Why the swap?
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.reasonContent}>
          <Text style={[styles.reasonSubtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>
            This helps our engine learn your preferences and equipment availability.
          </Text>

          <View style={styles.chipGrid}>
            <ReasonChip 
              label="Equipment unavailable" 
              reason={SwapReason.EquipmentUnavailable} 
              onPress={handleReasonSelect} 
            />
            <ReasonChip 
              label="Pain / discomfort" 
              reason={SwapReason.InjuryPain} 
              onPress={handleReasonSelect} 
            />
            <ReasonChip 
              label="Preference" 
              reason={SwapReason.Preference} 
              onPress={handleReasonSelect} 
            />
            <ReasonChip 
              label="Gym too crowded" 
              reason={SwapReason.GymCrowded} 
              onPress={handleReasonSelect} 
            />
            <ReasonChip 
              label="Just want variety" 
              reason={SwapReason.Variety} 
              onPress={handleReasonSelect} 
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text, fontFamily: ty.body.familySemibold }]}>
            Swap Exercise
          </Text>
          <Text style={[styles.headerSubtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>
            Replacing: {originalExercise.name}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <TabBarIcon name="close" size={24} color={c.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: s.xl }} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>
              Coach Recommendations
            </Text>
            
            <View style={{ gap: s.sm, marginBottom: s.xl }}>
              {alternatives.map((alt, index) => (
                <V1SwapOptionCard
                  key={alt.exercise.external_id}
                  alternative={alt}
                  rank={index + 1}
                  onSelect={() => handleAltPress(alt)}
                />
              ))}
            </View>

            {/* Manual Search Section */}
            <View style={[styles.manualSection, { borderTopColor: c.border }]}>
              <Text style={[styles.manualTitle, { color: c.text, fontFamily: ty.body.familySemibold }]}>
                Search more exercises
              </Text>
              <Text style={[styles.manualSubtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>
                Manual swap — may start a fresh track
              </Text>

              <View style={[styles.searchBar, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.md }]}>
                <TabBarIcon name="search" size={18} color={c.textMuted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Find something else..."
                  placeholderTextColor={c.textSubtle}
                  style={[styles.searchInput, { color: c.text, fontFamily: ty.body.family }]}
                />
              </View>

              {searchQuery.length > 0 && (
                <View style={{ marginTop: s.md, gap: s.xs }}>
                  {manualFlatList.map((ex) => (
                    <Pressable
                      key={ex.external_id}
                      onPress={() => handleManualPress(ex)}
                      style={[styles.manualResult, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.md }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.manualResultName, { color: c.text, fontFamily: ty.body.familySemibold }]}>
                          {ex.name}
                        </Text>
                        <Text style={[styles.manualResultMeta, { color: c.textMuted, fontFamily: ty.body.family }]}>
                          {ex.movement_pattern} • {ex.equipment_category}
                        </Text>
                      </View>
                      <View style={[styles.manualBadge, { backgroundColor: c.surface2, borderRadius: r.sm }]}>
                        <Text style={[styles.manualBadgeText, { color: c.textMuted, fontFamily: ty.body.familySemibold }]}>
                          Manual Option
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                  {manualFlatList.length === 0 && (
                    <Text style={[styles.emptyText, { color: c.textMuted }]}>
                      No matches found for "{searchQuery}"
                    </Text>
                  )}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ReasonChip({ label, reason, onPress }: { label: string; reason: SwapReason; onPress: (r: SwapReason) => void }) {
  const { c, s, ty, r } = useTokens();
  return (
    <Pressable
      onPress={() => onPress(reason)}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: pressed ? c.primary + '20' : c.surface,
          borderColor: c.border,
          borderRadius: r.pill,
        }
      ]}
    >
      <Text style={[styles.chipText, { color: c.text, fontFamily: ty.body.familyMedium }]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface V1SwapOptionCardProps {
  alternative: SwapAlternative;
  rank: number;
  onSelect: () => void;
}

function V1SwapOptionCard({ alternative, rank, onSelect }: V1SwapOptionCardProps) {
  const { c, s, ty, r } = useTokens();
  const { exercise, match_label, benefit_tag, continuity_recommendation } = alternative;

  const continuityColor = 
    continuity_recommendation === ContinuityMethod.Modified ? c.primary :
    c.textMuted;

  const continuityLabel = 
    continuity_recommendation === ContinuityMethod.Modified ? 'Modified Carryover' :
    'Fresh Track';

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.optionCard,
        {
          backgroundColor: pressed ? c.surface2 : c.surface,
          borderColor: c.border,
          borderRadius: r.md,
        }
      ]}
    >
      <View style={styles.optionHeader}>
        <View style={[styles.rankBadge, { backgroundColor: c.surface2 }]}>
          <Text style={[styles.rankText, { color: c.text, fontFamily: ty.mono.family }]}>
            {rank}
          </Text>
        </View>

        <Text style={[styles.exerciseName, { color: c.text, fontFamily: ty.body.familySemibold }]} numberOfLines={1}>
          {exercise.name}
        </Text>

        <View style={[styles.matchBadge, { backgroundColor: c.primary + '15', borderRadius: r.sm }]}>
          <Text style={[styles.matchText, { color: c.primary, fontFamily: ty.body.familySemibold }]}>
            {match_label}
          </Text>
        </View>
      </View>

      <View style={styles.optionBenefits}>
        <Text style={[styles.benefitText, { color: c.text, fontFamily: ty.body.family }]}>
          {benefit_tag}
        </Text>
        <Text style={{ color: c.textSubtle }}>•</Text>
        <Text style={[styles.equipmentText, { color: c.textMuted, fontFamily: ty.body.family }]}>
          {exercise.equipment_category}
        </Text>
      </View>

      <View style={[styles.continuityBadge, { backgroundColor: continuityColor + '15', borderRadius: r.pill }]}>
        <View style={[styles.continuityIndicator, { backgroundColor: continuityColor }]} />
        <Text style={[styles.continuityText, { color: continuityColor, fontFamily: ty.body.familySemibold }]}>
          {continuityLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  closeButton: {
    padding: 8,
    marginRight: -8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  optionCard: {
    borderWidth: 1,
    padding: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 10,
  },
  exerciseName: {
    flex: 1,
    fontSize: 15,
  },
  matchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchText: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  optionBenefits: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 13,
  },
  equipmentText: {
    fontSize: 11,
  },
  continuityBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  continuityIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  continuityText: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  manualSection: {
    borderTopWidth: 1,
    paddingTop: 24,
  },
  manualTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  manualSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
  },
  manualResult: {
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualResultName: {
    fontSize: 14,
  },
  manualResultMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  manualBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  manualBadgeText: {
    fontSize: 9,
    textTransform: 'uppercase',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
  },
  reasonContent: {
    flex: 1,
    padding: 24,
  },
  reasonSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 32,
    textAlign: 'center',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  chipText: {
    fontSize: 14,
  },
});
