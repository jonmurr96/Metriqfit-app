// Per-meal kcal / macro shares by (meals_per_day x training-or-rest day x
// has-workout-window). The output is a normalized ratio table that Layer 1
// applies to the day-type macro totals.
//
// Sources:
//   - Aragon, Schoenfeld (2013). "Nutrient timing revisited: is there a
//     post-exercise anabolic window?" J Int Soc Sports Nutr.
//     https://pubmed.ncbi.nlm.nih.gov/23360586/
//     Conclusion: the "anabolic window" is wider than once thought (~hours);
//     peri-workout protein matters more than carb spikes for most lifters.
//   - Schoenfeld, Aragon, Krieger (2013). "The effect of protein timing on
//     muscle strength and hypertrophy: a meta-analysis." J Int Soc Sports Nutr.
//   - Kerksick et al. (2017). "ISSN Position Stand: Nutrient timing."
//     J Int Soc Sports Nutr. https://pubmed.ncbi.nlm.nih.gov/28919842/
//     Recommends carb support around training, especially for trained lifters
//     on multi-session days.
//   - Helms et al. The Muscle and Strength Pyramid: Nutrition (2nd ed., 2019).
//     Practical meal frequency recommendations: 3-6 meals/day, protein evenly
//     distributed every 3-5h; carbs biased around workout window.
//
// Output shares MUST sum to ~1.0 per row group (per meals_per_day, per
// is_training_day, per has_workout_window). We assert this in tests.
//
// `carb_density` and `fat_density` are advisory for Layer 2 food selection,
// not arithmetic. high = pasta/rice/oats-style starches, low = fibrous veg.

import type {
  Density,
  ScienceCitation,
  ScienceTable,
  SciMealSlot,
} from "./types.ts";

export const SLOT_RATIOS_VERSION = 1 as const;

export interface SlotRatioRow {
  readonly meals_per_day: number;
  readonly is_training_day: boolean;
  readonly has_workout_window: boolean;
  readonly slot: SciMealSlot;
  readonly slot_index: number; // 0-indexed within the day
  readonly kcal_share: number;
  readonly protein_share: number;
  readonly carb_share: number;
  readonly fat_share: number;
  readonly carb_density: Density;
  readonly fat_density: Density;
  readonly citation: ScienceCitation;
}

const CITE_ARAGON_2013: ScienceCitation = {
  source:
    "Aragon, Schoenfeld (2013). Nutrient timing revisited. J Int Soc Sports Nutr.",
  url: "https://pubmed.ncbi.nlm.nih.gov/23360586/",
  confidence: "high",
  year: 2013,
};

const CITE_KERKSICK_2017: ScienceCitation = {
  source:
    "Kerksick et al. (2017). ISSN Position Stand: Nutrient timing. J Int Soc Sports Nutr.",
  url: "https://pubmed.ncbi.nlm.nih.gov/28919842/",
  confidence: "high",
  year: 2017,
};

const CITE_HELMS_NUTRITION: ScienceCitation = {
  source: "Helms et al. The Muscle and Strength Pyramid: Nutrition (2nd ed., 2019).",
  confidence: "high",
  year: 2019,
};

// ----- Slot templates -----
//
// Each template lists slots in chronological order with shares. Training-day
// templates with a workout window bias carbs to peri-workout slots.

interface SlotTemplateEntry {
  readonly slot: SciMealSlot;
  readonly kcal: number;
  readonly protein: number;
  readonly carb: number;
  readonly fat: number;
  readonly carb_density: Density;
  readonly fat_density: Density;
}

interface SlotTemplate {
  readonly meals_per_day: number;
  readonly is_training_day: boolean;
  readonly has_workout_window: boolean;
  readonly entries: ReadonlyArray<SlotTemplateEntry>;
  readonly citation: ScienceCitation;
}

// 3 meals: same shares whether training or not (no snack, no peri-workout slot).
const T3_FLAT: SlotTemplate = {
  meals_per_day: 3,
  is_training_day: false,
  has_workout_window: false,
  entries: [
    {
      slot: "breakfast",
      kcal: 0.30,
      protein: 0.30,
      carb: 0.30,
      fat: 0.30,
      carb_density: "medium",
      fat_density: "medium",
    },
    {
      slot: "lunch",
      kcal: 0.40,
      protein: 0.35,
      carb: 0.40,
      fat: 0.35,
      carb_density: "high",
      fat_density: "medium",
    },
    {
      slot: "dinner",
      kcal: 0.30,
      protein: 0.35,
      carb: 0.30,
      fat: 0.35,
      carb_density: "medium",
      fat_density: "medium",
    },
  ],
  citation: CITE_HELMS_NUTRITION,
};

const T3_TRAINING: SlotTemplate = {
  ...T3_FLAT,
  is_training_day: true,
  has_workout_window: true,
  entries: [
    {
      slot: "breakfast",
      kcal: 0.25,
      protein: 0.30,
      carb: 0.20,
      fat: 0.30,
      carb_density: "medium",
      fat_density: "medium",
    },
    {
      slot: "lunch",
      kcal: 0.45,
      protein: 0.35,
      carb: 0.50,
      fat: 0.35,
      carb_density: "high",
      fat_density: "medium",
    },
    {
      slot: "dinner",
      kcal: 0.30,
      protein: 0.35,
      carb: 0.30,
      fat: 0.35,
      carb_density: "medium",
      fat_density: "medium",
    },
  ],
  citation: CITE_KERKSICK_2017,
};

// 4 meals rest day: 25/30/15/30
const T4_REST: SlotTemplate = {
  meals_per_day: 4,
  is_training_day: false,
  has_workout_window: false,
  entries: [
    {
      slot: "breakfast",
      kcal: 0.25,
      protein: 0.25,
      carb: 0.25,
      fat: 0.25,
      carb_density: "medium",
      fat_density: "medium",
    },
    {
      slot: "lunch",
      kcal: 0.30,
      protein: 0.30,
      carb: 0.30,
      fat: 0.30,
      carb_density: "high",
      fat_density: "medium",
    },
    {
      slot: "afternoon_snack",
      kcal: 0.15,
      protein: 0.15,
      carb: 0.15,
      fat: 0.15,
      carb_density: "low",
      fat_density: "medium",
    },
    {
      slot: "dinner",
      kcal: 0.30,
      protein: 0.30,
      carb: 0.30,
      fat: 0.30,
      carb_density: "medium",
      fat_density: "medium",
    },
  ],
  citation: CITE_HELMS_NUTRITION,
};

// 4 meals training day with workout window: 20/25/30/25 — bigger lunch and
// postworkout window.
const T4_TRAINING: SlotTemplate = {
  meals_per_day: 4,
  is_training_day: true,
  has_workout_window: true,
  entries: [
    {
      slot: "breakfast",
      kcal: 0.20,
      protein: 0.25,
      carb: 0.15,
      fat: 0.25,
      carb_density: "medium",
      fat_density: "medium",
    },
    {
      slot: "lunch",
      kcal: 0.25,
      protein: 0.25,
      carb: 0.25,
      fat: 0.25,
      carb_density: "high",
      fat_density: "low",
    },
    {
      slot: "postworkout",
      kcal: 0.30,
      protein: 0.30,
      carb: 0.40,
      fat: 0.20,
      carb_density: "high",
      fat_density: "low",
    },
    {
      slot: "dinner",
      kcal: 0.25,
      protein: 0.20,
      carb: 0.20,
      fat: 0.30,
      carb_density: "medium",
      fat_density: "medium",
    },
  ],
  citation: CITE_KERKSICK_2017,
};

// 5 meals rest day: breakfast/morning_snack/lunch/afternoon_snack/dinner.
// 25/10/30/10/25 — snacks small, anchored at meal-skeleton.
const T5_REST: SlotTemplate = {
  meals_per_day: 5,
  is_training_day: false,
  has_workout_window: false,
  entries: [
    {
      slot: "breakfast",
      kcal: 0.25,
      protein: 0.25,
      carb: 0.25,
      fat: 0.25,
      carb_density: "medium",
      fat_density: "medium",
    },
    {
      slot: "morning_snack",
      kcal: 0.10,
      protein: 0.10,
      carb: 0.10,
      fat: 0.10,
      carb_density: "low",
      fat_density: "medium",
    },
    {
      slot: "lunch",
      kcal: 0.30,
      protein: 0.30,
      carb: 0.30,
      fat: 0.30,
      carb_density: "high",
      fat_density: "medium",
    },
    {
      slot: "afternoon_snack",
      kcal: 0.10,
      protein: 0.10,
      carb: 0.10,
      fat: 0.10,
      carb_density: "low",
      fat_density: "medium",
    },
    {
      slot: "dinner",
      kcal: 0.25,
      protein: 0.25,
      carb: 0.25,
      fat: 0.25,
      carb_density: "medium",
      fat_density: "medium",
    },
  ],
  citation: CITE_HELMS_NUTRITION,
};

// 5 meals training day (workout in mid-afternoon): breakfast / lunch /
// preworkout / postworkout / dinner. Bias carbs to peri-workout slots.
// 22/27/10/16/25 — sums to 1.00
const T5_TRAINING: SlotTemplate = {
  meals_per_day: 5,
  is_training_day: true,
  has_workout_window: true,
  entries: [
    {
      slot: "breakfast",
      kcal: 0.22,
      protein: 0.25,
      carb: 0.18,
      fat: 0.28,
      carb_density: "medium",
      fat_density: "medium",
    },
    {
      slot: "lunch",
      kcal: 0.27,
      protein: 0.27,
      carb: 0.25,
      fat: 0.30,
      carb_density: "high",
      fat_density: "low",
    },
    {
      slot: "preworkout",
      kcal: 0.10,
      protein: 0.08,
      carb: 0.15,
      fat: 0.04,
      carb_density: "high",
      fat_density: "low",
    },
    {
      slot: "postworkout",
      kcal: 0.16,
      protein: 0.20,
      carb: 0.22,
      fat: 0.08,
      carb_density: "high",
      fat_density: "low",
    },
    {
      slot: "dinner",
      kcal: 0.25,
      protein: 0.20,
      carb: 0.20,
      fat: 0.30,
      carb_density: "medium",
      fat_density: "medium",
    },
  ],
  citation: CITE_KERKSICK_2017,
};

// 6 meals rest day: breakfast/morning_snack/lunch/afternoon_snack/dinner/
// evening_snack. 22/8/25/10/25/10.
const T6_REST: SlotTemplate = {
  meals_per_day: 6,
  is_training_day: false,
  has_workout_window: false,
  entries: [
    {
      slot: "breakfast",
      kcal: 0.22,
      protein: 0.22,
      carb: 0.22,
      fat: 0.22,
      carb_density: "medium",
      fat_density: "medium",
    },
    {
      slot: "morning_snack",
      kcal: 0.08,
      protein: 0.10,
      carb: 0.08,
      fat: 0.08,
      carb_density: "low",
      fat_density: "medium",
    },
    {
      slot: "lunch",
      kcal: 0.25,
      protein: 0.25,
      carb: 0.25,
      fat: 0.25,
      carb_density: "high",
      fat_density: "medium",
    },
    {
      slot: "afternoon_snack",
      kcal: 0.10,
      protein: 0.10,
      carb: 0.10,
      fat: 0.10,
      carb_density: "low",
      fat_density: "medium",
    },
    {
      slot: "dinner",
      kcal: 0.25,
      protein: 0.23,
      carb: 0.25,
      fat: 0.25,
      carb_density: "medium",
      fat_density: "medium",
    },
    {
      slot: "evening_snack",
      kcal: 0.10,
      protein: 0.10,
      carb: 0.10,
      fat: 0.10,
      carb_density: "low",
      fat_density: "low",
    },
  ],
  citation: CITE_HELMS_NUTRITION,
};

// 6 meals training day: breakfast/morning_snack/lunch/preworkout/postworkout/
// dinner. Carbs concentrated around training. 20/8/20/12/20/20.
const T6_TRAINING: SlotTemplate = {
  meals_per_day: 6,
  is_training_day: true,
  has_workout_window: true,
  entries: [
    {
      slot: "breakfast",
      kcal: 0.20,
      protein: 0.22,
      carb: 0.16,
      fat: 0.25,
      carb_density: "medium",
      fat_density: "medium",
    },
    {
      slot: "morning_snack",
      kcal: 0.08,
      protein: 0.10,
      carb: 0.06,
      fat: 0.10,
      carb_density: "low",
      fat_density: "medium",
    },
    {
      slot: "lunch",
      kcal: 0.20,
      protein: 0.20,
      carb: 0.18,
      fat: 0.25,
      carb_density: "high",
      fat_density: "low",
    },
    {
      slot: "preworkout",
      kcal: 0.12,
      protein: 0.10,
      carb: 0.18,
      fat: 0.05,
      carb_density: "high",
      fat_density: "low",
    },
    {
      slot: "postworkout",
      kcal: 0.20,
      protein: 0.20,
      carb: 0.27,
      fat: 0.10,
      carb_density: "high",
      fat_density: "low",
    },
    {
      slot: "dinner",
      kcal: 0.20,
      protein: 0.18,
      carb: 0.15,
      fat: 0.25,
      carb_density: "medium",
      fat_density: "medium",
    },
  ],
  citation: CITE_KERKSICK_2017,
};

const TEMPLATES: ReadonlyArray<SlotTemplate> = [
  T3_FLAT,
  T3_TRAINING,
  T4_REST,
  T4_TRAINING,
  T5_REST,
  T5_TRAINING,
  T6_REST,
  T6_TRAINING,
];

function flatten(): ReadonlyArray<SlotRatioRow> {
  const out: SlotRatioRow[] = [];
  for (const tpl of TEMPLATES) {
    tpl.entries.forEach((e, i) => {
      out.push({
        meals_per_day: tpl.meals_per_day,
        is_training_day: tpl.is_training_day,
        has_workout_window: tpl.has_workout_window,
        slot: e.slot,
        slot_index: i,
        kcal_share: e.kcal,
        protein_share: e.protein,
        carb_share: e.carb,
        fat_share: e.fat,
        carb_density: e.carb_density,
        fat_density: e.fat_density,
        citation: tpl.citation,
      });
    });
  }
  return out;
}

export const SLOT_RATIOS: ScienceTable<SlotRatioRow> = {
  version: SLOT_RATIOS_VERSION,
  name: "slot_ratios",
  rows: flatten(),
};

export interface SlotLookupResult {
  readonly meals_per_day: number;
  readonly is_training_day: boolean;
  readonly has_workout_window: boolean;
  readonly slots: ReadonlyArray<SlotRatioRow>;
}

export function lookup(
  meals_per_day: number,
  is_training_day: boolean,
  has_workout_window: boolean,
): SlotLookupResult {
  // For day-type training but no workout window (e.g. cardio-only): fall back
  // to the rest-day template at the same meal count.
  let rows = SLOT_RATIOS.rows.filter((r) =>
    r.meals_per_day === meals_per_day &&
    r.is_training_day === is_training_day &&
    r.has_workout_window === has_workout_window
  );
  if (rows.length === 0 && is_training_day && !has_workout_window) {
    rows = SLOT_RATIOS.rows.filter((r) =>
      r.meals_per_day === meals_per_day &&
      r.is_training_day === false &&
      r.has_workout_window === false
    );
  }
  if (rows.length === 0) {
    throw new Error(
      `slot_ratios: no template for meals=${meals_per_day} training=${is_training_day} window=${has_workout_window}`,
    );
  }
  return {
    meals_per_day,
    is_training_day,
    has_workout_window,
    slots: [...rows].sort((a, b) => a.slot_index - b.slot_index),
  };
}

export const _TEMPLATES = TEMPLATES;
