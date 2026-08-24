// Decide what the acceptance page should do for a given proposal, and — when the
// client already holds a master cession signature — complete the whole thing
// server-side without ever showing the signing ceremony again.
//
// Returns one of:
//   needs_signature : no master signature for this client yet — show the ceremony
//   inherited       : master signature reused; this proposal's own document was
//                     just generated and emailed
//   existing        : this proposal already has a signed document

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Proposal statuses that a client can legitimately act on. 'draft' is
// deliberately excluded — drafts must never be auto-signed.
const CLIENT_VISIBLE_STATUSES = ["sent", "delivered", "opened", "viewed", "stale"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { token, proposalId } = await req.json().catch(() => ({}));
    if (!token && !proposalId) {
      return json({ error: "token or proposalId is required" }, 400);
    }

    // ---- resolve the proposal -------------------------------------------
    let resolvedId: string | null = proposalId ?? null;
    if (!resolvedId && token) {
      const { data } = await admin.rpc("get_proposal_by_token_direct", {
        token_param: token,
      });
      const row = Array.isArray(data) ? data[0] : data;
      resolvedId = row?.id ?? row?.proposal_id ?? null;
    }
    if (!resolvedId) return json({ error: "Proposal not found" }, 404);

    const { data: proposal } = await admin
      .from("proposals")
      .select("id, status, client_reference_id, deleted_at, archived_at")
      .eq("id", resolvedId)
      .maybeSingle();
    if (!proposal) return json({ error: "Proposal not found" }, 404);

    // ---- already has a document? ----------------------------------------
    const { data: existing } = await admin
      .from("proposal_agreements")
      .select("id, pdf_path, signed_pdf_url, signed_at, client_cession_signature_id")
      .eq("proposal_id", proposal.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (!existing.pdf_path) {
        // Sibling row created by the propagation trigger, or an interrupted run.
        await completeDocument(admin, proposal.id, existing.id);
      }
      return json({ state: "existing", agreement_id: existing.id, signed_at: existing.signed_at });
    }

    // ---- does this client already hold a master signature? ---------------
    if (!proposal.client_reference_id) {
      return json({ state: "needs_signature" });
    }

    const { data: client } = await admin
      .from("clients")
      .select("id, email")
      .eq("id", proposal.client_reference_id)
      .maybeSingle();

    const emailNorm = (client?.email ?? "").trim().toLowerCase();
    let siblingIds: string[] = [proposal.client_reference_id];
    if (emailNorm) {
      const { data: dupes } = await admin
        .from("clients")
        .select("id")
        .ilike("email", emailNorm);
      if (dupes?.length) siblingIds = [...new Set([...siblingIds, ...dupes.map((d: any) => d.id)])];
    }

    const { data: master } = await admin
      .from("client_cession_signatures")
      .select("*")
      .in("client_id", siblingIds)
      .is("revoked_at", null)
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!master) return json({ state: "needs_signature" });

    // Never auto-sign a draft or a removed proposal.
    if (
      proposal.deleted_at || proposal.archived_at ||
      !CLIENT_VISIBLE_STATUSES.includes(proposal.status)
    ) {
      return json({ state: "needs_signature", reason: "proposal_not_actionable" });
    }

    // ---- inherit ----------------------------------------------------------
    const { data: created, error: insertError } = await admin
      .from("proposal_agreements")
      .insert({
        proposal_id: proposal.id,
        signed_by: master.signed_by,
        signed_at: master.signed_at,
        signature_type: master.signature_type,
        signature_type_used: master.signature_type,
        typed_name: master.typed_name,
        signature_image_url: master.signature_image_url,
        accepted_terms_version: master.legal_document_version
          ? String(master.legal_document_version)
          : null,
        client_cession_signature_id: master.id,
        legal_document_id: master.legal_document_id,
        legal_document_version: master.legal_document_version,
        ip_address: master.ip_address,
        user_agent: master.user_agent,
        witness_1_name: "DIGITAL WITNESS 1",
        witness_1_verified_at: master.signed_at,
        witness_2_name: "DIGITAL WITNESS 2",
        witness_2_verified_at: master.signed_at,
        witness_method: "automatic_system",
        // Tagged so propagate_master_agreement()'s recursion guard skips it.
        metadata: {
          source: "master_agreement_propagation",
          inherited_from_signature_id: master.id,
          origin_proposal_id: master.origin_proposal_id,
        },
      })
      .select("id")
      .single();

    if (insertError || !created) {
      console.error("[ensure-proposal-agreement] insert failed:", insertError);
      return json({ error: "Failed to record inherited agreement" }, 500);
    }

    await admin
      .from("proposals")
      .update({ status: "approved", signed_at: master.signed_at })
      .eq("id", proposal.id);

    await completeDocument(admin, proposal.id, created.id);

    return json({ state: "inherited", agreement_id: created.id, signed_at: master.signed_at });
  } catch (error) {
    console.error("[ensure-proposal-agreement] Error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500,
    );
  }
});

/** Generate this proposal's own PDF and email it to the client. */
async function completeDocument(admin: any, proposalId: string, agreementId: string) {
  try {
    const { error } = await admin.functions.invoke("generate-signed-agreement-pdf", {
      body: { proposalId, agreementId },
    });
    if (error) {
      console.error("[ensure-proposal-agreement] pdf generation failed:", error);
      return;
    }

    const { data: proposal } = await admin
      .from("proposals")
      .select("client:clients!proposals_client_reference_id_fkey(email)")
      .eq("id", proposalId)
      .maybeSingle();
    const clientEmail = (proposal as any)?.client?.email;
    if (clientEmail) {
      await admin.functions.invoke("send-cession-agreement-email", {
        body: { proposalId, clientEmail },
      });
    }
  } catch (e) {
    console.error("[ensure-proposal-agreement] completeDocument error:", e);
  }
}
