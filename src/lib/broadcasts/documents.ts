import { supabase } from "@/integrations/supabase/client";

/**
 * Broadcast file storage — two buckets with deliberately different privacy models.
 *
 *  broadcast-assets   PUBLIC.  Inline images only. Email clients (and their image
 *                     proxies, e.g. Gmail's googleusercontent fetcher) request
 *                     images anonymously with no cookie or Authorization header,
 *                     so a signed URL is not usable for an <img src>. Only put
 *                     logos and decorative campaign imagery here.
 *
 *  broadcast-documents PRIVATE. Everything a recipient clicks: PDFs, agreements,
 *                     reports. Reached only through a signed URL created by an
 *                     admin at insert time. A guessed path returns 400 —
 *                     the object is not readable without the signature.
 */
export const DOCUMENTS_BUCKET = "broadcast-documents";
export const ASSETS_BUCKET = "broadcast-assets";

/** One year. Recipients open campaign mail months later; the link must still work. */
export const DOCUMENT_LINK_TTL_SECONDS = 365 * 24 * 60 * 60;

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // linked download
export const MAX_ATTACHMENT_TOTAL_BYTES = 5 * 1024 * 1024; // real attachment, per campaign
export const MAX_ATTACHMENTS = 3;

export interface BroadcastAttachment {
  path: string;
  name: string;
  size: number;
  mime: string;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}

/** Uploads to the private documents bucket. Returns the storage path only. */
export async function uploadBroadcastDocument(file: File): Promise<BroadcastAttachment> {
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}/${safeName(file.name)}`;
  const { error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  return {
    path,
    name: file.name,
    size: file.size,
    mime: file.type || "application/octet-stream",
  };
}

/** Creates a one-year signed URL for a document already in the private bucket. */
export async function signBroadcastDocument(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, DOCUMENT_LINK_TTL_SECONDS, { download: true });
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Storage did not return a signed URL");
  return data.signedUrl;
}

export function documentLinkExpiry(): string {
  const d = new Date(Date.now() + DOCUMENT_LINK_TTL_SECONDS * 1000);
  return d.toLocaleDateString();
}
