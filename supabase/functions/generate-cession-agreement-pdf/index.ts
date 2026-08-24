// Admin-only: produce the UNSIGNED cession agreement for a proposal.
//
// The wording comes from the live revision uploaded in Admin → Legal Documents
// and is spliced verbatim; we only append a generated party & site details page.

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

const CRUNCH_YELLOW = rgb(1, 0.804, 0.012);
const CRUNCH_CHARCOAL = rgb(0.137, 0.122, 0.125);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

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

    const { proposalId } = await req.json();
    if (!proposalId) return json({ error: "proposalId is required" }, 400);

    const { data: proposal, error: proposalError } = await admin
      .from("proposals")
      .select(`
        *,
        client:clients!proposals_client_reference_id_fkey(first_name, last_name, email, company_name, registration_number)
      `)
      .eq("id", proposalId)
      .single();
    if (proposalError || !proposal) return json({ error: "Proposal not found" }, 404);

    const live = await getLiveLegalDocument(admin);
    if (!live?.file_path) {
      return json(
        {
          error:
            "No live Cession Agreement file is configured. Upload the agreement in Admin → Legal Documents and set a revision live.",
        },
        409,
      );
    }

    const legalBytes = await downloadLegalDocumentPdf(admin, live.file_path);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const src = await PDFDocument.load(legalBytes, { ignoreEncryption: true });
    const pages = await pdfDoc.copyPages(src, src.getPageIndices());
    pages.forEach((p) => pdfDoc.addPage(p));

    // Generated particulars page — the source wording is never altered.
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const left = 50;
    page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: CRUNCH_YELLOW });
    page.drawText("PARTY & SITE DETAILS", {
      x: left, y: height - 60, size: 22, font: bold, color: CRUNCH_CHARCOAL,
    });

    let y = height - 140;
    const row = (label: string, value: string) => {
      page.drawText(label, { x: left, y, size: 11, font: bold, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(String(value ?? "N/A").slice(0, 62), {
        x: left + 190, y, size: 11, font, color: CRUNCH_CHARCOAL,
      });
      y -= 24;
    };

    const c = proposal.client ?? {};
    const address = proposal.site_address || proposal.project_address ||
      proposal.content?.projectInfo?.address || proposal.location ||
      "As indicated on the electronic Portal";

    row("Owner / Entity Name:", c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "N/A");
    row("Registration Number:", c.registration_number || "Not applicable");
    row("Email Address:", c.email || "N/A");
    row("Project / Site Name:", proposal.title || "N/A");
    row("Site Address:", address);
    row(
      "System Size:",
      proposal.system_size_kwp ? `${Number(proposal.system_size_kwp).toLocaleString()} kWp` : "N/A",
    );
    row("Agreement Revision:", `${live.title} (v${live.version})`);

    page.drawText("UNSIGNED COPY — for review only.", {
      x: left, y: 60, size: 9, font, color: rgb(0.45, 0.45, 0.45),
    });

    const pdfBytes = await pdfDoc.save();

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
