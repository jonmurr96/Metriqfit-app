// lib/foodFactsService.ts
type OffNutriments = Record<string, number | string | undefined>;

export type BarcodeLookupResult = {
  source: 'openfoodfacts';
  barcode: string;
  name?: string;
  brand?: string;
  imageUrl?: string;
  // per 100g (ideal for your system)
  kcal_100g?: number;
  protein_g_100g?: number;
  carbs_g_100g?: number;
  fat_g_100g?: number;
  raw?: any; // optional for debugging
} | null;

function num(v: any): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : undefined;
}

export async function lookupProductByBarcode(barcode: string): Promise<BarcodeLookupResult> {
  const code = String(barcode).replace(/\D/g, '');
  if (!code) return null;

  // Keep payload small: only fetch what you need
  const fields = [
    'code',
    'product_name',
    'brands',
    'image_url',
    'nutriments'
  ].join(',');

  const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${encodeURIComponent(fields)}`;

  // Timeout guard
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        // Use a real contact, not placeholder
        'User-Agent': 'MetriqFit/1.0 (support@metriqfit.com)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const json = await res.json();

    // OpenFoodFacts uses a status field to indicate found/not found
    if (!json || json.status !== 1 || !json.product) return null;

    const p = json.product;
    const n: OffNutriments = p.nutriments || {};

    return {
      source: 'openfoodfacts',
      barcode: code,
      name: p.product_name,
      brand: p.brands,
      imageUrl: p.image_url,
      kcal_100g: num(n['energy-kcal_100g']),
      protein_g_100g: num(n['proteins_100g']),
      carbs_g_100g: num(n['carbohydrates_100g']),
      fat_g_100g: num(n['fat_100g']),
      raw: json, // remove in production if you want
    };
  } catch (e) {
    // AbortError is normal on timeout
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
