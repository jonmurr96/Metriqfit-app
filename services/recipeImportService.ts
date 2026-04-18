import { supabase } from '../lib/supabase';
import { invokeFunction } from '../lib/supabase/invokeFunction';

export interface RecipeImportIngredient {
  original: string;
  quantity: number | null;
  unit: string | null;
  name: string;
  grams_estimate: number;
  matched_food_item_id: string | null;
  matched_food_name: string | null;
}

export interface RecipeImportDraft {
  name: string;
  description: string | null;
  servings: string | null;
  instructions: string[];
  ingredients: RecipeImportIngredient[];
}

export interface RecipeImportResult {
  draft: RecipeImportDraft;
  warnings: string[];
  confidence: number;
  parserPath: 'jsonld' | 'html_heuristic' | 'ai_fallback';
  savedRecipeId: string | null;
}

export async function importRecipeFromUrl(
  url: string,
  options?: {
    saveDraft?: boolean;
    existingRecipeId?: string;
  },
): Promise<RecipeImportResult> {
  const { data, parsedError, rawError } = await invokeFunction(() =>
    supabase.functions.invoke('import-recipe-url', {
      body: {
        url,
        saveDraft: options?.saveDraft || false,
        existingRecipeId: options?.existingRecipeId,
      },
    })
  );

  if (rawError) throw new Error(parsedError?.error || parsedError?.message || rawError?.message || 'Failed to import recipe');
  if (!data?.success) {
    throw new Error(data?.error || 'Failed to import recipe');
  }

  return {
    draft: data.draft,
    warnings: data.warnings || [],
    confidence: Number(data.confidence || 0),
    parserPath: data.parserPath,
    savedRecipeId: data.savedRecipeId || null,
  };
}
