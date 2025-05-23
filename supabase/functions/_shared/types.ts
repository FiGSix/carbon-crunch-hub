
// Common error response structure
export interface ErrorResponse {
  error: string;
  status: number;
  [key: string]: any;
}

// CORS headers for Supabase Edge Functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Client data structure
export interface ClientData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
}

// Client result structure
export interface ClientResult {
  clientId: string;
  isRegisteredUser: boolean;
}

// Adding the missing types for client profile requests
export interface ClientProfileRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  companyName?: string | null;
  existingClient?: boolean;
}

// Adding the missing types for client profile responses
export interface ClientProfileResponse {
  clientId: string;
  isNewProfile: boolean;
  isRegisteredUser: boolean;
}
