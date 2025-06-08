
import { supabase } from "@/integrations/supabase/client";

export interface PortfolioData {
  totalKWp: number;
  projectCount: number;
  clientId: string;
}

/**
 * Calculate client portfolio data
 */
export async function calculateClientPortfolio(clientId: string): Promise<PortfolioData> {
  const { data } = await supabase
    .from('proposals')
    .select('system_size_kwp')
    .eq('client_reference_id', clientId)
    .not('system_size_kwp', 'is', null);
  
  const totalKWp = data?.reduce((total, p) => total + (p.system_size_kwp || 0), 0) || 0;
  const projectCount = data?.length || 0;
  
  return {
    totalKWp,
    projectCount,
    clientId
  };
}
