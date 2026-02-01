/**
 * Partner API v1 - Main Router
 * 
 * RESTful API for third-party platform integration
 * Handles authentication, rate limiting, routing, and logging
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { corsHeaders } from '../_shared/cors.ts';
import { 
  extractApiKey, 
  validateApiKey, 
  hasScope, 
  checkRateLimit, 
  generateRequestId,
  logApiRequest 
} from '../_shared/partner-auth.ts';
import { 
  corsPreflightResponse, 
  unauthorizedResponse, 
  scopeInsufficientResponse,
  rateLimitedResponse,
  notFoundResponse,
  internalErrorResponse,
  validationErrorResponse,
  successResponse
} from '../_shared/partner-responses.ts';
import { PartnerAuthInfo, ApiScope } from '../_shared/partner-types.ts';
import { 
  validateCreateProposal,
  validateUpdateOnboarding,
  validateDocumentPresign,
  validateDataAccessConfig,
  validateCreateWebhook,
  validateUUID
} from '../_shared/partner-validation.ts';

// =============================================================================
// Constants
// =============================================================================

const API_VERSION = 'v1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') || 'https://crunchcarbon.com';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

// Carbon Calculation Constants (from src/services/calculations/carbon/constants.ts)
const ANNUAL_GENERATION_FACTOR = 1642.50; // kWh per kWp per year
const EMISSION_FACTOR = 1.0334; // tCO₂e per MWh

// Carbon prices per year (from system_settings / memory)
const CARBON_PRICES: Record<string, number> = {
  '2025': 97.34,
  '2026': 127.03,
  '2027': 143.12,
  '2028': 158.79,
  '2029': 174.88,
  '2030': 190.55,
};
const SIX_YEAR_PRICE_SUM = 891.71; // Sum of all year prices for 6-year revenue calculation

// =============================================================================
// Email Template Helper
// =============================================================================

interface EmailTemplateParams {
  clientName: string;
  projectName: string;
  invitationLink: string;
  systemSize?: string;
  carbonCredits?: number;
  partnerName?: string;
  partnerLogoUrl?: string;
}

function generateProposalEmailHtml(params: EmailTemplateParams): string {
  const { clientName, projectName, invitationLink, systemSize, carbonCredits, partnerName, partnerLogoUrl } = params;
  
  const partnerAttribution = partnerName 
    ? `<p style="color: #666; font-size: 14px; margin-top: 20px;">Created in partnership with <strong>${partnerName}</strong></p>`
    : '';
  
  const systemInfo = systemSize && carbonCredits
    ? `<p style="color: #333; margin: 10px 0;"><strong>System Size:</strong> ${systemSize}<br><strong>Estimated Carbon Credits:</strong> ${carbonCredits} per year</p>`
    : '';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="https://crunchcarbon.com/crunch-carbon-logo.png" alt="Crunch Carbon" style="height: 40px;" />
  </div>
  
  <h1 style="color: #16a34a; font-size: 24px;">Carbon Credit Proposal</h1>
  
  <p>Dear ${clientName},</p>
  
  <p>You have been invited to review and accept a carbon credit proposal for <strong>${projectName}</strong>.</p>
  
  ${systemInfo}
  
  <p>By participating in Crunch Carbon's carbon credit program, you can monetize the environmental benefits of your solar installation.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${invitationLink}" style="background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Proposal</a>
  </div>
  
  <p style="color: #666; font-size: 14px;">This link will expire in 10 days. If you have any questions, please contact us at support@crunchcarbon.com.</p>
  
  ${partnerAttribution}
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  
  <p style="color: #999; font-size: 12px; text-align: center;">
    Crunch Carbon | Monetizing Solar Energy's Environmental Impact<br>
    <a href="https://crunchcarbon.com" style="color: #16a34a;">crunchcarbon.com</a>
  </p>
</body>
</html>`;
}

// =============================================================================
// Route Definitions
// =============================================================================

interface RouteConfig {
  method: string;
  pattern: RegExp;
  scope: ApiScope;
  handler: (req: Request, auth: PartnerAuthInfo, params: Record<string, string>, requestId: string) => Promise<Response>;
}

// =============================================================================
// Main Handler
// =============================================================================

serve(async (req: Request): Promise<Response> => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  console.log(`[PartnerAPI] ${requestId} - ${req.method} ${new URL(req.url).pathname}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return corsPreflightResponse();
  }
  
  try {
    // Parse URL
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/partner-api/, '');
    
    // Health check (no auth required)
    if (path === '/health' || path === '/v1/health') {
      return successResponse({ status: 'ok', version: API_VERSION }, requestId);
    }
    
    // Extract and validate API key
    const authHeader = req.headers.get('Authorization');
    const apiKey = extractApiKey(authHeader);
    
    if (!apiKey) {
      return unauthorizedResponse(requestId, 'Missing or invalid Authorization header');
    }
    
    const auth = await validateApiKey(apiKey);
    if (!auth) {
      return unauthorizedResponse(requestId, 'Invalid API key');
    }
    
    // Check rate limits
    const rateLimit = checkRateLimit(auth.apiKeyId, auth.rateLimitPerMinute, auth.rateLimitPerDay);
    if (!rateLimit.allowed) {
      return rateLimitedResponse(requestId, rateLimit.retryAfter!, {
        limit: auth.rateLimitPerMinute,
        remaining: rateLimit.remaining,
        reset: rateLimit.reset,
      });
    }
    
    const rateLimitInfo = {
      limit: auth.rateLimitPerMinute,
      remaining: rateLimit.remaining,
      reset: rateLimit.reset,
    };
    
    // Route the request
    const response = await routeRequest(req, path, auth, requestId, rateLimitInfo);
    
    // Log the request (async, don't await)
    const duration = Date.now() - startTime;
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || null;
    
    logApiRequest(
      auth.partnerId,
      auth.apiKeyId,
      requestId,
      req.method,
      path,
      response.status,
      null, // Request body (will be set by handlers)
      null, // Response body
      clientIp,
      duration
    ).catch(err => console.error('[PartnerAPI] Log error:', err));
    
    return response;
    
  } catch (error) {
    console.error(`[PartnerAPI] ${requestId} - Error:`, error);
    return internalErrorResponse(requestId);
  }
});

// =============================================================================
// Router
// =============================================================================

async function routeRequest(
  req: Request,
  path: string,
  auth: PartnerAuthInfo,
  requestId: string,
  rateLimit: { limit: number; remaining: number; reset: number }
): Promise<Response> {
  const method = req.method;
  
  // Remove /v1 prefix if present
  const normalizedPath = path.replace(/^\/v1/, '');
  
  // Route matching
  const routes: RouteConfig[] = [
    // Proposals
    { method: 'POST', pattern: /^\/proposals$/, scope: 'proposals:create', handler: handleCreateProposal },
    { method: 'GET', pattern: /^\/proposals$/, scope: 'proposals:read', handler: handleListProposals },
    { method: 'GET', pattern: /^\/proposals\/lookup$/, scope: 'proposals:read', handler: handleLookupProposal },
    { method: 'GET', pattern: /^\/proposals\/([^/]+)$/, scope: 'proposals:read', handler: handleGetProposal },
    { method: 'POST', pattern: /^\/proposals\/([^/]+)\/send-acceptance-link$/, scope: 'proposals:send', handler: handleSendAcceptanceLink },
    
    // Projects
    { method: 'GET', pattern: /^\/projects$/, scope: 'projects:read', handler: handleListProjects },
    { method: 'GET', pattern: /^\/projects\/([^/]+)$/, scope: 'projects:read', handler: handleGetProject },
    { method: 'PATCH', pattern: /^\/projects\/([^/]+)\/onboarding$/, scope: 'projects:onboarding:write', handler: handleUpdateOnboarding },
    { method: 'POST', pattern: /^\/projects\/([^/]+)\/onboarding\/submit$/, scope: 'projects:onboarding:write', handler: handleSubmitOnboarding },
    { method: 'POST', pattern: /^\/projects\/([^/]+)\/documents\/presign$/, scope: 'projects:documents:write', handler: handleDocumentPresign },
    { method: 'POST', pattern: /^\/projects\/([^/]+)\/documents\/([^/]+)\/confirm$/, scope: 'projects:documents:write', handler: handleDocumentConfirm },
    { method: 'POST', pattern: /^\/projects\/([^/]+)\/documents$/, scope: 'projects:documents:write', handler: handleDocumentUrl },
    { method: 'POST', pattern: /^\/projects\/([^/]+)\/data-access$/, scope: 'projects:data_access:write', handler: handleConfigureDataAccess },
    
    // Clients
    { method: 'GET', pattern: /^\/clients\/([^/]+)\/projects$/, scope: 'clients:read', handler: handleClientProjects },
    
    // Webhooks
    { method: 'POST', pattern: /^\/webhooks$/, scope: 'webhooks:manage', handler: handleCreateWebhook },
    { method: 'GET', pattern: /^\/webhooks$/, scope: 'webhooks:manage', handler: handleListWebhooks },
    { method: 'GET', pattern: /^\/webhooks\/([^/]+)$/, scope: 'webhooks:manage', handler: handleGetWebhook },
    { method: 'DELETE', pattern: /^\/webhooks\/([^/]+)$/, scope: 'webhooks:manage', handler: handleDeleteWebhook },
    { method: 'POST', pattern: /^\/webhooks\/([^/]+)\/verify$/, scope: 'webhooks:manage', handler: handleVerifyWebhook },
    { method: 'GET', pattern: /^\/webhooks\/([^/]+)\/deliveries$/, scope: 'webhooks:manage', handler: handleWebhookDeliveries },
  ];
  
  for (const route of routes) {
    if (route.method !== method) continue;
    
    const match = normalizedPath.match(route.pattern);
    if (!match) continue;
    
    // Check scope
    if (!hasScope(auth, route.scope)) {
      return scopeInsufficientResponse(requestId, route.scope);
    }
    
    // Extract path parameters
    const params: Record<string, string> = {};
    if (match.length > 1) {
      params.id = match[1];
    }
    if (match.length > 2) {
      params.id2 = match[2];
    }
    
    // Call handler
    return route.handler(req, auth, params, requestId);
  }
  
  return notFoundResponse(requestId, 'Endpoint');
}

// =============================================================================
// Handlers - Proposals
// =============================================================================

async function handleCreateProposal(
  req: Request,
  auth: PartnerAuthInfo,
  _params: Record<string, string>,
  requestId: string
): Promise<Response> {
  try {
    const body = await req.json();
    const validation = validateCreateProposal(body);
    
    if (!validation.success) {
      const firstError = validation.errors![0];
      return validationErrorResponse(requestId, firstError.message, firstError.field, firstError.received);
    }
    
    const data = validation.data!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Check for duplicate partner_reference_id
    if (data.partner_reference_id) {
      const { data: existing } = await supabase
        .from('proposals')
        .select('id')
        .eq('partner_id', auth.partnerId)
        .eq('partner_reference_id', data.partner_reference_id)
        .is('deleted_at', null)
        .single();
      
      if (existing) {
        return validationErrorResponse(
          requestId,
          'partner_reference_id already exists for this partner',
          'partner_reference_id',
          data.partner_reference_id
        );
      }
    }
    
    // Check for fuzzy duplicates
    const { data: duplicates } = await supabase.rpc('check_proposal_duplicates', {
      p_partner_id: auth.partnerId,
      p_client_email: data.client.email,
      p_address: data.project.address,
      p_commissioning_date: data.project.commissioning_date,
    });
    
    if (duplicates && duplicates.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'DUPLICATE_PROPOSAL',
            message: 'Possible duplicate proposal found',
          },
          matches: duplicates.map((d: Record<string, unknown>) => ({
            proposal_id: d.proposal_id,
            status: d.status,
            created_at: d.created_at,
            partner_reference_id: d.partner_reference_id,
          })),
          request_id: requestId,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Find or create client using Partner API specific RPC (no agent required)
    const { data: clientId, error: clientError } = await supabase.rpc('find_or_create_client_for_partner_api', {
      p_email: data.client.email,
      p_first_name: data.client.first_name,
      p_last_name: data.client.last_name,
      p_phone: data.client.phone || null,
      p_company_name: data.client.company_name || null,
      p_partner_id: auth.partnerId,
    });
    
    if (clientError) {
      console.error('[PartnerAPI] Client creation error:', clientError);
      return internalErrorResponse(requestId);
    }
    
    // Calculate estimates using CORRECT formulas (matching src/services/calculations/carbon)
    const systemSizeKWp = data.project.system_size_kwp;
    // Annual energy in kWh = kWp × generation factor
    const annualEnergyKWh = systemSizeKWp * ANNUAL_GENERATION_FACTOR;
    // Carbon credits (tCO₂e) = (kWh / 1000) × emission factor
    const creditsPerYear = (annualEnergyKWh / 1000) * EMISSION_FACTOR;
    
    // Get client portfolio for tier calculation
    const { data: clientPortfolio } = await supabase
      .from('proposals')
      .select('system_size_kwp')
      .eq('client_reference_id', clientId)
      .is('deleted_at', null)
      .not('system_size_kwp', 'is', null);
    
    const existingPortfolioKWp = clientPortfolio?.reduce((sum, p) => sum + (p.system_size_kwp || 0), 0) || 0;
    const totalPortfolioKWp = existingPortfolioKWp + systemSizeKWp;
    
    // Calculate client share percentage based on total portfolio tier (MWp)
    const totalPortfolioMWp = totalPortfolioKWp / 1000;
    let clientSharePercentage: number;
    if (totalPortfolioMWp <= 5) clientSharePercentage = 60.20;
    else if (totalPortfolioMWp <= 10) clientSharePercentage = 63;
    else if (totalPortfolioMWp <= 20) clientSharePercentage = 66.5;
    else if (totalPortfolioMWp <= 30) clientSharePercentage = 68.25;
    else clientSharePercentage = 70;
    
    // Calculate 6-year revenue using actual carbon prices
    const revenue6yr = Math.round(
      creditsPerYear * SIX_YEAR_PRICE_SUM * (clientSharePercentage / 100)
    );
    
    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);
    
    // Create proposal with all calculated fields
    const proposalData = {
      title: data.project.name || `Solar Project - ${data.project.address}`,
      agent_id: null, // API-created, no agent
      client_reference_id: clientId,
      partner_id: auth.partnerId,
      partner_reference_id: data.partner_reference_id || null,
      consent_obtained_at: data.consent.timestamp ? new Date(data.consent.timestamp).toISOString() : new Date().toISOString(),
      consent_source: data.consent.source,
      status: 'draft',
      invitation_token: invitationToken,
      invitation_expires_at: expiresAt.toISOString(),
      system_size_kwp: systemSizeKWp,
      annual_energy: annualEnergyKWh,
      carbon_credits: creditsPerYear,
      client_share_percentage: clientSharePercentage,
      project_info: {
        name: data.project.name,
        address: data.project.address,
        country: data.project.country,
        gps_lat: data.project.gps_lat,
        gps_lng: data.project.gps_lng,
        commissionDate: data.project.commissioning_date,
        installerCompany: data.project.installer_company,
        installerEmail: data.project.installer_email,
      },
      content: {
        clientInfo: data.client,
        projectInfo: data.project,
      },
    };
    
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select('id')
      .single();
    
    if (proposalError) {
      console.error('[PartnerAPI] Proposal creation error:', proposalError);
      return internalErrorResponse(requestId);
    }

    // Build acceptance URL - use the proposal view with token
    const acceptanceUrl = `${SITE_URL}/proposals/${proposal.id}?token=${invitationToken}`;

    // Send email if requested
    let emailSent = false;
    let emailQueuedAt: string | undefined;
    
    if (data.send_email !== false && RESEND_API_KEY) {
      try {
        // Get partner attribution for email
        const { data: partnerInfo } = await supabase.rpc('get_partner_attribution', {
          p_partner_id: auth.partnerId,
        });
        
        const partnerName = partnerInfo?.[0]?.partner_name;
        const partnerLogoUrl = partnerInfo?.[0]?.logo_url;
        
        // Send email directly using Resend API (bypasses JWT auth requirement)
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Crunch Carbon <noreply@crunchcarbon.com>',
            to: data.client.email,
            subject: `Carbon Credit Proposal: ${data.project.name || 'Solar Project'}`,
            html: generateProposalEmailHtml({
              clientName: `${data.client.first_name} ${data.client.last_name}`,
              projectName: data.project.name || 'Solar Project',
              invitationLink: acceptanceUrl,
              systemSize: `${Math.round(systemSizeKWp)} kWp`,
              carbonCredits: Math.round(creditsPerYear),
              partnerName,
              partnerLogoUrl,
            }),
          }),
        });
        
        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          emailSent = true;
          emailQueuedAt = new Date().toISOString();
          
          // Update proposal status and log email
          await supabase
            .from('proposals')
            .update({ 
              status: 'sent',
              invitation_sent_at: emailQueuedAt,
              last_email_event_type: 'email.sent',
              last_email_sent_at: emailQueuedAt,
            })
            .eq('id', proposal.id);
          
          // Log for webhook tracking
          if (emailData.id) {
            await supabase
              .from('proposal_automation_log')
              .insert({
                proposal_id: proposal.id,
                automation_type: 'email_sent',
                email_type: 'partner_api_invite',
                email_message_id: emailData.id,
                details: {
                  recipient: data.client.email,
                  partner_id: auth.partnerId,
                  partner_name: partnerName,
                },
              });
          }
          
          console.log(`[PartnerAPI] Email sent successfully: ${emailData.id}`);
        } else {
          const errorText = await emailResponse.text();
          console.error('[PartnerAPI] Email send failed:', errorText);
        }
      } catch (e) {
        console.error('[PartnerAPI] Email send error:', e);
      }
    }
    
    return successResponse({
      proposal_id: proposal.id,
      client_id: clientId,
      partner_reference_id: data.partner_reference_id,
      estimates: {
        annual_energy_kwh: Math.round(annualEnergyKWh),
        credits_per_year: Math.round(creditsPerYear * 100) / 100, // 2 decimal places
        revenue_6yr_total: revenue6yr,
        client_share_percentage: clientSharePercentage,
      },
      acceptance_url: acceptanceUrl,
      expires_at: expiresAt.toISOString(),
      email_sent: emailSent,
      email_queued_at: emailQueuedAt,
    }, requestId);
    
  } catch (error) {
    console.error('[PartnerAPI] handleCreateProposal error:', error);
    return internalErrorResponse(requestId);
  }
}

async function handleListProposals(
  req: Request,
  auth: PartnerAuthInfo,
  _params: Record<string, string>,
  requestId: string
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const partnerRefId = url.searchParams.get('partner_reference_id');
    const clientEmail = url.searchParams.get('client_email');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const cursor = url.searchParams.get('cursor');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let query = supabase
      .from('proposals')
      .select(`
        id,
        partner_reference_id,
        status,
        created_at,
        signed_at,
        client_reference_id,
        clients!client_reference_id (email),
        project_onboarding (id)
      `)
      .eq('partner_id', auth.partnerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit + 1);
    
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    if (partnerRefId) query = query.eq('partner_reference_id', partnerRefId);
    if (cursor) query = query.lt('created_at', cursor);
    
    const { data, error } = await query;
    
    if (error) {
      console.error('[PartnerAPI] List proposals error:', error);
      return internalErrorResponse(requestId);
    }
    
    const hasMore = data.length > limit;
    const proposals = data.slice(0, limit).map((p: Record<string, unknown>) => ({
      proposal_id: p.id,
      partner_reference_id: p.partner_reference_id,
      client_email: (p.clients as Record<string, unknown>)?.email,
      status: p.status,
      created_at: p.created_at,
      signed_at: p.signed_at,
      project_id: (p.project_onboarding as Record<string, unknown>[])?.[0]?.id,
    }));
    
    // Filter by client email if specified (post-query filter due to join limitations)
    const filteredProposals = clientEmail
      ? proposals.filter((p: Record<string, string>) => p.client_email?.toLowerCase() === clientEmail.toLowerCase())
      : proposals;
    
    return successResponse({
      proposals: filteredProposals,
      pagination: {
        has_more: hasMore,
        next_cursor: hasMore ? proposals[proposals.length - 1].created_at : undefined,
      },
    }, requestId);
    
  } catch (error) {
    console.error('[PartnerAPI] handleListProposals error:', error);
    return internalErrorResponse(requestId);
  }
}

async function handleLookupProposal(
  req: Request,
  auth: PartnerAuthInfo,
  _params: Record<string, string>,
  requestId: string
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const partnerRefId = url.searchParams.get('partner_reference_id');
    
    if (!partnerRefId) {
      return validationErrorResponse(requestId, 'partner_reference_id query parameter is required', 'partner_reference_id');
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data, error } = await supabase
      .from('proposals')
      .select(`
        id,
        partner_reference_id,
        status,
        created_at,
        signed_at,
        client_reference_id,
        clients!client_reference_id (email, first_name, last_name),
        project_onboarding (id)
      `)
      .eq('partner_id', auth.partnerId)
      .eq('partner_reference_id', partnerRefId)
      .is('deleted_at', null)
      .single();
    
    if (error || !data) {
      return successResponse({ proposal: null }, requestId);
    }
    
    return successResponse({
      proposal: {
        proposal_id: data.id,
        partner_reference_id: data.partner_reference_id,
        client_email: (data.clients as Record<string, unknown>)?.email,
        status: data.status,
        created_at: data.created_at,
        signed_at: data.signed_at,
        project_id: (data.project_onboarding as Record<string, unknown>[])?.[0]?.id,
      },
    }, requestId);
    
  } catch (error) {
    console.error('[PartnerAPI] handleLookupProposal error:', error);
    return internalErrorResponse(requestId);
  }
}

async function handleGetProposal(
  _req: Request,
  auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'proposal_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid proposal ID format', 'proposal_id', params.id);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('proposals')
    .select(`
      *,
      clients!client_reference_id (*),
      project_onboarding (id)
    `)
    .eq('id', params.id)
    .eq('partner_id', auth.partnerId)
    .is('deleted_at', null)
    .single();
  
  if (error || !data) {
    return notFoundResponse(requestId, 'Proposal');
  }
  
  // Calculate estimates using stored values or recalculate from system size
  const systemSizeKWp = data.system_size_kwp || 0;
  const annualEnergyKWh = data.annual_energy || systemSizeKWp * ANNUAL_GENERATION_FACTOR;
  const creditsPerYear = data.carbon_credits || (annualEnergyKWh / 1000) * EMISSION_FACTOR;
  const clientShare = data.client_share_percentage || 60.20;
  const revenue6yr = Math.round(creditsPerYear * SIX_YEAR_PRICE_SUM * (clientShare / 100));
  
  return successResponse({
    proposal_id: data.id,
    partner_reference_id: data.partner_reference_id,
    status: data.status,
    created_at: data.created_at,
    signed_at: data.signed_at,
    project_id: (data.project_onboarding as Record<string, unknown>[])?.[0]?.id,
    client: {
      email: data.clients?.email,
      first_name: data.clients?.first_name,
      last_name: data.clients?.last_name,
      company_name: data.clients?.company_name,
    },
    project: data.project_info,
    estimates: {
      annual_energy_kwh: Math.round(annualEnergyKWh),
      credits_per_year: Math.round(creditsPerYear * 100) / 100,
      revenue_6yr_total: revenue6yr,
      client_share_percentage: clientShare,
    },
  }, requestId);
}

async function handleSendAcceptanceLink(
  req: Request,
  auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  try {
    const uuidValidation = validateUUID(params.id, 'proposal_id');
    if (!uuidValidation.success) {
      return validationErrorResponse(requestId, 'Invalid proposal ID format', 'proposal_id', params.id);
    }
    
    const body = await req.json().catch(() => ({}));
    const expiresInDays = Math.min(body.expires_in_days || 10, 30);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get proposal
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select(`
        *,
        clients!client_reference_id (email, first_name, last_name)
      `)
      .eq('id', params.id)
      .eq('partner_id', auth.partnerId)
      .is('deleted_at', null)
      .single();
    
    if (error || !proposal) {
      return notFoundResponse(requestId, 'Proposal');
    }
    
    if (proposal.status === 'accepted' || proposal.status === 'approved') {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'PROPOSAL_ALREADY_SIGNED', message: 'Proposal has already been signed' },
          request_id: requestId,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Generate new token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    // Build acceptance URL
    const acceptanceUrl = `${SITE_URL}/proposals/${proposal.id}?token=${invitationToken}`;
    
    // Update proposal with new token
    await supabase
      .from('proposals')
      .update({
        invitation_token: invitationToken,
        invitation_expires_at: expiresAt.toISOString(),
      })
      .eq('id', params.id);
    
    // Send email
    const clientEmail = proposal.clients?.email;
    const clientName = `${proposal.clients?.first_name || ''} ${proposal.clients?.last_name || ''}`.trim();
    
    let emailSent = false;
    
    if (clientEmail && RESEND_API_KEY) {
      try {
        const { data: partnerInfo } = await supabase.rpc('get_partner_attribution', {
          p_partner_id: auth.partnerId,
        });
        
        const partnerName = partnerInfo?.[0]?.partner_name;
        const partnerLogoUrl = partnerInfo?.[0]?.logo_url;
        
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Crunch Carbon <noreply@crunchcarbon.com>',
            to: clientEmail,
            subject: `Carbon Credit Proposal: ${proposal.title}`,
            html: generateProposalEmailHtml({
              clientName: clientName || 'Valued Customer',
              projectName: proposal.title,
              invitationLink: acceptanceUrl,
              systemSize: proposal.system_size_kwp ? `${Math.round(proposal.system_size_kwp)} kWp` : undefined,
              carbonCredits: proposal.carbon_credits ? Math.round(proposal.carbon_credits) : undefined,
              partnerName,
              partnerLogoUrl,
            }),
          }),
        });
        
        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          emailSent = true;
          
          // Update proposal status
          await supabase
            .from('proposals')
            .update({ 
              status: 'sent',
              invitation_sent_at: new Date().toISOString(),
              last_email_event_type: 'email.sent',
              last_email_sent_at: new Date().toISOString(),
            })
            .eq('id', params.id);
          
          // Log for webhook tracking
          if (emailData.id) {
            await supabase
              .from('proposal_automation_log')
              .insert({
                proposal_id: proposal.id,
                automation_type: 'email_sent',
                email_type: 'partner_api_resend',
                email_message_id: emailData.id,
                details: {
                  recipient: clientEmail,
                  partner_id: auth.partnerId,
                  resend: true,
                },
              });
          }
        }
      } catch (e) {
        console.error('[PartnerAPI] Email send error:', e);
      }
    }
    
    return successResponse({
      proposal_id: proposal.id,
      acceptance_url: acceptanceUrl,
      expires_at: expiresAt.toISOString(),
      email_sent: emailSent,
      email_queued_at: emailSent ? new Date().toISOString() : undefined,
    }, requestId);
    
  } catch (error) {
    console.error('[PartnerAPI] handleSendAcceptanceLink error:', error);
    return internalErrorResponse(requestId);
  }
}

// =============================================================================
// Handlers - Projects (Phase 3 - Full Implementation)
// =============================================================================

// Required onboarding fields for audit readiness
const REQUIRED_ONBOARDING_FIELDS = [
  'system_address',
  'commissioning_date',
  'panel_total_kwp',
  'inverter_serial',
  'installer_company_name',
  'installer_email',
];

// Helper: Calculate completion percentage
function calculateCompletion(fields: Record<string, unknown> | null): { 
  fields_complete: number; 
  fields_required: number; 
  percentage: number; 
  missing_fields: string[] 
} {
  if (!fields) {
    return { 
      fields_complete: 0, 
      fields_required: REQUIRED_ONBOARDING_FIELDS.length, 
      percentage: 0, 
      missing_fields: [...REQUIRED_ONBOARDING_FIELDS] 
    };
  }
  
  const missing: string[] = [];
  let complete = 0;
  
  for (const field of REQUIRED_ONBOARDING_FIELDS) {
    const value = fields[field];
    if (value !== null && value !== undefined && value !== '') {
      complete++;
    } else {
      missing.push(field);
    }
  }
  
  return {
    fields_complete: complete,
    fields_required: REQUIRED_ONBOARDING_FIELDS.length,
    percentage: Math.round((complete / REQUIRED_ONBOARDING_FIELDS.length) * 100),
    missing_fields: missing,
  };
}

// Helper: Check partner owns project (via proposal)
async function partnerOwnsProject(
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  partnerId: string
): Promise<{ owns: boolean; proposal?: Record<string, unknown>; project?: Record<string, unknown> }> {
  const { data: project, error } = await supabase
    .from('project_onboarding')
    .select(`
      id,
      proposal_id,
      onboarding_complete,
      submitted_for_review,
      admin_validated,
      audit_ready,
      data_access_verified,
      version,
      proposals!inner (
        id,
        partner_id,
        partner_reference_id,
        status,
        system_size_kwp,
        client_reference_id,
        clients!client_reference_id (email, first_name, last_name, company_name)
      )
    `)
    .eq('id', projectId)
    .single();
  
  if (error || !project) {
    return { owns: false };
  }
  
  const proposal = project.proposals as Record<string, unknown>;
  if (proposal.partner_id !== partnerId) {
    return { owns: false };
  }
  
  return { owns: true, proposal, project };
}

async function handleListProjects(
  req: Request,
  auth: PartnerAuthInfo,
  _params: Record<string, string>,
  requestId: string
): Promise<Response> {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const cursor = url.searchParams.get('cursor');
    const status = url.searchParams.get('status'); // e.g., 'onboarding', 'audit_ready', 'submitted'
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let query = supabase
      .from('project_onboarding')
      .select(`
        id,
        proposal_id,
        onboarding_complete,
        submitted_for_review,
        admin_validated,
        audit_ready,
        data_access_verified,
        created_at,
        updated_at,
        proposals!inner (
          id,
          partner_id,
          partner_reference_id,
          title,
          system_size_kwp,
          clients!client_reference_id (email, first_name, last_name)
        )
      `)
      .eq('proposals.partner_id', auth.partnerId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);
    
    if (cursor) {
      query = query.lt('created_at', cursor);
    }
    
    // Filter by status
    if (status === 'audit_ready') {
      query = query.eq('audit_ready', true);
    } else if (status === 'submitted') {
      query = query.eq('submitted_for_review', true).eq('admin_validated', false);
    } else if (status === 'onboarding') {
      query = query.eq('onboarding_complete', false);
    }
    
    const { data: projects, error } = await query;
    
    if (error) {
      console.error('[PartnerAPI] handleListProjects error:', error);
      return internalErrorResponse(requestId);
    }
    
    const hasMore = (projects?.length || 0) > limit;
    const items = (projects || []).slice(0, limit);
    
    const formattedProjects = items.map(p => {
      const proposal = p.proposals as Record<string, unknown>;
      const client = proposal.clients as Record<string, unknown>;
      return {
        project_id: p.id,
        proposal_id: p.proposal_id,
        partner_reference_id: proposal.partner_reference_id,
        title: proposal.title,
        client_email: client?.email,
        system_size_kwp: proposal.system_size_kwp,
        status: {
          onboarding_complete: p.onboarding_complete,
          submitted_for_review: p.submitted_for_review,
          admin_validated: p.admin_validated,
          audit_ready: p.audit_ready,
        },
        created_at: p.created_at,
        updated_at: p.updated_at,
      };
    });
    
    return successResponse({
      projects: formattedProjects,
      pagination: {
        has_more: hasMore,
        next_cursor: hasMore && items.length > 0 ? items[items.length - 1].created_at : undefined,
      },
    }, requestId);
    
  } catch (error) {
    console.error('[PartnerAPI] handleListProjects error:', error);
    return internalErrorResponse(requestId);
  }
}

async function handleGetProject(
  req: Request,
  auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'project_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid project ID format', 'project_id', params.id);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Verify partner ownership
  const ownership = await partnerOwnsProject(supabase, params.id, auth.partnerId);
  if (!ownership.owns) {
    return notFoundResponse(requestId, 'Project');
  }
  
  const project = ownership.project!;
  const proposal = ownership.proposal!;
  
  // Get onboarding fields
  const { data: fields } = await supabase
    .from('onboarding_fields')
    .select('*')
    .eq('project_id', params.id)
    .single();
  
  // Get documents
  const { data: documents } = await supabase
    .from('onboarding_documents')
    .select('category, is_validated')
    .eq('project_id', params.id);
  
  // Get data access config
  const { data: dataAccess } = await supabase
    .from('data_access_config')
    .select('provider, last_test_status')
    .eq('project_id', params.id)
    .single();
  
  const completion = calculateCompletion(fields);
  
  // Document status
  const cocUploaded = documents?.some(d => d.category === 'coc') || false;
  const invoiceUploaded = documents?.some(d => d.category === 'invoice') || false;
  
  // Build ETag from version
  const etag = `"v${project.version || 1}"`;
  
  // Check If-None-Match header
  const ifNoneMatch = req.headers.get('If-None-Match');
  if (ifNoneMatch === etag) {
    return new Response(null, { 
      status: 304, 
      headers: { ...corsHeaders, 'ETag': etag } 
    });
  }
  
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        project_id: params.id,
        proposal_id: project.proposal_id,
        partner_reference_id: proposal.partner_reference_id,
        version: project.version || 1,
        status: {
          onboarding_complete: project.onboarding_complete,
          submitted_for_review: project.submitted_for_review,
          admin_validated: project.admin_validated,
          audit_ready: project.audit_ready,
        },
        completion,
        documents: {
          coc_uploaded: cocUploaded,
          invoice_uploaded: invoiceUploaded,
        },
        data_access: {
          configured: !!dataAccess,
          provider: dataAccess?.provider,
          status: dataAccess?.last_test_status === 'success' ? 'verified' : 
                  dataAccess?.last_test_status === 'failed' ? 'failed' : 'pending',
        },
      },
      request_id: requestId,
    }),
    { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'ETag': etag,
      } 
    }
  );
}

async function handleUpdateOnboarding(
  req: Request,
  auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'project_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid project ID format', 'project_id', params.id);
  }
  
  const body = await req.json();
  const validation = validateUpdateOnboarding(body);
  
  if (!validation.success) {
    const firstError = validation.errors![0];
    return validationErrorResponse(requestId, firstError.message, firstError.field, firstError.received);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Verify partner ownership
  const ownership = await partnerOwnsProject(supabase, params.id, auth.partnerId);
  if (!ownership.owns) {
    return notFoundResponse(requestId, 'Project');
  }
  
  const project = ownership.project!;
  
  // Check ETag for optimistic concurrency
  const ifMatch = req.headers.get('If-Match');
  const currentVersion = project.version || 1;
  const expectedEtag = `"v${currentVersion}"`;
  
  if (ifMatch && ifMatch !== expectedEtag) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { 
          code: 'CONCURRENCY_CONFLICT', 
          message: 'Version mismatch. Fetch latest version and retry.',
          expected_version: currentVersion,
        },
        request_id: requestId,
      }),
      { status: 412, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  // Map API fields to database columns
  const data = validation.data!;
  const fieldsUpdate: Record<string, unknown> = {};
  const updatedFields: string[] = [];
  const skippedFields: string[] = [];
  
  // System fields
  if (data.system) {
    const systemMappings: Record<string, string> = {
      inverter_brand: 'inverter_brand',
      inverter_model: 'inverter_model',
      inverter_serial: 'inverter_serial',
      inverter_capacity_kw: 'inverter_capacity_kw',
      inverter_quantity: 'inverter_quantity',
      panel_brand: 'panel_brand',
      panel_quantity: 'panel_quantity',
      panel_size_wp: 'panel_size_wp',
      panel_total_kwp: 'panel_total_kwp',
      has_battery: 'has_battery',
      battery_brand: 'battery_brand',
      battery_capacity_kwh: 'battery_capacity_kwh',
    };
    
    for (const [apiField, dbField] of Object.entries(systemMappings)) {
      if (apiField in data.system) {
        fieldsUpdate[dbField] = data.system[apiField as keyof typeof data.system];
        updatedFields.push(dbField);
      }
    }
  }
  
  // Installation fields
  if (data.installation) {
    if ('total_capex' in data.installation) {
      fieldsUpdate.total_capex = data.installation.total_capex;
      updatedFields.push('total_capex');
    }
    if ('ownership_type' in data.installation) {
      fieldsUpdate.ownership_type = data.installation.ownership_type;
      updatedFields.push('ownership_type');
    }
    if ('has_maintenance_agreement' in data.installation) {
      fieldsUpdate.has_maintenance_agreement = data.installation.has_maintenance_agreement;
      updatedFields.push('has_maintenance_agreement');
    }
    if ('maintenance_cost_annual' in data.installation) {
      fieldsUpdate.maintenance_cost_annual = data.installation.maintenance_cost_annual;
      updatedFields.push('maintenance_cost_annual');
    }
    if ('commissioning_date' in data.installation) {
      fieldsUpdate.commissioning_date = data.installation.commissioning_date;
      updatedFields.push('commissioning_date');
    }
  }
  
  // Installer fields
  if (data.installer) {
    if ('company_name' in data.installer) {
      fieldsUpdate.installer_company_name = data.installer.company_name;
      updatedFields.push('installer_company_name');
    }
    if ('email' in data.installer) {
      fieldsUpdate.installer_email = data.installer.email;
      updatedFields.push('installer_email');
    }
  }
  
  // Location fields
  if (data.location) {
    if ('address' in data.location) {
      fieldsUpdate.system_address = data.location.address;
      updatedFields.push('system_address');
    }
    if ('gps_lat' in data.location) {
      fieldsUpdate.system_gps_lat = data.location.gps_lat;
      updatedFields.push('system_gps_lat');
    }
    if ('gps_lng' in data.location) {
      fieldsUpdate.system_gps_lng = data.location.gps_lng;
      updatedFields.push('system_gps_lng');
    }
  }
  
  if (updatedFields.length === 0) {
    return validationErrorResponse(requestId, 'No valid fields to update', 'body');
  }
  
  // Update onboarding_fields
  fieldsUpdate.updated_at = new Date().toISOString();
  
  const { error: fieldsError } = await supabase
    .from('onboarding_fields')
    .update(fieldsUpdate)
    .eq('project_id', params.id);
  
  if (fieldsError) {
    console.error('[PartnerAPI] handleUpdateOnboarding fields error:', fieldsError);
    return internalErrorResponse(requestId);
  }
  
  // Increment version
  const newVersion = currentVersion + 1;
  await supabase
    .from('project_onboarding')
    .update({ version: newVersion, updated_at: new Date().toISOString() })
    .eq('id', params.id);
  
  // Get updated fields to recalculate completion
  const { data: updatedFieldsData } = await supabase
    .from('onboarding_fields')
    .select('*')
    .eq('project_id', params.id)
    .single();
  
  const completion = calculateCompletion(updatedFieldsData);
  
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        project_id: params.id,
        version: newVersion,
        completion,
        updated_fields: updatedFields,
        skipped_fields: skippedFields,
      },
      request_id: requestId,
    }),
    { 
      status: 200, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'ETag': `"v${newVersion}"`,
      } 
    }
  );
}

async function handleSubmitOnboarding(
  _req: Request,
  auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'project_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid project ID format', 'project_id', params.id);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Verify partner ownership
  const ownership = await partnerOwnsProject(supabase, params.id, auth.partnerId);
  if (!ownership.owns) {
    return notFoundResponse(requestId, 'Project');
  }
  
  const project = ownership.project!;
  
  // Check if already submitted
  if (project.submitted_for_review) {
    return validationErrorResponse(requestId, 'Project has already been submitted for review', 'project_id');
  }
  
  // Get onboarding fields to check completion
  const { data: fields } = await supabase
    .from('onboarding_fields')
    .select('*')
    .eq('project_id', params.id)
    .single();
  
  const completion = calculateCompletion(fields);
  
  if (completion.missing_fields.length > 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INCOMPLETE_ONBOARDING',
          message: 'Cannot submit - required fields are missing',
          missing_fields: completion.missing_fields,
        },
        request_id: requestId,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  // Check for required documents
  const { data: documents } = await supabase
    .from('onboarding_documents')
    .select('category')
    .eq('project_id', params.id);
  
  const cocUploaded = documents?.some(d => d.category === 'coc') || false;
  const invoiceUploaded = documents?.some(d => d.category === 'invoice') || false;
  
  if (!cocUploaded || !invoiceUploaded) {
    const missingDocs: string[] = [];
    if (!cocUploaded) missingDocs.push('coc');
    if (!invoiceUploaded) missingDocs.push('invoice');
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'MISSING_DOCUMENTS',
          message: 'Cannot submit - required documents are missing',
          missing_documents: missingDocs,
        },
        request_id: requestId,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  // Submit for review
  const { error } = await supabase
    .from('project_onboarding')
    .update({
      submitted_for_review: true,
      submitted_for_review_at: new Date().toISOString(),
      onboarding_complete: true,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id);
  
  if (error) {
    console.error('[PartnerAPI] handleSubmitOnboarding error:', error);
    return internalErrorResponse(requestId);
  }
  
  return successResponse({
    project_id: params.id,
    submitted: true,
    submitted_at: new Date().toISOString(),
    next_steps: 'Crunch Carbon will review and validate your submission. You will be notified when audit ready.',
  }, requestId);
}

async function handleDocumentPresign(
  req: Request,
  auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'project_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid project ID format', 'project_id', params.id);
  }
  
  const body = await req.json();
  const validation = validateDocumentPresign(body);
  
  if (!validation.success) {
    const firstError = validation.errors![0];
    return validationErrorResponse(requestId, firstError.message, firstError.field, firstError.received);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Verify partner ownership
  const ownership = await partnerOwnsProject(supabase, params.id, auth.partnerId);
  if (!ownership.owns) {
    return notFoundResponse(requestId, 'Project');
  }
  
  const data = validation.data!;
  const documentId = crypto.randomUUID();
  const timestamp = Date.now();
  const filePath = `partner-uploads/${auth.partnerId}/${params.id}/${timestamp}/${data.file_name}`;
  
  // Create signed upload URL
  const { data: signedUrl, error: signError } = await supabase
    .storage
    .from('onboarding-documents')
    .createSignedUploadUrl(filePath);
  
  if (signError || !signedUrl) {
    console.error('[PartnerAPI] handleDocumentPresign signedUrl error:', signError);
    return internalErrorResponse(requestId);
  }
  
  // Note: We need to get a user ID for uploaded_by. Since Partner API doesn't have a user,
  // we'll look up the client's user_id from the associated proposal/client
  const proposal = ownership.proposal!;
  const clientId = proposal.client_reference_id as string;
  
  // Get client's user_id (may be null)
  const { data: clientData } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single();
  
  const uploadedByUserId = clientData?.user_id || null;
  
  // If no user_id available, we can't insert with foreign key constraint
  // Store partner_id in metadata instead for tracking
  if (!uploadedByUserId) {
    // Insert without uploaded_by (it's not nullable in the schema, so we need to handle this)
    console.error('[PartnerAPI] handleDocumentPresign: No user_id available for client, cannot insert document');
    return validationErrorResponse(requestId, 'Client does not have an associated user account. Documents must be uploaded via the portal.', 'client');
  }
  
  // Create pending document record
  const { error: docError } = await supabase
    .from('onboarding_documents')
    .insert({
      id: documentId,
      project_id: params.id,
      category: data.category,
      file_name: data.file_name,
      file_url: filePath, // Will be updated on confirm
      file_size_bytes: data.file_size_bytes,
      mime_type: data.content_type,
      uploaded_by: uploadedByUserId,
      metadata: { ...data.metadata, partner_id: auth.partnerId, uploaded_via: 'partner_api' },
    });
  
  if (docError) {
    console.error('[PartnerAPI] handleDocumentPresign doc insert error:', docError);
    return internalErrorResponse(requestId);
  }
  
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  return successResponse({
    upload_url: signedUrl.signedUrl,
    upload_expires_at: expiresAt.toISOString(),
    document_id: documentId,
    upload_headers: {
      'Content-Type': data.content_type,
    },
  }, requestId, { status: 201 });
}

async function handleDocumentConfirm(
  _req: Request,
  auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const projectValidation = validateUUID(params.id, 'project_id');
  if (!projectValidation.success) {
    return validationErrorResponse(requestId, 'Invalid project ID format', 'project_id', params.id);
  }
  
  const docValidation = validateUUID(params.id2, 'document_id');
  if (!docValidation.success) {
    return validationErrorResponse(requestId, 'Invalid document ID format', 'document_id', params.id2);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Verify partner ownership
  const ownership = await partnerOwnsProject(supabase, params.id, auth.partnerId);
  if (!ownership.owns) {
    return notFoundResponse(requestId, 'Project');
  }
  
  // Get the document
  const { data: doc, error: docError } = await supabase
    .from('onboarding_documents')
    .select('*')
    .eq('id', params.id2)
    .eq('project_id', params.id)
    .single();
  
  if (docError || !doc) {
    return notFoundResponse(requestId, 'Document');
  }
  
  // Get public URL for the uploaded file
  const { data: publicUrlData } = supabase
    .storage
    .from('onboarding-documents')
    .getPublicUrl(doc.file_url);
  
  // Update document with final URL
  await supabase
    .from('onboarding_documents')
    .update({
      file_url: publicUrlData.publicUrl,
      uploaded_at: new Date().toISOString(),
    })
    .eq('id', params.id2);
  
  return successResponse({
    document_id: doc.id,
    category: doc.category,
    file_url: publicUrlData.publicUrl,
    uploaded_at: new Date().toISOString(),
    virus_scan_status: 'pending', // Placeholder for future implementation
    metadata: doc.metadata,
  }, requestId);
}

async function handleDocumentUrl(
  req: Request,
  auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'project_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid project ID format', 'project_id', params.id);
  }
  
  // Parse body for URL-based upload
  const body = await req.json();
  
  if (!body.category || !body.file_url) {
    return validationErrorResponse(requestId, 'category and file_url are required', 'body');
  }
  
  const validCategories = ['coc', 'invoice', 'installation_photo', 'panel_layout', 'other'];
  if (!validCategories.includes(body.category)) {
    return validationErrorResponse(requestId, 'Invalid category', 'category', body.category);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Verify partner ownership
  const ownership = await partnerOwnsProject(supabase, params.id, auth.partnerId);
  if (!ownership.owns) {
    return notFoundResponse(requestId, 'Project');
  }
  
  const documentId = crypto.randomUUID();
  const fileName = body.file_name || body.file_url.split('/').pop() || 'document';
  
  // Get client's user_id for uploaded_by (required field with FK constraint)
  const proposal = ownership.proposal!;
  const clientId = proposal.client_reference_id as string;
  
  const { data: clientData } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single();
  
  const uploadedByUserId = clientData?.user_id || null;
  
  if (!uploadedByUserId) {
    console.error('[PartnerAPI] handleDocumentUrl: No user_id available for client');
    return validationErrorResponse(requestId, 'Client does not have an associated user account. Documents must be uploaded via the portal.', 'client');
  }
  
  // Insert document record with external URL
  const { error: docError } = await supabase
    .from('onboarding_documents')
    .insert({
      id: documentId,
      project_id: params.id,
      category: body.category,
      file_name: fileName,
      file_url: body.file_url,
      file_size_bytes: body.file_size_bytes || null,
      mime_type: body.content_type || null,
      uploaded_by: uploadedByUserId,
      metadata: { ...body.metadata, partner_id: auth.partnerId, uploaded_via: 'partner_api' },
    });
  
  if (docError) {
    console.error('[PartnerAPI] handleDocumentUrl insert error:', docError);
    return internalErrorResponse(requestId);
  }
  
  return successResponse({
    document_id: documentId,
    category: body.category,
    file_url: body.file_url,
    uploaded_at: new Date().toISOString(),
  }, requestId, { status: 201 });
}

async function handleConfigureDataAccess(
  req: Request,
  auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'project_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid project ID format', 'project_id', params.id);
  }
  
  const body = await req.json();
  const validation = validateDataAccessConfig(body);
  
  if (!validation.success) {
    const firstError = validation.errors![0];
    return validationErrorResponse(requestId, firstError.message, firstError.field, firstError.received);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Verify partner ownership
  const ownership = await partnerOwnsProject(supabase, params.id, auth.partnerId);
  if (!ownership.owns) {
    return notFoundResponse(requestId, 'Project');
  }
  
  const data = validation.data!;
  const dataAccessId = crypto.randomUUID();
  
  // Check if config already exists
  const { data: existing } = await supabase
    .from('data_access_config')
    .select('id')
    .eq('project_id', params.id)
    .single();
  
  // Get client's user_id for configured_by (FK constraint to profiles)
  const proposal = ownership.proposal!;
  const clientId = proposal.client_reference_id as string;
  
  const { data: clientData } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single();
  
  const configuredByUserId = clientData?.user_id || null;
  
  // configured_by is nullable, so we can proceed even without a user
  const configData = {
    provider: data.provider,
    credential_method: data.credential_method === 'delegated_access' ? 'delegated_account' : 'api_key',
    site_id: data.site_id || null,
    portal_url: data.portal_url || null,
    delegated_email: data.delegated_access?.granted_by_email || null,
    granted_by_email: data.delegated_access?.granted_by_email || null,
    granted_by_role: data.delegated_access?.granted_by_role || null,
    last_test_status: 'pending',
    configured_by: configuredByUserId, // Use client's user_id, or null if not available
    updated_at: new Date().toISOString(),
  };
  
  if (existing) {
    // Update existing config
    const { error } = await supabase
      .from('data_access_config')
      .update(configData)
      .eq('id', existing.id);
    
    if (error) {
      console.error('[PartnerAPI] handleConfigureDataAccess update error:', error);
      return internalErrorResponse(requestId);
    }
    
    return successResponse({
      data_access_id: existing.id,
      provider: data.provider,
      status: 'pending_verification',
      next_steps: data.credential_method === 'delegated_access' ? {
        delegated_email: 'monitoring@crunchcarbon.com',
        instructions: `Please grant viewer access to monitoring@crunchcarbon.com on your ${data.provider} portal.`,
        instructions_url: `https://crunchcarbon.com/help/data-access/${data.provider.toLowerCase()}`,
      } : undefined,
      instructions_sent: false,
    }, requestId);
    
  } else {
    // Insert new config
    const { error } = await supabase
      .from('data_access_config')
      .insert({
        id: dataAccessId,
        project_id: params.id,
        ...configData,
        created_at: new Date().toISOString(),
      });
    
    if (error) {
      console.error('[PartnerAPI] handleConfigureDataAccess insert error:', error);
      return internalErrorResponse(requestId);
    }
    
    return successResponse({
      data_access_id: dataAccessId,
      provider: data.provider,
      status: 'pending_verification',
      next_steps: data.credential_method === 'delegated_access' ? {
        delegated_email: 'monitoring@crunchcarbon.com',
        instructions: `Please grant viewer access to monitoring@crunchcarbon.com on your ${data.provider} portal.`,
        instructions_url: `https://crunchcarbon.com/help/data-access/${data.provider.toLowerCase()}`,
      } : undefined,
      instructions_sent: false,
    }, requestId, { status: 201 });
  }
}

// =============================================================================
// Handlers - Clients (Phase 3 - Full Implementation)
// =============================================================================

async function handleClientProjects(
  _req: Request,
  auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const email = decodeURIComponent(params.id);
  
  if (!email.includes('@')) {
    return validationErrorResponse(requestId, 'Invalid email format', 'email', email);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Find client by email
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, email, first_name, last_name, company_name')
    .ilike('email', email)
    .single();
  
  if (clientError || !client) {
    return successResponse({
      client: null,
      projects: [],
      total_kwp: 0,
    }, requestId);
  }
  
  // Get all projects for this client where partner owns the proposal
  const { data: proposals } = await supabase
    .from('proposals')
    .select(`
      id,
      partner_reference_id,
      title,
      status,
      system_size_kwp,
      signed_at,
      project_info,
      project_onboarding (id)
    `)
    .eq('client_reference_id', client.id)
    .eq('partner_id', auth.partnerId)
    .is('deleted_at', null)
    .in('status', ['accepted', 'approved'])
    .order('signed_at', { ascending: false });
  
  const projects = (proposals || []).map(p => ({
    project_id: (p.project_onboarding as Record<string, unknown>[])?.[0]?.id,
    proposal_id: p.id,
    partner_reference_id: p.partner_reference_id,
    address: (p.project_info as Record<string, unknown>)?.address,
    system_size_kwp: p.system_size_kwp,
    status: p.status,
    signed_at: p.signed_at,
  })).filter(p => p.project_id); // Only include projects with onboarding records
  
  const totalKwp = projects.reduce((sum, p) => sum + (p.system_size_kwp || 0), 0);
  
  return successResponse({
    client: {
      email: client.email,
      first_name: client.first_name,
      last_name: client.last_name,
      company_name: client.company_name,
    },
    projects,
    total_kwp: totalKwp,
  }, requestId);
}

// =============================================================================
// Handlers - Webhooks (Stub implementations for Phase 4)
// =============================================================================

async function handleCreateWebhook(
  req: Request,
  _auth: PartnerAuthInfo,
  _params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const body = await req.json();
  const validation = validateCreateWebhook(body);
  
  if (!validation.success) {
    const firstError = validation.errors![0];
    return validationErrorResponse(requestId, firstError.message, firstError.field, firstError.received);
  }
  
  return successResponse({
    webhook_id: crypto.randomUUID(),
    events: validation.data!.events,
    secret: `whsec_${crypto.randomUUID().replace(/-/g, '')}`,
    verification_pending: true,
  }, requestId, { status: 201 });
}

async function handleListWebhooks(
  _req: Request,
  _auth: PartnerAuthInfo,
  _params: Record<string, string>,
  requestId: string
): Promise<Response> {
  return successResponse({ webhooks: [] }, requestId);
}

async function handleGetWebhook(
  _req: Request,
  _auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'webhook_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid webhook ID format', 'webhook_id', params.id);
  }
  
  return notFoundResponse(requestId, 'Webhook');
}

async function handleDeleteWebhook(
  _req: Request,
  _auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'webhook_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid webhook ID format', 'webhook_id', params.id);
  }
  
  return notFoundResponse(requestId, 'Webhook');
}

async function handleVerifyWebhook(
  _req: Request,
  _auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'webhook_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid webhook ID format', 'webhook_id', params.id);
  }
  
  return notFoundResponse(requestId, 'Webhook');
}

async function handleWebhookDeliveries(
  _req: Request,
  _auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'webhook_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid webhook ID format', 'webhook_id', params.id);
  }
  
  return successResponse({ deliveries: [] }, requestId);
}
