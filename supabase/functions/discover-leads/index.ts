import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscoverRequest {
  query: string;
  location: string;
  limit: number;
}

interface ExtractedLead {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for database operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, location, limit } = await req.json() as DiscoverRequest;

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: 'Search query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting lead discovery: query="${query}", location="${location}", limit=${limit}`);

    // Step 1: Search the web using Firecrawl
    const searchQuery = location ? `${query} ${location}` : query;
    console.log('Searching with Firecrawl:', searchQuery);

    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: Math.min(limit * 2, 20), // Get more results to account for filtering
        scrapeOptions: {
          formats: ['markdown']
        }
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Firecrawl search error:', searchResponse.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: `Search failed: ${searchResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    console.log(`Firecrawl returned ${searchData.data?.length || 0} results`);

    if (!searchData.data || searchData.data.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          leads: [], 
          message: 'No results found for your search query' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Extract lead details using AI for each result
    const extractedLeads: ExtractedLead[] = [];
    const errors: string[] = [];

    for (const result of searchData.data.slice(0, limit)) {
      try {
        const websiteContent = result.markdown || result.description || '';
        const websiteUrl = result.url || '';
        const title = result.title || '';

        if (!websiteContent && !title) {
          console.log('Skipping result with no content');
          continue;
        }

        console.log(`Extracting lead from: ${title || websiteUrl}`);

        // Use Lovable AI to extract structured lead data
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { 
                role: 'system', 
                content: `You are an expert at extracting business contact information from website content. Extract company details for lead generation. Only extract real information found in the content - do not make up or guess any values. If information is not found, omit that field.` 
              },
              { 
                role: 'user', 
                content: `Extract business lead information from this website:\n\nURL: ${websiteUrl}\nTitle: ${title}\n\nContent:\n${websiteContent.slice(0, 3000)}` 
              }
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'extract_lead',
                description: 'Extract business lead information from website content',
                parameters: {
                  type: 'object',
                  properties: {
                    company_name: { 
                      type: 'string',
                      description: 'The name of the company or business'
                    },
                    contact_name: { 
                      type: 'string',
                      description: 'Name of a contact person (owner, manager, etc.)'
                    },
                    email: { 
                      type: 'string',
                      description: 'Business email address'
                    },
                    phone: { 
                      type: 'string',
                      description: 'Business phone number'
                    },
                    location: { 
                      type: 'string',
                      description: 'Business address or location (city, region, country)'
                    },
                    notes: { 
                      type: 'string', 
                      description: 'Brief description of what the business does (1-2 sentences)'
                    }
                  },
                  required: ['company_name']
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'extract_lead' } }
          }),
        });

        if (!aiResponse.ok) {
          const aiError = await aiResponse.text();
          console.error('AI extraction error:', aiResponse.status, aiError);
          
          if (aiResponse.status === 429) {
            errors.push('Rate limit exceeded - try again later');
            break;
          }
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        
        if (toolCall?.function?.arguments) {
          const leadData = JSON.parse(toolCall.function.arguments);
          
          if (leadData.company_name) {
            extractedLeads.push({
              ...leadData,
              website: websiteUrl
            });
            console.log(`Extracted lead: ${leadData.company_name}`);
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error('Error processing result:', error);
        errors.push(`Failed to process: ${result.title || result.url}`);
      }
    }

    console.log(`Extracted ${extractedLeads.length} leads`);

    if (extractedLeads.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          leads: [], 
          message: 'Could not extract any leads from search results',
          errors 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Check for duplicates and insert new leads
    const companyNames = extractedLeads.map(l => l.company_name.toLowerCase().trim());
    
    const { data: existingLeads } = await supabase
      .from('agent_leads')
      .select('company_name')
      .in('company_name', extractedLeads.map(l => l.company_name));

    const existingNames = new Set(
      (existingLeads || []).map(l => l.company_name.toLowerCase().trim())
    );

    const newLeads = extractedLeads.filter(
      l => !existingNames.has(l.company_name.toLowerCase().trim())
    );

    console.log(`New leads to insert: ${newLeads.length} (${extractedLeads.length - newLeads.length} duplicates skipped)`);

    if (newLeads.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          leads: [],
          inserted: 0,
          duplicates: extractedLeads.length,
          message: 'All discovered leads already exist in your database'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert new leads
    const { data: insertedLeads, error: insertError } = await supabase
      .from('agent_leads')
      .insert(newLeads.map(lead => ({
        company_name: lead.company_name,
        contact_name: lead.contact_name || null,
        email: lead.email || null,
        phone: lead.phone || null,
        website: lead.website || null,
        location: lead.location || null,
        notes: lead.notes || null,
        source: 'AI Discovery',
        status: 'new',
        created_by: user.id
      })))
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to save leads: ${insertError.message}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully inserted ${insertedLeads?.length || 0} leads`);

    return new Response(
      JSON.stringify({ 
        success: true,
        leads: insertedLeads || [],
        inserted: insertedLeads?.length || 0,
        duplicates: extractedLeads.length - newLeads.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Discovered and saved ${insertedLeads?.length || 0} new leads`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Discover leads error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
