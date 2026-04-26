/**
 * Food Database
 * 
 * Comprehensive database of foods with macros, forms, and nutritional timing properties
 */

export type FoodCategory = 'protein' | 'carb' | 'fat';
export type DigestionSpeed = 'fast' | 'medium' | 'slow';
export type GoalPreference = 'bulk' | 'cut' | 'both';
export type MealTiming = 'pre-workout' | 'post-workout' | 'anytime' | 'breakfast' | 'evening';
export type FoodForm = 'whole' | 'ground' | 'lean' | 'minced' | 'liquid';

export interface FoodItem {
  id: string;
  name: string;
  displayName: string;
  category: FoodCategory;
  macrosPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  // Available forms of this food (e.g., chicken can be breast or ground)
  availableForms: FoodForm[];
  // Default form based on goal
  defaultFormForGoal: {
    bulk: FoodForm;
    cut: FoodForm;
  };
  digestionSpeed: DigestionSpeed;
  // Which goals this food is best for
  goalPreference: GoalPreference;
  // When this food is appropriate
  timingAppropriate: MealTiming[];
  // Tags for categorization
  tags: string[];
  // Is this a primary protein source (for ranking)
  isPrimaryProtein?: boolean;
}

// ============================================
// PROTEIN SOURCES
// ============================================

export const proteinFoods: FoodItem[] = [
  // CHICKEN
  {
    id: 'chicken_breast',
    name: 'chicken_breast',
    displayName: 'Chicken Breast',
    category: 'protein',
    macrosPer100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    availableForms: ['whole', 'ground', 'lean'],
    defaultFormForGoal: { bulk: 'whole', cut: 'ground' },
    digestionSpeed: 'medium',
    goalPreference: 'both',
    timingAppropriate: ['post-workout', 'anytime'],
    tags: ['poultry', 'lean', 'versatile'],
    isPrimaryProtein: true,
  },
  {
    id: 'chicken_thigh',
    name: 'chicken_thigh',
    displayName: 'Chicken Thigh',
    category: 'protein',
    macrosPer100g: { calories: 226, protein: 26, carbs: 0, fat: 13 },
    availableForms: ['whole', 'ground'],
    defaultFormForGoal: { bulk: 'whole', cut: 'ground' },
    digestionSpeed: 'slow',
    goalPreference: 'bulk',
    timingAppropriate: ['anytime'],
    tags: ['poultry', 'juicy', 'higher-fat'],
    isPrimaryProtein: true,
  },
  {
    id: 'ground_chicken',
    name: 'ground_chicken',
    displayName: 'Ground Chicken',
    category: 'protein',
    macrosPer100g: { calories: 143, protein: 27, carbs: 0, fat: 3.5 },
    availableForms: ['ground', 'minced'],
    defaultFormForGoal: { bulk: 'ground', cut: 'ground' },
    digestionSpeed: 'medium',
    goalPreference: 'cut',
    timingAppropriate: ['anytime'],
    tags: ['poultry', 'ground', 'easy-to-eat'],
    isPrimaryProtein: true,
  },
  
  // BEEF
  {
    id: 'beef_steak_sirloin',
    name: 'beef_steak_sirloin',
    displayName: 'Sirloin Steak',
    category: 'protein',
    macrosPer100g: { calories: 206, protein: 31, carbs: 0, fat: 8 },
    availableForms: ['whole', 'lean'],
    defaultFormForGoal: { bulk: 'whole', cut: 'lean' },
    digestionSpeed: 'slow',
    goalPreference: 'bulk',
    timingAppropriate: ['anytime'],
    tags: ['beef', 'steak', 'satiating'],
    isPrimaryProtein: true,
  },
  {
    id: 'ground_beef_93_7',
    name: 'ground_beef_93_7',
    displayName: 'Ground Beef (93/7)',
    category: 'protein',
    macrosPer100g: { calories: 172, protein: 26, carbs: 0, fat: 8 },
    availableForms: ['ground', 'minced'],
    defaultFormForGoal: { bulk: 'ground', cut: 'ground' },
    digestionSpeed: 'medium',
    goalPreference: 'cut',
    timingAppropriate: ['anytime'],
    tags: ['beef', 'ground', 'lean', 'easy-to-eat'],
    isPrimaryProtein: true,
  },
  {
    id: 'ground_beef_85_15',
    name: 'ground_beef_85_15',
    displayName: 'Ground Beef (85/15)',
    category: 'protein',
    macrosPer100g: { calories: 250, protein: 26, carbs: 0, fat: 17 },
    availableForms: ['ground'],
    defaultFormForGoal: { bulk: 'ground', cut: 'ground' },
    digestionSpeed: 'slow',
    goalPreference: 'bulk',
    timingAppropriate: ['anytime'],
    tags: ['beef', 'ground', 'higher-fat'],
    isPrimaryProtein: true,
  },
  
  // EGGS
  {
    id: 'whole_eggs',
    name: 'whole_eggs',
    displayName: 'Whole Eggs',
    category: 'protein',
    macrosPer100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'medium',
    goalPreference: 'bulk',
    timingAppropriate: ['breakfast', 'anytime'],
    tags: ['eggs', 'whole', 'nutrient-dense'],
    isPrimaryProtein: true,
  },
  {
    id: 'egg_whites',
    name: 'egg_whites',
    displayName: 'Egg Whites',
    category: 'protein',
    macrosPer100g: { calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
    availableForms: ['liquid', 'whole'],
    defaultFormForGoal: { bulk: 'liquid', cut: 'liquid' },
    digestionSpeed: 'fast',
    goalPreference: 'cut',
    timingAppropriate: ['pre-workout', 'post-workout', 'breakfast', 'anytime'],
    tags: ['eggs', 'lean', 'pure-protein', 'fast-digesting'],
    isPrimaryProtein: true,
  },
  
  // TURKEY
  {
    id: 'turkey_breast',
    name: 'turkey_breast',
    displayName: 'Turkey Breast',
    category: 'protein',
    macrosPer100g: { calories: 135, protein: 30, carbs: 0, fat: 1.5 },
    availableForms: ['whole', 'ground', 'lean'],
    defaultFormForGoal: { bulk: 'whole', cut: 'ground' },
    digestionSpeed: 'medium',
    goalPreference: 'both',
    timingAppropriate: ['post-workout', 'anytime'],
    tags: ['poultry', 'lean', 'versatile'],
    isPrimaryProtein: true,
  },
  {
    id: 'ground_turkey_93_7',
    name: 'ground_turkey_93_7',
    displayName: 'Ground Turkey (93/7)',
    category: 'protein',
    macrosPer100g: { calories: 161, protein: 27, carbs: 0, fat: 7 },
    availableForms: ['ground'],
    defaultFormForGoal: { bulk: 'ground', cut: 'ground' },
    digestionSpeed: 'medium',
    goalPreference: 'cut',
    timingAppropriate: ['anytime'],
    tags: ['poultry', 'ground', 'lean'],
    isPrimaryProtein: true,
  },
  
  // FISH
  {
    id: 'salmon',
    name: 'salmon',
    displayName: 'Salmon',
    category: 'protein',
    macrosPer100g: { calories: 208, protein: 20, carbs: 0, fat: 13 },
    availableForms: ['whole', 'lean'],
    defaultFormForGoal: { bulk: 'whole', cut: 'lean' },
    digestionSpeed: 'medium',
    goalPreference: 'bulk',
    timingAppropriate: ['anytime'],
    tags: ['fish', 'fatty-fish', 'omega-3'],
    isPrimaryProtein: true,
  },
  {
    id: 'tilapia',
    name: 'tilapia',
    displayName: 'Tilapia',
    category: 'protein',
    macrosPer100g: { calories: 96, protein: 20, carbs: 0, fat: 1.7 },
    availableForms: ['whole', 'lean'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'fast',
    goalPreference: 'cut',
    timingAppropriate: ['pre-workout', 'post-workout', 'anytime'],
    tags: ['fish', 'white-fish', 'lean', 'fast-digesting'],
    isPrimaryProtein: true,
  },
  {
    id: 'cod',
    name: 'cod',
    displayName: 'Cod',
    category: 'protein',
    macrosPer100g: { calories: 82, protein: 18, carbs: 0, fat: 0.7 },
    availableForms: ['whole', 'lean'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'fast',
    goalPreference: 'cut',
    timingAppropriate: ['pre-workout', 'post-workout', 'anytime'],
    tags: ['fish', 'white-fish', 'very-lean', 'fast-digesting'],
    isPrimaryProtein: true,
  },
  {
    id: 'tuna',
    name: 'tuna',
    displayName: 'Tuna (Canned in Water)',
    category: 'protein',
    macrosPer100g: { calories: 116, protein: 26, carbs: 0, fat: 1 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'fast',
    goalPreference: 'cut',
    timingAppropriate: ['pre-workout', 'post-workout', 'anytime'],
    tags: ['fish', 'canned', 'convenient', 'very-lean'],
    isPrimaryProtein: true,
  },
  
  // DAIRY
  {
    id: 'greek_yogurt_nonfat',
    name: 'greek_yogurt_nonfat',
    displayName: 'Nonfat Greek Yogurt',
    category: 'protein',
    macrosPer100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'medium',
    goalPreference: 'cut',
    timingAppropriate: ['breakfast', 'post-workout', 'evening', 'anytime'],
    tags: ['dairy', 'probiotic', 'casein', 'slow-digesting'],
    isPrimaryProtein: true,
  },
  {
    id: 'cottage_cheese_lowfat',
    name: 'cottage_cheese_lowfat',
    displayName: 'Low-Fat Cottage Cheese',
    category: 'protein',
    macrosPer100g: { calories: 72, protein: 12, carbs: 3.4, fat: 1.5 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'cut',
    timingAppropriate: ['evening', 'anytime'],
    tags: ['dairy', 'casein', 'slow-digesting', 'bedtime'],
    isPrimaryProtein: true,
  },
  
  // PLANT PROTEINS
  {
    id: 'tofu_firm',
    name: 'tofu_firm',
    displayName: 'Firm Tofu',
    category: 'protein',
    macrosPer100g: { calories: 144, protein: 17, carbs: 3, fat: 9 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'medium',
    goalPreference: 'both',
    timingAppropriate: ['anytime'],
    tags: ['plant', 'soy', 'vegetarian', 'vegan'],
    isPrimaryProtein: true,
  },
  {
    id: 'tempeh',
    name: 'tempeh',
    displayName: 'Tempeh',
    category: 'protein',
    macrosPer100g: { calories: 193, protein: 19, carbs: 9, fat: 11 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'bulk',
    timingAppropriate: ['anytime'],
    tags: ['plant', 'soy', 'fermented', 'vegetarian', 'vegan'],
    isPrimaryProtein: true,
  },
  
  // SUPPLEMENTS
  {
    id: 'whey_protein',
    name: 'whey_protein',
    displayName: 'Whey Protein Powder',
    category: 'protein',
    macrosPer100g: { calories: 375, protein: 80, carbs: 8, fat: 4 },
    availableForms: ['liquid'],
    defaultFormForGoal: { bulk: 'liquid', cut: 'liquid' },
    digestionSpeed: 'fast',
    goalPreference: 'both',
    timingAppropriate: ['pre-workout', 'post-workout', 'anytime'],
    tags: ['supplement', 'powder', 'convenient', 'very-fast'],
    isPrimaryProtein: true,
  },
  {
    id: 'casein_protein',
    name: 'casein_protein',
    displayName: 'Casein Protein Powder',
    category: 'protein',
    macrosPer100g: { calories: 360, protein: 80, carbs: 6, fat: 2 },
    availableForms: ['liquid'],
    defaultFormForGoal: { bulk: 'liquid', cut: 'liquid' },
    digestionSpeed: 'slow',
    goalPreference: 'both',
    timingAppropriate: ['evening', 'anytime'],
    tags: ['supplement', 'powder', 'slow-digesting', 'bedtime'],
    isPrimaryProtein: true,
  },
];

// ============================================
// CARBOHYDRATE SOURCES
// ============================================

export const carbFoods: FoodItem[] = [
  // FAST-ACTING CARBS (for pre/post workout, cutting)
  {
    id: 'white_rice_cooked',
    name: 'white_rice_cooked',
    displayName: 'White Rice (Cooked)',
    category: 'carb',
    macrosPer100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'fast',
    goalPreference: 'both',
    timingAppropriate: ['pre-workout', 'post-workout', 'anytime'],
    tags: ['grain', 'fast-acting', 'versatile', 'gluten-free'],
  },
  {
    id: 'white_potato',
    name: 'white_potato',
    displayName: 'White Potato',
    category: 'carb',
    macrosPer100g: { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'fast',
    goalPreference: 'both',
    timingAppropriate: ['post-workout', 'anytime'],
    tags: ['starchy', 'fast-acting', 'satiating'],
  },
  {
    id: 'banana',
    name: 'banana',
    displayName: 'Banana',
    category: 'carb',
    macrosPer100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'fast',
    goalPreference: 'both',
    timingAppropriate: ['pre-workout', 'breakfast', 'anytime'],
    tags: ['fruit', 'fast-acting', 'potassium', 'convenient'],
  },
  {
    id: 'rice_cakes',
    name: 'rice_cakes',
    displayName: 'Rice Cakes',
    category: 'carb',
    macrosPer100g: { calories: 387, protein: 7.1, carbs: 82, fat: 3.1 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'fast',
    goalPreference: 'cut',
    timingAppropriate: ['pre-workout', 'anytime'],
    tags: ['light', 'fast-acting', 'low-volume', 'snack'],
  },
  
  // SLOW-ACTING CARBS (for sustained energy, bulking)
  {
    id: 'sweet_potato',
    name: 'sweet_potato',
    displayName: 'Sweet Potato',
    category: 'carb',
    macrosPer100g: { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'bulk',
    timingAppropriate: ['anytime'],
    tags: ['starchy', 'slow-acting', 'fiber', 'micronutrients'],
  },
  {
    id: 'oats',
    name: 'oats',
    displayName: 'Oats',
    category: 'carb',
    macrosPer100g: { calories: 389, protein: 16.9, carbs: 66, fat: 6.9 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'both',
    timingAppropriate: ['breakfast', 'anytime'],
    tags: ['grain', 'slow-acting', 'high-fiber', 'satiating'],
  },
  {
    id: 'brown_rice_cooked',
    name: 'brown_rice_cooked',
    displayName: 'Brown Rice (Cooked)',
    category: 'carb',
    macrosPer100g: { calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'bulk',
    timingAppropriate: ['anytime'],
    tags: ['grain', 'slow-acting', 'fiber', 'whole-grain'],
  },
  {
    id: 'quinoa_cooked',
    name: 'quinoa_cooked',
    displayName: 'Quinoa (Cooked)',
    category: 'carb',
    macrosPer100g: { calories: 120, protein: 4.4, carbs: 21, fat: 1.9 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'bulk',
    timingAppropriate: ['anytime'],
    tags: ['grain', 'slow-acting', 'complete-protein', 'gluten-free'],
  },
  {
    id: 'whole_wheat_pasta',
    name: 'whole_wheat_pasta',
    displayName: 'Whole Wheat Pasta',
    category: 'carb',
    macrosPer100g: { calories: 124, protein: 5.3, carbs: 25, fat: 0.6 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'medium',
    goalPreference: 'bulk',
    timingAppropriate: ['anytime'],
    tags: ['grain', 'pasta', 'sustained-energy'],
  },
  
  // LOW-CALORIE/VOLUME CARBS (for cutting, evening)
  {
    id: 'broccoli',
    name: 'broccoli',
    displayName: 'Broccoli',
    category: 'carb',
    macrosPer100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'cut',
    timingAppropriate: ['evening', 'anytime'],
    tags: ['vegetable', 'low-calorie', 'high-volume', 'fiber'],
  },
  {
    id: 'spinach',
    name: 'spinach',
    displayName: 'Spinach',
    category: 'carb',
    macrosPer100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'cut',
    timingAppropriate: ['evening', 'anytime'],
    tags: ['vegetable', 'low-calorie', 'micronutrients'],
  },
  {
    id: 'berries_mixed',
    name: 'berries_mixed',
    displayName: 'Mixed Berries',
    category: 'carb',
    macrosPer100g: { calories: 57, protein: 0.7, carbs: 14, fat: 0.3 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'medium',
    goalPreference: 'cut',
    timingAppropriate: ['breakfast', 'evening', 'anytime'],
    tags: ['fruit', 'low-sugar', 'antioxidants', 'low-calorie'],
  },
  {
    id: 'apple',
    name: 'apple',
    displayName: 'Apple',
    category: 'carb',
    macrosPer100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'medium',
    goalPreference: 'cut',
    timingAppropriate: ['evening', 'snack', 'anytime'],
    tags: ['fruit', 'low-calorie', 'fiber', 'convenient'],
  },
];

// ============================================
// FAT SOURCES
// ============================================

export const fatFoods: FoodItem[] = [
  // NUTS AND SEEDS
  {
    id: 'almonds',
    name: 'almonds',
    displayName: 'Almonds',
    category: 'fat',
    macrosPer100g: { calories: 579, protein: 21, carbs: 22, fat: 50 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'both',
    timingAppropriate: ['anytime'],
    tags: ['nuts', 'calorie-dense', 'vitamin-e', 'snack'],
  },
  {
    id: 'walnuts',
    name: 'walnuts',
    displayName: 'Walnuts',
    category: 'fat',
    macrosPer100g: { calories: 654, protein: 15, carbs: 14, fat: 65 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'both',
    timingAppropriate: ['anytime'],
    tags: ['nuts', 'omega-3', 'brain-health'],
  },
  {
    id: 'peanut_butter_natural',
    name: 'peanut_butter_natural',
    displayName: 'Natural Peanut Butter',
    category: 'fat',
    macrosPer100g: { calories: 588, protein: 25, carbs: 20, fat: 50 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'both',
    timingAppropriate: ['anytime'],
    tags: ['nut-butter', 'protein-fat-combo', 'satiating'],
  },
  {
    id: 'almond_butter',
    name: 'almond_butter',
    displayName: 'Almond Butter',
    category: 'fat',
    macrosPer100g: { calories: 614, protein: 21, carbs: 19, fat: 56 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'both',
    timingAppropriate: ['anytime'],
    tags: ['nut-butter', 'vitamin-e', 'satiating'],
  },
  {
    id: 'chia_seeds',
    name: 'chia_seeds',
    displayName: 'Chia Seeds',
    category: 'fat',
    macrosPer100g: { calories: 486, protein: 17, carbs: 42, fat: 31 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'both',
    timingAppropriate: ['breakfast', 'anytime'],
    tags: ['seeds', 'omega-3', 'fiber', 'superfood'],
  },
  
  // OILS
  {
    id: 'olive_oil',
    name: 'olive_oil',
    displayName: 'Olive Oil',
    category: 'fat',
    macrosPer100g: { calories: 884, protein: 0, carbs: 0, fat: 100 },
    availableForms: ['liquid'],
    defaultFormForGoal: { bulk: 'liquid', cut: 'liquid' },
    digestionSpeed: 'slow',
    goalPreference: 'both',
    timingAppropriate: ['anytime'],
    tags: ['oil', 'monounsaturated', 'heart-healthy', 'cooking'],
  },
  {
    id: 'avocado',
    name: 'avocado',
    displayName: 'Avocado',
    category: 'fat',
    macrosPer100g: { calories: 160, protein: 2, carbs: 9, fat: 15 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'both',
    timingAppropriate: ['anytime'],
    tags: ['fruit', 'monounsaturated', 'potassium', 'creamy'],
  },
  {
    id: 'coconut_oil',
    name: 'coconut_oil',
    displayName: 'Coconut Oil',
    category: 'fat',
    macrosPer100g: { calories: 862, protein: 0, carbs: 0, fat: 100 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'medium',
    goalPreference: 'bulk',
    timingAppropriate: ['anytime'],
    tags: ['oil', 'mct', 'saturated', 'cooking'],
  },
  
  // DAIRY FATS
  {
    id: 'whole_eggs_yolk',
    name: 'whole_eggs_yolk',
    displayName: 'Egg Yolks',
    category: 'fat',
    macrosPer100g: { calories: 322, protein: 16, carbs: 3.6, fat: 27 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'medium',
    goalPreference: 'bulk',
    timingAppropriate: ['breakfast', 'anytime'],
    tags: ['eggs', 'nutrient-dense', 'cholesterol', 'vitamins'],
  },
  {
    id: 'cheese_cheddar',
    name: 'cheese_cheddar',
    displayName: 'Cheddar Cheese',
    category: 'fat',
    macrosPer100g: { calories: 402, protein: 25, carbs: 1.3, fat: 33 },
    availableForms: ['whole'],
    defaultFormForGoal: { bulk: 'whole', cut: 'whole' },
    digestionSpeed: 'slow',
    goalPreference: 'bulk',
    timingAppropriate: ['anytime'],
    tags: ['dairy', 'calcium', 'protein-fat-combo', 'flavor'],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export const allFoods = [...proteinFoods, ...carbFoods, ...fatFoods];

export function getFoodById(id: string): FoodItem | undefined {
  return allFoods.find(food => food.id === id);
}

export function getFoodsByCategory(category: FoodCategory): FoodItem[] {
  return allFoods.filter(food => food.category === category);
}

export function getFoodsByTag(tag: string): FoodItem[] {
  return allFoods.filter(food => food.tags.includes(tag));
}

export function getPrimaryProteins(): FoodItem[] {
  return proteinFoods.filter(food => food.isPrimaryProtein);
}

export function getFoodsForTiming(timing: MealTiming, category?: FoodCategory): FoodItem[] {
  let foods = allFoods.filter(food => food.timingAppropriate.includes(timing));
  if (category) {
    foods = foods.filter(food => food.category === category);
  }
  return foods;
}

export function getFoodsForGoal(goal: 'bulk' | 'cut', category?: FoodCategory): FoodItem[] {
  let foods = allFoods.filter(food => 
    food.goalPreference === goal || food.goalPreference === 'both'
  );
  if (category) {
    foods = foods.filter(food => food.category === category);
  }
  return foods;
}

/**
 * Calculate exact portion size in grams to hit a target macro
 */
export function calculatePortion(
  food: FoodItem,
  targetMacro: 'protein' | 'carbs' | 'fat' | 'calories',
  targetAmount: number
): number {
  const macroValue = food.macrosPer100g[targetMacro];
  if (macroValue === 0) return 0;
  return Math.round((targetAmount / macroValue) * 100);
}

/**
 * Calculate all macros for a given portion size
 */
export function calculateMacrosForPortion(food: FoodItem, grams: number) {
  const ratio = grams / 100;
  return {
    calories: Math.round(food.macrosPer100g.calories * ratio),
    protein: Math.round(food.macrosPer100g.protein * ratio * 10) / 10,
    carbs: Math.round(food.macrosPer100g.carbs * ratio * 10) / 10,
    fat: Math.round(food.macrosPer100g.fat * ratio * 10) / 10,
  };
}

/**
 * Convert grams to ounces (for display)
 */
export function gramsToOunces(grams: number): number {
  return Math.round((grams / 28.35) * 10) / 10;
}

/**
 * Format portion for display
 */
export function formatPortion(grams: number, useOunces = false): string {
  if (useOunces) {
    return `${gramsToOunces(grams)} oz`;
  }
  return `${Math.round(grams)}g`;
}
