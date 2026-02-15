import { supabase } from '../lib/supabase';

export interface GroceryList {
  id: string;
  user_id: string;
  title: string;
  week_start_date: string | null;
  source: string;
  budget_limit: number | null;
  total_estimated_cost: number | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  metadata_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GroceryListItem {
  id: string;
  list_id: string;
  item_name: string;
  food_item_id: string | null;
  required_quantity: number;
  on_hand_quantity: number;
  to_buy_quantity: number;
  quantity_unit: string;
  estimated_unit_cost: number | null;
  estimated_total_cost: number | null;
  substitution_suggestions_json: string[];
  leftovers_json: Record<string, any>;
  priority: number;
  created_at: string;
  updated_at: string;
}

export async function getGroceryLists(userId: string): Promise<GroceryList[]> {
  const { data, error } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'draft'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as GroceryList[];
}

export async function getGroceryListItems(listId: string): Promise<GroceryListItem[]> {
  const { data, error } = await supabase
    .from('grocery_list_items')
    .select('*')
    .eq('list_id', listId)
    .order('priority', { ascending: false })
    .order('item_name', { ascending: true });

  if (error) throw error;
  return (data || []) as GroceryListItem[];
}

export async function archiveGroceryList(listId: string) {
  const { error } = await supabase
    .from('grocery_lists')
    .update({ status: 'archived' })
    .eq('id', listId);

  if (error) throw error;
}
