import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import { importRecipeFromUrl } from '../services/recipeImportService';

export const recipeImportKeys = {
  all: ['recipe-import'] as const,
};

export function useImportRecipe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { url: string; saveDraft?: boolean; existingRecipeId?: string }) =>
      importRecipeFromUrl(input.url, {
        saveDraft: input.saveDraft,
        existingRecipeId: input.existingRecipeId,
      }),
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['recipes', user.id] });
      }
      queryClient.invalidateQueries({ queryKey: recipeImportKeys.all });
    },
  });
}
