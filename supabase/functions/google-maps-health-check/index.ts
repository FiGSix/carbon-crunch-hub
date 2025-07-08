import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthCheckResult {
  timestamp: string
  apiKeyValidation: {
    present: boolean
    format: 'valid' | 'invalid' | 'missing'
    length: number
    firstChars: string
  }
  autocompleteTest: {
    success: boolean
    status?: string
    responseTime?: number
    error?: string
    predictionCount?: number
  }
  detailsTest: {
    success: boolean
    status?: string
    responseTime?: number
    error?: string
    hasResult?: boolean
  }
  overall: {
    healthy: boolean
    issues: string[]
    recommendations: string[]
  }
}

// API key validation function
function validateApiKey(apiKey: string): { valid: boolean; format: 'valid' | 'invalid' | 'missing'; message: string } {
  if (!apiKey) {
    return { valid: false, format: 'missing', message: 'API key is missing' }
  }
  
  if (apiKey.length < 20) {
    return { valid: false, format: 'invalid', message: 'API key appears to be too short' }
  }
  
  if (!apiKey.startsWith('AIza')) {
    return { valid: false, format: 'invalid', message: 'API key format is invalid (should start with AIza)' }
  }
  
  return { valid: true, format: 'valid', message: 'API key format is valid' }
}

// Test Google Places Autocomplete API
async function testAutocomplete(apiKey: string): Promise<{
  success: boolean
  status?: string
  responseTime?: number
  error?: string
  predictionCount?: number
}> {
  const startTime = Date.now()
  
  try {
    // Test with a simple South African address
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.append('input', 'Cape Town')
    url.searchParams.append('types', 'address')
    url.searchParams.append('components', 'country:za')
    url.searchParams.append('key', apiKey)
    
    const response = await fetch(url.toString())
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      return {
        success: false,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
    
    const data = await response.json()
    
    return {
      success: data.status === 'OK' || data.status === 'ZERO_RESULTS',
      status: data.status,
      responseTime,
      predictionCount: data.predictions?.length || 0,
      error: data.status !== 'OK' && data.status !== 'ZERO_RESULTS' ? data.error_message : undefined
    }
    
  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      error: error.message
    }
  }
}

// Test Google Place Details API
async function testPlaceDetails(apiKey: string): Promise<{
  success: boolean
  status?: string
  responseTime?: number
  error?: string
  hasResult?: boolean
}> {
  const startTime = Date.now()
  
  try {
    // Use a well-known place ID for Cape Town City Hall
    const placeId = 'ChIJD7fiBh9u5kcRYJSMaMOCCwQ'
    
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.append('place_id', placeId)
    url.searchParams.append('fields', 'formatted_address,geometry')
    url.searchParams.append('key', apiKey)
    
    const response = await fetch(url.toString())
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      return {
        success: false,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
    
    const data = await response.json()
    
    return {
      success: data.status === 'OK',
      status: data.status,
      responseTime,
      hasResult: !!data.result,
      error: data.status !== 'OK' ? data.error_message : undefined
    }
    
  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      error: error.message
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🏥 Starting Google Maps API health check...')
    
    const healthCheck: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      apiKeyValidation: {
        present: false,
        format: 'missing',
        length: 0,
        firstChars: ''
      },
      autocompleteTest: {
        success: false
      },
      detailsTest: {
        success: false
      },
      overall: {
        healthy: false,
        issues: [],
        recommendations: []
      }
    }

    // Test 1: API Key Validation
    console.log('🔑 Testing API key configuration...')
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    
    healthCheck.apiKeyValidation = {
      present: !!apiKey,
      format: apiKey ? validateApiKey(apiKey).format : 'missing',
      length: apiKey?.length || 0,
      firstChars: apiKey?.substring(0, 10) || ''
    }

    if (!apiKey) {
      healthCheck.overall.issues.push('GOOGLE_MAPS_API_KEY environment variable is not set')
      healthCheck.overall.recommendations.push('Configure the GOOGLE_MAPS_API_KEY secret in Supabase')
    } else {
      const validation = validateApiKey(apiKey)
      if (!validation.valid) {
        healthCheck.overall.issues.push(`API key format issue: ${validation.message}`)
        healthCheck.overall.recommendations.push('Verify your Google Maps API key is correct')
      }
    }

    // Test 2: Autocomplete API Test
    if (apiKey && validateApiKey(apiKey).valid) {
      console.log('🔍 Testing Places Autocomplete API...')
      healthCheck.autocompleteTest = await testAutocomplete(apiKey)
      
      if (!healthCheck.autocompleteTest.success) {
        healthCheck.overall.issues.push(`Autocomplete API failed: ${healthCheck.autocompleteTest.error}`)
        
        if (healthCheck.autocompleteTest.status === 'REQUEST_DENIED') {
          healthCheck.overall.recommendations.push('Check API key permissions and enable Places API')
          healthCheck.overall.recommendations.push('Verify billing is enabled for your Google Cloud project')
        } else if (healthCheck.autocompleteTest.status === 'OVER_QUERY_LIMIT') {
          healthCheck.overall.recommendations.push('API quota exceeded - check your usage limits')
        }
      }

      // Test 3: Place Details API Test
      console.log('📍 Testing Place Details API...')
      healthCheck.detailsTest = await testPlaceDetails(apiKey)
      
      if (!healthCheck.detailsTest.success) {
        healthCheck.overall.issues.push(`Place Details API failed: ${healthCheck.detailsTest.error}`)
        
        if (healthCheck.detailsTest.status === 'REQUEST_DENIED') {
          healthCheck.overall.recommendations.push('Enable Place Details API in Google Cloud Console')
        }
      }
    } else {
      healthCheck.autocompleteTest.error = 'Skipped due to invalid API key'
      healthCheck.detailsTest.error = 'Skipped due to invalid API key'
    }

    // Overall health assessment
    healthCheck.overall.healthy = 
      healthCheck.apiKeyValidation.present &&
      healthCheck.apiKeyValidation.format === 'valid' &&
      healthCheck.autocompleteTest.success &&
      healthCheck.detailsTest.success

    if (healthCheck.overall.healthy) {
      console.log('✅ All Google Maps API health checks passed!')
    } else {
      console.log('❌ Google Maps API health check failed')
      console.log('Issues:', healthCheck.overall.issues)
      console.log('Recommendations:', healthCheck.overall.recommendations)
    }

    // Add general recommendations if there are issues
    if (healthCheck.overall.issues.length > 0) {
      healthCheck.overall.recommendations.push('Check Google Cloud Console for API restrictions')
      healthCheck.overall.recommendations.push('Verify your billing account is active')
      healthCheck.overall.recommendations.push('Ensure IP restrictions allow Supabase edge function servers')
    }

    return new Response(
      JSON.stringify(healthCheck, null, 2),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('💥 Error in health check function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Health check failed',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})