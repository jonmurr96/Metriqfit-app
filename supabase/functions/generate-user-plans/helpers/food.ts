// Food selection / scoring / filtering helpers extracted from index.ts
// during Phase 0.5 monolith split (zero behavior change).
//
// Pure / I/O-free. Types are re-imported from index.ts (temporary partial
// cycle is intentional and will be resolved in Phase 1).

import type {
  FoodCandidate,
  FoodRecord,
  FoodRecordLookup,
  FoodRecordLookupEntry,
  VarietyProfile,
} from "../index.ts";
import { expandRestrictionTokens, normalizeToken } from "./scalars.ts";

const GENERATED_FOOD_NAME_ALIASES: Record<string, string[]> = {
  "pea protein": ["plant protein powder pea"],
  "cottage cheese": ["cottage cheese low fat", "cottage cheese full fat"],
  "chicken breast": ["chicken breast skinless cooked", "rotisserie chicken breast"],
  "rice cakes": ["rice cakes plain"],
  almonds: ["almonds raw"],
  "whole eggs": ["eggs whole cooked"],
  tuna: ["tuna canned in water"],
  walnuts: ["walnuts raw"],
  "olive oil": ["olive oil extra virgin"],
  "rolled oats": ["instant oats dry", "oatmeal cooked", "oats"],
  banana: ["banana"],
};

export function normalizeGeneratedFoodLookupName(value: string | null | undefined) {
  return normalizeToken(value || "");
}

export function tokenizeGeneratedFoodLookupName(value: string | null | undefined) {
  return normalizeGeneratedFoodLookupName(value)
    .split(" ")
    .filter(Boolean);
}

export function buildFoodRecordLookup(foods: FoodRecord[]): FoodRecordLookup {
  const exact = new Map<string, FoodRecordLookupEntry>();
  const all: FoodRecordLookupEntry[] = [];

  for (const food of foods) {
    const normalizedName = normalizeGeneratedFoodLookupName(food.name);
    if (!normalizedName) continue;

    const entry: FoodRecordLookupEntry = {
      ...food,
      normalizedName,
      tokens: tokenizeGeneratedFoodLookupName(food.name),
    };

    all.push(entry);

    const current = exact.get(normalizedName);
    if (!current) {
      exact.set(normalizedName, entry);
    }
  }

  return { exact, all };
}

export function scoreFoodRecordLookupEntry(entry: FoodRecordLookupEntry, searchTokens: string[]) {
  const matchedTokens = searchTokens.filter((token) => entry.tokens.includes(token)).length;
  const coverage = searchTokens.length ? matchedTokens / searchTokens.length : 0;
  const exactBoost = entry.normalizedName === searchTokens.join(" ") ? 4 : 0;
  const prefixBoost = entry.normalizedName.startsWith(searchTokens.join(" ")) ? 2 : 0;

  return (coverage * 100) + prefixBoost + exactBoost;
}

export function findBestFoodRecordMatch(name: string, lookup: FoodRecordLookup): FoodRecord | null {
  const normalizedName = normalizeGeneratedFoodLookupName(name);
  if (!normalizedName) return null;

  const exact = lookup.exact.get(normalizedName);
  if (exact) return exact;

  const searchPhrases = [normalizedName, ...(GENERATED_FOOD_NAME_ALIASES[normalizedName] || [])];
  const phraseMatches = lookup.all.filter((entry) =>
    searchPhrases.some((phrase) => {
      const phraseTokens = tokenizeGeneratedFoodLookupName(phrase);
      return phraseTokens.length > 0 && phraseTokens.every((token) => entry.tokens.includes(token));
    }),
  );

  if (phraseMatches.length) {
    return phraseMatches.sort((left, right) => {
      const leftScore = scoreFoodRecordLookupEntry(left, tokenizeGeneratedFoodLookupName(searchPhrases[0]));
      const rightScore = scoreFoodRecordLookupEntry(right, tokenizeGeneratedFoodLookupName(searchPhrases[0]));
      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.name.length - right.name.length;
    })[0];
  }

  const queryTokens = tokenizeGeneratedFoodLookupName(name);
  const fuzzyMatches = lookup.all
    .filter((entry) => queryTokens.length > 0 && queryTokens.every((token) => entry.tokens.includes(token)))
    .sort((left, right) => {
      const leftScore = scoreFoodRecordLookupEntry(left, queryTokens);
      const rightScore = scoreFoodRecordLookupEntry(right, queryTokens);
      if (rightScore !== leftScore) return rightScore - leftScore;
      return left.name.length - right.name.length;
    });

  return fuzzyMatches[0] || null;
}

export function deterministicPick<T>(items: T[], seed: number): T | null {
  if (!items.length) return null;
  return items[Math.abs(seed) % items.length];
}

export function macroFromFood(food: FoodCandidate, grams: number) {
  return {
    calories: (food.calories100 * grams) / 100,
    protein: (food.protein100 * grams) / 100,
    carbs: (food.carbs100 * grams) / 100,
    fat: (food.fat100 * grams) / 100,
    fiber: (food.fiber100 * grams) / 100,
  };
}

export function scoreFoodForMacro(food: FoodCandidate, required: "protein" | "carb" | "fat") {
  if (required === "protein") return food.protein100 - food.carbs100 * 0.4 - food.fat100 * 0.8;
  if (required === "carb") return food.carbs100 - food.fat100 * 2 - food.protein100 * 0.5;
  return food.fat100 - food.carbs100 * 0.7 - food.protein100 * 0.4;
}

export function foodMatchesProteinPreference(food: FoodCandidate, preferredProteins: string[]): boolean {
  if (!preferredProteins || !preferredProteins.length) return false;
  if (!food || !food.name) return false;
  const name = food.name.toLowerCase();
  const tags = (food.tags || []).map((t) => t.toLowerCase());

  for (const pref of preferredProteins) {
    if (!pref) continue;
    const p = pref.toLowerCase();
    if (name.includes(p)) return true;
    if (p === "chicken" && (name.includes("chicken") || tags.includes("poultry"))) return true;
    if (p === "turkey" && name.includes("turkey")) return true;
    if (p === "beef" && (name.includes("beef") || name.includes("steak") || name.includes("ground"))) return true;
    if (p === "pork" && (name.includes("pork") || name.includes("bacon") || name.includes("ham"))) return true;
    if (p === "fish" && (name.includes("fish") || name.includes("salmon") || name.includes("tuna") || name.includes("cod"))) return true;
    if (p === "shellfish" && (name.includes("shrimp") || name.includes("prawn") || name.includes("crab") || name.includes("lobster"))) return true;
    if (p === "eggs" && (name.includes("egg") || tags.includes("eggs"))) return true;
    if (p === "dairy" && (name.includes("cheese") || name.includes("yogurt") || name.includes("milk") || tags.includes("dairy"))) return true;
    if (p === "tofu_tempeh" && (name.includes("tofu") || name.includes("tempeh"))) return true;
    if (p === "legumes" && (name.includes("beans") || name.includes("lentil") || name.includes("chickpea"))) return true;
    if (p === "protein_powder" && (name.includes("whey") || name.includes("protein") || name.includes("shake"))) return true;
  }
  return false;
}

export function buildMacroRotationPool(
  foods: FoodCandidate[],
  macro: "protein" | "carb" | "fat",
  varietyProfile: VarietyProfile,
  preferredProteins?: string[],
) {
  const poolSize = varietyProfile === "high" ? 6 : varietyProfile === "minimal" ? 3 : 5;
  const tagged = foods.filter((food) => food.tags.includes(macro));
  if (!tagged.length) return foods.slice(0, Math.max(1, Math.min(poolSize, foods.length)));

  return tagged
    .map((food) => {
      let score = scoreFoodForMacro(food, macro);
      if (macro === "protein" && preferredProteins?.length && foodMatchesProteinPreference(food, preferredProteins)) {
        score *= 3.0;
      }
      return { food, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(poolSize, tagged.length)))
    .map((entry) => entry.food);
}

export function pickFromRotationPool(
  pool: FoodCandidate[],
  seed: number,
  avoidKeys: string[] = [],
) {
  if (!pool.length) return null;
  const blocked = new Set(avoidKeys);
  const ordered = pool.slice();
  const baseIndex = Math.abs(seed) % ordered.length;

  for (let i = 0; i < ordered.length; i += 1) {
    const candidate = ordered[(baseIndex + i) % ordered.length];
    if (!blocked.has(candidate.key)) return candidate;
  }
  return ordered[baseIndex];
}

export function getFoodByTag(
  foods: FoodCandidate[],
  required: string,
  excludes: string[],
  daySeed: number,
): FoodCandidate {
  const loweredExcludes = excludes.map((entry) => normalizeToken(entry));
  const filtered = foods.filter((food) => {
    if (!food.tags.includes(required)) return false;
    const name = normalizeToken(food.name);
    if (loweredExcludes.some((entry) => entry && name.includes(entry))) return false;
    return true;
  });
  return deterministicPick(filtered, daySeed) || foods.find((food) => food.tags.includes(required)) || foods[0];
}

export function pickFoodForMacro(
  foods: FoodCandidate[],
  required: "protein" | "carb" | "fat",
  daySeed: number,
) {
  const pool = buildMacroRotationPool(foods, required, "moderate_rotation_4_5");
  return pickFromRotationPool(pool, daySeed) || foods[0];
}

export function foodMatchesRestriction(food: FoodCandidate, expandedTerms: string[]) {
  if (!expandedTerms.length) return false;
  const name = normalizeToken(food.name);
  const tagString = food.tags.join(" ");

  return expandedTerms.some((term) => {
    if (!term) return false;
    return name.includes(term) || tagString.includes(term);
  });
}

export function applyDietaryFilters(foods: FoodCandidate[], dietaryPref: string, refusedFoods: string[], allergies: string[]) {
  const blockedTerms = expandRestrictionTokens([...refusedFoods, ...allergies]);

  return foods.filter((food) => {
    const name = normalizeToken(food.name);
    if (foodMatchesRestriction(food, blockedTerms)) return false;

    if (dietaryPref === "vegan") {
      return food.tags.includes("vegan");
    }
    if (dietaryPref === "vegetarian") {
      return food.tags.includes("vegetarian") || food.tags.includes("vegan");
    }
    if (dietaryPref === "pescatarian") {
      if (name.includes("chicken") || name.includes("turkey") || name.includes("beef") || name.includes("pork")) return false;
      return true;
    }
    if (dietaryPref === "keto") {
      if (food.tags.includes("carb") && !food.tags.includes("veggie") && !food.tags.includes("fat")) return false;
      return true;
    }
    if (dietaryPref === "paleo") {
      if (name.includes("pasta") || name.includes("yogurt") || name.includes("rice") || name.includes("oats")) return false;
      return true;
    }
    return true;
  });
}

export function inferFoodTags(food: any): string[] {
  const tags = new Set<string>();
  const name = String(food?.name || "").toLowerCase();
  const category = String(food?.category || "").toLowerCase();
  const protein = Number(food?.protein_per_100g || 0);
  const carbs = Number(food?.carbs_per_100g || 0);
  const fat = Number(food?.fat_per_100g || 0);

  if (category.includes("protein")) tags.add("protein");
  if (category.includes("carb") || category.includes("grain") || category.includes("fruit")) tags.add("carb");
  if (category.includes("fat") || category.includes("oil") || category.includes("nut")) tags.add("fat");
  if (category.includes("vegetable")) tags.add("veggie");
  if (category.includes("fruit")) tags.add("fruit");

  if (protein >= 10 && protein >= carbs * 0.45 && protein >= fat * 0.8) tags.add("protein");
  if (carbs >= 15 && carbs >= protein) tags.add("carb");
  if (fat >= 8 && fat >= protein * 0.6) tags.add("fat");

  if (/(chicken|turkey|beef|steak|pork|salmon|tuna|cod|fish|shrimp|egg|yogurt|cottage|whey|protein|tofu|tempeh|beans|lentil|chickpea)/.test(name)) {
    tags.add("protein");
  }
  if (/(rice|oat|potato|pasta|bread|tortilla|quinoa|banana|apple|berry|fruit)/.test(name)) {
    tags.add("carb");
  }
  if (/(oil|avocado|almond|peanut|cashew|walnut|butter|cheese|chia|flax|seed)/.test(name)) {
    tags.add("fat");
  }
  if (/(broccoli|spinach|lettuce|pepper|onion|vegetable|veggie|asparagus|zucchini|carrot)/.test(name)) {
    tags.add("veggie");
  }
  if (/(oat|egg|yogurt|cereal|toast|bagel|banana|berry)/.test(name)) {
    tags.add("breakfast");
  }

  const plantBased = /(tofu|tempeh|beans|lentil|chickpea|rice|oat|potato|pasta|bread|quinoa|fruit|vegetable|broccoli|spinach|avocado|nut|seed)/.test(name);
  if (plantBased) {
    tags.add("vegetarian");
    tags.add("vegan");
  } else if (/(egg|yogurt|milk|cheese)/.test(name)) {
    tags.add("vegetarian");
  }

  if (!tags.size) {
    if (protein >= carbs && protein >= fat) tags.add("protein");
    else if (carbs >= fat) tags.add("carb");
    else tags.add("fat");
  }

  return Array.from(tags);
}
