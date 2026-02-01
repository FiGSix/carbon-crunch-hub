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
    
    // Find or create client
    const { data: clientId, error: clientError } = await supabase.rpc('find_or_create_client_by_email', {
      p_email: data.client.email,
      p_first_name: data.client.first_name,
      p_last_name: data.client.last_name,
      p_phone: data.client.phone || null,
      p_company_name: data.client.company_name || null,
      p_created_by: null, // API-created, no agent
    });
    
    if (clientError) {
      console.error('[PartnerAPI] Client creation error:', clientError);
      return internalErrorResponse(requestId);
    }
    
    // Calculate estimates (simplified for now)
    const systemSizeKWp = data.project.system_size_kwp;
    const creditsPerYear = Math.round(systemSizeKWp * 1.2); // Simplified calculation
    const clientSharePercentage = systemSizeKWp < 5000 ? 60.2 : systemSizeKWp < 10000 ? 63 : 66.5;
    const revenue6yr = Math.round(creditsPerYear * 6 * 148 * (clientSharePercentage / 100));
    
    // Generate invitation token
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 10);
    
    // Create proposal
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
    
    // Send email if requested
    let emailSent = false;
    let emailQueuedAt: string | undefined;
    
    if (data.send_email !== false) {
      // Update status to 'sent'
      await supabase
        .from('proposals')
        .update({ status: 'sent' })
        .eq('id', proposal.id);
      
      // Get partner attribution for email
      const { data: partnerInfo } = await supabase.rpc('get_partner_attribution', {
        p_partner_id: auth.partnerId,
      });
      
      // Send email via existing edge function
      try {
        const { error: emailError } = await supabase.functions.invoke('send-proposal-invitation', {
          body: {
            proposalId: proposal.id,
            clientEmail: data.client.email,
            clientName: `${data.client.first_name} ${data.client.last_name}`,
            invitationToken: invitationToken,
            projectName: data.project.name || 'Solar Project',
            partnerName: partnerInfo?.[0]?.partner_name,
            partnerLogoUrl: partnerInfo?.[0]?.logo_url,
          },
        });
        
        if (!emailError) {
          emailSent = true;
          emailQueuedAt = new Date().toISOString();
        }
      } catch (e) {
        console.error('[PartnerAPI] Email send error:', e);
      }
    }
    
    // Build acceptance URL
    const acceptanceUrl = `${SUPABASE_URL.replace('.supabase.co', '')}/accept/${invitationToken}`;
    
    return successResponse({
      proposal_id: proposal.id,
      client_id: clientId,
      partner_reference_id: data.partner_reference_id,
      estimates: {
        credits_per_year: creditsPerYear,
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
        project_onboarding!inner (id)
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
      credits_per_year: Math.round((data.system_size_kwp || 0) * 1.2),
      revenue_6yr_total: Math.round((data.system_size_kwp || 0) * 1.2 * 6 * 148 * ((data.client_share_percentage || 60) / 100)),
      client_share_percentage: data.client_share_percentage,
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
    
    // Update proposal
    await supabase
      .from('proposals')
      .update({
        invitation_token: invitationToken,
        invitation_expires_at: expiresAt.toISOString(),
        status: 'sent',
      })
      .eq('id', params.id);
    
    // Send email
    const clientEmail = proposal.clients?.email;
    const clientName = `${proposal.clients?.first_name || ''} ${proposal.clients?.last_name || ''}`.trim();
    
    const { data: partnerInfo } = await supabase.rpc('get_partner_attribution', {
      p_partner_id: auth.partnerId,
    });
    
    await supabase.functions.invoke('send-proposal-invitation', {
      body: {
        proposalId: proposal.id,
        clientEmail,
        clientName,
        invitationToken,
        projectName: proposal.title,
        partnerName: partnerInfo?.[0]?.partner_name,
        partnerLogoUrl: partnerInfo?.[0]?.logo_url,
      },
    });
    
    const acceptanceUrl = `${SUPABASE_URL.replace('.supabase.co', '')}/accept/${invitationToken}`;
    
    return successResponse({
      proposal_id: proposal.id,
      acceptance_url: acceptanceUrl,
      expires_at: expiresAt.toISOString(),
      email_sent: true,
      email_queued_at: new Date().toISOString(),
    }, requestId);
    
  } catch (error) {
    console.error('[PartnerAPI] handleSendAcceptanceLink error:', error);
    return internalErrorResponse(requestId);
  }
}

// =============================================================================
// Handlers - Projects (Stub implementations for Phase 3)
// =============================================================================

async function handleListProjects(
  _req: Request,
  _auth: PartnerAuthInfo,
  _params: Record<string, string>,
  requestId: string
): Promise<Response> {
  return successResponse({ projects: [], pagination: { has_more: false } }, requestId);
}

async function handleGetProject(
  _req: Request,
  _auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'project_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid project ID format', 'project_id', params.id);
  }
  
  return notFoundResponse(requestId, 'Project');
}

async function handleUpdateOnboarding(
  req: Request,
  _auth: PartnerAuthInfo,
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
  
  return notFoundResponse(requestId, 'Project');
}

async function handleSubmitOnboarding(
  _req: Request,
  _auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'project_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid project ID format', 'project_id', params.id);
  }
  
  return notFoundResponse(requestId, 'Project');
}

async function handleDocumentPresign(
  req: Request,
  _auth: PartnerAuthInfo,
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
  
  return notFoundResponse(requestId, 'Project');
}

async function handleDocumentConfirm(
  _req: Request,
  _auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'project_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid project ID format', 'project_id', params.id);
  }
  
  return notFoundResponse(requestId, 'Project');
}

async function handleDocumentUrl(
  _req: Request,
  _auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const uuidValidation = validateUUID(params.id, 'project_id');
  if (!uuidValidation.success) {
    return validationErrorResponse(requestId, 'Invalid project ID format', 'project_id', params.id);
  }
  
  return notFoundResponse(requestId, 'Project');
}

async function handleConfigureDataAccess(
  req: Request,
  _auth: PartnerAuthInfo,
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
  
  return notFoundResponse(requestId, 'Project');
}

// =============================================================================
// Handlers - Clients (Stub implementations for Phase 3)
// =============================================================================

async function handleClientProjects(
  _req: Request,
  _auth: PartnerAuthInfo,
  params: Record<string, string>,
  requestId: string
): Promise<Response> {
  const email = decodeURIComponent(params.id);
  
  if (!email.includes('@')) {
    return validationErrorResponse(requestId, 'Invalid email format', 'email', email);
  }
  
  return successResponse({
    client: null,
    projects: [],
    total_kwp: 0,
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
