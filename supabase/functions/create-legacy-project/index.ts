import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateLegacyProjectRequest {
  project_title: string;
  client_first_name: string;
  client_last_name: string;
  client_email: string;
  client_phone?: string;
  client_company_name?: string;
  agent_email: string;
  system_address: string;
  system_size_kwp: number;
  commissioning_date: string;
  signed_date: string;
  signed_pdf_url: string;
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
  client_share_percentage?: number;
  agent_commission_percentage?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
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
      throw new Error('Admin access required');
    }

    const body: CreateLegacyProjectRequest = await req.json();

    // Validate agent exists
    const { data: agent, error: agentError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', body.agent_email)
      .eq('role', 'agent')
      .single();

    if (agentError || !agent) {
      throw new Error(`Agent with email ${body.agent_email} not found`);
    }

    // Find or create client
    const { data: clientId, error: clientError } = await supabase
      .rpc('find_or_create_client_by_email', {
        p_email: body.client_email,
        p_first_name: body.client_first_name,
        p_last_name: body.client_last_name,
        p_phone: body.client_phone || null,
        p_company_name: body.client_company_name || null,
        p_created_by: agent.id
      });

    if (clientError || !clientId) {
      throw new Error('Failed to find or create client');
    }

    // Calculate carbon credits (using standard 1000 kWh per kWp per year * 0.95 tCO2/MWh)
    const annualEnergyKwh = body.system_size_kwp * 1000;
    const carbonCredits = (annualEnergyKwh / 1000) * 0.95;

    // Create proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert({
        title: body.project_title,
        agent_id: agent.id,
        client_reference_id: clientId,
        status: 'signed',
        signed_at: body.signed_date,
        system_size_kwp: body.system_size_kwp,
        annual_energy: annualEnergyKwh,
        carbon_credits: carbonCredits,
        client_share_percentage: body.client_share_percentage || 75,
        agent_commission_percentage: body.agent_commission_percentage || 4,
        content: {
          clientInfo: {
            firstName: body.client_first_name,
            lastName: body.client_last_name,
            email: body.client_email,
            phone: body.client_phone,
            company: body.client_company_name
          },
          projectInfo: {
            name: body.project_title,
            address: body.system_address,
            size: body.system_size_kwp,
            commissionDate: body.commissioning_date
          }
        }
      })
      .select()
      .single();

    if (proposalError || !proposal) {
      throw new Error('Failed to create proposal');
    }

    // Create proposal agreement
    const { error: agreementError } = await supabase
      .from('proposal_agreements')
      .insert({
        proposal_id: proposal.id,
        signed_by: clientId,
        signed_at: body.signed_date,
        signature_type: 'legacy_import',
        typed_name: `${body.client_first_name} ${body.client_last_name}`,
        signed_pdf_url: body.signed_pdf_url
      });

    if (agreementError) {
      console.error('Agreement creation error:', agreementError);
      throw new Error('Failed to create agreement');
    }

    // Create project onboarding
    const { data: projectOnboarding, error: onboardingError } = await supabase
      .from('project_onboarding')
      .insert({
        proposal_id: proposal.id
      })
      .select()
      .single();

    if (onboardingError || !projectOnboarding) {
      throw new Error('Failed to create project onboarding');
    }

    // Create onboarding fields
    const { error: fieldsError } = await supabase
      .from('onboarding_fields')
      .insert({
        project_id: projectOnboarding.id,
        system_name: body.project_title,
        system_address: body.system_address,
        commissioning_date: body.commissioning_date,
        panel_total_kwp: body.system_size_kwp,
        inverter_brand: body.inverter_brand,
        inverter_model: body.inverter_model,
        inverter_capacity_kw: body.inverter_capacity_kw,
        inverter_quantity: body.inverter_quantity,
        inverter_serial: body.inverter_serial,
        panel_brand: body.panel_brand,
        panel_size_wp: body.panel_size_wp,
        panel_quantity: body.panel_quantity,
        battery_capacity_kwh: body.battery_capacity_kwh,
        battery_brand: body.battery_brand,
        battery_model: body.battery_model,
        total_capex: body.total_capex
      });

    if (fieldsError) {
      console.error('Fields creation error:', fieldsError);
    }

    // Create onboarding document record for the signed PDF
    const { error: docError } = await supabase
      .from('onboarding_documents')
      .insert({
        project_id: projectOnboarding.id,
        category: 'coc',
        file_url: body.signed_pdf_url,
        uploaded_by: user.id
      });

    if (docError) {
      console.error('Document record creation error:', docError);
    }

    // Log activity
    await supabase
      .from('onboarding_activity_log')
      .insert({
        project_id: projectOnboarding.id,
        actor_id: user.id,
        activity_type: 'project_created',
        description: 'Legacy project imported manually by admin'
      });

    return new Response(
      JSON.stringify({
        success: true,
        project_id: projectOnboarding.id,
        proposal_id: proposal.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in create-legacy-project:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
