import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  getPantryItems,
  getPantryItem,
  createPantryItem,
  updatePantryItem,
  logPantryTransaction,
  getPantryTransactions,
  type PantryTransactionType,
} from '../services/pantryService';

export const pantryKeys = {
  all: ['pantry'] as const,
  items: (userId: string) => [...pantryKeys.all, 'items', userId] as const,
  item: (itemId: string) => [...pantryKeys.all, 'item', itemId] as const,
  transactions: (userId: string, itemId?: string) => [...pantryKeys.all, 'transactions', userId, itemId || 'all'] as const,
};

export function usePantryItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: pantryKeys.items(user?.id || ''),
    queryFn: () => getPantryItems(user!.id),
    enabled: !!user,
  });
}

export function usePantryItem(itemId: string, enabled = true) {
  return useQuery({
    queryKey: pantryKeys.item(itemId),
    queryFn: () => getPantryItem(itemId),
    enabled: !!itemId && enabled,
  });
}

export function usePantryTransactions(itemId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: pantryKeys.transactions(user?.id || '', itemId),
    queryFn: () => getPantryTransactions(user!.id, itemId),
    enabled: !!user,
  });
}

export function useCreatePantryItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      name: string;
      foodItemId?: string | null;
      quantityValue: number;
      quantityUnit: string;
      location?: string | null;
      expiresAt?: string | null;
      reorderThreshold?: number;
      estimatedCostPerUnit?: number | null;
      notes?: string | null;
    }) => createPantryItem({ userId: user!.id, ...input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.items(user!.id) });
    },
  });
}

export function useUpdatePantryItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, updates }: {
      itemId: string;
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
      }>;
    }) => updatePantryItem(itemId, updates),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.items(user!.id) });
      queryClient.invalidateQueries({ queryKey: pantryKeys.item(vars.itemId) });
    },
  });
}

export function useLogPantryTransaction() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      pantryItemId: string;
      type: PantryTransactionType;
      quantityDelta: number;
      quantityUnit?: string;
      sourceType?: string;
      sourceRefId?: string | null;
      notes?: string | null;
    }) => logPantryTransaction({ userId: user!.id, ...input }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: pantryKeys.items(user!.id) });
      queryClient.invalidateQueries({ queryKey: pantryKeys.item(vars.pantryItemId) });
      queryClient.invalidateQueries({ queryKey: pantryKeys.transactions(user!.id, vars.pantryItemId) });
    },
  });
}
