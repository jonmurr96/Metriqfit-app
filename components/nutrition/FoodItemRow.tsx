/**
 * FoodItemRow Component
 * 
 * Displays a single food item with portion size.
 * Clean, simple display: "200g Chicken Breast"
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FoodPortion } from '@/lib/nutrition';
import { useTokens } from '@/lib/theme';

interface FoodItemRowProps {
  food: FoodPortion;
  showMacros?: boolean;
}

/**
 * Get emoji icon for food category
 */
function getFoodEmoji(category: string, foodName: string): string {
  const name = foodName.toLowerCase();
  
  // Proteins
  if (category === 'protein') {
    if (name.includes('chicken')) return '';
    if (name.includes('beef') || name.includes('steak')) return '';
    if (name.includes('fish') || name.includes('salmon') || name.includes('tilapia')) return '';
    if (name.includes('egg')) return '';
    if (name.includes('tofu') || name.includes('tempeh')) return '';
    if (name.includes('protein')) return '';
    return '';
  }
  
  // Carbs
  if (category === 'carb') {
    if (name.includes('rice')) return '';
    if (name.includes('potato') || name.includes('sweet')) return '';
    if (name.includes('oats') || name.includes('cereal')) return '';
    if (name.includes('pasta') || name.includes('noodle')) return '';
    if (name.includes('bread')) return '';
    if (name.includes('fruit') || name.includes('banana') || name.includes('berry')) return '';
    if (name.includes('vegetable') || name.includes('broccoli') || name.includes('spinach')) return '';
    return '';
  }
  
  // Fats
  if (category === 'fat') {
    if (name.includes('oil')) return '';
    if (name.includes('avocado')) return '';
    if (name.includes('nut') || name.includes('almond') || name.includes('walnut')) return '';
    if (name.includes('butter')) return '';
    return '';
  }
  
  return '';
}

/**
 * Get color tint for food category
 */
function getCategoryColor(category: string): string {
  switch (category) {
    case 'protein': return '#FF3B30'; // Red
    case 'carb': return '#FF9500';    // Orange
    case 'fat': return '#5856D6';     // Purple
    default: return '#8E8E93';
  }
}

export function FoodItemRow({ food, showMacros = false }: FoodItemRowProps) {
  const emoji = getFoodEmoji(food.food.category, food.food.displayName);
  const categoryColor = getCategoryColor(food.food.category);
  const { c, ty, r } = useTokens();
  
  // Add form note if relevant (e.g., "(ground)" for cutting)
  const formNote = food.form && food.form !== 'whole' 
    ? ` (${food.form})` 
    : '';

  // Extract grams from displayPortion if possible (e.g., "150g" -> 150)
  const portionString = food.displayPortion;
  const gramsMatch = portionString.match(/(\d+)\s*g/i);
  const gramsNumber = gramsMatch ? parseInt(gramsMatch[1], 10) : null;
  const ozString = gramsNumber ? (gramsNumber / 28.3495).toFixed(1) : null;

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}15` }]}>
        <Text style={styles.icon}>{emoji}</Text>
      </View>
      
      {/* Food Info */}
      <View style={styles.infoContainer}>
        <View style={styles.nameRow}>
          <Text style={[styles.foodName, { fontFamily: ty.body.familySemibold, color: c.text }]}>
            {food.food.displayName}
          </Text>
          {formNote && <Text style={[styles.formNote, { color: c.textMuted }]}>{formNote}</Text>}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', backgroundColor: c.surface2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: r.sm, borderWidth: 1, borderColor: `${c.textMuted}20` }}>
            {gramsNumber ? (
              <>
                <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                  {gramsNumber}
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs - 2 }}>g</Text>
                </Text>
                <Text style={{ color: `${c.textMuted}50`, marginHorizontal: 4, fontSize: ty.sizes.xs - 2 }}>|</Text>
                <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                  {ozString}
                  <Text style={{ fontSize: ty.sizes.xs - 2 }}>oz</Text>
                </Text>
              </>
            ) : (
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                {portionString}
              </Text>
            )}
          </View>

          {showMacros && (
            <Text style={[styles.macroText, { marginLeft: 8, color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }]}>
              {food.macros.protein.toFixed(1)}P · {food.macros.carbs.toFixed(1)}C · {food.macros.fat.toFixed(1)}F
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 18,
  },
  infoContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  portionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  foodName: {
    fontSize: 15,
    fontWeight: '400',
    color: '#3C3C43',
  },
  formNote: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  macroText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
});
