
import { supabase } from "@/integrations/supabase/client";

/**
 * Calculate client share percentage based on simple portfolio rules
 */
export function calculateClientSharePercentage(portfolioKWp: number): number {
  if (portfolioKWp < 5000) return 63;
  if (portfolioKWp < 10000) return 66.5;
  if (portfolioKWp < 20000) return 67.9;
  if (portfolioKWp < 30000) return 70;
  return 73.5;
}

/**
 * Calculate agent commission percentage based on simple portfolio rules
 */
export function calculateAgentCommissionPercentage(portfolioKWp: number): number {
  return portfolioKWp < 15000 ? 4 : 7;
}

/**
 * Get client's current portfolio size
 */
export async function getClientPortfolioSize(clientId: string): Promise<number> {
  const { data } = await supabase
    .from('proposals')
    .select('system_size_kwp')
    .eq('client_id', clientId)
    .not('system_size_kwp', 'is', null);
  
  return data?.reduce((total, p) => total + (p.system_size_kwp || 0), 0) || 0;
}

/**
 * Get agent's current portfolio size
 */
export async function getAgentPortfolioSize(agentId: string): Promise<number> {
  const { data } = await supabase
    .from('proposals')
    .select('system_size_kwp')
    .eq('agent_id', agentId)
    .not('system_size_kwp', 'is', null);
  
  return data?.reduce((total, p) => total + (p.system_size_kwp || 0), 0) || 0;
}
