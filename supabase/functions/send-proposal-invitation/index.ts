
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { supabase } from "../_shared/supabase-client.ts";
import { validateInvitationRequest } from "./validation.ts";
import { verifyTokenConsistency } from "./token-verification.ts";
import { EmailService } from "./email-service.ts";
import { createClientNotification } from "./notification-service.ts";
import { 
  corsHeaders,
  createCorsResponse, 
  createSuccessResponse, 
  createEmailErrorResponse, 
  createGeneralErrorResponse 
} from "./responses.ts";
import type { InvitationRequest, EmailTemplateData } from "./types.ts";

const handler = async (req: Request): Promise<Response> => {
  // Entry logging for debugging
  console.log("=== 🚀 SEND-PROPOSAL-INVITATION INVOKED ===");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Method:", req.method);
  console.log("Has Authorization header:", !!req.headers.get('authorization'));
  console.log("==========================================");

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  try {
    // Log the API key presence (not the actual key) for debugging
    const hasApiKey = !!Deno.env.get("RESEND_API_KEY");
    console.log(`RESEND_API_KEY is ${hasApiKey ? "set" : "not set"}`);
    
    if (!hasApiKey) {
      throw new Error("RESEND_API_KEY is not configured. Please set this environment variable.");
    }

    // Verify authentication (JWT required)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error("❌ Missing authorization header");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Authentication required. Please refresh your session and try again.",
          code: "AUTH_REQUIRED"
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("❌ Invalid or expired JWT token:", authError?.message);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Session expired. Please refresh the page and try again.",
          code: "AUTH_EXPIRED"
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log("✅ Authenticated user:", user.id);
    
    // Parse and validate request
    const requestData = await req.json();
    console.log("Received invitation request data:", JSON.stringify({
      ...requestData,
      invitationToken: requestData.invitationToken ? `${requestData.invitationToken.substring(0, 8)}...` : undefined,
    }));
    
    const validatedRequest: InvitationRequest = validateInvitationRequest(requestData);
    const { 
      proposalId, 
      clientEmail, 
      clientName, 
      invitationToken,
      projectName,
      clientId 
    } = validatedRequest;

    // CRITICAL: Verify the token from the request matches what's stored in the database
    const verifiedToken = await verifyTokenConsistency(proposalId, invitationToken, supabase);
    
    // Fetch agent email to CC them on the invitation
    const { data: proposalData } = await supabase
      .from('proposals')
      .select('agent_id')
      .eq('id', proposalId)
      .single();
    
    let agentEmail: string | undefined;
    let agentFirstName: string | undefined;
    let agentLastName: string | undefined;
    let agentCompanyName: string | undefined;
    
    if (proposalData?.agent_id) {
      const { data: agentProfile } = await supabase
        .from('profiles')
        .select('email, first_name, last_name, company_name')
        .eq('id', proposalData.agent_id)
        .single();
      
      agentEmail = agentProfile?.email;
      agentFirstName = agentProfile?.first_name;
      agentLastName = agentProfile?.last_name;
      agentCompanyName = agentProfile?.company_name;
      
      if (agentEmail) {
        console.log(`Agent will be CC'd: ${agentEmail}`);
      }
    }
    
    // Get site URL from environment variable, with fallback
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.crunchcarbon.app';

    // Use the VERIFIED token from the database to construct invitation link
    // Direct clients to main proposal view page
    const invitationLink = `${siteUrl}/proposals/${proposalId}?token=${verifiedToken}`;

    console.log(`Sending invitation email to ${clientEmail} for project ${projectName}`);
    console.log(`Invitation link: ${invitationLink}`);
    console.log(`Using verified token: ${verifiedToken.substring(0, 8)}...`);

    // Initialize email service and send email
    const emailService = new EmailService(Deno.env.get("RESEND_API_KEY")!);
    
    const emailTemplateData: EmailTemplateData = {
      clientName,
      projectName,
      invitationLink,
      tokenPreview: verifiedToken.substring(0, 8) + "...",
      proposalId,
      agentFirstName,
      agentLastName,
      agentCompanyName,
      agentEmail
    };
    
    const emailTemplate = emailService.generateEmailTemplate(emailTemplateData);

    try {
      const emailResponse = await emailService.sendInvitationEmail(
        clientEmail,
        projectName,
        emailTemplate,
        agentEmail
      );

      // Store the Resend message_id for webhook tracking
      if (emailResponse.id) {
        console.log(`📧 Storing message_id for webhook tracking: ${emailResponse.id}`);
        
        await supabase
          .from('proposal_automation_log')
          .insert({
            proposal_id: proposalId,
            automation_type: 'email_sent',
            email_type: 'initial_invite',
            email_message_id: emailResponse.id,
            details: {
              recipient: clientEmail,
              subject: `Carbon Credit Proposal: ${projectName}`,
              agent_email: agentEmail
            }
          });

        // Update proposal status to 'sent' and track email send time
        await supabase
          .from('proposals')
          .update({
            status: 'sent',
            last_email_event_type: 'email.sent',
            last_email_sent_at: new Date().toISOString(),
            invitation_sent_at: new Date().toISOString()
          })
          .eq('id', proposalId);
      }

      // Create a notification for the client if we have their ID
      if (clientId) {
        await createClientNotification(clientId, projectName, proposalId, supabase);
      }

      console.log("✅ Invitation email sent successfully:", emailResponse);
      console.log(`✅ Email sent with verified token: ${verifiedToken.substring(0, 8)}...`);

      return createSuccessResponse(emailResponse, {
        tokenUsed: verifiedToken.substring(0, 8) + "...",
        proposalId: proposalId,
        invitationLink: invitationLink
      });
    } catch (emailError: any) {
      return createEmailErrorResponse(emailError);
    }
  } catch (error: any) {
    return createGeneralErrorResponse(error);
  }
};

serve(handler);
