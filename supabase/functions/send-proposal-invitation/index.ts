
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      proposalId, 
      clientEmail, 
      clientName, 
      invitationToken,
      projectName 
    }: InvitationRequest = await req.json();

    // Get site URL from environment variable, with fallback
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.crunchcarbon.app';

    // Construct invitation link
    const invitationLink = `${siteUrl}/proposals/view?token=${invitationToken}`;

    console.log(`Sending invitation email to ${clientEmail} for project ${projectName}`);
    console.log(`Invitation link: ${invitationLink}`);

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

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-proposal-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);
