// Shared helpers for the "live legal document" model.
//
// The canonical legal text is an admin-uploaded PDF stored privately in the
// `legal-documents` bucket. Nothing in this codebase re-typesets the wording:
// the original pages are spliced verbatim into generated documents.

export const LEGAL_DOCUMENTS_BUCKET = "legal-documents";
export const CESSION_DOCUMENT_TYPE = "cession_agreement";

export interface LegalDocumentRef {
  id: string;
  title: string;
  version: number;
  file_path: string | null;
  file_mime: string | null;
  content: string | null;
}

/** Fetch the single revision currently flagged live for a document type. */
export async function getLiveLegalDocument(
  admin: any,
  documentType: string = CESSION_DOCUMENT_TYPE,
): Promise<LegalDocumentRef | null> {
  const { data, error } = await admin.rpc("get_live_legal_document", {
    p_document_type: documentType,
  });
  if (error) {
    console.error("[legal-document] get_live_legal_document failed:", error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    version: row.current_version,
    file_path: row.file_path,
    file_mime: row.file_mime,
    content: row.content,
  };
}

/** Fetch a specific revision by id (used when re-generating against an already-signed revision). */
export async function getLegalDocumentById(
  admin: any,
  id: string,
): Promise<LegalDocumentRef | null> {
  const { data, error } = await admin
    .from("legal_documents")
    .select("id, title, current_version, file_path, file_mime, content")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    console.error("[legal-document] lookup by id failed:", error);
    return null;
  }
  return {
    id: data.id,
    title: data.title,
    version: data.current_version,
    file_path: data.file_path,
    file_mime: data.file_mime,
    content: data.content,
  };
}

/** Download the canonical PDF bytes for a revision. */
export async function downloadLegalDocumentPdf(
  admin: any,
  filePath: string,
): Promise<Uint8Array> {
  const path = filePath.replace(/^\/+/, "");
  const { data, error } = await admin.storage
    .from(LEGAL_DOCUMENTS_BUCKET)
    .download(path);
  if (error || !data) {
    throw new Error(
      `Failed to download legal document at ${path}: ${error?.message ?? "unknown error"}`,
    );
  }
  return new Uint8Array(await data.arrayBuffer());
}

/**
 * Normalise any historically-stored value (public URL, signed URL, or bare path)
 * into a bare object path inside the given bucket.
 */
export function toStorageObjectPath(value: string | null | undefined, bucket: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = trimmed.match(
    new RegExp(`/object/(?:public|sign|authenticated)/${bucket}/([^?]+)`),
  );
  if (m) return decodeURIComponent(m[1]);
  if (/^https?:\/\//i.test(trimmed)) return null;
  return trimmed.replace(/^\/+/, "");
}
