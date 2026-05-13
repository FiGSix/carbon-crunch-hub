/**
 * Centralised deep-link builder for the weekly agent email.
 * Every CTA in the email goes through here so we can later append
 * UTM/CTA tracking params consistently (Phase 3 A/B testing).
 */

const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://crunchcarbon.com";

function withTracking(path: string, cta: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${APP_BASE_URL}${path}${sep}utm_source=weekly_email&utm_medium=email&utm_campaign=agent_momentum&utm_content=${encodeURIComponent(cta)}`;
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
