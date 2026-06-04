// Weekly micronutrient minimums by (sex x age band).
//
// Daily RDAs / AIs are sourced from the US National Institutes of Health
// Office of Dietary Supplements (NIH ODS) Dietary Reference Intakes (DRIs).
// Weekly minimum = daily reference x 7.
//
// Sources (NIH ODS fact sheets, all retrieved 2025):
//   - Omega-3 (EPA+DHA): no formal RDA; AHA recommends 250-500 mg/day EPA+DHA
//     for general cardiovascular health; ALA AI is 1.1 g (f) / 1.6 g (m).
//     We use 250 mg/day EPA+DHA as a conservative floor.
//     https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/
//   - Vitamin D: RDA 600 IU = 15 mcg (under 70), 800 IU = 20 mcg (70+).
//     https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/
//   - Iron: RDA male 8 mg/d; female premenopausal (under_40) 18 mg/d; female
//     40-50 still menstruating ~18 mg/d, drops to 8 mg/d post-menopause (60+).
//     We bias the 40_to_59 female to 18 mg (still typically menstruating),
//     60_plus female drops to 8 mg.
//     https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/
//   - Calcium: RDA 1000 mg (adults 19-50, men under 70), 1200 mg (women 51+
//     and men 71+).
//     https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/
//   - Choline: AI 550 mg (men), 425 mg (women). Same across adult ages.
//     https://ods.od.nih.gov/factsheets/Choline-HealthProfessional/
//   - Magnesium: RDA male 400-420 mg, female 310-320 mg. We pick 420/320.
//     https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/
//   - Zinc: RDA male 11 mg, female 8 mg.
//     https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/
//   - Vitamin B12: RDA 2.4 mcg adults; older adults often need supplemental
//     (poor absorption) but RDA unchanged.
//     https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/

import type {
  AgeBand,
  Micronutrient,
  ScienceCitation,
  ScienceTable,
  Sex,
} from "./types.ts";
import { ALL_AGE_BANDS, ALL_SEX, ageToBand } from "./types.ts";

export const MICRONUTRIENT_MINIMUMS_VERSION = 1 as const;

export type Unit = "mg" | "mcg" | "g";

export interface MicronutrientRow {
  readonly sex: Sex;
  readonly age_band: AgeBand;
  readonly nutrient: Micronutrient;
  readonly weekly_min: number;
  readonly unit: Unit;
  readonly citation: ScienceCitation;
}

function nih(name: string, slug: string): ScienceCitation {
  return {
    source: `NIH ODS — ${name} (Dietary Reference Intakes)`,
    url:
      `https://ods.od.nih.gov/factsheets/${slug}-HealthProfessional/`,
    confidence: "high",
    year: 2025,
  };
}

const CITE_OMEGA3 = nih("Omega-3 Fatty Acids", "Omega3FattyAcids");
const CITE_VITD = nih("Vitamin D", "VitaminD");
const CITE_IRON = nih("Iron", "Iron");
const CITE_CALCIUM = nih("Calcium", "Calcium");
const CITE_CHOLINE = nih("Choline", "Choline");
const CITE_MAG = nih("Magnesium", "Magnesium");
const CITE_ZINC = nih("Zinc", "Zinc");
const CITE_B12 = nih("Vitamin B12", "VitaminB12");

interface DailyTarget {
  readonly value: number;
  readonly unit: Unit;
  readonly citation: ScienceCitation;
}

function dailyFor(
  nutrient: Micronutrient,
  sex: Sex,
  age_band: AgeBand,
): DailyTarget {
  switch (nutrient) {
    case "omega_3":
      return { value: 250, unit: "mg", citation: CITE_OMEGA3 };
    case "vitamin_d":
      return age_band === "60_plus"
        ? { value: 20, unit: "mcg", citation: CITE_VITD }
        : { value: 15, unit: "mcg", citation: CITE_VITD };
    case "iron": {
      if (sex === "male") return { value: 8, unit: "mg", citation: CITE_IRON };
      // female
      if (age_band === "60_plus") {
        return { value: 8, unit: "mg", citation: CITE_IRON };
      }
      return { value: 18, unit: "mg", citation: CITE_IRON };
    }
    case "calcium": {
      const high = (sex === "female" && age_band !== "under_40") ||
        age_band === "60_plus";
      return high
        ? { value: 1200, unit: "mg", citation: CITE_CALCIUM }
        : { value: 1000, unit: "mg", citation: CITE_CALCIUM };
    }
    case "choline":
      return sex === "male"
        ? { value: 550, unit: "mg", citation: CITE_CHOLINE }
        : { value: 425, unit: "mg", citation: CITE_CHOLINE };
    case "magnesium":
      return sex === "male"
        ? { value: 420, unit: "mg", citation: CITE_MAG }
        : { value: 320, unit: "mg", citation: CITE_MAG };
    case "zinc":
      return sex === "male"
        ? { value: 11, unit: "mg", citation: CITE_ZINC }
        : { value: 8, unit: "mg", citation: CITE_ZINC };
    case "vitamin_b12":
      return { value: 2.4, unit: "mcg", citation: CITE_B12 };
  }
}

const NUTRIENTS: ReadonlyArray<Micronutrient> = [
  "omega_3",
  "vitamin_d",
  "iron",
  "calcium",
  "choline",
  "magnesium",
  "zinc",
  "vitamin_b12",
];

const ROWS: MicronutrientRow[] = [];
for (const sex of ALL_SEX) {
  for (const age_band of ALL_AGE_BANDS) {
    for (const nutrient of NUTRIENTS) {
      const d = dailyFor(nutrient, sex, age_band);
      ROWS.push({
        sex,
        age_band,
        nutrient,
        weekly_min: Math.round(d.value * 7 * 100) / 100,
        unit: d.unit,
        citation: d.citation,
      });
    }
  }
}

export const MICRONUTRIENT_MINIMUMS: ScienceTable<MicronutrientRow> = {
  version: MICRONUTRIENT_MINIMUMS_VERSION,
  name: "micronutrient_minimums",
  rows: ROWS,
};

export function lookup(sex: Sex, age_years: number): ReadonlyArray<MicronutrientRow> {
  const age_band = ageToBand(age_years);
  return MICRONUTRIENT_MINIMUMS.rows.filter((r) =>
    r.sex === sex && r.age_band === age_band
  );
}

export function lookupOne(
  sex: Sex,
  age_years: number,
  nutrient: Micronutrient,
): MicronutrientRow {
  const age_band = ageToBand(age_years);
  const row = MICRONUTRIENT_MINIMUMS.rows.find((r) =>
    r.sex === sex && r.age_band === age_band && r.nutrient === nutrient
  );
  if (!row) {
    throw new Error(
      `micronutrient_minimums: no row for ${sex}/${age_band}/${nutrient}`,
    );
  }
  return row;
}

export const _NUTRIENTS = NUTRIENTS;
