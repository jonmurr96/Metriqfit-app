// Re-exports and the SCIENCE_TABLE_VERSIONS constant that mirrors
// PlanSpec.science_table_versions. When a science table's data or schema
// changes in a way that affects PlanSpec outputs, bump that table's VERSION
// constant AND update SCIENCE_TABLE_VERSIONS here.

export * from "./types.ts";

export {
  lookup as lookupVolume,
  VOLUME_TARGETS,
  VOLUME_TARGETS_VERSION,
} from "./volume_targets.ts";
export type { VolumeRow } from "./volume_targets.ts";

export {
  INTENSITY_TARGETS,
  INTENSITY_TARGETS_VERSION,
  lookup as lookupIntensity,
} from "./intensity_targets.ts";
export type { IntensityRow } from "./intensity_targets.ts";

export {
  lookup as lookupProtein,
  PROTEIN_TARGETS,
  PROTEIN_TARGETS_VERSION,
} from "./protein_targets.ts";
export type { ProteinRow } from "./protein_targets.ts";

export {
  lookup as lookupSlots,
  SLOT_RATIOS,
  SLOT_RATIOS_VERSION,
} from "./slot_ratios.ts";
export type { SlotLookupResult, SlotRatioRow } from "./slot_ratios.ts";

export {
  CARB_CYCLING,
  CARB_CYCLING_VERSION,
  lookup as lookupCarbCycling,
} from "./carb_cycling.ts";
export type { CarbCyclingRow } from "./carb_cycling.ts";

export {
  lookup as lookupMicros,
  lookupOne as lookupMicroOne,
  MICRONUTRIENT_MINIMUMS,
  MICRONUTRIENT_MINIMUMS_VERSION,
} from "./micronutrient_minimums.ts";
export type { MicronutrientRow, Unit as MicronutrientUnit } from "./micronutrient_minimums.ts";

export {
  compute as computeHydration,
  HYDRATION,
  HYDRATION_VERSION,
  lookup as lookupHydration,
} from "./hydration.ts";
export type { HydrationRow } from "./hydration.ts";

import { VOLUME_TARGETS_VERSION } from "./volume_targets.ts";
import { INTENSITY_TARGETS_VERSION } from "./intensity_targets.ts";
import { PROTEIN_TARGETS_VERSION } from "./protein_targets.ts";
import { SLOT_RATIOS_VERSION } from "./slot_ratios.ts";
import { CARB_CYCLING_VERSION } from "./carb_cycling.ts";
import { MICRONUTRIENT_MINIMUMS_VERSION } from "./micronutrient_minimums.ts";
import { HYDRATION_VERSION } from "./hydration.ts";

export const SCIENCE_TABLE_VERSIONS = {
  volume: VOLUME_TARGETS_VERSION,
  intensity: INTENSITY_TARGETS_VERSION,
  slot_ratios: SLOT_RATIOS_VERSION,
  protein_targets: PROTEIN_TARGETS_VERSION,
  carb_cycling: CARB_CYCLING_VERSION,
  micronutrient_minimums: MICRONUTRIENT_MINIMUMS_VERSION,
  hydration: HYDRATION_VERSION,
} as const;

export type ScienceTableVersions = typeof SCIENCE_TABLE_VERSIONS;
