// Auto-send gate. Returns a single yes/no + blocker reason. All Cora auto-send
// paths must call this before any outbound. Pairs with logCoraDecision.
import type { SupabaseSR } from "./coraGuard.ts";
import { assertCoraCanAct } from "./coraGuard.ts";
import { checkRelationship, type RelationshipCheckResult } from "./relationshipCheck.ts";

export interface GateInput {
  email?: string | null;
  company_name?: string | null;
  website?: string | null;
  location?: string | null;
  phone?: string | null;
  fit_score?: number | null;
  personalisation_score?: number | null;
  fit_score?: number | null;
  personalisation_score?: number | null;
  research_confidence?: number | null;
  completeness_score?: number | null;
  segment?: string | null;
  location_country?: string | null;
  candidate_id?: string | null;
  precomputedRelationship?: RelationshipCheckResult | null;
}

export interface GateResult {
  allowed: boolean;
  blocker?: string;
  reason: string;
  relationship?: RelationshipCheckResult;
  remainingToday?: number;
}

  if (!loc) return true; // don't block when unknown
  const l = loc.toLowerCase();
  return (
    l.includes("south africa") ||
    l.includes(" za") || l.endsWith(",za") ||
    l.includes("johannesburg") || l.includes("cape town") || l.includes("durban") ||
    l.includes("pretoria") || l.includes("gauteng") || l.includes("western cape") ||
    l.includes("eastern cape") || l.includes("kwazulu") || l.includes("mpumalanga") ||
    l.includes("limpopo") || l.includes("north west") || l.includes("free state") ||
    l.includes("northern cape")
  );
}

export async function evaluateAutoSend(
  supabase: SupabaseSR,
  input: GateInput,
): Promise<GateResult> {
  const gate = await assertCoraCanAct(supabase);
  if (!gate.allowed) {
    return { allowed: false, blocker: gate.blocker, reason: gate.reason ?? "Cora is paused" };
  }
  const settings = gate.settings ?? {};

  if (!input.email || !input.email.includes("@")) {
    return { allowed: false, blocker: "no_email", reason: "No valid email address." };
  }

  if (!input.website || input.website.trim() === "") {
    return { allowed: false, blocker: "no_website", reason: "No company website on file." };
  }

  const isSACountry = (input.location_country ?? "").toUpperCase() === "ZA"
    || (input.location_country ?? "").toLowerCase().includes("south africa");
  if (!isSACountry && !looksSouthAfrican(input.location)) {
    return { allowed: false, blocker: "not_south_african", reason: "Company location is not confirmed South African." };
  }

  const seg = (input.segment ?? "").toLowerCase();
  if (!seg || seg === "unknown") {
    return { allowed: false, blocker: "segment_unknown", reason: "Segment is not set (residential / commercial / agri / mixed)." };
  }

  const completenessMin = settings.completeness_threshold ?? 80;
  if ((input.completeness_score ?? 0) < completenessMin) {
    return { allowed: false, blocker: "completeness_low", reason: `Lead completeness ${input.completeness_score ?? 0} < ${completenessMin}.` };
  }

  const fitMin = settings.fit_score_threshold ?? 3;
  const persMin = settings.personalisation_score_threshold ?? 2;
  const confMin = settings.research_confidence_threshold ?? 70;
  if ((input.fit_score ?? 0) < fitMin) {
    return { allowed: false, blocker: "fit_score_low", reason: `Fit score ${input.fit_score ?? 0} < ${fitMin}.` };
  }
  if ((input.personalisation_score ?? 0) < persMin) {
    return { allowed: false, blocker: "personalisation_low", reason: `Personalisation score ${input.personalisation_score ?? 0} < ${persMin}.` };
  }
  if ((input.research_confidence ?? 0) < confMin) {
    return { allowed: false, blocker: "research_confidence_low", reason: `Research confidence ${input.research_confidence ?? 0} < ${confMin}.` };
  }


  const relationship = input.precomputedRelationship ??
    await checkRelationship(supabase, {
      email: input.email,
      company_name: input.company_name,
      website: input.website,
      phone: input.phone,
      excludeCandidateId: input.candidate_id ?? null,
    });

  if (relationship.status !== "safe_new_lead") {
    return {
      allowed: false,
      blocker: `relationship_${relationship.status}`,
      reason: relationship.reason,
      relationship,
    };
  }

  // Daily cap
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
  const { count: sentToday } = await supabase
    .from("lead_outreach_history")
    .select("id", { count: "exact", head: true })
    .gte("sent_at", todayStart.toISOString())
    .eq("status", "sent");
  const cap = settings.daily_send_cap ?? 50;
  const remaining = Math.max(0, cap - (sentToday ?? 0));
  if (remaining <= 0) {
    return { allowed: false, blocker: "daily_cap", reason: `Daily send cap of ${cap} reached.`, relationship, remainingToday: 0 };
  }

  return { allowed: true, reason: "All gates passed.", relationship, remainingToday: remaining };
}
