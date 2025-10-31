import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { OverviewTab } from "./OverviewTab";
import { OnboardingTab } from "./OnboardingTab";
import { DataAccessTab } from "./DataAccessTab";
import { RevenueTab } from "./RevenueTab";
import { ActivityCommentsTab } from "./ActivityCommentsTab";
import { AgreementTab } from "./AgreementTab";
import type { ProjectOnboarding, OnboardingFields } from "@/types/onboarding";

export default function ProjectOnboardingDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [project, setProject] = useState<ProjectOnboarding | null>(null);
  const [fields, setFields] = useState<OnboardingFields | null>(null);
  const [proposalData, setProposalData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setIsLoading(true);

      // Fetch project onboarding
      const { data: projectData, error: projectError } = await supabase
        .from('project_onboarding')
        .select('*, proposals!inner(*)')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);
      setProposalData(projectData.proposals);

      // Fetch onboarding fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('onboarding_fields')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (fieldsError && fieldsError.code !== 'PGRST116') throw fieldsError;
      setFields(fieldsData);

    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: "Error",
        description: "Failed to load project data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToProposal = () => {
    if (proposalData) {
      navigate(`/proposals/${proposalData.id}`);
    }
  };

  // Utility function to get tab status colors
  const getTabStatusColor = (status: 'complete' | 'pending' | 'incomplete' | 'neutral') => {
    switch (status) {
      case 'complete':
        return 'data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=inactive]:bg-green-100 data-[state=inactive]:text-green-800';
      case 'pending':
        return 'data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=inactive]:bg-orange-100 data-[state=inactive]:text-orange-800';
      case 'incomplete':
        return 'data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=inactive]:bg-red-100 data-[state=inactive]:text-red-800';
      case 'neutral':
      default:
        return '';
    }
  };

  // Determine status for each tab
  const agreementStatus = proposalData?.signed_at ? 'complete' : 'incomplete';
  const onboardingStatus = project.onboarding_complete ? 'complete' : 'incomplete';
  const dataAccessStatus = project.data_access_verified ? 'complete' : 'pending';

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!project || !proposalData) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Project not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/onboarding')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {proposalData.title || 'Untitled Project'}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Client: {proposalData.content?.clientInfo?.name || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={handleBackToProposal}>
              View Proposal
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger 
                value="agreement"
                className={getTabStatusColor(agreementStatus)}
              >
                Agreement
              </TabsTrigger>
              <TabsTrigger 
                value="onboarding"
                className={getTabStatusColor(onboardingStatus)}
              >
                Onboarding
              </TabsTrigger>
              <TabsTrigger 
                value="data-access"
                className={getTabStatusColor(dataAccessStatus)}
              >
                Data Access
              </TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="activity">Activity & Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab project={project} proposal={proposalData} onRefresh={fetchProjectData} />
            </TabsContent>

            <TabsContent value="agreement" className="mt-6">
              <AgreementTab 
                proposalId={proposalData?.id || ""} 
                proposalTitle={proposalData?.title || "Proposal"}
              />
            </TabsContent>

            <TabsContent value="onboarding" className="mt-6">
            <OnboardingTab
              projectId={projectId!}
              fields={fields}
              project={project}
              proposal={proposalData}
              onRefresh={fetchProjectData}
            />
            </TabsContent>

            <TabsContent value="data-access" className="mt-6">
              <DataAccessTab
                projectId={projectId!}
                onRefresh={fetchProjectData}
              />
            </TabsContent>

            <TabsContent value="revenue" className="mt-6">
              <RevenueTab
                project={project}
                proposal={proposalData}
                onRefresh={fetchProjectData}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <ActivityCommentsTab projectId={projectId!} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
