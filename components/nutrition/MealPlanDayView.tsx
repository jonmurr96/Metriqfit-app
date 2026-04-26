/**
 * MealPlanDayView Component
 * 
 * Displays all meals for a single day with:
 * - Day header (Monday, Training Day indicator)
 * - List of MealCards
 * - Daily totals summary
 */

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GeneratedDayPlan } from '@/lib/nutrition';
import { MealCard } from './MealCard';
import { MacroSummary } from './MacroSummary';

interface MealPlanDayViewProps {
  dayPlan: GeneratedDayPlan;
  onMealPress?: (meal: GeneratedDayPlan['meals'][0]) => void;
  onMealSwap?: (meal: GeneratedDayPlan['meals'][0]) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/**
 * Format day name for display
 */
function formatDayName(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/**
 * Get today's day name
 */
function getTodayDayName(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

export function MealPlanDayView({
  dayPlan,
  onMealPress,
  onMealSwap,
  onRefresh,
  isRefreshing = false,
}: MealPlanDayViewProps) {
  const isToday = dayPlan.day === getTodayDayName();
  const isTrainingDay = dayPlan.isTrainingDay;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        ) : undefined
      }
    >
      {/* Day Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.dayName}>
            {formatDayName(dayPlan.day)}
          </Text>
          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayText}>Today</Text>
            </View>
          )}
        </View>
        
        {isTrainingDay && (
          <View style={styles.trainingBadge}>
            <Ionicons name="fitness-outline" size={14} color="#FFFFFF" />
            <Text style={styles.trainingText}>Training</Text>
          </View>
        )}
      </View>

      {/* Meals List */}
      <View style={styles.mealsContainer}>
        {dayPlan.meals.map((meal, index) => (
          <MealCard
            key={`${meal.slot}-${index}`}
            meal={meal}
            onPress={() => onMealPress?.(meal)}
            onSwap={() => onMealSwap?.(meal)}
          />
        ))}
      </View>

      {/* Daily Totals */}
      <View style={styles.totalsContainer}>
        <Text style={styles.totalsLabel}>Daily Totals</Text>
        <View style={styles.totalsRow}>
          <MacroSummary
            calories={dayPlan.dailyTotals.calories}
            protein={dayPlan.dailyTotals.protein}
            carbs={dayPlan.dailyTotals.carbs}
            fat={dayPlan.dailyTotals.fat}
          />
        </View>
        
        {/* Macro Progress Bars */}
        <View style={styles.progressContainer}>
          <MacroProgressBar 
            label="Protein" 
            value={dayPlan.dailyTotals.protein} 
            color="#FF3B30"
            max={200} // Approximate max for visualization
          />
          <MacroProgressBar 
            label="Carbs" 
            value={dayPlan.dailyTotals.carbs} 
            color="#FF9500"
            max={300}
          />
          <MacroProgressBar 
            label="Fat" 
            value={dayPlan.dailyTotals.fat} 
            color="#5856D6"
            max={100}
          />
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Macro Progress Bar Component
 */
interface MacroProgressBarProps {
  label: string;
  value: number;
  color: string;
  max: number;
}

function MacroProgressBar({ label, value, color, max }: MacroProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <View style={styles.progressRow}>
      <Text style={styles.progressLabel}>{label}</Text>
      <View style={styles.progressBarContainer}>
        <View 
          style={[
            styles.progressBarFill,
            { width: `${percentage}%`, backgroundColor: color }
          ]} 
        />
      </View>
      <Text style={styles.progressValue}>{Math.round(value)}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  todayBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  trainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#34C759',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trainingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mealsContainer: {
    paddingTop: 12,
    gap: 12,
  },
  totalsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  totalsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalsRow: {
    marginBottom: 16,
  },
  progressContainer: {
    gap: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressLabel: {
    width: 60,
    fontSize: 13,
    fontWeight: '500',
    color: '#3C3C43',
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressValue: {
    width: 45,
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
    textAlign: 'right',
  },
});
