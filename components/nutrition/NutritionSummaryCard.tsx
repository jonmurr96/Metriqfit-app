import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MotiView } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useTokens } from '../../lib/theme';

interface NutritionSummaryCardProps {
  date?: Date;
  calories?: number;
  calorieGoal?: number;
  protein?: number;
  proteinGoal?: number;
  carbs?: number;
  carbsGoal?: number;
  fat?: number;
  fatGoal?: number;
}

export function NutritionSummaryCard({
  date = new Date(),
  calories = 2165,
  calorieGoal = 2400,
  protein = 140,
  proteinGoal = 180,
  carbs = 180,
  carbsGoal = 250,
  fat = 55,
  fatGoal = 70,
}: NutritionSummaryCardProps) {
  const { c, s, ty, r, glass } = useTokens();

  const caloriePercent = Math.min((calories / calorieGoal) * 100, 100);
  const proteinPercent = Math.min((protein / proteinGoal) * 100, 100);
  const carbsPercent = Math.min((carbs / carbsGoal) * 100, 100);
  const fatPercent = Math.min((fat / fatGoal) * 100, 100);

  const isOnTrack = caloriePercent >= 70 && caloriePercent <= 100;

  const formatDate = (d: Date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 400 }}
      style={[
        styles.container,
        {
          backgroundColor: c.surface,
          borderRadius: r.xl,
          borderWidth: 1,
          borderColor: c.border,
        },
      ]}
    >
      {/* Glow effect */}
      <View style={styles.glowContainer}>
        <View style={[styles.glow, { backgroundColor: c.primary }]} />
      </View>

      {/* Top row: date + status */}
      <View style={styles.topRow}>
        <View>
          <Text
            style={[
              styles.dateText,
              {
                color: c.text,
                fontFamily: ty.heading.familySemibold,
                fontSize: ty.sizes.xl,
              },
            ]}
          >
            {formatDate(date)}
          </Text>
          <Text
            style={[
              styles.summaryLabel,
              {
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: ty.sizes.xs,
                marginTop: 2,
              },
            ]}
          >
            Summary
          </Text>
        </View>

        {/* Ring status badge */}
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderColor: isOnTrack ? c.primary : c.warning,
              borderRadius: r.xl,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isOnTrack ? c.primary : c.warning },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: isOnTrack ? c.primary : c.warning,
                fontFamily: ty.body.familySemibold,
                fontSize: 10,
              },
            ]}
          >
            {isOnTrack ? 'ON TRACK' : 'OFF TRACK'}
          </Text>
        </View>
      </View>

      {/* Bottom row: calories + macros */}
      <View style={styles.bottomRow}>
        {/* Calories */}
        <View style={styles.caloriesSection}>
          <View style={styles.caloriesValue}>
            <Text
              style={[
                styles.caloriesNumber,
                {
                  color: c.text,
                  fontFamily: ty.heading.familySemibold,
                  fontSize: 36,
                },
              ]}
            >
              {formatNumber(calories)}
            </Text>
            <Text
              style={[
                styles.caloriesUnit,
                {
                  color: c.textMuted,
                  fontFamily: ty.body.familyMedium,
                  fontSize: ty.sizes.sm,
                  marginLeft: 4,
                },
              ]}
            >
              kcal
            </Text>
          </View>

          {/* Calorie progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: c.surface2, borderRadius: r.sm }]}>
            <LinearGradient
              colors={[c.primary, c.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${caloriePercent}%`, borderRadius: r.sm },
              ]}
            />
          </View>

          <Text
            style={[
              styles.goalText,
              {
                color: c.textMuted,
                fontFamily: ty.body.family,
                fontSize: 10,
                marginTop: s.xs,
                textAlign: 'right',
              },
            ]}
          >
            {Math.round(caloriePercent)}% of {formatNumber(calorieGoal)} goal
          </Text>
        </View>

        {/* Macros */}
        <View style={styles.macrosSection}>
          {/* Protein */}
          <View style={styles.macroRow}>
            <View style={styles.macroHeader}>
              <Text style={[styles.macroLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 10 }]}>
                PRO
              </Text>
              <Text style={[styles.macroValue, { color: c.text, fontFamily: ty.body.familySemibold, fontSize: 10 }]}>
                {protein}g
              </Text>
            </View>
            <View style={[styles.macroTrack, { backgroundColor: c.surface2, borderRadius: r.sm }]}>
              <View style={[styles.macroFill, { width: `${proteinPercent}%`, backgroundColor: c.primary, borderRadius: r.sm }]} />
            </View>
          </View>

          {/* Carbs */}
          <View style={styles.macroRow}>
            <View style={styles.macroHeader}>
              <Text style={[styles.macroLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 10 }]}>
                CARBS
              </Text>
              <Text style={[styles.macroValue, { color: c.text, fontFamily: ty.body.familySemibold, fontSize: 10 }]}>
                {carbs}g
              </Text>
            </View>
            <View style={[styles.macroTrack, { backgroundColor: c.surface2, borderRadius: r.sm }]}>
              <View style={[styles.macroFill, { width: `${carbsPercent}%`, backgroundColor: c.macros.carbs, borderRadius: r.sm }]} />
            </View>
          </View>

          {/* Fat */}
          <View style={styles.macroRow}>
            <View style={styles.macroHeader}>
              <Text style={[styles.macroLabel, { color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: 10 }]}>
                FAT
              </Text>
              <Text style={[styles.macroValue, { color: c.text, fontFamily: ty.body.familySemibold, fontSize: 10 }]}>
                {fat}g
              </Text>
            </View>
            <View style={[styles.macroTrack, { backgroundColor: c.surface2, borderRadius: r.sm }]}>
              <View style={[styles.macroFill, { width: `${fatPercent}%`, backgroundColor: c.macros.fat, borderRadius: r.sm }]} />
            </View>
          </View>
        </View>
      </View>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  glowContainer: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    opacity: 0.05,
  },
  glow: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  dateText: {},
  summaryLabel: {},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    letterSpacing: 0.5,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 24,
  },
  caloriesSection: {
    flex: 1,
  },
  caloriesValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  caloriesNumber: {},
  caloriesUnit: {},
  progressTrack: {
    height: 6,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  goalText: {},
  macrosSection: {
    width: 110,
    gap: 12,
  },
  macroRow: {},
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabel: {},
  macroValue: {},
  macroTrack: {
    height: 4,
    overflow: 'hidden',
  },
  macroFill: {
    height: '100%',
  },
});
