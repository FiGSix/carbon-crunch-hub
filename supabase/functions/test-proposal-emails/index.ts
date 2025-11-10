import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Helper to avoid Resend rate limits (2 req/sec max)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      agent_phone: "+27 123 456 789",
      system_size_kwp: 150,
      annual_energy: 180000,
      invitation_token: "test-token-123",
    };

    const baseUrl = "https://uyjryuopuqgmsvayiccl.supabase.co";
    const invitationUrl = `${baseUrl}/functions/v1/accept-proposal?token=${sampleProposal.invitation_token}`;
    const onboardingUrl = `${baseUrl}/onboarding/${sampleProposal.id}`;

    // Template 1: Delivered but Not Opened
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
              <h2 style="color: #1a1a1a; margin: 0 0 20px;">📧 TEST: Delivered but Not Opened</h2>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Hi ${sampleProposal.client_name},
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Just checking if you got our carbon credit proposal for <strong>${sampleProposal.title}</strong>.
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 25px;">
                Sometimes emails end up in spam. Click below to review:
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
        subject: "Just checking if you got this",
        html: template1,
      });

      results.push({ template: "delivered_not_opened", success: true, result: result1 });
    } catch (error) {
      results.push({ template: "delivered_not_opened", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 2: Opened but Not Clicked
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
              <h2 style="color: #1a1a1a; margin: 0 0 20px;">❓ TEST: Opened but Not Clicked</h2>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Hi ${sampleProposal.client_name},
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                I see you opened the proposal for <strong>${sampleProposal.title}</strong>. Need any clarity?
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
        subject: `Need any clarity on ${sampleProposal.title}?`,
        html: template2,
      });

      results.push({ template: "opened_not_clicked", success: true, result: result2 });
    } catch (error) {
      results.push({ template: "opened_not_clicked", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 3: Clicked but Not Signed
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
              <h2 style="color: #1a1a1a; margin: 0 0 20px;">📞 TEST: Clicked but Not Signed</h2>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Hi ${sampleProposal.client_name},
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                I see you've reviewed <strong>${sampleProposal.title}</strong>. Want to schedule a quick call to discuss?
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
                I'm here to answer any questions and help you move forward:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="mailto:${sampleProposal.agent_email}" style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Schedule a Call
                </a>
              </div>
              
              <div style="background: #FFEBEE; border-left: 4px solid #EF5350; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #C62828; font-size: 14px;">
                  ⚠️ Urgent: This proposal expires soon (10 days validity)
                </p>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 25px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                Or reply to this email - I'm happy to help!<br>
                ${sampleProposal.agent_name}<br>
                ${sampleProposal.agent_phone}<br>
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
        subject: "Want to schedule a quick call?",
        html: template3,
      });

      results.push({ template: "clicked_not_signed", success: true, result: result3 });
    } catch (error) {
      results.push({ template: "clicked_not_signed", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 4: Graceful Exit
    try {
      const template4 = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">We'll Close This For Now</h1>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px;">👋 TEST: Graceful Exit</h2>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Hi ${sampleProposal.client_name},
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                We haven't heard back about the carbon credit proposal for <strong>${sampleProposal.title}</strong>, so we'll close it for now.
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 25px;">
                No worries at all - you're always welcome back whenever you're ready. Just reach out!
              </p>
              
              <div style="background: #F3F4F6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; color: #374151; font-size: 14px;">
                  💚 Thank you for considering Crunch Carbon. We're here if you need us in the future.
                </p>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 25px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                Best regards,<br>
                ${sampleProposal.agent_name}<br>
                ${sampleProposal.agent_email}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result4 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.com>",
        to: [testEmail],
        cc: [sampleProposal.agent_email],
        subject: "We'll close this for now — you're always welcome back",
        html: template4,
      });

      results.push({ template: "graceful_exit", success: true, result: result4 });
    } catch (error) {
      results.push({ template: "graceful_exit", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 5: Accepted Thank-You
    try {
      const template5 = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Welcome Aboard!</h1>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px;">✅ TEST: Accepted Thank-You</h2>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Hi ${sampleProposal.client_name},
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Thank you for accepting the proposal for <strong>${sampleProposal.title}</strong>! We're excited to work with you.
              </p>
              
              <div style="background: #E8F5E9; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0 0 10px; color: #2E7D32; font-weight: bold;">📋 Next Steps:</p>
                <p style="margin: 0; color: #1B5E20; font-size: 14px;">
                  Complete your onboarding form to get started with carbon credit generation.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${onboardingUrl}" style="background: linear-gradient(135deg, #84cc16 0%, #65a30d 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Start Onboarding
                </a>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 25px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                Questions? Contact ${sampleProposal.agent_name} at ${sampleProposal.agent_email}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result5 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.com>",
        to: [testEmail],
        subject: "Welcome aboard! Your onboarding next steps",
        html: template5,
      });

      results.push({ template: "accepted_thank_you", success: true, result: result5 });
    } catch (error) {
      results.push({ template: "accepted_thank_you", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 6: Cession Reminder
    try {
      const template6 = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">⚡ Action Required</h1>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px;">📝 TEST: Cession Reminder</h2>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Hi ${sampleProposal.client_name},
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                This is a friendly reminder to complete the onboarding form for <strong>${sampleProposal.title}</strong>.
              </p>
              
              <div style="background: #FFF8E1; border-left: 4px solid #FFB74D; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #F57C00; font-size: 14px;">
                  ⏱️ Complete your form to start generating carbon credits
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${onboardingUrl}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Complete Onboarding
                </a>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 25px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                Need help? Contact ${sampleProposal.agent_name} at ${sampleProposal.agent_email}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result6 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.com>",
        to: [testEmail],
        cc: [sampleProposal.agent_email],
        subject: "Action Required: Complete onboarding form",
        html: template6,
      });

      results.push({ template: "cession_reminder", success: true, result: result6 });
    } catch (error) {
      results.push({ template: "cession_reminder", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 7: Onboarding Idle Help
    try {
      const template7 = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🤝 We're Here to Help</h1>
            </div>
            
            <div style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px;">💬 TEST: Onboarding Idle Help</h2>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                Hi ${sampleProposal.client_name},
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 15px;">
                I noticed you haven't completed the onboarding for <strong>${sampleProposal.title}</strong> yet.
              </p>
              
              <p style="color: #4a4a4a; line-height: 1.6; margin: 0 0 25px;">
                Need any help completing the form? I'm here to assist!
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${onboardingUrl}" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Continue Onboarding
                </a>
              </div>
              
              <div style="background: #EFF6FF; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  💡 Stuck on something? Reply to this email or call me directly - happy to walk you through it!
                </p>
              </div>
              
              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 25px 0 0; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                ${sampleProposal.agent_name}<br>
                ${sampleProposal.agent_phone}<br>
                ${sampleProposal.agent_email}
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const result7 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.com>",
        to: [testEmail],
        subject: "Need any help completing onboarding?",
        html: template7,
      });

      results.push({ template: "onboarding_idle_help", success: true, result: result7 });
    } catch (error) {
      results.push({ template: "onboarding_idle_help", success: false, error: error.message });
    }

    console.log("Test emails sent successfully:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `All 7 test emails sent to ${testEmail}`,
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
