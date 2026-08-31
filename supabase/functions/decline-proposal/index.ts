import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED_REASONS = new Set([
  'not_interested',
  'income_too_low',
  'need_more_information',
  'not_authorised_to_sign',
  'project_details_incorrect',
  'already_participating',
  'other',
]);

const REASON_LABELS: Record<string, string> = {
  not_interested: 'Not interested',
  income_too_low: 'Income estimate is too low',
  need_more_information: 'Need more information',
  not_authorised_to_sign: 'Not authorised to sign',
  project_details_incorrect: 'Project details are incorrect',
  already_participating: 'Already participating elsewhere',
  other: 'Other',
};

/** Statuses that may still be declined by the client. */
const DECLINABLE = new Set(['sent', 'draft', 'viewed', 'pending', 'review_later']);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 1000) : '';
    const contactRequested = body?.contactRequested === true;

    if (!token) {
      return json({ success: false, error: 'A valid invitation link is required.' }, 400);
    }
    if (reason && !ALLOWED_REASONS.has(reason)) {
      return json({ success: false, error: 'Invalid reason.' }, 400);
    }

    // Resolve the proposal server-side from the token only. Never trust a client-supplied proposal id.
    const { data: rows, error: rpcError } = await supabase
      .rpc('get_proposal_by_token_direct', { token_param: token });

    if (rpcError || !rows || rows.length === 0) {
      console.error('Token resolution failed:', rpcError?.message);
      return json({ success: false, error: 'This link is invalid or has expired.' }, 403);
    }

    const proposal = rows[0];

    // Replay / idempotency: never re-decline or overwrite a signed proposal.
    if (proposal.status === 'rejected') {
      return json({ success: true, alreadyDeclined: true, status: 'rejected' });
    }
    if (proposal.signed_at || proposal.status === 'approved' || proposal.status === 'signed') {
      return json(
        { success: false, error: 'This proposal has already been signed and cannot be declined.' },
        409
      );
    }
    if (!DECLINABLE.has(proposal.status)) {
      return json(
        { success: false, error: 'This proposal is no longer available to decline.' },
        409
      );
    }

    const { error: updateError } = await supabase
      .from('proposals')
      .update({ status: 'rejected', review_later_until: null })
      .eq('id', proposal.id)
      .eq('invitation_token', token);

    if (updateError) {
      console.error('Failed to decline proposal:', updateError);
      return json({ success: false, error: 'Could not record your response. Please try again.' }, 500);
    }

    // Audit / engagement event — no schema change required.
    const { error: logError } = await supabase.from('proposal_automation_log').insert({
      proposal_id: proposal.id,
      // 'status_update' is the allowed automation_type for status transitions;
      // the decline specifics live in trigger_event + details.
      automation_type: 'status_update',
      trigger_event: 'client_decline_via_token',
      old_status: proposal.status,
      new_status: 'rejected',
      details: {
        reason: reason || null,
        reason_label: reason ? REASON_LABELS[reason] : null,
        note: note || null,
        contact_requested: contactRequested,
        declined_at: new Date().toISOString(),
      },
    });

    if (logError) {
      console.error('Failed to write decline audit event:', logError.message);
    }

    if (proposal.agent_id) {
      const reasonText = reason ? ` Reason: ${REASON_LABELS[reason]}.` : '';
      const contactText = contactRequested ? ' The client has asked to be contacted.' : '';
      await supabase.from('notifications').insert({
        user_id: proposal.agent_id,
        title: contactRequested ? 'Proposal declined — contact requested' : 'Proposal declined',
        message: `The proposal "${proposal.title}" was declined by the client.${reasonText}${contactText}`,
        type: 'warning',
        related_id: proposal.id,
        related_type: 'proposal',
      });
    }

    return json({ success: true, status: 'rejected', contactRequested });
  } catch (error: any) {
    console.error('decline-proposal error:', error?.message);
    return json({ success: false, error: 'Something went wrong. Please try again.' }, 500);
  }
});
