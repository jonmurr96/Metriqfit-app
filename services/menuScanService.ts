import { supabase } from '../lib/supabase';
import { invokeFunction } from '../lib/supabase/invokeFunction';

export type MenuGoal = 'cut' | 'bulk' | 'high_protein' | 'low_sodium' | 'balanced';

export interface MenuCandidate {
  name: string;
  score: number;
  price: number | null;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sodiumMg: number;
  };
  modifications: string[];
}

export interface MenuScanResult {
  bestChoice: MenuCandidate;
  runnerUps: MenuCandidate[];
  modifications: string[];
  rationale: {
    summary: string;
    note: string;
  };
  applied: boolean;
  appliedMealId: string | null;
}

export async function rankMenuOptions(input: {
  menuText?: string;
  imageBase64?: string;
  goals: MenuGoal[];
  constraints?: {
    allergies?: string[];
    refused_foods?: string[];
  };
  applyToMealId?: string;
  selectedItemName?: string;
  selectedIndex?: number;
}): Promise<MenuScanResult> {
  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke('menu-scan-rank', {
      body: {
        menu_text: input.menuText,
        image_base64: input.imageBase64,
        goals: input.goals,
        constraints: input.constraints,
        apply_to_meal_id: input.applyToMealId,
        selected_item_name: input.selectedItemName,
        selected_index: input.selectedIndex,
      },
    })
  );

  if (rawError) throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to analyze menu');
  if (!data?.success) {
    throw new Error(data?.error || 'Failed to analyze menu');
  }

  return {
    bestChoice: data.bestChoice,
    runnerUps: data.runnerUps || [],
    modifications: data.modifications || [],
    rationale: data.rationale,
    applied: Boolean(data.applied),
    appliedMealId: data.appliedMealId || null,
  };
}
