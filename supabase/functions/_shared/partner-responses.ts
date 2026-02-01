/**
 * Partner API Response Helpers
 * Standardized response formatting for the Partner API v1
 */

import { corsHeaders } from './cors.ts';
import { PartnerApiError, ERROR_CODES, type ErrorCode, type DuplicateMatch } from './partner-types.ts';

// =============================================================================
// Response Headers
// =============================================================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export function createResponseHeaders(
  requestId: string,
  rateLimit?: RateLimitInfo,
  etag?: string
): Headers {
  const headers = new Headers({
    ...corsHeaders,
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
  });

  if (rateLimit) {
    headers.set('X-RateLimit-Limit', String(rateLimit.limit));
    headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    headers.set('X-RateLimit-Reset', String(rateLimit.reset));
  }

  if (etag) {
    headers.set('ETag', `"${etag}"`);
  }

  return headers;
}

// =============================================================================
// Success Responses
// =============================================================================

export function successResponse<T>(
  data: T,
  requestId: string,
  options?: {
    status?: number;
    rateLimit?: RateLimitInfo;
    etag?: string;
  }
): Response {
  const headers = createResponseHeaders(
    requestId,
    options?.rateLimit,
    options?.etag
  );

  return new Response(
    JSON.stringify({
      success: true,
      ...data,
    }),
    {
      status: options?.status || 200,
      headers,
    }
  );
}

// =============================================================================
// Error Responses
// =============================================================================

export function errorResponse(
  errorCode: ErrorCode,
  message: string,
  requestId: string,
  options?: {
    field?: string;
    received?: unknown;
    matches?: DuplicateMatch[];
    rateLimit?: RateLimitInfo;
    retryAfter?: number;
    currentEtag?: string;
  }
): Response {
  const errorInfo = ERROR_CODES[errorCode];
  const headers = createResponseHeaders(requestId, options?.rateLimit);

  if (options?.retryAfter) {
    headers.set('Retry-After', String(options.retryAfter));
  }

  const error: PartnerApiError = {
    code: errorInfo.code,
    message,
  };

  if (options?.field) {
    error.field = options.field;
  }

  if (options?.received !== undefined) {
    error.received = options.received;
  }

  if (options?.matches) {
    error.matches = options.matches;
  }

  const body: Record<string, unknown> = {
    success: false,
    error,
    request_id: requestId,
  };

  // Add current ETag for concurrency conflicts
  if (errorCode === 'CONCURRENCY_CONFLICT' && options?.currentEtag) {
    (error as Record<string, unknown>).current_etag = options.currentEtag;
  }

  return new Response(JSON.stringify(body), {
    status: errorInfo.status,
    headers,
  });
}

// =============================================================================
// Convenience Error Functions
// =============================================================================

export function unauthorizedResponse(requestId: string, message = 'Invalid or missing API key'): Response {
  return errorResponse('UNAUTHORIZED', message, requestId);
}

export function forbiddenResponse(requestId: string, message = 'Access denied'): Response {
  return errorResponse('FORBIDDEN', message, requestId);
}

export function scopeInsufficientResponse(requestId: string, requiredScope: string): Response {
  return errorResponse(
    'SCOPE_INSUFFICIENT',
    `Missing required scope: ${requiredScope}`,
    requestId
  );
}

export function notFoundResponse(requestId: string, resource = 'Resource'): Response {
  return errorResponse('NOT_FOUND', `${resource} not found`, requestId);
}

export function validationErrorResponse(
  requestId: string,
  message: string,
  field?: string,
  received?: unknown
): Response {
  return errorResponse('VALIDATION_ERROR', message, requestId, { field, received });
}

export function rateLimitedResponse(
  requestId: string,
  retryAfter: number,
  rateLimit?: RateLimitInfo
): Response {
  return errorResponse(
    'RATE_LIMITED',
    `Too many requests. Retry after ${retryAfter} seconds.`,
    requestId,
    { retryAfter, rateLimit }
  );
}

export function concurrencyConflictResponse(
  requestId: string,
  currentEtag: string
): Response {
  return errorResponse(
    'CONCURRENCY_CONFLICT',
    'Resource was modified. Fetch latest version and retry.',
    requestId,
    { currentEtag }
  );
}

export function duplicateProposalResponse(
  requestId: string,
  matches: DuplicateMatch[]
): Response {
  return errorResponse(
    'DUPLICATE_PROPOSAL',
    'Possible duplicate proposal found',
    requestId,
    { matches }
  );
}

export function internalErrorResponse(requestId: string, message = 'An internal error occurred'): Response {
  return errorResponse('INTERNAL_ERROR', message, requestId);
}

// =============================================================================
// CORS Preflight
// =============================================================================

export function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
