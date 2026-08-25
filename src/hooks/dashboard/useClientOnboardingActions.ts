import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import { computeOutstanding, type OutstandingItem } from "@/lib/onboarding/outstanding";

export interface ClientOnboardingActionProject {
  projectId: string;
  proposalId: string;
  title: string;
  outstandingCount: number;
  previewItems: OutstandingItem[];
  href: string;
}

export interface ClientOnboardingDashboardState {
  actionProject: ClientOnboardingActionProject | null;
  processingProject: ClientOnboardingActionProject | null;
  signedProjectCount: number;
  auditReadyProjectCount: number;
  dataSource: string;
  ownershipLimitation: string;
}

const DATA_SOURCE = "computeOutstanding(onboarding_fields, onboarding_documents, project_onboarding)";

const OWNERSHIP_LIMITATION =
  "Outstanding checklist rows do not store an explicit owner. Dashboard treats them as client-actionable only before the project is submitted for review, completed, or Audit Ready.";

function projectTitle(row: any): string {
  const proposal = Array.isArray(row.proposals) ? row.proposals[0] : row.proposals;
  return (
    proposal?.title ||
    proposal?.content?.projectInfo?.name ||
    proposal?.content?.clientInfo?.companyName ||
    "Your solar project"
  );
}

export function useClientOnboardingActions() {
  const { user, userRole } = useAuth();
  const location = useLocation();
  const isDashboardRoute = location.pathname === "/" || location.pathname === "/dashboard";

  return useQuery({
    queryKey: queryKeys.dashboard.clientOnboardingActions(user?.id || ""),
    enabled: !!user?.id && userRole === "client" && isDashboardRoute,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ClientOnboardingDashboardState> => {
      if (!user?.id) throw new Error("User not authenticated");

      const [{ data: clientRecords }, { data: memberships }] = await Promise.all([
        supabase.from("clients").select("id").eq("user_id", user.id),
        supabase
          .from("client_company_members")
          .select("client_company_id")
          .eq("user_id", user.id)
          .eq("status", "active"),
      ]);

      const clientIds = new Set<string>((clientRecords || []).map((client) => client.id));
      const companyIds = (memberships || []).map((member) => member.client_company_id).filter(Boolean);

      if (companyIds.length > 0) {
        const { data: companyClients } = await supabase
          .from("clients")
          .select("id")
          .in("client_company_id", companyIds);
        (companyClients || []).forEach((client) => clientIds.add(client.id));
      }

      const filters = [`client_id.eq.${user.id}`];
      if (clientIds.size > 0) {
        filters.push(`client_reference_id.in.(${Array.from(clientIds).join(",")})`);
      }

      const { data: projects, error } = await supabase
        .from("project_onboarding")
        .select(`
          id,
          proposal_id,
          data_access_verified,
          onboarding_complete,
          audit_ready,
          submitted_for_review,
          admin_validated,
          updated_at,
          proposals!inner(
            id,
            title,
            client_id,
            client_reference_id,
            signed_at,
            status,
            content,
            archived_at,
            deleted_at
          )
        `)
        .not("proposals.signed_at", "is", null)
        .is("proposals.archived_at", null)
        .is("proposals.deleted_at", null)
        .or(filters.join(","), { foreignTable: "proposals" })
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const signedProjects = projects || [];
      const projectIds = signedProjects.map((project) => project.id);

      if (projectIds.length === 0) {
        return {
          actionProject: null,
          processingProject: null,
          signedProjectCount: 0,
          auditReadyProjectCount: 0,
          dataSource: DATA_SOURCE,
          ownershipLimitation: OWNERSHIP_LIMITATION,
        };
      }

      const [{ data: fields }, { data: documents }] = await Promise.all([
        supabase.from("onboarding_fields").select("*").in("project_id", projectIds),
        supabase.from("onboarding_documents").select("project_id, category, file_name").in("project_id", projectIds),
      ]);

      const fieldsByProject = new Map<string, Record<string, unknown>>();
      (fields || []).forEach((fieldRow: any) => fieldsByProject.set(fieldRow.project_id, fieldRow));

      const docsByProject = new Map<string, Record<string, unknown>[]>();
      (documents || []).forEach((doc: any) => {
        const current = docsByProject.get(doc.project_id) || [];
        current.push(doc);
        docsByProject.set(doc.project_id, current);
      });

      const summaries = signedProjects.map((project: any) => {
        const outstanding = computeOutstanding(
          fieldsByProject.get(project.id) || null,
          docsByProject.get(project.id) || [],
          project,
        );

        const clientActionable =
          !project.audit_ready &&
          !project.onboarding_complete &&
          !project.submitted_for_review &&
          outstanding.length > 0;

        return {
          projectId: project.id,
          proposalId: project.proposal_id,
          title: projectTitle(project),
          outstandingCount: outstanding.length,
          previewItems: outstanding.slice(0, 3),
          href: `/onboarding/${project.id}?tab=onboarding`,
          clientActionable,
          auditReady: !!project.audit_ready,
        };
      });

      const actionProject = [...summaries]
        .filter((project) => project.clientActionable)
        .sort((a, b) => b.outstandingCount - a.outstandingCount || a.title.localeCompare(b.title))[0];

      const processingProject = summaries.find(
        (project) => !project.auditReady && !project.clientActionable,
      );

      return {
        actionProject: actionProject || null,
        processingProject: processingProject || null,
        signedProjectCount: signedProjects.length,
        auditReadyProjectCount: summaries.filter((project) => project.auditReady).length,
        dataSource: DATA_SOURCE,
        ownershipLimitation: OWNERSHIP_LIMITATION,
      };
    },
  });
}