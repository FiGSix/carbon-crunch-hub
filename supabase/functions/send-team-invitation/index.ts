import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TeamInvitationRequest {
  email: string;
  firstName?: string;
  lastName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("❌ No authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the user from the auth header
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("❌ Auth error:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ User authenticated:", user.id);

    // Get user roles from user_roles table
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (rolesError) {
      console.error("❌ Roles fetch error:", rolesError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to verify user permissions" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const roles = userRoles?.map(r => r.role) || [];
    const isAdmin = roles.includes("admin");
    
    // Get profile for agent status check
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("agent_status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("❌ Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ success: false, error: "User profile not found" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const isActiveAgent = roles.includes("agent") && profile.agent_status === "active";

    // Check authorization: Must be admin OR active agent
    if (!isAdmin && !isActiveAgent) {
      console.error("❌ Authorization failed: Not admin or active agent", { roles, agent_status: profile.agent_status });
      return new Response(
        JSON.stringify({ success: false, error: "Only admins or active agents can send team invitations" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Authorization passed:", { isAdmin, isActiveAgent });

    // Get user's company
    const { data: membership, error: membershipError } = await supabase
      .from("company_members")
      .select("company_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (membershipError || !membership) {
      console.error("❌ Membership fetch error:", membershipError);
      return new Response(
        JSON.stringify({ success: false, error: "User is not part of any company" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is a team lead (optional - could allow all members to invite)
    if (membership.role !== "team_lead") {
      console.error("❌ Authorization failed: Not a team lead");
      return new Response(
        JSON.stringify({ success: false, error: "Only team leads can send invitations" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("company_name")
      .eq("id", membership.company_id)
      .single();

    if (companyError || !company) {
      console.error("Company fetch error:", companyError);
      throw new Error("Company not found");
    }

    console.log("✅ Company found:", company.company_name);

    const { email, firstName, lastName }: TeamInvitationRequest = await req.json();

    // Validate email
    if (!email || !email.includes("@")) {
      console.error("❌ Invalid email:", email);
      return new Response(
        JSON.stringify({ success: false, error: "Valid email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user with this email already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    if (existingUser) {
      console.error("❌ User already exists:", normalizedEmail);
      return new Response(
        JSON.stringify({ success: false, error: "A user with this email already exists" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if there's already a pending invitation for this email to this company
    const { data: existingInvitation } = await supabase
      .from("team_invitations")
      .select("id")
      .eq("email", normalizedEmail)
      .eq("company_id", membership.company_id)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingInvitation) {
      console.error("❌ Invitation already sent:", normalizedEmail);
      return new Response(
        JSON.stringify({ success: false, error: "An invitation has already been sent to this email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Generate secure invitation token
    const invitationToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours expiry

    // Create team invitation
    const { data: invitation, error: invitationError } = await supabase
      .from("team_invitations")
      .insert({
        email: normalizedEmail,
        first_name: firstName || null,
        last_name: lastName || null,
        company_id: membership.company_id,
        invitation_token: invitationToken,
        invited_by: user.id,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (invitationError) {
      console.error("❌ Invitation creation error:", invitationError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("✅ Invitation created:", invitation.id);

    // Get inviter's name
    const { data: inviterProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();

    const inviterName = inviterProfile
      ? `${inviterProfile.first_name || ""} ${inviterProfile.last_name || ""}`.trim()
      : "A team member";

    // Create registration link
    const registrationUrl = `${Deno.env.get("APP_URL") || "https://uyjryuopuqgmsvayiccl.supabase.co"}/register?token=${invitationToken}`;

    // Send email invitation
    const emailResponse = await resend.emails.send({
      from: "CrunchCarbon <onboarding@resend.dev>",
      to: [email],
      subject: `You've been invited to join ${company.company_name} on CrunchCarbon`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 8px 8px 0 0;
                text-align: center;
              }
              .content {
                background: #ffffff;
                padding: 30px;
                border: 1px solid #e5e7eb;
                border-top: none;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white !important;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
              }
              .footer {
                background: #f9fafb;
                padding: 20px;
                border-radius: 0 0 8px 8px;
                border: 1px solid #e5e7eb;
                border-top: none;
                font-size: 14px;
                color: #6b7280;
              }
              .expiry {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 12px;
                margin: 20px 0;
                border-radius: 4px;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">Team Invitation</h1>
            </div>
            <div class="content">
              <p>Hi${firstName ? ` ${firstName}` : ""},</p>
              
              <p><strong>${inviterName}</strong> has invited you to join <strong>${company.company_name}</strong> on CrunchCarbon, the platform for managing carbon credit projects.</p>
              
              <p>As part of the team, you'll be able to:</p>
              <ul>
                <li>Collaborate on carbon credit proposals</li>
                <li>Manage client projects together</li>
                <li>Access shared company resources</li>
                <li>Track team performance and metrics</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${registrationUrl}" class="button">Accept Invitation & Sign Up</a>
              </div>
              
              <div class="expiry">
                ⏰ <strong>Note:</strong> This invitation expires in 48 hours
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                If you're unable to click the button, copy and paste this link into your browser:<br/>
                <a href="${registrationUrl}" style="color: #667eea; word-break: break-all;">${registrationUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
              <p style="margin: 10px 0 0 0;">
                Questions? Contact us at support@crunchcarbon.com
              </p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("✅ Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Team invitation sent successfully",
        invitation: {
          id: invitation.id,
          email: invitation.email,
          expiresAt: invitation.expires_at,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("❌ Unexpected error in send-team-invitation:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unexpected error occurred while sending the invitation",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
