
/**
 * Utility functions for transforming data structures for Supabase compatibility
 */
import { isValidUUID } from "@/utils/validationUtils";
import { logger } from "@/lib/logger";

/**
 * Converts complex TypeScript objects to Supabase-compatible JSON
 * Handles special cases like Dates, arrays, and nested objects
 */
export function convertToSupabaseJson(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => convertToSupabaseJson(item));
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // Handle objects (but not primitive wrappers)
  if (typeof obj === 'object' && Object.getPrototypeOf(obj) === Object.prototype) {
    const result: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = convertToSupabaseJson(obj[key]);
      }
    }
    return result;
  }
  
  // Return primitive values and functions as is
  return obj;
}

/**
 * Validates client ID and returns relevant information about the client type
 * Updated to work with the unified clients table approach
 */
export function validateClientId(
  clientId: string | undefined | null,
  clientReferenceId: string | undefined | null,
  contextLogger: any
): { 
  isValid: boolean; 
  error?: string;
  isRegisteredUser: boolean;
  validClientId?: string;
} {
  // Check if we have at least one valid ID
  if (!clientId && !clientReferenceId) {
    contextLogger.error("Missing both client_id and client_reference_id");
    return { 
      isValid: false, 
      error: "Either client ID or client reference ID must be provided",
      isRegisteredUser: false
    };
  }
  
  // If we have a client_id (registered user)
  if (clientId && isValidUUID(clientId)) {
    return {
      isValid: true,
      isRegisteredUser: true,
      validClientId: clientId
    };
  }
  
  // If we have a client_reference_id (could be registered or non-registered)
  if (clientReferenceId && isValidUUID(clientReferenceId)) {
    return {
      isValid: true,
      isRegisteredUser: false, // We'll determine this from the clients table
      validClientId: clientReferenceId
    };
  }
  
  // If we get here, we have an ID but it's not valid
  const invalidId = clientId || clientReferenceId;
  contextLogger.error("Invalid client ID format", { clientId, clientReferenceId });
  return {
    isValid: false,
    error: `Invalid client ID format: ${invalidId}`,
    isRegisteredUser: false
  };
}
