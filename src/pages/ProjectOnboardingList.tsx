import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { StepPill } from "@/components/onboarding/StepPill";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Search, Loader2, Upload } from "lucide-react";
import type { ProjectOnboardingListItem, ProjectStepStatus } from "@/types/onboarding";
import { BulkLegacyProjectUpload } from "@/components/onboarding/BulkLegacyProjectUpload";

export default function ProjectOnboardingList() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<ProjectOnboardingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showBulkUpload, setShowBulkUpload] = useState(false);

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
          proposals!inner(
            id,
            title,
            client_id,
            client_reference_id,
            agent_id,
            signed_at,
            content
          )
        `)
        .not('proposals.signed_at', 'is', null);

      // Apply role-based filtering
      if (userRole === 'agent') {
        query = query.eq('proposals.agent_id', user?.id);
      } else if (userRole === 'client') {
        // For clients, filter by either client_id or client_reference_id
        // First, get client record if exists
        const { data: clientRecord } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', user?.id)
          .single();

        if (clientRecord) {
          query = query.or(`client_id.eq.${user?.id},client_reference_id.eq.${clientRecord.id}`, { foreignTable: 'proposals' });
        } else {
          query = query.eq('proposals.client_id', user?.id);
        }
      }
      // Admin sees all projects (no filter needed)

      const { data: onboardingData, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const transformedProjects: ProjectOnboardingListItem[] = (onboardingData || []).map((item: any) => {
        const proposal = item.proposals;
        const clientInfo = proposal.content?.clientInfo || {};
        
        return {
          id: item.id,
          proposal_id: item.proposal_id,
          proposal_title: proposal.title || 'Untitled Project',
          client_name: clientInfo.name || 'Unknown Client',
          site_address: clientInfo.address || null,
          updated_at: item.updated_at,
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

  const filteredProjects = projects.filter(project =>
    project.proposal_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <Button onClick={() => setShowBulkUpload(true)} variant="outline">
                <Upload className="h-5 w-5 mr-2" />
                Import Legacy Projects
              </Button>
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
                    <th className="text-left p-4 font-medium">Site Address</th>
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
                      <td className="p-4 text-muted-foreground">
                        {project.site_address || '—'}
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
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              Complete
            </span>
            <span className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-orange-500" />
              In Progress
            </span>
          </div>
        </div>
      </div>
      
      <BulkLegacyProjectUpload
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onSuccess={fetchProjects}
      />
    </DashboardLayout>
  );
}
