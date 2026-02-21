import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_ANNUAL_GENERATION_FACTOR } from './constants';

interface RegionalYieldCache {
  data: Record<string, number>;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache: RegionalYieldCache | null = null;
let fetchPromise: Promise<Record<string, number>> | null = null;

/**
 * Fetch regional solar yields from Supabase and cache in memory.
 * Returns a map of province name -> yield_kwh_per_kwp.
 */
async function fetchRegionalYields(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('regional_solar_yields')
    .select('province, yield_kwh_per_kwp');

  if (error || !data) {
    console.warn('Failed to fetch regional solar yields, using defaults:', error);
    return {};
  }

  const map: Record<string, number> = {};
  data.forEach((row: any) => {
    map[row.province] = Number(row.yield_kwh_per_kwp);
  });

  cache = { data: map, fetchedAt: Date.now() };
  return map;
}

/**
 * Get the cached yield map, fetching if needed.
 * Deduplicates concurrent requests.
 */
async function getYieldMap(): Promise<Record<string, number>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  if (!fetchPromise) {
    fetchPromise = fetchRegionalYields().finally(() => {
      fetchPromise = null;
    });
  }

  return fetchPromise;
}

/**
 * Get the yield factor for a specific province.
 * Falls back to DEFAULT_ANNUAL_GENERATION_FACTOR if province not found.
 */
export async function getYieldForProvince(province?: string): Promise<number> {
  if (!province) return DEFAULT_ANNUAL_GENERATION_FACTOR;

  const map = await getYieldMap();
  return map[province] ?? DEFAULT_ANNUAL_GENERATION_FACTOR;
}

/**
 * Synchronous lookup from cache only. Returns fallback if cache is empty.
 * Useful in synchronous calculation paths after cache has been primed.
 */
export function getYieldForProvinceSync(province?: string): number {
  if (!province) return DEFAULT_ANNUAL_GENERATION_FACTOR;
  if (!cache) return DEFAULT_ANNUAL_GENERATION_FACTOR;
  return cache.data[province] ?? DEFAULT_ANNUAL_GENERATION_FACTOR;
}

/**
 * Pre-fetch/prime the regional yields cache.
 * Call this early in app lifecycle or before calculations.
 */
export async function primeRegionalYieldsCache(): Promise<void> {
  await getYieldMap();
}
