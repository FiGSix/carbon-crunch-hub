import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { SignupVerificationEmail } from "./_templates/signup-verification.tsx";
import { PasswordResetEmail } from "./_templates/password-reset.tsx";
import { EmailChangeEmail } from "./_templates/email-change.tsx";

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);
const hookSecret = Deno.env.get("SEND_AUTH_EMAIL_HOOK_SECRET") as string;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    // Verify webhook signature
    const wh = new Webhook(hookSecret);
    const webhookData = wh.verify(payload, headers) as {
      user: {
        email: string;
        id: string;
      };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    const { user, email_data } = webhookData;
    const { email_action_type, token_hash, redirect_to } = email_data;

    // CRITICAL: Use our actual app URL, not email_data.site_url which returns Supabase's URL
    const siteUrl = Deno.env.get('SITE_URL') || 'https://crunch-carbon-hub.lovable.app';

    console.log("Processing auth email:", {
      type: email_action_type,
      email: user.email,
      token_hash_prefix: token_hash?.substring(0, 8),
      supabase_site_url: email_data.site_url,
      using_site_url: siteUrl,
    });

    // Map email_action_type to the correct EmailOtpType for verification
    // Supabase's verifyOtp requires specific types that match what was used internally
    const otpTypeMap: Record<string, string> = {
      'signup': 'signup',        // New user signup
      'invite': 'invite',        // Team invite
      'recovery': 'recovery',    // Password reset
      'email_change': 'email_change', // Email change confirmation
    };
    
    // Use the mapped type, defaulting to the original if not found
    const verifyType = otpTypeMap[email_action_type] || email_action_type;

    let html: string;
    let subject: string;

    // Generate appropriate email based on type
    switch (email_action_type) {
      case "signup":
      case "invite":
        html = await renderAsync(
          React.createElement(SignupVerificationEmail, {
            verificationUrl: `${siteUrl}/auth/callback?token_hash=${token_hash}&type=${verifyType}&redirect_to=${redirect_to}`,
            userEmail: user.email,
          })
        );
        subject = "Welcome to Crunch Carbon - Verify Your Email";
        break;

      case "recovery":
        html = await renderAsync(
          React.createElement(PasswordResetEmail, {
            resetUrl: `${siteUrl}/auth/callback?token_hash=${token_hash}&type=recovery&redirect_to=${redirect_to}`,
            userEmail: user.email,
          })
        );
        subject = "Reset Your Crunch Carbon Password";
        break;

      case "email_change":
        html = await renderAsync(
          React.createElement(EmailChangeEmail, {
            confirmUrl: `${siteUrl}/auth/callback?token_hash=${token_hash}&type=email_change&redirect_to=${redirect_to}`,
            userEmail: user.email,
          })
        );
        subject = "Confirm Your Email Change";
        break;

      default:
        throw new Error(`Unsupported email type: ${email_action_type}`);
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: "Crunch Carbon <noreply@crunchcarbon.com>",
      to: [user.email],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      throw error;
    }

    console.log("Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, emailId: data?.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
