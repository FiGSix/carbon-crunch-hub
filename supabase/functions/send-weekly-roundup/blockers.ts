import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { links } from "./links.ts";

export type ActionOwner = "client" | "agent" | "crunch";

export interface ActionableBlocker {
  proposal_id: string;
  project_onboarding_id: string | null;
  project_name: string;
  mwp: number;
  status: string;
  category: ActionOwner;
  missing_items: string[];
  primary_action_label: string;
  resolve_url: string;
}

interface BlockerSourceRow {
  proposal_id: string;
  proposal_title: string;
  system_size_kwp: number | null;
  signed_at: string | null;
  client_reference_id: string | null;
  // onboarding
  onboarding_id: string | null;
  onboarding_complete: boolean | null;
  data_access_verified: boolean | null;
  audit_ready: boolean | null;
  submitted_for_review: boolean | null;
  admin_validated: boolean | null;
  // client
  cession_signed_at: string | null;
  // data access
  has_data_access_config: boolean;
  data_access_test_status: string | null;
  // documents
  doc_categories: Set<string>;
}

const REQUIRED_DOC_CATEGORIES = new Set([
  "ownership_proof",   // proof of ownership
  "electrical_coc",    // electrical Certificate of Compliance
  "invoice",           // installation invoice
]);

const HUMAN_DOC_NAME: Record<string, string> = {
  ownership_proof: "Proof of ownership",
  electrical_coc: "Electrical COC",
  invoice: "Installation invoice",
};

/**
 * Builds categorised, actionable blockers for one agent's signed-but-not-audit-ready
 * proposals. Each blocker tells the agent what is missing, who must act, and where
 * to go to resolve it.
 */
export async function buildAgentBlockers(
  supabase: ReturnType<typeof createClient>,
  agentId: string,
  signedProposalsForAgent: Array<{
    id: string;
    title: string;
    system_size_kwp: number | null;
    signed_at: string | null;
    client_reference_id: string | null;
    audit_ready?: boolean;
  }>
): Promise<ActionableBlocker[]> {
  // Filter to signed but NOT audit-ready
  const candidates = signedProposalsForAgent.filter((p) => !p.audit_ready);
  if (candidates.length === 0) return [];

  const proposalIds = candidates.map((p) => p.id);
  const clientIds = candidates
    .map((p) => p.client_reference_id)
    .filter((id): id is string => !!id);

  // Parallel fetches
  const [onboardingRes, clientsRes] = await Promise.all([
    supabase
      .from("project_onboarding")
      .select("id, proposal_id, onboarding_complete, data_access_verified, audit_ready, submitted_for_review, admin_validated")
      .in("proposal_id", proposalIds),
    clientIds.length > 0
      ? supabase.from("clients").select("id, cession_signed_at").in("id", clientIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const onboardingByProposal = new Map<string, any>();
  (onboardingRes.data || []).forEach((o: any) => onboardingByProposal.set(o.proposal_id, o));

  const cessionByClient = new Map<string, string | null>();
  (clientsRes.data || []).forEach((c: any) => cessionByClient.set(c.id, c.cession_signed_at));

  const onboardingIds = (onboardingRes.data || []).map((o: any) => o.id);

  // Fetch docs + data_access_config keyed by project_onboarding.id
  const [docsRes, dacRes] = await Promise.all([
    onboardingIds.length > 0
      ? supabase.from("onboarding_documents").select("project_id, category").in("project_id", onboardingIds)
      : Promise.resolve({ data: [], error: null }),
    onboardingIds.length > 0
      ? supabase.from("data_access_config").select("project_id, last_test_status").in("project_id", onboardingIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const docsByProject = new Map<string, Set<string>>();
  (docsRes.data || []).forEach((d: any) => {
    const set = docsByProject.get(d.project_id) ?? new Set<string>();
    if (d.category) set.add(d.category);
    docsByProject.set(d.project_id, set);
  });

  const dacByProject = new Map<string, { hasConfig: boolean; status: string | null }>();
  (dacRes.data || []).forEach((d: any) => {
    dacByProject.set(d.project_id, { hasConfig: true, status: d.last_test_status ?? null });
  });

  const blockers: ActionableBlocker[] = [];

  for (const p of candidates) {
    const onboarding = onboardingByProposal.get(p.id);
    const onboardingId: string | null = onboarding?.id ?? null;
    const docs = onboardingId ? (docsByProject.get(onboardingId) ?? new Set()) : new Set<string>();
    const dac = onboardingId ? dacByProject.get(onboardingId) : undefined;
    const cessionSignedAt = p.client_reference_id
      ? cessionByClient.get(p.client_reference_id)
      : null;

    const mwp = (p.system_size_kwp ?? 0) / 1000;
    const row: BlockerSourceRow = {
      proposal_id: p.id,
      proposal_title: p.title,
      system_size_kwp: p.system_size_kwp,
      signed_at: p.signed_at,
      client_reference_id: p.client_reference_id,
      onboarding_id: onboardingId,
      onboarding_complete: onboarding?.onboarding_complete ?? null,
      data_access_verified: onboarding?.data_access_verified ?? null,
      audit_ready: onboarding?.audit_ready ?? null,
      submitted_for_review: onboarding?.submitted_for_review ?? null,
      admin_validated: onboarding?.admin_validated ?? null,
      cession_signed_at: cessionSignedAt ?? null,
      has_data_access_config: !!dac?.hasConfig,
      data_access_test_status: dac?.status ?? null,
      doc_categories: docs,
    };

    const blocker = classifyBlocker(row, mwp);
    if (blocker) blockers.push(blocker);
  }

  // Order: client first (highest urgency for follow-up), then agent, then crunch.
  // Within a category, larger MWp first.
  const categoryOrder: Record<ActionOwner, number> = { client: 0, agent: 1, crunch: 2 };
  blockers.sort((a, b) => {
    const c = categoryOrder[a.category] - categoryOrder[b.category];
    return c !== 0 ? c : b.mwp - a.mwp;
  });

  return blockers;
}

function classifyBlocker(row: BlockerSourceRow, mwp: number): ActionableBlocker | null {
  const projectIdForLink = row.onboarding_id ?? row.proposal_id;
  const missing: string[] = [];

  // ---- CRUNCH REVIEW (highest priority once submitted) ----
  if (row.submitted_for_review && !row.admin_validated) {
    return {
      proposal_id: row.proposal_id,
      project_onboarding_id: row.onboarding_id,
      project_name: row.proposal_title,
      mwp,
      status: "Awaiting Crunch review",
      category: "crunch",
      missing_items: ["Crunch internal validation"],
      primary_action_label: "View project",
      resolve_url: row.onboarding_id ? links.onboarding(row.onboarding_id) : links.proposal(row.proposal_id),
    };
  }

  // ---- CLIENT ACTION ----
  if (!row.cession_signed_at) {
    missing.push("Signed cession agreement");
  }
  REQUIRED_DOC_CATEGORIES.forEach((cat) => {
    if (!row.doc_categories.has(cat)) {
      missing.push(HUMAN_DOC_NAME[cat] ?? cat);
    }
  });
  if (!row.has_data_access_config || row.data_access_test_status === "failed") {
    missing.push("Read-only monitoring portal access");
  }

  if (missing.length > 0) {
    // If the only missing item is data access AND onboarding form is otherwise
    // complete, we still call this client action (client must grant access).
    return {
      proposal_id: row.proposal_id,
      project_onboarding_id: row.onboarding_id,
      project_name: row.proposal_title,
      mwp,
      status: "Needs client documents / cession",
      category: "client",
      missing_items: missing,
      primary_action_label: "Resolve this project",
      resolve_url: row.onboarding_id ? links.resolveProject(row.onboarding_id) : links.proposal(row.proposal_id),
    };
  }

  // ---- AGENT ACTION ----
  // Onboarding form fields are agent's responsibility once docs are in.
  if (!row.onboarding_complete) {
    return {
      proposal_id: row.proposal_id,
      project_onboarding_id: row.onboarding_id,
      project_name: row.proposal_title,
      mwp,
      status: "Onboarding form incomplete",
      category: "agent",
      missing_items: ["Complete onboarding form (system specs, commissioning date)"],
      primary_action_label: "Complete onboarding",
      resolve_url: row.onboarding_id ? links.onboarding(row.onboarding_id) : links.proposal(row.proposal_id),
    };
  }

  // Onboarding complete, data verified, but not yet submitted for review
  if (row.onboarding_complete && row.data_access_verified && !row.submitted_for_review) {
    return {
      proposal_id: row.proposal_id,
      project_onboarding_id: row.onboarding_id,
      project_name: row.proposal_title,
      mwp,
      status: "Ready to submit for audit review",
      category: "agent",
      missing_items: ["Submit for Crunch review"],
      primary_action_label: "Submit for review",
      resolve_url: row.onboarding_id ? links.onboarding(row.onboarding_id) : links.proposal(row.proposal_id),
    };
  }

  // Default catch-all (rare)
  return {
    proposal_id: row.proposal_id,
    project_onboarding_id: row.onboarding_id,
    project_name: row.proposal_title,
    mwp,
    status: "In progress",
    category: "agent",
    missing_items: ["Review project details"],
    primary_action_label: "Open project",
    resolve_url: row.onboarding_id ? links.onboarding(row.onboarding_id) : links.proposal(row.proposal_id),
  };
}

export interface CategorisedBlockers {
  client: ActionableBlocker[];
  agent: ActionableBlocker[];
  crunch: ActionableBlocker[];
  total_blocked_mwp: number;
}

export function categoriseBlockers(blockers: ActionableBlocker[]): CategorisedBlockers {
  const out: CategorisedBlockers = {
    client: [],
    agent: [],
    crunch: [],
    total_blocked_mwp: 0,
  };
  for (const b of blockers) {
    out[b.category].push(b);
    out.total_blocked_mwp += b.mwp;
  }
  return out;
}
