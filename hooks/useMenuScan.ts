import { useMutation } from '@tanstack/react-query';
import { rankMenuOptions, type MenuGoal } from '../services/menuScanService';

export const menuScanKeys = {
  all: ['menu-scan'] as const,
};

export function useMenuScan() {
  return useMutation({
    mutationFn: (input: {
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
    }) => rankMenuOptions(input),
  });
}
