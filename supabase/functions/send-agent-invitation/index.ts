import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";

interface InvitationRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User authenticated:", user.id);

    // Check if user is admin by querying profiles directly
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log("User role check:", { userId: user.id, role: profileData?.role, error: profileError });

    if (profileError || !profileData || profileData.role !== 'admin') {
      console.error("Admin check failed:", { profileError, profileData });
      return new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, firstName, lastName, companyName }: InvitationRequest = await req.json();

    console.log("Processing invitation for:", email);

    // Validate email
    if (!email || !email.includes("@")) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if invitation already exists
    const { data: existingInvitation, error: invitationCheckError } = await supabase
      .from("agent_invitations")
      .select("id, status")
      .eq("email", email)
      .single();

    console.log("Existing invitation check:", { exists: !!existingInvitation, status: existingInvitation?.status });

    if (existingInvitation && existingInvitation.status === 'pending') {
      console.log("Duplicate invitation attempt:", email);
      return new Response(
        JSON.stringify({ error: "An invitation has already been sent to this email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists with this email
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    console.log("Existing profile check:", { exists: !!existingProfile, error: profileCheckError });

    if (existingProfile) {
      console.log("User already exists:", email);
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure invitation token
    const invitationToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    console.log("Creating invitation record for:", email);

    // Insert invitation into database
    const { data: invitation, error: invitationError } = await supabase
      .from("agent_invitations")
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        invited_by: user.id,
      })
      .select()
      .single();

    if (invitationError) {
      console.error("Error creating invitation:", invitationError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate registration link using production domain
    const registrationLink = `https://crunchcarbon.app/register?role=agent&token=${invitationToken}`;

    console.log("Sending invitation email to:", email);

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "CrunchCarbon <noreply@crunchcarbon.app>",
      to: [email],
      subject: "You're Invited to Join CrunchCarbon as an Agent",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F4C430 0%, #D4A017 100%); color: #1A1A1A; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: linear-gradient(135deg, #F4C430 0%, #D4A017 100%); color: #1A1A1A; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; box-shadow: 0 4px 6px rgba(244, 196, 48, 0.3); }
            .benefits { background: #FFF9E6; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .benefit-item { margin: 10px 0; padding-left: 25px; position: relative; }
            .benefit-item:before { content: "✓"; position: absolute; left: 0; color: #F4C430; font-weight: bold; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">You're Invited! 🎉</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName || 'there'},</p>
              
              <p>You've been invited to join <strong>CrunchCarbon</strong> as an Agent Partner!</p>
              
              <div class="benefits">
                <h3 style="margin-top: 0;">As an agent, you'll be able to:</h3>
                <div class="benefit-item">Create carbon credit proposals in minutes</div>
                <div class="benefit-item">Manage your client portfolio</div>
                <div class="benefit-item">Earn commission on successful projects</div>
                <div class="benefit-item">Track project onboarding and audit status</div>
              </div>
              
              <p>Click the button below to complete your registration:</p>
              
              <center>
                <a href="${registrationLink}" class="button">Accept Invitation</a>
              </center>
              
              <p style="color: #dc2626; font-weight: bold;">⏰ This invitation expires in 48 hours.</p>
              
              <p>If you have any questions, feel free to reply to this email.</p>
              
              <p>Best regards,<br>The CrunchCarbon Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Invitation email sent:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        invitation,
        message: `Invitation sent to ${email}`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-agent-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
