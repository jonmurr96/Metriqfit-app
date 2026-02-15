import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import { getGroceryLists, getGroceryListItems, archiveGroceryList } from '../services/groceryService';

export const groceryKeys = {
  all: ['grocery'] as const,
  lists: (userId: string) => [...groceryKeys.all, 'lists', userId] as const,
  listItems: (listId: string) => [...groceryKeys.all, 'list-items', listId] as const,
};

export function useGroceryLists() {
  const { user } = useAuth();

  return useQuery({
    queryKey: groceryKeys.lists(user?.id || ''),
    queryFn: () => getGroceryLists(user!.id),
    enabled: !!user,
  });
}

export function useGroceryListItems(listId: string, enabled = true) {
  return useQuery({
    queryKey: groceryKeys.listItems(listId),
    queryFn: () => getGroceryListItems(listId),
    enabled: !!listId && enabled,
  });
}

export function useArchiveGroceryList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (listId: string) => archiveGroceryList(listId),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: groceryKeys.lists(user.id) });
      }
    },
  });
}
