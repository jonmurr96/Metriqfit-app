#!/usr/bin/env -S deno run --allow-read
/**
 * Stabilization baseline comparator
 * Compares the latest audit report against the golden baseline.
 *
 * Run after `nutrition_weekly_audit.mjs`:
 *   deno run --allow-read scripts/nutrition_weekly_audit_compare.mjs
 */

import { parse as parseYaml } from "https://deno.land/std@0.220.0/yaml/mod.ts";

const baselinePath = new URL("./nutrition_weekly_audit_baseline_golden.md", import.meta.url).pathname;
const latestPath = new URL("./nutrition_weekly_audit_report.md", import.meta.url).pathname;

function extractScores(text) {
  const scores = {};
  const lines = text.split("\n");
  let inSummaryTable = false;
  for (const line of lines) {
    if (line.startsWith("| Persona")) {
      inSummaryTable = true;
      continue;
    }
    if (inSummaryTable && line.startsWith("|---")) continue;
    if (inSummaryTable && line.startsWith("| ")) {
      const parts = line.split("|").map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 4) {
        const persona = parts[0];
        const pre = parseInt(parts[1], 10);
        const post = parseInt(parts[2], 10);
        scores[persona] = { pre, post };
      }
      continue;
    }
    if (inSummaryTable && !line.startsWith("| ")) {
      inSummaryTable = false;
    }
  }
  return scores;
}

let baselineText;
let latestText;
try {
  baselineText = await Deno.readTextFile(baselinePath);
} catch {
  console.error(`❌ Golden baseline not found at ${baselinePath}`);
  console.error("Run: cp scripts/nutrition_weekly_audit_report.md scripts/nutrition_weekly_audit_baseline_golden.md");
  Deno.exit(1);
}

try {
  latestText = await Deno.readTextFile(latestPath);
} catch {
  console.error(`❌ Latest report not found at ${latestPath}`);
  console.error("Run: deno run --allow-all scripts/nutrition_weekly_audit.mjs");
  Deno.exit(1);
}

const baseline = extractScores(baselineText);
const latest = extractScores(latestText);

const personas = new Set([...Object.keys(baseline), ...Object.keys(latest)]);
const sortedPersonas = Array.from(personas).sort();

let regressions = 0;
let improvements = 0;
let newPersonas = 0;
let missingPersonas = 0;

console.log("\n# Audit Baseline Comparison\n");
console.log("| Persona | Baseline | Latest | Δ | Status |");
console.log("|---------|----------|--------|---|--------|");

for (const persona of sortedPersonas) {
  const base = baseline[persona];
  const curr = latest[persona];

  if (!base) {
    newPersonas++;
    console.log(`| ${persona} | — | ${curr?.post ?? "?"} | — | 🆕 NEW |`);
    continue;
  }
  if (!curr) {
    missingPersonas++;
    console.log(`| ${persona} | ${base.post} | — | — | ⚠️ MISSING |`);
    continue;
  }

  const delta = curr.post - base.post;
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`;

  let status = "✅ OK";
  if (delta <= -10) {
    status = "🚨 REGRESSION";
    regressions++;
  } else if (delta <= -5) {
    status = "⚠️ WATCH";
  } else if (delta >= 10) {
    status = "🎉 IMPROVED";
    improvements++;
  }

  console.log(`| ${persona} | ${base.post} | ${curr.post} | ${deltaStr} | ${status} |`);
}

console.log("");
if (regressions > 0) {
  console.log(`🚨 ${regressions} regression(s) detected. Review required before merge.`);
} else if (improvements > 0) {
  console.log(`✅ No regressions. ${improvements} improvement(s).`);
} else {
  console.log("✅ No regressions. Output is stable against baseline.");
}

if (newPersonas > 0 || missingPersonas > 0) {
  console.log(`Note: ${newPersonas} new, ${missingPersonas} missing personas compared to baseline.`);
}
