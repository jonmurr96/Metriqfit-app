// Tiny pure scalar utilities extracted from index.ts during Phase 0.5
// monolith split (zero behavior change).
//
// Self-contained; no I/O, no Supabase client, no domain types.

export const RESTRICTION_ALIASES: Record<string, string[]> = {
  dairy: ["dairy", "milk", "cheese", "yogurt", "whey", "butter"],
  peanuts: ["peanut", "peanuts", "peanut butter"],
  nuts: ["nuts", "almond", "walnut"],
  shellfish: ["shellfish", "shrimp", "prawn", "crab", "lobster"],
  fish: ["fish", "salmon", "tuna", "cod", "tilapia"],
  seafood: ["seafood", "fish", "salmon", "tuna", "shellfish", "shrimp"],
  eggs: ["egg", "eggs", "egg whites"],
  gluten: ["gluten", "wheat", "barley", "rye", "pasta"],
  soy: ["soy", "tofu", "tempeh"],
  rice: ["rice", "jasmine rice", "brown rice", "rice cakes"],
  potatoes: ["potato", "sweet potato"],
};

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function normalizeToken(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ");
}

export function formatWeekdayLabel(day: string) {
  const normalized = normalizeToken(day);
  return normalized ? `${normalized[0].toUpperCase()}${normalized.slice(1)}` : normalized;
}

export function expandRestrictionTokens(values: string[]) {
  const expanded = new Set<string>();
  for (const raw of values) {
    const token = normalizeToken(raw);
    if (!token || token === "none" || token === "other") continue;
    expanded.add(token);
    const aliases = RESTRICTION_ALIASES[token] || [];
    for (const alias of aliases) expanded.add(alias);
  }
  return Array.from(expanded);
}

export function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(date: Date) {
  return date.toISOString().split("T")[0];
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return String(error || "");
}

export function isMissingColumnError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("column")
    || message.includes("schema cache")
    || message.includes("does not exist")
    || message.includes("could not find")
  );
}

export function calculateMacroDiffPercent(target: number, actual: number) {
  if (target <= 0) return 0;
  return Math.abs(actual - target) / target * 100;
}

export function getDayVariation(dayIndex: number) {
  const variations = [0.97, 1, 1.03, 1.01, 0.99, 1.02, 0.98];
  return variations[dayIndex % variations.length];
}

export function normalizeNameTerm(value: string | null | undefined) {
  return normalizeToken(value || "");
}

export function matchesNamePreference(value: string | null | undefined, terms: string[]) {
  const normalizedValue = normalizeNameTerm(value);
  if (!normalizedValue) return false;
  return terms.some((term) => normalizedValue.includes(term));
}
