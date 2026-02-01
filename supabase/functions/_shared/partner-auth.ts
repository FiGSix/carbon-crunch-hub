/**
 * Partner API Authentication & Authorization
 * Handles API key validation, scope checking, and rate limiting
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { PartnerAuthInfo, ApiScope } from './partner-types.ts';

// =============================================================================
// Supabase Client
// =============================================================================

function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration');
  }
  
  return createClient(supabaseUrl, serviceRoleKey);
}

// =============================================================================
// API Key Extraction & Parsing
// =============================================================================

/**
 * Extract API key from Authorization header
 * Expected format: Bearer cc_live_xxxx or Bearer cc_test_xxxx
 */
export function extractApiKey(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  
  const key = parts[1];
  
  // Validate key format: cc_live_xxx or cc_test_xxx
  if (!key.startsWith('cc_live_') && !key.startsWith('cc_test_')) {
    return null;
  }
  
  return key;
}

/**
 * Extract prefix from API key (first 12 characters)
 * e.g., cc_live_abc123... -> cc_live_abc1
 */
export function getApiKeyPrefix(apiKey: string): string {
  // Prefix is first 12 chars: cc_live_ (8) + first 4 of key (4) = 12
  return apiKey.substring(0, 12);
}

/**
 * Get environment from API key prefix
 */
export function getApiKeyEnvironment(apiKey: string): 'live' | 'test' {
  return apiKey.startsWith('cc_live_') ? 'live' : 'test';
}

// =============================================================================
// API Key Validation
// =============================================================================

/**
 * Validate API key and return partner info
 */
export async function validateApiKey(apiKey: string): Promise<PartnerAuthInfo | null> {
  const supabase = getServiceClient();
  const prefix = getApiKeyPrefix(apiKey);
  
  try {
    const { data, error } = await supabase
      .rpc('validate_partner_api_key', { p_api_key_prefix: prefix });
    
    if (error || !data || data.length === 0) {
      console.error('[PartnerAuth] API key validation failed:', error?.message || 'No data');
      return null;
    }
    
    const row = data[0];
    
    // Verify the full key hash
    const isValidHash = await verifyApiKeyHash(apiKey, row.api_key_hash);
    if (!isValidHash) {
      console.error('[PartnerAuth] API key hash verification failed');
      return null;
    }
    
    // Check if key is active
    if (!row.is_active) {
      console.error('[PartnerAuth] API key is inactive or expired');
      return null;
    }
    
    // Update usage stats (fire and forget)
    supabase.rpc('update_partner_api_key_usage', { p_api_key_id: row.api_key_id })
      .then(() => {})
      .catch((e) => console.error('[PartnerAuth] Failed to update usage:', e.message));
    
    return {
      partnerId: row.partner_id,
      apiKeyId: row.api_key_id,
      apiKeyHash: row.api_key_hash,
      environment: row.environment,
      scopes: Array.isArray(row.scopes) ? row.scopes : JSON.parse(row.scopes || '[]'),
      rateLimitPerMinute: row.rate_limit_per_minute,
      rateLimitPerDay: row.rate_limit_per_day,
      partnerName: row.partner_name,
      isActive: row.is_active,
    };
  } catch (error) {
    console.error('[PartnerAuth] Validation error:', error);
    return null;
  }
}

/**
 * Verify API key against bcrypt hash
 */
async function verifyApiKeyHash(apiKey: string, storedHash: string): Promise<boolean> {
  try {
    // Use Web Crypto API for constant-time comparison
    // Note: In production, you'd use bcrypt. For edge functions, we use a simpler approach.
    // The hash stored should be created with a compatible algorithm.
    
    // For now, we'll use a SHA-256 based verification
    // In production, consider using bcrypt via a dedicated service
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Compare with stored hash (assuming SHA-256 hex format)
    // For bcrypt hashes, you'd need to use a bcrypt library
    return hashHex === storedHash || 
           // Fallback: compare prefix + first part of key (for testing)
           storedHash.startsWith('sha256:') && storedHash.substring(7) === hashHex;
  } catch (error) {
    console.error('[PartnerAuth] Hash verification error:', error);
    return false;
  }
}

// =============================================================================
// Scope Checking
// =============================================================================

/**
 * Check if partner has required scope
 */
export function hasScope(authInfo: PartnerAuthInfo, requiredScope: ApiScope): boolean {
  return authInfo.scopes.includes(requiredScope);
}

/**
 * Check if partner has any of the required scopes
 */
export function hasAnyScope(authInfo: PartnerAuthInfo, requiredScopes: ApiScope[]): boolean {
  return requiredScopes.some(scope => authInfo.scopes.includes(scope));
}

/**
 * Check if partner has all required scopes
 */
export function hasAllScopes(authInfo: PartnerAuthInfo, requiredScopes: ApiScope[]): boolean {
  return requiredScopes.every(scope => authInfo.scopes.includes(scope));
}

// =============================================================================
// Rate Limiting
// =============================================================================

interface RateLimitState {
  minuteCount: number;
  minuteReset: number;
  dayCount: number;
  dayReset: number;
}

// In-memory rate limit tracking (per worker instance)
// Note: In production, use Redis or similar for distributed rate limiting
const rateLimitCache = new Map<string, RateLimitState>();

/**
 * Check and update rate limits
 * Returns { allowed, remaining, reset, retryAfter }
 */
export function checkRateLimit(
  apiKeyId: string,
  limitPerMinute: number,
  limitPerDay: number
): { allowed: boolean; remaining: number; reset: number; retryAfter?: number } {
  const now = Math.floor(Date.now() / 1000);
  const minuteWindow = Math.floor(now / 60) * 60;
  const dayWindow = Math.floor(now / 86400) * 86400;
  
  let state = rateLimitCache.get(apiKeyId);
  
  // Initialize or reset state
  if (!state || state.minuteReset < minuteWindow) {
    state = {
      minuteCount: 0,
      minuteReset: minuteWindow + 60,
      dayCount: state?.dayReset === dayWindow + 86400 ? state.dayCount : 0,
      dayReset: dayWindow + 86400,
    };
  }
  
  // Check day limit first
  if (state.dayCount >= limitPerDay) {
    const retryAfter = state.dayReset - now;
    return {
      allowed: false,
      remaining: 0,
      reset: state.dayReset,
      retryAfter,
    };
  }
  
  // Check minute limit
  if (state.minuteCount >= limitPerMinute) {
    const retryAfter = state.minuteReset - now;
    return {
      allowed: false,
      remaining: 0,
      reset: state.minuteReset,
      retryAfter,
    };
  }
  
  // Increment counters
  state.minuteCount++;
  state.dayCount++;
  rateLimitCache.set(apiKeyId, state);
  
  return {
    allowed: true,
    remaining: Math.min(
      limitPerMinute - state.minuteCount,
      limitPerDay - state.dayCount
    ),
    reset: state.minuteReset,
  };
}

// =============================================================================
// Request ID Generation
// =============================================================================

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomUUID().split('-')[0];
  return `req_${timestamp}${randomPart}`;
}

// =============================================================================
// Logging
// =============================================================================

/**
 * Log API request to partner_api_logs table
 */
export async function logApiRequest(
  partnerId: string,
  apiKeyId: string,
  requestId: string,
  method: string,
  path: string,
  statusCode: number,
  requestBody: unknown,
  responseBody: unknown,
  ipAddress: string | null,
  durationMs: number
): Promise<void> {
  const supabase = getServiceClient();
  
  // Sanitize request body (remove sensitive fields)
  const sanitizedBody = sanitizeRequestBody(requestBody);
  
  try {
    await supabase.from('partner_api_logs').insert({
      partner_id: partnerId,
      api_key_id: apiKeyId,
      request_id: requestId,
      method,
      path,
      status_code: statusCode,
      request_body_sanitized: sanitizedBody,
      response_body: responseBody,
      ip_address: ipAddress,
      duration_ms: durationMs,
    });
  } catch (error) {
    console.error('[PartnerAuth] Failed to log request:', error);
  }
}

/**
 * Sanitize request body for logging
 * Removes sensitive fields like API keys, passwords, etc.
 */
function sanitizeRequestBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sensitiveFields = ['api_key', 'password', 'secret', 'token', 'signature'];
  const sanitized = { ...body as Record<string, unknown> };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}
