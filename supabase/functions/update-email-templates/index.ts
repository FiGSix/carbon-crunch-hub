import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: role } = await supabase.rpc("get_primary_role", { _user_id: user.id });
    if (role !== "admin") {
      throw new Error("Admin access required");
    }

    console.log("Updating email templates with new yellow-branded design...");

    // New templates with yellow branding and enhanced CTA buttons
    const updatedTemplates = {
      sent_not_delivered: {
        subject: "Your Proposal from Crunch Carbon - Delivery Pending",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F8F9FA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">Your Proposal is Ready!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi {{clientName}},
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                We wanted to ensure you received your solar proposal for <strong>{{projectName}}</strong>. It looks like our email may not have reached your inbox yet.
              </p>
              <div style="background-color: #F8F9FA; border-left: 4px solid #F4C430; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0; color: #555555; font-size: 15px; line-height: 1.6;">
                  <strong style="color: #1A1A1A;">📧 Please check your spam or junk folder</strong><br>
                  Sometimes our emails can end up there. If you find it, please mark it as "Not Spam" to ensure you receive future updates.
                </p>
              </div>
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Click below to view your proposal directly:
              </p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="{{proposalUrl}}" style="display: inline-block; background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); color: #1A1A1A; text-decoration: none; padding: 22px 50px; border-radius: 10px; font-weight: 700; font-size: 18px; letter-spacing: 0.5px; border: 2px solid #FFFFFF; box-shadow: 0 6px 20px rgba(244, 196, 48, 0.5);">
                  View Your Proposal →
                </a>
              </div>
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Need assistance? Reply to this email or contact us at <a href="mailto:support@crunchcarbon.com" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1A1A1A; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #FFFFFF; font-size: 14px;">
                <strong>Crunch Carbon</strong>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Empowering sustainable energy solutions
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      },
      delivered_not_opened: {
        subject: "Reminder: Your Solar Proposal from Crunch Carbon",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F8F9FA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">Don't Miss Your Solar Opportunity</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi {{clientName}},
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Just a friendly reminder that your solar proposal for <strong>{{projectName}}</strong> is ready to review.
              </p>
              <div style="background-color: #F8F9FA; border-left: 4px solid #F4C430; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #1A1A1A; font-size: 16px; font-weight: 600;">
                  ⚡ What's Inside Your Proposal:
                </p>
                <ul style="margin: 10px 0 0 20px; padding: 0; color: #555555; font-size: 15px; line-height: 1.8;">
                  <li>Customized system design for your property</li>
                  <li>Detailed financial projections and ROI</li>
                  <li>Carbon offset calculations</li>
                  <li>Flexible payment options</li>
                </ul>
              </div>
              <p style="margin: 30px 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Take a few minutes to review your proposal and see how solar can benefit you:
              </p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="{{proposalUrl}}" style="display: inline-block; background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); color: #1A1A1A; text-decoration: none; padding: 22px 50px; border-radius: 10px; font-weight: 700; font-size: 18px; letter-spacing: 0.5px; border: 2px solid #FFFFFF; box-shadow: 0 6px 20px rgba(244, 196, 48, 0.5);">
                  Review Full Proposal →
                </a>
              </div>
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Questions? We're here to help at <a href="mailto:support@crunchcarbon.com" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1A1A1A; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #FFFFFF; font-size: 14px;">
                <strong>Crunch Carbon</strong>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Empowering sustainable energy solutions
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      },
      opened_not_clicked: {
        subject: "Ready to Move Forward? Your Solar Proposal Awaits",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F8F9FA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">Let's Get Your Solar Journey Started</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi {{clientName}},
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                We noticed you opened your solar proposal for <strong>{{projectName}}</strong>. We hope you found it informative!
              </p>
              <div style="background-color: #F8F9FA; border-left: 4px solid #F4C430; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #1A1A1A; font-size: 16px; font-weight: 600;">
                  🌟 Your Next Steps:
                </p>
                <ol style="margin: 10px 0 0 20px; padding: 0; color: #555555; font-size: 15px; line-height: 1.8;">
                  <li>Review the full proposal details</li>
                  <li>Check the financial breakdown</li>
                  <li>Accept the proposal to begin</li>
                  <li>We'll guide you through onboarding</li>
                </ol>
              </div>
              <p style="margin: 30px 0 10px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Have questions or need clarification on any aspect? We're happy to discuss your proposal in detail.
              </p>
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                When you're ready, access your proposal here:
              </p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="{{proposalUrl}}" style="display: inline-block; background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); color: #1A1A1A; text-decoration: none; padding: 22px 50px; border-radius: 10px; font-weight: 700; font-size: 18px; letter-spacing: 0.5px; border: 2px solid #FFFFFF; box-shadow: 0 6px 20px rgba(244, 196, 48, 0.5);">
                  View Proposal →
                </a>
              </div>
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Need help? Reach out at <a href="mailto:support@crunchcarbon.com" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1A1A1A; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #FFFFFF; font-size: 14px;">
                <strong>Crunch Carbon</strong>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Empowering sustainable energy solutions
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      },
      clicked_not_signed: {
        subject: "Final Step: Sign Your Solar Agreement",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F8F9FA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">You're Almost There!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi {{clientName}},
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                You're just one step away from starting your solar journey with <strong>{{projectName}}</strong>!
              </p>
              <div style="background-color: #F8F9FA; border-left: 4px solid #F4C430; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #1A1A1A; font-size: 16px; font-weight: 600;">
                  ✅ What Happens After You Sign:
                </p>
                <ul style="margin: 10px 0 0 20px; padding: 0; color: #555555; font-size: 15px; line-height: 1.8;">
                  <li>Immediate access to your client portal</li>
                  <li>Guided onboarding process</li>
                  <li>Dedicated support team assigned</li>
                  <li>Project timeline and milestones</li>
                </ul>
              </div>
              <p style="margin: 30px 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Complete your agreement now to lock in your proposal terms:
              </p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="{{proposalUrl}}" style="display: inline-block; background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); color: #1A1A1A; text-decoration: none; padding: 22px 50px; border-radius: 10px; font-weight: 700; font-size: 18px; letter-spacing: 0.5px; border: 2px solid #FFFFFF; box-shadow: 0 6px 20px rgba(244, 196, 48, 0.5);">
                  Sign Agreement Now →
                </a>
              </div>
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Questions before signing? Contact us at <a href="mailto:support@crunchcarbon.com" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1A1A1A; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #FFFFFF; font-size: 14px;">
                <strong>Crunch Carbon</strong>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Empowering sustainable energy solutions
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      },
      graceful_exit: {
        subject: "We're Here When You're Ready - Crunch Carbon",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F8F9FA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">No Pressure, No Problem</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi {{clientName}},
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                We understand that timing isn't always right, and that's perfectly okay. Your solar proposal for <strong>{{projectName}}</strong> will remain available whenever you're ready to revisit it.
              </p>
              <div style="background-color: #F8F9FA; border-left: 4px solid #F4C430; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #1A1A1A; font-size: 16px; font-weight: 600;">
                  💡 A Few Things to Remember:
                </p>
                <ul style="margin: 10px 0 0 20px; padding: 0; color: #555555; font-size: 15px; line-height: 1.8;">
                  <li>Your proposal remains accessible anytime</li>
                  <li>No expiration on reviewing your options</li>
                  <li>We're here to answer questions when needed</li>
                  <li>Solar incentives and savings are always evolving</li>
                </ul>
              </div>
              <p style="margin: 30px 0 10px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Feel free to reach out whenever you have questions or want to discuss solar options for your property. There's no obligation, just helpful information.
              </p>
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Stay in touch: <a href="mailto:support@crunchcarbon.com" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1A1A1A; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #FFFFFF; font-size: 14px;">
                <strong>Crunch Carbon</strong>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Empowering sustainable energy solutions
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      },
      accepted_thank_you: {
        subject: "Welcome to Crunch Carbon! Next Steps for {{projectName}}",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F8F9FA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">🎉 Congratulations!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi {{clientName}},
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Thank you for accepting your solar proposal for <strong>{{projectName}}</strong>! We're excited to help you transition to clean, sustainable energy.
              </p>
              <div style="background-color: #F8F9FA; border-left: 4px solid #F4C430; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #1A1A1A; font-size: 16px; font-weight: 600;">
                  🚀 What Happens Next:
                </p>
                <ol style="margin: 10px 0 0 20px; padding: 0; color: #555555; font-size: 15px; line-height: 1.8;">
                  <li><strong>Complete Onboarding</strong> - Provide a few final details</li>
                  <li><strong>Document Upload</strong> - Certificate of Compliance & Invoice</li>
                  <li><strong>System Access</strong> - Connect your inverter portal</li>
                  <li><strong>Carbon Credit Generation</strong> - Start earning!</li>
                </ol>
              </div>
              <p style="margin: 30px 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Begin your onboarding process now to complete your project setup:
              </p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="{{onboardingUrl}}" style="display: inline-block; background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); color: #1A1A1A; text-decoration: none; padding: 22px 50px; border-radius: 10px; font-weight: 700; font-size: 18px; letter-spacing: 0.5px; border: 2px solid #FFFFFF; box-shadow: 0 6px 20px rgba(244, 196, 48, 0.5);">
                  Start Onboarding →
                </a>
              </div>
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Need assistance? Our support team is ready to help at <a href="mailto:support@crunchcarbon.com" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1A1A1A; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #FFFFFF; font-size: 14px;">
                <strong>Crunch Carbon</strong>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Empowering sustainable energy solutions
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      },
      onboarding_idle_help: {
        subject: "Need Help with Onboarding? We're Here for You",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F8F9FA;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8F9FA; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #1A1A1A; font-size: 28px; font-weight: 700;">We're Here to Help!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi {{clientName}},
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                We noticed you haven't completed the onboarding process for <strong>{{projectName}}</strong> yet. We understand that gathering the required information can sometimes be challenging.
              </p>
              <div style="background-color: #F8F9FA; border-left: 4px solid #F4C430; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #1A1A1A; font-size: 16px; font-weight: 600;">
                  📋 Common Questions We Can Help With:
                </p>
                <ul style="margin: 10px 0 0 20px; padding: 0; color: #555555; font-size: 15px; line-height: 1.8;">
                  <li>Where to find your Certificate of Compliance (CoC)</li>
                  <li>Which documents are acceptable as invoices</li>
                  <li>How to access your inverter portal credentials</li>
                  <li>Understanding the onboarding requirements</li>
                </ul>
              </div>
              <p style="margin: 30px 0 10px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Don't let documentation hold you back from earning carbon credits. Our team is ready to guide you through each step of the process.
              </p>
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Continue where you left off:
              </p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="{{onboardingUrl}}" style="display: inline-block; background: linear-gradient(135deg, #F4C430 0%, #E6B800 100%); color: #1A1A1A; text-decoration: none; padding: 22px 50px; border-radius: 10px; font-weight: 700; font-size: 18px; letter-spacing: 0.5px; border: 2px solid #FFFFFF; box-shadow: 0 6px 20px rgba(244, 196, 48, 0.5);">
                  Continue Onboarding →
                </a>
              </div>
              <div style="background-color: #FFF9E6; border: 1px solid #F4C430; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="margin: 0 0 10px 0; color: #1A1A1A; font-size: 15px; font-weight: 600;">
                  💬 Prefer to Talk?
                </p>
                <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.6;">
                  Reply to this email or call our support team. We'll walk you through the entire process step-by-step.
                </p>
              </div>
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Email us anytime: <a href="mailto:support@crunchcarbon.com" style="color: #F4C430; text-decoration: none;">support@crunchcarbon.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #1A1A1A; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #FFFFFF; font-size: 14px;">
                <strong>Crunch Carbon</strong>
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                Empowering sustainable energy solutions
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      }
    };

    // Update the system_settings table
    const { error: updateError } = await supabase
      .from("system_settings")
      .upsert({
        setting_key: "email_automation_templates",
        setting_value: updatedTemplates,
        description: "Email templates for proposal automation workflow",
        updated_at: new Date().toISOString()
      });

    if (updateError) {
      console.error("Error updating templates:", updateError);
      throw updateError;
    }

    console.log("Successfully updated all 7 email templates with new design");

    return new Response(
      JSON.stringify({
        success: true,
        message: "All 7 email templates updated successfully with yellow-branded design",
        templates_updated: Object.keys(updatedTemplates)
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in update-email-templates:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
