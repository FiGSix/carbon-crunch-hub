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
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Proposal Reminder</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px;">
                <table cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <tr>
                    <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">Proposal Reminder</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 20px 0;">
                        Dear <strong>${sampleProposal.client_name}</strong>,
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 20px 0;">
                        Just checking in to see if you received your carbon credit proposal. We're excited to share the potential savings and environmental impact your project could generate.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF9E6; border: 1px solid #F4C430; border-radius: 4px; margin: 25px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <p style="margin: 0; color: #1A1A1A; font-size: 14px; line-height: 1.5;">
                              ⏰ <strong>Your proposal expires in 10 days.</strong> Review it soon to secure these benefits.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 30px 0;">
                        Click the button below to view your personalized proposal and see how you can start earning carbon credits today.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 10px 0;">
                            <a href="${invitationUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); color: #1A1A1A; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 16px;">View Your Proposal</a>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 30px 0 20px 0;">
                        If you have any questions, feel free to reach out. We're here to help!
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 5px 0;">
                        Best regards,
                      </p>
                      <p style="font-size: 16px; color: #1A1A1A; font-weight: 600; margin: 5px 0 0 0;">
                        ${sampleProposal.agent_name}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #1A1A1A; padding: 25px 30px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #CCCCCC; font-size: 14px;">
                        Crunch Carbon - Sustainable Energy Solutions
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        For support, contact us at <a href="mailto:support@crunchcarbon.app" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.app</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const result1 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.app>",
        to: [testEmail],
        subject: "Your Carbon Credit Proposal is Waiting - Action Required",
        html: template1,
      });
      console.log("Template 1 sent:", result1);
      results.push({ template: "delivered_not_opened", success: true, emailId: result1.id });
    } catch (error) {
      console.error("Error sending template 1:", error);
      results.push({ template: "delivered_not_opened", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 2: Opened but Not Clicked
    try {
      const template2 = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ready to Take the Next Step?</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px;">
                <table cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <tr>
                    <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">Ready to Take the Next Step?</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 20px 0;">
                        Hi <strong>${sampleProposal.clientName}</strong>,
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 20px 0;">
                        I noticed you opened your carbon credit proposal. That's great! I wanted to highlight some key benefits you'll unlock by moving forward:
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-left: 4px solid #F4C430; border-radius: 4px; margin: 30px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <h2 style="margin: 0 0 15px 0; color: #1A1A1A; font-size: 18px; font-weight: 600;">Your Project Highlights</h2>
                            <table style="width: 100%; border-collapse: collapse;">
                              <tr>
                                <td style="padding: 8px 0; color: #666666; font-size: 14px;">System Size:</td>
                                <td style="padding: 8px 0; color: #1A1A1A; font-size: 14px; font-weight: 600; text-align: right;">${sampleProposal.systemSize}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #666666; font-size: 14px;">Est. Carbon Credits:</td>
                                <td style="padding: 8px 0; color: #1A1A1A; font-size: 14px; font-weight: 600; text-align: right;">${sampleProposal.carbonCredits} credits</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #666666; font-size: 14px;">Potential Value:</td>
                                <td style="padding: 8px 0; color: #1A1A1A; font-size: 14px; font-weight: 600; text-align: right;">R ${sampleProposal.creditValue.toLocaleString()}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 30px 0;">
                        This is a limited-time opportunity to maximize your return on investment while contributing to a sustainable future. Review the full details and take action today.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 10px 0;">
                            <a href="${sampleProposal.proposalUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); color: #1A1A1A; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 16px;">Review Full Proposal</a>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 30px 0 20px 0;">
                        Have questions? I'm here to help guide you through every step.
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 5px 0;">
                        Best regards,
                      </p>
                      <p style="font-size: 16px; color: #1A1A1A; font-weight: 600; margin: 5px 0 0 0;">
                        ${sampleProposal.agentName}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #1A1A1A; padding: 25px 30px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #CCCCCC; font-size: 14px;">
                        Crunch Carbon - Sustainable Energy Solutions
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        For support, contact us at <a href="mailto:support@crunchcarbon.app" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.app</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const result2 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.app>",
        to: [testEmail],
        subject: "Unlock Your Carbon Credit Benefits - Let's Get Started",
        html: template2,
      });
      console.log("Template 2 sent:", result2);
      results.push({ template: "opened_not_clicked", success: true, emailId: result2.id });
    } catch (error) {
      results.push({ template: "opened_not_clicked", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 3: Clicked but Not Signed
    try {
      const template3 = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Complete Your Carbon Credit Agreement</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px;">
                <table cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <tr>
                    <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">Complete Your Agreement</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 20px 0;">
                        Dear <strong>${sampleProposal.clientName}</strong>,
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 20px 0;">
                        You're just one step away from securing your carbon credit agreement! I see you've reviewed the proposal in detail - that's fantastic.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-left: 4px solid #F4C430; border-radius: 4px; margin: 30px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <h2 style="margin: 0 0 15px 0; color: #1A1A1A; font-size: 18px; font-weight: 600;">What Happens Next</h2>
                            <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                              <li><strong style="color: #1A1A1A;">Sign the agreement</strong> - Takes less than 2 minutes</li>
                              <li><strong style="color: #1A1A1A;">We process your application</strong> - Usually within 24 hours</li>
                              <li><strong style="color: #1A1A1A;">Start earning credits</strong> - Your project begins generating value</li>
                            </ul>
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF9E6; border: 1px solid #F4C430; border-radius: 4px; margin: 25px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <p style="margin: 0; color: #1A1A1A; font-size: 14px; line-height: 1.5;">
                              💡 <strong>Quick Tip:</strong> The sooner you sign, the sooner we can start processing your carbon credits and maximizing your returns.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 30px 0;">
                        All the terms are clearly outlined in the proposal. If you have any questions or concerns, I'm here to help clarify everything before you sign.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 10px 0;">
                            <a href="${sampleProposal.proposalUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); color: #1A1A1A; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 16px;">Sign Agreement Now</a>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 30px 0 20px 0;">
                        Looking forward to working with you!
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 5px 0;">
                        Best regards,
                      </p>
                      <p style="font-size: 16px; color: #1A1A1A; font-weight: 600; margin: 5px 0 0 0;">
                        ${sampleProposal.agentName}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #1A1A1A; padding: 25px 30px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #CCCCCC; font-size: 14px;">
                        Crunch Carbon - Sustainable Energy Solutions
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        For support, contact us at <a href="mailto:support@crunchcarbon.app" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.app</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const result3 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.app>",
        to: [testEmail],
        subject: "Just One Step Left - Sign Your Carbon Credit Agreement",
        html: template3,
      });
      console.log("Template 3 sent:", result3);
      results.push({ template: "clicked_not_signed", success: true, emailId: result3.id });
    } catch (error) {
      results.push({ template: "clicked_not_signed", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 4: Graceful Exit
    try {
      const template4 = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>We'll Keep Your Proposal on File</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px;">
                <table cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <tr>
                    <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">We're Here When You're Ready</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 20px 0;">
                        Dear <strong>${sampleProposal.clientName}</strong>,
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 20px 0;">
                        I understand that now might not be the right time for your carbon credit project. That's completely okay - these decisions should be made when the timing is right for you.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-left: 4px solid #F4C430; border-radius: 4px; margin: 30px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <h2 style="margin: 0 0 15px 0; color: #1A1A1A; font-size: 18px; font-weight: 600;">Your Proposal Stays Active</h2>
                            <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                              We'll keep your proposal on file. If you'd like to revisit this opportunity in the future, simply reach out to me directly. I'll be happy to walk you through everything again or answer any new questions.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 20px 0;">
                        In the meantime, feel free to contact me anytime if you have questions or if your circumstances change. The door is always open.
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 30px 0;">
                        Thank you for considering Crunch Carbon. I wish you all the best with your energy projects!
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 5px 0;">
                        Warm regards,
                      </p>
                      <p style="font-size: 16px; color: #1A1A1A; font-weight: 600; margin: 5px 0 0 0;">
                        ${sampleProposal.agentName}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #1A1A1A; padding: 25px 30px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #CCCCCC; font-size: 14px;">
                        Crunch Carbon - Sustainable Energy Solutions
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        For support, contact us at <a href="mailto:support@crunchcarbon.app" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.app</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const result4 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.app>",
        to: [testEmail],
        subject: "Thanks for Considering Crunch Carbon",
        html: template4,
      });
      console.log("Template 4 sent:", result4);
      results.push({ template: "graceful_exit", success: true, emailId: result4.id });
    } catch (error) {
      results.push({ template: "graceful_exit", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 5: Accepted Thank-You
    try {
      const template5 = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Crunch Carbon!</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px;">
                <table cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <tr>
                    <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">Welcome to Crunch Carbon! 🎉</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 20px 0;">
                        Dear <strong>${sampleProposal.clientName}</strong>,
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 20px 0;">
                        Congratulations! Thank you for accepting your carbon credit proposal. We're thrilled to have you join the Crunch Carbon family and embark on this sustainable journey together.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-left: 4px solid #F4C430; border-radius: 4px; margin: 30px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <h2 style="margin: 0 0 15px 0; color: #1A1A1A; font-size: 18px; font-weight: 600;">What Happens Next</h2>
                            <ol style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                              <li><strong style="color: #1A1A1A;">Complete Onboarding</strong> - We'll guide you through setting up your account</li>
                              <li><strong style="color: #1A1A1A;">Documentation Review</strong> - Our team will process your agreement</li>
                              <li><strong style="color: #1A1A1A;">Project Activation</strong> - Your carbon credit tracking begins</li>
                              <li><strong style="color: #1A1A1A;">Regular Updates</strong> - You'll receive progress reports and insights</li>
                            </ol>
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF9E6; border: 1px solid #F4C430; border-radius: 4px; margin: 25px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <p style="margin: 0; color: #1A1A1A; font-size: 14px; line-height: 1.5;">
                              📋 <strong>Next Step:</strong> Check your email for onboarding instructions. Complete your setup within the next 7 days to ensure a smooth start.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 20px 0;">
                        Our team is here to support you every step of the way. If you have any questions during onboarding or anytime after, don't hesitate to reach out.
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 30px 0;">
                        Together, we're making a real difference for the environment while creating value for your business!
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 5px 0;">
                        Excited to work with you,
                      </p>
                      <p style="font-size: 16px; color: #1A1A1A; font-weight: 600; margin: 5px 0 0 0;">
                        ${sampleProposal.agentName}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #1A1A1A; padding: 25px 30px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #CCCCCC; font-size: 14px;">
                        Crunch Carbon - Sustainable Energy Solutions
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        For support, contact us at <a href="mailto:support@crunchcarbon.app" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.app</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const result5 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.app>",
        to: [testEmail],
        subject: "🎉 Welcome to Crunch Carbon - Let's Get Started!",
        html: template5,
      });
      console.log("Template 5 sent:", result5);
      results.push({ template: "accepted_thank_you", success: true, emailId: result5.id });
    } catch (error) {
      results.push({ template: "accepted_thank_you", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 6: Cession Reminder
    try {
      const template6 = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Complete Your Onboarding</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px;">
                <table cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <tr>
                    <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">Complete Your Onboarding</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 20px 0;">
                        Hi <strong>${sampleProposal.clientName}</strong>,
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 20px 0;">
                        I noticed that your onboarding process hasn't been completed yet. To activate your carbon credit benefits and start tracking your project's impact, we need you to finish the final steps.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF9E6; border: 1px solid #F4C430; border-radius: 4px; margin: 25px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <p style="margin: 0; color: #1A1A1A; font-size: 14px; line-height: 1.5;">
                              ⚠️ <strong>Action Required:</strong> Please complete your onboarding within the next few days to ensure we can process your agreement and start your project on schedule.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-left: 4px solid #F4C430; border-radius: 4px; margin: 30px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <h2 style="margin: 0 0 15px 0; color: #1A1A1A; font-size: 18px; font-weight: 600;">What's Left to Do</h2>
                            <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                              <li><strong style="color: #1A1A1A;">Verify your account details</strong></li>
                              <li><strong style="color: #1A1A1A;">Submit required documentation</strong></li>
                              <li><strong style="color: #1A1A1A;">Confirm your project timeline</strong></li>
                            </ul>
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 10px 0;">
                            <a href="${sampleProposal.proposalUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); color: #1A1A1A; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 16px;">Continue Onboarding</a>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 30px 0 20px 0;">
                        If you're experiencing any issues or have questions about the onboarding process, I'm here to help. Just reply to this email or give me a call.
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 5px 0;">
                        Looking forward to getting you set up,
                      </p>
                      <p style="font-size: 16px; color: #1A1A1A; font-weight: 600; margin: 5px 0 0 0;">
                        ${sampleProposal.agentName}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #1A1A1A; padding: 25px 30px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #CCCCCC; font-size: 14px;">
                        Crunch Carbon - Sustainable Energy Solutions
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        For support, contact us at <a href="mailto:support@crunchcarbon.app" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.app</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const result6 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.app>",
        to: [testEmail],
        subject: "Complete Your Onboarding - Action Required",
        html: template6,
      });
      console.log("Template 6 sent:", result6);
      results.push({ template: "cession_reminder", success: true, emailId: result6.id });
    } catch (error) {
      results.push({ template: "cession_reminder", success: false, error: error.message });
    }

    await delay(600); // Avoid rate limit

    // Template 7: Onboarding Idle Help
    try {
      const template7 = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Need Help with Onboarding?</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px;">
                <table cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  
                  <tr>
                    <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">Need Help with Onboarding?</h1>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #ffffff; padding: 40px 30px;">
                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 20px 0;">
                        Hi <strong>${sampleProposal.client_name}</strong>,
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 20px 0;">
                        I wanted to check in and see how your onboarding is going. I noticed there hasn't been much activity recently, and I'm here to help if you've run into any challenges or have questions.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-left: 4px solid #F4C430; border-radius: 4px; margin: 30px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <h2 style="margin: 0 0 15px 0; color: #1A1A1A; font-size: 18px; font-weight: 600;">Common Questions We Can Help With</h2>
                            <ul style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;">
                              <li><strong style="color: #1A1A1A;">Technical difficulties</strong> accessing your account</li>
                              <li><strong style="color: #1A1A1A;">Questions about required documentation</strong></li>
                              <li><strong style="color: #1A1A1A;">Clarification on next steps</strong> in the process</li>
                              <li><strong style="color: #1A1A1A;">Timeline concerns</strong> or scheduling issues</li>
                            </ul>
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF9E6; border: 1px solid #F4C430; border-radius: 4px; margin: 25px 0;">
                        <tr>
                          <td style="padding: 15px;">
                            <p style="margin: 0; color: #1A1A1A; font-size: 14px; line-height: 1.5;">
                              💬 <strong>We're Here to Help:</strong> Don't hesitate to reach out - no question is too small! Our team is dedicated to making your onboarding as smooth as possible.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 20px 0;">
                        You can reply directly to this email, give me a call, or use the button below to resume your onboarding. Whatever works best for you!
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 10px 0;">
                            <a href="${onboardingUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); color: #1A1A1A; text-decoration: none; font-weight: 600; border-radius: 6px; font-size: 16px;">Resume Onboarding</a>
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; border-radius: 4px; margin: 30px 0;">
                        <tr>
                          <td style="padding: 20px;">
                            <h2 style="margin: 0 0 10px 0; color: #1A1A1A; font-size: 16px; font-weight: 600;">Contact Information</h2>
                            <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                              <strong style="color: #1A1A1A;">Email:</strong> support@crunchcarbon.app<br>
                              <strong style="color: #1A1A1A;">Available:</strong> Monday - Friday, 9 AM - 5 PM
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="font-size: 16px; color: #1A1A1A; line-height: 1.6; margin: 0 0 30px 0;">
                        Looking forward to helping you complete your setup!
                      </p>

                      <p style="font-size: 16px; color: #1A1A1A; margin: 0 0 5px 0;">
                        Best regards,
                      </p>
                      <p style="font-size: 16px; color: #1A1A1A; font-weight: 600; margin: 5px 0 0 0;">
                        ${sampleProposal.agent_name}
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="background-color: #1A1A1A; padding: 25px 30px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #CCCCCC; font-size: 14px;">
                        Crunch Carbon - Sustainable Energy Solutions
                      </p>
                      <p style="margin: 0; color: #999999; font-size: 12px;">
                        For support, contact us at <a href="mailto:support@crunchcarbon.app" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.app</a>
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const result7 = await resend.emails.send({
        from: "Crunch Carbon <proposals@crunchcarbon.app>",
        to: [testEmail],
        subject: "Need Help Completing Your Onboarding?",
        html: template7,
      });
      console.log("Template 7 sent:", result7);
      results.push({ template: "onboarding_idle_help", success: true, emailId: result7.id });
    } catch (error) {
      console.error("Error sending template 7:", error);
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
