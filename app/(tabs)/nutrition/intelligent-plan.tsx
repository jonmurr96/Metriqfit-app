/**
 * Intelligent Meal Plan Screen
 * 
 * Demonstrates the intelligent meal generation system with:
 * - Goal-based food selection
 * - Timing optimization
 * - Exact portion calculations
 * - Training meal indicators
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { useOnboarding } from '@/lib/onboarding';
import {
  generateWeeklyMealPlan,
  type GeneratedMealPlan,
  type GeneratedMeal,
} from '@/lib/nutrition';
import { MealPlanDayView } from '@/components/nutrition';

export default function IntelligentPlanScreen() {
  const { data: onboardingData } = useOnboarding();
  const [plan, setPlan] = useState<GeneratedMealPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);

  // Generate meal plan when component mounts
  React.useEffect(() => {
    if (onboardingData) {
      generatePlan();
    }
  }, [onboardingData]);

  const generatePlan = useCallback(() => {
    if (!onboardingData) return;
    
    setIsLoading(true);
    
    // Simulate async generation
    setTimeout(() => {
      try {
        // Determine training days (example: Mon/Wed/Fri)
        const trainingDays = ['monday', 'wednesday', 'friday'];
        
        const newPlan = generateWeeklyMealPlan(
          onboardingData,
          undefined,
          trainingDays
        );
        
        setPlan(newPlan);
      } catch (error) {
        console.error('Error generating meal plan:', error);
        Alert.alert(
          'Error',
          'Failed to generate meal plan. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }, [onboardingData]);

  const handleMealPress = useCallback((meal: GeneratedMeal) => {
    Alert.alert(
      meal.label,
      `Time: ${meal.time}\n\nFoods:\n${meal.foods.map(f => 
        `• ${f.displayPortion} ${f.food.displayName}`
      ).join('\n')}\n\nMacros: ${meal.actualMacros.calories} cal | P:${meal.actualMacros.protein}g C:${meal.actualMacros.carbs}g F:${meal.actualMacros.fat}g`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Swap Meal', onPress: () => handleMealSwap(meal) },
      ]
    );
  }, []);

  const handleMealSwap = useCallback((meal: GeneratedMeal) => {
    Alert.alert(
      'Swap Meal',
      `Choose a different option for ${meal.label}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Randomize', onPress: () => console.log('Randomize meal:', meal.slot) },
        { text: 'Browse Foods', onPress: () => console.log('Browse foods for:', meal.slot) },
      ]
    );
  }, []);

  const handleRefresh = useCallback(() => {
    generatePlan();
  }, [generatePlan]);

  // Day selector tabs
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Stack.Screen options={{ title: 'Meal Plan' }} />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          Generating your personalized meal plan...
        </Text>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Stack.Screen options={{ title: 'Meal Plan' }} />
        <Text style={styles.errorText}>
          No meal plan available. Please complete onboarding first.
        </Text>
      </SafeAreaView>
    );
  }

  const currentDayPlan = plan.weekPlan[selectedDay];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Your Meal Plan',
          headerRight: () => (
            <Text style={styles.headerStats}>
              {plan.summary.averageCalories} cal avg
            </Text>
          ),
        }} 
      />

      {/* Day Selector */}
      <View style={styles.daySelector}>
        {days.map((day, index) => (
          <View
            key={day}
            style={[
              styles.dayTab,
              selectedDay === index && styles.dayTabActive,
            ]}
          >
            <Text
              style={[
                styles.dayTabText,
                selectedDay === index && styles.dayTabTextActive,
              ]}
              onPress={() => setSelectedDay(index)}
            >
              {day}
            </Text>
            {plan.weekPlan[index]?.isTrainingDay && (
              <View style={styles.trainingDot} />
            )}
          </View>
        ))}
      </View>

      {/* Plan Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{plan.summary.trainingDays}</Text>
            <Text style={styles.summaryLabel}>Training Days</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{plan.summary.macroSplit}</Text>
            <Text style={styles.summaryLabel}>Macro Split</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {plan.summary.proteinDiversity.topProteinPercentage}%
            </Text>
            <Text style={styles.summaryLabel}>Top Proteins</Text>
          </View>
        </View>
      </View>

      {/* Day Plan */}
      <MealPlanDayView
        dayPlan={currentDayPlan}
        onMealPress={handleMealPress}
        onMealSwap={handleMealSwap}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  headerStats: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  daySelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  dayTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    position: 'relative',
  },
  dayTabActive: {
    backgroundColor: '#007AFF15',
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  dayTabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  trainingDot: {
    position: 'absolute',
    top: 4,
    right: '20%',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E5EA',
  },
});
