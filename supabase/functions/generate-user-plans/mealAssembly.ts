// Lightweight meal assembly layer
// Turns (protein, carb, fat, slot) triplets into human-readable dish names and descriptions.
// NOT a full recipe engine — just a presentation and coherence layer.

import type { FoodWithMetadata, MealSlot } from "./scientificMealEngine.ts";

export type AssemblyType = "shake" | "bowl" | "skillet" | "bake" | "plate" | "simple";

interface MealTemplate {
  dish_name: string;
  description: string;
  assembly_type: AssemblyType;
  cuisine_tag?: string;
}

// Template registry keyed by "protein_family:carb_family:slot"
// Slots: breakfast, lunch, dinner, snack, pre-workout, post-workout
// Only high-frequency pairings are templated; everything else uses the fallback formatter.
const TEMPLATE_REGISTRY: Record<string, MealTemplate> = {
  // Chicken + Rice
  "chicken:rice:breakfast": {
    dish_name: "Savory Chicken & Rice Breakfast Bowl",
    description: "Warm rice topped with seasoned chicken breast and a drizzle of healthy fat. A hearty start to the day.",
    assembly_type: "bowl",
  },
  "chicken:rice:lunch": {
    dish_name: "Grilled Chicken & Rice Bowl",
    description: "Juicy grilled chicken served over fluffy rice with a light fat finish.",
    assembly_type: "bowl",
  },
  "chicken:rice:dinner": {
    dish_name: "Chicken & Rice Dinner Plate",
    description: "Simple baked or pan-seared chicken breast with steamed rice and a touch of healthy oil.",
    assembly_type: "plate",
  },
  "chicken:rice:post-workout": {
    dish_name: "Post-Workout Chicken & Rice Bowl",
    description: "Fast-digesting chicken and white rice to kickstart recovery.",
    assembly_type: "bowl",
  },

  // Chicken + Sweet Potato
  "chicken:sweet_potato:lunch": {
    dish_name: "Chicken & Sweet Potato Plate",
    description: "Lean chicken paired with roasted sweet potato wedges and a light fat drizzle.",
    assembly_type: "plate",
  },
  "chicken:sweet_potato:dinner": {
    dish_name: "Baked Chicken with Sweet Potato",
    description: "Oven-baked chicken breast alongside soft sweet potato. Minimal prep, maximum flavor.",
    assembly_type: "bake",
  },

  // Chicken + Pasta
  "chicken:pasta:lunch": {
    dish_name: "Chicken Pasta Bowl",
    description: "Tender chicken tossed with cooked pasta and a simple fat finish.",
    assembly_type: "bowl",
  },
  "chicken:pasta:dinner": {
    dish_name: "Classic Chicken Pasta",
    description: "Pan-seared chicken served over pasta with a light drizzle of olive oil.",
    assembly_type: "plate",
  },

  // Salmon + Rice
  "fish:rice:lunch": {
    dish_name: "Salmon & Rice Bowl",
    description: "Flaky salmon fillet over rice with a light fat accent.",
    assembly_type: "bowl",
  },
  "fish:rice:dinner": {
    dish_name: "Baked Salmon with Rice",
    description: "Oven-baked salmon served alongside steamed rice and a touch of healthy fat.",
    assembly_type: "plate",
  },

  // Salmon + Sweet Potato
  "fish:sweet_potato:lunch": {
    dish_name: "Salmon & Sweet Potato Plate",
    description: "Rich salmon fillet paired with roasted sweet potato wedges.",
    assembly_type: "plate",
  },
  "fish:sweet_potato:dinner": {
    dish_name: "Roasted Salmon with Sweet Potato",
    description: "Salmon and sweet potato baked together on one tray for easy cleanup.",
    assembly_type: "bake",
  },

  // Beef + Rice
  "beef:rice:lunch": {
    dish_name: "Beef & Rice Bowl",
    description: "Seasoned beef over rice with a simple fat finish.",
    assembly_type: "bowl",
  },
  "beef:rice:dinner": {
    dish_name: "Savory Beef & Rice Plate",
    description: "Hearty beef served with fluffy rice and a drizzle of healthy oil.",
    assembly_type: "plate",
  },

  // Beef + Potato
  "beef:potato:dinner": {
    dish_name: "Beef & Potato Dinner",
    description: "Classic beef paired with soft potatoes and a light fat accent.",
    assembly_type: "plate",
  },

  // Turkey + Rice
  "turkey:rice:lunch": {
    dish_name: "Turkey & Rice Bowl",
    description: "Lean turkey served over rice with a healthy fat drizzle.",
    assembly_type: "bowl",
  },
  "turkey:rice:dinner": {
    dish_name: "Turkey & Rice Plate",
    description: "Simple seasoned turkey with steamed rice and a touch of oil.",
    assembly_type: "plate",
  },

  // Eggs + Bread/Toast
  "eggs:bread:breakfast": {
    dish_name: "Eggs with Toast",
    description: "Classic eggs paired with toasted bread and a light spread of healthy fat.",
    assembly_type: "simple",
  },
  "eggs:potato:breakfast": {
    dish_name: "Breakfast Eggs & Potatoes",
    description: "Eggs cooked your way with tender potatoes and a light fat finish.",
    assembly_type: "skillet",
  },
  "eggs:oats:breakfast": {
    dish_name: "Eggs & Oats Breakfast",
    description: "Savory eggs on the side of warm oats for a balanced morning meal.",
    assembly_type: "simple",
  },

  // Eggs + Rice (lunch/dinner fallback to generic formatter; kept minimal)

  // Shrimp + Rice
  "shellfish:rice:lunch": {
    dish_name: "Shrimp & Rice Bowl",
    description: "Quick-cooked shrimp over rice with a light drizzle of healthy fat.",
    assembly_type: "bowl",
  },
  "shellfish:rice:dinner": {
    dish_name: "Shrimp & Rice Plate",
    description: "Flavorful shrimp served with fluffy rice and a touch of oil.",
    assembly_type: "plate",
  },

  // Tofu + Rice
  "tofu_tempeh:rice:lunch": {
    dish_name: "Tofu & Rice Bowl",
    description: "Pan-seared tofu over rice with a simple fat finish.",
    assembly_type: "bowl",
  },
  "tofu_tempeh:rice:dinner": {
    dish_name: "Tofu & Rice Plate",
    description: "Crispy tofu cubes served with steamed rice and a drizzle of healthy oil.",
    assembly_type: "plate",
  },

  // Tofu + Quinoa
  "tofu_tempeh:quinoa:lunch": {
    dish_name: "Tofu & Quinoa Bowl",
    description: "Seasoned tofu over fluffy quinoa with a light fat accent.",
    assembly_type: "bowl",
  },
  "tofu_tempeh:quinoa:dinner": {
    dish_name: "Tofu & Quinoa Plate",
    description: "Baked tofu served alongside quinoa and a touch of healthy fat.",
    assembly_type: "plate",
  },

  // Whey / Protein Powder + Oats (breakfast / shake)
  "whey:oats:breakfast": {
    dish_name: "Protein Oats",
    description: "Warm oats stirred with protein powder and a healthy fat topping.",
    assembly_type: "bowl",
  },
  "whey:oats:snack": {
    dish_name: "Protein Oats Snack",
    description: "Quick oats mixed with protein powder and a light fat drizzle.",
    assembly_type: "bowl",
  },
  "protein_powder:oats:breakfast": {
    dish_name: "Protein Oats",
    description: "Warm oats stirred with protein powder and a healthy fat topping.",
    assembly_type: "bowl",
  },
  "protein_powder:oats:snack": {
    dish_name: "Protein Oats Snack",
    description: "Quick oats mixed with protein powder and a light fat drizzle.",
    assembly_type: "bowl",
  },
  // Whey / Protein Powder + Fruit
  "whey:banana:breakfast": {
    dish_name: "Banana Protein Smoothie",
    description: "Protein powder blended with banana and topped with healthy fats.",
    assembly_type: "shake",
  },
  "whey:banana:snack": {
    dish_name: "Banana Protein Smoothie",
    description: "A simple shake of protein powder, banana, and healthy fats.",
    assembly_type: "shake",
  },
  "whey:banana:pre-workout": {
    dish_name: "Pre-Workout Banana Protein Smoothie",
    description: "Light and fast-digesting protein shake with banana for quick energy.",
    assembly_type: "shake",
  },
  "whey:banana:post-workout": {
    dish_name: "Post-Workout Banana Protein Smoothie",
    description: "Refreshing protein shake with banana to start recovery right away.",
    assembly_type: "shake",
  },
  "whey:apple:breakfast": {
    dish_name: "Apple Protein Smoothie",
    description: "Protein powder blended with apple and topped with healthy fats.",
    assembly_type: "shake",
  },
  "whey:apple:snack": {
    dish_name: "Apple Protein Smoothie",
    description: "A simple shake of protein powder, apple, and healthy fats.",
    assembly_type: "shake",
  },
  "whey:mango:breakfast": {
    dish_name: "Mango Protein Smoothie",
    description: "Protein powder blended with mango and topped with healthy fats.",
    assembly_type: "shake",
  },
  "whey:mango:snack": {
    dish_name: "Mango Protein Smoothie",
    description: "A simple shake of protein powder, mango, and healthy fats.",
    assembly_type: "shake",
  },
  "protein_powder:fruit:breakfast": {
    dish_name: "Protein Fruit Smoothie Bowl",
    description: "Protein powder blended with fruit and topped with healthy fats.",
    assembly_type: "shake",
  },
  "protein_powder:fruit:snack": {
    dish_name: "Protein Smoothie",
    description: "A simple shake of protein powder, fruit, and healthy fats.",
    assembly_type: "shake",
  },
  "protein_powder:fruit:pre-workout": {
    dish_name: "Pre-Workout Protein Smoothie",
    description: "Light and fast-digesting protein shake with fruit for quick energy.",
    assembly_type: "shake",
  },
  "protein_powder:fruit:post-workout": {
    dish_name: "Post-Workout Protein Smoothie",
    description: "Refreshing protein shake with fruit to start recovery right away.",
    assembly_type: "shake",
  },

  // Pork + Potato
  "pork:potato:dinner": {
    dish_name: "Pork & Potato Plate",
    description: "Savory pork paired with soft potatoes and a light fat finish.",
    assembly_type: "plate",
  },

  // Dairy (Greek yogurt / cottage cheese) + Fruit
  "dairy:fruit:breakfast": {
    dish_name: "Yogurt & Fruit Bowl",
    description: "Creamy yogurt topped with fresh fruit and a sprinkle of healthy fats.",
    assembly_type: "bowl",
  },
  "dairy:fruit:snack": {
    dish_name: "Yogurt & Fruit Snack",
    description: "A quick bowl of yogurt with fruit and a light fat topping.",
    assembly_type: "bowl",
  },

  // Oats + any protein (breakfast generic)
  "chicken:oats:breakfast": {
    dish_name: "Savory Chicken & Oats Bowl",
    description: "Warm oats with seasoned chicken and a healthy fat drizzle.",
    assembly_type: "bowl",
  },
  "turkey:oats:breakfast": {
    dish_name: "Turkey & Oats Breakfast",
    description: "Hearty oats paired with lean turkey and a light fat finish.",
    assembly_type: "bowl",
  },
};

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatFamily(name: string): string {
  return name.replace(/_/g, " ");
}

function fallbackDishName(
  protein: FoodWithMetadata,
  carb: FoodWithMetadata,
  _fat: FoodWithMetadata,
  slot: MealSlot
): string {
  const pName = protein.name.split("(")[0].trim();
  const cName = carb.name.split("(")[0].trim();
  const pLower = pName.toLowerCase();
  const isPowder = pLower.includes("whey") || pLower.includes("protein powder");

  if (slot.slot === "breakfast") {
    if (isPowder) return `Protein Shake with ${cName}`;
    return `${pName} & ${cName} Breakfast`;
  }
  if (slot.slot === "pre-workout") {
    if (isPowder) return `Pre-Workout Shake with ${cName}`;
    return `${pName} & ${cName} Pre-Workout`;
  }
  if (slot.slot === "post-workout") {
    if (isPowder) return `Recovery Shake with ${cName}`;
    return `${pName} & ${cName} Recovery`;
  }
  if (slot.slot === "snack") {
    if (isPowder) return `${pName} Snack with ${cName}`;
    return `${pName} & ${cName} Snack`;
  }
  if (slot.slot === "evening") {
    if (isPowder) return `Evening Shake with ${cName}`;
    return `${pName} & ${cName} Evening Snack`;
  }
  // lunch / dinner — allow "Plate" or "Bowl" suffix
  if (isPowder) return `${pName} & ${cName}`;
  const rand = (pName.length + cName.length) % 3;
  if (rand === 0) return `${pName} with ${cName}`;
  if (rand === 1) return `${pName} & ${cName} Plate`;
  return `${pName} & ${cName} Bowl`;
}

function fallbackDescription(
  protein: FoodWithMetadata,
  carb: FoodWithMetadata,
  fat: FoodWithMetadata,
  slot: MealSlot
): string {
  const pName = protein.name.split("(")[0].trim();
  const cName = carb.name.split("(")[0].trim();
  const fName = fat.name.split("(")[0].trim().toLowerCase();
  if (slot.slot === "breakfast") {
    return `A balanced breakfast of ${pName} and ${cName}, finished with ${fName}.`;
  }
  if (slot.slot === "pre-workout") {
    return `Light and energizing pre-workout meal featuring ${pName} and ${cName} with a touch of ${fName}.`;
  }
  if (slot.slot === "post-workout") {
    return `Recovery-focused meal with ${pName} and ${cName}, finished with ${fName}.`;
  }
  if (slot.slot === "snack" || slot.slot === "evening") {
    return `A lighter ${slot.slot} of ${pName} and ${cName} with ${fName}.`;
  }
  return `${pName} paired with ${cName} and a drizzle of ${fName}.`;
}

export function assembleMeal(
  protein: FoodWithMetadata,
  carb: FoodWithMetadata,
  fat: FoodWithMetadata,
  slot: MealSlot
): { name: string; description: string; assembly_type: AssemblyType } {
  const key = `${protein.variety_family}:${carb.variety_family}:${slot.slot}`;
  const template = TEMPLATE_REGISTRY[key];

  if (template) {
    return {
      name: template.dish_name,
      description: template.description,
      assembly_type: template.assembly_type,
    };
  }

  // Try slot-agnostic fallback — only for lunch/dinner-equivalent slots.
  // Never borrow a dinner template name for snack, evening, pre/post-workout or breakfast
  // as this produces "Chicken & Rice Dinner Plate" in a snack slot.
  const isMainMealSlot = slot.slot === "lunch" || slot.slot === "dinner";
  if (isMainMealSlot) {
    const genericKey = `${protein.variety_family}:${carb.variety_family}:dinner`;
    const genericTemplate = TEMPLATE_REGISTRY[genericKey];
    if (genericTemplate) {
      return {
        name: genericTemplate.dish_name,
        description: genericTemplate.description,
        assembly_type: genericTemplate.assembly_type,
      };
    }
  }

  // Pure fallback — generate a name appropriate to the slot
  const assemblyType = guessAssemblyType(protein, carb, fat, slot);
  return {
    name: fallbackDishName(protein, carb, fat, slot),
    description: fallbackDescription(protein, carb, fat, slot),
    assembly_type: assemblyType,
  };
}

function guessAssemblyType(
  protein: FoodWithMetadata,
  carb: FoodWithMetadata,
  fat: FoodWithMetadata,
  slot: MealSlot
): AssemblyType {
  const p = protein.name.toLowerCase();
  const c = carb.name.toLowerCase();
  if (p.includes("protein powder") || p.includes("whey") || p.includes("casein")) {
    return "shake";
  }
  if (c.includes("oats") && slot.slot === "breakfast") return "bowl";
  if (c.includes("rice") || c.includes("quinoa") || c.includes("pasta")) return "bowl";
  if (p.includes("egg") && slot.slot === "breakfast") return "simple";
  if (slot.slot === "breakfast") return "simple";
  if (p.includes("beef") || p.includes("steak") || p.includes("pork")) return "plate";
  return "plate";
}

// Conservative weird-pairing penalties
// Returns a penalty score (0 = fine, higher = weirder)
export function calculatePairingPenalty(
  protein: FoodWithMetadata,
  carb: FoodWithMetadata,
  fat: FoodWithMetadata,
  slot: MealSlot
): number {
  let penalty = 0;
  const p = protein.name.toLowerCase();
  const c = carb.name.toLowerCase();
  const f = fat.name.toLowerCase();

  // Detect savory proteins (beef, steak, pork, chicken, turkey, fish, shrimp)
  const isSavoryMeatProtein =
    p.includes("beef") || p.includes("steak") || p.includes("sirloin") || p.includes("pork") ||
    p.includes("chicken") || p.includes("turkey") || p.includes("shrimp") || p.includes("tilapia") ||
    p.includes("cod") || p.includes("tuna") || p.includes("salmon");
  // Detect grain/starchy carbs (pasta, rice, oats, bread, quinoa, potato)
  const isSavoryGrainCarb =
    c.includes("pasta") || c.includes("rice") || c.includes("bread") ||
    c.includes("quinoa") || c.includes("potato") || c.includes("tortilla");
  // Detect raw-nut fat sources (walnuts, almonds, cashews, pecans, pistachios, peanuts)
  const isRawNutFat =
    f.includes("walnut") || f.includes("almond") || f.includes("cashew") ||
    f.includes("pecan") || f.includes("pistachio") || f.includes("peanut") ||
    f.includes("macadamia") || f.includes("brazil nut");

  // Raw nuts served alongside a savory meat + grain dish is culinarily incoherent.
  // A fat like olive oil, butter, or avocado is appropriate; raw nuts as a side are not.
  if (isSavoryMeatProtein && isSavoryGrainCarb && isRawNutFat) {
    penalty += 0.55;
  }

  // whey + pasta is weird in any context
  if ((p.includes("whey") || p.includes("protein powder")) && c.includes("pasta")) {
    penalty += 0.5;
  }

  // salmon / fish + oats at dinner or lunch
  if ((p.includes("salmon") || p.includes("fish") || p.includes("tilapia") || p.includes("cod")) &&
      c.includes("oats") && (slot.slot === "dinner" || slot.slot === "lunch")) {
    penalty += 0.35;
  }

  // olive-oil-heavy breakfast yogurt bowls
  if ((p.includes("yogurt") || p.includes("cottage")) && slot.slot === "breakfast" && f.includes("olive oil")) {
    penalty += 0.25;
  }

  // eggs + rice at dinner (moderate)
  if (p.includes("egg") && c.includes("rice") && slot.slot === "dinner") {
    penalty += 0.2;
  }

  // rice cakes used in a savory lunch/dinner context (rice cakes belong in snack/breakfast)
  if (c.includes("rice cake") && (slot.slot === "lunch" || slot.slot === "dinner")) {
    penalty += 0.4;
  }

  // savory protein + sweet fruit context (blueberries/strawberries in a "savory" bowl)
  if (isSavoryMeatProtein && slot.slot === "breakfast") {
    // Breakfast with a savory meat is fine, but adding a sweet fruit fat source is odd.
    // This is handled by the produce layer; no additional penalty here.
  }

  return penalty;
}

// Prep time derivation based on component complexity + slot + assembly type
export function calculatePrepTimeMinutes(
  protein: FoodWithMetadata,
  carb: FoodWithMetadata,
  fat: FoodWithMetadata,
  slot: MealSlot,
  assemblyType: AssemblyType
): number {
  // Component complexity (mirrors scientificMealEngine.ts logic)
  const compP = ingredientComplexity(protein);
  const compC = ingredientComplexity(carb);
  const compF = ingredientComplexity(fat);
  const avgComplexity = (compP + compC + compF) / 3;

  // Assembly base
  let base = 15;
  switch (assemblyType) {
    case "shake":
      base = 5;
      break;
    case "bowl":
      base = 10;
      break;
    case "simple":
      base = 8;
      break;
    case "skillet":
      base = 20;
      break;
    case "bake":
      base = 30;
      break;
    case "plate":
      base = 25;
      break;
  }

  // Slot adjustment
  if (slot.slot === "breakfast") base -= 3;
  if (slot.slot === "dinner") base += 5;

  // Complexity adjustment
  if (avgComplexity <= 1.5) base -= 3;
  if (avgComplexity >= 2.5) base += 8;

  // Clamp
  return Math.max(5, Math.min(60, Math.round(base)));
}

function ingredientComplexity(food: FoodWithMetadata): number {
  const name = food.name.toLowerCase();
  if (
    name.includes("protein powder") ||
    name.includes("whey") ||
    name.includes("nuts") ||
    name.includes("almond") ||
    name.includes("walnut") ||
    name.includes("peanut") ||
    name.includes("chia") ||
    name.includes("avocado") ||
    name.includes("banana") ||
    name.includes("berries") ||
    name.includes("yogurt") ||
    name.includes("cottage") ||
    name.includes("cheese") ||
    name.includes("milk") ||
    name.includes("oil") ||
    name.includes("canned") ||
    name.includes("tuna")
  ) {
    return 1;
  }
  if (
    name.includes("egg") ||
    name.includes("chicken breast") ||
    name.includes("tilapia") ||
    name.includes("cod") ||
    name.includes("rice") ||
    name.includes("potato") ||
    name.includes("pasta") ||
    name.includes("bread")
  ) {
    return 2;
  }
  return 3;
}
