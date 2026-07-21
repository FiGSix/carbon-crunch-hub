import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { StepPill } from "@/components/onboarding/StepPill";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Search, Loader2, Upload, Plus } from "lucide-react";
import type { ProjectOnboardingListItem, ProjectStepStatus } from "@/types/onboarding";
import { BulkLegacyProjectUpload } from "@/components/onboarding/BulkLegacyProjectUpload";
import { AddLegacyProjectDialog } from "@/components/onboarding/AddLegacyProjectDialog";
import { cn } from "@/lib/utils";
import { dynamicCarbonPricingService } from "@/lib/calculations/carbon/dynamicPricing";

export default function ProjectOnboardingList() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectOnboardingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  // Lazy load carbon prices on mount
  useEffect(() => {
    dynamicCarbonPricingService.getCarbonPrices().catch(() => {
      // Silently fail - fallback constants will be used
    });
  }, []);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user, userRole]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);

      // Build base query
      let query = supabase
        .from('project_onboarding')
        .select(`
          id,
          proposal_id,
          updated_at,
          onboarding_complete,
          data_access_verified,
          audit_ready,
          submitted_for_review,
          submitted_for_review_at,
          admin_validated,
          proposals!inner(
            id,
            title,
            client_id,
            client_reference_id,
            agent_id,
            signed_at,
            content,
            profiles:client_id (
              first_name,
              last_name,
              email,
              company_name
            ),
            clients:client_reference_id (
              first_name,
              last_name,
              email,
              company_name
            )
          )
        `)
        .not('proposals.signed_at', 'is', null);

      // Apply role-based filtering
      if (userRole === 'agent') {
        // Get user's company members to show all team proposals
        const { data: companyMembers } = await supabase
          .from('company_members')
          .select('company_id, user_id')
          .eq('status', 'active');

        // Find user's companies
        const userCompanyIds = companyMembers
          ?.filter(cm => cm.user_id === user?.id)
          .map(cm => cm.company_id) || [];

        if (userCompanyIds.length > 0) {
          // Get all agent IDs from user's companies
          const teamAgentIds = companyMembers
            ?.filter(cm => userCompanyIds.includes(cm.company_id))
            .map(cm => cm.user_id) || [];

          // Include user's own ID even if not in a company
          const allAgentIds = [...new Set([...teamAgentIds, user?.id])];
          query = query.in('proposals.agent_id', allAgentIds);
        } else {
          // No company membership - show only own proposals
          query = query.eq('proposals.agent_id', user?.id);
        }
      } else if (userRole === 'client') {
        // For clients, filter by client_id, client_reference_id, or company membership
        const { data: clientRecord } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user?.id)
          .single();

        // Get company client IDs for team visibility
        const { data: membership } = await supabase
          .from('client_company_members')
          .select('client_company_id')
          .eq('user_id', user?.id)
          .eq('status', 'active');

        const companyIds = membership?.map(m => m.client_company_id) || [];
        let companyClientIds: string[] = [];

        if (companyIds.length > 0) {
          const { data: companyClients } = await supabase
            .from('clients')
            .select('id')
            .in('client_company_id', companyIds);
          companyClientIds = companyClients?.map(c => c.id) || [];
        }

        // Build OR filter combining direct match + company matches
        const filters = [`client_id.eq.${user?.id}`];
        if (clientRecord) {
          filters.push(`client_reference_id.eq.${clientRecord.id}`);
        }
        if (companyClientIds.length > 0) {
          filters.push(`client_reference_id.in.(${companyClientIds.join(',')})`);
        }
        query = query.or(filters.join(','), { foreignTable: 'proposals' });
      }
      // Admin sees all projects (no filter needed)

      const { data: onboardingData, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const transformedProjects: ProjectOnboardingListItem[] = (onboardingData || []).map((item: any) => {
        const proposal = item.proposals;
        
        // Check clients table first (legacy projects), then profiles table, then fall back to JSON content
        const clientFromTable = proposal.clients?.[0] || proposal.profiles?.[0];
        const clientFromJson = proposal.content?.clientInfo || {};
        
        const clientName = clientFromTable 
          ? `${clientFromTable.first_name || ''} ${clientFromTable.last_name || ''}`.trim() || 'Unknown Client'
          : clientFromJson.name || 'Unknown Client';
        
        const siteAddress = clientFromJson.address || null;
        
        return {
          id: item.id,
          proposal_id: item.proposal_id,
          proposal_title: proposal.title || 'Untitled Project',
          client_name: clientName,
          site_address: siteAddress,
          updated_at: item.updated_at,
          submitted_for_review: item.submitted_for_review,
          submitted_for_review_at: item.submitted_for_review_at,
          admin_validated: item.admin_validated,
          step_status: {
            cession_status: 'green' as const,
            onboarding_status: item.onboarding_complete ? 'green' as const : 'orange' as const,
            data_access_status: item.data_access_verified ? 'green' as const : 'orange' as const,
            audit_ready_status: item.audit_ready ? 'green' as const : 'orange' as const,
          }
        };
      });

      setProjects(transformedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProjectStatus = (project: ProjectOnboardingListItem): {
    label: string;
    color: string;
  } => {
    const { onboarding_status, data_access_status, audit_ready_status } = project.step_status;
    
    // 🟢 Audit Ready (highest priority)
    if (audit_ready_status === 'green') {
      return {
        label: 'Audit Ready',
        color: 'bg-green-100 text-green-800 border-green-300'
      };
    }
    
    // 🟣 Awaiting Review (submitted for review but not validated)
    if (project.submitted_for_review && !project.admin_validated) {
      return {
        label: 'Awaiting Review',
        color: 'bg-violet-100 text-violet-800 border-violet-300'
      };
    }
    
    // 🟠 Under Review (validated by admin but not audit-ready)
    if (project.admin_validated) {
      return {
        label: 'Under Review',
        color: 'bg-orange-100 text-orange-800 border-orange-300'
      };
    }
    
    // 🟡 In Progress (at least one step complete)
    if (onboarding_status === 'green' || data_access_status === 'green') {
      return {
        label: 'In Progress',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
      };
    }
    
    // 🔴 Not Started (nothing done)
    return {
      label: 'Not Started',
      color: 'bg-red-100 text-red-800 border-red-300'
    };
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch =
      project.proposal_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || calculateProjectStatus(project).label === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleProjectClick = (projectId: string) => {
    navigate(`/onboarding/${projectId}`);
  };

  const handlePillClick = (projectId: string, section: string) => {
    navigate(`/onboarding/${projectId}?tab=${section}`);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {userRole === 'client' ? 'My Projects' : 'Project Onboarding'}
              </h1>
              <p className="text-muted-foreground mt-2">
                {userRole === 'client' 
                  ? 'Track the onboarding progress of your solar projects'
                  : 'Complete onboarding for signed proposals'}
              </p>
            </div>
            
            {userRole === 'admin' && (
              <div className="flex gap-2">
                <Button onClick={() => setShowBulkUpload(true)} variant="outline">
                  <Upload className="h-5 w-5 mr-2" />
                  Import Legacy Projects
                </Button>
                <Button onClick={() => setShowAddProject(true)}>
                  <Plus className="h-5 w-5 mr-2" />
                  Add Legacy Project
                </Button>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Projects Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <p className="text-muted-foreground">
                {searchTerm
                  ? "No projects found matching your search"
                  : "No signed proposals yet. Projects will appear here after clients sign the Cession Agreement."}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Project Name</th>
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Last Updated</th>
                    <th className="text-left p-4 font-medium">Steps</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-t hover:bg-muted/20 cursor-pointer transition-colors"
                      onClick={() => handleProjectClick(project.id)}
                    >
                      <td className="p-4 font-medium">{project.proposal_title}</td>
                      <td className="p-4 text-muted-foreground">{project.client_name}</td>
                      <td className="p-4">
                        {(() => {
                          const status = calculateProjectStatus(project);
                          return (
                            <Badge 
                              className={cn(
                                "font-medium border",
                                status.color
                              )}
                            >
                              {status.label}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <StepPill
                            label="Cession"
                            status={project.step_status.cession_status}
                            onClick={() => handlePillClick(project.id, 'overview')}
                            tooltip="Cession Agreement Signed"
                          />
                          <StepPill
                            label="Onboarding"
                            status={project.step_status.onboarding_status}
                            onClick={() => handlePillClick(project.id, 'onboarding')}
                            tooltip={project.step_status.onboarding_status === 'green' ? 'Complete' : 'Incomplete'}
                          />
                          <StepPill
                            label="Data Access"
                            status={project.step_status.data_access_status}
                            onClick={() => handlePillClick(project.id, 'data-access')}
                            tooltip={project.step_status.data_access_status === 'green' ? 'Verified' : 'Pending'}
                          />
                          <StepPill
                            label="Audit Ready"
                            status={project.step_status.audit_ready_status}
                            onClick={() => handlePillClick(project.id, 'audit')}
                            tooltip={project.step_status.audit_ready_status === 'green' ? 'Ready' : 'Pending'}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              Not Started
            </span>
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              In Progress
            </span>
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-violet-500" />
              Awaiting Review
            </span>
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              Under Review
            </span>
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              Audit Ready
            </span>
          </div>
        </div>
      </div>
      
      <BulkLegacyProjectUpload
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onSuccess={fetchProjects}
      />
      
      <AddLegacyProjectDialog
        open={showAddProject}
        onOpenChange={setShowAddProject}
        onSuccess={() => {
          setShowAddProject(false);
          fetchProjects();
        }}
      />
    </DashboardLayout>
  );
}
