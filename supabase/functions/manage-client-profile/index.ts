
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
  isRegisteredUser: boolean;
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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase environment variables")
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Create Supabase client with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get user information from authorization header to verify permissions
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error("No authorization header provided")
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Extract and verify the JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError) {
      console.error("Authentication error:", authError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed - ' + authError.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!authUser) {
      console.error("No user found in token")
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token or no user found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Check if the user has the agent role
    const { data: agentData, error: roleError } = await supabase
      .rpc('get_user_role', { user_id: authUser.id })
    
    if (roleError) {
      console.error("Role verification error:", roleError)
      return new Response(
        JSON.stringify({ error: 'Error verifying user role: ' + roleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (agentData !== 'agent' && agentData !== 'admin') {
      console.error("Permission denied: User role is", agentData)
      return new Response(
        JSON.stringify({ error: 'Permission denied. Only agents can create client profiles.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Parse the request
    let requestBody;
    try {
      requestBody = await req.json() as ClientProfileRequest
    } catch (parseError) {
      console.error("Error parsing request body:", parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const { name, email, phone, companyName, existingClient } = requestBody
    
    if (!email) {
      console.error("Email is required")
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Logic for existing clients
    if (existingClient) {
      console.log("Searching for existing client with email:", email)
      
      // First, search in profiles (registered users)
      const { data: existingProfile, error: profileSearchError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', email)
        .eq('role', 'client')
        .maybeSingle()
      
      if (profileSearchError) {
        console.error("Error searching for client in profiles:", profileSearchError)
      }
      
      if (existingProfile) {
        console.log("Found existing registered user profile:", existingProfile.id)
        return new Response(
          JSON.stringify({ 
            clientId: existingProfile.id,
            isNewProfile: false,
            isRegisteredUser: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // If not found in profiles, search in client_contacts
      const { data: existingContact, error: contactSearchError } = await supabase
        .from('client_contacts')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      
      if (contactSearchError) {
        console.error("Error searching for client in client_contacts:", contactSearchError)
      }
      
      if (existingContact) {
        console.log("Found existing client contact:", existingContact.id)
        return new Response(
          JSON.stringify({ 
            clientId: existingContact.id,
            isNewProfile: false,
            isRegisteredUser: false
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.error("No existing client found with email:", email)
      return new Response(
        JSON.stringify({ error: `No existing client found with email: ${email}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } 
    // Logic for new clients - Add to client_contacts table
    else {
      console.log("Creating new client contact with email:", email)
      
      // First check if a profile with this email already exists
      const { data: existingProfile, error: profileSearchError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', email)
        .eq('role', 'client')
        .maybeSingle()
      
      if (profileSearchError) {
        console.error("Error checking for existing profile:", profileSearchError)
      }
      
      if (existingProfile) {
        console.log("Found existing registered user profile when trying to create new:", existingProfile.id)
        return new Response(
          JSON.stringify({ 
            clientId: existingProfile.id,
            isNewProfile: false,
            isRegisteredUser: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Check if a client contact with this email already exists
      const { data: existingContact, error: contactSearchError } = await supabase
        .from('client_contacts')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      
      if (contactSearchError) {
        console.error("Error checking for existing client contact:", contactSearchError)
      }
      
      if (existingContact) {
        console.log("Found existing client contact when trying to create new:", existingContact.id)
        return new Response(
          JSON.stringify({ 
            clientId: existingContact.id,
            isNewProfile: false,
            isRegisteredUser: false
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Parse name into first and last name
      const firstName = name.split(' ')[0] || '';
      const lastName = name.split(' ').slice(1).join(' ') || '';
      
      // Create a new client contact with built-in UUID generation from Postgres
      const { data: newContact, error: createError } = await supabase
        .from('client_contacts')
        .insert({
          first_name: firstName,
          last_name: lastName,
          email: email,
          phone: phone,
          company_name: companyName,
          created_by: authUser.id
        })
        .select('id')
        .single()
      
      if (createError) {
        console.error("Error creating client contact:", createError)
        return new Response(
          JSON.stringify({ error: `Error creating client contact: ${createError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (!newContact || !newContact.id) {
        console.error("Failed to create client contact, no ID returned")
        return new Response(
          JSON.stringify({ error: "Failed to create client contact, no ID returned" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log("Successfully created new client contact:", newContact.id)
      return new Response(
        JSON.stringify({ 
          clientId: newContact.id,
          isNewProfile: true,
          isRegisteredUser: false
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
