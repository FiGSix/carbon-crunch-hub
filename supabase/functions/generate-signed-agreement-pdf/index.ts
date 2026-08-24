// Generate the per-proposal signed Cession Agreement document.
//
// Assembly order:
//   1. The live/linked legal revision's own pages, spliced VERBATIM from the
//      admin-uploaded PDF. Nothing here re-typesets the legal wording.
//   2. A generated "Party & Site Details" page answering the fill-in blanks.
//   3. An "ANNEXURE A" separator + the proposal's own PDF pages.
//   4. A generated "Digital Signature Confirmation" page.
//
// The result is stored in the private `signed-agreements` bucket and the bare
// object path is written to proposal_agreements.pdf_path (and signed_pdf_url,
// kept in sync for legacy readers). Signed URLs are minted on demand elsewhere.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { PDFDocument, StandardFonts, rgb, degrees } from "https://esm.sh/pdf-lib@1.17.1";
import {
  downloadLegalDocumentPdf,
  getLegalDocumentById,
  getLiveLegalDocument,
  toStorageObjectPath,
} from "../_shared/legal-document.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CRUNCH_YELLOW = rgb(1, 0.804, 0.012);
const CRUNCH_CHARCOAL = rgb(0.137, 0.122, 0.125);
const A4: [number, number] = [595.28, 841.89];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { proposalId, agreementId } = await req.json();
    if (!proposalId || !agreementId) {
      return json({ error: "proposalId and agreementId are required" }, 400);
    }

    console.log(`[Signed PDF] proposal=${proposalId} agreement=${agreementId}`);

    // ---- 1. Load records -------------------------------------------------
    const { data: proposal, error: proposalError } = await admin
      .from("proposals")
      .select(`
        *,
        agent:profiles!proposals_agent_id_fkey(first_name, last_name, company_name, email),
        client:clients!proposals_client_reference_id_fkey(first_name, last_name, email, company_name, registration_number)
      `)
      .eq("id", proposalId)
      .single();
    if (proposalError || !proposal) return json({ error: "Proposal not found" }, 404);

    const { data: agreement, error: agreementError } = await admin
      .from("proposal_agreements")
      .select("*")
      .eq("id", agreementId)
      .single();
    if (agreementError || !agreement) return json({ error: "Agreement not found" }, 404);

    // ---- 2. Resolve the legal revision this document must reproduce ------
    // Priority: the revision recorded on the master signature (never changes
    // retroactively) -> the revision stamped on the agreement row -> live.
    let masterSignature: any = null;
    if (agreement.client_cession_signature_id) {
      const { data } = await admin
        .from("client_cession_signatures")
        .select("*")
        .eq("id", agreement.client_cession_signature_id)
        .maybeSingle();
      masterSignature = data ?? null;
    }

    let legalFilePath: string | null = masterSignature?.legal_document_file_path ?? null;
    let legalTitle: string | null = masterSignature?.legal_document_title ?? null;
    let legalVersion: number | null = masterSignature?.legal_document_version ??
      agreement.legal_document_version ?? null;

    if (!legalFilePath) {
      const docId = masterSignature?.legal_document_id ?? agreement.legal_document_id;
      const doc = docId
        ? await getLegalDocumentById(admin, docId)
        : await getLiveLegalDocument(admin);
      if (doc) {
        legalFilePath = doc.file_path;
        legalTitle = legalTitle ?? doc.title;
        legalVersion = legalVersion ?? doc.version;
      }
    }

    if (!legalFilePath) {
      return json(
        {
          error:
            "No live Cession Agreement file is configured. Upload the agreement in Admin → Legal Documents and set a revision live.",
        },
        409,
      );
    }

    const legalPdfBytes = await downloadLegalDocumentPdf(admin, legalFilePath);

    // ---- 3. Ensure the base proposal PDF exists --------------------------
    if (!proposal.pdf_url) {
      console.log("[Signed PDF] Base proposal PDF missing — generating it first");
      const { data: pdfResult, error: pdfError } = await admin.functions.invoke(
        "generate-proposal-pdf",
        { body: { proposalId, forceRegenerate: false } },
      );
      if (pdfError || !pdfResult?.pdf_url) {
        return json({ error: "Failed to generate base proposal PDF" }, 500);
      }
      proposal.pdf_url = pdfResult.pdf_url;
    }

    const basePath = toStorageObjectPath(proposal.pdf_url, "proposal-pdfs") ??
      `proposal-${proposalId}-v${proposal.pdf_version || 1}.pdf`;
    const { data: baseBlob, error: baseDlErr } = await admin.storage
      .from("proposal-pdfs")
      .download(basePath);
    if (baseDlErr || !baseBlob) {
      throw new Error(`Failed to download base PDF: ${baseDlErr?.message ?? "unknown"}`);
    }
    const basePdfBytes = new Uint8Array(await baseBlob.arrayBuffer());

    // ---- 4. Assemble ------------------------------------------------------
    const signedPdfBytes = await assemble({
      admin,
      legalPdfBytes,
      basePdfBytes,
      proposal,
      agreement,
      masterSignature,
      legalTitle,
      legalVersion,
    });

    // ---- 5. Store ---------------------------------------------------------
    const objectPath = `signed_agreement_${proposalId}_${agreementId}.pdf`;
    const { error: uploadError } = await admin.storage
      .from("signed-agreements")
      .upload(objectPath, signedPdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadError) {
      console.error("[Signed PDF] Upload error:", uploadError);
      return json({ error: "Failed to upload signed PDF" }, 500);
    }

    const { error: updateError } = await admin
      .from("proposal_agreements")
      .update({
        pdf_path: objectPath,
        // signed-agreements is a PRIVATE bucket: store the bare object path,
        // never a public URL. Signed URLs are minted on demand.
        signed_pdf_url: objectPath,
        generated_at: new Date().toISOString(),
        legal_document_version: legalVersion,
      })
      .eq("id", agreementId);
    if (updateError) console.error("[Signed PDF] Update error:", updateError);

    console.log(`[Signed PDF] Stored ${objectPath}`);
    return json({ success: true, pdf_path: objectPath, signed_pdf_url: objectPath });
  } catch (error) {
    console.error("[Signed PDF] Error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Failed to generate signed PDF" },
      500,
    );
  }
});

// ---------------------------------------------------------------------------

async function assemble(args: {
  admin: any;
  legalPdfBytes: Uint8Array;
  basePdfBytes: Uint8Array;
  proposal: any;
  agreement: any;
  masterSignature: any;
  legalTitle: string | null;
  legalVersion: number | null;
}): Promise<Uint8Array> {
  const {
    admin, legalPdfBytes, basePdfBytes, proposal, agreement,
    masterSignature, legalTitle, legalVersion,
  } = args;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // STEP 1 — the agreement's own pages, verbatim.
  const legalDoc = await PDFDocument.load(legalPdfBytes, { ignoreEncryption: true });
  const legalPages = await pdfDoc.copyPages(legalDoc, legalDoc.getPageIndices());
  legalPages.forEach((p) => pdfDoc.addPage(p));
  console.log(`[Signed PDF] Spliced ${legalPages.length} agreement pages verbatim`);

  // STEP 2 — party & site details (answers the blank fill-in lines).
  addPartyDetailsPage(pdfDoc, font, bold, proposal, agreement, legalTitle, legalVersion);

  // STEP 3 — Annexure A separator + proposal pages.
  const sep = pdfDoc.addPage(A4);
  const { width: sw, height: sh } = sep.getSize();
  sep.drawRectangle({ x: 0, y: sh - 100, width: sw, height: 100, color: CRUNCH_YELLOW });
  sep.drawText("ANNEXURE A", {
    x: sw / 2 - 100, y: sh / 2 + 20, size: 32, font: bold, color: CRUNCH_CHARCOAL,
  });
  sep.drawText("PROPOSAL", {
    x: sw / 2 - 70, y: sh / 2 - 20, size: 28, font: bold, color: CRUNCH_CHARCOAL,
  });

  const baseDoc = await PDFDocument.load(basePdfBytes, { ignoreEncryption: true });
  const basePages = await pdfDoc.copyPages(baseDoc, baseDoc.getPageIndices());
  basePages.forEach((p) => pdfDoc.addPage(p));

  // STEP 4 — stamp every page, then append the signature confirmation page.
  const initials = getInitials(agreement.typed_name);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length + 1;

  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    page.drawText("SIGNED COPY", {
      x: width / 2 - 100, y: height / 2, size: 60, font: bold,
      color: rgb(0.9, 0.9, 0.9), rotate: degrees(45), opacity: 0.3,
    });
    page.drawText(`Initials: ${initials}`, {
      x: width - 150, y: 30, size: 10, font, color: CRUNCH_CHARCOAL,
    });
    page.drawText(`Page ${index + 1} of ${totalPages}`, {
      x: width / 2 - 40, y: 30, size: 10, font, color: rgb(0.5, 0.5, 0.5),
    });
  });

  await addSignaturePage(
    admin, pdfDoc, font, bold, agreement, masterSignature, totalPages,
    legalTitle, legalVersion,
  );

  return await pdfDoc.save();
}

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return "CC";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return parts.map((p) => p[0]).join("").toUpperCase();
}

function resolveSiteAddress(proposal: any): string {
  const c = proposal.content ?? {};
  return (
    proposal.site_address ||
    proposal.project_address ||
    c?.projectInfo?.address ||
    c?.projectInfo?.siteAddress ||
    c?.projectInformation?.address ||
    proposal.location ||
    "As indicated on the electronic Portal"
  );
}

/**
 * Every date printed on a generated page is ISO 8601 (YYYY-MM-DD). Locale
 * formats are ambiguous (3/15/2024) and this is a signed legal document.
 */
function isoDate(value: unknown): string | null {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * The commissioning date lives in the proposal JSON — there is no
 * `proposals.commissioning_date` column, which is why this page previously
 * always fell back to the placeholder string.
 */
function resolveCommissioningDate(proposal: any): string | null {
  const c = proposal.content ?? {};
  const pi = proposal.project_info ?? {};
  return (
    isoDate(proposal.commissioning_date) ??
    isoDate(pi.commission_date) ??
    isoDate(pi.commissionDate) ??
    isoDate(c?.projectInfo?.commissionDate) ??
    isoDate(c?.projectInfo?.commission_date) ??
    isoDate(c?.projectInformation?.commissionDate) ??
    isoDate(Array.isArray(c?.projectInfo?.phases) ? c.projectInfo.phases[0]?.commissionDate : null)
  );
}

/**
 * A company cannot sign — a natural person signs for it. The signatory name is
 * captured at signing time and stored on the agreement/master signature
 * metadata; individual cedents fall back to their own name.
 */
function resolveSignatoryName(proposal: any, agreement: any, masterSignature: any): string {
  const client = proposal.client ?? {};
  const personName = [client.first_name, client.last_name].filter(Boolean).join(" ").trim();
  return (
    agreement?.metadata?.signatory_name ||
    masterSignature?.metadata?.signatory_name ||
    masterSignature?.typed_name ||
    agreement?.typed_name ||
    personName ||
    proposal.content?.clientInfo?.name ||
    "N/A"
  );
}


function addPartyDetailsPage(
  pdfDoc: any, font: any, bold: any, proposal: any, agreement: any,
  legalTitle: string | null, legalVersion: number | null,
) {
  const page = pdfDoc.addPage(A4);
  const { width, height } = page.getSize();
  const left = 50;

  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: CRUNCH_YELLOW });
  page.drawText("PARTY & SITE DETAILS", {
    x: left, y: height - 60, size: 22, font: bold, color: CRUNCH_CHARCOAL,
  });

  let y = height - 140;
  const row = (label: string, value: string) => {
    page.drawText(label, { x: left, y, size: 11, font: bold, color: rgb(0.4, 0.4, 0.4) });
    const text = (value ?? "").toString();
    const max = 62;
    const lines: string[] = [];
    let rest = text;
    while (rest.length > max) {
      let cut = rest.lastIndexOf(" ", max);
      if (cut <= 0) cut = max;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut).trim();
    }
    lines.push(rest);
    lines.forEach((line, i) => {
      page.drawText(line, {
        x: left + 190, y: y - i * 14, size: 11, font, color: CRUNCH_CHARCOAL,
      });
    });
    y -= 24 + (lines.length - 1) * 14;
  };

  const client = proposal.client ?? {};
  const ownerName = client.company_name ||
    [client.first_name, client.last_name].filter(Boolean).join(" ") ||
    agreement.typed_name || "N/A";

  page.drawText("The Cedent (System Owner)", {
    x: left, y, size: 14, font: bold, color: CRUNCH_CHARCOAL,
  });
  y -= 26;

  row("Owner / Entity Name:", ownerName);
  row("Registration Number:", client.registration_number || "Not applicable");
  row("Signatory:", agreement.typed_name || "N/A");
  row("Email Address:", client.email || "N/A");
  row("Physical Address:", resolveSiteAddress(proposal));

  y -= 10;
  page.drawText("The System", {
    x: left, y, size: 14, font: bold, color: CRUNCH_CHARCOAL,
  });
  y -= 26;

  row("Project / Site Name:", proposal.title || "N/A");
  row("Site Address:", resolveSiteAddress(proposal));
  row(
    "System Size:",
    proposal.system_size_kwp ? `${Number(proposal.system_size_kwp).toLocaleString()} kWp` : "N/A",
  );
  row(
    "Commissioning Date:",
    proposal.commissioning_date
      ? new Date(proposal.commissioning_date).toLocaleDateString("en-ZA")
      : "As recorded on the Portal",
  );

  y -= 10;
  page.drawText("Signing", {
    x: left, y, size: 14, font: bold, color: CRUNCH_CHARCOAL,
  });
  y -= 26;

  row("Place of Signature:", "South Africa");
  row(
    "Date of Signature:",
    new Date(agreement.signed_at).toLocaleDateString("en-ZA", {
      dateStyle: "long",
      timeZone: "Africa/Johannesburg",
    } as any),
  );
  row(
    "Agreement Revision:",
    legalTitle ? `${legalTitle}${legalVersion ? ` (v${legalVersion})` : ""}` : "N/A",
  );

  page.drawText(
    "This page records the particulars referenced by the agreement above. The agreement wording is reproduced verbatim and unaltered.",
    { x: left, y: 60, size: 8, font, color: rgb(0.45, 0.45, 0.45) },
  );
}

async function addSignaturePage(
  admin: any, pdfDoc: any, font: any, bold: any, agreement: any,
  masterSignature: any, totalPages: number,
  legalTitle: string | null, legalVersion: number | null,
) {
  const page = pdfDoc.addPage(A4);
  const { width, height } = page.getSize();
  const left = 50;
  const lh = 25;

  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: CRUNCH_YELLOW });
  page.drawText("DIGITAL SIGNATURE CONFIRMATION", {
    x: left, y: height - 60, size: 22, font: bold, color: CRUNCH_CHARCOAL,
  });
  page.drawText(`Page ${totalPages} of ${totalPages}`, {
    x: width / 2 - 40, y: 30, size: 10, font, color: rgb(0.5, 0.5, 0.5),
  });

  let y = height - 150;
  const row = (label: string, value: string) => {
    page.drawText(label, { x: left, y, size: 11, font: bold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(value ?? "N/A", {
      x: left + 200, y, size: 11, font, color: CRUNCH_CHARCOAL,
    });
    y -= lh;
  };

  const sigType = masterSignature?.signature_type ?? agreement.signature_type;
  const sigUrl = masterSignature?.signature_image_url ?? agreement.signature_image_url;
  const typedName = masterSignature?.typed_name ?? agreement.typed_name;
  const signedAt = masterSignature?.signed_at ?? agreement.signed_at;

  let signatureImage: any = null;
  if (sigUrl && sigType === "electronic_signature") {
    try {
      const sigPath = toStorageObjectPath(sigUrl, "signed-agreements");
      let sigBytes: ArrayBuffer | null = null;
      if (sigPath) {
        const { data: blob } = await admin.storage.from("signed-agreements").download(sigPath);
        if (blob) sigBytes = await blob.arrayBuffer();
      }
      if (!sigBytes && /^https?:\/\//i.test(sigUrl)) {
        const r = await fetch(sigUrl);
        if (r.ok) sigBytes = await r.arrayBuffer();
      }
      if (sigBytes) signatureImage = await pdfDoc.embedPng(new Uint8Array(sigBytes));
    } catch (err) {
      console.error("[Signed PDF] Signature image embed failed:", err);
    }
  }

  page.drawText("SIGNATURE", { x: left, y, size: 14, font: bold, color: CRUNCH_CHARCOAL });
  y -= lh + 10;

  if (signatureImage) {
    page.drawImage(signatureImage, { x: left, y: y - 60, width: 200, height: 50 });
    page.drawLine({
      start: { x: left, y: y - 65 }, end: { x: left + 200, y: y - 65 },
      thickness: 1, color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText("(Drawn Signature)", {
      x: left, y: y - 80, size: 9, font, color: rgb(0.4, 0.4, 0.4),
    });
    y -= 95;
  } else {
    row("Signed By:", typedName || "N/A");
  }

  row("Typed Name:", typedName || "N/A");
  row(
    "Date & Time:",
    new Date(signedAt).toLocaleString("en-ZA", {
      dateStyle: "long", timeStyle: "medium", timeZone: "Africa/Johannesburg",
    } as any),
  );
  row("IP Address:", masterSignature?.ip_address ?? agreement.ip_address ?? "N/A");

  const ua = (masterSignature?.user_agent ?? agreement.user_agent ?? "N/A") as string;
  row("Device:", ua.length > 60 ? `${ua.substring(0, 60)}...` : ua);
  row(
    "Signing Method:",
    agreement.metadata?.source === "master_agreement_propagation" ||
      agreement.metadata?.source === "inherited_master_signature"
      ? "Inherited from master signature"
      : agreement.metadata?.signed_via === "acceptance_link"
      ? "Invitation Link"
      : "Authenticated User",
  );
  row(
    "Agreement Revision:",
    legalTitle ? `${legalTitle}${legalVersion ? ` (v${legalVersion})` : ""}` : "N/A",
  );
  if (masterSignature?.id) row("Master Signature ID:", masterSignature.id);
  row("Document ID:", agreement.id);

  y -= lh * 0.5;
  page.drawText("Digital Witnesses", {
    x: left, y, size: 14, font: bold, color: CRUNCH_CHARCOAL,
  });
  y -= lh;
  row("Witness 1:", agreement.witness_1_name ?? "DIGITAL WITNESS 1");
  y += lh - 18;
  row("Witness 2:", agreement.witness_2_name ?? "DIGITAL WITNESS 2");

  page.drawRectangle({
    x: left - 10, y: y - 60, width: width - 2 * (left - 10), height: 80,
    color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1,
  });
  [
    "This document constitutes a legally binding digital signature.",
    "The signature metadata above provides verification of the signatory's",
    "identity and intent to be bound by the terms of this agreement.",
  ].forEach((line, i) => {
    page.drawText(line, {
      x: left, y: y - 20 - i * 15, size: 9, font, color: rgb(0.3, 0.3, 0.3),
    });
  });
}
