
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
}

export interface ErrorResponse {
  error: string;
  status: number;
}
