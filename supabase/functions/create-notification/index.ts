
import { serve } from "https://deno.land/std@0.198.0/http/server.ts"
import { supabase } from "../_shared/supabase-client.ts"

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Interface for the notification request body
interface NotificationRequest {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  relatedId?: string;
  relatedType?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the request body
    const requestData: NotificationRequest = await req.json()
    
    // Validate required fields
    if (!requestData.userId || !requestData.title || !requestData.message || !requestData.type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Create the notification in the database
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: requestData.userId,
        title: requestData.title,
        message: requestData.message,
        type: requestData.type,
        related_id: requestData.relatedId,
        related_type: requestData.relatedType,
        read: false,
        created_at: new Date().toISOString()
      })
      .select('id')
    
    if (error) {
      console.error('Error creating notification:', error)
      throw error
    }
    
    return new Response(
      JSON.stringify({ success: true, id: data[0]?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error in create-notification function:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
