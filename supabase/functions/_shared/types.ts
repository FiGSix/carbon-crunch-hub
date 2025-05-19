
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
