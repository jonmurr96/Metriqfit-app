/**
 * Recipe Matcher
 * 
 * Matches recipes to user preferences and meal requirements
 */

import type {
  ProteinSource,
  CarbTolerance,
  CookingLevel,
  AllergyExclusion,
  RefusedFood,
  DietaryPreference,
} from '../onboarding';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  
  // Nutritional info (per serving)
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  
  // Protein sources used
  proteinSources: ProteinSource[];
  
  // Carb sources
  carbSources: ('rice' | 'pasta' | 'potatoes' | 'oats' | 'quinoa' | 'bread' | 'fruit' | 'vegetables')[];
  
  // Recipe characteristics
  complexity: 'minimal' | 'basic' | 'moderate' | 'full';
  prepTime: number; // minutes
  cookTime: number; // minutes
  
  // Timing appropriateness
  preWorkoutAppropriate: boolean;
  postWorkoutAppropriate: boolean;
  breakfastAppropriate: boolean;
  
  // Dietary compliance
  isVegetarian: boolean;
  isVegan: boolean;
  isKeto: boolean;
  isPaleo: boolean;
  isPescatarian: boolean;
  
  // Allergens present
  contains: {
    gluten?: boolean;
    dairy?: boolean;
    peanuts?: boolean;
    soy?: boolean;
    eggs?: boolean;
    shellfish?: boolean;
    fish?: boolean;
    nuts?: boolean;
  };
  
  // Tags for filtering
  tags: string[];
}

export interface RecipeFilterConfig {
  dietaryPreference: DietaryPreference;
  allergies: AllergyExclusion[];
  refusedFoods: RefusedFood[];
  preferredProteins: ProteinSource[];
  carbTolerance: CarbTolerance;
  cookingLevel: CookingLevel;
}

export interface RecipeMatchResult {
  recipe: Recipe;
  score: number;
  isCompatible: boolean;
  incompatibilityReasons?: string[];
}

// ---------------------------------------------------------------------------
// Filter Functions
// ---------------------------------------------------------------------------

/**
 * Check if recipe is compatible with dietary preference
 */
export function isDietCompatible(
  recipe: Recipe,
  dietaryPreference: DietaryPreference
): boolean {
  switch (dietaryPreference) {
    case 'vegan':
      return recipe.isVegan;
    case 'vegetarian':
      return recipe.isVegetarian;
    case 'pescatarian':
      return recipe.isPescatarian;
    case 'keto':
      return recipe.isKeto;
    case 'paleo':
      return recipe.isPaleo;
    case 'anything':
    case 'other':
    default:
      return true;
  }
}

/**
 * Check if recipe contains allergens
 */
export function containsAllergens(
  recipe: Recipe,
  allergies: AllergyExclusion[]
): { contains: boolean; allergens: string[] } {
  if (allergies.includes('none')) return { contains: false, allergens: [] };
  
  const found: string[] = [];
  
  const allergenMap: Record<string, keyof Recipe['contains']> = {
    'gluten': 'gluten',
    'dairy': 'dairy',
    'peanuts': 'peanuts',
    'soy': 'soy',
    'eggs': 'eggs',
    'shellfish': 'shellfish',
    'fish': 'fish',
  };
  
  for (const allergy of allergies) {
    const key = allergenMap[allergy];
    if (key && recipe.contains[key]) {
      found.push(allergy);
    }
  }
  
  return { contains: found.length > 0, allergens: found };
}

/**
 * Check if recipe contains refused foods
 */
export function containsRefusedFoods(
  recipe: Recipe,
  refusedFoods: RefusedFood[]
): { contains: boolean; foods: string[] } {
  const found: string[] = [];
  
  // Map refused foods to recipe characteristics
  const refusedProteins: Record<string, ProteinSource[]> = {
    'chicken': ['chicken'],
    'beef': ['beef'],
    'pork': ['pork'],
    'turkey': ['turkey'],
    'seafood': ['fish', 'shellfish'],
    'rice': [], // Would check carbSources
    'pasta': [],
    'potatoes': [],
    'oats': [],
    'cheese': ['dairy'],
    'milk': ['dairy'],
    'yogurt': ['dairy'],
    'whey': ['protein_powder'],
    'nuts': [],
  };
  
  for (const refused of refusedFoods) {
    const proteins = refusedProteins[refused] || [];
    const hasProtein = proteins.some(p => recipe.proteinSources.includes(p));
    
    // Check carb sources for refused carbs
    const refusedCarbs = ['rice', 'pasta', 'potatoes', 'oats'];
    const hasCarb = refusedCarbs.includes(refused) && 
      recipe.carbSources.includes(refused as any);
    
    if (hasProtein || hasCarb) {
      found.push(refused);
    }
  }
  
  return { contains: found.length > 0, foods: found };
}

/**
 * Check if recipe matches cooking skill level
 */
export function matchesCookingLevel(
  recipe: Recipe,
  cookingLevel: CookingLevel
): boolean {
  const complexityOrder = ['minimal', 'basic', 'moderate', 'full'];
  const userIndex = complexityOrder.indexOf(cookingLevel);
  const recipeIndex = complexityOrder.indexOf(recipe.complexity);
  
  // Recipe should be at or below user's skill level
  return recipeIndex <= userIndex;
}

/**
 * Score recipe protein preference match
 */
export function scoreProteinMatch(
  recipe: Recipe,
  preferredProteins: ProteinSource[]
): number {
  if (preferredProteins.length === 0) return 50; // Neutral if no preference
  
  const matches = recipe.proteinSources.filter(p => 
    preferredProteins.includes(p)
  ).length;
  
  if (matches === 0) return 0;
  
  // Bonus for matching multiple preferred proteins
  // Bonus for matching higher-ranked proteins
  let score = 0;
  for (const protein of recipe.proteinSources) {
    const rank = preferredProteins.indexOf(protein);
    if (rank !== -1) {
      score += (3 - rank) * 25; // Rank 0 = 75pts, Rank 1 = 50pts, Rank 2 = 25pts
    }
  }
  
  return Math.min(100, score);
}

/**
 * Score recipe carb appropriateness based on tolerance
 */
export function scoreCarbAppropriateness(
  recipe: Recipe,
  carbTolerance: CarbTolerance
): number {
  const carbRatio = recipe.carbs / (recipe.calories / 4); // % of calories from carbs
  
  switch (carbTolerance) {
    case 'energized_satiated':
      // User does well with carbs - moderate to high carb recipes good
      return carbRatio > 0.4 ? 100 : carbRatio > 0.3 ? 70 : 40;
      
    case 'hungry_quickly':
      // User needs more carbs for satiety
      return carbRatio > 0.45 ? 100 : carbRatio > 0.35 ? 70 : 50;
      
    case 'tired_sleepy':
    case 'bloated':
      // User doesn't do well with high carbs - prefer lower carb
      return carbRatio < 0.35 ? 100 : carbRatio < 0.45 ? 60 : 30;
      
    default:
      return 50;
  }
}

// ---------------------------------------------------------------------------
// Main Match Function
// ---------------------------------------------------------------------------

/**
 * Match recipes against user preferences
 */
export function matchRecipes(
  recipes: Recipe[],
  config: RecipeFilterConfig
): RecipeMatchResult[] {
  return recipes.map(recipe => {
    const result: RecipeMatchResult = {
      recipe,
      score: 0,
      isCompatible: true,
      incompatibilityReasons: [],
    };
    
    // Check dietary compatibility (hard filter)
    if (!isDietCompatible(recipe, config.dietaryPreference)) {
      result.isCompatible = false;
      result.incompatibilityReasons!.push('Incompatible with dietary preference');
      return result;
    }
    
    // Check allergens (hard filter)
    const allergenCheck = containsAllergens(recipe, config.allergies);
    if (allergenCheck.contains) {
      result.isCompatible = false;
      result.incompatibilityReasons!.push(`Contains allergens: ${allergenCheck.allergens.join(', ')}`);
      return result;
    }
    
    // Check refused foods (hard filter)
    const refusedCheck = containsRefusedFoods(recipe, config.refusedFoods);
    if (refusedCheck.contains) {
      result.isCompatible = false;
      result.incompatibilityReasons!.push(`Contains refused foods: ${refusedCheck.foods.join(', ')}`);
      return result;
    }
    
    // Check cooking level (soft filter - reduces score but doesn't eliminate)
    if (!matchesCookingLevel(recipe, config.cookingLevel)) {
      result.score -= 20;
      result.incompatibilityReasons!.push('Above cooking skill level');
    }
    
    // Score protein preference
    result.score += scoreProteinMatch(recipe, config.preferredProteins);
    
    // Score carb appropriateness
    result.score += scoreCarbAppropriateness(recipe, config.carbTolerance);
    
    // Bonus for appropriate complexity
    if (matchesCookingLevel(recipe, config.cookingLevel)) {
      result.score += 10;
    }
    
    return result;
  }).sort((a, b) => b.score - a.score);
}

/**
 * Get best matching recipes for a specific meal slot
 */
export function getRecipesForMealSlot(
  recipes: Recipe[],
  slot: string,
  config: RecipeFilterConfig,
  targetCalories?: number,
  limit: number = 5
): RecipeMatchResult[] {
  // First filter by compatibility
  const matched = matchRecipes(recipes, config);
  const compatible = matched.filter(r => r.isCompatible);
  
  // Filter by meal slot appropriateness
  const slotAppropriate = compatible.filter(r => {
    switch (slot) {
      case 'pre_workout':
        return r.recipe.preWorkoutAppropriate;
      case 'post_workout':
        return r.recipe.postWorkoutAppropriate;
      case 'meal_1':
      case 'breakfast':
        return r.recipe.breakfastAppropriate;
      default:
        return true;
    }
  });
  
  // Sort by calorie proximity if target provided
  if (targetCalories) {
    slotAppropriate.sort((a, b) => {
      const diffA = Math.abs(a.recipe.calories - targetCalories);
      const diffB = Math.abs(b.recipe.calories - targetCalories);
      return diffA - diffB;
    });
  }
  
  return slotAppropriate.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Recipe Database Helpers
// ---------------------------------------------------------------------------

/**
 * Create a recipe with sensible defaults
 */
export function createRecipe(partial: Partial<Recipe> & { id: string; name: string }): Recipe {
  return {
    calories: 400,
    protein: 30,
    carbs: 40,
    fat: 15,
    proteinSources: ['chicken'],
    carbSources: ['rice'],
    complexity: 'basic',
    prepTime: 10,
    cookTime: 20,
    preWorkoutAppropriate: false,
    postWorkoutAppropriate: true,
    breakfastAppropriate: false,
    isVegetarian: false,
    isVegan: false,
    isKeto: false,
    isPaleo: false,
    isPescatarian: false,
    contains: {},
    tags: [],
    ...partial,
  };
}
