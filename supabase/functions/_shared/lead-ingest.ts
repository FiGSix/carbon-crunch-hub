// Shared helpers for ingesting EPC lead lists emailed to Cora's Outlook mailbox.
// Used by poll-inbound when an incoming message has a "Leads:" subject prefix.
import * as XLSX from "npm:xlsx@0.18.5";

const OUTLOOK_GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

export const LEAD_SUBJECT_PREFIX = /^\s*leads\s*[:\-]/i;
const MAX_ROWS_PER_EMAIL = 500;

const HEADER_ALIASES: Record<string, string> = {
  company: "company_name", "company name": "company_name", name: "company_name", epc: "company_name", organisation: "company_name", organization: "company_name",
  contact: "contact_name", "contact name": "contact_name", person: "contact_name", "full name": "contact_name",
  email: "email", "email address": "email", "e-mail": "email",
  phone: "phone", "phone number": "phone", mobile: "phone", tel: "phone", telephone: "phone",
  website: "website", url: "website", site: "website",
  location: "location", city: "location", region: "location", country: "location", address: "location",
  source: "source",
  notes: "notes", note: "notes", comments: "notes",
};

export interface ParsedLeadRow {
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  source?: string;
  notes?: string;
}

export interface IngestResult {
  imported: number;
  duplicates: number;
  errors: number;
  errorDetails: string[];
  source: "attachment" | "body" | "none";
}

function normHeader(h: string): string | null {
  const k = String(h ?? "").trim().toLowerCase();
  return HEADER_ALIASES[k] ?? null;
}

function rowsFromAoA(aoa: any[][]): ParsedLeadRow[] {
  if (!aoa.length) return [];
  // find header row (first row with >= 1 known header)
  let headerIdx = -1;
  let mapping: (string | null)[] = [];
  for (let i = 0; i < Math.min(aoa.length, 5); i++) {
    const m = aoa[i].map((c) => normHeader(c));
    if (m.some((x) => x === "company_name")) { headerIdx = i; mapping = m; break; }
  }
  if (headerIdx === -1) return [];
  const out: ParsedLeadRow[] = [];
  for (let i = headerIdx + 1; i < aoa.length && out.length < MAX_ROWS_PER_EMAIL; i++) {
    const row = aoa[i];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === "")) continue;
    const rec: any = {};
    mapping.forEach((key, idx) => {
      if (!key) return;
      const v = row[idx];
      if (v !== undefined && v !== null && String(v).trim() !== "") rec[key] = String(v).trim();
    });
    if (rec.company_name) out.push(rec as ParsedLeadRow);
  }
  return out;
}

export function parseAttachment(name: string, base64: string): ParsedLeadRow[] {
  try {
    const lower = name.toLowerCase();
    if (!/\.(csv|xlsx|xls|tsv)$/i.test(lower)) return [];
    const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const wb = XLSX.read(bin, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) return [];
    const aoa = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, blankrows: false, defval: "" });
    return rowsFromAoA(aoa);
  } catch (e) {
    console.error("parseAttachment failed", name, e);
    return [];
  }
}

export function parseBody(text: string): ParsedLeadRow[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Try delimiter-separated rows. Look for a header line first.
  for (const delim of [",", "\t", "|", ";"]) {
    const aoa = lines.map((l) => l.split(delim).map((c) => c.trim()));
    if (aoa.some((r) => r.some((c) => normHeader(c) === "company_name"))) {
      const parsed = rowsFromAoA(aoa);
      if (parsed.length) return parsed;
    }
  }
  // Fallback: each non-empty line is "Company, contact, email, phone"
  const out: ParsedLeadRow[] = [];
  for (const l of lines) {
    if (out.length >= MAX_ROWS_PER_EMAIL) break;
    if (/^(leads?|epcs?|hi|hey|hello|thanks|regards|cheers)\b/i.test(l)) continue;
    const parts = l.split(/\s*[,|;\t]\s*/).filter(Boolean);
    if (!parts.length) continue;
    const rec: ParsedLeadRow = { company_name: parts[0] };
    for (const p of parts.slice(1)) {
      if (/@/.test(p) && !rec.email) rec.email = p;
      else if (/^\+?\d[\d\s\-()]{5,}$/.test(p) && !rec.phone) rec.phone = p;
      else if (/^https?:\/\//i.test(p) && !rec.website) rec.website = p;
      else if (!rec.contact_name) rec.contact_name = p;
      else if (!rec.location) rec.location = p;
    }
    if (rec.company_name && rec.company_name.length >= 2) out.push(rec);
  }
  return out;
}

export async function fetchAttachments(messageId: string, lovableKey: string, outlookKey: string): Promise<Array<{ name: string; contentBytes: string }>> {
  const url = `${OUTLOOK_GATEWAY}/me/messages/${messageId}/attachments?$select=id,name,contentBytes,contentType,@odata.type`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": outlookKey } });
  if (!res.ok) {
    console.error("fetchAttachments failed", res.status, await res.text());
    return [];
  }
  const json = await res.json();
  return (json.value ?? [])
    .filter((a: any) => a["@odata.type"] === "#microsoft.graph.fileAttachment" && a.contentBytes && a.name)
    .map((a: any) => ({ name: a.name as string, contentBytes: a.contentBytes as string }));
}

export async function ingestLeads(
  supabase: any,
  rows: ParsedLeadRow[],
  ctx: { senderEmail: string; createdBy: string | null }
): Promise<{ imported: number; duplicates: number; errors: number; errorDetails: string[] }> {
  const result = { imported: 0, duplicates: 0, errors: 0, errorDetails: [] as string[] };
  if (!rows.length) return result;

  // Normalize emails for dedupe lookup
  const emails = Array.from(new Set(rows.map((r) => r.email?.trim().toLowerCase()).filter(Boolean) as string[]));
  const companiesNoEmail = Array.from(new Set(rows.filter((r) => !r.email).map((r) => r.company_name.trim().toLowerCase())));

  const existingEmails = new Set<string>();
  const existingCompanies = new Set<string>();
  if (emails.length) {
    const { data } = await supabase.from("agent_leads").select("email").in("email", emails);
    (data ?? []).forEach((r: any) => r.email && existingEmails.add(r.email.toLowerCase()));
  }
  if (companiesNoEmail.length) {
    const { data } = await supabase.from("agent_leads").select("company_name").is("email", null).in("company_name", rows.filter((r) => !r.email).map((r) => r.company_name));
    (data ?? []).forEach((r: any) => r.company_name && existingCompanies.add(r.company_name.toLowerCase()));
  }

  const toInsert: any[] = [];
  const seenInBatch = new Set<string>();
  for (const r of rows) {
    const key = r.email ? `e:${r.email.toLowerCase()}` : `c:${r.company_name.toLowerCase()}`;
    if (seenInBatch.has(key)) { result.duplicates++; continue; }
    seenInBatch.add(key);
    if (r.email && existingEmails.has(r.email.toLowerCase())) { result.duplicates++; continue; }
    if (!r.email && existingCompanies.has(r.company_name.toLowerCase())) { result.duplicates++; continue; }
    toInsert.push({
      company_name: r.company_name,
      contact_name: r.contact_name ?? null,
      email: r.email?.toLowerCase() ?? null,
      phone: r.phone ?? null,
      website: r.website ?? null,
      location: r.location ?? null,
      source: r.source ?? "Email ingest",
      notes: r.notes ?? null,
      status: "new",
      created_by: ctx.createdBy,
    });
  }

  if (toInsert.length) {
    const { data, error } = await supabase.from("agent_leads").insert(toInsert).select("id");
    if (error) {
      result.errors = toInsert.length;
      result.errorDetails.push(error.message);
    } else {
      result.imported = data?.length ?? 0;
      // Audit notes
      const notes = (data ?? []).map((row: any) => ({
        lead_id: row.id,
        author_role: "system",
        kind: "system_event",
        body: `Imported via email from ${ctx.senderEmail}.`,
      }));
      if (notes.length) {
        const { error: nErr } = await supabase.from("candidate_notes").insert(notes);
        if (nErr) console.error("candidate_notes insert failed", nErr);
      }
    }
  }

  return result;
}

export function buildSummary(res: { imported: number; duplicates: number; errors: number; errorDetails: string[]; source: string }): { subject: string; html: string; text: string } {
  const subject = `Leads imported: ${res.imported} new, ${res.duplicates} duplicates`;
  const errLines = res.errorDetails.slice(0, 5).map((e) => `<li>${e.replace(/</g, "&lt;")}</li>`).join("");
  const html = `<p>Hi,</p>
<p>I processed your lead list (source: <b>${res.source}</b>) and here's what landed in the pipeline:</p>
<ul>
  <li><b>${res.imported}</b> new leads imported</li>
  <li><b>${res.duplicates}</b> duplicates skipped</li>
  <li><b>${res.errors}</b> errors</li>
</ul>
${res.errorDetails.length ? `<p>First errors:</p><ul>${errLines}</ul>` : ""}
<p>The new leads are in the Sales Agent pipeline with status <code>new</code> — I'll start working them per the default sequence rules.</p>
<p>— Cora</p>`;
  const text = `Hi,\n\nI processed your lead list (source: ${res.source}).\n- ${res.imported} new leads imported\n- ${res.duplicates} duplicates skipped\n- ${res.errors} errors\n\n— Cora`;
  return { subject, html, text };
}
