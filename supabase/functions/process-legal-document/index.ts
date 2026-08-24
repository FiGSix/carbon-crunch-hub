// Admin-only: process an uploaded legal document revision file.
//
// The admin uploads the raw file (PDF or .docx) straight into the private
// `legal-documents` bucket, then calls this function with its path. Here we:
//   1. Normalise it to a PDF (Word files are converted; PDFs are kept byte-for-byte).
//   2. Extract the plain text for the on-screen "read before you sign" panel.
//   3. Stamp file_path / file_mime / content back onto the legal_documents row.
//
// The stored PDF is the canonical legal text — signing splices its pages verbatim.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import mammoth from "https://esm.sh/mammoth@1.8.0";
import { LEGAL_DOCUMENTS_BUCKET } from "../_shared/legal-document.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return (Array.isArray(text) ? text.join("\n\n") : text ?? "").trim();
  } catch (e) {
    console.error("[process-legal-document] PDF text extraction failed:", e);
    return "";
  }
}

/**
 * Render extracted Word text into a PDF. Only used for .docx uploads — there is
 * no faithful Word renderer available in this runtime, so admins are warned in
 * the UI that PDF uploads preserve the original layout and Word uploads do not.
 */
async function docxTextToPdf(text: string, title: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 56;
  const MAX_W = PAGE_W - MARGIN * 2;
  const SIZE = 10.5;
  const LEADING = 15;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const draw = (line: string, f = font, size = SIZE) => {
    if (y < MARGIN + LEADING) newPage();
    page.drawText(line, { x: MARGIN, y, size, font: f, color: rgb(0, 0, 0) });
    y -= LEADING;
  };

  draw(title, bold, 14);
  y -= 10;

  for (const rawLine of text.split(/\r?\n/)) {
    const paragraph = rawLine.replace(/\s+/g, " ").trim();
    if (!paragraph) {
      y -= LEADING / 2;
      continue;
    }
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, SIZE) > MAX_W) {
        draw(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) draw(line);
  }

  return await pdfDoc.save();
}

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

    // --- admin auth gate -------------------------------------------------
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

    // --- input -----------------------------------------------------------
    const body = await req.json().catch(() => ({}));
    const documentId: string | undefined = body.documentId;
    const sourcePath: string | undefined = body.sourcePath;
    const fileName: string = body.fileName ?? "document";

    if (!documentId || !sourcePath) {
      return json({ error: "documentId and sourcePath are required" }, 400);
    }

    const { data: doc, error: docError } = await admin
      .from("legal_documents")
      .select("id, title, document_type, current_version")
      .eq("id", documentId)
      .maybeSingle();
    if (docError || !doc) return json({ error: "Legal document not found" }, 404);

    // --- fetch the raw upload -------------------------------------------
    const { data: blob, error: dlError } = await admin.storage
      .from(LEGAL_DOCUMENTS_BUCKET)
      .download(sourcePath);
    if (dlError || !blob) {
      return json({ error: `Could not read upload: ${dlError?.message}` }, 400);
    }
    const rawBytes = new Uint8Array(await blob.arrayBuffer());

    const isDocx = /\.docx?$/i.test(fileName) ||
      blob.type?.includes("wordprocessing");

    let pdfBytes: Uint8Array;
    let extractedText = "";
    let converted = false;

    if (isDocx) {
      const result = await mammoth.extractRawText({
        arrayBuffer: rawBytes.buffer.slice(
          rawBytes.byteOffset,
          rawBytes.byteOffset + rawBytes.byteLength,
        ),
      });
      extractedText = (result?.value ?? "").trim();
      if (!extractedText) {
        return json({ error: "Could not read any text from the Word file" }, 422);
      }
      pdfBytes = await docxTextToPdf(extractedText, doc.title);
      converted = true;
    } else {
      // Keep the original PDF bytes untouched — this is the canonical text.
      pdfBytes = rawBytes;
      extractedText = await extractPdfText(rawBytes);
    }

    // Page count sanity check + guarantees it is a loadable PDF.
    let pageCount = 0;
    try {
      const probe = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      pageCount = probe.getPageCount();
    } catch (e) {
      return json(
        { error: `The uploaded file is not a readable PDF: ${String(e)}` },
        422,
      );
    }

    // --- store the canonical PDF ----------------------------------------
    const canonicalPath =
      `${doc.document_type}/${documentId}/v${doc.current_version}-canonical.pdf`;

    const { error: upErr } = await admin.storage
      .from(LEGAL_DOCUMENTS_BUCKET)
      .upload(canonicalPath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) return json({ error: `Upload failed: ${upErr.message}` }, 500);

    const { error: updErr } = await admin
      .from("legal_documents")
      .update({
        file_path: canonicalPath,
        file_mime: "application/pdf",
        content: extractedText,
      })
      .eq("id", documentId);
    if (updErr) return json({ error: updErr.message }, 500);

    // The raw upload is no longer needed once normalised.
    if (converted && sourcePath !== canonicalPath) {
      await admin.storage.from(LEGAL_DOCUMENTS_BUCKET).remove([sourcePath]);
    }

    console.log(
      `[process-legal-document] ${documentId} -> ${canonicalPath} (${pageCount} pages, ${extractedText.length} chars, converted=${converted})`,
    );

    return json({
      success: true,
      file_path: canonicalPath,
      page_count: pageCount,
      text_length: extractedText.length,
      converted_from_word: converted,
      text_extraction_warning: extractedText.length < 200
        ? "Very little text could be extracted — the file may be a scan. The on-screen agreement panel will fall back to a download link."
        : null,
    });
  } catch (error) {
    console.error("[process-legal-document] Error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500,
    );
  }
});
