// Scientific Meal Generation Engine
// Implements workout-first, context-aware meal placement with weighted scoring

export interface MealSlot {
  name: string;
  slot: "breakfast" | "lunch" | "dinner" | "snack" | "pre-workout" | "post-workout" | "evening";
  timing: string;
  targetProfile: {
    proteinPreference: "any" | "lean" | "moderate";
    carbSpeed: "slow" | "moderate" | "fast" | "any";
    fatAcceptable: boolean;
  };
  workoutContext?: "pre" | "post" | null;
}

export interface FoodWithMetadata {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  category: string | null;
  // Metadata scores
  breakfast_score: number;
  lunch_dinner_score: number;
  preworkout_score: number;
  postworkout_score: number;
  evening_score: number;
  // Nutritional characteristics
  digestion_speed: string;
  fat_load: string;
  carb_speed: string;
  protein_leanness: string;
  // Classification
  formality: string;
  goal_form: string;
  variety_family: string;
}

export interface UserNutritionSelections {
  proteins: string[]; // variety_family names: ['chicken', 'beef', 'eggs']
  carbs: string[]; // variety_family names: ['rice', 'oats', 'sweet_potato']
  fats: string[]; // variety_family names: ['olive_oil', 'almonds', 'avocado']
  traditional_meals: boolean;
}

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MealCandidate {
  protein: FoodWithMetadata;
  carb: FoodWithMetadata;
  fat: FoodWithMetadata;
  score: number;
  scoreBreakdown: {
    workoutFit: number;
    mealContextFit: number;
    varietyFit: number;
    goalFormFit: number;
  };
}

export interface GeneratedMeal {
  slot: string;
  name: string;
  timing: string;
  items: {
    protein: { food: FoodWithMetadata; grams: number };
    carb: { food: FoodWithMetadata; grams: number };
    fat: { food: FoodWithMetadata; grams: number };
  };
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  rationale: string;
}

// ============================================================================
// SLOT TEMPLATES
// ============================================================================

export function getSlotTemplate(
  hasWorkout: boolean,
  workoutTime: string | null
): MealSlot[] {
  if (hasWorkout && workoutTime) {
    return getTrainingDaySlots(workoutTime);
  }
  return getRestDaySlots();
}

function getTrainingDaySlots(workoutTime: string): MealSlot[] {
  // Parse workout time and calculate pre/post meal times
  const [hours, minutes] = workoutTime.split(":").map(Number);
  const workoutMinutes = hours * 60 + minutes;
  
  const preWorkoutMinutes = workoutMinutes - 150; // 2.5 hours before
  const postWorkoutMinutes = workoutMinutes + 45; // 45 min after
  
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  };
  
  const slots: MealSlot[] = [
    {
      name: "Breakfast",
      slot: "breakfast",
      timing: "07:00",
      targetProfile: { proteinPreference: "any", carbSpeed: "moderate", fatAcceptable: true },
    },
    {
      name: "Lunch",
      slot: "lunch", 
      timing: "12:30",
      targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true },
    },
  ];
  
  // Add pre-workout slot (only if it's after lunch)
  if (preWorkoutMinutes > 12 * 60 + 30) {
    slots.push({
      name: "Pre-Workout",
      slot: "pre-workout",
      timing: formatTime(preWorkoutMinutes),
      targetProfile: { proteinPreference: "lean", carbSpeed: "fast", fatAcceptable: false },
      workoutContext: "pre",
    });
  }
  
  // Add post-workout slot
  slots.push({
    name: "Post-Workout",
    slot: "post-workout",
    timing: formatTime(postWorkoutMinutes),
    targetProfile: { proteinPreference: "lean", carbSpeed: "fast", fatAcceptable: false },
    workoutContext: "post",
  });
  
  // Add dinner (after post-workout if there's space, or merge)
  const dinnerTime = Math.max(19 * 60, postWorkoutMinutes + 45);
  slots.push({
    name: "Dinner",
    slot: "dinner",
    timing: formatTime(dinnerTime),
    targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true },
  });
  
  // Add evening snack
  slots.push({
    name: "Evening",
    slot: "evening",
    timing: "21:30",
    targetProfile: { proteinPreference: "lean", carbSpeed: "slow", fatAcceptable: true },
  });
  
  return slots;
}

function getRestDaySlots(): MealSlot[] {
  return [
    {
      name: "Breakfast",
      slot: "breakfast",
      timing: "08:00",
      targetProfile: { proteinPreference: "any", carbSpeed: "moderate", fatAcceptable: true },
    },
    {
      name: "Lunch",
      slot: "lunch",
      timing: "12:30",
      targetProfile: { proteinPreference: "any", carbSpeed: "any", fatAcceptable: true },
    },
    {
      name: "Afternoon",
      slot: "snack",
      timing: "16:00",
      targetProfile: { proteinPreference: "any", carbSpeed: "moderate", fatAcceptable: true },
    },
    {
      name: "Dinner",
      slot: "dinner",
      timing: "19:30",
      targetProfile: { proteinPreference: "any", carbSpeed: "slow", fatAcceptable: true },
    },
    {
      name: "Evening",
      slot: "evening",
      timing: "21:30",
      targetProfile: { proteinPreference: "lean", carbSpeed: "slow", fatAcceptable: true },
    },
  ];
}

// ============================================================================
// SCORING ENGINE
// ============================================================================

const WEIGHTS = {
  workoutFit: 0.40,
  mealContextFit: 0.25,
  userPreferenceFit: 0.20,
  varietyFit: 0.10,
  goalFormFit: 0.05,
};

export function scoreMealCandidate(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  slot: MealSlot,
  previousMeals: GeneratedMeal[],
  goal: "muscle_gain" | "fat_loss" | "maintenance",
  traditionalMeals: boolean
): MealCandidate {
  const workoutFit = calculateWorkoutFit(combo, slot);
  const mealContextFit = calculateMealContextFit(combo, slot, traditionalMeals);
  const varietyFit = calculateVarietyFit(combo, previousMeals);
  const goalFormFit = calculateGoalFormFit(combo, goal);
  
  // User preference is implicit (we only select from their chosen foods)
  const userPreferenceFit = 1.0;
  
  const penalties = calculatePenalties(combo, slot, previousMeals);
  
  const score =
    workoutFit * WEIGHTS.workoutFit +
    mealContextFit * WEIGHTS.mealContextFit +
    userPreferenceFit * WEIGHTS.userPreferenceFit +
    varietyFit * WEIGHTS.varietyFit +
    goalFormFit * WEIGHTS.goalFormFit -
    penalties;
  
  return {
    protein: combo.protein,
    carb: combo.carb,
    fat: combo.fat,
    score,
    scoreBreakdown: {
      workoutFit,
      mealContextFit,
      varietyFit,
      goalFormFit,
    },
  };
}

function calculateWorkoutFit(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  slot: MealSlot
): number {
  // HARD RULE: No high-fat pre/post workout
  if (!slot.targetProfile.fatAcceptable && combo.fat.fat_load === "high") {
    return 0;
  }
  
  let fit = 0.5; // Base score
  
  // Carb speed match
  if (slot.targetProfile.carbSpeed !== "any") {
    if (combo.carb.carb_speed === slot.targetProfile.carbSpeed) {
      fit += 0.25;
    } else if (
      (slot.targetProfile.carbSpeed === "fast" && combo.carb.carb_speed === "moderate") ||
      (slot.targetProfile.carbSpeed === "moderate" && combo.carb.carb_speed === "fast")
    ) {
      fit += 0.1; // Partial credit
    }
  }
  
  // Protein leanness match
  if (slot.targetProfile.proteinPreference === "lean" && combo.protein.fat_load === "low") {
    fit += 0.25;
  }
  
  // Workout-specific scores from food metadata
  if (slot.workoutContext === "pre") {
    fit += (combo.protein.preworkout_score / 3) * 0.2;
    fit += (combo.carb.preworkout_score / 3) * 0.15;
  } else if (slot.workoutContext === "post") {
    fit += (combo.protein.postworkout_score / 3) * 0.2;
    fit += (combo.carb.postworkout_score / 3) * 0.15;
  }
  
  return Math.min(fit, 1.0);
}

function calculateMealContextFit(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  slot: MealSlot,
  traditionalMeals: boolean
): number {
  if (!traditionalMeals) return 1.0;
  
  let fit = 0;
  let totalWeight = 0;
  
  // Map slot to context score
  const getContextScore = (food: FoodWithMetadata) => {
    switch (slot.slot) {
      case "breakfast":
        return food.breakfast_score;
      case "lunch":
      case "dinner":
        return food.lunch_dinner_score;
      case "evening":
        return food.evening_score;
      default:
        return Math.max(food.breakfast_score, food.lunch_dinner_score, food.evening_score);
    }
  };
  
  const proteinScore = getContextScore(combo.protein);
  const carbScore = getContextScore(combo.carb);
  const fatScore = getContextScore(combo.fat);
  
  // Average normalized to 0-1
  const avgScore = (proteinScore + carbScore + fatScore) / 9;
  
  return 0.3 + avgScore * 0.7; // Min 0.3, max 1.0
}

function calculateVarietyFit(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  previousMeals: GeneratedMeal[]
): number {
  if (previousMeals.length === 0) return 1.0;
  
  // Check last meal for same protein
  const lastMeal = previousMeals[previousMeals.length - 1];
  if (combo.protein.variety_family === lastMeal.items.protein.variety_family) {
    return 0.3; // 70% penalty for back-to-back same protein
  }
  
  // Check if protein was used 2 meals ago
  if (previousMeals.length >= 2) {
    const twoMealsAgo = previousMeals[previousMeals.length - 2];
    if (combo.protein.variety_family === twoMealsAgo.items.protein.variety_family) {
      return 0.7; // 30% penalty
    }
  }
  
  return 1.0;
}

function calculateGoalFormFit(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  goal: "muscle_gain" | "fat_loss" | "maintenance"
): number {
  let fit = 0.5;
  
  if (goal === "muscle_gain") {
    if (combo.protein.goal_form === "bulk_default") fit += 0.3;
    else if (combo.protein.goal_form === "both") fit += 0.15;
  } else if (goal === "fat_loss") {
    if (combo.protein.goal_form === "cut_default") fit += 0.3;
    else if (combo.protein.goal_form === "both") fit += 0.15;
  } else {
    // Maintenance
    if (combo.protein.goal_form === "both") fit += 0.25;
  }
  
  return Math.min(fit, 1.0);
}

function calculatePenalties(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  slot: MealSlot,
  previousMeals: GeneratedMeal[]
): number {
  let penalty = 0;
  
  // Penalty: Slow carb post-workout
  if (slot.workoutContext === "post" && combo.carb.carb_speed === "slow") {
    penalty += 0.3;
  }
  
  // Penalty: Same protein as last meal (additional beyond varietyFit)
  if (previousMeals.length > 0) {
    const lastMeal = previousMeals[previousMeals.length - 1];
    if (combo.protein.variety_family === lastMeal.items.protein.variety_family) {
      penalty += 0.2;
    }
  }
  
  return penalty;
}

// ============================================================================
// MEAL GENERATION ENGINE
// ============================================================================

export function generateDailyMeals(
  foodCatalog: FoodWithMetadata[],
  selections: UserNutritionSelections,
  slots: MealSlot[],
  macroTargets: MacroTargets,
  goal: "muscle_gain" | "fat_loss" | "maintenance"
): GeneratedMeal[] {
  // Filter to ONLY user-selected foods
  const availableProteins = foodCatalog.filter(
    (f) => selections.proteins.includes(f.variety_family) && f.protein_per_100g > 5
  );
  const availableCarbs = foodCatalog.filter(
    (f) => selections.carbs.includes(f.variety_family) && f.carbs_per_100g > 5
  );
  const availableFats = foodCatalog.filter(
    (f) => selections.fats.includes(f.variety_family) && f.fat_per_100g > 2
  );
  
  if (availableProteins.length === 0 || availableCarbs.length === 0 || availableFats.length === 0) {
    const debugInfo = {
      foodCount: foodCatalog.length,
      sampleFoods: foodCatalog.slice(0, 3).map(f => ({ name: f.name, variety_family: f.variety_family, category: f.category })),
      userSelections: selections,
      proteinsWithVarieties: [...new Set(foodCatalog.filter(f => f.protein_per_100g > 5).map(f => f.variety_family))].slice(0, 10),
      carbsWithVarieties: [...new Set(foodCatalog.filter(f => f.carbs_per_100g > 5).map(f => f.variety_family))].slice(0, 10),
      fatsWithVarieties: [...new Set(foodCatalog.filter(f => f.fat_per_100g > 2).map(f => f.variety_family))].slice(0, 10),
      availableProteinsCount: availableProteins.length,
      availableCarbsCount: availableCarbs.length,
      availableFatsCount: availableFats.length,
    };
    console.error("[scientificMealEngine] Food matching debug:", JSON.stringify(debugInfo));
    throw new Error(`No foods available matching user selections. Proteins: ${availableProteins.length}, Carbs: ${availableCarbs.length}, Fats: ${availableFats.length}`);
  }
  
  const meals: GeneratedMeal[] = [];
  let remainingMacros = { ...macroTargets };
  
  for (const slot of slots) {
    const remainingSlots = slots.slice(meals.length + 1);
    
    const meal = generateBestMeal(
      availableProteins,
      availableCarbs,
      availableFats,
      slot,
      meals,
      remainingMacros,
      remainingSlots,
      goal,
      selections.traditional_meals
    );
    
    if (meal) {
      meals.push(meal);
      remainingMacros = subtractMacros(remainingMacros, meal.macros);
    }
  }
  
  // Scale portions to hit exact targets
  return scalePortions(meals, macroTargets);
}

function generateBestMeal(
  proteins: FoodWithMetadata[],
  carbs: FoodWithMetadata[],
  fats: FoodWithMetadata[],
  slot: MealSlot,
  previousMeals: GeneratedMeal[],
  remainingMacros: MacroTargets,
  remainingSlots: MealSlot[],
  goal: "muscle_gain" | "fat_loss" | "maintenance",
  traditionalMeals: boolean
): GeneratedMeal | null {
  let bestCandidate: MealCandidate | null = null;
  let bestScore = -Infinity;
  
  // Generate all combinations and score them
  for (const protein of proteins) {
    for (const carb of carbs) {
      for (const fat of fats) {
        const combo = { protein, carb, fat };
        
        // Quick feasibility check
        if (!isFeasible(combo, remainingMacros, remainingSlots)) {
          continue;
        }
        
        const candidate = scoreMealCandidate(combo, slot, previousMeals, goal, traditionalMeals);
        
        if (candidate.score > bestScore) {
          bestScore = candidate.score;
          bestCandidate = candidate;
        }
      }
    }
  }
  
  if (!bestCandidate) return null;
  
  return createMealFromCandidate(bestCandidate, slot);
}

function isFeasible(
  combo: { protein: FoodWithMetadata; carb: FoodWithMetadata; fat: FoodWithMetadata },
  remainingMacros: MacroTargets,
  remainingSlots: MealSlot[]
): boolean {
  const slotsRemaining = remainingSlots.length;
  if (slotsRemaining === 0) return true;
  
  // Estimate macros for this combo at normal portions
  const estimatedMacros = {
    protein: combo.protein.protein_per_100g * 1.5, // ~150g serving
    carbs: combo.carb.carbs_per_100g * 2, // ~200g serving
    fat: combo.fat.fat_per_100g * 1, // ~100g serving
  };
  
  // Don't consume more than proportional share
  const maxPortion = {
    protein: remainingMacros.protein_g / (slotsRemaining + 1) * 1.5,
    carbs: remainingMacros.carbs_g / (slotsRemaining + 1) * 1.5,
    fat: remainingMacros.fat_g / (slotsRemaining + 1) * 1.5,
  };
  
  return (
    estimatedMacros.protein <= maxPortion.protein &&
    estimatedMacros.carbs <= maxPortion.carbs &&
    estimatedMacros.fat <= maxPortion.fat
  );
}

function createMealFromCandidate(candidate: MealCandidate, slot: MealSlot): GeneratedMeal {
  // Calculate initial portions (will be scaled later)
  const proteinGrams = 150; // Base 150g protein source
  const carbGrams = 200; // Base 200g carb source
  const fatGrams = 15; // Base 15g fat source (oils/nuts)
  
  const proteinMacros = calculateFoodMacros(candidate.protein, proteinGrams);
  const carbMacros = calculateFoodMacros(candidate.carb, carbGrams);
  const fatMacros = calculateFoodMacros(candidate.fat, fatGrams);
  
  const totalMacros = {
    calories: proteinMacros.calories + carbMacros.calories + fatMacros.calories,
    protein: proteinMacros.protein + carbMacros.protein + fatMacros.protein,
    carbs: proteinMacros.carbs + carbMacros.carbs + fatMacros.carbs,
    fat: proteinMacros.fat + carbMacros.fat + fatMacros.fat,
  };
  
  // Generate rationale
  const rationale = generateRationale(candidate, slot);
  
  return {
    slot: slot.slot,
    name: slot.name,
    timing: slot.timing,
    items: {
      protein: { food: candidate.protein, grams: proteinGrams },
      carb: { food: candidate.carb, grams: carbGrams },
      fat: { food: candidate.fat, grams: fatGrams },
    },
    macros: totalMacros,
    rationale,
  };
}

function calculateFoodMacros(food: FoodWithMetadata, grams: number) {
  const factor = grams / 100;
  return {
    calories: Math.round(food.calories_per_100g * factor),
    protein: Math.round(food.protein_per_100g * factor * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * factor * 10) / 10,
    fat: Math.round(food.fat_per_100g * factor * 10) / 10,
  };
}

function generateRationale(candidate: MealCandidate, slot: MealSlot): string {
  const parts: string[] = [];
  
  if (slot.workoutContext) {
    parts.push(`Workout-optimized ${slot.workoutContext}-workout meal`);
  }
  
  if (candidate.scoreBreakdown.mealContextFit > 0.7) {
    parts.push("Culturally appropriate for this time of day");
  }
  
  if (candidate.scoreBreakdown.varietyFit < 1) {
    parts.push("Selected for protein variety");
  }
  
  return parts.join(". ") || "Balanced macronutrient meal";
}

// ============================================================================
// PORTION SCALING
// ============================================================================

function scalePortions(meals: GeneratedMeal[], targets: MacroTargets): GeneratedMeal[] {
  const currentTotals = sumMealMacros(meals);
  
  // Calculate scale factors
  const scaleFactors = {
    protein: targets.protein_g / Math.max(currentTotals.protein, 1),
    carbs: targets.carbs_g / Math.max(currentTotals.carbs, 1),
    fat: targets.fat_g / Math.max(currentTotals.fat, 1),
  };
  
  return meals.map((meal) => {
    // Scale each component proportionally
    const scaledProteinGrams = Math.round(meal.items.protein.grams * scaleFactors.protein);
    const scaledCarbGrams = Math.round(meal.items.carb.grams * scaleFactors.carbs);
    const scaledFatGrams = Math.round(meal.items.fat.grams * scaleFactors.fat);
    
    return {
      ...meal,
      items: {
        protein: { ...meal.items.protein, grams: scaledProteinGrams },
        carb: { ...meal.items.carb, grams: scaledCarbGrams },
        fat: { ...meal.items.fat, grams: scaledFatGrams },
      },
      macros: {
        calories: calculateFoodMacros(meal.items.protein.food, scaledProteinGrams).calories +
                  calculateFoodMacros(meal.items.carb.food, scaledCarbGrams).calories +
                  calculateFoodMacros(meal.items.fat.food, scaledFatGrams).calories,
        protein: calculateFoodMacros(meal.items.protein.food, scaledProteinGrams).protein +
                 calculateFoodMacros(meal.items.carb.food, scaledCarbGrams).protein +
                 calculateFoodMacros(meal.items.fat.food, scaledFatGrams).protein,
        carbs: calculateFoodMacros(meal.items.protein.food, scaledProteinGrams).carbs +
               calculateFoodMacros(meal.items.carb.food, scaledCarbGrams).carbs +
               calculateFoodMacros(meal.items.fat.food, scaledFatGrams).carbs,
        fat: calculateFoodMacros(meal.items.protein.food, scaledProteinGrams).fat +
             calculateFoodMacros(meal.items.carb.food, scaledCarbGrams).fat +
             calculateFoodMacros(meal.items.fat.food, scaledFatGrams).fat,
      },
    };
  });
}

function sumMealMacros(meals: GeneratedMeal[]) {
  return meals.reduce(
    (sum, meal) => ({
      calories: sum.calories + meal.macros.calories,
      protein: sum.protein + meal.macros.protein,
      carbs: sum.carbs + meal.macros.carbs,
      fat: sum.fat + meal.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function subtractMacros(current: MacroTargets, used: { calories: number; protein: number; carbs: number; fat: number }): MacroTargets {
  return {
    calories: Math.max(0, current.calories - used.calories),
    protein_g: Math.max(0, current.protein_g - used.protein),
    carbs_g: Math.max(0, current.carbs_g - used.carbs),
    fat_g: Math.max(0, current.fat_g - used.fat),
  };
}
