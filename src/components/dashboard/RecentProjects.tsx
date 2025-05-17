
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, RefreshCw } from "lucide-react";
import { Proposal } from "@/components/proposals/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface RecentProjectsProps {
  proposals?: Proposal[];
  loading?: boolean;
  onRefresh?: () => void;
}

export function RecentProjects({ proposals = [], loading = false, onRefresh }: RecentProjectsProps) {
  const navigate = useNavigate();
  
  // Show skeleton loading state
  if (loading) {
    return (
      <Card className="retro-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Projects</CardTitle>
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Function to view a proposal
  const handleViewProposal = (id: string) => {
    navigate(`/proposals/${id}`);
  };

  // Filter to display only recent proposals (at most 4)
  const recentProjects = proposals.length > 0 
    ? proposals.slice(0, 4) 
    : [
        { id: "1", name: "Sunnydale Solar Farm", size: 4.2, client: "Cape Town Energy", date: "2024-01-15", status: "pending", revenue: 120000 },
        { id: "2", name: "Greenfield Energy", size: 2.8, client: "Johannesburg Power", date: "2024-02-03", status: "pending", revenue: 85000 },
        { id: "3", name: "Eastside Power Plant", size: 3.5, client: "Durban Utilities", date: "2024-03-10", status: "approved", revenue: 110000 },
        { id: "4", name: "Clearwater Solar", size: 2.0, client: "Pretoria Solar", date: "2024-03-22", status: "draft", revenue: 67000 },
      ];

  return (
    <Card className="retro-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Projects</CardTitle>
        <div className="flex space-x-2">
          {onRefresh && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            className="retro-button"
            onClick={() => navigate('/proposals/create')}
          >
            <Plus className="h-4 w-4 mr-1" /> New Project
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-carbon-gray-200">
                <th className="text-left py-3 px-4 font-medium text-carbon-gray-600">Project Name</th>
                <th className="text-left py-3 px-4 font-medium text-carbon-gray-600">Size (MWp)</th>
                <th className="text-left py-3 px-4 font-medium text-carbon-gray-600">Client</th>
                <th className="text-left py-3 px-4 font-medium text-carbon-gray-600">Date Added</th>
                <th className="text-right py-3 px-4 font-medium text-carbon-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentProjects.map((project) => (
                <tr key={project.id} className="border-b border-carbon-gray-100 hover:bg-carbon-gray-50">
                  <td className="py-3 px-4">{project.name}</td>
                  <td className="py-3 px-4">{project.size.toFixed(1)} MWp</td>
                  <td className="py-3 px-4">{project.client}</td>
                  <td className="py-3 px-4">{new Date(project.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-carbon-blue-600"
                      onClick={() => handleViewProposal(project.id)}
                    >
                      View <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-right">
          <Button 
            variant="link" 
            onClick={() => navigate('/proposals')}
            className="text-carbon-blue-600"
          >
            View All Projects <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
