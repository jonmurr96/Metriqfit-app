// Weekly set volume per muscle pattern, by (experience x goal x sex).
//
// Sources:
//   - Schoenfeld, Ogborn, Krieger (2017). "Dose-response relationship between
//     weekly resistance training volume and increases in muscle mass: A
//     systematic review and meta-analysis." J Sports Sci.
//     Key findings: ~10+ sets/muscle/week associated with greater hypertrophy
//     vs lower volume; non-trivial dose-response up to ~20 sets/wk.
//   - Helms, Aragon, Fitschen (2014). "Evidence-based recommendations for
//     natural bodybuilding contest preparation."
//   - Helms et al. "The Muscle and Strength Pyramid: Training" (2nd ed., 2019).
//   - Israetel/Hoffmann/Smith (Renaissance Periodization) practical MEV/MAV
//     framework, anchored to Schoenfeld dose-response.
//
// Notation:
//   - MEV = Minimum Effective Volume (sets/wk for measurable progress).
//   - target = planned weekly set count for this cell (interior of MEV..MAV).
//   - MAV = Maximum Adaptive Volume (sets/wk above which returns diminish or
//     fatigue overwhelms recovery for most lifters in this cell).
//
// Female overrides: women on average tolerate slightly higher per-session
// volume and recover faster between sets (lower relative fatigue), so we bias
// target up by 1-2 sets/wk on hypertrophy-oriented goals. We do NOT override
// rows where evidence is too thin (most non-hypertrophy goals).
//   - Hunter (2014). "Sex differences in human fatigability." Exp Physiol.
//   - Latella et al. (2018). "The Influence of Sex on Strength and Hypertrophy
//     Adaptations to Resistance Training."

import type {
  Experience,
  Goal,
  ScienceCitation,
  ScienceTable,
  SciMusclePattern,
  Sex,
} from "./types.ts";
import {
  ALL_EXPERIENCE,
  ALL_GOALS,
  ALL_MUSCLES,
} from "./types.ts";

export const VOLUME_TARGETS_VERSION = 1 as const;

export interface VolumeRow {
  readonly experience: Experience;
  readonly goal: Goal;
  readonly sex: Sex;
  readonly muscle: SciMusclePattern;
  readonly mev: number;
  readonly target: number;
  readonly mav: number;
  readonly citation: ScienceCitation;
}

// ----- Citations -----

const CITE_SCHOENFELD_2017: ScienceCitation = {
  source:
    "Schoenfeld, Ogborn, Krieger (2017). Dose-response of weekly resistance training volume on hypertrophy. J Sports Sci.",
  url: "https://pubmed.ncbi.nlm.nih.gov/27433992/",
  confidence: "high",
  year: 2017,
};

const CITE_HELMS_PYRAMID: ScienceCitation = {
  source:
    "Helms et al. The Muscle and Strength Pyramid: Training (2nd ed., 2019).",
  confidence: "high",
  year: 2019,
};

const CITE_HELMS_2014: ScienceCitation = {
  source:
    "Helms, Aragon, Fitschen (2014). Evidence-based recommendations for natural bodybuilding. J Int Soc Sports Nutr.",
  url: "https://pubmed.ncbi.nlm.nih.gov/24864135/",
  confidence: "high",
  year: 2014,
};

const CITE_RP_PRACTICAL: ScienceCitation = {
  source:
    "Israetel, Hoffmann, Smith (Renaissance Periodization). MEV/MAV practical framework anchored to Schoenfeld 2017.",
  confidence: "medium",
  year: 2019,
};

const CITE_LATELLA_2018: ScienceCitation = {
  source:
    "Latella et al. (2018). Influence of sex on strength and hypertrophy adaptations to resistance training. Sports Med.",
  confidence: "medium",
  year: 2018,
  notes:
    "Used to justify slight upward bias of weekly target sets in hypertrophy-oriented goals for females.",
};

// ----- Base male rows by (experience, goal, muscle) -----
//
// We organize by per-muscle base volumes, then apply experience and goal
// multipliers. Conservative (low confidence) where evidence is sparse.

interface PerMuscleBase {
  readonly muscle: SciMusclePattern;
  readonly mev: number;
  readonly mav: number;
  readonly base_target: number; // intermediate hypertrophy male baseline
}

// Anchored to Schoenfeld 2017 + RP practical: large muscles 10-20, small 8-16.
const MUSCLE_BASE: ReadonlyArray<PerMuscleBase> = [
  { muscle: "chest", mev: 8, base_target: 14, mav: 22 },
  { muscle: "back_lats", mev: 10, base_target: 16, mav: 25 },
  { muscle: "back_upper", mev: 8, base_target: 14, mav: 22 },
  { muscle: "shoulders_lateral", mev: 8, base_target: 14, mav: 22 },
  { muscle: "shoulders_rear", mev: 6, base_target: 12, mav: 20 },
  { muscle: "biceps", mev: 6, base_target: 12, mav: 20 },
  { muscle: "triceps", mev: 6, base_target: 12, mav: 20 },
  { muscle: "quads", mev: 8, base_target: 14, mav: 20 },
  { muscle: "hamstrings", mev: 6, base_target: 10, mav: 18 },
  { muscle: "glutes", mev: 6, base_target: 12, mav: 22 },
  { muscle: "calves", mev: 6, base_target: 10, mav: 18 },
  { muscle: "core", mev: 4, base_target: 8, mav: 16 },
];

// Experience adjusts only the planned `target` (MEV/MAV are population anchors).
// Beginners need less to grow; advanced lifters need more to keep progressing.
const EXPERIENCE_TARGET_MULT: Record<Experience, number> = {
  beginner: 0.65,
  intermediate: 1.0,
  advanced: 1.2,
};

// Goal adjusts target relative to hypertrophy baseline:
//   - lose_weight: hold most volume to preserve LBM but slightly reduce due to
//     reduced recovery capacity in deficit (Helms 2014).
//   - gain_muscle: full hypertrophy volume.
//   - maintain: lower; just enough for maintenance.
//   - recomp: between maintain and gain_muscle.
//   - performance: lower hypertrophy volume on accessories; primary patterns
//     still trained but volume here reflects accessory/isolation muscles.
const GOAL_TARGET_MULT: Record<Goal, number> = {
  lose_weight: 0.9,
  gain_muscle: 1.0,
  maintain: 0.7,
  recomp: 0.85,
  performance: 0.8,
};

// Female bias only for hypertrophy-aligned goals (gain_muscle, recomp).
const FEMALE_BIAS_SETS: Record<Goal, number> = {
  lose_weight: 0,
  gain_muscle: 2,
  maintain: 0,
  recomp: 1,
  performance: 0,
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function buildRow(
  experience: Experience,
  goal: Goal,
  sex: Sex,
  base: PerMuscleBase,
): VolumeRow {
  const raw = base.base_target *
    EXPERIENCE_TARGET_MULT[experience] *
    GOAL_TARGET_MULT[goal];
  let target = Math.round(raw);
  if (sex === "female") target += FEMALE_BIAS_SETS[goal];
  // Keep target inside [MEV, MAV] inclusive.
  target = clamp(target, base.mev, base.mav);

  // Confidence: high for intermediate hypertrophy male (the anchor cell);
  // medium for derived cells; low for unusual combos.
  const isAnchor = experience === "intermediate" && goal === "gain_muscle" &&
    sex === "male";
  const citation: ScienceCitation = isAnchor
    ? CITE_SCHOENFELD_2017
    : goal === "gain_muscle" || goal === "recomp"
    ? CITE_HELMS_PYRAMID
    : goal === "lose_weight"
    ? CITE_HELMS_2014
    : sex === "female"
    ? CITE_LATELLA_2018
    : CITE_RP_PRACTICAL;

  return {
    experience,
    goal,
    sex,
    muscle: base.muscle,
    mev: base.mev,
    target,
    mav: base.mav,
    citation,
  };
}

const ROWS: VolumeRow[] = [];
for (const exp of ALL_EXPERIENCE) {
  for (const goal of ALL_GOALS) {
    for (const base of MUSCLE_BASE) {
      ROWS.push(buildRow(exp, goal, "male", base));
      ROWS.push(buildRow(exp, goal, "female", base));
    }
  }
}

export const VOLUME_TARGETS: ScienceTable<VolumeRow> = {
  version: VOLUME_TARGETS_VERSION,
  name: "volume_targets",
  rows: ROWS,
};

// ----- Lookup -----

export function lookup(
  experience: Experience,
  goal: Goal,
  sex: Sex,
  muscle: SciMusclePattern,
): VolumeRow {
  const row = VOLUME_TARGETS.rows.find((r) =>
    r.experience === experience &&
    r.goal === goal &&
    r.sex === sex &&
    r.muscle === muscle
  );
  if (!row) {
    throw new Error(
      `volume_targets: no row for ${experience}/${goal}/${sex}/${muscle}`,
    );
  }
  return row;
}

// Re-export for testing.
export const _MUSCLE_BASE = MUSCLE_BASE;
export const _ALL_MUSCLES = ALL_MUSCLES;
