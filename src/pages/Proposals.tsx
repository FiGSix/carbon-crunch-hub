
import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { FileText } from "lucide-react";
import { ProposalList, Proposal } from "@/components/proposals/ProposalList";
import { ProposalFilters } from "@/components/proposals/ProposalFilters";
import { ProposalActions } from "@/components/proposals/ProposalActions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Proposals = () => {
  const { toast } = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchProposals() {
      try {
        setLoading(true);
        
        // Using the integrations client instead to avoid RLS issues
        const { data, error } = await supabase
          .from('proposals')
          .select(`
            id, 
            title, 
            created_at, 
            status, 
            content, 
            client_id,
            annual_energy,
            carbon_credits,
            client_share_percentage,
            client:profiles!proposals_client_id_fkey(first_name, last_name, email)
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error("Supabase query error:", error);
          throw error;
        }
        
        console.log("Proposals data:", data);
        
        // Transform the data to match the Proposal interface
        const formattedProposals: Proposal[] = data.map(item => {
          // Access client profile data using the renamed foreign key reference
          const clientProfile = item.client;
          
          // Handle different return types from Supabase
          const clientName = clientProfile 
            ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() 
            : 'Unknown Client';
            
          // Parse size safely from content
          let size = 0;
          if (typeof item.content === 'object' && item.content !== null) {
            // Try to access projectInfo if it exists
            const projectInfo = item.content.projectInfo;
            if (projectInfo && typeof projectInfo === 'object' && 'size' in projectInfo) {
              size = parseFloat(projectInfo.size || '0');
            }
          }
            
          return {
            id: item.id,
            name: item.title,
            client: clientName,
            date: item.created_at.substring(0, 10), // Format date as YYYY-MM-DD
            size: size,
            status: item.status,
            revenue: item.carbon_credits * 100 // Simplified revenue calculation
          };
        });
        
        setProposals(formattedProposals);
      } catch (error) {
        console.error("Error fetching proposals:", error);
        toast({
          title: "Error",
          description: "Failed to load proposals. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchProposals();
  }, [toast]);
  
  return (
    <DashboardLayout>
      <DashboardHeader 
        title="Proposals" 
        description="Manage and track all your carbon credit proposals." 
      />
      
      <Card className="retro-card mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Proposal Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProposalActions />
          <ProposalFilters />
          {loading ? (
            <div className="text-center py-6">
              <p className="text-carbon-gray-500">Loading proposals...</p>
            </div>
          ) : (
            <ProposalList proposals={proposals} />
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Proposals;
