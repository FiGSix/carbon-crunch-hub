import { supabase } from "@/integrations/supabase/client";
import type { ProjectInformation } from "@/types/proposals";

interface DuplicateReviewResult {
  blocked: boolean;
  review_id?: string;
  approved_review_id?: string;
  match_reasons?: string[];
}

export class ProposalDuplicateReviewError extends Error {
  reviewId?: string;

  constructor(reviewId?: string) {
    super("This site appears to already be registered. Your submission has been sent to Crunch Carbon for review.");
    this.name = "ProposalDuplicateReviewError";
    this.reviewId = reviewId;
  }
}

export async function checkProposalDuplicate(params: {
  agentId: string;
  clientId: string;
  title: string;
  projectInfo: ProjectInformation;
  systemSizeKwp: number;
}): Promise<string | null> {
  const { data, error } = await (supabase as any).rpc("queue_proposal_duplicate_review", {
    p_agent_id: params.agentId,
    p_client_id: params.clientId,
    p_title: params.title,
    p_address: params.projectInfo.address || null,
    p_system_size_kwp: params.systemSizeKwp,
    p_commissioning_date: params.projectInfo.commissionDate || null,
    p_latitude: params.projectInfo.gpsLat ?? null,
    p_longitude: params.projectInfo.gpsLng ?? null,
    p_payload: { projectInfo: params.projectInfo },
  });

  if (error) throw new Error(`Could not validate project uniqueness: ${error.message}`);
  const result = (data ?? { blocked: false }) as DuplicateReviewResult;
  if (result.blocked) throw new ProposalDuplicateReviewError(result.review_id);
  return result.approved_review_id ?? null;
}
