import type { TrendPoint } from "../../services/progressMetricsService";

export type WeightUnitSystem = "metric" | "imperial";

export function kgToLb(value: number): number {
  return value * 2.20462;
}

export function lbToKg(value: number): number {
  return value / 2.20462;
}

export function roundWeight(value: number): number {
  return Math.round(value * 10) / 10;
}

export function weightUnitForSystem(unitSystem: WeightUnitSystem | null | undefined): "kg" | "lb" {
  return unitSystem === "metric" ? "kg" : "lb";
}

export function kgToDisplayWeight(valueKg: number, unitSystem: WeightUnitSystem | null | undefined): number {
  return roundWeight(unitSystem === "metric" ? valueKg : kgToLb(valueKg));
}

export function formatWeightKg(valueKg: number | null | undefined, unitSystem: WeightUnitSystem | null | undefined): string {
  if (valueKg == null || !Number.isFinite(valueKg)) return "--";
  return `${kgToDisplayWeight(valueKg, unitSystem)} ${weightUnitForSystem(unitSystem)}`;
}

export function formatWeightDeltaKg(valueKg: number | null | undefined, unitSystem: WeightUnitSystem | null | undefined): string {
  if (valueKg == null || !Number.isFinite(valueKg)) return `-- ${weightUnitForSystem(unitSystem)}`;
  const displayValue = kgToDisplayWeight(valueKg, unitSystem);
  return `${displayValue > 0 ? "+" : ""}${displayValue} ${weightUnitForSystem(unitSystem)}`;
}

export function convertWeightSeries(series: TrendPoint[], unitSystem: WeightUnitSystem | null | undefined): TrendPoint[] {
  if (unitSystem === "metric") return series;
  return series.map((point) => ({
    ...point,
    value: roundWeight(kgToLb(point.value)),
  }));
}
