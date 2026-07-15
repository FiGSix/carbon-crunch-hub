import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BackfillRequest {
  proposalId?: string; // if provided, backfill just this one; otherwise scan all missing
  sendEmail?: boolean; // default false: regenerate PDF only, do not re-email the client
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Admin auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleData } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { proposalId, sendEmail = false }: BackfillRequest = await req.json().catch(() => ({}));

    // Build list of agreements to process
    let query = admin
      .from('proposal_agreements')
      .select('id, proposal_id, signed_pdf_url')
      .is('signed_pdf_url', null);
    if (proposalId) query = query.eq('proposal_id', proposalId);

    const { data: rows, error: rowsErr } = await query.limit(200);
    if (rowsErr) {
      return new Response(JSON.stringify({ error: rowsErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: Array<{ proposalId: string; agreementId: string; ok: boolean; error?: string; emailed?: boolean }> = [];

    for (const row of rows ?? []) {
      try {
        const { data: pdfRes, error: pdfErr } = await admin.functions.invoke(
          'generate-signed-agreement-pdf',
          { body: { proposalId: row.proposal_id, agreementId: row.id } }
        );
        if (pdfErr || !pdfRes?.signed_pdf_url) {
          results.push({ proposalId: row.proposal_id, agreementId: row.id, ok: false, error: pdfErr?.message || 'no signed_pdf_url returned' });
          continue;
        }

        let emailed = false;
        if (sendEmail) {
          // Resolve client email
          const { data: prop } = await admin
            .from('proposals')
            .select('content, client_id, client_reference_id')
            .eq('id', row.proposal_id)
            .single();

          let clientEmail: string | null = prop?.content?.clientInfo?.email ?? null;
          if (!clientEmail && prop?.client_id) {
            const { data } = await admin.from('profiles').select('email').eq('id', prop.client_id).single();
            clientEmail = data?.email ?? null;
          }
          if (!clientEmail && prop?.client_reference_id) {
            const { data } = await admin.from('clients').select('email').eq('id', prop.client_reference_id).single();
            clientEmail = data?.email ?? null;
          }

          if (clientEmail) {
            const { error: emailErr } = await admin.functions.invoke('send-cession-agreement-email', {
              body: { proposalId: row.proposal_id, clientEmail },
            });
            emailed = !emailErr;
            if (emailErr) console.error('[backfill] email error', emailErr);
          }
        }

        results.push({ proposalId: row.proposal_id, agreementId: row.id, ok: true, emailed });
      } catch (e) {
        results.push({ proposalId: row.proposal_id, agreementId: row.id, ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[backfill-signed-agreements] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
