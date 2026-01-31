// lib/confirmServingClient.ts
// Client helper: call Supabase Edge Function "confirm-serving"
// Usage:
// await confirmServingSize({ food_item_id, grams_per_serving }, supabase);

import type { SupabaseClient } from "@supabase/supabase-js";

export type ConfirmServingParams = {
  food_item_id?: string;
  barcode?: string;
  grams_per_serving: number; // required
};

export async function confirmServingSize(
  params: ConfirmServingParams,
  supabase: SupabaseClient
) {
  const { data, error } = await supabase.functions.invoke("confirm-serving", {
    body: params,
  });

  if (error) {
    console.error("confirmServingSize failed:", error);
    throw error;
  }

  return data as {
    success: boolean;
    food_item_id?: string;
    updated?: any;
    error?: string;
  };
}
