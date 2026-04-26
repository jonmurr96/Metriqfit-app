/**
 * MealCard Component
 * 
 * Displays a single meal with:
 * - Meal time and type
 * - Food portions (e.g., "200g Chicken Breast")
 * - Macro summary
 * - Training meal indicators
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GeneratedMeal, formatMealSimple } from '@/lib/nutrition';
import { FoodItemRow } from './FoodItemRow';
import { MacroSummary } from './MacroSummary';

interface MealCardProps {
  meal: GeneratedMeal;
  onPress?: () => void;
  onSwap?: () => void;
  compact?: boolean;
}

/**
 * Get icon for meal slot
 */
function getMealIcon(slot: GeneratedMeal['slot']): string {
  switch (slot) {
    case 'breakfast': return 'sunny-outline';
    case 'lunch': return 'restaurant-outline';
    case 'dinner': return 'moon-outline';
    case 'evening_snack': return 'cafe-outline';
    case 'pre_workout': return 'fitness-outline';
    case 'post_workout': return 'flash-outline';
    default: return 'restaurant-outline';
  }
}

/**
 * Format time for display (convert 24h to 12h)
 */
function formatTimeDisplay(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function MealCard({ meal, onPress, onSwap, compact = false }: MealCardProps) {
  const isTrainingMeal = meal.isTrainingRelated;
  const mealIcon = getMealIcon(meal.slot);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isTrainingMeal && styles.trainingContainer,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${meal.label} at ${formatTimeDisplay(meal.time)}`}
      accessibilityHint="Tap to view meal details"
    >
      {/* Header: Time and Meal Type */}
      <View style={styles.header}>
        <View style={styles.timeContainer}>
          <Ionicons name="time-outline" size={14} color="#8E8E93" />
          <Text style={styles.timeText}>{formatTimeDisplay(meal.time)}</Text>
        </View>
        
        <View style={styles.labelContainer}>
          <Ionicons 
            name={mealIcon as any} 
            size={14} 
            color={isTrainingMeal ? '#34C759' : '#8E8E93'} 
          />
          <Text style={[
            styles.labelText,
            isTrainingMeal && styles.trainingLabelText,
          ]}>
            {meal.label}
          </Text>
          {isTrainingMeal && (
            <View style={styles.trainingBadge}>
              <Text style={styles.trainingBadgeText}>🏋️</Text>
            </View>
          )}
        </View>
      </View>

      {/* Food Items */}
      <View style={styles.foodsContainer}>
        {meal.foods.length > 0 ? (
          meal.foods.map((food, index) => (
            <FoodItemRow 
              key={`${food.food.id}-${index}`} 
              food={food} 
            />
          ))
        ) : (
          <Text style={styles.noFoodsText}>
            {formatMealSimple(meal)}
          </Text>
        )}
      </View>

      {/* Footer: Macros and Swap */}
      {!compact && (
        <View style={styles.footer}>
          <MacroSummary 
            calories={meal.actualMacros.calories}
            protein={meal.actualMacros.protein}
            carbs={meal.actualMacros.carbs}
            fat={meal.actualMacros.fat}
          />
          
          {onSwap && (
            <TouchableOpacity
              style={styles.swapButton}
              onPress={onSwap}
              accessibilityLabel="Swap meal"
              accessibilityRole="button"
            >
              <Ionicons name="refresh-outline" size={16} color="#007AFF" />
              <Text style={styles.swapText}>Swap</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
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
  trainingContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  trainingLabelText: {
    color: '#34C759',
  },
  trainingBadge: {
    marginLeft: 4,
  },
  trainingBadgeText: {
    fontSize: 12,
  },
  foodsContainer: {
    gap: 8,
    marginBottom: 12,
  },
  noFoodsText: {
    fontSize: 15,
    color: '#3C3C43',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    minHeight: 32,
    minWidth: 44,
  },
  swapText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#007AFF',
  },
});
