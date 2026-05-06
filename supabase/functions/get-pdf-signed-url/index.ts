import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Kind = 'proposal' | 'signed_agreement';

interface Body {
  proposalId: string;
  kind: Kind;
  invitationToken?: string;
  download?: string; // optional filename to force download
}

const SIGNED_URL_TTL = 60 * 60; // 1 hour

/**
 * Extract the storage object path from a Supabase storage URL.
 * Works for both /object/public/<bucket>/<path> and /object/sign/<bucket>/<path>?token=...
 */
function extractStoragePath(url: string, bucket: string): string | null {
  if (!url) return null;
  const m = url.match(new RegExp(`/object/(?:public|sign)/${bucket}/([^?]+)`));
  if (m) return decodeURIComponent(m[1]);
  // Fallback: assume url is already a path
  if (!url.startsWith('http')) return url;
  return null;
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

    const { proposalId, kind, invitationToken, download }: Body = await req.json();

    if (!proposalId || !kind) {
      return new Response(JSON.stringify({ error: 'proposalId and kind are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load proposal (service role bypasses RLS)
    const { data: proposal, error: proposalErr } = await admin
      .from('proposals')
      .select('id, agent_id, client_id, client_reference_id, pdf_url, invitation_token, invitation_expires_at, deleted_at')
      .eq('id', proposalId)
      .single();

    if (proposalErr || !proposal || proposal.deleted_at) {
      return new Response(JSON.stringify({ error: 'Proposal not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorize the caller
    let authorized = false;

    // 1) Invitation-token path (anonymous)
    if (invitationToken && proposal.invitation_token === invitationToken) {
      const exp = proposal.invitation_expires_at ? new Date(proposal.invitation_expires_at) : null;
      if (exp && exp.getTime() > Date.now()) authorized = true;
    }

    // 2) Authenticated user path
    if (!authorized) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await admin.auth.getUser(token);
        if (user) {
          // Admin?
          const { data: roleRow } = await admin
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          if (roleRow) authorized = true;

          // Agent / company member of agent?
          if (!authorized && proposal.agent_id) {
            if (proposal.agent_id === user.id) {
              authorized = true;
            } else {
              const { data: cm } = await admin
                .from('company_members')
                .select('company_id')
                .eq('user_id', user.id)
                .eq('status', 'active');
              if (cm && cm.length) {
                const ids = cm.map((r: any) => r.company_id);
                const { data: agentCm } = await admin
                  .from('company_members')
                  .select('user_id')
                  .eq('user_id', proposal.agent_id)
                  .eq('status', 'active')
                  .in('company_id', ids);
                if (agentCm && agentCm.length) authorized = true;
              }
            }
          }

          // Direct client?
          if (!authorized && proposal.client_id === user.id) authorized = true;

          // Client via client_reference_id (clients.user_id)
          if (!authorized && proposal.client_reference_id) {
            const { data: c } = await admin
              .from('clients')
              .select('user_id')
              .eq('id', proposal.client_reference_id)
              .maybeSingle();
            if (c?.user_id === user.id) authorized = true;
          }
        }
      }
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve the storage path + bucket
    let bucket: string;
    let path: string | null = null;

    if (kind === 'proposal') {
      bucket = 'proposal-pdfs';
      path = extractStoragePath(proposal.pdf_url ?? '', bucket);
    } else {
      bucket = 'signed-agreements';
      const { data: agreement } = await admin
        .from('proposal_agreements')
        .select('signed_pdf_url')
        .eq('proposal_id', proposalId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      path = extractStoragePath(agreement?.signed_pdf_url ?? '', bucket);
    }

    if (!path) {
      return new Response(JSON.stringify({ error: 'PDF not available yet' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL, download ? { download } : undefined);

    if (signErr || !signed?.signedUrl) {
      console.error('[get-pdf-signed-url] sign error', signErr);
      return new Response(JSON.stringify({ error: 'Failed to sign URL' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      signed_url: signed.signedUrl,
      expires_in: SIGNED_URL_TTL,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('[get-pdf-signed-url] error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
