import { hexToRgba } from '../../lib/theme';

export type MacroKind = 'calories' | 'protein' | 'carbs' | 'fat';

export function getMacroLabel(macro: MacroKind) {
  switch (macro) {
    case 'calories':
      return 'KCAL';
    case 'protein':
      return 'PROTEIN';
    case 'carbs':
      return 'CARBS';
    case 'fat':
      return 'FAT';
    default:
      return '';
  }
}

export function getMacroShortLabel(macro: MacroKind) {
  switch (macro) {
    case 'protein':
      return 'P';
    case 'carbs':
      return 'C';
    case 'fat':
      return 'F';
    case 'calories':
    default:
      return '';
  }
}

export function getMacroTheme(c: any, macro: MacroKind) {
  switch (macro) {
    case 'protein':
      return {
        gradient: [c.macros.protein, c.macros.proteinDark] as [string, string],
        tint: c.macros.protein,
        border: hexToRgba(c.macros.protein, 0.42),
        softBackground: hexToRgba(c.macros.protein, 0.12),
        softBackgroundStrong: hexToRgba(c.macros.protein, 0.2),
        text: c.macros.protein,
      };
    case 'carbs':
      return {
        gradient: [c.macros.carbs, c.macros.carbsDark] as [string, string],
        tint: c.macros.carbs,
        border: hexToRgba(c.macros.carbs, 0.42),
        softBackground: hexToRgba(c.macros.carbs, 0.12),
        softBackgroundStrong: hexToRgba(c.macros.carbs, 0.2),
        text: c.macros.carbs,
      };
    case 'fat':
      return {
        gradient: [c.macros.fat, c.macros.fatDark] as [string, string],
        tint: c.macros.fat,
        border: hexToRgba(c.macros.fat, 0.42),
        softBackground: hexToRgba(c.macros.fat, 0.12),
        softBackgroundStrong: hexToRgba(c.macros.fat, 0.2),
        text: c.macros.fat,
      };
    case 'calories':
    default:
      return {
        gradient: [c.surface2, c.surface] as [string, string],
        tint: c.textMuted,
        border: c.border,
        softBackground: c.surface2,
        softBackgroundStrong: c.surface3 || c.surface2,
        text: c.text,
      };
  }
}
