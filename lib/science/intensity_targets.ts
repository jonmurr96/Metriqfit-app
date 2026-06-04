// Intensity targets: rep ranges, RIR targets, and rest by (goal x lift category).
//
// Sources:
//   - Helms et al. The Muscle and Strength Pyramid: Training (2nd ed., 2019).
//   - Helms, Cronin, Storey, Zourdos (2016). "RIR-based training in resistance
//     training and powerlifting." Strength & Conditioning Journal.
//     https://journals.lww.com/nsca-scj/Fulltext/2016/08000/Application_of_the_Repetitions_in_Reserve_Based.7.aspx
//   - Schoenfeld et al. (2016). "Effects of low- vs. high-load resistance
//     training on muscle strength and hypertrophy in well-trained men."
//   - ACSM (2009 Position Stand). "Progression models in resistance training
//     for healthy adults." Med Sci Sports Exerc.
//   - de Salles et al. (2009). "Rest interval between sets in strength
//     training." Sports Med (rest 2-3min for compound primary work).

import type {
  Goal,
  ScienceCitation,
  ScienceTable,
  SciLiftCategory,
} from "./types.ts";

export const INTENSITY_TARGETS_VERSION = 1 as const;

export interface IntensityRow {
  readonly goal: Goal;
  readonly category: SciLiftCategory;
  readonly rep_min: number;
  readonly rep_max: number;
  readonly rir_min: number;
  readonly rir_max: number;
  readonly rest_sec: number;
  readonly citation: ScienceCitation;
}

const CITE_HELMS_PYRAMID: ScienceCitation = {
  source: "Helms et al. The Muscle and Strength Pyramid: Training (2nd ed., 2019).",
  confidence: "high",
  year: 2019,
};

const CITE_HELMS_RIR_2016: ScienceCitation = {
  source:
    "Helms, Cronin, Storey, Zourdos (2016). Application of the RIR-based RPE scale for resistance training. Strength Cond J.",
  url:
    "https://journals.lww.com/nsca-scj/Fulltext/2016/08000/Application_of_the_Repetitions_in_Reserve_Based.7.aspx",
  confidence: "high",
  year: 2016,
};

const CITE_DESALLES_2009: ScienceCitation = {
  source:
    "de Salles et al. (2009). Rest interval between sets in strength training. Sports Med.",
  url: "https://pubmed.ncbi.nlm.nih.gov/19691365/",
  confidence: "high",
  year: 2009,
};

const CITE_ACSM_2009: ScienceCitation = {
  source:
    "ACSM Position Stand (2009). Progression models in resistance training for healthy adults. Med Sci Sports Exerc.",
  url: "https://pubmed.ncbi.nlm.nih.gov/19204579/",
  confidence: "high",
  year: 2009,
};

// Base hypertrophy template (gain_muscle):
//   primary: 6-10 RIR 1-2 rest 150s
//   secondary: 8-12 RIR 1-2 rest 120s
//   accessory: 8-12 RIR 0-2 rest 90s
//   isolation: 10-15 RIR 0-1 rest 60s
//
// fat-loss (lose_weight): bias to maintaining strength on primaries (heavier),
// keep hypertrophy reps elsewhere.
// maintain: slightly fewer reps with conservative RIR.
// recomp: hypertrophy template.
// performance: heavier primaries, more rest, lower reps; accessories closer to
// hypertrophy template.

const ROWS: ReadonlyArray<IntensityRow> = [
  // ----- lose_weight -----
  {
    goal: "lose_weight",
    category: "primary",
    rep_min: 4,
    rep_max: 6,
    rir_min: 1,
    rir_max: 2,
    rest_sec: 180,
    citation: CITE_HELMS_PYRAMID,
  },
  {
    goal: "lose_weight",
    category: "secondary",
    rep_min: 6,
    rep_max: 10,
    rir_min: 1,
    rir_max: 2,
    rest_sec: 120,
    citation: CITE_HELMS_PYRAMID,
  },
  {
    goal: "lose_weight",
    category: "accessory",
    rep_min: 8,
    rep_max: 12,
    rir_min: 0,
    rir_max: 2,
    rest_sec: 90,
    citation: CITE_HELMS_RIR_2016,
  },
  {
    goal: "lose_weight",
    category: "isolation",
    rep_min: 10,
    rep_max: 15,
    rir_min: 0,
    rir_max: 1,
    rest_sec: 60,
    citation: CITE_HELMS_RIR_2016,
  },

  // ----- gain_muscle -----
  {
    goal: "gain_muscle",
    category: "primary",
    rep_min: 6,
    rep_max: 10,
    rir_min: 1,
    rir_max: 2,
    rest_sec: 150,
    citation: CITE_HELMS_PYRAMID,
  },
  {
    goal: "gain_muscle",
    category: "secondary",
    rep_min: 8,
    rep_max: 12,
    rir_min: 1,
    rir_max: 2,
    rest_sec: 120,
    citation: CITE_HELMS_PYRAMID,
  },
  {
    goal: "gain_muscle",
    category: "accessory",
    rep_min: 8,
    rep_max: 12,
    rir_min: 0,
    rir_max: 2,
    rest_sec: 90,
    citation: CITE_HELMS_RIR_2016,
  },
  {
    goal: "gain_muscle",
    category: "isolation",
    rep_min: 10,
    rep_max: 15,
    rir_min: 0,
    rir_max: 1,
    rest_sec: 60,
    citation: CITE_HELMS_RIR_2016,
  },

  // ----- maintain -----
  {
    goal: "maintain",
    category: "primary",
    rep_min: 5,
    rep_max: 8,
    rir_min: 2,
    rir_max: 3,
    rest_sec: 150,
    citation: CITE_ACSM_2009,
  },
  {
    goal: "maintain",
    category: "secondary",
    rep_min: 6,
    rep_max: 10,
    rir_min: 2,
    rir_max: 3,
    rest_sec: 120,
    citation: CITE_ACSM_2009,
  },
  {
    goal: "maintain",
    category: "accessory",
    rep_min: 8,
    rep_max: 12,
    rir_min: 1,
    rir_max: 3,
    rest_sec: 90,
    citation: CITE_ACSM_2009,
  },
  {
    goal: "maintain",
    category: "isolation",
    rep_min: 10,
    rep_max: 15,
    rir_min: 1,
    rir_max: 2,
    rest_sec: 60,
    citation: CITE_HELMS_RIR_2016,
  },

  // ----- recomp -----
  {
    goal: "recomp",
    category: "primary",
    rep_min: 5,
    rep_max: 8,
    rir_min: 1,
    rir_max: 2,
    rest_sec: 180,
    citation: CITE_HELMS_PYRAMID,
  },
  {
    goal: "recomp",
    category: "secondary",
    rep_min: 8,
    rep_max: 12,
    rir_min: 1,
    rir_max: 2,
    rest_sec: 120,
    citation: CITE_HELMS_PYRAMID,
  },
  {
    goal: "recomp",
    category: "accessory",
    rep_min: 8,
    rep_max: 12,
    rir_min: 0,
    rir_max: 2,
    rest_sec: 90,
    citation: CITE_HELMS_RIR_2016,
  },
  {
    goal: "recomp",
    category: "isolation",
    rep_min: 10,
    rep_max: 15,
    rir_min: 0,
    rir_max: 1,
    rest_sec: 60,
    citation: CITE_HELMS_RIR_2016,
  },

  // ----- performance -----
  {
    goal: "performance",
    category: "primary",
    rep_min: 3,
    rep_max: 5,
    rir_min: 1,
    rir_max: 2,
    rest_sec: 240,
    citation: CITE_DESALLES_2009,
  },
  {
    goal: "performance",
    category: "secondary",
    rep_min: 5,
    rep_max: 8,
    rir_min: 1,
    rir_max: 2,
    rest_sec: 180,
    citation: CITE_DESALLES_2009,
  },
  {
    goal: "performance",
    category: "accessory",
    rep_min: 8,
    rep_max: 12,
    rir_min: 1,
    rir_max: 2,
    rest_sec: 90,
    citation: CITE_HELMS_RIR_2016,
  },
  {
    goal: "performance",
    category: "isolation",
    rep_min: 10,
    rep_max: 15,
    rir_min: 0,
    rir_max: 1,
    rest_sec: 60,
    citation: CITE_HELMS_RIR_2016,
  },
];

export const INTENSITY_TARGETS: ScienceTable<IntensityRow> = {
  version: INTENSITY_TARGETS_VERSION,
  name: "intensity_targets",
  rows: ROWS,
};

export function lookup(goal: Goal, category: SciLiftCategory): IntensityRow {
  const row = INTENSITY_TARGETS.rows.find((r) =>
    r.goal === goal && r.category === category
  );
  if (!row) {
    throw new Error(`intensity_targets: no row for ${goal}/${category}`);
  }
  return row;
}
