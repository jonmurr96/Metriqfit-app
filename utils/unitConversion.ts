/**
 * Unit Conversion Utilities
 * All conversions store canonical units (ml, kg, cm) in database
 * Display conversions happen client-side based on user preference
 */

// ===========================================
// VOLUME CONVERSIONS
// ===========================================

/**
 * Convert fluid ounces to milliliters
 * 1 oz = 29.5735 ml
 */
export function ozToMl(oz: number): number {
  return Math.round(oz * 29.5735);
}

/**
 * Convert milliliters to fluid ounces
 * 1 ml = 0.033814 oz
 */
export function mlToOz(ml: number): number {
  return Math.round((ml / 29.5735) * 10) / 10;
}

/**
 * Convert liters to milliliters
 */
export function litersToMl(liters: number): number {
  return Math.round(liters * 1000);
}

/**
 * Convert milliliters to liters
 */
export function mlToLiters(ml: number): number {
  return Math.round((ml / 1000) * 10) / 10;
}

// ===========================================
// WEIGHT CONVERSIONS
// ===========================================

/**
 * Convert pounds to kilograms
 * 1 lb = 0.453592 kg
 */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 10) / 10;
}

/**
 * Convert kilograms to pounds
 * 1 kg = 2.20462 lbs
 */
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

// ===========================================
// HEIGHT CONVERSIONS
// ===========================================

/**
 * Convert inches to centimeters
 * 1 in = 2.54 cm
 */
export function inchesToCm(inches: number): number {
  return Math.round(inches * 2.54 * 10) / 10;
}

/**
 * Convert centimeters to inches
 * 1 cm = 0.393701 in
 */
export function cmToInches(cm: number): number {
  return Math.round((cm / 2.54) * 10) / 10;
}

/**
 * Convert feet and inches to centimeters
 */
export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return inchesToCm(totalInches);
}

/**
 * Convert centimeters to feet and inches
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToInches(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

// ===========================================
// DISPLAY FORMATTERS
// ===========================================

/**
 * Format water amount based on unit system
 */
export function formatWater(
  ml: number,
  unitSystem: 'metric' | 'imperial'
): string {
  if (unitSystem === 'metric') {
    if (ml >= 1000) {
      return `${mlToLiters(ml)}L`;
    }
    return `${ml}ml`;
  }
  return `${mlToOz(ml)}oz`;
}

/**
 * Format weight based on unit system
 */
export function formatWeight(
  kg: number,
  unitSystem: 'metric' | 'imperial'
): string {
  if (unitSystem === 'metric') {
    return `${kg}kg`;
  }
  return `${kgToLbs(kg)}lbs`;
}

/**
 * Format height based on unit system
 */
export function formatHeight(
  cm: number,
  unitSystem: 'metric' | 'imperial'
): string {
  if (unitSystem === 'metric') {
    return `${cm}cm`;
  }
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
}

/**
 * Format lifting weight (always in lbs for display, stored in lbs)
 */
export function formatLiftingWeight(lbs: number): string {
  return `${lbs}lbs`;
}

// ===========================================
// INPUT PARSERS
// ===========================================

/**
 * Parse water input and convert to ml
 */
export function parseWaterInput(
  value: number,
  inputUnit: 'ml' | 'oz' | 'L'
): number {
  switch (inputUnit) {
    case 'oz':
      return ozToMl(value);
    case 'L':
      return litersToMl(value);
    default:
      return Math.round(value);
  }
}

/**
 * Parse weight input and convert to kg
 */
export function parseWeightInput(
  value: number,
  inputUnit: 'kg' | 'lbs'
): number {
  if (inputUnit === 'lbs') {
    return lbsToKg(value);
  }
  return value;
}

/**
 * Parse height input and convert to cm
 */
export function parseHeightInput(
  value: number,
  inputUnit: 'cm' | 'in' | 'ft'
): number {
  switch (inputUnit) {
    case 'in':
      return inchesToCm(value);
    case 'ft':
      return inchesToCm(value * 12);
    default:
      return value;
  }
}
