#!/usr/bin/env -S deno run --allow-read --allow-write

import { calculateTargets, type TargetInput, type TargetOutput } from "../lib/targets/calculateTargets.ts";

type Mode = "pairwise" | "exhaustive";
type AuditCase = {
  id: string;
  labels: string[];
  input: TargetInput;
};
type DimensionValue = {
  label: string;
  apply: (input: TargetInput) => TargetInput;
};
type Dimension = {
  name: string;
  values: DimensionValue[];
};
type Failure = {
  id: string;
  labels: string[];
  messages: string[];
  input: TargetInput;
  output?: TargetOutput;
};

const REFERENCE_DATE = "2026-04-27";
const REPORT_DIR = "scripts/reports";
const JSON_REPORT = `${REPORT_DIR}/macro_target_matrix_report.json`;
const MD_REPORT = `${REPORT_DIR}/macro_target_matrix_report.md`;

const baseInput: TargetInput = {
  sex: "male",
  dob: "1987-04-26",
  height_ft: 6,
  height_in: 0,
  current_weight_lb: 190,
  target_weight_lb: 190,
  goal_type: "maintain_weight",
  activity_level: "moderately_active",
  training_days_per_week: 4,
  minutes_per_workout: "60",
  experience_level: "intermediate",
  dietary_preference: "anything",
  carb_tolerance: "energized_satiated",
  avg_steps: 8500,
  target_date: null,
  reference_date: REFERENCE_DATE,
};

const dimensions: Dimension[] = [
  {
    name: "sex",
    values: [
      { label: "male", apply: (i) => ({ ...i, sex: "male" }) },
      { label: "female", apply: (i) => ({ ...i, sex: "female" }) },
    ],
  },
  {
    name: "age",
    values: [
      { label: "age_20", apply: (i) => ({ ...i, dob: "2006-04-27" }) },
      { label: "age_35", apply: (i) => ({ ...i, dob: "1991-04-27" }) },
      { label: "age_50", apply: (i) => ({ ...i, dob: "1976-04-27" }) },
      { label: "age_65", apply: (i) => ({ ...i, dob: "1961-04-27" }) },
    ],
  },
  {
    name: "height",
    values: [
      { label: "short", apply: (i) => ({ ...i, height_ft: 5, height_in: 2 }) },
      { label: "average", apply: (i) => ({ ...i, height_ft: 5, height_in: 9 }) },
      { label: "tall", apply: (i) => ({ ...i, height_ft: 6, height_in: 3 }) },
    ],
  },
  {
    name: "weight",
    values: [
      { label: "115lb", apply: (i) => ({ ...i, current_weight_lb: 115, target_weight_lb: 115 }) },
      { label: "160lb", apply: (i) => ({ ...i, current_weight_lb: 160, target_weight_lb: 160 }) },
      { label: "220lb", apply: (i) => ({ ...i, current_weight_lb: 220, target_weight_lb: 220 }) },
      { label: "300lb", apply: (i) => ({ ...i, current_weight_lb: 300, target_weight_lb: 300 }) },
    ],
  },
  {
    name: "target_delta",
    values: [
      { label: "target_same", apply: (i) => ({ ...i, target_weight_lb: i.current_weight_lb }) },
      { label: "target_down_10", apply: (i) => ({ ...i, target_weight_lb: i.current_weight_lb - 10 }) },
      { label: "target_up_10", apply: (i) => ({ ...i, target_weight_lb: i.current_weight_lb + 10 }) },
      { label: "target_up_25", apply: (i) => ({ ...i, target_weight_lb: i.current_weight_lb + 25 }) },
    ],
  },
  {
    name: "goal",
    values: [
      { label: "lose_weight", apply: (i) => ({ ...i, goal_type: "lose_weight" }) },
      { label: "build_muscle", apply: (i) => ({ ...i, goal_type: "build_muscle" }) },
      { label: "get_fitter", apply: (i) => ({ ...i, goal_type: "get_fitter" }) },
      { label: "gain_weight", apply: (i) => ({ ...i, goal_type: "gain_weight" }) },
      { label: "maintain_weight", apply: (i) => ({ ...i, goal_type: "maintain_weight" }) },
      { label: "recomp", apply: (i) => ({ ...i, goal_type: "recomp" }) },
      { label: "increase_endurance", apply: (i) => ({ ...i, goal_type: "increase_endurance" }) },
      { label: "general_fitness", apply: (i) => ({ ...i, goal_type: "general_fitness" }) },
    ],
  },
  {
    name: "activity",
    values: [
      { label: "sedentary", apply: (i) => ({ ...i, activity_level: "sedentary" }) },
      { label: "lightly_active", apply: (i) => ({ ...i, activity_level: "lightly_active" }) },
      { label: "moderately_active", apply: (i) => ({ ...i, activity_level: "moderately_active" }) },
      { label: "very_active", apply: (i) => ({ ...i, activity_level: "very_active" }) },
    ],
  },
  {
    name: "steps",
    values: [
      { label: "steps_unknown", apply: (i) => ({ ...i, avg_steps: null }) },
      { label: "steps_3000", apply: (i) => ({ ...i, avg_steps: 3000 }) },
      { label: "steps_8500", apply: (i) => ({ ...i, avg_steps: 8500 }) },
      { label: "steps_14000", apply: (i) => ({ ...i, avg_steps: 14000 }) },
    ],
  },
  {
    name: "training_days",
    values: [
      { label: "days_0", apply: (i) => ({ ...i, training_days_per_week: 0 }) },
      { label: "days_2", apply: (i) => ({ ...i, training_days_per_week: 2 }) },
      { label: "days_4", apply: (i) => ({ ...i, training_days_per_week: 4 }) },
      { label: "days_5", apply: (i) => ({ ...i, training_days_per_week: 5 }) },
      { label: "days_6", apply: (i) => ({ ...i, training_days_per_week: 6 }) },
    ],
  },
  {
    name: "minutes",
    values: [
      { label: "30min", apply: (i) => ({ ...i, minutes_per_workout: "30" }) },
      { label: "45min", apply: (i) => ({ ...i, minutes_per_workout: "45" }) },
      { label: "60min", apply: (i) => ({ ...i, minutes_per_workout: "60" }) },
      { label: "90plus", apply: (i) => ({ ...i, minutes_per_workout: "90_plus" }) },
    ],
  },
  {
    name: "experience",
    values: [
      { label: "beginner", apply: (i) => ({ ...i, experience_level: "beginner" }) },
      { label: "intermediate", apply: (i) => ({ ...i, experience_level: "intermediate" }) },
      { label: "advanced", apply: (i) => ({ ...i, experience_level: "advanced" }) },
    ],
  },
  {
    name: "diet",
    values: [
      { label: "anything", apply: (i) => ({ ...i, dietary_preference: "anything" }) },
      { label: "vegetarian", apply: (i) => ({ ...i, dietary_preference: "vegetarian" }) },
      { label: "vegan", apply: (i) => ({ ...i, dietary_preference: "vegan" }) },
      { label: "keto", apply: (i) => ({ ...i, dietary_preference: "keto" }) },
      { label: "paleo", apply: (i) => ({ ...i, dietary_preference: "paleo" }) },
      { label: "pescatarian", apply: (i) => ({ ...i, dietary_preference: "pescatarian" }) },
      { label: "other", apply: (i) => ({ ...i, dietary_preference: "other" }) },
    ],
  },
  {
    name: "carb_tolerance",
    values: [
      { label: "energized_satiated", apply: (i) => ({ ...i, carb_tolerance: "energized_satiated" }) },
      { label: "hungry_quickly", apply: (i) => ({ ...i, carb_tolerance: "hungry_quickly" }) },
      { label: "tired_sleepy", apply: (i) => ({ ...i, carb_tolerance: "tired_sleepy" }) },
      { label: "bloated", apply: (i) => ({ ...i, carb_tolerance: "bloated" }) },
    ],
  },
  {
    name: "target_date",
    values: [
      { label: "no_date", apply: (i) => ({ ...i, target_date: null }) },
      { label: "12_weeks", apply: (i) => ({ ...i, target_date: "2026-07-20" }) },
      { label: "52_weeks", apply: (i) => ({ ...i, target_date: "2027-04-26" }) },
    ],
  },
];

function parseArgs() {
  let mode: Mode = "pairwise";
  let maxCases = Infinity;
  for (let i = 0; i < Deno.args.length; i++) {
    const arg = Deno.args[i];
    if (arg === "--mode") mode = Deno.args[++i] as Mode;
    else if (arg.startsWith("--mode=")) mode = arg.split("=")[1] as Mode;
    else if (arg === "--max-cases") maxCases = Number(Deno.args[++i]);
    else if (arg.startsWith("--max-cases=")) maxCases = Number(arg.split("=")[1]);
  }
  if (mode !== "pairwise" && mode !== "exhaustive") {
    throw new Error(`Unknown mode "${mode}". Use pairwise or exhaustive.`);
  }
  return { mode, maxCases };
}

function materialize(values: DimensionValue[], id: string): AuditCase {
  const input = values.reduce((next, value) => value.apply(next), baseInput);
  return { id, labels: values.map((v) => v.label), input };
}

function pairKey(aDim: string, aValue: string, bDim: string, bValue: string) {
  return `${aDim}:${aValue}|${bDim}:${bValue}`;
}

function allPairKeys() {
  const keys = new Set<string>();
  for (let i = 0; i < dimensions.length; i++) {
    for (let j = i + 1; j < dimensions.length; j++) {
      for (const a of dimensions[i].values) {
        for (const b of dimensions[j].values) {
          keys.add(pairKey(dimensions[i].name, a.label, dimensions[j].name, b.label));
        }
      }
    }
  }
  return keys;
}

function casePairKeys(values: DimensionValue[]) {
  const keys: string[] = [];
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      keys.push(pairKey(dimensions[i].name, values[i].label, dimensions[j].name, values[j].label));
    }
  }
  return keys;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function buildPairwiseCases(maxCases: number): AuditCase[] {
  const uncovered = allPairKeys();
  const cases: AuditCase[] = [];
  const rand = seededRandom(20260427);

  const boundarySets = [
    dimensions.map((d) => d.values[0]),
    dimensions.map((d) => d.values[d.values.length - 1]),
    dimensions.map((d) => d.values[Math.floor(d.values.length / 2)]),
  ];
  for (const values of boundarySets) {
    const auditCase = materialize(values, `pairwise_boundary_${cases.length + 1}`);
    cases.push(auditCase);
    for (const key of casePairKeys(values)) uncovered.delete(key);
  }

  while (uncovered.size > 0 && cases.length < maxCases) {
    let bestValues: DimensionValue[] | null = null;
    let bestScore = -1;

    for (let attempt = 0; attempt < 2500; attempt++) {
      const values = dimensions.map((d) => d.values[Math.floor(rand() * d.values.length)]);
      const score = casePairKeys(values).reduce((sum, key) => sum + (uncovered.has(key) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        bestValues = values;
      }
    }

    if (!bestValues || bestScore <= 0) break;
    const auditCase = materialize(bestValues, `pairwise_${cases.length + 1}`);
    cases.push(auditCase);
    for (const key of casePairKeys(bestValues)) uncovered.delete(key);
  }

  return cases;
}

async function* exhaustiveCases(maxCases: number): AsyncGenerator<AuditCase> {
  const selected: DimensionValue[] = [];
  let count = 0;

  function* walk(index: number): Generator<AuditCase> {
    if (count >= maxCases) return;
    if (index === dimensions.length) {
      count++;
      yield materialize([...selected], `exhaustive_${count}`);
      return;
    }
    for (const value of dimensions[index].values) {
      selected[index] = value;
      yield* walk(index + 1);
      if (count >= maxCases) return;
    }
  }

  for (const auditCase of walk(0)) {
    yield auditCase;
  }
}

function macroCalories(target: { protein_g: number; carbs_g: number; fat_g: number }) {
  return target.protein_g * 4 + target.carbs_g * 4 + target.fat_g * 9;
}

function validate(caseDef: AuditCase): Failure | null {
  const messages: string[] = [];
  let output: TargetOutput | undefined;

  try {
    output = calculateTargets(caseDef.input);
  } catch (error) {
    return {
      id: caseDef.id,
      labels: caseDef.labels,
      messages: [`calculator_threw: ${error instanceof Error ? error.message : String(error)}`],
      input: caseDef.input,
    };
  }

  const dayTargets = [output.daily, output.trainingDay, output.restDay];
  for (const [index, target] of dayTargets.entries()) {
    const label = index === 0 ? "daily" : index === 1 ? "trainingDay" : "restDay";
    for (const [key, value] of Object.entries(target)) {
      if (!Number.isFinite(value) || value <= 0) messages.push(`${label}.${key}_invalid`);
    }
    const diff = Math.abs(macroCalories(target) - target.calories);
    if (diff > 75) messages.push(`${label}.macro_calories_mismatch_${Math.round(diff)}`);
    if (target.fat_g * 9 < target.calories * 0.18 && caseDef.input.dietary_preference !== "keto") {
      messages.push(`${label}.fat_below_18_percent`);
    }
    if (target.protein_g < caseDef.input.current_weight_lb * 0.55) messages.push(`${label}.protein_too_low`);
    if (target.protein_g > caseDef.input.current_weight_lb * 1.15) messages.push(`${label}.protein_too_high`);
  }

  const minCalories = caseDef.input.sex === "male" ? 1500 : 1200;
  if (output.calories < minCalories) messages.push("daily_below_safety_floor");

  if (caseDef.input.dietary_preference === "keto") {
    if (output.trainingDay.carbs_g > 75) messages.push("keto_training_carbs_above_cap");
    if (output.restDay.carbs_g > 50) messages.push("keto_rest_carbs_above_cap");
  }

  const train = Math.max(0, Math.min(7, Math.round(caseDef.input.training_days_per_week || 0)));
  const rest = 7 - train;
  const weightedCalories = train > 0
    ? Math.round((output.trainingDay.calories * train + output.restDay.calories * rest) / 7)
    : output.daily.calories;
  if (Math.abs(weightedCalories - output.daily.calories) > 20) messages.push("weighted_daily_calories_mismatch");

  const estimatedTdee = output.target_diagnostics.estimated_tdee;
  if (caseDef.input.goal_type === "lose_weight" && output.daily.calories >= estimatedTdee) messages.push("lose_weight_not_below_tdee");
  if (caseDef.input.goal_type === "build_muscle" && output.daily.calories <= estimatedTdee) messages.push("build_muscle_not_above_tdee");
  if (caseDef.input.goal_type === "gain_weight" && output.daily.calories <= estimatedTdee) messages.push("gain_weight_not_above_tdee");

  return messages.length ? { id: caseDef.id, labels: caseDef.labels, messages, input: caseDef.input, output } : null;
}

function summarizeFailures(failures: Failure[]) {
  const counts = new Map<string, number>();
  for (const failure of failures) {
    for (const message of failure.messages) {
      counts.set(message, (counts.get(message) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

async function writeReports(mode: Mode, total: number, failures: Failure[]) {
  await Deno.mkdir(REPORT_DIR, { recursive: true });
  const topFailureCounts = summarizeFailures(failures);
  await Deno.writeTextFile(JSON_REPORT, JSON.stringify({
    generated_at: new Date().toISOString(),
    mode,
    total,
    passed: total - failures.length,
    failed: failures.length,
    topFailureCounts,
    failures: failures.slice(0, 200),
  }, null, 2));

  const lines = [
    "# Macro Target Matrix Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${mode}`,
    `Total cases: ${total}`,
    `Passed: ${total - failures.length}`,
    `Failed: ${failures.length}`,
    "",
    "## Top Failure Counts",
    "",
    ...(
      topFailureCounts.length
        ? topFailureCounts.slice(0, 25).map(([message, count]) => `- ${message}: ${count}`)
        : ["- None"]
    ),
    "",
    "## Sample Failures",
    "",
    ...(
      failures.length
        ? failures.slice(0, 25).flatMap((failure) => [
          `### ${failure.id}`,
          `- Labels: ${failure.labels.join(", ")}`,
          `- Messages: ${failure.messages.join(", ")}`,
          `- Input: ${JSON.stringify(failure.input)}`,
          failure.output ? `- Output: ${JSON.stringify(failure.output.daily)}` : "- Output: none",
          "",
        ])
        : ["- None"]
    ),
  ];
  await Deno.writeTextFile(MD_REPORT, `${lines.join("\n")}\n`);
}

async function main() {
  const { mode, maxCases } = parseArgs();
  const failures: Failure[] = [];
  let total = 0;

  const source = mode === "pairwise"
    ? buildPairwiseCases(maxCases)
    : exhaustiveCases(maxCases);

  for await (const auditCase of source as Iterable<AuditCase> | AsyncIterable<AuditCase>) {
    total++;
    const failure = validate(auditCase);
    if (failure) failures.push(failure);
    if (total % 100000 === 0) {
      console.log(`[macro-audit] processed ${total} cases, failures ${failures.length}`);
    }
  }

  await writeReports(mode, total, failures);
  console.log(`[macro-audit] mode=${mode} total=${total} passed=${total - failures.length} failed=${failures.length}`);
  console.log(`[macro-audit] reports: ${JSON_REPORT}, ${MD_REPORT}`);

  if (failures.length > 0) {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
