export type ProduceSlot =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "pre-workout"
  | "post-workout"
  | "evening";

export type ProduceGoal = "muscle_gain" | "fat_loss" | "maintenance";

export type ProduceKind = "fruit" | "vegetable" | "either";

export interface ProduceDecisionInput {
  slot: ProduceSlot;
  goal: ProduceGoal;
  baseFiberG: number;
  baseCalories: number;
  isTrainingDay?: boolean;
  workoutContext?: "pre" | "post" | null;
}

export interface ProduceDecision {
  include: boolean;
  kind: ProduceKind;
  preferredKinds: ProduceKind[];
  grams: number;
  rationale: string;
  fiberTargetG: number;
  fiberGapG: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function targetFiberForSlot(slot: ProduceSlot, goal: ProduceGoal): number {
  const baseTargets: Record<ProduceSlot, number> = {
    breakfast: 5.5,
    lunch: 7,
    dinner: 7,
    snack: 4.5,
    "pre-workout": 1.5,
    "post-workout": 4.5,
    evening: 4,
  };

  let target = baseTargets[slot];
  if (goal === "fat_loss") target += 1.25;
  if (goal === "muscle_gain") target -= 0.5;

  if (slot === "pre-workout") target = Math.max(0.5, target - 1.25);
  if (slot === "post-workout") target += 0.5;

  return clamp(target, 1, 10);
}

function preferredKindsForSlot(slot: ProduceSlot): ProduceKind[] {
  switch (slot) {
    case "breakfast":
    case "post-workout":
      return ["fruit", "vegetable"];
    case "lunch":
    case "dinner":
      return ["vegetable", "fruit"];
    case "pre-workout":
      return ["fruit", "vegetable"];
    case "snack":
    case "evening":
    default:
      return ["fruit", "vegetable"];
  }
}

function determineServingGrams(
  slot: ProduceSlot,
  goal: ProduceGoal,
  fiberGapG: number,
  kind: ProduceKind,
  baseCalories: number,
): number {
  const isVegetable = kind === "vegetable";
  let grams = isVegetable ? 100 : 130;

  if (slot === "pre-workout") grams = 85;
  if (slot === "snack" || slot === "evening") grams = 110;
  if (slot === "post-workout") grams = 125;

  if (fiberGapG > 4) grams += isVegetable ? 15 : 20;
  if (fiberGapG < 2) grams -= 10;

  if (goal === "fat_loss") grams += 10;
  if (goal === "muscle_gain") grams -= 10;

  if (baseCalories >= 700) grams -= 10;
  if (baseCalories <= 400) grams += 10;

  if (slot === "pre-workout") {
    grams = clamp(grams, 60, 110);
  } else if (isVegetable) {
    grams = clamp(grams, 80, 160);
  } else {
    grams = clamp(grams, 100, 170);
  }

  return Math.round(grams);
}

export function determineProduceDecision(input: ProduceDecisionInput): ProduceDecision {
  const fiberTargetG = targetFiberForSlot(input.slot, input.goal);
  const fiberGapG = fiberTargetG - input.baseFiberG;
  // Lunch and dinner must serve vegetables, not fruit — override preferredKinds.
  const preferredKinds: ProduceKind[] =
    input.slot === "lunch" || input.slot === "dinner"
      ? ["vegetable", "fruit"]
      : preferredKindsForSlot(input.slot);
  const preferredKind = preferredKinds[0];

  // Lunch and dinner always include a vegetable — mandatory for micronutrient coverage.
  const isMandatoryVeggieSlot: boolean = input.slot === "lunch" || input.slot === "dinner";

  const includeThreshold =
    input.slot === "pre-workout"
      ? 3.5
      : input.slot === "snack" || input.slot === "evening"
        ? 1.75
        : 1.1;

  const include = isMandatoryVeggieSlot || fiberGapG > includeThreshold;
  if (!include) {
    return {
      include: false,
      kind: preferredKind,
      preferredKinds,
      grams: 0,
      rationale: "Base meal already covers the fiber and produce need for this slot.",
      fiberTargetG,
      fiberGapG,
    };
  }

  const grams = determineServingGrams(
    input.slot,
    input.goal,
    fiberGapG,
    preferredKind,
    input.baseCalories,
  );

  const rationale =
    preferredKind === "fruit"
      ? "Added fruit to round out this meal with fiber and micronutrients."
      : "Added vegetables to round out this meal with fiber and micronutrients.";

  return {
    include: true,
    kind: preferredKind,
    preferredKinds,
    grams,
    rationale,
    fiberTargetG,
    fiberGapG,
  };
}
