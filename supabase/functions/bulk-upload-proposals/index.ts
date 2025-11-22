import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/types.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface BulkProposalRow {
  proposal_title: string;
  client_email: string;
  client_first_name: string;
  client_last_name: string;
  client_phone?: string;
  client_company_name?: string;
  project_name: string;
  project_address: string;
  system_size: number;
  system_size_unit: 'kWp' | 'MWp';
  commission_date: string;
  in_south_africa: boolean;
  not_registered: boolean;
  under_15mwp: boolean;
  commissioned_after_2022: boolean;
  legal_ownership: boolean;
  additional_notes?: string;
  client_share_override?: number;
  agent_commission_override?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { proposals } = await req.json() as { proposals: BulkProposalRow[] };

    console.log(`Processing ${proposals.length} proposals for admin ${user.id}`);

    const results = {
      success: true,
      totalRows: proposals.length,
      successCount: 0,
      failureCount: 0,
      errors: [] as Array<{ row: number; data: Partial<BulkProposalRow>; error: string }>,
      createdProposalIds: [] as string[]
    };

    // Process each proposal
    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i];
      const rowNum = i + 3; // Account for header rows

      try {
        // Find or create client
        let clientId: string;
        
        const { data: existingClient, error: clientLookupError } = await supabase
          .from('clients')
          .select('id')
          .eq('email', proposal.client_email)
          .single();

        // If error exists and it's NOT "no rows found", throw it
        if (clientLookupError && clientLookupError.code !== 'PGRST116') {
          throw new Error(`Failed to lookup client: ${clientLookupError.message}`);
        }

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              email: proposal.client_email,
              first_name: proposal.client_first_name,
              last_name: proposal.client_last_name,
              phone: proposal.client_phone,
              company_name: proposal.client_company_name,
              created_by: user.id
            })
            .select('id')
            .single();

          if (clientError) throw new Error(`Failed to create client: ${clientError.message}`);
          clientId = newClient.id;
        }

        // Convert system size to kWp
        const systemSizeKwp = proposal.system_size_unit === 'MWp' 
          ? proposal.system_size * 1000 
          : proposal.system_size;

        // Get agent's portfolio for pricing calculations
        const { data: agentProposals } = await supabase
          .from('proposals')
          .select('system_size_kwp')
          .eq('agent_id', user.id)
          .is('deleted_at', null);

        const portfolioKwp = (agentProposals || []).reduce((sum, p) => sum + (p.system_size_kwp || 0), 0);

        // Calculate client share percentage based on portfolio
        let clientSharePercentage = 75; // Default
        if (portfolioKwp >= 5000) clientSharePercentage = 80;
        else if (portfolioKwp >= 2000) clientSharePercentage = 77.5;

        // Apply override if provided
        if (proposal.client_share_override !== undefined) {
          clientSharePercentage = proposal.client_share_override;
        }

        // Calculate agent commission
        let agentCommissionPercentage = 5; // Default
        if (proposal.agent_commission_override !== undefined) {
          agentCommissionPercentage = proposal.agent_commission_override;
        }

        // Simple carbon credit calculation (actual calculation is more complex)
        // Using approximate values for demonstration
        const annualEnergyKwh = systemSizeKwp * 1600; // ~1600 kWh per kWp per year in SA
        const carbonCreditsPerYear = (annualEnergyKwh * 0.95) / 1000; // ~0.95 kg CO2 per kWh

        // Create proposal
        const { data: newProposal, error: proposalError } = await supabase
          .from('proposals')
          .insert({
            title: proposal.proposal_title,
            agent_id: user.id,
            client_reference_id: clientId,
            status: 'draft',
            system_size_kwp: systemSizeKwp,
            unit_standard: 'kWp',
            annual_energy: annualEnergyKwh,
            carbon_credits: carbonCreditsPerYear,
            client_share_percentage: clientSharePercentage,
            agent_commission_percentage: agentCommissionPercentage,
            eligibility_criteria: {
              inSouthAfrica: proposal.in_south_africa,
              notRegistered: proposal.not_registered,
              under15MWp: proposal.under_15mwp,
              commissionedAfter2022: proposal.commissioned_after_2022,
              legalOwnership: proposal.legal_ownership
            },
            project_info: {
              name: proposal.project_name,
              address: proposal.project_address,
              commissionDate: proposal.commission_date,
              size: systemSizeKwp,
              notes: proposal.additional_notes
            },
            content: {
              clientInfo: {
                firstName: proposal.client_first_name,
                lastName: proposal.client_last_name,
                email: proposal.client_email,
                phone: proposal.client_phone,
                companyName: proposal.client_company_name
              },
              projectInfo: {
                name: proposal.project_name,
                address: proposal.project_address,
                commissionDate: proposal.commission_date,
                size: systemSizeKwp
              }
            }
          })
          .select('id')
          .single();

        if (proposalError) throw new Error(`Failed to create proposal: ${proposalError.message}`);

        results.successCount++;
        results.createdProposalIds.push(newProposal.id);
        console.log(`✓ Row ${rowNum}: Created proposal ${newProposal.id}`);

      } catch (error) {
        results.failureCount++;
        results.errors.push({
          row: rowNum,
          data: proposal,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`✗ Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Bulk upload complete: ${results.successCount} success, ${results.failureCount} failed`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
