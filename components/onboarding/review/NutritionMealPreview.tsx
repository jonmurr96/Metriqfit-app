import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTokens } from '../../../lib/theme';
import { MacroInlineSummary } from '../../nutrition/MacroInlineSummary';
import type { NutritionPlanDayDetails } from '../../../services/planService';
import { useProfile } from '../../../hooks/useUser';
import { formatFoodQuantity, detectFoodCategory, getDefaultFoodMeasurement } from '../../../lib/nutrition/displayUnits';

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
  const { data: profile } = useProfile();
  const foodMeasurement = getDefaultFoodMeasurement(profile?.unit_system);
  const displayFoodMeasurement = (profile?.display_preferences?.food_measurement as any) ?? foodMeasurement;

  const meals = useMemo(() => {
    if (!dayDetails) return [];
    return [...dayDetails.meals].sort((a, b) => (SLOT_ORDER[a.meal_slot] ?? 99) - (SLOT_ORDER[b.meal_slot] ?? 99));
  }, [dayDetails]);

  if (!dayDetails || !meals.length) {
    return (
      <View className="border p-3" style={{ borderColor: c.border, backgroundColor: c.bg, borderRadius: r.md }}>
        <Text style={{ color: c.textMuted, fontFamily: ty.body.family }}>No meals available for today yet.</Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <View className="border p-[10px] gap-[2px]" style={{ borderColor: c.border, backgroundColor: c.bg, borderRadius: r.md }}>
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
          <View key={meal.id} className="border p-3" style={{ borderColor: c.border, backgroundColor: c.bg, borderRadius: r.md }}>
            <View className="flex-row items-start justify-between mb-[6px] gap-2">
              <Text
                className="flex-1 text-[13px] leading-[17px] pr-[6px]"
                style={{ color: c.text, fontFamily: ty.body.familySemibold }}
                numberOfLines={2}
              >
                {slotLabel(meal.meal_slot)}: {selected?.name || meal.name}
              </Text>
              <Text
                className="shrink-0 text-xs leading-[17px] text-right"
                style={{ color: c.primary, fontFamily: ty.body.familySemibold }}
              >
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

            {items.slice(0, 5).map((item, idx) => {
              const fmt = formatFoodQuantity(
                Number(item.grams || item.quantity_value || 0),
                detectFoodCategory(item.item_name || ''),
                displayFoodMeasurement
              );
              return (
                <Text key={`${item.id || idx}`} style={{ color: c.text, fontFamily: ty.body.family, fontSize: 12, lineHeight: 17 }}>
                  • {item.item_name} — {fmt.value}{fmt.unit}
                </Text>
              );
            })}
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
