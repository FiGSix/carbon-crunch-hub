
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { supabase } from "../_shared/supabase-client.ts";
import { validateInvitationRequest } from "./validation.ts";
import { verifyTokenConsistency } from "./token-verification.ts";
import { EmailService } from "./email-service.ts";
import { createClientNotification } from "./notification-service.ts";
import { 
  createCorsResponse, 
  createSuccessResponse, 
  createEmailErrorResponse, 
  createGeneralErrorResponse 
} from "./responses.ts";
import type { InvitationRequest, EmailTemplateData } from "./types.ts";

const handler = async (req: Request): Promise<Response> => {
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
    
    // Get site URL from environment variable, with fallback
    const siteUrl = Deno.env.get('SITE_URL') || 'https://www.crunchcarbon.app';

    // Use the VERIFIED token from the database to construct invitation link
    const invitationLink = `${siteUrl}/proposals/view?token=${verifiedToken}`;

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
      proposalId
    };
    
    const emailTemplate = emailService.generateEmailTemplate(emailTemplateData);

    try {
      const emailResponse = await emailService.sendInvitationEmail(
        clientEmail,
        projectName,
        emailTemplate
      );

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
