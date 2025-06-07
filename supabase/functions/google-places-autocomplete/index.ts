
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { input, sessionToken } = await req.json()
    
    if (!input) {
      return new Response(
        JSON.stringify({ error: 'Input is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) {
      console.error('Google Maps API key not found')
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Making Google Places API request for input:', input)

    // Build the URL with parameters
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.append('input', input)
    url.searchParams.append('types', 'address')
    url.searchParams.append('components', 'country:za') // Restrict to South Africa
    url.searchParams.append('key', apiKey)
    
    if (sessionToken) {
      url.searchParams.append('sessiontoken', sessionToken)
    }

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      console.error('Google Places API error:', response.status, response.statusText)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch places data' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    console.log('Google Places API response status:', data.status)

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in google-places-autocomplete function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
