import { supabase } from '../lib/supabase';

export interface PantryItem {
  id: string;
  user_id: string;
  name: string;
  food_item_id: string | null;
  quantity_value: number;
  quantity_unit: string;
  location: string | null;
  expires_at: string | null;
  reorder_threshold: number;
  estimated_cost_per_unit: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type PantryTransactionType = 'add' | 'consume' | 'waste' | 'adjust';

export interface PantryTransaction {
  id: string;
  user_id: string;
  pantry_item_id: string | null;
  transaction_type: PantryTransactionType;
  quantity_delta: number;
  quantity_unit: string;
  source_type: string;
  source_ref_id: string | null;
  notes: string | null;
  created_at: string;
}

export async function getPantryItems(userId: string): Promise<PantryItem[]> {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('expires_at', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as PantryItem[];
}

export async function getPantryItem(itemId: string): Promise<PantryItem | null> {
  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (error) throw error;
  return data as PantryItem | null;
}

export async function createPantryItem(input: {
  userId: string;
  name: string;
  foodItemId?: string | null;
  quantityValue: number;
  quantityUnit: string;
  location?: string | null;
  expiresAt?: string | null;
  reorderThreshold?: number;
  estimatedCostPerUnit?: number | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase
    .from('pantry_items')
    .insert({
      user_id: input.userId,
      name: input.name,
      food_item_id: input.foodItemId || null,
      quantity_value: input.quantityValue,
      quantity_unit: input.quantityUnit,
      location: input.location || null,
      expires_at: input.expiresAt || null,
      reorder_threshold: input.reorderThreshold ?? 0,
      estimated_cost_per_unit: input.estimatedCostPerUnit ?? null,
      notes: input.notes || null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as PantryItem;
}

export async function updatePantryItem(
  itemId: string,
  updates: Partial<{
    name: string;
    food_item_id: string | null;
    quantity_value: number;
    quantity_unit: string;
    location: string | null;
    expires_at: string | null;
    reorder_threshold: number;
    estimated_cost_per_unit: number | null;
    notes: string | null;
    is_active: boolean;
  }>,
) {
  const { data, error } = await supabase
    .from('pantry_items')
    .update(updates)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) throw error;
  return data as PantryItem;
}

export async function logPantryTransaction(input: {
  userId: string;
  pantryItemId: string;
  type: PantryTransactionType;
  quantityDelta: number;
  quantityUnit?: string;
  sourceType?: string;
  sourceRefId?: string | null;
  notes?: string | null;
}) {
  const { data: currentItem, error: itemError } = await supabase
    .from('pantry_items')
    .select('id, quantity_value, quantity_unit')
    .eq('id', input.pantryItemId)
    .maybeSingle();

  if (itemError || !currentItem) {
    throw new Error(itemError?.message || 'Pantry item not found');
  }

  const signedDelta = ['consume', 'waste'].includes(input.type)
    ? -Math.abs(input.quantityDelta)
    : Math.abs(input.quantityDelta);

  const nextQuantity = input.type === 'adjust'
    ? Math.max(0, Number(input.quantityDelta || 0))
    : Math.max(0, Number(currentItem.quantity_value || 0) + signedDelta);

  const { data: tx, error: txError } = await supabase
    .from('pantry_transactions')
    .insert({
      user_id: input.userId,
      pantry_item_id: input.pantryItemId,
      transaction_type: input.type,
      quantity_delta: input.type === 'adjust' ? nextQuantity : signedDelta,
      quantity_unit: input.quantityUnit || currentItem.quantity_unit || 'g',
      source_type: input.sourceType || 'manual',
      source_ref_id: input.sourceRefId || null,
      notes: input.notes || null,
    })
    .select('*')
    .single();

  if (txError) throw txError;

  const { error: updateError } = await supabase
    .from('pantry_items')
    .update({ quantity_value: nextQuantity })
    .eq('id', input.pantryItemId);

  if (updateError) throw updateError;

  return tx as PantryTransaction;
}

export async function getPantryTransactions(userId: string, pantryItemId?: string): Promise<PantryTransaction[]> {
  let query = supabase
    .from('pantry_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (pantryItemId) {
    query = query.eq('pantry_item_id', pantryItemId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []) as PantryTransaction[];
}
