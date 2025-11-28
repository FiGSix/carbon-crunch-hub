import { supabase } from "@/integrations/supabase/client";

export interface LegalDocumentAcceptance {
  document_id: string;
  version: number;
  metadata?: Record<string, any>;
}

export async function acceptLegalDocument(
  documentType: string,
  acceptance: LegalDocumentAcceptance
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // Get user agent and IP (IP will be captured by database trigger)
  const userAgent = navigator.userAgent;

  const { error } = await supabase
    .from("legal_document_acceptances")
    .insert({
      user_id: user.id,
      document_id: acceptance.document_id,
      version: acceptance.version,
      user_agent: userAgent,
      metadata: acceptance.metadata || {},
    });

  if (error) throw error;
}

export async function getLatestDocument(documentType: string) {
  const { data, error } = await supabase
    .from("legal_documents")
    .select("*")
    .eq("document_type", documentType)
    .eq("status", "published")
    .eq("is_active", true)
    .order("current_version", { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function hasAcceptedLatestVersion(
  userId: string,
  documentType: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_accepted_latest_version", {
    p_user_id: userId,
    p_document_type: documentType,
  });

  if (error) {
    console.error("Error checking acceptance:", error);
    return false;
  }

  return data;
}

export async function getUserAcceptances(userId: string) {
  const { data, error } = await supabase
    .from("legal_document_acceptances")
    .select(`
      *,
      legal_documents:document_id (
        document_type,
        title,
        current_version
      )
    `)
    .eq("user_id", userId)
    .order("accepted_at", { ascending: false });

  if (error) throw error;
  return data;
}
