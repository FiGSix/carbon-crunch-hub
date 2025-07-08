
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// API key validation function
function validateApiKey(apiKey: string): { valid: boolean; message: string } {
  if (!apiKey) {
    return { valid: false, message: 'API key is missing' }
  }
  
  if (apiKey.length < 20) {
    return { valid: false, message: 'API key appears to be too short' }
  }
  
  if (!apiKey.startsWith('AIza')) {
    return { valid: false, message: 'API key format is invalid (should start with AIza)' }
  }
  
  return { valid: true, message: 'API key format is valid' }
}

serve(async (req) => {
  const startTime = Date.now()
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { placeId, sessionToken } = await req.json()
    
    console.log('=== Google Place Details Request ===')
    console.log('Place ID:', placeId)
    console.log('Session Token:', sessionToken ? 'Present' : 'Not provided')
    console.log('Request timestamp:', new Date().toISOString())
    
    if (!placeId) {
      console.error('❌ Validation failed: Place ID is required')
      return new Response(
        JSON.stringify({ error: 'Place ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    
    // Enhanced API key validation
    const keyValidation = validateApiKey(apiKey || '')
    if (!keyValidation.valid) {
      console.error('❌ API Key validation failed:', keyValidation.message)
      console.error('API Key present:', !!apiKey)
      console.error('API Key length:', apiKey?.length || 0)
      console.error('API Key first 10 chars:', apiKey?.substring(0, 10) || 'N/A')
      
      return new Response(
        JSON.stringify({ 
          error: 'Google Maps API key configuration issue',
          details: keyValidation.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ API key validation passed:', keyValidation.message)

    // Build the URL with parameters
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.append('place_id', placeId)
    url.searchParams.append('fields', 'formatted_address,geometry')
    url.searchParams.append('key', apiKey!)
    
    if (sessionToken) {
      url.searchParams.append('sessiontoken', sessionToken)
    }

    console.log('🔄 Making Google Place Details API request...')
    console.log('URL (without key):', url.toString().replace(apiKey!, '[API_KEY_HIDDEN]'))

    const response = await fetch(url.toString())
    const responseTime = Date.now() - startTime
    
    console.log('⏱️  Request timing:', responseTime + 'ms')
    console.log('📡 Response status:', response.status)
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      console.error('❌ Google Place Details API HTTP error:', response.status, response.statusText)
      
      let errorBody = ''
      try {
        errorBody = await response.text()
        console.error('❌ Error response body:', errorBody)
      } catch (e) {
        console.error('❌ Could not read error response body:', e)
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch place details',
          httpStatus: response.status,
          statusText: response.statusText,
          responseTime: responseTime
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    console.log('📊 Google Place Details API response status:', data.status)
    console.log('📊 Response data structure:', {
      status: data.status,
      result: data.result ? 'Present' : 'Missing',
      error_message: data.error_message || 'None'
    })

    // Enhanced status handling
    if (data.status === 'REQUEST_DENIED') {
      console.error('❌ Google API REQUEST_DENIED:', data.error_message)
      console.error('This usually means API key issues or billing problems')
      
      return new Response(
        JSON.stringify({ 
          error: 'Google API access denied',
          details: data.error_message,
          status: data.status,
          troubleshooting: 'Check API key permissions and billing status'
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('❌ Google API OVER_QUERY_LIMIT:', data.error_message)
      
      return new Response(
        JSON.stringify({ 
          error: 'Google API quota exceeded',
          details: data.error_message,
          status: data.status
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (data.status !== 'OK') {
      console.error('❌ Unexpected Google API status:', data.status, data.error_message)
      
      return new Response(
        JSON.stringify({ 
          error: 'Google API error',
          details: data.error_message,
          status: data.status
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Request completed successfully')
    console.log('📊 Total response time:', responseTime + 'ms')

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error('💥 Error in google-place-details function:', error)
    console.error('💥 Error type:', error.constructor.name)
    console.error('💥 Error message:', error.message)
    console.error('💥 Error occurred after:', responseTime + 'ms')
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        responseTime: responseTime
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
