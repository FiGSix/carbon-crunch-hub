import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 50;
const DELAY_MS = 150; // ~400 requests/min, well under Mapbox's 600/min limit
const MIN_ADDRESS_LENGTH = 5;
const SKIP_PATTERNS = ['n/a', 'na', 'tbc', 'tbd', 'unknown', 'none', 'test', '-'];

function isValidAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  const trimmed = address.trim();
  if (trimmed.length < MIN_ADDRESS_LENGTH) return false;
  if (SKIP_PATTERNS.includes(trimmed.toLowerCase())) return false;
  return true;
}

async function forwardGeocode(address: string, mapboxToken: string): Promise<{ lat: number; lng: number } | null> {
  const encoded = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${mapboxToken}&country=ZA&types=address,place,locality&limit=1`;
  
  const response = await fetch(url);
  if (!response.ok) return null;
  
  const data = await response.json();
  const feature = data.features?.[0];
  if (!feature?.center) return null;
  
  return { lat: feature.center[1], lng: feature.center[0] };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate admin access
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');

    if (!mapboxToken) {
      return new Response(JSON.stringify({ error: 'MAPBOX_ACCESS_TOKEN not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Verify admin role using service client
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check admin role
    const { data: roles } = await adminClient.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = roles?.some((r: any) => r.role === 'admin');
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { dryRun = false } = await req.json().catch(() => ({}));

    const summary = { processed: 0, succeeded: 0, failed: 0, skipped: 0, onboardingSucceeded: 0, onboardingFailed: 0, onboardingSkipped: 0 };

    // --- PHASE 1: Backfill proposals ---
    const { data: proposals, error: fetchError } = await adminClient
      .from('proposals')
      .select('id, project_info')
      .is('deleted_at', null)
      .not('project_info', 'is', null)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    const toProcess = (proposals || []).filter((p: any) => {
      const info = p.project_info;
      if (!info) return false;
      // Already has GPS
      if (info.gpsLat && info.gpsLng) return false;
      // Has address to geocode
      return isValidAddress(info.address);
    });

    console.log(`Found ${toProcess.length} proposals to geocode (out of ${proposals?.length || 0} total)`);

    for (let i = 0; i < toProcess.length; i++) {
      const proposal = toProcess[i];
      const address = proposal.project_info.address;
      summary.processed++;

      if (dryRun) {
        summary.skipped++;
        continue;
      }

      try {
        const coords = await forwardGeocode(address, mapboxToken);
        if (!coords) {
          summary.failed++;
          console.log(`No results for: "${address}" (proposal ${proposal.id})`);
          continue;
        }

        const updatedInfo = {
          ...proposal.project_info,
          gpsLat: coords.lat,
          gpsLng: coords.lng,
          addressSource: 'backfill',
        };

        const { error: updateError } = await adminClient
          .from('proposals')
          .update({ project_info: updatedInfo })
          .eq('id', proposal.id);

        if (updateError) {
          summary.failed++;
          console.error(`Update failed for proposal ${proposal.id}:`, updateError.message);
        } else {
          summary.succeeded++;
        }
      } catch (e) {
        summary.failed++;
        console.error(`Geocode error for proposal ${proposal.id}:`, e.message);
      }

      if (i < toProcess.length - 1) await sleep(DELAY_MS);
    }

    // --- PHASE 2: Backfill onboarding_fields ---
    const { data: onboardingRows, error: obError } = await adminClient
      .from('onboarding_fields')
      .select('id, project_id, system_address, system_gps_lat, system_gps_lng')
      .is('system_gps_lat', null)
      .not('system_address', 'is', null);

    if (obError) {
      console.error('Error fetching onboarding_fields:', obError.message);
    } else {
      const obToProcess = (onboardingRows || []).filter((r: any) => isValidAddress(r.system_address));
      console.log(`Found ${obToProcess.length} onboarding_fields to geocode`);

      for (let i = 0; i < obToProcess.length; i++) {
        const row = obToProcess[i];

        if (dryRun) {
          summary.onboardingSkipped++;
          continue;
        }

        try {
          const coords = await forwardGeocode(row.system_address, mapboxToken);
          if (!coords) {
            summary.onboardingFailed++;
            continue;
          }

          const { error: updateErr } = await adminClient
            .from('onboarding_fields')
            .update({ system_gps_lat: coords.lat, system_gps_lng: coords.lng })
            .eq('id', row.id);

          if (updateErr) {
            summary.onboardingFailed++;
          } else {
            summary.onboardingSucceeded++;
          }
        } catch (e) {
          summary.onboardingFailed++;
        }

        if (i < obToProcess.length - 1) await sleep(DELAY_MS);
      }
    }

    console.log('Backfill complete:', summary);

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
