import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export type CarbonPrices = Record<string, number>;

export interface CarbonRateSet {
  id: string;
  name: string;
  prices: CarbonPrices;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

class CarbonRateSetsService {
  private log = logger.withContext({ service: "CarbonRateSetsService" });

  async list(): Promise<CarbonRateSet[]> {
    const { data, error } = await supabase
      .from("carbon_rate_sets")
      .select("id, name, prices, is_default, created_at, updated_at")
      .order("is_default", { ascending: false })
      .order("name");
    if (error) throw error;
    return (data ?? []) as CarbonRateSet[];
  }

  async get(id: string): Promise<CarbonRateSet | null> {
    const { data, error } = await supabase
      .from("carbon_rate_sets")
      .select("id, name, prices, is_default, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as CarbonRateSet) ?? null;
  }

  async getDefault(): Promise<CarbonRateSet | null> {
    const { data, error } = await supabase
      .from("carbon_rate_sets")
      .select("id, name, prices, is_default, created_at, updated_at")
      .eq("is_default", true)
      .maybeSingle();
    if (error) throw error;
    return (data as CarbonRateSet) ?? null;
  }

  async create(name: string, prices: CarbonPrices): Promise<CarbonRateSet> {
    const { data, error } = await supabase
      .from("carbon_rate_sets")
      .insert({ name, prices })
      .select("id, name, prices, is_default, created_at, updated_at")
      .single();
    if (error) throw error;
    return data as CarbonRateSet;
  }

  async update(
    id: string,
    changes: { name?: string; prices?: CarbonPrices }
  ): Promise<void> {
    const { error } = await supabase
      .from("carbon_rate_sets")
      .update(changes)
      .eq("id", id);
    if (error) throw error;
  }

  async setDefault(id: string): Promise<void> {
    const { error } = await supabase
      .from("carbon_rate_sets")
      .update({ is_default: true })
      .eq("id", id);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    // Guard: check no clients use it
    const { count, error: cErr } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("carbon_rate_set_id", id);
    if (cErr) throw cErr;
    if ((count ?? 0) > 0) {
      throw new Error(
        `This rate set is assigned to ${count} client${count === 1 ? "" : "s"} and can't be deleted.`
      );
    }
    const { error } = await supabase
      .from("carbon_rate_sets")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }
}

export const carbonRateSetsService = new CarbonRateSetsService();
