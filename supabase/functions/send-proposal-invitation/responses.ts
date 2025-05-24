
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function createCorsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

export function createSuccessResponse(
  emailResponse: any,
  debug: { tokenUsed: string; proposalId: string; invitationLink: string }
): Response {
  return new Response(JSON.stringify({
    success: true,
    data: emailResponse,
    debug
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export function createEmailErrorResponse(emailError: any): Response {
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

export function createGeneralErrorResponse(error: any): Response {
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
