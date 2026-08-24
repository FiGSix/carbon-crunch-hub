// Admin-only: produce an UNSIGNED preview of the cession agreement for a proposal.
//
// Like the signed generator, this never re-typesets the legal wording. It splices
// the live revision's own pages verbatim and appends a generated party & site
// details page so the blanks are answered without touching the original pages.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import {
  downloadLegalDocumentPdf,
  getLiveLegalDocument,
} from "../_shared/legal-document.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // --- admin auth gate --------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing authorization header" }, 401);
    }
    const { data: { user }, error: authError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const { proposalId } = await req.json().catch(() => ({}));
    if (!proposalId) return json({ error: "proposalId is required" }, 400);

    const { data: proposal, error: proposalError } = await admin
      .from("proposals")
      .select(`
        *,
        client:clients!proposals_client_reference_id_fkey(first_name, last_name, email, company_name, registration_number, address)
      `)
      .eq("id", proposalId)
      .maybeSingle();

    if (proposalError || !proposal) return json({ error: "Proposal not found" }, 404);

    // --- the live revision is the only source of the legal wording --------
    const live = await getLiveLegalDocument(admin);
    if (!live?.file_path) {
      return json(
        {
          error:
            "No live Cession Agreement with an uploaded file. Upload the agreement file in Admin → Legal Documents and set the revision live.",
        },
        409,
      );
    }

    const sourceBytes = await downloadLegalDocumentPdf(admin, live.file_path);

    const out = await PDFDocument.create();
    const source = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
    const pages = await out.copyPages(source, source.getPageIndices());
    pages.forEach((p) => out.addPage(p));

    // --- generated party & site details page ------------------------------
    const font = await out.embedFont(StandardFonts.Helvetica);
    const bold = await out.embedFont(StandardFonts.HelveticaBold);

    const content = (proposal.content ?? {}) as Record<string, any>;
    const client = (proposal as any).client ?? {};
    const ownerName = [client.first_name, client.last_name].filter(Boolean).join(" ") ||
      client.company_name || content?.clientInfo?.name || "";

    const rows: Array<[string, string]> = [
      ["Owner", ownerName],
      ["Registration number", client.registration_number || content?.clientInfo?.registrationNumber || "Not applicable"],
      ["Email", client.email || content?.clientInfo?.email || ""],
      ["Registered address", client.address || content?.clientInfo?.address || ""],
      ["Site / premises address", content?.projectInfo?.address || ""],
      ["System size", content?.projectInfo?.size ? `${content.projectInfo.size} kWp` : ""],
      ["Commissioning date", content?.projectInfo?.commissionDate || ""],
      ["Owner share", proposal.client_share_percentage ? `${proposal.client_share_percentage}%` : ""],
      ["Agreement revision", `${live.title} (v${live.version})`],
    ];

    const page = out.addPage([595.28, 841.89]);
    let y = 780;
    page.drawText("Party & Site Details", { x: 56, y, size: 16, font: bold, color: rgb(0, 0, 0) });
    y -= 14;
    page.drawText("UNSIGNED PREVIEW — not a executed agreement", {
      x: 56, y, size: 9, font, color: rgb(0.55, 0.15, 0.15),
    });
    y -= 30;

    for (const [label, value] of rows) {
      page.drawText(`${label}:`, { x: 56, y, size: 10, font: bold });
      page.drawText(String(value || "—").slice(0, 80), { x: 210, y, size: 10, font });
      y -= 20;
    }

    y -= 20;
    page.drawText("Signature of the Owner: ______________________________", { x: 56, y, size: 10, font });
    y -= 26;
    page.drawText("Place and date of signing: ____________________________", { x: 56, y, size: 10, font });

    const pdfBytes = await out.save();

    const fileName = `cession-agreement-${proposalId}.pdf`;
    const { error: uploadError } = await admin.storage
      .from("proposal-pdfs")
      .upload(fileName, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (uploadError) return json({ error: "Failed to upload PDF" }, 500);

    const { data: signed, error: signErr } = await admin.storage
      .from("proposal-pdfs")
      .createSignedUrl(fileName, 300, { download: fileName });
    if (signErr || !signed?.signedUrl) {
      return json({ error: "Failed to sign cession PDF URL" }, 500);
    }

    return json({ success: true, signed_url: signed.signedUrl, file_name: fileName });
  } catch (error) {
    console.error("[Cession PDF] Error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Failed to generate cession agreement PDF" },
      500,
    );
  }
});
