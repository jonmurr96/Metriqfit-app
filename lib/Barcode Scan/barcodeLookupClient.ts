// barcodeLookupClient.ts
// Example client helper for your React Native / Expo app (calls Supabase Edge Function).
// Assumes you already have `supabase` client configured on the client with anon key.

import { supabase } from '../supabase';

export type BarcodeLookupFood = {
  source: 'openfoodfacts' | 'usda_fdc';
  barcode: string;
  name?: string;
  brand?: string;
  imageUrl?: string;
  kcal_100g?: number;
  protein_g_100g?: number;
  carbs_g_100g?: number;
  fat_g_100g?: number;
  needs_manual_review?: boolean;
  warnings?: string[];
};

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupFood | null> {
  const { data, error } = await supabase.functions.invoke('barcode-lookup', {
    body: { barcode },
  });

  if (error) {
    console.error('barcode-lookup error:', error);
    return null;
  }

  if (!data?.ok || !data?.found) return null;
  return data.food as BarcodeLookupFood;
}
