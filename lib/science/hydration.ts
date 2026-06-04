// Hydration base + training adjustment.
//
// Sources:
//   - Sawka et al. (2007). "ACSM Position Stand: Exercise and Fluid
//     Replacement." Med Sci Sports Exerc. 39(2):377-390.
//     https://pubmed.ncbi.nlm.nih.gov/17277604/
//     Practical recommendation for exercising adults: replace fluid losses;
//     general guidance includes ~5-7 ml/kg 4h pre-exercise and during-exercise
//     replacement matched to sweat losses. Common practical conversion used
//     here: ~30-40 ml/kg/day baseline + ~8-12 ml/min of training.
//   - EFSA Panel (2010). "Scientific Opinion on Dietary Reference Values for
//     water." Adequate intake ~2.0 L/day (women) / ~2.5 L/day (men) from
//     food + fluids, equivalent to ~30-35 ml/kg in adults of typical weight.
//     https://www.efsa.europa.eu/en/efsajournal/pub/1459
//   - Institute of Medicine (2005). "Dietary Reference Intakes for Water,
//     Potassium, Sodium, Chloride, and Sulfate."
//
// Output:
//   total_ml = ml_per_kg_base * weight_kg + ml_per_training_minute * minutes

import type {
  ActivityLevel,
  ScienceCitation,
  ScienceTable,
} from "./types.ts";

export const HYDRATION_VERSION = 1 as const;

export interface HydrationRow {
  readonly activity_level: ActivityLevel;
  readonly ml_per_kg_base: number;
  readonly ml_per_training_minute: number;
  readonly citation: ScienceCitation;
}

const CITE_ACSM_2007: ScienceCitation = {
  source:
    "Sawka et al. (2007). ACSM Position Stand: Exercise and Fluid Replacement. Med Sci Sports Exerc.",
  url: "https://pubmed.ncbi.nlm.nih.gov/17277604/",
  confidence: "high",
  year: 2007,
};

const CITE_EFSA_2010: ScienceCitation = {
  source:
    "EFSA Panel (2010). Scientific Opinion on Dietary Reference Values for water. EFSA Journal.",
  url: "https://www.efsa.europa.eu/en/efsajournal/pub/1459",
  confidence: "high",
  year: 2010,
};

const CITE_IOM_2005: ScienceCitation = {
  source:
    "Institute of Medicine (2005). Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate.",
  confidence: "high",
  year: 2005,
};

const ROWS: ReadonlyArray<HydrationRow> = [
  {
    activity_level: "sedentary",
    ml_per_kg_base: 30,
    ml_per_training_minute: 10,
    citation: CITE_EFSA_2010,
  },
  {
    activity_level: "active",
    ml_per_kg_base: 35,
    ml_per_training_minute: 10,
    citation: CITE_IOM_2005,
  },
  {
    activity_level: "very_active",
    ml_per_kg_base: 40,
    ml_per_training_minute: 10,
    citation: CITE_ACSM_2007,
  },
];

export const HYDRATION: ScienceTable<HydrationRow> = {
  version: HYDRATION_VERSION,
  name: "hydration",
  rows: ROWS,
};

export function lookup(activity_level: ActivityLevel): HydrationRow {
  const row = HYDRATION.rows.find((r) => r.activity_level === activity_level);
  if (!row) {
    throw new Error(`hydration: no row for ${activity_level}`);
  }
  return row;
}

export function compute(
  activity_level: ActivityLevel,
  weight_kg: number,
  training_minutes_per_day: number,
): number {
  const row = lookup(activity_level);
  return Math.round(
    row.ml_per_kg_base * weight_kg +
      row.ml_per_training_minute * training_minutes_per_day,
  );
}
