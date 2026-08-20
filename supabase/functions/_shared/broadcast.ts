// Shared broadcast rules: category policy, unsubscribe tokens, merge rendering.
// The CATEGORY_POLICY map is the single source of truth for opt-out behaviour —
// the sender derives headers, footer and gating from it, so a category can never
// be made unsubscribable (or not) from the UI or from campaign data.

export type BroadcastCategory = "operational" | "opportunity" | "newsletter";

export interface CategoryPolicy {
  unsubscribable: boolean;
  respectsPreferences: boolean;
  label: string;
}

export const CATEGORY_POLICY: Record<BroadcastCategory, CategoryPolicy> = {
  operational: {
    unsubscribable: false,
    respectsPreferences: false,
    label: "Service notice",
  },
  opportunity: {
    unsubscribable: true,
    respectsPreferences: true,
    label: "Partner update",
  },
  newsletter: {
    unsubscribable: true,
    respectsPreferences: true,
    label: "Newsletter",
  },
};

export function policyFor(category: string): CategoryPolicy {
  const p = CATEGORY_POLICY[category as BroadcastCategory];
  if (!p) throw new Error(`Unknown broadcast category: ${category}`);
  return p;
}

// ---------------------------------------------------------------------------
// HMAC-signed unsubscribe tokens (no token table needed)
// ---------------------------------------------------------------------------

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("BROADCAST_TOKEN_SECRET");
  if (!secret) throw new Error("BROADCAST_TOKEN_SECRET is not configured");
  return await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export interface UnsubPayload {
  e: string; // email (lowercased)
  c: string; // campaign id
  k: BroadcastCategory;
  m: "category" | "all"; // mode
}

export async function signUnsubToken(payload: UnsubPayload): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(body)),
  );
  return `${body}.${b64url(sig)}`;
}

export async function verifyUnsubToken(token: string): Promise<UnsubPayload | null> {
  const [body, sig] = (token || "").split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(),
    b64urlDecode(sig),
    new TextEncoder().encode(body),
  );
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as UnsubPayload;
    if (!payload?.e || !payload?.c || !payload?.k) return null;
    // Operational campaigns never mint tokens; refuse one even if forged shape matches.
    if (!policyFor(payload.k).unsubscribable) return null;
    return payload;
  } catch {
    return null;
  }
}

export function functionsBaseUrl(): string {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  return `${url}/functions/v1`;
}

export async function buildUnsubscribe(
  category: string,
  campaignId: string,
  email: string,
): Promise<{ url: string | null; oneClickUrl: string | null; headers: Record<string, string> }> {
  if (!policyFor(category).unsubscribable) {
    // Structurally absent: no token exists, so no link and no headers can be rendered.
    return { url: null, oneClickUrl: null, headers: {} };
  }
  const token = await signUnsubToken({
    e: email.toLowerCase(),
    c: campaignId,
    k: category as BroadcastCategory,
    m: "category",
  });
  const url = `${functionsBaseUrl()}/broadcast-unsubscribe?token=${encodeURIComponent(token)}`;
  return {
    url,
    oneClickUrl: url,
    headers: {
      "List-Unsubscribe": `<${url}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

// ---------------------------------------------------------------------------
// Merge rendering
// ---------------------------------------------------------------------------

export const PROJECT_LIST_CAP = 5;

function escapeHtml(s: string): string {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );
}

function projectTitles(context: Record<string, any>): { shown: string[]; rest: number } {
  const projects: Array<Record<string, any>> = Array.isArray(context?.projects)
    ? context.projects
    : [];
  const shown = projects
    .slice(0, PROJECT_LIST_CAP)
    .map((p) => String(p?.title ?? "Untitled project"));
  return { shown, rest: Math.max(projects.length - shown.length, 0) };
}

/** Block-level bullet list — {{projects_list}}. */
export function renderProjectList(context: Record<string, any>): string {
  const { shown, rest } = projectTitles(context);
  if (shown.length === 0) return "";
  const items = shown
    .map(
      (t) =>
        `<li style="margin:0 0 4px 0;font-family:Arial,Helvetica,sans-serif">${escapeHtml(t)}</li>`,
    )
    .join("");
  const more =
    rest > 0
      ? `<li style="margin:0;color:#5C5C5C;font-family:Arial,Helvetica,sans-serif">and ${rest} more project${rest === 1 ? "" : "s"}</li>`
      : "";
  return `<ul style="margin:8px 0 12px 0;padding-left:20px">${items}${more}</ul>`;
}

/** Inline, sentence-safe — {{projects_inline}} → "A, B and C" (+ "and N more"). */
export function renderProjectsInline(context: Record<string, any>): string {
  const { shown, rest } = projectTitles(context);
  if (shown.length === 0) return "your projects";
  const parts = shown.map(escapeHtml);
  if (rest > 0) parts.push(`${rest} more project${rest === 1 ? "" : "s"}`);
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function withUnsubscribeFooter(html: string, unsubscribeUrl: string | null): string {
  if (!unsubscribeUrl) return html;
  return `${html}
<div style="margin-top:24px;padding-top:16px;border-top:1px solid #E6E6E6;font-size:12px;color:#5C5C5C;font-family:Arial,Helvetica,sans-serif">
  You are receiving this because you are part of the Crunch Carbon platform.
  <a href="${unsubscribeUrl}" style="color:#5C5C5C">Unsubscribe from these emails</a>.
</div>`;
}
