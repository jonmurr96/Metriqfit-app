import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../../lib/theme';
import { MacroInlineSummary } from '../../nutrition/MacroInlineSummary';
import type { NutritionPlanDayDetails } from '../../../services/planService';

interface NutritionMealPreviewProps {
  dayDetails: NutritionPlanDayDetails | null;
}

const SLOT_ORDER: Record<string, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

function slotLabel(slot: string) {
  if (slot === 'snack') return 'Snack';
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

export function NutritionMealPreview({ dayDetails }: NutritionMealPreviewProps) {
  const { c, ty, r } = useTokens();

  const meals = useMemo(() => {
    if (!dayDetails) return [];
    return [...dayDetails.meals].sort((a, b) => (SLOT_ORDER[a.meal_slot] ?? 99) - (SLOT_ORDER[b.meal_slot] ?? 99));
  }, [dayDetails]);

  if (!dayDetails || !meals.length) {
    return (
      <View style={[styles.emptyCard, { borderColor: c.border, backgroundColor: c.bg, borderRadius: r.md }]}> 
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>No meals available for today yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.summaryCard, { borderColor: c.border, backgroundColor: c.bg, borderRadius: r.md }]}> 
        <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 12 }}>
          Planned today: {Math.round(dayDetails.totals.calories)} kcal
        </Text>
        <MacroInlineSummary
          size="sm"
          style={{ marginTop: 4 }}
          items={[
            { macro: 'protein', value: Math.round(dayDetails.targets.protein), unit: 'g' },
            { macro: 'carbs', value: Math.round(dayDetails.targets.carbs), unit: 'g' },
            { macro: 'fat', value: Math.round(dayDetails.targets.fat), unit: 'g' },
          ]}
        />
      </View>

      {meals.map((meal) => {
        const selected = meal.selected_variant;
        const items = selected?.items || [];
        const calories = Number(selected?.target_calories ?? meal.target_calories ?? 0);
        const protein = Number(selected?.target_protein ?? meal.target_protein ?? 0);
        const carbs = Number(selected?.target_carbs ?? meal.target_carbs ?? 0);
        const fat = Number(selected?.target_fat ?? meal.target_fat ?? 0);

        return (
          <View key={meal.id} style={[styles.mealCard, { borderColor: c.border, backgroundColor: c.bg, borderRadius: r.md }]}> 
            <View style={styles.mealHeader}>
              <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: 13 }}>
                {slotLabel(meal.meal_slot)}: {selected?.name || meal.name}
              </Text>
              <Text style={{ color: c.primary, fontFamily: ty.body.familySemibold, fontSize: 12 }}>
                {Math.round(calories)} kcal
              </Text>
            </View>
            <MacroInlineSummary
              size="sm"
              style={{ marginBottom: 6 }}
              items={[
                { macro: 'protein', value: Math.round(protein), unit: 'g' },
                { macro: 'carbs', value: Math.round(carbs), unit: 'g' },
                { macro: 'fat', value: Math.round(fat), unit: 'g' },
              ]}
            />

            {items.slice(0, 5).map((item, idx) => (
              <Text key={`${item.id || idx}`} style={{ color: c.text, fontFamily: ty.body.family, fontSize: 12, lineHeight: 17 }}>
                • {item.item_name} — {Number(item.quantity_value || 0).toFixed(item.quantity_value && item.quantity_value % 1 ? 1 : 0)} {item.quantity_unit || 'g'}
              </Text>
            ))}
            {items.length > 5 ? (
              <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: 12, marginTop: 4 }}>
                +{items.length - 5} more ingredients
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  summaryCard: {
    borderWidth: 1,
    padding: 10,
    gap: 2,
  },
  mealCard: {
    borderWidth: 1,
    padding: 10,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  emptyCard: {
    borderWidth: 1,
    padding: 12,
  },
});
