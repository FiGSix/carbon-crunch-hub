
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { supabase } from "../_shared/supabase-client.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvitationRequest {
  proposalId: string;
  clientEmail: string;
  clientName: string;
  invitationToken: string;
  projectName: string;
  clientId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log the API key presence (not the actual key) for debugging
    const hasApiKey = !!Deno.env.get("RESEND_API_KEY");
    console.log(`RESEND_API_KEY is ${hasApiKey ? "set" : "not set"}`);
    
    if (!hasApiKey) {
      throw new Error("RESEND_API_KEY is not configured. Please set this environment variable.");
    }
    
    // Parse and validate request
    const requestData = await req.json();
    console.log("Received invitation request data:", JSON.stringify({
      ...requestData,
      invitationToken: requestData.invitationToken ? "[REDACTED]" : undefined,
    }));
    
    // Validate required fields
    const requiredFields = ['proposalId', 'clientEmail', 'invitationToken'];
    const missingFields = requiredFields.filter(field => !requestData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    const { 
      proposalId, 
      clientEmail, 
      clientName = 'Client', 
      invitationToken,
      projectName = 'Carbon Credit Project',
      clientId 
    }: InvitationRequest = requestData;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      throw new Error("Invalid email format");
    }
    
    // Get site URL from environment variable, with fallback
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.crunchcarbon.app';

    // Construct invitation link
    const invitationLink = `${siteUrl}/proposals/view?token=${invitationToken}`;

    console.log(`Sending invitation email to ${clientEmail} for project ${projectName}`);
    console.log(`Invitation link: ${invitationLink}`);

    // Send email with proper error handling
    try {
      const emailResponse = await resend.emails.send({
        from: "Carbon Credit Proposals <proposals@crunchcarbon.app>",
        to: [clientEmail],
        subject: `Proposal Invitation for ${projectName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Proposal Invitation</h1>
            <p>Hello ${clientName},</p>
            <p>You have been invited to review a carbon credit proposal for the project: <strong>${projectName}</strong>.</p>
            <p>To view the proposal, please click the link below:</p>
            <p style="text-align: center;">
              <a href="${invitationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Proposal</a>
            </p>
            <p>This invitation is valid for 48 hours. If you did not expect this invitation, please ignore this email.</p>
            <p>Best regards,<br>Your Carbon Credit Team</p>
          </div>
        `,
      });

      // Create a notification for the client if we have their ID
      if (clientId) {
        try {
          await supabase
            .from('notifications')
            .insert({
              user_id: clientId,
              title: "New Proposal Invitation",
              message: `You have been invited to review a proposal for project: ${projectName}`,
              type: "info",
              related_id: proposalId,
              related_type: "proposal",
              read: false,
              created_at: new Date().toISOString()
            });
            
          console.log("Client notification created successfully");
        } catch (notificationError) {
          console.error("Failed to create client notification:", notificationError);
          // We don't want to fail the whole request if just the notification fails
        }
      }

      console.log("Invitation email sent successfully:", emailResponse);

      return new Response(JSON.stringify({
        success: true,
        data: emailResponse
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    } catch (emailError: any) {
      console.error("Email service error:", emailError);
      console.error("Error details:", JSON.stringify({
        message: emailError.message,
        code: emailError.statusCode,
        name: emailError.name
      }));
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Email sending failed", 
          details: emailError.message,
          code: emailError.statusCode
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in send-proposal-invitation function:", error);
    console.error("Error details:", JSON.stringify({
      message: error.message,
      stack: error.stack
    }));
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
