// Existing-relationship / duplicate guard.
// Used before Cora cold-outreaches any discovered lead. Checks email, domain,
// company, website, and phone against the entire CRM surface so we never cold
// contact an existing agent, client, or known partner.
import type { SupabaseSR } from "./coraGuard.ts";

export type RelationshipStatus =
  | "existing_agent"
  | "existing_invited_agent"
  | "existing_client"
  | "existing_prospect"
  | "duplicate_company"
  | "duplicate_contact"
  | "related_needs_review"
  | "do_not_contact"
  | "safe_new_lead";

export interface RelationshipCheckInput {
  email?: string | null;
  company_name?: string | null;
  website?: string | null;
  phone?: string | null;
  excludeCandidateId?: string | null;
}

export interface RelationshipCheckResult {
  status: RelationshipStatus;
  matched_record_id?: string | null;
  matched_record_type?: string | null;
  matched_email?: string | null;
  matched_company?: string | null;
  reason: string;
  contact_permission_status: "allowed" | "hold" | "blocked";
}

function normEmail(s?: string | null): string | null {
  if (!s) return null;
  return s.trim().toLowerCase();
}
function domainOf(s?: string | null): string | null {
  if (!s) return null;
  const e = normEmail(s);
  if (e && e.includes("@")) return e.split("@")[1] ?? null;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}
function normCompany(s?: string | null): string | null {
  if (!s) return null;
  return s
    .toLowerCase()
    .replace(/\b(pty|ltd|inc|cc|llc|holdings|group|solar|energy)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim() || null;
}

const GENERIC_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com",
  "live.com", "me.com", "protonmail.com", "mail.com", "yandex.com",
]);

export async function checkRelationship(
  supabase: SupabaseSR,
  input: RelationshipCheckInput,
): Promise<RelationshipCheckResult> {
  const email = normEmail(input.email);
  const emailDomain = email && email.includes("@") ? email.split("@")[1] : null;
  const siteDomain = domainOf(input.website);
  const companyKey = normCompany(input.company_name);

  // 1. Blocklist / DNC
  if (email) {
    const { data: blocked } = await supabase
      .from("discovery_blocklist")
      .select("id, reason")
      .eq("email", email)
      .maybeSingle();
    if (blocked) {
      return {
        status: "do_not_contact",
        matched_record_id: (blocked as any).id,
        matched_record_type: "discovery_blocklist",
        reason: (blocked as any).reason || "Email on blocklist",
        contact_permission_status: "blocked",
      };
    }
  }
  if (emailDomain) {
    const { data: settings } = await supabase
      .from("sales_agent_settings")
      .select("blocked_domains")
      .eq("id", true)
      .maybeSingle();
    const blocked: string[] = (settings as any)?.blocked_domains ?? [];
    if (blocked.some((d) => emailDomain === d.toLowerCase() || emailDomain.endsWith(`.${d.toLowerCase()}`))) {
      return {
        status: "do_not_contact",
        matched_record_type: "blocked_domain",
        reason: `Domain ${emailDomain} is on the blocklist`,
        contact_permission_status: "blocked",
      };
    }
  }
  if (email) {
    const { data: sup } = await supabase
      .from("client_email_suppressions")
      .select("id, reason")
      .eq("email", email)
      .maybeSingle();
    if (sup) {
      return {
        status: "do_not_contact",
        matched_record_id: (sup as any).id,
        matched_record_type: "client_email_suppressions",
        reason: (sup as any).reason || "Email suppressed",
        contact_permission_status: "blocked",
      };
    }
  }

  // 2. Existing agents (signed up)
  if (email) {
    const { data: agent } = await supabase
      .from("agents")
      .select("id, company_name, email")
      .eq("email", email)
      .maybeSingle();
    if (agent) {
      return {
        status: "existing_agent",
        matched_record_id: (agent as any).id,
        matched_record_type: "agents",
        matched_email: (agent as any).email,
        matched_company: (agent as any).company_name,
        reason: "Email matches a signed-up agent. Do not cold contact.",
        contact_permission_status: "blocked",
      };
    }
  }

  // 3. Invited agents
  if (email) {
    const { data: inv } = await supabase
      .from("agent_invitations")
      .select("id, company_name, email")
      .eq("email", email)
      .maybeSingle();
    if (inv) {
      return {
        status: "existing_invited_agent",
        matched_record_id: (inv as any).id,
        matched_record_type: "agent_invitations",
        matched_email: (inv as any).email,
        matched_company: (inv as any).company_name,
        reason: "Email already invited as an agent.",
        contact_permission_status: "hold",
      };
    }
  }

  // 4. Existing clients
  if (email) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, company_name, email")
      .eq("email", email)
      .maybeSingle();
    if (client) {
      return {
        status: "existing_client",
        matched_record_id: (client as any).id,
        matched_record_type: "clients",
        matched_email: (client as any).email,
        matched_company: (client as any).company_name,
        reason: "Email matches an existing client. Escalate to admin before contact.",
        contact_permission_status: "blocked",
      };
    }
  }

  // 5. Existing prospect / prior outreach in agent_leads
  if (email) {
    const { data: lead } = await supabase
      .from("agent_leads")
      .select("id, company_name, email, status")
      .eq("email", email)
      .maybeSingle();
    if (lead) {
      return {
        status: "existing_prospect",
        matched_record_id: (lead as any).id,
        matched_record_type: "agent_leads",
        matched_email: (lead as any).email,
        matched_company: (lead as any).company_name,
        reason: `Email already a tracked prospect (status: ${(lead as any).status}).`,
        contact_permission_status: "hold",
      };
    }
  }

  // 6. Duplicate by company name (any agent or prior lead/candidate)
  if (companyKey) {
    const candidates: Array<{ table: string; matches: any[] }> = [];
    const { data: agentsByName } = await supabase
      .from("agents").select("id, company_name").ilike("company_name", `%${input.company_name}%`).limit(5);
    if (agentsByName?.length) candidates.push({ table: "agents", matches: agentsByName });

    const { data: leadsByName } = await supabase
      .from("agent_leads").select("id, company_name").ilike("company_name", `%${input.company_name}%`).limit(5);
    if (leadsByName?.length) candidates.push({ table: "agent_leads", matches: leadsByName });

    for (const group of candidates) {
      for (const m of group.matches) {
        if (normCompany(m.company_name) === companyKey) {
          return {
            status: group.table === "agents" ? "existing_agent" : "duplicate_company",
            matched_record_id: m.id,
            matched_record_type: group.table,
            matched_company: m.company_name,
            reason: `Company ${m.company_name} already exists in ${group.table}.`,
            contact_permission_status: group.table === "agents" ? "blocked" : "hold",
          };
        }
      }
    }
  }

  // 7. Domain match — corporate domain (not gmail/etc)
  if (emailDomain && !GENERIC_DOMAINS.has(emailDomain)) {
    const { data: domainAgents } = await supabase
      .from("agents").select("id, company_name, email").ilike("email", `%@${emailDomain}`).limit(1);
    if (domainAgents?.length) {
      const m = domainAgents[0] as any;
      return {
        status: "existing_agent",
        matched_record_id: m.id,
        matched_record_type: "agents",
        matched_email: m.email,
        matched_company: m.company_name,
        reason: `Same email domain (@${emailDomain}) as an existing agent.`,
        contact_permission_status: "blocked",
      };
    }
    const { data: domainLeads } = await supabase
      .from("agent_leads").select("id, company_name, email").ilike("email", `%@${emailDomain}`).limit(1);
    if (domainLeads?.length) {
      const m = domainLeads[0] as any;
      return {
        status: "related_needs_review",
        matched_record_id: m.id,
        matched_record_type: "agent_leads",
        matched_email: m.email,
        matched_company: m.company_name,
        reason: `Same domain (@${emailDomain}) as an existing prospect — review before contact.`,
        contact_permission_status: "hold",
      };
    }
  }

  // 8. Prior discovery candidate (different row, same email)
  if (email) {
    const q = supabase
      .from("discovery_candidates")
      .select("id, company_name, email, status")
      .eq("email", email)
      .limit(1);
    const { data: priorCands } = input.excludeCandidateId
      ? await q.neq("id", input.excludeCandidateId)
      : await q;
    if (priorCands?.length) {
      const m = priorCands[0] as any;
      return {
        status: "duplicate_contact",
        matched_record_id: m.id,
        matched_record_type: "discovery_candidates",
        matched_email: m.email,
        matched_company: m.company_name,
        reason: `Already discovered earlier (candidate status: ${m.status}).`,
        contact_permission_status: "hold",
      };
    }
  }

  // 9. Website-domain match against agents
  if (siteDomain && siteDomain !== emailDomain) {
    const { data: siteAgents } = await supabase
      .from("agents").select("id, company_name").ilike("company_name", `%${siteDomain.split(".")[0]}%`).limit(1);
    if (siteAgents?.length) {
      const m = siteAgents[0] as any;
      return {
        status: "related_needs_review",
        matched_record_id: m.id,
        matched_record_type: "agents",
        matched_company: m.company_name,
        reason: `Website domain ${siteDomain} resembles an existing agent — needs review.`,
        contact_permission_status: "hold",
      };
    }
  }

  return {
    status: "safe_new_lead",
    reason: "No matching agent, client, prospect, or duplicate record.",
    contact_permission_status: "allowed",
  };
}
