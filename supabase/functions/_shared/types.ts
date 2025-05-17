
// Shared types for edge functions
export interface ClientProfileRequest {
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  existingClient: boolean;
}

export interface ClientProfileResponse {
  clientId: string;
  isNewProfile: boolean;
  isRegisteredUser: boolean;
  error?: string;
}

export interface ErrorResponse {
  error: string;
  status?: number;
}

// Standard CORS headers for all edge functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
