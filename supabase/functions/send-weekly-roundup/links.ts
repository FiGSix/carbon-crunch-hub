/**
 * Centralised deep-link builder for the weekly agent email.
 * Phase 3: appends per-send tracking (variant, send_id) so clicks can be
 * correlated in email_cta_events via the resend webhook (utm_send_id).
 */

const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://crunchcarbon.com";

interface EmailContext {
  variant: "A" | "B";
  sendId: string; // unique per email send (uuid)
}

let CTX: EmailContext | null = null;

export function setEmailContext(ctx: EmailContext | null): void {
  CTX = ctx;
}

function withTracking(path: string, cta: string): string {
  const sep = path.includes("?") ? "&" : "?";
  let qs = `utm_source=weekly_email&utm_medium=email&utm_campaign=agent_momentum&utm_content=${encodeURIComponent(cta)}`;
  if (CTX) {
    qs += `&utm_variant=${CTX.variant}&utm_send_id=${encodeURIComponent(CTX.sendId)}&utm_cta=${encodeURIComponent(cta)}`;
  }
  return `${APP_BASE_URL}${path}${sep}${qs}`;
}

export const links = {
  dashboard: () => withTracking("/dashboard", "open_dashboard"),
  createProposal: () => withTracking("/create-proposal", "add_proposal"),
  proposalsList: () => withTracking("/proposals", "view_proposals"),
  proposalsPending: () => withTracking("/proposals?filter=pending_signature", "follow_up_pending"),
  proposalsExpiring: () => withTracking("/proposals?filter=expiring", "re_engage_expiring"),
  proposalsViewedNotSigned: () => withTracking("/proposals?filter=viewed_not_signed", "follow_up_viewed"),
  myClients: () => withTracking("/my-clients", "view_clients"),

  proposal: (id: string, cta = "open_proposal") =>
    withTracking(`/proposals/${id}`, cta),

  onboarding: (projectId: string, cta = "resolve_project") =>
    withTracking(`/onboarding/${projectId}`, cta),

  followUpProposal: (id: string) => withTracking(`/proposals/${id}`, "follow_up_proposal"),
  resolveProject: (projectId: string) => withTracking(`/onboarding/${projectId}`, "resolve_project"),
  uploadDocs: (projectId: string) => withTracking(`/onboarding/${projectId}?focus=documents`, "upload_documents"),
  signCession: (projectId: string) => withTracking(`/onboarding/${projectId}?focus=cession`, "sign_cession"),
  dataAccess: (projectId: string) => withTracking(`/onboarding/${projectId}?focus=data-access`, "data_access"),
};
