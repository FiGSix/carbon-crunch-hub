
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
