
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// Define type for the request body
interface ClientProfileRequest {
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  existingClient: boolean;
}

// Define type for the response
interface ClientProfileResponse {
  clientId: string;
  isNewProfile: boolean;
  error?: string;
}

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    
    // Create Supabase client with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get user information from authorization header to verify permissions
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Extract and verify the JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check if the user has the agent role
    const { data: agentData, error: roleError } = await supabase
      .rpc('get_user_role', { user_id: authUser.id })
    
    if (roleError || (agentData !== 'agent' && agentData !== 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Permission denied. Only agents can create client profiles.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Parse the request
    const { name, email, phone, companyName, existingClient } = await req.json() as ClientProfileRequest
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Logic for existing clients
    if (existingClient) {
      // Search for existing client by email
      const { data: existingProfile, error: searchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()
        
      if (searchError && searchError.code !== 'PGRST116') {
        console.error("Error finding client:", searchError)
        return new Response(
          JSON.stringify({ error: `Error finding client: ${searchError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (existingProfile) {
        return new Response(
          JSON.stringify({ 
            clientId: existingProfile.id,
            isNewProfile: false
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ error: `No existing client found with email: ${email}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } 
    // Logic for new clients
    else {
      // First check if a profile with this email already exists
      const { data: existingProfile, error: searchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      
      if (searchError) {
        console.error("Error checking for existing profile:", searchError)
        return new Response(
          JSON.stringify({ error: `Error checking for existing profile: ${searchError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (existingProfile) {
        return new Response(
          JSON.stringify({ 
            clientId: existingProfile.id,
            isNewProfile: false
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Create a new profile with a server-generated UUID
      const newProfileId = crypto.randomUUID()
      const firstName = name.split(' ')[0]
      const lastName = name.split(' ').slice(1).join(' ')
      
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: newProfileId,
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          company_name: companyName,
          role: 'client'
        })
      
      if (createError) {
        console.error("Error creating client profile:", createError)
        return new Response(
          JSON.stringify({ error: `Error creating client profile: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          clientId: newProfileId,
          isNewProfile: true 
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error("Unexpected error:", error)
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
