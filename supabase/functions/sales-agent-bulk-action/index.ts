import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Auth required' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === 'admin');
    if (!isAdmin) return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { candidate_ids, action, reason } = await req.json() as { candidate_ids: string[]; action: 'approve' | 'reject'; reason?: string };
    if (!Array.isArray(candidate_ids) || candidate_ids.length === 0) return new Response(JSON.stringify({ error: 'No candidate_ids' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (action !== 'approve' && action !== 'reject') return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Impersonate the calling user so auth.uid() works inside the RPCs (RPCs are SECURITY DEFINER but use auth.uid for the admin check & created_by).
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: any[] = [];
    let ok = 0, fail = 0;
    for (const id of candidate_ids) {
      const { data, error } = action === 'approve'
        ? await userClient.rpc('promote_discovery_candidate', { _candidate_id: id })
        : await userClient.rpc('reject_discovery_candidate', { _candidate_id: id, _reason: reason ?? null });
      if (error) { fail++; results.push({ id, ok: false, error: error.message }); }
      else { ok++; results.push({ id, ok: true, data }); }
    }
    return new Response(JSON.stringify({ success: true, ok, fail, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
