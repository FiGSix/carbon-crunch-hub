import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LegacyProjectRow {
  project_title: string;
  client_email: string;
  client_first_name: string;
  client_last_name: string;
  client_phone?: string;
  client_company_name?: string;
  system_address: string;
  system_size_kwp: number;
  commissioning_date: string;
  signed_date: string;
  agent_email: string;
  inverter_brand?: string;
  inverter_model?: string;
  inverter_capacity_kw?: number;
  inverter_quantity?: number;
  inverter_serial?: string;
  panel_brand?: string;
  panel_size_wp?: number;
  panel_quantity?: number;
  battery_capacity_kwh?: number;
  battery_brand?: string;
  battery_model?: string;
  total_capex?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      throw new Error('Only administrators can bulk upload legacy projects');
    }

    const { projects } = await req.json();

    if (!projects || !Array.isArray(projects)) {
      throw new Error('Invalid request: projects array required');
    }

    console.log(`Starting bulk upload of ${projects.length} legacy projects`);

    const results = {
      success: true,
      totalRows: projects.length,
      successCount: 0,
      failureCount: 0,
      errors: [] as any[],
      createdProposalIds: [] as string[],
      createdProjectIds: [] as string[]
    };

    for (let i = 0; i < projects.length; i++) {
      const row: LegacyProjectRow = projects[i];
      const rowNum = i + 3; // Account for header and description rows

      try {
        console.log(`Processing row ${rowNum}: ${row.client_first_name} ${row.client_last_name}`);
        
        // 1. Find agent by email using proper role checking
        const { data: agents, error: agentError } = await supabase
          .rpc('get_agent_by_email', { email_param: row.agent_email });

        if (agentError || !agents || agents.length === 0) {
          throw new Error(`Agent not found with email: ${row.agent_email}`);
        }

        const agent = agents[0];

        // Validate agent is active (legacy projects need active agents)
        if (agent.agent_status !== 'active') {
          throw new Error(`Agent ${row.agent_email} is not active (status: ${agent.agent_status})`);
        }

        // 2. Find or create client
        const { data: clientId, error: clientError } = await supabase
          .rpc('find_or_create_client_by_email', {
            p_email: row.client_email,
            p_first_name: row.client_first_name,
            p_last_name: row.client_last_name,
            p_phone: row.client_phone || null,
            p_company_name: row.client_company_name || null,
            p_created_by: agent.id
          });

        if (clientError) throw clientError;

        // 2a. Block re-imports of the same project for the same client/site
        const existingLegacy = await findExistingLegacyProject(supabase, {
          clientId: clientId as string,
          systemAddress: row.system_address,
          projectTitle: row.project_title,
        });
        if (existingLegacy) {
          throw duplicateLegacyProjectError(existingLegacy);
        }

        // 2b. Validate commission date (must be on or after 2022-09-15)
        const minCommissionDate = new Date('2022-09-15');
        const commDate = new Date(row.commissioning_date);
        if (isNaN(commDate.getTime()) || commDate < minCommissionDate) {
          throw new Error(`Commissioning date ${row.commissioning_date} is before minimum allowed date 2022-09-15`);
        }

        // 3. Calculate carbon credits (simplified)
        const systemSizeKwp = row.system_size_kwp;
        const annualEnergy = systemSizeKwp * 1500; // kWh per year
        const carbonCredits = (annualEnergy * 0.95) / 1000; // tCO2e

        // 4. Calculate revenue percentages based on agent's current portfolio
        console.log(`Calculating revenue percentages for agent ${row.agent_email}...`);

        // Get agent's current signed portfolio (excluding deleted/archived)
        const { data: agentProposals } = await supabase
          .from('proposals')
          .select('system_size_kwp')
          .eq('agent_id', agent.id)
          .eq('status', 'signed')
          .is('deleted_at', null)
          .is('archived_at', null);

        const currentPortfolioKwp = (agentProposals || []).reduce(
          (sum, p) => sum + (p.system_size_kwp || 0), 
          0
        );

        // Add this project to portfolio for tier calculation
        const totalPortfolioKwp = currentPortfolioKwp + systemSizeKwp;

        console.log(`Agent portfolio: ${currentPortfolioKwp.toFixed(2)} kWp current + ${systemSizeKwp} kWp (this project) = ${totalPortfolioKwp.toFixed(2)} kWp total`);

        // Calculate client share based on portfolio tiers
        let clientSharePercentage: number;
        if (totalPortfolioKwp < 5000) {
          clientSharePercentage = 60.20; // 0-5 MWp
        } else if (totalPortfolioKwp < 10000) {
          clientSharePercentage = 63; // 5-10 MWp
        } else if (totalPortfolioKwp < 20000) {
          clientSharePercentage = 66.5; // 10-20 MWp
        } else if (totalPortfolioKwp < 30000) {
          clientSharePercentage = 68.25; // 20-30 MWp
        } else {
          clientSharePercentage = 70; // 30+ MWp
        }

        // Calculate agent commission based on portfolio tiers
        let agentCommissionPercentage: number;
        
        // Check if agent has commission override
        if (agent.commission_override !== null && agent.commission_override !== undefined) {
          agentCommissionPercentage = agent.commission_override;
          console.log(`✓ Row ${rowNum}: Using commission override: ${agentCommissionPercentage}%`);
        } else {
          // Fall back to tier-based calculation (FIXED: was incorrectly 5%/4%, now 4%/7%)
          if (totalPortfolioKwp < 15000) {
            agentCommissionPercentage = 4; // Below 15 MWp: 4% commission (AGENT_COMMISSION_LOW)
          } else {
            agentCommissionPercentage = 7; // 15 MWp and above: 7% commission (AGENT_COMMISSION_HIGH)
          }
          console.log(`✓ Row ${rowNum}: Using tier-based commission: ${agentCommissionPercentage}%`);
        }

        console.log(`Calculated: ${clientSharePercentage}% client share, ${agentCommissionPercentage}% agent commission (tier: ${(totalPortfolioKwp / 1000).toFixed(2)} MWp)`);

        // 5. Create proposal with signed status
        const { data: proposal, error: proposalError } = await supabase
          .from('proposals')
          .insert({
            title: row.project_title,
            agent_id: agent.id,
            client_reference_id: clientId,
            status: 'signed',
            signed_at: new Date(row.signed_date).toISOString(),
            system_size_kwp: systemSizeKwp,
            annual_energy: annualEnergy,
            carbon_credits: carbonCredits,
            client_share_percentage: clientSharePercentage,
            agent_commission_percentage: agentCommissionPercentage,
            content: {
              clientInfo: {
                name: `${row.client_first_name} ${row.client_last_name}`,
                email: row.client_email,
                phone: row.client_phone || '',
                companyName: row.client_company_name || '',
                existingClient: true
              },
              projectInfo: {
                name: row.project_title,
                address: row.system_address,
                size: String(systemSizeKwp),
                commissionDate: row.commissioning_date,
                isMultiPhase: false,
                additionalNotes: 'Imported from legacy system'
              }
            },
            eligibility_criteria: {
              inSouthAfrica: true,
              notRegistered: true,
              under15MWp: true,
              commissionedAfter2022: commDate >= minCommissionDate,
              legalOwnership: true,
              noGovernmentFunding: true
            },
            project_info: {
              name: row.project_title,
              address: row.system_address,
              size: String(systemSizeKwp),
              commissionDate: row.commissioning_date,
              isMultiPhase: false
            }
          })
          .select()
          .single();

        if (proposalError) throw proposalError;

        // Verify the content was stored correctly
        const clientNameStored = proposal.content?.clientInfo?.name;
        if (!clientNameStored || clientNameStored.trim().length === 0) {
          console.error(`❌ Client name missing in proposal ${proposal.id} for ${row.client_email}`);
          throw new Error(`Failed to store client name for ${row.client_email}. Expected: "${row.client_first_name} ${row.client_last_name}", Got: "${clientNameStored}"`);
        }
        console.log(`✓ Verified client name stored: "${clientNameStored}"`);

        // 6. Create proposal agreement
        const { error: agreementError } = await supabase
          .from('proposal_agreements')
          .insert({
            proposal_id: proposal.id,
            signed_by: user.id,
            signed_at: new Date(row.signed_date).toISOString(),
            signature_type: 'legacy_import',
            typed_name: `${row.client_first_name} ${row.client_last_name}`,
            accepted_terms_version: '1.0',
            metadata: {
              signed_via: 'legacy_import',
              imported_by: user.id,
              imported_at: new Date().toISOString(),
              original_signed_date: row.signed_date,
              portfolio_calculated: true,
              portfolio_size_at_import: totalPortfolioKwp
            }
          });

        if (agreementError) throw agreementError;

        // 7. Project onboarding record is auto-created by trigger

        // 8. Fetch the created project_onboarding ID
        const { data: projectOnboarding } = await supabase
          .from('project_onboarding')
          .select('id')
          .eq('proposal_id', proposal.id)
          .single();

        if (projectOnboarding) {
          // 9. Populate onboarding_fields with available data
          const { error: fieldsError } = await supabase
            .from('onboarding_fields')
            .upsert({
              project_id: projectOnboarding.id,
              system_address: row.system_address,
              system_name: row.project_title,
              commissioning_date: row.commissioning_date,
              panel_total_kwp: systemSizeKwp,
              inverter_brand: row.inverter_brand,
              inverter_model: row.inverter_model,
              inverter_capacity_kw: row.inverter_capacity_kw,
              inverter_quantity: row.inverter_quantity,
              inverter_serial: row.inverter_serial,
              panel_brand: row.panel_brand,
              panel_size_wp: row.panel_size_wp,
              panel_quantity: row.panel_quantity,
              battery_capacity_kwh: row.battery_capacity_kwh,
              battery_brand: row.battery_brand,
              battery_model: row.battery_model,
              total_capex: row.total_capex
            });

          if (fieldsError) console.error('Fields error:', fieldsError);

          results.createdProjectIds.push(projectOnboarding.id);
        }

        results.createdProposalIds.push(proposal.id);
        results.successCount++;

        console.log(`✓ Row ${rowNum}: Created project ${row.project_title}`);

      } catch (error) {
        console.error(`✗ Row ${rowNum} error:`, error);
        results.failureCount++;
        results.errors.push({
          row: rowNum,
          data: row,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`Bulk upload complete: ${results.successCount} succeeded, ${results.failureCount} failed`);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in bulk-upload-legacy-projects:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
