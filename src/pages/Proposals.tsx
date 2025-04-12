
import { useState, useEffect, useCallback } from "react";
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
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    sort: 'newest'
  });
  
  // Function to apply filtering based on user input
  const handleFilterChange = (filter: string, value: string) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
  };
  
  const fetchProposals = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Fetching proposals with filters:", filters);
      
      // Start building the query
      let query = supabase
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
          invitation_sent_at,
          invitation_viewed_at,
          invitation_expires_at
        `);
      
      // Apply status filter if not 'all'
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      // Apply search filter if provided
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }
      
      // Apply sorting
      switch (filters.sort) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'size-high':
          // Note: We can't directly sort by content->projectInfo->size as it's in JSON
          // We'll sort this after fetching
          query = query.order('created_at', { ascending: false });
          break;
        case 'size-low':
          query = query.order('created_at', { ascending: false });
          break;
        case 'revenue-high':
          query = query.order('carbon_credits', { ascending: false, nullsFirst: false });
          break;
        case 'revenue-low':
          query = query.order('carbon_credits', { ascending: true, nullsFirst: true });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }
      
      // Execute the query
      const { data: proposalsData, error } = await query;
      
      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }
      
      // Fetch client profiles in a separate query to avoid RLS issues
      const clientIds = proposalsData?.map(p => p.client_id) || [];
      let clientProfiles: Record<string, any> = {};
      
      if (clientIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', clientIds);
          
        if (profilesError) {
          console.error("Error fetching client profiles:", profilesError);
          // Continue with partial data rather than failing completely
        } else if (profilesData) {
          // Convert to a map for easy lookup
          clientProfiles = profilesData.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      
      console.log("Proposals data:", proposalsData);
      console.log("Client profiles:", clientProfiles);
      
      // Transform the data to match the Proposal interface
      let formattedProposals: Proposal[] = (proposalsData || []).map(item => {
        // Get client profile from our map
        const clientProfile = clientProfiles[item.client_id];
        
        // Handle different return types from Supabase
        const clientName = clientProfile 
          ? `${clientProfile.first_name || ''} ${clientProfile.last_name || ''}`.trim() 
          : 'Unknown Client';
          
        // Parse size safely from content - making sure to check types properly for TypeScript
        let size = 0;
        if (item.content && typeof item.content === 'object' && !Array.isArray(item.content)) {
          // Now TypeScript knows content is an object, not an array
          const contentObj = item.content as Record<string, any>;
          
          // Check if projectInfo exists and is an object
          if (contentObj.projectInfo && typeof contentObj.projectInfo === 'object') {
            // Access size property safely
            if ('size' in contentObj.projectInfo) {
              const sizeValue = contentObj.projectInfo.size;
              size = parseFloat(String(sizeValue) || '0');
            }
          }
        }
          
        return {
          id: item.id,
          name: item.title,
          client: clientName,
          date: item.created_at.substring(0, 10), // Format date as YYYY-MM-DD
          size: size,
          status: item.status,
          revenue: item.carbon_credits ? item.carbon_credits * 100 : 0, // Simplified revenue calculation
          invitation_sent_at: item.invitation_sent_at,
          invitation_viewed_at: item.invitation_viewed_at,
          invitation_expires_at: item.invitation_expires_at
        };
      });
      
      // Apply client-side sorting for JSON fields if needed
      if (filters.sort === 'size-high') {
        formattedProposals.sort((a, b) => b.size - a.size);
      } else if (filters.sort === 'size-low') {
        formattedProposals.sort((a, b) => a.size - b.size);
      }
      
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
  }, [toast, filters]); // Re-fetch when filters change
  
  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);
  
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
          <ProposalFilters 
            onSearchChange={(value) => handleFilterChange('search', value)}
            onStatusChange={(value) => handleFilterChange('status', value)}
            onSortChange={(value) => handleFilterChange('sort', value)}
          />
          {loading ? (
            <div className="text-center py-6">
              <p className="text-carbon-gray-500">Loading proposals...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-carbon-gray-500">No proposals found matching your criteria.</p>
            </div>
          ) : (
            <ProposalList 
              proposals={proposals} 
              onProposalUpdate={fetchProposals}
            />
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Proposals;
