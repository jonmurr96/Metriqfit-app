// Protein g/kg/day by (goal x age band x sex).
//
// Sources:
//   - Jager et al. (2017). "ISSN Position Stand: protein and exercise."
//     J Int Soc Sports Nutr.
//     https://pubmed.ncbi.nlm.nih.gov/28642676/
//     "An overall daily protein intake of 1.4 to 2.0 g/kg/d for physically
//     active individuals is sufficient." Higher intakes (>2.0) recommended in
//     energy deficit to preserve LBM.
//   - Helms, Aragon, Fitschen (2014). "Evidence-based recommendations for
//     natural bodybuilding contest preparation."
//     Recommend 2.3-3.1 g/kg of LBM in deficit; ~1.8-2.7 g/kg BW depending on
//     leanness. We pick conservative midpoints by total body weight here.
//   - Phillips, Chevalier, Leidy (2016). "Protein 'requirements' beyond the
//     RDA: implications for optimizing health." Appl Physiol Nutr Metab.
//     Older adults: 1.0-1.2+ g/kg minimum, with 1.6-2.0 g/kg suggested for
//     active older adults to combat sarcopenia.
//   - Bauer et al. (2013). "Evidence-based recommendations for optimal dietary
//     protein intake in older people: a position paper from the PROT-AGE Study
//     Group." JAMDA.
//
// Output is g protein per kg body weight per day. Layer 1 multiplies by user
// weight_kg.

import type {
  AgeBand,
  Goal,
  ScienceCitation,
  ScienceTable,
  Sex,
} from "./types.ts";
import { ALL_AGE_BANDS, ALL_GOALS, ALL_SEX, ageToBand } from "./types.ts";

export const PROTEIN_TARGETS_VERSION = 1 as const;

export interface ProteinRow {
  readonly goal: Goal;
  readonly age_band: AgeBand;
  readonly sex: Sex;
  readonly g_per_kg_min: number;
  readonly g_per_kg_target: number;
  readonly g_per_kg_max: number;
  readonly citation: ScienceCitation;
}

const CITE_ISSN_2017: ScienceCitation = {
  source:
    "Jager et al. (2017). ISSN Position Stand: Protein and Exercise. J Int Soc Sports Nutr.",
  url: "https://pubmed.ncbi.nlm.nih.gov/28642676/",
  confidence: "high",
  year: 2017,
};

const CITE_HELMS_2014: ScienceCitation = {
  source:
    "Helms, Aragon, Fitschen (2014). Evidence-based recommendations for natural bodybuilding contest preparation.",
  url: "https://pubmed.ncbi.nlm.nih.gov/24864135/",
  confidence: "high",
  year: 2014,
};

const CITE_PHILLIPS_2016: ScienceCitation = {
  source:
    "Phillips, Chevalier, Leidy (2016). Protein requirements beyond the RDA. Appl Physiol Nutr Metab.",
  url: "https://pubmed.ncbi.nlm.nih.gov/26960445/",
  confidence: "high",
  year: 2016,
};

const CITE_BAUER_2013: ScienceCitation = {
  source:
    "Bauer et al. (2013). Evidence-based recommendations for optimal dietary protein intake in older people (PROT-AGE). JAMDA.",
  url: "https://pubmed.ncbi.nlm.nih.gov/23867520/",
  confidence: "high",
  year: 2013,
};

// Per-goal base ranges in g/kg/day (under_40 male anchor).
interface GoalBase {
  readonly min: number;
  readonly target: number;
  readonly max: number;
  readonly citation: ScienceCitation;
}

const GOAL_BASE: Record<Goal, GoalBase> = {
  lose_weight: {
    min: 2.0,
    target: 2.3,
    max: 2.6,
    citation: CITE_HELMS_2014,
  },
  gain_muscle: {
    min: 1.6,
    target: 1.8,
    max: 2.2,
    citation: CITE_ISSN_2017,
  },
  maintain: {
    min: 1.6,
    target: 1.8,
    max: 2.0,
    citation: CITE_ISSN_2017,
  },
  recomp: {
    min: 1.8,
    target: 2.1,
    max: 2.4,
    citation: CITE_HELMS_2014,
  },
  performance: {
    min: 1.4,
    target: 1.7,
    max: 2.0,
    citation: CITE_ISSN_2017,
  },
};

// Age adjustment: older adults get higher per-kg target to combat anabolic
// resistance / sarcopenia. We bump min and target; max stays bounded.
function ageAdjust(
  base: GoalBase,
  age_band: AgeBand,
): Omit<GoalBase, "citation"> & { citation: ScienceCitation } {
  if (age_band === "under_40") return { ...base };
  const bump = age_band === "40_to_59" ? 0.1 : 0.2;
  return {
    min: Math.round((base.min + bump) * 100) / 100,
    target: Math.round((base.target + bump) * 100) / 100,
    max: Math.max(base.max, base.max + bump),
    // Cite Phillips/Bauer when age is the dominant adjustment.
    citation: age_band === "60_plus" ? CITE_BAUER_2013 : CITE_PHILLIPS_2016,
  };
}

// Sex adjustment: minor. Females generally tolerate similar g/kg; no override.
function sexAdjust(
  v: { min: number; target: number; max: number; citation: ScienceCitation },
  _sex: Sex,
) {
  return v;
}

const ROWS: ProteinRow[] = [];
for (const goal of ALL_GOALS) {
  for (const age_band of ALL_AGE_BANDS) {
    for (const sex of ALL_SEX) {
      const adj = sexAdjust(ageAdjust(GOAL_BASE[goal], age_band), sex);
      ROWS.push({
        goal,
        age_band,
        sex,
        g_per_kg_min: adj.min,
        g_per_kg_target: adj.target,
        g_per_kg_max: adj.max,
        citation: adj.citation,
      });
    }
  }
}

export const PROTEIN_TARGETS: ScienceTable<ProteinRow> = {
  version: PROTEIN_TARGETS_VERSION,
  name: "protein_targets",
  rows: ROWS,
};

export function lookup(goal: Goal, age_years: number, sex: Sex): ProteinRow {
  const age_band = ageToBand(age_years);
  const row = PROTEIN_TARGETS.rows.find((r) =>
    r.goal === goal && r.age_band === age_band && r.sex === sex
  );
  if (!row) {
    throw new Error(`protein_targets: no row for ${goal}/${age_band}/${sex}`);
  }
  return row;
}
