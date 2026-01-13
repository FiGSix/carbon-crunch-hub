import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CalculatorRequest {
  email: string;
  name?: string;
  systemSizeKwp: number;
  commissioningDate: string;
  referralCode?: string;
  ipAddress?: string;
  userAgent?: string;
  address?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, name, systemSizeKwp, commissioningDate, referralCode, ipAddress, userAgent, address }: CalculatorRequest =
      await req.json();

    // Validate inputs
    if (!email || !name || !systemSizeKwp || !commissioningDate) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Name validation
    if (!name.trim()) {
      return new Response(
        JSON.stringify({ error: "Name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse name into first and last name
    const nameParts = name?.trim().split(' ') || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Determine agent_id: referral agent or default Crunch Carbon admin
    let agentId: string | null = null;
    const DEFAULT_CRUNCH_CARBON_AGENT = '6538aa1a-c0dc-4ce4-ab6f-bb4368d9fce1'; // Shaun from Crunch Carbon

    if (referralCode) {
      // Validate referral code is a valid active agent
      const { data: agent, error: agentError } = await supabase
        .from('profiles')
        .select('id, role, agent_status, first_name, last_name')
        .eq('id', referralCode)
        .eq('role', 'agent')
        .eq('agent_status', 'active')
        .single();

      if (!agentError && agent) {
        agentId = agent.id;
        console.log(`Calculator lead assigned to agent: ${agent.first_name} ${agent.last_name} (${agent.id})`);
      } else {
        console.log(`Invalid or inactive referral code: ${referralCode}, defaulting to Crunch Carbon`);
        agentId = DEFAULT_CRUNCH_CARBON_AGENT;
      }
    } else {
      // No referral code - assign to Crunch Carbon default
      agentId = DEFAULT_CRUNCH_CARBON_AGENT;
      console.log('No referral code - calculator lead assigned to Crunch Carbon default agent');
    }

    // Calculate carbon credits and annual energy
    const annualEnergy = Math.round(systemSizeKwp * 1300);
    const carbonCredits = parseFloat(((annualEnergy / 1000) * 0.93).toFixed(2));

    // Generate secure token (48 char random string)
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    
    // Set expiration to 10 days from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 240);

    // Create proposal content
    const proposalContent = {
      clientInfo: {
        email: email.toLowerCase().trim(),
        name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
      },
      projectInfo: {
        size: `${systemSizeKwp} kWp`,
        commissionDate: commissioningDate,
        system_size_kwp: systemSizeKwp,
        annual_energy_kwh: annualEnergy,
        address: address || undefined,
      },
      financialInfo: {
        carbon_credits: carbonCredits,
      }
    };

    // Find or create client record
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, user_id')
      .eq('email', email.toLowerCase().trim())
      .single();

    let clientReferenceId = existingClient?.id;
    let clientProfileId = existingClient?.user_id;

    // Create client if doesn't exist
    if (!existingClient) {
      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          email: email.toLowerCase().trim(),
          first_name: firstName,
          last_name: lastName,
          created_by: agentId,
          notes: `Created from calculator submission - ${systemSizeKwp} kWp system`
        })
        .select('id')
        .single();
      
      clientReferenceId = newClient?.id;
    }

    // If client has no profile yet, check if one exists with matching email
    if (!clientProfileId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .eq('role', 'client')
        .single();
      
      clientProfileId = profile?.id;
    }

    // Insert proposal with all client links
    const { data: proposal, error: insertError } = await supabase
      .from("proposals")
      .insert({
        title: `Solar Project - ${systemSizeKwp} kWp`,
        content: proposalContent,
        project_info: {
          system_size_kwp: systemSizeKwp,
          commissioning_date: commissioningDate
        },
        eligibility_criteria: {},
        status: 'sent',
        carbon_credits: carbonCredits,
        annual_energy: annualEnergy,
        system_size_kwp: systemSizeKwp,
        invitation_token: token,
        invitation_expires_at: expiresAt.toISOString(),
        invitation_sent_at: new Date().toISOString(),
        agent_id: agentId,
        client_reference_id: clientReferenceId,  // Link to clients table
        client_id: clientProfileId,               // Link to profiles if exists
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create proposal" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build proposal URL
    const siteUrl = Deno.env.get("SITE_URL") || "https://crunchcarbon.com";
    const resultsUrl = `${siteUrl}/proposals/${proposal.id}?token=${token}`;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Crunch Carbon <results@crunchcarbon.com>",
      to: [email],
      subject: `Your Solar Impact Report is Ready! ☀️`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
            <tr>
              <td align="center">
                <table cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); box-sizing: border-box;">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #FCEE21 0%, #FFD700 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #1a1a1a; font-size: 28px; font-weight: bold;">
                        Your Solar Impact Report is Ready! ☀️
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                        ${name ? `Hi ${name},` : 'Hi there,'}
                      </p>
                      
                      <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                        Great news! We've crunched the numbers for your <strong>${systemSizeKwp} kWp solar system</strong> commissioning on <strong>${new Date(commissioningDate).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
                      </p>
                      
                      <!-- Stats Preview -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <p style="margin: 0 0 15px; color: #1a1a1a; font-size: 18px; font-weight: bold;">
                              Your Quick Impact Preview:
                            </p>
                            <p style="margin: 0 0 10px; color: #333333; font-size: 15px;">
                              ✅ <strong>Annual Energy:</strong> ~${annualEnergy.toLocaleString()} kWh
                            </p>
                             <p style="margin: 0 0 10px; color: #333333; font-size: 15px;">
                              ✅ <strong>Carbon Offset:</strong> ~${carbonCredits} tonnes CO₂
                            </p>
                            <p style="margin: 0; color: #333333; font-size: 15px;">
                              ✅ <strong>Potential Value:</strong> Click below to reveal!
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${resultsUrl}" style="display: inline-block; background-color: #FCEE21; color: #1a1a1a; font-size: 18px; font-weight: bold; text-decoration: none; padding: 16px 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                              View Your Full Solar Impact Report
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 0 0 10px; color: #666666; font-size: 14px; text-align: center;">
                        This link expires in 10 days
                      </p>
                      
                      <p style="margin: 30px 0 0; color: #666666; font-size: 14px; line-height: 1.6; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                        Questions? Reply to this email or visit <a href="https://crunchcarbon.com" style="color: #1a1a1a; text-decoration: none; font-weight: 600;">crunchcarbon.com</a>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        © ${new Date().getFullYear()} Crunch Carbon. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        proposalId: proposal.id,
        message: "Proposal created successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-calculator-results:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
