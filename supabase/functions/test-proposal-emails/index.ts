import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://uyjryuopuqgmsvayiccl.supabase.co";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabase.rpc("get_primary_role", { _user_id: user.id });
    if (roleData !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { testEmail = "shaun@radiant.africa" } = await req.json();

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendApiKey);
    const results = [];

    // Sample proposal data for testing
    const sampleProposal = {
      id: "test-proposal-id",
      title: "Test Solar Installation Project",
      client_name: "Test Client",
      agent_name: "Test Agent",
      agent_email: "agent@test.com",
      system_size_kwp: 150,
      annual_energy: 180000,
      invitation_token: "test-token-123",
    };

    const baseUrl = "https://uyjryuopuqgmsvayiccl.supabase.co";
    const invitationUrl = `${baseUrl}/functions/v1/accept-proposal?token=${sampleProposal.invitation_token}`;

    // Template 1: Sent but Not Delivered
    try {
      const template1 = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Proposal Reminder</h1>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px;">📧 TEST: Sent but Not Delivered</h2>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Hi ${sampleProposal.client_name},
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                We noticed you may not have received our carbon credit proposal for <strong>${sampleProposal.title}</strong>.
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 25px;">
                Please check your spam folder or click the button below to review the proposal:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View Proposal
                </a>
              </div>
              
              <div style="background: #FFF8E1; border-left: 4px solid #FFB74D; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #F57C00; font-size: 14px;">
                  ⏱️ This proposal expires in 10 days
                </p>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 25px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                Questions? Reply to this email or contact ${sampleProposal.agent_name} directly.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result1 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.com>",
        to: [testEmail],
        cc: [sampleProposal.agent_email],
        subject: "🔔 Reminder: Your Carbon Credit Proposal",
        html: template1,
      });

      results.push({ template: "sent_but_not_delivered", success: true, result: result1 });
    } catch (error) {
      results.push({ template: "sent_but_not_delivered", success: false, error: error.message });
    }

    // Template 2: Delivered but Not Opened
    try {
      const template2 = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Don't Miss Out</h1>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px;">👋 TEST: Delivered but Not Opened</h2>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Hi ${sampleProposal.client_name},
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                We sent you a carbon credit proposal for your ${sampleProposal.system_size_kwp}kWp solar installation, but we haven't heard back yet.
              </p>
              
              <div style="background: #E8F5E9; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0 0 10px; color: #2E7D32; font-weight: bold;">💰 Potential Annual Revenue:</p>
                <p style="margin: 0; color: #1B5E20; font-size: 24px; font-weight: bold;">
                  Estimated Value from Carbon Credits
                </p>
              </div>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 25px;">
                Take a moment to review your personalized proposal:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Review My Proposal
                </a>
              </div>
              
              <div style="background: #FFF8E1; border-left: 4px solid #FFB74D; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #F57C00; font-size: 14px;">
                  ⏱️ Act soon - this proposal expires in 10 days
                </p>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 25px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                Have questions? Contact ${sampleProposal.agent_name} at ${sampleProposal.agent_email}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result2 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.com>",
        to: [testEmail],
        cc: [sampleProposal.agent_email],
        subject: "💚 Your Carbon Credit Proposal is Waiting",
        html: template2,
      });

      results.push({ template: "delivered_but_not_opened", success: true, result: result2 });
    } catch (error) {
      results.push({ template: "delivered_but_not_opened", success: false, error: error.message });
    }

    // Template 3: Opened but Not Viewed
    try {
      const template3 = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Complete Your Review</h1>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px;">✨ TEST: Opened but Not Viewed</h2>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Hi ${sampleProposal.client_name},
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                I noticed you started reviewing your carbon credit proposal for <strong>${sampleProposal.title}</strong>, but didn't complete it.
              </p>
              
              <div style="background: #E3F2FD; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0 0 10px; color: #1565C0; font-weight: bold;">🎯 Quick Summary:</p>
                <ul style="margin: 10px 0; padding-left: 20px; color: #0D47A1;">
                  <li>System Size: ${sampleProposal.system_size_kwp}kWp</li>
                  <li>Est. Annual Energy: ${(sampleProposal.annual_energy / 1000).toFixed(0)} MWh</li>
                  <li>Carbon Credit Potential: High Value</li>
                </ul>
              </div>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 25px;">
                Complete your review and let's discuss how we can help you monetize your solar investment:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invitationUrl}" style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Continue Reviewing
                </a>
              </div>
              
              <div style="background: #FFEBEE; border-left: 4px solid #EF5350; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #C62828; font-size: 14px;">
                  ⚠️ Urgent: This proposal expires soon (10 days validity)
                </p>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 25px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                Need help or have questions? I'm here to assist.<br>
                ${sampleProposal.agent_name}<br>
                ${sampleProposal.agent_email}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result3 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.com>",
        to: [testEmail],
        cc: [sampleProposal.agent_email],
        subject: "⏰ Complete Your Carbon Credit Proposal Review",
        html: template3,
      });

      results.push({ template: "opened_but_not_viewed", success: true, result: result3 });
    } catch (error) {
      results.push({ template: "opened_but_not_viewed", success: false, error: error.message });
    }

    console.log("Test emails sent successfully:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `All test emails sent to ${testEmail}`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in test-proposal-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
